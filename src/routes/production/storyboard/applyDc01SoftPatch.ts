import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { applyDc01SoftPatchAndPersist } from "@/ruleEngine/heal/applyDc01SoftPatch";

const router = express.Router();

/** CTA: 一键补台词 — persist DC-01 soft_patch into EpisodePackage */
export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
  }),
  async (req, res) => {
    try {
      const result = await applyDc01SoftPatchAndPersist({
        db: u.db,
        projectId: req.body.projectId,
        scriptId: req.body.scriptId,
        forceApply: true,
      });
      if (!result.coverageOk && !result.applied.length) {
        return res.status(400).send(
          error(result.userMessage, {
            code: "DC-01",
            primaryNextStep: "chat_repair",
            userMessage: result.userMessage,
            ctaLabel: result.ctaLabel,
            coverageOk: false,
          }),
        );
      }
      return res.status(200).send(
        success({
          ...result,
          // Never expose raw dialogue_hash_mismatch→SB as sole UI
          primaryNextStep: result.coverageOk ? "burn" : "chat_repair",
        }),
      );
    } catch (e) {
      return res.status(500).send(
        error(u.error(e).message || "applyDc01SoftPatch failed", { code: "DC01_PERSIST" }),
      );
    }
  },
);
