import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { validateStructuredScript } from "@/services/structuredScript/schema";
import { syncStructuredEpisode } from "@/services/structuredScript/syncPipeline";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
    json: z.record(z.string(), z.unknown()),
    episodeIndex: z.number().optional(),
  }),
  async (req, res) => {
    const { projectId, scriptId, json, episodeIndex = 0 } = req.body;
    const parsed = validateStructuredScript(json);
    if (!parsed.success) return res.status(400).send(error(parsed.error.message));

    try {
      const diff = await syncStructuredEpisode({
        projectId,
        scriptId,
        json: parsed.data as any,
        episodeIndex,
      });
      return res.status(200).send(success(diff));
    } catch (e) {
      return res.status(400).send(error(u.error(e).message));
    }
  },
);
