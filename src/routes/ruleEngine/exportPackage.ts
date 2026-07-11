import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { loadEpisodePackage } from "@/ruleEngine/storage/episodePackageStore";
import { exportPackage } from "@/ruleEngine/packager/zPackager";

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
      const pkg = await loadEpisodePackage(u.db, projectId, scriptId);
      if (!pkg) return res.status(404).send(error("EpisodePackage 不存在"));
      const data = exportPackage(pkg);
      return res.status(200).send(success(data));
    } catch (e) {
      return res.status(500).send(error(u.error(e).message));
    }
  },
);
