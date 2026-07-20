/**
 * Preview still prompt compose without spending image quota.
 */
import express from "express";
import u from "@/utils";
import { z } from "zod";
import { error, success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import {
  composeStillPrompt,
  computeComposeHash,
  isDirtyStillPrompt,
  resolveComposeMode,
  scrubStillPromptNoise,
  shouldDefaultFidelityCompose,
  stripIdentityTokens,
} from "@/ruleEngine/compilers/composeStillPrompt";
import {
  assertLiteraryFidelity,
  buildLiteraryFidelityChecklist,
} from "@/ruleEngine/compilers/literaryFidelityChecklist";
import { hydrateComposeStillContext } from "@/ruleEngine/compilers/hydrateComposeStillContext";
import { parseStillMetaFromReason } from "@/ruleEngine/compilers/stillQuality";

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

      let promptState: string | undefined;
      let composeHashMeta: string | undefined;
      if (req.body.storyboardId) {
        const row = await u.db("o_storyboard").where({ id: req.body.storyboardId }).select("reason", "prompt").first();
        const meta = parseStillMetaFromReason(row?.reason);
        promptState = meta?.promptState;
        composeHashMeta = meta?.composeHash;
        const prev = scrubStillPromptNoise(stripIdentityTokens(String(meta?.promptUsed ?? row?.prompt ?? rawPrompt)).body)
          .cleaned;
        if (prev) ctx.previousVisualBody = prev;
      }

      const mode = resolveComposeMode({
        requested: req.body.composeMode,
        existingPrompt: rawPrompt,
        promptState,
        composeHash: composeHashMeta,
        currentHash: computeComposeHash(ctx),
        preferFidelity: shouldDefaultFidelityCompose(ctx),
      });
      const forceFull = isDirtyStillPrompt(rawPrompt) || !String(rawPrompt).trim();
      const result = composeStillPrompt(ctx, {
        mode: forceFull && !req.body.composeMode ? "full" : mode,
      });

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

      return res.status(200).send(
        success({
          ok: result.ok,
          prompt: result.prompt,
          visualBody: result.visualBody,
          didSynthesize: result.didSynthesize,
          scrubbed: result.scrubbed,
          composeMode: result.composeMode,
          sources: result.sources,
          warnings: result.warnings,
          entityAnchors: result.entityAnchors,
          blockReason: result.blockReason,
          primaryNextStep: result.primaryNextStep,
          userMessage: result.userMessage,
          ctaLabel: result.ctaLabel,
          compositionContractApplied: result.compositionContractApplied,
          complianceHit: result.complianceHit,
          dirtyInput: result.dirtyInput,
          /** L0 prompt items only — 成图验收另算 */
          fidelityLayer: "prompt",
          fidelityOk: fidelity.ok,
          fidelityItems: fidelity.passed
            .map((i) => ({ id: i.id, pass: true as const }))
            .concat(fidelity.missing.map((i) => ({ id: i.id, pass: false as const }))),
          fidelityMissing: fidelity.missing.map((m) => m.id),
          note: "补全仅验收提示词项；高质量成图另走视觉保真环",
        }),
      );
    } catch (e) {
      return res.status(400).send(error(u.error(e).message));
    }
  },
);
