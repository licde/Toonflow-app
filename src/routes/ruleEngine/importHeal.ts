import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { DEFAULT_IMPORT_HEAL_CHECKS, runImportHeal } from "@/ruleEngine/importHealOrchestrator";
import { SchemaShapeBlockError } from "@/ruleEngine/bundle/schemaShapeErrors";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    bundle: z.any(),
    checks: z.array(z.string()).optional(),
    apply: z.boolean().optional(),
    maxRounds: z.number().optional(),
    projectId: z.number().optional(),
    scriptId: z.number().optional(),
  }),
  async (req, res) => {
    try {
      const { bundle, checks, apply, maxRounds } = req.body as {
        bundle: unknown;
        checks?: string[];
        apply?: boolean;
        maxRounds?: number;
      };
      if (bundle == null) {
        return res.status(400).send(error("bundle required"));
      }

      const result = runImportHeal({
        raw: bundle,
        checks: checks ?? [...DEFAULT_IMPORT_HEAL_CHECKS],
        apply: apply !== false,
        maxRounds,
      });

      return res.status(200).send(
        success({
          ...result,
          endpoint: "importHeal",
        }),
      );
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
      return res.status(500).send(error(u.error(e).message));
    }
  },
);
