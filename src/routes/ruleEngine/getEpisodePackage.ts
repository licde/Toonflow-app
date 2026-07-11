import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { loadEpisodePackage } from "@/ruleEngine/storage/episodePackageStore";
import { syncFromFlowData } from "@/ruleEngine/facade";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
  }),
  async (req, res) => {
    const { projectId, scriptId } = req.body;
    try {
      let pkg = await loadEpisodePackage(u.db, projectId, scriptId);
      if (!pkg) return res.status(404).send(error("EpisodePackage 不存在，请先同步 flowData"));
      return res.status(200).send(success(pkg));
    } catch (e) {
      return res.status(500).send(error(u.error(e).message));
    }
  },
);
