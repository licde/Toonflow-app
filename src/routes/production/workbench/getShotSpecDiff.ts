/**
 * Shot Spec vs Prompt vs Params — workbench contrast API (Phase 0).
 * POST /production/workbench/getShotSpecDiff
 */
import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { loadEpisodePackage } from "@/ruleEngine/storage/episodePackageStore";
import { buildExtractContext, extractDesignFields, applyDesignFieldRegistry } from "@/ruleEngine/design/designFieldRegistry";
import { bridgeShotToVendor } from "@/ruleEngine/compilers/shotVendorBridge";
import { gateIdentityForShot } from "@/ruleEngine/compilers/resolveShotIdentity";
import { fillModeMatrix } from "@/ruleEngine/kernels/compileKernel";
import { buildIdentitySlots } from "@/ruleEngine/kernels/promptKernel";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
    storyboardId: z.number().optional(),
    trackId: z.number().optional(),
    prompt: z.string().optional().default(""),
    mode: z.string().optional().default("text"),
    duration: z.number().optional(),
    audio: z.boolean().optional(),
    resolution: z.string().optional(),
    includeModeMatrix: z.boolean().optional().default(true),
  }),
  async (req, res) => {
    try {
      const body = req.body as {
        projectId: number;
        scriptId: number;
        storyboardId?: number;
        trackId?: number;
        prompt?: string;
        mode?: string;
        duration?: number;
        audio?: boolean;
        resolution?: string;
        includeModeMatrix?: boolean;
      };

      let storyboardId = body.storyboardId;
      if (!storyboardId && body.trackId) {
        await u.db("o_videoTrack").where({ id: body.trackId }).first().catch(() => null);
      }

      const pkg = await loadEpisodePackage(u.db, body.projectId, body.scriptId);
      const shot =
        (storyboardId != null ? pkg?.shots?.find((s) => s.storyboardId === storyboardId) : undefined) ??
        pkg?.shots?.[0];
      const resolvedSbId = storyboardId ?? shot?.storyboardId ?? null;

      const { identity: resolved, gate: imageGate, missingQueue } = await gateIdentityForShot({
        db: u.db,
        projectId: body.projectId,
        storyboardId: resolvedSbId,
        shot,
        extraPrompt: body.prompt,
      });
      const { charCodes, sceneCode, propCodes } = resolved;

      const ctx = buildExtractContext({
        modality: "video",
        mode: body.mode,
        episodeShot: shot,
        charCodes,
      });
      const designFields = extractDesignFields(ctx);
      const identity = buildIdentitySlots({ charCodes, sceneCode, propCodes });

      const vendorPrompt = body.prompt?.trim()
        ? applyDesignFieldRegistry(body.prompt, designFields, { modality: "video", mode: body.mode }).prompt
        : shot?.generation?.videoPrompt ?? shot?.generation?.videoDesc ?? resolved.promptBlob;

      const bridge = bridgeShotToVendor({
        designFields,
        request: {
          duration: body.duration,
          audio: body.audio,
          resolution: body.resolution,
          mode: body.mode,
        },
      });

      const redLights: { code: string; level: "BLOCK" | "WARN"; message: string }[] = [];
      if (!sceneCode) redLights.push({ code: "MISSING_SCENE", level: "BLOCK", message: "缺 SCENE 码 / --sref" });
      for (const g of imageGate.gaps) {
        redLights.push({
          code: g.reason.toUpperCase(),
          level: "BLOCK",
          message: `${g.kind} ${g.code}: ${g.reason}`,
        });
      }
      for (const w of bridge.warnings) {
        redLights.push({ code: "TEXT_ONLY", level: "WARN", message: w });
      }

      let modeMatrix: Record<string, string> | undefined;
      if (body.includeModeMatrix !== false) {
        const matrix = await fillModeMatrix({
          modes: ["text", "singleImage", "startEndRequired", "multiParameter"],
          seedPrompt: vendorPrompt || "seed",
          charCodes,
          sceneCode,
          propCodes,
          designFields,
        });
        modeMatrix = Object.fromEntries(Object.entries(matrix).map(([k, v]) => [k, v.prompt]));
      }

      return res.status(200).send(
        success({
          spec: {
            shotId: shot?.id,
            storyboardId: shot?.storyboardId ?? resolvedSbId,
            sceneName: shot?.narrative?.sceneName ?? resolved.sceneName,
            sceneCode,
            charCodes,
            propCodes,
            duration: shot?.narrative?.duration,
            shotSize: shot?.narrative?.shotSize,
            emotion: shot?.narrative?.emotionIntensity,
            colorTone: shot?.narrative?.colorTone,
            dialogue: shot?.narrative?.lines ?? shot?.narrative?.dialogue?.lines,
            fxPrompt: shot?.generation?.fxPrompt,
            audioPrompt: shot?.generation?.audioPrompt,
            microExpression: (shot?.narrative?.performance as { microExpression?: unknown } | undefined)?.microExpression,
            crefImagePrompt: shot?.generation?.imagePrompt,
          },
          prompt: {
            current: body.prompt ?? "",
            vendorPreview: vendorPrompt,
            injectedFields: Object.entries(designFields)
              .filter(([, v]) => v != null && v !== false && v !== "")
              .map(([k]) => k),
            identity,
          },
          params: bridge.params,
          bridging: bridge.bridging,
          textHardening: bridge.textHardening,
          redLights,
          identityGate: imageGate,
          missingAssetImageQueue: missingQueue,
          modeMatrix,
        }),
      );
    } catch (e) {
      return res.status(500).send(error(u.error(e).message));
    }
  },
);
