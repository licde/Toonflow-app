import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { importScriptBundle } from "@/ruleEngine/bundle/importAdapter";
import { ExportGateBlockError, formatExportGateBlockPayload } from "@/ruleEngine/exportGate";
import { SchemaShapeBlockError } from "@/ruleEngine/bundle/schemaShapeErrors";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    bundle: z.any(),
    targetScriptId: z.number().optional(),
    importMode: z.enum(["create", "update", "upsert"]).optional(),
    mergeStrategy: z.enum(["replaceAll", "mergeLayers", "preserveMedia"]).optional(),
    autoDesign: z.boolean().optional(),
    validateOnly: z.boolean().optional(),
    includeValidationReport: z.boolean().optional(),
    acknowledgeKeepLegacy: z.boolean().optional(),
  }),
  async (req, res) => {
    try {
      const { projectId, bundle, targetScriptId, importMode, mergeStrategy, autoDesign, validateOnly, includeValidationReport, acknowledgeKeepLegacy } =
        req.body;
      const result = await importScriptBundle(u.db, typeof bundle === "string" ? bundle : bundle, {
        projectId,
        targetScriptId,
        importMode: importMode ?? "upsert",
        mergeStrategy,
        autoDesign: autoDesign !== false,
        validateOnly: validateOnly === true,
        includeValidationReport: includeValidationReport === true,
        acknowledgeKeepLegacy,
      });
      return res.status(200).send(success(result));
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
      const msg = u.error(e).message;
      if (/\.trim is not a function/i.test(msg)) {
        return res.status(400).send(
          error("visualLockTable.characterAssets 形态非法（期望 code→名字符串，已兼容对象态请重试导入）", {
            code: "BUNDLE-VLT-SHAPE",
            detail: msg,
          }),
        );
      }
      return res.status(400).send(error(msg));
    }
  },
);
