import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { loadEpisodePackage, saveEpisodePackage } from "@/ruleEngine/storage/episodePackageStore";
import { dryRun } from "@/ruleEngine/facade";
import { applyAutoFix } from "@/ruleEngine/validators/autoFix";
import { buildRePushPlan } from "@/ruleEngine/design/reverseRouteEngine";
import fs from "fs";
import path from "path";

function loadRepairHints(ruleIds: string[]): { id: string; chatTemplate: string }[] {
  const p = path.join(process.cwd(), "data", "fixtures", "repair_hint_catalog.json");
  if (!fs.existsSync(p)) return [];
  const hints = JSON.parse(fs.readFileSync(p, "utf-8")).hints ?? [];
  const idSet = new Set(ruleIds);
  return hints.filter(
    (h: { ruleId: string; id: string; qpId?: string; symptom?: string }) =>
      idSet.has(h.ruleId) ||
      idSet.has(h.id) ||
      (h.qpId && idSet.has(h.qpId)) ||
      ruleIds.some((rid) => h.symptom && (rid.includes(h.symptom) || h.symptom.includes(rid))),
  );
}

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
    script: z.string().optional(),
    apply: z.boolean().optional(),
  }),
  async (req, res) => {
    try {
      const { projectId, scriptId, script, apply } = req.body;
      const pkg = await loadEpisodePackage(u.db, projectId, scriptId);
      if (!pkg) return res.status(404).send(error("EpisodePackage 不存在"));
      const dry = await dryRun(u.db, pkg, script ?? "");
      const fix = applyAutoFix(dry.report.issues);
      // buildRePushPlan expects triggers/ruleIds — never layer names (SB/EN)
      const rePushPlan = buildRePushPlan(fix.applied.length ? fix.applied : fix.rePushTargets.filter((t) => !/^(SB|EN|MD|AS|CD|GB|W3|INFRA)$/i.test(t)));
      const repairHints = loadRepairHints(fix.applied);

      let appliedToDb = false;
      if (apply === true && fix.patches.length) {
        for (const patch of fix.patches) {
          const shotId = patch.shotId as string | undefined;
          const shot = pkg.shots.find((s) => s.id === shotId) ?? pkg.shots[0];
          if (!shot) continue;
          const fp = String(patch.fieldPath ?? "");
          if (fp.includes("image") || patch.imageAppend || patch.promptPrefix) {
            const extra = String(patch.imageAppend ?? patch.promptPrefix ?? "");
            shot.generation.imagePrompt = `${shot.generation.imagePrompt ?? ""}${extra}`.trim();
          }
          if (fp.includes("video") || patch.motion) {
            shot.generation.videoPrompt = String(patch.motion ?? shot.generation.videoPrompt ?? "");
          }
        }
        await saveEpisodePackage(u.db, pkg);
        appliedToDb = true;
      }

      return res.status(200).send(success({
        report: dry.report,
        applied: fix.applied,
        patches: fix.patches,
        rePushTargets: fix.rePushTargets,
        rePushPlan,
        repairHints,
        appliedToDb,
      }));
    } catch (e) {
      return res.status(500).send(error(u.error(e).message));
    }
  },
);
