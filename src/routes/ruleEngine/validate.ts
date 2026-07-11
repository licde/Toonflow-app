import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { dryRun, syncFromFlowData } from "@/ruleEngine/facade";
import { loadEpisodePackage } from "@/ruleEngine/storage/episodePackageStore";
import { isRuleEngineEnabled } from "@/ruleEngine/featureFlag";

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
    layers: z.array(z.string()).optional(),
  }),
  async (req, res) => {
    const { projectId, scriptId, script, scriptPlan, storyboardTable, storyboard } = req.body;
    if (!(await isRuleEngineEnabled(u.db, projectId))) {
      return res.status(200).send(success({ passed: true, issues: [], ruleEngineEnabled: false }));
    }
    try {
      let pkg = await loadEpisodePackage(u.db, projectId, scriptId);
      if (!pkg) {
        pkg = await syncFromFlowData(u.db, { projectId, scriptId, script, scriptPlan, storyboardTable, storyboard });
      }
      const result = await dryRun(u.db, pkg, script ?? "");
      return res.status(200).send(success(result.report));
    } catch (e) {
      return res.status(500).send(error(u.error(e).message));
    }
  },
);
