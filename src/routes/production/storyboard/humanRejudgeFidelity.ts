import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { writeJudgeCorpusEntry } from "@/ruleEngine/qc/judgeSelfImprove";
import {
  mergeReasonMeta,
  parseStillMetaFromReason,
  resolveStillHumanRejudgeOutcome,
} from "@/ruleEngine/compilers/stillQuality";

const router = express.Router();

/**
 * Human rejudge CTA — write corpus + optional expected overrides onto storyboard reason.
 * Hard pixel fails (single_frame / cast_cardinality / background_readable) never forge hq_ok.
 */
export default router.post(
  "/",
  validateFields({
    storyboardId: z.number(),
    description: z.string().optional(),
    items: z
      .array(
        z.object({
          id: z.string(),
          pass: z.boolean(),
          evidence: z.string().optional(),
          fixHint: z.string().optional(),
        }),
      )
      .min(1),
    expected: z
      .array(z.object({ id: z.string(), pass: z.boolean() }))
      .optional(),
    modality: z.enum(["still", "audio"]).optional(),
  }),
  async (req, res) => {
    try {
      const { storyboardId, description, items, expected, modality } = req.body;
      const row = await u.db("o_storyboard").where({ id: storyboardId }).first();
      if (!row) return res.status(404).send(error("分镜不存在"));
      const prev = parseStillMetaFromReason(row.reason);
      const id = `rejudge-${storyboardId}-${Date.now()}`;
      const file = writeJudgeCorpusEntry({
        id,
        createdAt: new Date().toISOString(),
        description: description || String(prev?.promptUsed ?? "").slice(0, 400),
        items,
        expected: expected ?? items.map((i: { id: string; pass: boolean }) => ({ id: i.id, pass: i.pass })),
        source: "human_rejudge",
        modality: modality ?? "still",
      });
      const outcome = resolveStillHumanRejudgeOutcome({
        items,
        prev,
        modality: modality ?? "still",
      });
      const isAudio = modality === "audio";
      const primaryNextStep = outcome.burnOk
        ? "burn"
        : outcome.sheetLeak || items.some((i: { id: string; pass: boolean }) => /single_frame/i.test(i.id) && !i.pass)
          ? "regen_storyboard_hq"
          : "regen_storyboard_hq";
      await u.db("o_storyboard").where({ id: storyboardId }).update({
        reason: mergeReasonMeta(row.reason, {
          fidelityItems: items,
          visualPass: isAudio ? prev?.visualPass : outcome.visualPass,
          visualPassAt:
            !isAudio && outcome.burnOk ? new Date().toISOString() : isAudio ? prev?.visualPassAt : undefined,
          audioPass: isAudio ? outcome.allPass : prev?.audioPass,
          audioPassAt: isAudio && outcome.allPass ? new Date().toISOString() : prev?.audioPassAt,
          stillQuality: isAudio
            ? outcome.allPass
              ? prev?.stillQuality
              : "weak"
            : outcome.stillQuality,
          sheetLeak: isAudio ? prev?.sheetLeak : outcome.sheetLeak,
          humanRejudgeCorpusId: id,
          humanRejudgeFile: file,
          pendingHumanRejudge: false,
          humanOverride: outcome.humanOverride,
          humanOverrideAt: outcome.burnOk || (isAudio && outcome.allPass) ? new Date().toISOString() : undefined,
          primaryNextStep: isAudio ? undefined : primaryNextStep,
          ctaLabel: outcome.ctaLabel,
          userMessage: outcome.userMessage,
          burnReady: isAudio ? outcome.allPass : outcome.burnOk,
        }),
      });
      return res.status(200).send(
        success({
          corpusId: id,
          file,
          visualPass: isAudio ? undefined : outcome.visualPass,
          audioPass: isAudio ? outcome.allPass : undefined,
          stillQuality: isAudio ? undefined : outcome.stillQuality,
          burnReady: isAudio ? outcome.allPass : outcome.burnOk,
          primaryNextStep: isAudio ? undefined : primaryNextStep,
          humanOverride: outcome.humanOverride,
          userMessage: outcome.userMessage,
          ctaLabel: outcome.ctaLabel,
        }),
      );
    } catch (e) {
      return res.status(400).send(error(u.error(e).message));
    }
  },
);
