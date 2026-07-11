import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { dryRun, syncFromFlowData } from "@/ruleEngine/facade";
import { loadEpisodePackage, saveEpisodePackage } from "@/ruleEngine/storage/episodePackageStore";

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
    profile: z.string().optional(),
  }),
  async (req, res) => {
    const { projectId, scriptId, script, scriptPlan, storyboardTable, storyboard, profile } = req.body;
    try {
      let pkg = await loadEpisodePackage(u.db, projectId, scriptId);
      if (!pkg) {
        pkg = await syncFromFlowData(u.db, { projectId, scriptId, script, scriptPlan, storyboardTable, storyboard });
      }
      const result = await dryRun(u.db, pkg, script ?? "", profile ?? "dry-run");
      pkg.shots = result.shots;
      await saveEpisodePackage(u.db, pkg);
      return res.status(200).send(success(result));
    } catch (e) {
      return res.status(500).send(error(u.error(e).message));
    }
  },
);
