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
    const projectId = req.body.projectId as number;
    try {
      const { markGenerationInflight, clearGenerationInflight } = await import(
        "@/ruleEngine/design/genInflightGuard"
      );
      markGenerationInflight(projectId, "still");
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
      clearGenerationInflight(projectId);
      return res.status(200).send(
        success({
          url: result.url,
          /** Literary edit SSOT — FE must not treat promptUsed as node.prompt */
          prompt: result.prompt,
          promptUsed: result.promptUsed,
          egressPrompt: result.egressPrompt ?? result.promptUsed,
          contentPolicyWarnings: result.contentPolicyWarnings,
          feedback: result.feedback,
          imageMode: result.imageMode,
          rePushPlan: result.rePushPlan,
          stillQuality: result.stillQuality,
          primaryNextStep: result.primaryNextStep,
          userMessage: result.userMessage,
          ctaLabel: result.ctaLabel,
          missingSlots: result.missingSlots,
          irdPrimaryAction: result.irdPrimaryAction,
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
          pendingHumanRejudge: result.pendingHumanRejudge,
          infraEditBypassUsed: result.infraEditBypassUsed,
          // Canvas ops echo — faceCu dropped SCENE / literary intent CTAs
          sceneRefsDropped: result.sceneRefsDropped,
          excludeScene: result.excludeScene,
          keepSoftEnvRef: result.keepSoftEnvRef,
          propPlateMissing: result.propPlateMissing,
          synthesizedPropPlate: result.synthesizedPropPlate,
          softEnvBakedIntoIdentity: result.softEnvBakedIntoIdentity,
          softEnvContinuity: result.softEnvContinuity,
          softEnvMissingHonest: result.softEnvMissingHonest,
          droppedSoftEnv: result.droppedSoftEnv,
          propSource: result.propSource,
          propAssetId: result.propAssetId,
          propSoftPreviewUrl: result.propSoftPreviewUrl,
          refsRoles: result.refsRoles,
          vendorCalled: result.vendorCalled,
          vendorMs: result.vendorMs,
          actuatorId: result.actuatorId,
          workflowHash: result.workflowHash,
          actuatorDegraded: result.actuatorDegraded,
          actuatorDegradedReason: result.actuatorDegradedReason,
          propPlateGrade: result.propPlateGrade,
          egressCompressed: result.egressCompressed,
          keyOptional: result.keyOptional,
          pixelDimStatus: result.pixelDimStatus,
          debtKind: result.debtKind,
          bgMode: result.bgMode,
          bgPolicy: result.bgPolicy,
          bgPolicyReason: result.bgPolicyReason,
          settingsDeepLink: result.settingsDeepLink,
          sheetLeak: result.sheetLeak,
          blockSilentRegen: result.blockSilentRegen,
          refreshStoryboardBeforeRegen: result.refreshStoryboardBeforeRegen,
          deliveryTier: (result as { deliveryTier?: string }).deliveryTier,
          requireFixBeforeBurn: (result as { requireFixBeforeBurn?: boolean }).requireFixBeforeBurn,
          ctaKind: (result as { ctaKind?: string }).ctaKind,
        }),
      );
    } catch (e: any) {
      try {
        const { clearGenerationInflight } = await import("@/ruleEngine/design/genInflightGuard");
        clearGenerationInflight(req.body.projectId);
      } catch {
        /* optional */
      }
      const errMsg = u.error(e).message;
      const feedback = e?.feedback;
      const envelope = (() => {
        try {
          const { buildStillErrorEnvelope, shouldLatchBlockSilentRegen } =
            require("@/ruleEngine/compilers/stillErrorEnvelope") as typeof import("@/ruleEngine/compilers/stillErrorEnvelope");
          const env = buildStillErrorEnvelope({
            code: e?.code,
            errMsg,
            feedbackCategory: feedback?.category,
            feedbackRuleId: feedback?.ruleId,
          });
          return {
            ...env,
            blockSilentRegen: shouldLatchBlockSilentRegen({
              primaryNextStep: e?.primaryNextStep ?? env.primaryNextStep,
              code: e?.code ?? env.code,
              missingSlots: e?.missingSlots,
              irdPrimaryAction: e?.irdPrimaryAction,
              errMsg,
            }),
          };
        } catch {
          return {
            code: e?.code,
            primaryNextStep: e?.primaryNextStep ?? "retry_shot",
            userMessage: e?.userMessage ?? errMsg,
            ctaLabel: e?.ctaLabel ?? "重试生图",
            blockSilentRegen: false,
          };
        }
      })();
      res.status(400).send(
        error(envelope.userMessage || errMsg, {
          feedback,
          suggestedPrompt: feedback?.suggestedPrompt ?? e?.suggestedPrompt,
          rePushPlan: e?.rePushPlan ?? [],
          code: envelope.code ?? e?.code,
          primaryNextStep: envelope.primaryNextStep,
          userMessage: envelope.userMessage,
          ctaLabel: envelope.ctaLabel,
          composeSources: e?.composeSources,
          stillQuality: e?.stillQuality,
          missingSlots: e?.missingSlots,
          irdPrimaryAction: e?.irdPrimaryAction,
          propPlateMissing: e?.propPlateMissing,
          // Vendor/transient → false so FE Generate stays clickable
          blockSilentRegen: envelope.blockSilentRegen,
          refreshStoryboardBeforeRegen: envelope.primaryNextStep === "split_shot",
          settingsDeepLink: e?.settingsDeepLink,
        }),
      );
    }
  },
);
