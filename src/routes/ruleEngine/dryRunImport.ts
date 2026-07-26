import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { dryRunImport } from "@/ruleEngine/bundle/importAdapter";
import { SchemaShapeBlockError } from "@/ruleEngine/bundle/schemaShapeErrors";
import { ExportGateBlockError, formatExportGateBlockPayload } from "@/ruleEngine/exportGate";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    bundle: z.any(),
    targetScriptId: z.number().optional(),
    mergeStrategy: z.enum(["replaceAll", "mergeLayers", "preserveMedia"]).optional(),
    acknowledgeKeepLegacy: z.boolean().optional(),
  }),
  async (req, res) => {
    try {
      const { projectId, bundle, targetScriptId, mergeStrategy, acknowledgeKeepLegacy } = req.body;
      const summary = await dryRunImport(u.db, bundle, {
        projectId,
        targetScriptId,
        mergeStrategy,
        validateOnly: true,
        acknowledgeKeepLegacy,
      });
      return res.status(200).send(success(summary));
    } catch (e) {
      if (e instanceof SchemaShapeBlockError) {
        return res.status(400).send(
          error(e.message, {
            code: e.payload.code,
            issues: e.payload.issues,
            repairHints: e.payload.repairHints,
            chatRepairText: e.payload.chatRepairText,
          }),
        );
      }
      if (e instanceof ExportGateBlockError) {
        return res.status(400).send(error(e.message, formatExportGateBlockPayload(e.details)));
      }
      return res.status(400).send(error(u.error(e).message));
    }
  },
);
