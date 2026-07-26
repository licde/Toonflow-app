/**
 * In-memory import-prep pipeline — same normalize path as import, no DB writes.
 */
import type { ScriptBundle } from "./types";
import type { ShapeSalvageEntry } from "./shapeSalvageTypes";
import { formatShapeSalvageSummary } from "./shapeSalvageTypes";
import { prepareBundleWithLog, scriptBundleSchema } from "./schema";
import { parseScriptBundleOrThrowShape } from "./schemaShapeErrors";
import { applySmartProposalsToBundle } from "../design/smartProposalApplier";
import { materializePackaging } from "./packagingMaterialize";
import { normalizePreDesignPack, applyNormalizedShotsToBundle } from "./normalizePreDesignPack";
import { hasPreDesignShots } from "./preDesignPackAdapter";
import { inferTierFromBundle } from "./closureSummary";
import type { ClosureTier } from "../portable/types";
import { normalizeVisualLockTableOnBundle } from "./assetLabel";
import { runShotExpanders } from "../design/expanderRegistry";
import { migrateShotVisualBeatTags } from "../design/visualBeatPolicy";
import { rebindMediaSlotsByClientId, cascadeForwardStale } from "../quality/forwardStaleCascade";

export type PrepareBundleShotCounts = {
  rawShotCount: number;
  postPrepareCount: number;
  authorShotsPresent: boolean;
  expandApplied: boolean;
  diagnoseOnly: boolean;
};

export interface PreparedBundleForInspect {
  bundle: ScriptBundle;
  tier: ClosureTier;
  shapeSalvageLog?: ShapeSalvageEntry[];
  shapeSalvageSummary?: string;
  speakerOrphans: { name: string; code: string }[];
  shotCounts?: PrepareBundleShotCounts;
}

export interface PrepareBundleForInspectOpts {
  /** false for exportGate strict check; true (default) for import/dryRun ingest */
  ingestHeal?: boolean;
  /**
   * When author preDesignPack.shots already exist:
   * - Chat (ingestHeal false / chatStrict): diagnose-only unless forceExpand
   * - Import/ingest: pressure-gated smart expand (same-kernel heal; refuse/same-VD still guard)
   */
  forceExpand?: boolean;
}

/** Parse + materialize + normalize (mirror import asset-closure prep). */
export function prepareBundleForInspect(raw: unknown, opts: PrepareBundleForInspectOpts = {}): PreparedBundleForInspect {
  const prepared = prepareBundleWithLog(raw);
  const parsed = parseScriptBundleOrThrowShape(prepared.bundle, scriptBundleSchema) as ScriptBundle;
  let bundle = parsed;
  const proposals = (bundle as ScriptBundle & { smartDesignProposals?: unknown[] }).smartDesignProposals;
  if (proposals?.length) {
    bundle = applySmartProposalsToBundle(bundle, proposals as Parameters<typeof applySmartProposalsToBundle>[1]);
  }
  const mat = materializePackaging(bundle);
  bundle = mat.bundle;
  normalizeVisualLockTableOnBundle(bundle);

  let speakerOrphans: { name: string; code: string }[] = [];
  let semanticHealLog: ShapeSalvageEntry[] = [];
  let rawShotCount = 0;
  let authorShotsPresent = false;
  let expandApplied = false;
  let diagnoseOnly = false;

  if (bundle.preDesignPack && hasPreDesignShots(bundle.preDesignPack)) {
    authorShotsPresent = true;
    rawShotCount = Array.isArray(bundle.preDesignPack.shots) ? bundle.preDesignPack.shots.length : 0;
    const normalized = normalizePreDesignPack(bundle, {
      ingestHeal: opts.ingestHeal !== false,
      chatStrict: Boolean((bundle as { chatStrict?: boolean }).chatStrict),
    });
    let shots = normalized.shots as Record<string, unknown>[];
    if (opts.ingestHeal !== false) {
      shots = shots.map((s) => migrateShotVisualBeatTags(s, { confirmSuggested: false }));
      const meta =
        ((bundle.planData as { meta?: Record<string, unknown> } | undefined)?.meta ??
          (bundle as unknown as { meta?: Record<string, unknown> }).meta) ??
        {};
      const chatStrict = Boolean((bundle as { chatStrict?: boolean }).chatStrict);
      // Import/ingest: pressure-gated smart expand（同核愈）；Chat 默认诊不拆，除非 forceExpand
      let allowApplyExpand = Boolean(opts.forceExpand) && !chatStrict;
      if (!allowApplyExpand && !chatStrict && opts.ingestHeal !== false) {
        try {
          const { diagnoseStillIntent } =
            require("../design/stillIntentReverse") as typeof import("../design/stillIntentReverse");
          const { detectLipSplitPressure } =
            require("../design/lipSplit") as typeof import("../design/lipSplit");
          const diagnose = diagnoseStillIntent(shots, {
            chatStrict: true,
            bundle,
            planData: (bundle.planData as Record<string, unknown>) ?? {},
            meta,
          });
          const lipP = shots.some((s) => detectLipSplitPressure(s).mustConfirm);
          allowApplyExpand = Boolean(
            diagnose.confirmRequired ||
              lipP ||
              (diagnose.patches?.length ?? 0) > 0,
          );
        } catch {
          allowApplyExpand = true;
        }
      }
      diagnoseOnly = !allowApplyExpand;

      if (!chatStrict || diagnoseOnly) {
        if (allowApplyExpand) {
          const { shouldMigrateMultiBeat, migrateMultiBeatStockShots } =
            require("../design/migrateMultiBeatStock") as typeof import("../design/migrateMultiBeatStock");
          if (shouldMigrateMultiBeat(meta)) {
            const mig = migrateMultiBeatStockShots(shots, { meta });
            shots = mig.shots;
            if (mig.migrated > 0) {
              expandApplied = true;
              semanticHealLog.push({
                ruleId: "DEX-STILL-ONEBEAT",
                path: "preDesignPack.shots",
                action: `migrate:${mig.migrated};refuse=${mig.refused}`,
              });
            }
          }
        }

        try {
          const { runStillIntentHeal, diagnoseStillIntent } =
            require("../design/stillIntentReverse") as typeof import("../design/stillIntentReverse");
          applyNormalizedShotsToBundle(bundle, shots as Parameters<typeof applyNormalizedShotsToBundle>[1]);
          if (allowApplyExpand) {
            const ird = runStillIntentHeal(bundle, {
              chatStrict: false,
              meta,
              planData: (bundle.planData as Record<string, unknown>) ?? {},
            });
            shots = ird.shots;
            if (ird.applied.length) {
              expandApplied = true;
              semanticHealLog.push({
                ruleId: "IRD-APPLY",
                path: "preDesignPack.shots",
                action: `applied:${ird.applied.length};refused:${ird.refused.length}`,
              });
              (bundle as { _importSplitExpanded?: boolean })._importSplitExpanded = true;
              const bMeta = ((bundle as { meta?: Record<string, unknown> }).meta ??= {});
              bMeta.irdProvenance = (bundle.meta as { irdProvenance?: unknown })?.irdProvenance ?? bMeta.irdProvenance;
              bMeta.importOkNotExitPass = true;
            }
            if (ird.diagnose.confirmRequired || ird.refused.length) {
              semanticHealLog.push({
                ruleId: "IRD-CONFIRM",
                path: "preDesignPack.shots",
                action: `confirmRequired;primary=${ird.diagnose.primaryAction}`,
              });
              (bundle as { irdConfirmRequired?: boolean }).irdConfirmRequired = true;
            }
          } else {
            // diagnose-only: no apply — mustSplit → Confirm, never silent expand
            const diagnose = diagnoseStillIntent(shots, {
              chatStrict: true,
              bundle,
              planData: (bundle.planData as Record<string, unknown>) ?? {},
              meta,
            });
            const must =
              diagnose.confirmRequired ||
              diagnose.patches.some((p) => p.op === "split_onebeat" || p.op === "split_speak_react");
            if (must) {
              semanticHealLog.push({
                ruleId: "IRD-DIAGNOSE-ONLY",
                path: "preDesignPack.shots",
                action: `mustSplit;primary=${diagnose.primaryAction};patches=${diagnose.patches.length}`,
              });
              (bundle as { irdConfirmRequired?: boolean }).irdConfirmRequired = true;
              const bMeta = ((bundle as { meta?: Record<string, unknown> }).meta ??= {});
              bMeta.irdConfirmRequired = true;
              bMeta.importOkNotExitPass = true;
              bMeta.importDiagnoseOnly = true;
            } else {
              semanticHealLog.push({
                ruleId: "IRD-DIAGNOSE-ONLY",
                path: "preDesignPack.shots",
                action: "ok_no_must_split",
              });
            }
          }
        } catch (e) {
          semanticHealLog.push({
            ruleId: allowApplyExpand ? "IRD-FALLBACK" : "IRD-DIAGNOSE-ONLY",
            path: "preDesignPack.shots",
            action: e instanceof Error ? e.message.slice(0, 80) : "ird_fail",
          });
        }

        try {
          const { runCamFitUntilClear } =
            require("../export/camFitHygiene") as typeof import("../export/camFitHygiene");
          applyNormalizedShotsToBundle(bundle, shots as Parameters<typeof applyNormalizedShotsToBundle>[1]);
          const cam = runCamFitUntilClear(bundle, {
            chatStrict: !allowApplyExpand,
            maxRounds: allowApplyExpand ? 5 : 0,
          });
          shots = ((bundle.preDesignPack as { shots?: Record<string, unknown>[] })?.shots ?? shots) as Record<
            string,
            unknown
          >[];
          if (cam.applied) {
            expandApplied = true;
            semanticHealLog.push({
              ruleId: "SH-CAM-FIT-UNTIL-CLEAR",
              path: "preDesignPack.shots",
              action: `applied:${cam.applied};rounds:${cam.rounds};remain=${cam.remainingMustSplit}`,
            });
            (bundle as { _importSplitExpanded?: boolean })._importSplitExpanded = true;
          }
          if (cam.confirmRequired) {
            semanticHealLog.push({
              ruleId: allowApplyExpand ? "IRD-CONFIRM" : "IRD-DIAGNOSE-ONLY",
              path: "preDesignPack.shots",
              action: `cam_fit_remain:${cam.remainingMustSplit}`,
            });
            (bundle as { irdConfirmRequired?: boolean }).irdConfirmRequired = true;
            const bMeta = ((bundle as { meta?: Record<string, unknown> }).meta ??= {});
            bMeta.irdConfirmRequired = true;
            if (!allowApplyExpand) bMeta.importDiagnoseOnly = true;
          }
        } catch (e) {
          semanticHealLog.push({
            ruleId: "CAM-FIT-FALLBACK",
            path: "preDesignPack.shots",
            action: e instanceof Error ? e.message.slice(0, 80) : "cam_fit_fail",
          });
        }

        if (allowApplyExpand) {
          const expanded = runShotExpanders(shots, {
            meta: { ...meta, pillarsVisBeatV2: (meta.pillarsVisBeatV2 as string) || "enforce" },
            applyClusters: true,
            applyStillOneBeat: true,
          });
          shots = expanded.shots;
          if (expanded.log.some((l) => l.expanded)) {
            expandApplied = true;
            semanticHealLog.push({
              ruleId: "VIS-MULTI-BEAT",
              path: "preDesignPack.shots",
              action: `expand:${expanded.log.map((l) => `${l.expanderId}:${l.count}`).join(",")}`,
            });
            cascadeForwardStale({ shots, forwardStages: ["SB", "MD-IMG", "EN"] });
            (bundle as { _importSplitExpanded?: boolean })._importSplitExpanded = true;
            const bAny = bundle as { meta?: Record<string, unknown> };
            if (!bAny.meta) bAny.meta = {};
            bAny.meta.importSplitExpanded = true;
            if (!bAny.meta.irdProvenance) {
              semanticHealLog.push({
                ruleId: "IRD-PROVENANCE-MISSING",
                path: "meta",
                action: "silent_expand_without_ird",
              });
            }
          }
        } else {
          semanticHealLog.push({
            ruleId: "IMPORT-NO-REEXPAND",
            path: "preDesignPack.shots",
            action: `author_shots=${rawShotCount};skip_expanders`,
          });
        }
      }
    }
    // L-t04: rebind mediaSlots by clientId after expand (never rely on bare index alone)
    const pack = bundle.preDesignPack as { mediaSlots?: Array<{ shotIndex?: number; clientId?: string; role?: string }> } | undefined;
    if (pack?.mediaSlots?.length) {
      pack.mediaSlots = rebindMediaSlotsByClientId(pack.mediaSlots, shots) ?? pack.mediaSlots;
    }
    applyNormalizedShotsToBundle(bundle, shots as Parameters<typeof applyNormalizedShotsToBundle>[1]);
    // Post-expand: derived tables + OS→dialoguePlan + causal stubs
    try {
      const { reindexDerivedTables } =
        require("./reindexDerivedTables") as typeof import("./reindexDerivedTables");
      const { syncOsPeelToDialoguePlan, stubCausedByActionIds } =
        require("../design/osPeelToDialoguePlan") as typeof import("../design/osPeelToDialoguePlan");
      const ri = reindexDerivedTables(bundle);
      if (ri.fxStubbed || ri.fxReindexed || ri.mirrored) {
        semanticHealLog.push({
          ruleId: "REINDEX-DERIVED",
          path: "fxFeasibilityAudit|dialoguePlan|preview",
          action: `fx=${ri.fxReindexed}+${ri.fxStubbed};mirror=${ri.mirrored};preview=${ri.previewRebound}`,
        });
      }
      const os = syncOsPeelToDialoguePlan(bundle);
      if (os.added || os.lipStripped) {
        semanticHealLog.push({
          ruleId: "OS-PEEL-PLAN",
          path: "dialoguePlan.lines",
          action: `added=${os.added};lipStrip=${os.lipStripped}`,
        });
      }
      const stubbed = stubCausedByActionIds(bundle);
      if (stubbed) {
        semanticHealLog.push({
          ruleId: "CAUSAL-STUB",
          path: "dialoguePlan.lines[].causedByActionId",
          action: `stubbed=${stubbed}`,
        });
      }
    } catch (e) {
      semanticHealLog.push({
        ruleId: "REINDEX-DERIVED",
        path: "post_expand",
        action: e instanceof Error ? e.message.slice(0, 80) : "fail",
      });
    }
    // Duration raise-only: bare 1s + dialogue → min 2
    for (const s of shots) {
      const lines = (s.narrative as { dialogue?: { lines?: unknown[] } } | undefined)?.dialogue?.lines ?? [];
      const hasDial = Array.isArray(lines) && lines.some((l) => String((l as { text?: string })?.text ?? "").trim());
      const dur = Number(s.duration);
      if (hasDial && Number.isFinite(dur) && dur > 0 && dur < 2) {
        s.duration = 2;
        semanticHealLog.push({
          ruleId: "DURATION-RAISE",
          path: `preDesignPack.shots[${s.shotIndex ?? "?"}].duration`,
          action: `${dur}→2`,
        });
      }
    }
    applyNormalizedShotsToBundle(bundle, shots as Parameters<typeof applyNormalizedShotsToBundle>[1]);
    speakerOrphans = normalized.speakerOrphans ?? [];
    semanticHealLog = [...(normalized.semanticHealLog ?? []), ...semanticHealLog];
    (bundle as { _speakerOrphans?: { name: string; code: string }[] })._speakerOrphans = speakerOrphans;
  }

  const postPrepareCount =
    bundle.preDesignPack && Array.isArray(bundle.preDesignPack.shots)
      ? bundle.preDesignPack.shots.length
      : rawShotCount;
  const shotCounts: PrepareBundleShotCounts = {
    rawShotCount: rawShotCount || postPrepareCount,
    postPrepareCount,
    authorShotsPresent,
    expandApplied,
    diagnoseOnly: authorShotsPresent && diagnoseOnly,
  };
  const bMetaCounts = ((bundle as { meta?: Record<string, unknown> }).meta ??= {});
  bMetaCounts.prepareShotCounts = shotCounts;
  if (shotCounts.diagnoseOnly) {
    bMetaCounts.importDiagnoseOnly = true;
    bMetaCounts.expandProvenance = {
      mode: "diagnose_only",
      at: new Date().toISOString(),
      forceExpand: false,
      via: "prepareBundleForInspect",
    };
  } else if (expandApplied) {
    bMetaCounts.expandProvenance = {
      mode: "force_expand",
      at: new Date().toISOString(),
      forceExpand: true,
      via: "prepareBundleForInspect",
    };
  }
  if (
    shotCounts.authorShotsPresent &&
    shotCounts.postPrepareCount > shotCounts.rawShotCount &&
    shotCounts.rawShotCount > 0 &&
    shotCounts.postPrepareCount / shotCounts.rawShotCount >= 2
  ) {
    semanticHealLog.push({
      ruleId: "IMPORT-EXPAND-RATIO",
      path: "preDesignPack.shots",
      action: `${shotCounts.rawShotCount}→${shotCounts.postPrepareCount}`,
    });
    (bundle as { irdConfirmRequired?: boolean }).irdConfirmRequired = true;
    bMetaCounts.importOkNotExitPass = true;
  }

  // False-green: Chat selfcheck/modality cannot alone claim pass after ingest
  if (opts.ingestHeal !== false) {
    const bMeta = ((bundle as { meta?: Record<string, unknown> }).meta ??= {});
    if (bMeta.importOkNotExitPass || (bundle as { _importSplitExpanded?: boolean })._importSplitExpanded) {
      bMeta.importOkNotExitPass = true;
    }
    const self = (bundle.narrativeSelfcheck ??
      (bundle.planData as { narrativeSelfcheck?: { passed?: boolean } } | undefined)?.narrativeSelfcheck) as
      | { passed?: boolean; serverOverwritten?: boolean; failedIds?: string[] }
      | undefined;
    if (
      self?.passed === true &&
      (Boolean((bundle as { irdConfirmRequired?: boolean }).irdConfirmRequired) || Boolean(bMeta.importOkNotExitPass))
    ) {
      const failIds = [
        ...new Set([
          ...(self.failedIds ?? []),
          ...((bundle as { irdConfirmRequired?: boolean }).irdConfirmRequired ? ["IRD-CONFIRM"] : []),
          ...(bMeta.importOkNotExitPass ? ["IMPORT_OK_NOT_EXIT"] : []),
        ]),
      ];
      bundle.narrativeSelfcheck = {
        ...self,
        passed: false,
        failedIds: failIds,
        serverOverwritten: true,
        checkedAt: new Date().toISOString(),
      } as never;
      semanticHealLog.push({
        ruleId: "FALSE-GREEN-SELFCHECK",
        path: "narrativeSelfcheck",
        action: `overwrite_pass:${failIds.join(",")}`,
      });
    }
    const mod = (bundle.modalityPromptAudit ??
      (bundle.planData as { modalityPromptAudit?: Record<string, string> } | undefined)?.modalityPromptAudit) as
      | Record<string, string>
      | undefined;
    if (mod && bMeta.importOkNotExitPass) {
      if (mod.IMG === "pass" || mod.VID === "pass") {
        bundle.modalityPromptAudit = {
          ...mod,
          IMG: mod.IMG === "pass" ? "import_ok_not_exit" : mod.IMG,
          VID: mod.VID === "pass" ? "import_ok_not_exit" : mod.VID,
          _serverNote: "import≠designExitPass",
        } as never;
        semanticHealLog.push({
          ruleId: "FALSE-GREEN-MODALITY",
          path: "modalityPromptAudit",
          action: "downgrade_pass_to_import_ok_not_exit",
        });
      }
    }
  }

  const mergedLog = [...(prepared.shapeSalvageLog ?? []), ...semanticHealLog];
  const tier = inferTierFromBundle(bundle);
  return {
    bundle,
    tier,
    shapeSalvageLog: mergedLog,
    shapeSalvageSummary: formatShapeSalvageSummary(mergedLog),
    speakerOrphans,
    shotCounts,
  };
}
