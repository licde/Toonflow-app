import express from "express";
import u from "@/utils";
import { z } from "zod";
import { error, success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { runGenerateFlowImageCore } from "./generateFlowImageCore";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    model: z.string(),
    references: z.array(z.string()).optional(),
    quality: z.string(),
    ratio: z.string(),
    prompt: z.string(),
    projectId: z.number(),
    storyboardId: z.number().optional(),
    mode: z.string().optional(),
    requireParentRef: z.boolean().optional(),
    qualityMode: z.enum(["hq_update", "draft"]).optional(),
    persistToStoryboard: z.boolean().optional(),
    strengthen: z.record(z.string(), z.string()).optional(),
    composeMode: z.enum(["full", "refine", "fidelity"]).optional(),
  }),
  async (req, res) => {
    try {
      const { withStoryboardLock } = await import("@/ruleEngine/heal/storyboardLock");
      const run = () =>
        runGenerateFlowImageCore(u.db, {
          model: req.body.model,
          references: req.body.references,
          quality: req.body.quality,
          ratio: req.body.ratio,
          prompt: req.body.prompt,
          projectId: req.body.projectId,
          storyboardId: req.body.storyboardId,
          mode: req.body.mode,
          requireParentRef: req.body.requireParentRef,
          qualityMode: req.body.qualityMode,
          persistToStoryboard: req.body.persistToStoryboard,
          strengthen: req.body.strengthen,
          composeMode: req.body.composeMode,
        });
      const result = req.body.storyboardId
        ? await withStoryboardLock(Number(req.body.storyboardId), run)
        : await run();
      return res.status(200).send(
        success({
          url: result.url,
          promptUsed: result.promptUsed,
          contentPolicyWarnings: result.contentPolicyWarnings,
          feedback: result.feedback,
          imageMode: result.imageMode,
          rePushPlan: result.rePushPlan,
          stillQuality: result.stillQuality,
          primaryNextStep: result.primaryNextStep,
          userMessage: result.userMessage,
          ctaLabel: result.ctaLabel,
          composeSources: result.composeSources,
          didSynthesize: result.didSynthesize,
          resolvedQuality: result.resolvedQuality,
          warnings: result.warnings,
          visualPass: result.visualPass,
          visualPassAt: result.visualPassAt,
          fidelityItems: result.fidelityItems,
          fidelityStopReason: result.fidelityStopReason,
          bestPassCount: result.bestPassCount,
          fixHintsUsed: result.fixHintsUsed,
          parallelM: result.parallelM,
          editStrategy: result.editStrategy,
          vlmError: result.vlmError,
        }),
      );
    } catch (e: any) {
      const errMsg = u.error(e).message;
      const feedback = e?.feedback;
      res.status(400).send(
        error(errMsg, {
          feedback,
          suggestedPrompt: feedback?.suggestedPrompt ?? e?.suggestedPrompt,
          rePushPlan: e?.rePushPlan ?? [],
          code: e?.code,
          primaryNextStep: e?.primaryNextStep,
          userMessage: e?.userMessage ?? errMsg,
          ctaLabel: e?.ctaLabel,
          composeSources: e?.composeSources,
          stillQuality: e?.stillQuality,
        }),
      );
    }
  },
);
