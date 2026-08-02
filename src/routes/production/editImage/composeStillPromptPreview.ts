/**
 * Preview still prompt compose without spending image quota.
 */
import express from "express";
import u from "@/utils";
import { z } from "zod";
import { error, success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import {
  buildStillPreviousIngress,
  composeStillPrompt,
  computeComposeHash,
  shouldDefaultFidelityCompose,
} from "@/ruleEngine/compilers/composeStillPrompt";
import {
  assertLiteraryFidelity,
  buildLiteraryFidelityChecklist,
} from "@/ruleEngine/compilers/literaryFidelityChecklist";
import { hydrateComposeStillContext } from "@/ruleEngine/compilers/hydrateComposeStillContext";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    storyboardId: z.number().optional(),
    scriptId: z.number().optional(),
    prompt: z.string().optional(),
    qualityMode: z.enum(["hq_update", "draft"]).optional(),
    composeMode: z.enum(["full", "refine", "fidelity"]).optional(),
    persist: z.boolean().optional(),
    ratio: z.string().optional(),
    strengthen: z.record(z.string(), z.string()).optional(),
    referenceUrlCount: z.number().optional(),
    references: z.array(z.string()).optional(),
  }),
  async (req, res) => {
    try {
      const refCount =
        req.body.referenceUrlCount ??
        (Array.isArray(req.body.references) ? req.body.references.filter(Boolean).length : 0);
      const rawPrompt = req.body.prompt ?? "";
      const ctx = await hydrateComposeStillContext(u.db, {
        projectId: req.body.projectId,
        storyboardId: req.body.storyboardId,
        scriptId: req.body.scriptId,
        rawPrompt,
        qualityMode: req.body.qualityMode ?? "hq_update",
        strengthen: req.body.strengthen,
        referenceUrlCount: refCount,
        purpose: "compose",
      });
      if (req.body.ratio) ctx.videoRatio = req.body.ratio;

      let sbReason: unknown;
      let sbPrompt: string | undefined;
      if (req.body.storyboardId) {
        const row = await u.db("o_storyboard").where({ id: req.body.storyboardId }).select("reason", "prompt").first();
        sbReason = row?.reason;
        sbPrompt = row?.prompt != null ? String(row.prompt) : undefined;
      }
      const ingress = buildStillPreviousIngress({
        reason: sbReason,
        storedPrompt: sbPrompt,
        requestPrompt: rawPrompt,
        requestedMode: req.body.composeMode,
        currentHash: computeComposeHash(ctx),
        preferFidelity: shouldDefaultFidelityCompose(ctx),
        loadPrevious: Boolean(req.body.storyboardId),
      });
      ctx.previousVisualBody = ingress.previousVisualBody;
      const result = composeStillPrompt(ctx, { mode: ingress.effectiveMode });

      if (req.body.persist && result.ok && req.body.storyboardId) {
        const { composeAndPersistStillPrompt } = await import("@/ruleEngine/compilers/persistStillPrompt");
        await composeAndPersistStillPrompt(u.db, {
          projectId: req.body.projectId,
          storyboardId: req.body.storyboardId,
          scriptId: req.body.scriptId,
          mode: result.composeMode,
          rawPrompt,
          referenceUrlCount: refCount,
          qualityMode: req.body.qualityMode ?? "hq_update",
        });
      }

      const names = (ctx.characters ?? []).map((c) => c.name).filter(Boolean) as string[];
      const checklist = buildLiteraryFidelityChecklist({
        description: ctx.visualDescription ?? result.visualBody,
        characterNames: names,
        requireDualIdentity: names.length >= 2,
      });
      const fidelity = assertLiteraryFidelity(result.prompt, checklist);

      // Preview ≡ generate compose kernel; surface egress warnings (never fake-green)
      const previewBlocks: string[] = [];
      if (!result.ok) previewBlocks.push(result.blockReason || "compose_blocked");
      if ((result.warnings ?? []).some((w) => /EMPTY-SHOT|CAST-CREF/i.test(w))) {
        previewBlocks.push("egress_quality_warn");
      }
      if (/空镜/.test(result.prompt) && /正脸/.test(result.prompt)) {
        previewBlocks.push("empty_face_conflict");
      }

      // Literary SSOT for edit surface — never return egress soup as `prompt`
      let literaryPrompt = "";
      try {
        const { resolveLiteraryStillPrompt } =
          await import("@/ruleEngine/compilers/literaryStillSsot");
        literaryPrompt = resolveLiteraryStillPrompt({
          visualDescription: ctx.visualDescription,
          compiledImagePrompt: ctx.compiledImagePrompt,
          background: ctx.background,
          spatialRelation: ctx.spatialRelation,
        }).literary;
      } catch {
        literaryPrompt = String(ctx.visualDescription ?? result.visualBody ?? "").trim();
      }
      if (!literaryPrompt) literaryPrompt = String(result.visualBody ?? "").trim();
      const egressPrompt = result.prompt;

      return res.status(200).send(
        success({
          ok: result.ok && previewBlocks.filter((b) => b === "empty_face_conflict").length === 0,
          /** Edit SSOT — peeled imagePrompt ∪ VD */
          prompt: literaryPrompt,
          /** Vendor compose egress — side channel only */
          egressPrompt,
          promptUsed: egressPrompt,
          visualBody: result.visualBody,
          didSynthesize: result.didSynthesize,
          scrubbed: result.scrubbed,
          composeMode: result.composeMode,
          sources: result.sources,
          warnings: [...(result.warnings ?? []), ...(previewBlocks.length ? [`previewParity:${previewBlocks.join(",")}`] : [])],
          entityAnchors: result.entityAnchors,
          blockReason: result.blockReason,
          primaryNextStep: result.primaryNextStep,
          userMessage: result.userMessage,
          ctaLabel: result.ctaLabel,
          compositionContractApplied: result.compositionContractApplied,
          complianceHit: result.complianceHit,
          dirtyInput: result.dirtyInput,
          orderedCrefCodes: result.orderedCrefCodes,
          /** L0 prompt items only — 成图验收另算；preview 不替代 generate BLOCK */
          fidelityLayer: "prompt",
          fidelityOk: fidelity.ok,
          fidelityItems: fidelity.passed
            .map((i) => ({ id: i.id, pass: true as const }))
            .concat(fidelity.missing.map((i) => ({ id: i.id, pass: false as const }))),
          fidelityMissing: fidelity.missing.map((m) => m.id),
          /** Preview is prompt-layer only — never claim pixel HQ / burn-ready */
          pixelHq: false,
          burnReady: false,
          note:
            "preview≡composeStillPrompt 同核；prompt=文学SSOT，egressPrompt=送厂拼装；≠成图像素HQ，不可据此燃片",
        }),
      );
    } catch (e) {
      return res.status(400).send(error(u.error(e).message));
    }
  },
);
