import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { recomputeShots } from "@/ruleEngine/facade";
import { loadEpisodePackage, saveEpisodePackage } from "@/ruleEngine/storage/episodePackageStore";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
    shotIds: z.array(z.string()),
    script: z.string().optional(),
  }),
  async (req, res) => {
    const { projectId, scriptId, shotIds, script } = req.body;
    try {
      const pkg = await loadEpisodePackage(u.db, projectId, scriptId);
      if (!pkg) return res.status(404).send(error("EpisodePackage 不存在"));
      const { shots, report } = await recomputeShots(u.db, pkg, shotIds, script ?? "");
      pkg.shots = shots;
      await saveEpisodePackage(u.db, pkg);
      return res.status(200).send(success({ shots, report }));
    } catch (e) {
      return res.status(500).send(error(u.error(e).message));
    }
  },
);
