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

  // Episode duration budget (D1): stop silent raises when sum would exceed cap
  const episodeCap = DEFAULT_EPISODE_DURATION_CAP;
  const used = sumShotDurations(shots0);
  const allowRaise = used < episodeCap;

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
  });

  const chatRepairText = buildAggregatedChatRepairText(
    exportGateFull.repairHints,
    exportGateFull.closureSnapshot.blockIds,
    exportGateFull.missingFieldSummary,
    exportGateFull.blocks,
  );

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
  observeImportHeal({ serverFixedIds: uniqueFixed, healLogLen: healLog.length, healBudget });

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
      blocks: exportGateFull.blocks,
      warns: exportGateFull.warns,
      repairHints: exportGateFull.repairHints,
    },
    inspected: exportGateFull.inspected,
    serverFixedIds: uniqueFixed,
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
