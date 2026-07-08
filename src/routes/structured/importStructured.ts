import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { validateStructuredScript } from "@/services/structuredScript/schema";
import { buildPreview } from "@/services/structuredScript/compiler";
import { importStructuredEpisode } from "@/services/structuredScript/importPipeline";
import taskRecord from "@/utils/taskRecord";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    episodeIndex: z.number().optional(),
    json: z.record(z.string(), z.unknown()),
  }),
  async (req, res) => {
    const { projectId, json, episodeIndex = 0 } = req.body;
    const parsed = validateStructuredScript(json);
    if (!parsed.success) return res.status(400).send(error(parsed.error.message));

    const done = await taskRecord(projectId, "结构化导入", "importStructured", {
      describe: "导入结构化剧本",
      content: { episodeIndex },
    });

    try {
      const result = await importStructuredEpisode({
        projectId,
        json: parsed.data as any,
        episodeIndex,
      });
      await done(1);
      return res.status(200).send(
        success({
          scriptId: result.scriptId,
          storyboardIds: result.storyboardIds,
          shotCount: result.storyboardIds.length,
          preview: buildPreview({ json: parsed.data as any, episodeIndex }),
        }),
      );
    } catch (e) {
      await done(-1, u.error(e).message);
      return res.status(400).send(error(u.error(e).message));
    }
  },
);
