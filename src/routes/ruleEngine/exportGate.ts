import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { buildAggregatedChatRepairText, runExportGate } from "@/ruleEngine/exportGate";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    bundle: z.any(),
    tier: z.enum(["T1", "T2", "T3"]).optional(),
  }),
  async (req, res) => {
    try {
      const { bundle, tier } = req.body;
      const result = runExportGate(bundle, { tier });
      const chatRepairText = buildAggregatedChatRepairText(
        result.repairHints,
        result.closureSnapshot.blockIds,
        result.missingFieldSummary,
        result.blocks,
      );
      return res.status(200).send(
        success({
          exportAllowed: result.exportAllowed,
          tier: result.tier,
          closureSnapshot: result.closureSnapshot,
          coverage: result.coverage,
          blocks: result.blocks,
          warns: result.warns,
          repairHints: result.repairHints,
          chatRepairText,
          missingFieldReport: result.missingFieldReport,
          missingFieldSummary: result.missingFieldSummary,
          inspected: result.inspected,
          designFindings: result.designFindings,
          fieldWalkGaps: result.fieldWalkGaps,
          shapeSalvageLog: result.shapeSalvageLog,
          shapeSalvageSummary: result.shapeSalvageSummary,
          endpoint: "exportGate",
        }),
      );
    } catch (e) {
      return res.status(400).send(error(e instanceof Error ? e.message : String(e)));
    }
  },
);
