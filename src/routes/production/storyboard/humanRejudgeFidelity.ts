import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { writeJudgeCorpusEntry } from "@/ruleEngine/qc/judgeSelfImprove";
import { mergeReasonMeta, parseStillMetaFromReason } from "@/ruleEngine/compilers/stillQuality";

const router = express.Router();

/**
 * Human rejudge CTA — write corpus + optional expected overrides onto storyboard reason.
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
      const allPass = items.every((i: { pass: boolean }) => i.pass);
      await u.db("o_storyboard").where({ id: storyboardId }).update({
        reason: mergeReasonMeta(row.reason, {
          fidelityItems: items,
          visualPass: modality !== "audio" ? allPass : prev?.visualPass,
          visualPassAt: modality !== "audio" && allPass ? new Date().toISOString() : prev?.visualPassAt,
          audioPass: modality === "audio" ? allPass : prev?.audioPass,
          audioPassAt: modality === "audio" && allPass ? new Date().toISOString() : prev?.audioPassAt,
          stillQuality: modality !== "audio" && allPass ? "hq_ok" : allPass ? prev?.stillQuality : "weak",
          humanRejudgeCorpusId: id,
          humanRejudgeFile: file,
        }),
      });
      return res.status(200).send(
        success({
          corpusId: id,
          file,
          visualPass: modality !== "audio" ? allPass : undefined,
          audioPass: modality === "audio" ? allPass : undefined,
          userMessage: "人工改判已写入语料",
          ctaLabel: allPass ? "可燃片" : "继续修复",
        }),
      );
    } catch (e) {
      return res.status(400).send(error(u.error(e).message));
    }
  },
);
