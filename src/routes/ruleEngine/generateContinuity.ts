import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { generateContinuityFromPrev } from "@/ruleEngine/bundle/continuity";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
  }),
  async (req, res) => {
    try {
      const { projectId, scriptId } = req.body;
      const result = await generateContinuityFromPrev(u.db, projectId, scriptId);
      return res.status(200).send(success(result));
    } catch (e) {
      return res.status(500).send(error(u.error(e).message));
    }
  },
);
