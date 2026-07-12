import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { exportEpisodeBundle } from "@/ruleEngine/bundle/importAdapter";
import { exportPackage } from "@/ruleEngine/packager/zPackager";
import { loadEpisodePackage } from "@/ruleEngine/storage/episodePackageStore";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
    includeZPack: z.boolean().optional(),
  }),
  async (req, res) => {
    try {
      const { projectId, scriptId, includeZPack } = req.body;
      const bundle = await exportEpisodeBundle(u.db, projectId, scriptId);
      const payload: Record<string, unknown> = { bundle };
      if (includeZPack) {
        const pkg = await loadEpisodePackage(u.db, projectId, scriptId);
        if (pkg) payload.zPack = exportPackage(pkg);
      }
      return res.status(200).send(success(payload));
    } catch (e) {
      return res.status(400).send(error(u.error(e).message));
    }
  },
);
