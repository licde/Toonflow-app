import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { generateStoryboardVideo } from "@/services/structuredScript/generation";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    storyboardIds: z.array(z.number()),
    projectId: z.number(),
    audio: z.boolean().optional(),
    resolution: z.string().optional(),
  }),
  async (req, res) => {
    const { storyboardIds, projectId, audio, resolution } = req.body;
    const results = [];
    for (const id of storyboardIds) {
      try {
        results.push({ storyboardId: id, ...(await generateStoryboardVideo(id, projectId, { audio, resolution })) });
      } catch (e) {
        results.push({ storyboardId: id, error: u.error(e).message });
      }
    }
    return res.status(200).send(success(results));
  },
);
