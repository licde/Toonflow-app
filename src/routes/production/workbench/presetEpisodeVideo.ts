import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { presetEpisodeVideo, reconcileEpisodePresetStatus } from "@/lib/dramaPack/trackVideoService";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
    respectImport: z.boolean().optional(),
    async: z.boolean().optional(),
  }),
  async (req, res) => {
    const { projectId, scriptId, respectImport, async: runAsync = true } = req.body;

    const wb = await reconcileEpisodePresetStatus(projectId, scriptId);
    if (wb.presetStatus === "done") {
      return res.status(200).send(success({ skipped: true, message: wb.presetMessage ?? "单集已就绪" }));
    }
    if (wb.presetStatus === "running") {
      return res.status(200).send(success({ running: true, message: "单集预设进行中" }));
    }

    const runPreset = () =>
      presetEpisodeVideo({ projectId, scriptId, respectImport: respectImport ?? true }).catch((e) => {
        console.error("[presetEpisodeVideo] failed:", u.error(e).message);
      });

    if (runAsync) {
      res.status(200).send(success({ started: true, message: "单集预设已开始" }));
      void runPreset();
      return;
    }

    try {
      const result = await presetEpisodeVideo({ projectId, scriptId, respectImport: respectImport ?? true });
      res.status(200).send(success(result));
    } catch (e) {
      res.status(400).send(error(u.error(e).message));
    }
  },
);
