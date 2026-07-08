import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { assembleEpisodeTimeline } from "@/services/structuredScript/generation";
import u from "@/utils";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
    skipConcat: z.boolean().optional(),
    includeSfx: z.boolean().optional(),
  }),
  async (req, res) => {
    const { projectId, scriptId, skipConcat, includeSfx } = req.body;
    try {
      const result = await assembleEpisodeTimeline(scriptId, projectId, { skipConcat, includeSfx });
      return res.status(200).send(success(result));
    } catch (e) {
      return res.status(400).send(error(u.error(e).message));
    }
  },
);
