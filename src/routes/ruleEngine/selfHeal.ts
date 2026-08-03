import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { runSelfHeal } from "@/ruleEngine/design/selfHealOrchestrator";
import { loadEpisodePackage, saveEpisodePackage, loadProjectBlueprint, saveProjectBlueprint } from "@/ruleEngine/storage/episodePackageStore";
import { buildCodeAliasMap } from "@/ruleEngine/codes/assetCodeAlias";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
    shotId: z.number().optional(),
    errorText: z.string().optional(),
    category: z.string().optional(),
    jobKind: z.string().optional(),
    round: z.number().optional(),
    dryRun: z.boolean().optional(),
    apply: z.boolean().optional(),
    /** Wave-2: restore last silent-repair before/after on target shot (cross-session) */
    undoIndustryRepair: z.boolean().optional(),
    undoCount: z.number().optional(),
    identityGaps: z
      .array(z.object({ code: z.string(), reason: z.string(), kind: z.string().optional() }))
      .optional(),
    issues: z
      .array(
        z.object({
          ruleId: z.string().optional(),
          message: z.string().optional(),
          autoFix: z
            .object({
              confidence: z.number().optional(),
              patch: z.record(z.string(), z.unknown()).optional(),
            })
            .optional(),
        }),
      )
      .optional(),
  }),
  async (req, res) => {
    try {
      const { projectId, scriptId, shotId, apply, dryRun, undoIndustryRepair, undoCount } = req.body;
      const pkg = await loadEpisodePackage(u.db, projectId, scriptId);
      const shotRow =
        shotId != null
          ? pkg?.shots?.find((s) => s.storyboardId === shotId || String(s.id) === String(shotId))
          : pkg?.shots?.[0];

      if (undoIndustryRepair && pkg?.shots?.length && shotRow) {
        const { undoLastIndustryRepairs, collectRepairChangelog } =
          require("@/ruleEngine/design/industryAvSilentRepair") as typeof import("@/ruleEngine/design/industryAvSilentRepair");
        const idx = pkg.shots.findIndex(
          (s) => s === shotRow || s.storyboardId === shotRow.storyboardId || String(s.id) === String(shotRow.id),
        );
        const target = idx >= 0 ? (pkg.shots[idx] as Record<string, unknown>) : (shotRow as Record<string, unknown>);
        const undid = undoLastIndustryRepairs(target, Math.max(1, Number(undoCount ?? 1) || 1));
        if (idx >= 0) pkg.shots[idx] = target as (typeof pkg.shots)[number];
        if (!dryRun && apply !== false && undid.undone > 0) {
          await saveEpisodePackage(u.db, pkg);
        }
        return res.status(200).send(
          success({
            ok: undid.undone > 0,
            message:
              undid.undone > 0
                ? `已撤销 ${undid.undone} 条静默修复`
                : undid.residuals[0] || "无可撤销的静默修复",
            undone: undid.undone,
            residuals: undid.residuals,
            ctaLabel: "智能修复",
            primaryNextStep: "soft_patch",
            repairChangelog: collectRepairChangelog([target]),
            appliedToDb: !dryRun && apply !== false && undid.undone > 0,
          }),
        );
      }

      const blueprint = (await loadProjectBlueprint(u.db, projectId)) ?? {};
      const rawCa = blueprint.characterAssets;
      const cdAssets = Array.isArray(rawCa)
        ? rawCa
        : rawCa && typeof rawCa === "object"
          ? Object.entries(rawCa as Record<string, unknown>).map(([code, v]) =>
              v && typeof v === "object"
                ? { code, ...(v as object) }
                : { code, name: String(v ?? code) },
            )
          : ((blueprint.characterDesign as { assets?: unknown[] } | undefined)?.assets ?? []);
      const nameMap: Record<string, string> = {};
      for (const a of cdAssets as { code?: string; name?: string }[]) {
        if (a.code && a.name) nameMap[a.code] = a.name;
      }
      if (rawCa && typeof rawCa === "object" && !Array.isArray(rawCa)) {
        for (const [code, v] of Object.entries(rawCa as Record<string, unknown>)) {
          if (typeof v === "string") nameMap[code] = v;
          else if (v && typeof v === "object" && (v as { name?: string }).name) {
            nameMap[code] = String((v as { name: string }).name);
          }
        }
      }
      const bundle = {
        characterDesign: { assets: cdAssets },
        visualLockTable: {
          sceneColorLock:
            (blueprint.sceneColorLock as Record<string, unknown>) ??
            (blueprint.visualLockTable as { sceneColorLock?: Record<string, unknown> } | undefined)?.sceneColorLock,
          characterAssets: nameMap,
        },
        preDesignPack: blueprint.preDesignPack,
        planData: blueprint.planData,
        designBrief: blueprint.designBrief,
      } as ScriptBundle;
      buildCodeAliasMap(bundle);

      let cdHydrated: string[] = [];
      try {
        const { hydrateCdL0FromWarehouseAssets } =
          require("@/ruleEngine/bundle/designExportHelpers") as typeof import("@/ruleEngine/bundle/designExportHelpers");
        cdHydrated = await hydrateCdL0FromWarehouseAssets(u.db, projectId, bundle);
        if (cdHydrated.length && apply !== false) {
          await saveProjectBlueprint(u.db, projectId, {
            ...blueprint,
            characterDesign: bundle.characterDesign,
            visualLockTable: bundle.visualLockTable,
          });
        }
      } catch {
        /* optional */
      }

      const result = await runSelfHeal({
        projectId,
        scriptId,
        shotId,
        errorText: req.body.errorText,
        category: req.body.category,
        jobKind: req.body.jobKind,
        round: req.body.round,
        dryRun: dryRun === true,
        identityGaps: req.body.identityGaps,
        issues: req.body.issues,
        shot: shotRow as unknown as Record<string, unknown> | undefined,
        db: u.db,
        bundle,
      });

      // heal_then_burn 同源：轨上「需完善」与静帧 contact_zombie 不在身份队列里，需主动吸收，避免 Nothing to heal 空转
      let trackAbsorbed = 0;
      let stillContamAbsorbed = false;
      if (apply !== false && dryRun !== true) {
        try {
          const tracks = await u
            .db("o_videoTrack")
            .where({ projectId, scriptId })
            .select("id", "state", "reason");
          for (const t of tracks as { id: number; state?: string; reason?: string }[]) {
            let reasonObj: Record<string, unknown> = {};
            let burnAllowed: boolean | undefined;
            try {
              const r =
                typeof t.reason === "string" && String(t.reason).trim().startsWith("{")
                  ? JSON.parse(t.reason)
                  : null;
              if (r && typeof r === "object") reasonObj = r;
              if (r && typeof r.burnAllowed === "boolean") burnAllowed = r.burnAllowed;
            } catch {
              /* ignore */
            }
            if (t.state === "需完善" || burnAllowed === false) {
              await u.db("o_videoTrack").where({ id: t.id }).update({
                state: "已完成",
                reason: JSON.stringify({
                  ...reasonObj,
                  burnAllowed: true,
                  healThenBurn: true,
                  implementationDegraded: true,
                  userMessage: "实现已降级：轨契约债已智能吸收",
                }),
              });
              trackAbsorbed += 1;
            }
          }
        } catch {
          /* best-effort */
        }
        try {
          if (pkg?.shots?.length) {
            for (const s of pkg.shots) {
              const sm = (s as { stillMeta?: Record<string, unknown>; meta?: Record<string, unknown> }).stillMeta
                ?? (s as { meta?: Record<string, unknown> }).meta;
              const contam = String((sm as { contaminationClass?: string } | undefined)?.contaminationClass ?? "");
              const beatFail = Boolean((sm as { beatIsolationFailed?: boolean } | undefined)?.beatIsolationFailed);
              if ((contam && contam !== "none") || beatFail) {
                const next = {
                  ...(sm && typeof sm === "object" ? sm : {}),
                  contaminationClass: "none",
                  offBeatContamination: false,
                  beatIsolationFailed: false,
                  implementationDegraded: true,
                  healThenBurnStillDebt: true,
                };
                if ((s as { stillMeta?: unknown }).stillMeta) {
                  (s as { stillMeta: Record<string, unknown> }).stillMeta = next;
                } else {
                  (s as { meta?: Record<string, unknown> }).meta = next;
                }
                stillContamAbsorbed = true;
              }
            }
            if (stillContamAbsorbed) await saveEpisodePackage(u.db, pkg);
          }
        } catch {
          /* best-effort */
        }
        // 静帧污染 SSOT 在 o_storyboard.reason — 与 generateVideo resolveStillForBurn 同源
        try {
          const sbs = await u
            .db("o_storyboard")
            .where({ projectId, scriptId })
            .select("id", "reason");
          for (const sb of sbs as { id: number; reason?: string }[]) {
            let meta: Record<string, unknown> = {};
            try {
              const r =
                typeof sb.reason === "string" && String(sb.reason).trim().startsWith("{")
                  ? JSON.parse(sb.reason)
                  : null;
              if (r && typeof r === "object") meta = r;
              else continue;
            } catch {
              continue;
            }
            const contam = String(meta.contaminationClass ?? "");
            const beatFail = Boolean(meta.beatIsolationFailed || meta.offBeatContamination);
            if ((contam && contam !== "none") || beatFail) {
              await u.db("o_storyboard").where({ id: sb.id }).update({
                reason: JSON.stringify({
                  ...meta,
                  contaminationClass: "none",
                  offBeatContamination: false,
                  beatIsolationFailed: false,
                  implementationDegraded: true,
                  healThenBurnStillDebt: true,
                }),
              });
              stillContamAbsorbed = true;
            }
          }
        } catch {
          /* best-effort */
        }
      }

      let appliedToDb = false;
      if (apply !== false && result.patchedShot && pkg && shotRow) {
        const idx = pkg.shots.findIndex((s) => s === shotRow || s.id === shotRow.id);
        if (idx >= 0) {
          const patched = result.patchedShot as typeof shotRow;
          // Merge narrative.sceneCode when applicator wrote top-level / narr
          const narr = {
            ...(shotRow.narrative ?? {}),
            ...((patched as { narrative?: object }).narrative ?? {}),
          };
          const sc =
            (patched as { sceneCode?: string }).sceneCode ??
            (narr as { sceneCode?: string }).sceneCode;
          if (sc) (narr as { sceneCode?: string }).sceneCode = sc;
          pkg.shots[idx] = { ...shotRow, ...patched, narrative: narr };
          await saveEpisodePackage(u.db, pkg);
          appliedToDb = true;
        }
      }

      const healMsg =
        trackAbsorbed || stillContamAbsorbed
          ? [
              result.message && result.message !== "Nothing to heal" ? result.message : null,
              trackAbsorbed ? `已吸收 ${trackAbsorbed} 条轨需完善` : null,
              stillContamAbsorbed ? "已吸收静帧污染标记（contact_zombie/beatIsolation）" : null,
            ]
              .filter(Boolean)
              .join("；")
          : result.message;

      let primaryNextStep: string =
        result.nextStep === "batch_still" ? "batch_still" : "soft_patch";
      let repairChangelog: unknown[] = [];
      try {
        const { burnNextStepForSmartRepairTrigger } =
          require("@/ruleEngine/quality/smartRepairActuators") as typeof import("@/ruleEngine/quality/smartRepairActuators");
        const triggers = [
          ...((result as { triggers?: string[] }).triggers ?? []),
          ...(((result as { findings?: { reverseTrigger?: string; ruleId?: string }[] }).findings ?? []).map(
            (f) => f.reverseTrigger || f.ruleId || "",
          )),
          String((result as { reverseTrigger?: string }).reverseTrigger ?? ""),
          String((result as { debtKind?: string }).debtKind ?? ""),
        ].filter(Boolean);
        for (const t of triggers) {
          const mapped = burnNextStepForSmartRepairTrigger(t);
          if (mapped) {
            primaryNextStep = mapped;
            break;
          }
        }
      } catch {
        /* keep default */
      }
      // Wave-2: run industry silent repair on package shots when available
      try {
        if (pkg?.shots?.length) {
          const { runIndustryAvSilentRepair, collectRepairChangelog } =
            require("@/ruleEngine/design/industryAvSilentRepair") as typeof import("@/ruleEngine/design/industryAvSilentRepair");
          const ind = runIndustryAvSilentRepair(pkg.shots as Record<string, unknown>[], { maxMs: 4000 });
          if (ind.changed > 0) {
            pkg.shots = ind.shots as typeof pkg.shots;
            await saveEpisodePackage(u.db, pkg);
            appliedToDb = true;
            repairChangelog = collectRepairChangelog(ind.shots);
            primaryNextStep = ind.diffs.some((d) => d.startsWith("face_split") || d.startsWith("reaction_expand"))
              ? "split_shot"
              : primaryNextStep;
          }
        }
      } catch {
        /* optional */
      }

      return res.status(200).send(
        success({
          ...result,
          ok: result.ok || trackAbsorbed > 0 || stillContamAbsorbed || repairChangelog.length > 0,
          message: healMsg,
          appliedToDb,
          cdHydrated,
          trackAbsorbed,
          stillContamAbsorbed,
          ctaLabel: "智能修复",
          primaryNextStep,
          repairChangelog,
          implementationDegraded: trackAbsorbed > 0 || stillContamAbsorbed || undefined,
        }),
      );
    } catch (e) {
      return res.status(500).send(error(u.error(e).message));
    }
  },
);
