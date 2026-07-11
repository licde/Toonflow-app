import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { loadEpisodePackage } from "@/ruleEngine/storage/episodePackageStore";
import { dryRun } from "@/ruleEngine/facade";
import { exportPackage } from "@/ruleEngine/packager/zPackager";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
    script: z.string().optional(),
    includeExport: z.boolean().optional(),
  }),
  async (req, res) => {
    const { projectId, scriptId, script, includeExport } = req.body;
    try {
      const pkg = await loadEpisodePackage(u.db, projectId, scriptId);
      if (!pkg) return res.status(404).send(error("EpisodePackage 不存在"));
      const dry = await dryRun(u.db, pkg, script ?? "");
      const payload: Record<string, unknown> = { report: dry.report, coverage: dry.report.ruleCoverage, stageStatus: dry.report.stageStatus };
      if (includeExport) payload.export = exportPackage(pkg);
      return res.status(200).send(success(payload));
    } catch (e) {
      return res.status(500).send(error(u.error(e).message));
    }
  },
);
