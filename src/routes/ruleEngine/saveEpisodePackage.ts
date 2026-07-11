import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { loadEpisodePackage, saveEpisodePackage } from "@/ruleEngine/storage/episodePackageStore";
import { syncFromFlowData } from "@/ruleEngine/facade";
import type { EpisodePackage } from "@/ruleEngine/types";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
    script: z.string().optional(),
    scriptPlan: z.string().optional(),
    storyboardTable: z.string().optional(),
    storyboard: z.array(z.any()).optional(),
    package: z.any().optional(),
  }),
  async (req, res) => {
    const { projectId, scriptId, script, scriptPlan, storyboardTable, storyboard, package: pkgBody } = req.body;
    try {
      if (pkgBody) {
        const pkg = pkgBody as EpisodePackage;
        pkg.projectId = projectId;
        pkg.scriptId = scriptId;
        await saveEpisodePackage(u.db, pkg);
        return res.status(200).send(success(pkg));
      }
      const pkg = await syncFromFlowData(u.db, { projectId, scriptId, script, scriptPlan, storyboardTable, storyboard });
      return res.status(200).send(success(pkg));
    } catch (e) {
      return res.status(500).send(error(u.error(e).message));
    }
  },
);
