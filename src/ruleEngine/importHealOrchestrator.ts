/**
 * Unified import heal: Salvage → Normalize → PrecheckLoop → ExportGate.
 */
import { prepareBundleForInspect } from "./bundle/prepareBundleForInspect";
import type { ShapeSalvageEntry } from "./bundle/shapeSalvageTypes";
import type { ScriptBundle } from "./bundle/types";
import { buildAggregatedChatRepairText, runExportGate } from "./exportGate";
import {
  createInMemoryPatchApplier,
  runPrecheckLoop,
  type LoopResult,
  type SuggestedPatch,
} from "./precheckLoop";
import type { PatchApplierPort } from "./precheckLoop/ports";
import type { InspectBundleResult } from "./portable/types";
import { projectFxProseOnBundle } from "./import/projectFxProse";
import { declareF0OnBundle } from "./import/declareF0";
import { demoteOrphanSceneFxOnBundle } from "./import/demoteOrphanSceneFx";
import {
  canSilentHeal,
  consumeSilentHeal,
  createHealBudget,
  type HealBudgetState,
} from "./heal/healBudgetLedger";
import {
  DEFAULT_EPISODE_DURATION_CAP,
  resolveRequiredDuration,
  sumShotDurations,
} from "./compilers/resolveRequiredDuration";
import { buildSplitPlanStub, type SplitPlanStub } from "./compilers/splitPlanStub";
import { buildPrimaryBlock, coldStartPrimaryBlock, type PrimaryBlock } from "./compilers/primaryBlock";
import { observeImportHeal } from "./heal/obsHealBridge";

export const DEFAULT_IMPORT_HEAL_CHECKS = [
  "LANG-01",
  "PR-CAM-01",
  "DC-09",
  "FX-GRADE-01",
  "LIP-01",
  "CAM-SPEAK",
  "VP-CONFLICT",
] as const;

export interface RunImportHealInput {
  raw: unknown;
  checks?: string[];
  apply?: boolean;
  maxRounds?: number;
  acknowledgeKeepLegacy?: boolean;
  forceExpand?: boolean;
}

export interface HealLogEntry {
  at: string;
  ruleId: string;
  action: string;
  detail?: string;
}

export interface ImportHealResult {
  bundle: ScriptBundle;
  shapeSalvageLog: ShapeSalvageEntry[];
  precheckLoop: LoopResult;
  exportGate: {
    exportAllowed: boolean;
    tier: "T1" | "T2" | "T3";
    closureSnapshot: ReturnType<typeof runExportGate>["closureSnapshot"];
    coverage: ReturnType<typeof runExportGate>["coverage"];
    chatRepairText: string;
    blocks: ReturnType<typeof runExportGate>["blocks"];
    warns: ReturnType<typeof runExportGate>["warns"];
    repairHints: ReturnType<typeof runExportGate>["repairHints"];
  };
  inspected: InspectBundleResult;
  serverFixedIds: string[];
  chatMustFixIds: string[];
  /** Structured heal audit (cross-heal-audit) */
  healLog: HealLogEntry[];
  healBudget: HealBudgetState;
  primary?: PrimaryBlock;
  splitPlans?: SplitPlanStub[];
  /** FX prose projected from visualEffect / audit.desc (not invented) */
  fxProjected?: { shotIndex: number; from: string }[];
  /** Empty undeclared shots healed to F0 (no prose invented) */
  f0Declared?: number[];
  /** Orphan sceneRef F1+ demoted to F0 */
  orphanScenesDemoted?: number[];
  stillBlocked?: string[];
}

function salvageRuleIds(log: ShapeSalvageEntry[]): string[] {
  return [...new Set(log.map((e) => e.ruleId))];
}

function captureApplier(): { applier: PatchApplierPort; getBundle: () => ScriptBundle | null } {
  let last: ScriptBundle | null = null;
  const base = createInMemoryPatchApplier();
  return {
    getBundle: () => last,
    applier: {
      apply(bundle: ScriptBundle, patches: SuggestedPatch[]) {
        const r = base.apply(bundle, patches);
        last = r.bundle;
        return r;
      },
    },
  };
}

function collectChatMustFixIds(
  exportGate: ReturnType<typeof runExportGate>,
  salvagedRuleIds: Set<string>,
): string[] {
  const ids = new Set<string>();
  for (const b of exportGate.blocks) ids.add(b.id);
  for (const id of exportGate.closureSnapshot.blockIds) ids.add(id);
  for (const id of [...ids]) {
    if (salvagedRuleIds.has(id)) ids.delete(id);
  }
  return [...ids].filter(Boolean).sort();
}

export function runImportHeal(input: RunImportHealInput): ImportHealResult {
  const prep = prepareBundleForInspect(input.raw, { ingestHeal: true });
  const shapeSalvageLog = prep.shapeSalvageLog ?? [];
  const salvagedRuleIds = new Set(salvageRuleIds(shapeSalvageLog));
  const apply = input.apply !== false;
  const healLog: HealLogEntry[] = [];
  let healBudget = createHealBudget();
  const now = () => new Date().toISOString();

  const shots0 = (prep.bundle.preDesignPack?.shots ?? []) as Record<string, unknown>[];
  if (!shots0.length && apply) {
    const primary = coldStartPrimaryBlock("import");
    const exportGateFull = runExportGate(prep.bundle, {
      bundle: prep.bundle,
      tier: prep.tier,
      alreadyPrepared: true,
      shapeSalvageLog,
      allowShapeSalvage: true,
    });
    return {
      bundle: prep.bundle,
      shapeSalvageLog,
      precheckLoop: {
        schemaVersion: 1,
        ok: false,
        exhausted: true,
        round: 0,
        findings: [],
        decision: { mode: "human", reason: "no_shots" },
        applied: [],
      } as LoopResult,
      exportGate: {
        exportAllowed: false,
        tier: exportGateFull.tier,
        closureSnapshot: exportGateFull.closureSnapshot,
        coverage: exportGateFull.coverage,
        chatRepairText: primary.userMessage,
        blocks: exportGateFull.blocks,
        warns: exportGateFull.warns,
        repairHints: exportGateFull.repairHints,
      },
      inspected: exportGateFull.inspected,
      serverFixedIds: [],
      chatMustFixIds: ["COLD-START"],
      healLog: [{ at: now(), ruleId: "COLD-START", action: "surface", detail: primary.userMessage }],
      healBudget,
      primary,
      stillBlocked: ["COLD-START"],
    };
  }

  let working = prep.bundle;

  // Design-layer INTENT/CREF/NAR auto-close (same kernel as export) before import heals
  if (apply) {
    try {
      const { applyDesignAutoCloseToBundle } =
        require("./design/designAutoClose") as typeof import("./design/designAutoClose");
      const ac = applyDesignAutoCloseToBundle(working, { stageId: "SB", maxRounds: 4, forceExpand: true });
      working = ac.bundle;
      if (ac.autoClosed.applied) {
        for (const id of ac.autoClosed.clearedIds) salvagedRuleIds.add(id);
        healLog.push({
          at: now(),
          ruleId: "SH-DESIGN-AUTO-CLOSE",
          action: "design_auto_close",
          detail: `cleared=${ac.autoClosed.clearedIds.join(",") || "none"};ops=${ac.autoClosed.changes.length}`,
        });
        (shapeSalvageLog as ShapeSalvageEntry[]).push({
          ruleId: "SH-DESIGN-AUTO-CLOSE",
          path: "planData.shotDesignIntent|assetCrefPlan|dialoguePlan",
          action: `cleared=${ac.autoClosed.clearedIds.join(",") || "none"}`,
        });
      }
    } catch {
      /* optional */
    }

    // Video homology until-clear: pseudo lines / orphan lip / beat / intent
    try {
      const { softHealVideoHomologyOnShots } =
        require("./heal/videoHomologyHeal") as typeof import("./heal/videoHomologyHeal");
      const pd = working.preDesignPack as { shots?: Record<string, unknown>[] } | undefined;
      const shots = [...(pd?.shots ?? [])];
      if (shots.length) {
        const vh = softHealVideoHomologyOnShots({ shots });
        if (vh.changed && pd) {
          pd.shots = vh.shots as never;
          working = { ...working, preDesignPack: pd };
          for (const h of vh.heals) {
            if (h === "sound_dialogue_false_on_silent") {
              salvagedRuleIds.add("DEX-VID-VOICE-MODE");
            } else if (h === "heal_av_scene_sfx") {
              salvagedRuleIds.add("SFX-SCENE-MISMATCH");
            } else {
              salvagedRuleIds.add(h.startsWith("ird:") ? "DEX-VID-PSEUDO-LINE" : "DEX-VID-VOICE-MODE");
            }
            healLog.push({ at: now(), ruleId: "SH-VIDEO-HOMOLOGY", action: h });
          }
          if (vh.cleared) {
            salvagedRuleIds.add("DEX-VID-PSEUDO-LINE");
            salvagedRuleIds.add("DEX-VID-VOICE-MODE");
            salvagedRuleIds.add("DEX-VID-BEAT-DUR");
          }
          (shapeSalvageLog as ShapeSalvageEntry[]).push({
            ruleId: "SH-VIDEO-HOMOLOGY",
            path: "preDesignPack.shots",
            action: `heals=${vh.heals.join(",")};cleared=${vh.cleared}`,
          });
        }
      }
    } catch {
      /* optional */
    }

    // Import ≡ design: same-kernel smart split (placement heal + SplitOrchestrator)
    try {
      const meta = ((working as { meta?: Record<string, unknown> }).meta ??= {});
      if (!meta.importSplitExpanded) {
        const { healMisboundDialoguePlacement } =
          require("./design/dialoguePlacementMatch") as typeof import("./design/dialoguePlacementMatch");
        const { runSplitOrchestrator } =
          require("./design/splitOrchestrator") as typeof import("./design/splitOrchestrator");
        const { detectLipSplitPressure } =
          require("./design/lipSplit") as typeof import("./design/lipSplit");
        const pack = working.preDesignPack ?? { shots: [] };
        let shots = [...((pack.shots ?? []) as Record<string, unknown>[])];
        const place = healMisboundDialoguePlacement(shots);
        shots = place.shots;
        const planData = (working.planData ?? {}) as Record<string, unknown>;
        const needOrch = shots.some((s) => detectLipSplitPressure(s).mustConfirm) || place.remainingPressure > 0;
        if (needOrch || place.stripped || place.peeledToAudio) {
          const orch = runSplitOrchestrator({
            planData,
            shots,
            meta,
            applyClauseSplit: true,
            applyVisBeatExpanders: true,
            applySemanticSplit: true,
          });
          pack.shots = orch.shots as never;
          working.preDesignPack = pack;
          working.planData = orch.planData;
          meta.importSplitExpanded = true;
          const remain = orch.shots.filter((s) => detectLipSplitPressure(s).mustConfirm).length;
          if (remain > 0) {
            meta.lipConfirmRequired = true;
            meta.importOkNotExitPass = true;
          } else {
            meta.lipConfirmRequired = false;
          }
          healLog.push({
            at: now(),
            ruleId: "SH-IMPORT-SMART-SPLIT",
            action: "orchestrator",
            detail: `strip=${place.stripped};peel=${place.peeledToAudio};shots=${orch.shots.length};remain=${remain};log=${orch.log.map((l) => l.step).join(",")}`,
          });
          (shapeSalvageLog as ShapeSalvageEntry[]).push({
            ruleId: "SH-IMPORT-SMART-SPLIT",
            path: "preDesignPack.shots",
            action: `remain=${remain}`,
          });
          salvagedRuleIds.add("LIP-01");
          salvagedRuleIds.add("DEX-LIP-SPLIT");
        }
      }
    } catch (e) {
      healLog.push({
        at: now(),
        ruleId: "SH-IMPORT-SMART-SPLIT",
        action: "fail",
        detail: e instanceof Error ? e.message : "err",
      });
    }
  }

  // Fixed order D15: projectFx → orphan → F0 → precheckLoop → orphan → F0 → exportGate once
  const fxProj = apply && canSilentHeal(healBudget) ? projectFxProseOnBundle(working) : { projected: [], strippedLetterStubs: [] };
  if (fxProj.projected.length) {
    healBudget = consumeSilentHeal(healBudget, fxProj.projected.length);
    for (const p of fxProj.projected) {
      healLog.push({ at: now(), ruleId: "FX-PROJECT", action: "project_prose", detail: `shot ${p.shotIndex}` });
    }
  }
  const orphanDemote = apply && canSilentHeal(healBudget) ? demoteOrphanSceneFxOnBundle(working) : { demoted: [] };
  if (orphanDemote.demoted.length) {
    healBudget = consumeSilentHeal(healBudget, orphanDemote.demoted.length);
    healLog.push({ at: now(), ruleId: "ORPHAN-F0", action: "demote", detail: orphanDemote.demoted.join(",") });
  }
  const f0Heal = apply && canSilentHeal(healBudget) ? declareF0OnBundle(working) : { declared: [], demotedFxAudit: false };
  if (f0Heal.declared.length) {
    healBudget = consumeSilentHeal(healBudget, f0Heal.declared.length);
    healLog.push({ at: now(), ruleId: "FX-F0", action: "declare", detail: f0Heal.declared.join(",") });
  }

  // Homology: strip duration/punct + absorb literary EXTRA into plan before exportGate
  if (apply && canSilentHeal(healBudget)) {
    try {
      const { softHealTouchHomology } =
        require("./heal/touchHomologyHeal") as typeof import("./heal/touchHomologyHeal");
      const heal = softHealTouchHomology(working);
      if (heal.absorbed > 0 || heal.strippedNoise > 0 || heal.f0Declared.length) {
        healBudget = consumeSilentHeal(healBudget, 1);
        healLog.push({
          at: now(),
          ruleId: "DC-01-EXTRA",
          action: "homology_until_clear",
          detail: `cleared=${heal.cleared};noise=${heal.strippedNoise};absorb=${heal.absorbed};left=${heal.extrasLeft};f0=${heal.f0Declared.length}`,
        });
        (shapeSalvageLog as ShapeSalvageEntry[]).push({
          ruleId: "SH-DC01-ABSORB-EXTRA",
          path: "planData.dialoguePlan.lines",
          action: `cleared=${heal.cleared};noise=${heal.strippedNoise};absorb=${heal.absorbed};left=${heal.extrasLeft}`,
        });
      }
      // Only mark salvaged when detector cleared (no half-heal fake clear)
      if (heal.cleared || heal.extrasLeft === 0) {
        salvagedRuleIds.add("DC-01-EXTRA");
        salvagedRuleIds.add("H3");
      }
      if (heal.undeclaredFxLeft === 0 && heal.f0Declared.length) {
        salvagedRuleIds.add("FX-GRADE-01");
      }
    } catch {
      /* optional */
    }
  }

  // Episode duration budget (D1): stop silent raises when sum would exceed cap
  const episodeCap = DEFAULT_EPISODE_DURATION_CAP;
  const used = sumShotDurations(shots0);
  const allowRaise = used < episodeCap;

  // 导入兜底：同核抬时（设计主责已抬；此处清历史/旁路残留）
  if (apply && allowRaise && canSilentHeal(healBudget)) {
    try {
      const { raiseDurationHygieneOnly } =
        require("./export/durationHygiene") as typeof import("./export/durationHygiene");
      const vendorId =
        (working as { meta?: { vendorId?: string } }).meta?.vendorId ??
        (working.planData as { vendorId?: string } | undefined)?.vendorId ??
        null;
      const hy = raiseDurationHygieneOnly(working, {
        vendorId,
        episodeCap,
        respectEpisodeCap: true,
      });
      if (hy.raised) {
        healBudget = consumeSilentHeal(healBudget, hy.raised);
        salvagedRuleIds.add("LIP-01");
        salvagedRuleIds.add("DFW-DURATION");
        healLog.push({
          at: now(),
          ruleId: "LIP-01",
          action: "import_raise_duration",
          detail: `raised=${hy.raised};cap_skip=${hy.skippedCap};${hy.log.slice(0, 6).join(",")}`,
        });
        (shapeSalvageLog as ShapeSalvageEntry[]).push({
          ruleId: "SH-DURATION-ALIGN",
          path: "preDesignPack.shots[].duration",
          action: `import_raise:${hy.raised};cap=${hy.skippedCap}`,
        });
      }
    } catch {
      /* optional */
    }
  }

  const capture = captureApplier();
  const precheckLoop = runPrecheckLoop(
    {
      bundle: working,
      checks: input.checks ?? [...DEFAULT_IMPORT_HEAL_CHECKS],
      apply: apply && allowRaise && canSilentHeal(healBudget),
      maxRounds: input.maxRounds ?? 2,
    },
    { applier: capture.applier },
  );
  if (precheckLoop.applied?.length) {
    healBudget = consumeSilentHeal(healBudget, precheckLoop.applied.length);
    for (const a of precheckLoop.applied) {
      healLog.push({ at: now(), ruleId: a.split(":")[0] || "PRECHECK", action: "soft_patch", detail: a });
    }
  }

  const bundle = (apply ? capture.getBundle() : null) ?? working;
  const orphanAfter = apply && canSilentHeal(healBudget) ? demoteOrphanSceneFxOnBundle(bundle) : { demoted: [] };
  const f0After = apply && canSilentHeal(healBudget) ? declareF0OnBundle(bundle) : { declared: [], demotedFxAudit: false };
  const f0Declared = [...new Set([...f0Heal.declared, ...f0After.declared])];
  const orphanScenesDemoted = [...new Set([...orphanDemote.demoted, ...orphanAfter.demoted])];

  const splitPlans: SplitPlanStub[] = [];
  for (const s of (bundle.preDesignPack?.shots ?? []) as Record<string, unknown>[]) {
    const stub = buildSplitPlanStub(s);
    if (stub) splitPlans.push(stub);
  }

  const exportGateFull = runExportGate(bundle, {
    bundle,
    tier: prep.tier,
    alreadyPrepared: true,
    shapeSalvageLog,
    allowShapeSalvage: true,
    acknowledgeKeepLegacy: Boolean(input.acknowledgeKeepLegacy),
    forceExpand: Boolean(input.forceExpand),
  });

  const chatRepairText = exportGateFull.chatRepairText;

  const serverFixedIds = [
    ...salvageRuleIds(shapeSalvageLog),
    ...(precheckLoop.applied ?? []).map((a) => a.split(":")[0]!).filter(Boolean),
    ...fxProj.projected.map((p) => `FX-PROJECT:${p.shotIndex}`),
    ...f0Declared.map((i) => `FX-F0:${i}`),
    ...orphanScenesDemoted.map((r) => `ORPHAN-F0:${r}`),
  ];

  const chatMustFixIds = collectChatMustFixIds(exportGateFull, salvagedRuleIds);

  let primary: PrimaryBlock | undefined;
  if (splitPlans.length) {
    primary = buildPrimaryBlock("split_shot", { stage: "import" });
  } else if (chatMustFixIds.length) {
    primary = buildPrimaryBlock("chat_repair", { stage: "import" });
  } else if (serverFixedIds.length) {
    primary = buildPrimaryBlock("burn", {
      stage: "import",
      userMessageOverride: `已自动完善 ${serverFixedIds.length} 项`,
    });
  }

  // Surface raise failures when cap blocked silent raise
  if (!allowRaise) {
    for (const s of (bundle.preDesignPack?.shots ?? []) as Record<string, unknown>[]) {
      const req = resolveRequiredDuration(s);
      if (req.authorDuration > 0 && req.authorDuration < req.required) {
        healLog.push({
          at: now(),
          ruleId: "LIP-01",
          action: "cap_block_silent_raise",
          detail: `episodeCap ${episodeCap}s used=${used}`,
        });
        if (!primary || primary.primaryNextStep === "burn") {
          primary = buildPrimaryBlock(req.needsSplit || req.overVendorMax ? "split_shot" : "raise_duration", {
            stage: "import",
            suggestedValue: req.required,
          });
        }
        break;
      }
    }
  }

  const uniqueFixed = [...new Set(serverFixedIds)];

  // Literary structure soft-fill (whitelist) — demote; importOk ≠ designExitPass
  try {
    const { getEnhancementFillPolicy } =
      require("./compilers/stillLiteraryDetailQuality") as typeof import("./compilers/stillLiteraryDetailQuality");
    const { applyLitFillToShots, buildLitFillSuggestions } =
      require("./design/literaryDetailLlmFill") as typeof import("./design/literaryDetailLlmFill");
    if (apply && getEnhancementFillPolicy().allowImportStructureSoftFill) {
      const shots = (bundle.preDesignPack?.shots ?? []) as Record<string, unknown>[];
      if (shots.length) {
        const sug = buildLitFillSuggestions({
          shots,
          literaryDetailLlmFill: true,
          intentVisualEnhance: true,
          importTrack: true,
          confidence: 0.85,
        });
        if (sug.suggestions.length) {
          const filled = applyLitFillToShots({
            shots,
            fills: sug.suggestions.map((s) => ({ shotIndex: s.shotIndex, append: s.suggestedAppend })),
            literaryDetailLlmFill: true,
            intentVisualEnhance: true,
            importTrack: true,
            confidence: 0.85,
            forceApply: true,
          });
          if (filled.applied.length) {
            (bundle.preDesignPack as { shots: Record<string, unknown>[] }).shots = filled.shots;
            for (const idx of filled.applied) {
              serverFixedIds.push(`LIT-SOFT-FILL:${idx}`);
              healLog.push({
                at: now(),
                ruleId: "DEX-LIT-CONTACT",
                action: "lit_structure_soft_fill",
                detail: `shot ${idx}`,
              });
            }
            if (!bundle.meta) (bundle as { meta?: Record<string, unknown> }).meta = {};
            const m = (bundle as { meta: Record<string, unknown> }).meta;
            m.importOkNotExitPass = true;
            m.litImportSoftFilled = filled.applied;
          }
        }
      }
    }
  } catch {
    /* optional */
  }

  observeImportHeal({ serverFixedIds: [...new Set(serverFixedIds)], healLogLen: healLog.length, healBudget });

  return {
    bundle,
    shapeSalvageLog,
    precheckLoop,
    exportGate: {
      exportAllowed: exportGateFull.exportAllowed,
      tier: exportGateFull.tier,
      closureSnapshot: exportGateFull.closureSnapshot,
      coverage: exportGateFull.coverage,
      chatRepairText,
      designExitIncomplete: exportGateFull.designExitIncomplete,
      previewStatusLine: exportGateFull.previewStatusLine,
      blocks: exportGateFull.blocks,
      warns: exportGateFull.warns,
      repairHints: exportGateFull.repairHints,
    },
    inspected: exportGateFull.inspected,
    serverFixedIds: [...new Set(serverFixedIds)],
    chatMustFixIds,
    healLog,
    healBudget,
    primary,
    splitPlans: splitPlans.length ? splitPlans : undefined,
    fxProjected: fxProj.projected,
    f0Declared,
    orphanScenesDemoted,
    stillBlocked: chatMustFixIds,
  };
}
