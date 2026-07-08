import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { generateStoryboardImage } from "@/services/structuredScript/generation";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    storyboardIds: z.array(z.number()),
    projectId: z.number(),
    tier: z.enum(["1K", "2K", "4K"]).optional(),
  }),
  async (req, res) => {
    const { storyboardIds, projectId, tier = "2K" } = req.body;
    const results = [];
    for (const id of storyboardIds) {
      try {
        results.push({ storyboardId: id, ...(await generateStoryboardImage(id, projectId, tier)) });
      } catch (e) {
        results.push({ storyboardId: id, error: u.error(e).message });
      }
    }
    return res.status(200).send(success(results));
  },
);
