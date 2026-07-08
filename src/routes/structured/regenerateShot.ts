import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { generateStoryboardImage, generateStoryboardVideo } from "@/services/structuredScript/generation";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    storyboardId: z.number(),
    projectId: z.number(),
    targets: z.array(z.enum(["image", "video"])),
    tier: z.enum(["1K", "2K", "4K"]).optional(),
    setAsActive: z.boolean().optional(),
    preservePrevious: z.boolean().optional(),
    audio: z.boolean().optional(),
    effectStack: z
      .object({
        voice: z.enum(["auto", "video_native", "tts", "off"]).optional(),
        motion: z.enum(["auto", "basic", "enhanced", "static"]).optional(),
        sfx: z.enum(["auto", "prompt_only", "post_layer", "off"]).optional(),
      })
      .optional(),
  }),
  async (req, res) => {
    const { storyboardId, projectId, targets, tier = "2K", audio, effectStack } = req.body;
    const result: Record<string, unknown> = {};

    try {
      if (targets.includes("image")) {
        result.image = await generateStoryboardImage(storyboardId, projectId, tier, effectStack);
      }
      if (targets.includes("video")) {
        result.video = await generateStoryboardVideo(storyboardId, projectId, { audio, effectStack });
      }
      return res.status(200).send(success(result));
    } catch (e) {
      return res.status(400).send(error(u.error(e).message));
    }
  },
);
