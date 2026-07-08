import express from "express";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { validateStructuredShot } from "@/services/structuredScript/validateShot";
import { loadStructuredSource } from "@/services/structuredScript/importPipeline";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number().optional(),
    scriptId: z.number().optional(),
    storyboardId: z.number().optional(),
    shot: z.record(z.string(), z.unknown()),
    episodeIndex: z.number().optional(),
    target: z.enum(["image", "video", "both"]).optional(),
  }),
  async (req, res) => {
    const { projectId, scriptId, storyboardId, shot, episodeIndex = 0, target = "both" } = req.body;
    let json = null;
    if (projectId != null) json = await loadStructuredSource(projectId);
    const result = await validateStructuredShot({
      shot: shot as any,
      json,
      episodeIndex,
      target,
      projectId,
      storyboardId,
    });
    return res.status(200).send(success(result));
  },
);
