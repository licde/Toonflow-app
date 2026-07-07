import express from "express";
import { z } from "zod";
import { error, success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { recomposeScriptStoryboards, recomposeProjectPrompts } from "@/lib/dramaPack/recomposeDramaPack";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number().optional(),
    mode: z.enum(["merge", "rebuild"]).optional(),
    scope: z.enum(["script", "project"]).optional(),
    assets: z.boolean().optional(),
    storyboards: z.boolean().optional(),
  }),
  async (req, res) => {
    const { projectId, scriptId, mode, scope, assets, storyboards } = req.body;

    if (scope === "project" || scriptId == null) {
      const result = await recomposeProjectPrompts({
        projectId,
        mode: mode ?? "merge",
        assets: assets ?? true,
        storyboards: storyboards ?? true,
      });
      if (!result.success) {
        return res.status(400).send(error(result.message, result));
      }
      return res.status(200).send(success(result));
    }

    const result = await recomposeScriptStoryboards({ projectId, scriptId, mode: mode ?? "merge" });
    if (!result.success) {
      return res.status(400).send(error(result.message, result));
    }
    return res.status(200).send(success(result));
  },
);
