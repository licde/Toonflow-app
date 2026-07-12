import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { loadEpisodePackage } from "@/ruleEngine/storage/episodePackageStore";
import { dryRun } from "@/ruleEngine/facade";
import { applyAutoFix } from "@/ruleEngine/validators/autoFix";
import { buildRePushPlan } from "@/ruleEngine/design/reverseRouteEngine";
import fs from "fs";
import path from "path";

function loadRepairHints(ruleIds: string[]): { id: string; chatTemplate: string }[] {
  const p = path.join(process.cwd(), "data", "fixtures", "repair_hint_catalog.json");
  if (!fs.existsSync(p)) return [];
  const hints = JSON.parse(fs.readFileSync(p, "utf-8")).hints ?? [];
  return hints.filter((h: { ruleId: string }) => ruleIds.includes(h.ruleId));
}

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
    script: z.string().optional(),
  }),
  async (req, res) => {
    try {
      const { projectId, scriptId, script } = req.body;
      const pkg = await loadEpisodePackage(u.db, projectId, scriptId);
      if (!pkg) return res.status(404).send(error("EpisodePackage 不存在"));
      const dry = await dryRun(u.db, pkg, script ?? "");
      const fix = applyAutoFix(dry.report.issues);
      const rePushPlan = buildRePushPlan(fix.rePushTargets);
      const repairHints = loadRepairHints(fix.applied);
      return res.status(200).send(success({
        report: dry.report,
        applied: fix.applied,
        patches: fix.patches,
        rePushTargets: fix.rePushTargets,
        rePushPlan,
        repairHints,
      }));
    } catch (e) {
      return res.status(500).send(error(u.error(e).message));
    }
  },
);
