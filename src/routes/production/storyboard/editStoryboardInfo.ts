import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { applyStoryboardLifecycle } from "@/ruleEngine/heal/applyStoryboardLifecycle";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    id: z.number(),
    prompt: z.string(),
    videoDesc: z.string(),
    audioPrompt: z.string().optional(),
    fxPrompt: z.string().optional(),
  }),
  async (req, res) => {
    const { id, prompt, videoDesc, audioPrompt, fxPrompt } = req.body;
    const prev = await u.db("o_storyboard").where({ id }).select("prompt", "videoDesc").first();
    const update: Record<string, unknown> = { prompt, videoDesc };
    if (audioPrompt !== undefined) update.audioPrompt = audioPrompt;
    if (fxPrompt !== undefined) update.fxPrompt = fxPrompt;
    await u.db("o_storyboard").where({ id }).update(update);

    const visualChanged =
      String(prev?.prompt ?? "") !== String(prompt ?? "") ||
      String(prev?.videoDesc ?? "") !== String(videoDesc ?? "");
    if (visualChanged) {
      await applyStoryboardLifecycle(u.db, { storyboardId: id, event: "shot_visual_changed" }).catch(() => null);
    }

    res.status(200).send(success({ message: "更新提示词成功" }));
  },
);
