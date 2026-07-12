import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { dryRun, syncFromFlowData } from "@/ruleEngine/facade";
import { loadEpisodePackage } from "@/ruleEngine/storage/episodePackageStore";
import { isRuleEngineEnabled } from "@/ruleEngine/featureFlag";
import { inspectBundle } from "@/ruleEngine/portable/inspectBundle";
import type { UnifiedClosureResponse } from "@/ruleEngine/portable/types";

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
    bundle: z.any().optional(),
  }),
  async (req, res) => {
    const { projectId, scriptId, script, scriptPlan, storyboardTable, storyboard, bundle } = req.body;
    const enabled = await isRuleEngineEnabled(u.db, projectId);
    if (!enabled) {
      return res.status(200).send(success({
        endpoint: "int",
        ruleEngineEnabled: false,
        intValidation: { passed: true, tier0Coverage: { executed: 0, registered: 257, triggered: 0 }, issues: [] },
      }));
    }
    try {
      let pkg = await loadEpisodePackage(u.db, projectId, scriptId);
      if (!pkg) {
        pkg = await syncFromFlowData(u.db, { projectId, scriptId, script, scriptPlan, storyboardTable, storyboard });
      }
      const result = await dryRun(u.db, pkg, script ?? "");
      let closureChecks: UnifiedClosureResponse["closureChecks"] | undefined;
      if (bundle) {
        const inspected = inspectBundle(bundle, { tier: "T2" });
        closureChecks = inspected.closureChecks;
      }
      const payload: UnifiedClosureResponse = {
        endpoint: "int",
        tier: "T2",
        blocked: result.report.passed === false,
        rulePackVersion: "2.0.1",
        closureChecks: closureChecks ?? { dc: [], pc: [], gc: [], ic: [], blocked: !result.report.passed },
        warnings: [],
        intValidation: {
          passed: result.report.passed,
          tier0Coverage: {
            executed: result.report.ruleCoverage?.hit ?? result.report.issues?.length ?? 0,
            registered: result.report.ruleCoverage?.total ?? 257,
            triggered: result.report.issues?.length ?? 0,
          },
          issues: result.report.issues ?? [],
        },
      };
      return res.status(200).send(success(payload));
    } catch (e) {
      return res.status(500).send(error(u.error(e).message));
    }
  },
);
