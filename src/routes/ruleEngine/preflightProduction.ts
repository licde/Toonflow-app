import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { runProductionPreflight } from "@/ruleEngine/detection/preflightProduction";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
    storyboardIds: z.array(z.number()).optional(),
    modality: z.enum(["IMG", "VID", "AUD", "FX"]).optional(),
    tier: z.enum(["T1", "T2", "T3"]).optional(),
  }),
  async (req, res) => {
    try {
      const { projectId, scriptId, storyboardIds, modality, tier } = req.body;
      const result = await runProductionPreflight(u.db, {
        projectId,
        scriptId,
        storyboardIds,
        modality,
        tier,
      });
      return res.status(200).send(
        success({
          ...result,
          endpoint: "prod",
        }),
      );
    } catch (e) {
      return res.status(500).send(error(u.error(e).message));
    }
  },
);
