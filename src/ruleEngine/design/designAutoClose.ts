/**
 * Design-layer high-confidence auto-close: NAR-15, DC mirror, EXTRA noise,
 * shotDesignIntent from peaks, asset cref bind when imaged.
 */
import { redesignCharacterDialogue } from "./redesignCharacterDialogue";
import { runForwardReentryAfterRepair } from "./designSplitLifecycle";
import { runDesignExitGate, type DesignExitResult } from "./designExitGate";
import {
  asDialogueLineObjects,
  dialogueCoverageReport,
  normalizeDialogueKey,
  isNonLiteraryDialogueKey,
  stripNonLiteraryDialogueFromShots,
} from "./dialogueCoverage";
import {
  planFromBundleForDesignExit,
  deepCloneJson,
} from "./planFromBundleForDesignExit";
import { ensureShotDesignIntentsFromPeaks } from "./shotDesignIntent";
import { ensureAssetCrefBind } from "./assetCrefBind";
import type { ScriptBundle } from "../bundle/types";

export type AutoCloseChange = {
  ruleId: string;
  detail: string;
  path?: string;
};

export type DesignAutoCloseResult = {
  applied: boolean;
  changes: AutoCloseChange[];
  clearedIds: string[];
  remainingFailedIds: string[];
  plan: Record<string, unknown>;
  exitGate: DesignExitResult;
  chatRetryRequired: boolean;
};

export type BundleAutoCloseResult = {
  bundle: ScriptBundle;
  autoClosed: {
    applied: boolean;
    clearedIds: string[];
    remainingFailedIds: string[];
    changes: AutoCloseChange[];
    chatRetryRequired: boolean;
  };
  /** Wave-2 industry silent repair surface for FE */
  repairChangelog?: unknown[];
  industryResidualDebts?: string[];
};

/** untilClear rules need more than one diagnose→patch round (practice ladder). */
function untilClearRoundBoost(failedIds: string[]): number {
  const until =
    /DEX-LIT-|DEX-PROP-|DEX-STILL-ONEBEAT|CHAIN-BEAT|DESIGN-LOSS|IRD-CONFIRM|VID-CONTACT|NAR-14|NAR-15|DEX-DUP-VD|DEX-VID-VOICE-MODE|DEX-VID-PSEUDO-LINE/;
  return failedIds.some((id) => until.test(id)) ? 5 : 1;
}

function asPd(plan: Record<string, unknown>): Record<string, unknown> {
  if (!plan.planData || typeof plan.planData !== "object") plan.planData = {};
  return plan.planData as Record<string, unknown>;
}

function isHighConfidenceExtraNoise(key: string): boolean {
  if (isNonLiteraryDialogueKey(key)) return true;
  const k = normalizeDialogueKey(key);
  if (!k || k.length <= 1) return true;
  if (!/[\u4e00-\u9fffA-Za-z0-9]/.test(k)) return true;
  if (/^(.)\1{3,}$/.test(k)) return true;
  return false;
}

function isRedundantExpectedDuplicate(
  key: string,
  expectedKeys: string[],
  actualKeys: string[],
): boolean {
  const k = normalizeDialogueKey(key);
  if (!k) return false;
  const expectedHit = expectedKeys.some((e) => normalizeDialogueKey(e) === k);
  if (!expectedHit) return false;
  const actualCount = actualKeys.filter((a) => normalizeDialogueKey(a) === k).length;
  return actualCount > 1;
}

export function stripHighConfidenceExtras(plan: Record<string, unknown>): AutoCloseChange[] {
  const pd = asPd(plan);
  const pack = (pd.preDesignPack as { shots?: Record<string, unknown>[] } | undefined) ?? { shots: [] };
  const shots = pack.shots ?? [];
  if (!shots.length) return [];

  // Homology first-pass: strip ：：：：3s / duration pseudo-dialogue
  const noisePass = stripNonLiteraryDialogueFromShots(shots);
  if (noisePass.stripped > 0) {
    pd.preDesignPack = { ...pack, shots: noisePass.shots };
    pack.shots = noisePass.shots;
  }

  const script =
    String((plan as { script?: string }).script ?? pd.script ?? "") ||
    String((pack as { scriptPlan?: string }).scriptPlan ?? "");
  const report = dialogueCoverageReport({
    script,
    planData: pd as { dialoguePlan?: { lines?: { speaker?: string; text?: string; lineId?: string }[] } },
    shots: pack.shots ?? [],
  });
  if (!report.extraCount && !noisePass.stripped) return [];
  if (!report.extraCount && noisePass.stripped) {
    return [
      {
        ruleId: "DC-01-EXTRA",
        detail: `stripped ${noisePass.stripped} duration/punct pseudo-dialogue`,
        path: "preDesignPack.shots[].narrative.dialogue.lines",
      },
    ];
  }

  const stripKeys = new Set<string>();
  for (const ek of report.extraKeys) {
    if (
      isHighConfidenceExtraNoise(ek) ||
      isRedundantExpectedDuplicate(ek, report.expectedKeys, report.actualKeys)
    ) {
      stripKeys.add(normalizeDialogueKey(ek));
    }
  }
  if (!stripKeys.size) return [];

  let removed = 0;
  const nextShots = shots.map((s) => {
    const n = { ...((s.narrative as object) ?? {}) } as { dialogue?: { lines?: unknown } };
    const lines = asDialogueLineObjects(n.dialogue?.lines);
    if (!lines.length) return s;
    const kept = lines.filter((l) => {
      const key = normalizeDialogueKey(String(l.text ?? ""));
      if (key && stripKeys.has(key)) {
        removed++;
        return false;
      }
      return true;
    });
    if (kept.length === lines.length) return s;
    return {
      ...s,
      narrative: {
        ...n,
        dialogue: { ...(typeof n.dialogue === "object" ? n.dialogue : {}), lines: kept },
      },
    };
  });

  pd.preDesignPack = { ...pack, shots: nextShots };
  plan.planData = pd;
  if ((plan as { preDesignPack?: unknown }).preDesignPack) {
    (plan as { preDesignPack: { shots?: unknown[] } }).preDesignPack = {
      ...((plan as { preDesignPack: object }).preDesignPack as object),
      shots: nextShots,
    };
  }

  if (!removed) return [];
  return [
    {
      ruleId: "DC-01-EXTRA",
      detail: `stripped ${removed} high-confidence noise/dup extras`,
      path: "preDesignPack.shots[].narrative.dialogue.lines",
    },
  ];
}

/** High-conf heal: hand CU strip face cues; bare cref/sref strip; hand lip→none. */
function healDirtyStillPrompts(plan: Record<string, unknown>): AutoCloseChange[] {
  const { healDirtyStillShot } =
    require("./dirtyStillPromptGate") as typeof import("./dirtyStillPromptGate");
  const pd = asPd(plan);
  const pack = (pd.preDesignPack as { shots?: Record<string, unknown>[] } | undefined) ?? { shots: [] };
  const shots = pack.shots ?? [];
  if (!shots.length) return [];
  const changes: AutoCloseChange[] = [];

  for (const s of shots) {
    const r = healDirtyStillShot(s);
    if (!r.touched) continue;
    for (let i = 0; i < r.ruleIds.length; i++) {
      changes.push({
        ruleId: r.ruleIds[i]!,
        detail: r.details[i] ?? r.details[0] ?? "dirty still heal",
        path: "preDesignPack.shots[]",
      });
    }
  }

  if (!changes.length) return [];
  pd.preDesignPack = { ...pack, shots };
  plan.planData = pd;
  if ((plan as { preDesignPack?: unknown }).preDesignPack) {
    (plan as { preDesignPack: { shots?: unknown[] } }).preDesignPack = {
      ...((plan as { preDesignPack: object }).preDesignPack as object),
      shots,
    };
  }
  return changes;
}

/** Drop empty/placeholder dialoguePlan lines (L-03b text:"", ---). */
function stripEmptyDialoguePlanNoise(plan: Record<string, unknown>): AutoCloseChange[] {
  const pd = asPd(plan);
  const dp = pd.dialoguePlan as { lines?: { text?: string; lineId?: string; isReaction?: boolean }[] } | undefined;
  if (!Array.isArray(dp?.lines) || !dp.lines.length) return [];
  const before = dp.lines.length;
  dp.lines = dp.lines.filter((l) => {
    const t = String(l.text ?? "").trim();
    if (!t) return false;
    if (!/[\u4e00-\u9fffA-Za-z0-9]/.test(t)) return false;
    return true;
  });
  pd.dialoguePlan = dp;
  plan.planData = pd;
  const removed = before - dp.lines.length;
  if (!removed) return [];
  return [
    {
      ruleId: "DC-01-EXTRA",
      detail: `stripped ${removed} empty/placeholder dialoguePlan lines`,
      path: "planData.dialoguePlan.lines",
    },
  ];
}

/** Collapse consecutive identical VD (≥minRun): only drop empty-dialogue clones.
 * Dialogue-bearing same-VD rows are kept for Chat BLOCK(DEX-DUP-VD) — never silent-fold into one lip mega-shot.
 */
export function collapseCloneVdShots(
  shotsIn: Record<string, unknown>[],
  opts?: { minRun?: number; durationCap?: number },
): { shots: Record<string, unknown>[]; merged: number; foldedLines: number } {
  const { normalizeVdKey } = require("./dirtyStillPromptGate") as typeof import("./dirtyStillPromptGate");
  const { asDialogueLineObjects } = require("./dialogueCoverage") as typeof import("./dialogueCoverage");
  const minRun = opts?.minRun ?? 3;
  const shots = [...shotsIn];
  if (shots.length < minRun) return { shots, merged: 0, foldedLines: 0 };

  const dialogueLineCount = (s: Record<string, unknown>): number => {
    const fromNar = asDialogueLineObjects(
      (s.narrative as { dialogue?: { lines?: unknown } } | undefined)?.dialogue?.lines,
    );
    if (fromNar.some((l) => String(l.text ?? "").trim())) {
      return fromNar.filter((l) => String(l.text ?? "").trim()).length;
    }
    if (s.dialogue) {
      return asDialogueLineObjects(
        typeof s.dialogue === "string" ? s.dialogue : (s.dialogue as { lines?: unknown })?.lines,
      ).filter((l) => String(l.text ?? "").trim()).length;
    }
    return 0;
  };

  const keyCounts = new Map<string, number>();
  for (const s of shots) {
    const k = normalizeVdKey(String(s.visualDescription ?? ""));
    if (k.length >= 6) keyCounts.set(k, (keyCounts.get(k) ?? 0) + 1);
  }
  const corruptKeys = new Set<string>();
  for (const [k, n] of keyCounts) {
    if (n >= 6 && n / shots.length >= 0.1) corruptKeys.add(k);
  }

  const next: Record<string, unknown>[] = [];
  let i = 0;
  let merged = 0;
  while (i < shots.length) {
    const key = normalizeVdKey(String(shots[i]?.visualDescription ?? ""));
    let j = i + 1;
    while (
      j < shots.length &&
      key &&
      key.length >= 6 &&
      normalizeVdKey(String(shots[j]?.visualDescription ?? "")) === key
    ) {
      j++;
    }
    const run = j - i;
    const threshold = corruptKeys.has(key) ? Math.min(2, minRun) : minRun;
    if (run >= threshold) {
      const keep = { ...shots[i]! };
      next.push(keep);
      for (let k = i + 1; k < j; k++) {
        const child = shots[k]!;
        if (dialogueLineCount(child) === 0) {
          // empty clone — drop
          merged++;
        } else {
          // dialogue same-VD: keep for Chat DEX-DUP-VD BLOCK — never mark stillReuse as pass
          next.push({ ...child });
        }
      }
      i = j;
    } else {
      for (let k = i; k < j; k++) next.push(shots[k]!);
      i = j;
    }
  }
  if (!merged) return { shots, merged: 0, foldedLines: 0 };
  next.forEach((s, idx) => {
    s.shotIndex = idx + 1;
  });
  return { shots: next, merged, foldedLines: 0 };
}

/** Merge consecutive identical VD runs — fold dialogue into survivor (import/export auto-close). */
function mergeDupVdShots(plan: Record<string, unknown>): AutoCloseChange[] {
  const pd = asPd(plan);
  const pack = (pd.preDesignPack as { shots?: Record<string, unknown>[] } | undefined) ?? { shots: [] };
  const shots = pack.shots ?? [];
  if (shots.length < 3) return [];
  const { shots: next, merged, foldedLines } = collapseCloneVdShots(shots, { minRun: 3 });
  if (!merged) return [];
  pd.preDesignPack = { ...pack, shots: next };
  plan.planData = pd;
  if ((plan as { preDesignPack?: unknown }).preDesignPack) {
    (plan as { preDesignPack: { shots?: unknown[] } }).preDesignPack = {
      ...((plan as { preDesignPack: object }).preDesignPack as object),
      shots: next,
    };
  }
  return [
    {
      ruleId: "DEX-DUP-VD",
      detail: `collapsed ${merged} clone VD shots; foldedLines=${foldedLines}; remain=${next.length}`,
      path: "preDesignPack.shots",
    },
  ];
}

const DUP_VD_FRAME_PREFIXES = ["近景", "中景", "特写", "过肩", "侧拍"] as const;

/**
 * Dialogue-bearing same-VD runs: diversify from existing dialogue/shotSize cues
 * (设计≡智能愈同源；禁发明散文，仅景别前缀 + 台词节拍锚).
 */
export function diversifyDialogueDupVdShots(
  shotsIn: Record<string, unknown>[],
  opts?: { minRun?: number },
): { shots: Record<string, unknown>[]; diversified: number } {
  const { normalizeVdKey } = require("./dirtyStillPromptGate") as typeof import("./dirtyStillPromptGate");
  const { asDialogueLineObjects } = require("./dialogueCoverage") as typeof import("./dialogueCoverage");
  const minRun = opts?.minRun ?? 3;
  const shots = shotsIn.map((s) => ({ ...s }));
  let diversified = 0;
  let i = 0;
  while (i < shots.length) {
    const key = normalizeVdKey(String(shots[i]?.visualDescription ?? ""));
    let j = i + 1;
    while (
      j < shots.length &&
      key &&
      key.length >= 6 &&
      normalizeVdKey(String(shots[j]?.visualDescription ?? "")) === key
    ) {
      j++;
    }
    const run = j - i;
    if (run >= minRun) {
      const base = String(shots[i]?.visualDescription ?? "").trim();
      for (let k = i + 1; k < j; k++) {
        const s = shots[k]!;
        const narr0 = (s.narrative as Record<string, unknown> | undefined) ?? {};
        const lines = asDialogueLineObjects(
          (narr0.dialogue as { lines?: unknown } | undefined)?.lines ?? narr0.lines ?? s.lines,
        );
        const lineCue = lines
          .map((l) => String(l.text ?? "").replace(/\s+/g, "").trim())
          .find((t) => t.length >= 2)
          ?.slice(0, 12);
        const existingSize = String(
          s.shotSize ?? (narr0 as { shotSize?: string }).shotSize ?? "",
        ).trim();
        const frame =
          existingSize && existingSize.length >= 2
            ? existingSize
            : DUP_VD_FRAME_PREFIXES[(k - i) % DUP_VD_FRAME_PREFIXES.length]!;
        let nextVd = base;
        if (!normalizeVdKey(nextVd).includes(normalizeVdKey(frame))) {
          nextVd = `${frame}，${base}`;
        }
        if (lineCue && !nextVd.includes(lineCue)) {
          nextVd = `${nextVd}，口型节拍「${lineCue}」`;
        } else if (!lineCue && normalizeVdKey(nextVd) === normalizeVdKey(base)) {
          nextVd = `${nextVd}，镜位节拍${k - i + 1}`;
        }
        if (normalizeVdKey(nextVd) === normalizeVdKey(base)) continue;
        s.visualDescription = nextVd;
        const narr = { ...narr0 };
        if (narr.visualDescription != null) narr.visualDescription = nextVd;
        if (!narr.shotSize && frame) narr.shotSize = frame;
        s.narrative = narr;
        if (!s.shotSize) s.shotSize = frame;
        diversified++;
      }
    }
    i = j;
  }
  return { shots, diversified };
}

function diversifyDupVdShots(plan: Record<string, unknown>): AutoCloseChange[] {
  const pd = asPd(plan);
  const pack = (pd.preDesignPack as { shots?: Record<string, unknown>[] } | undefined) ?? { shots: [] };
  const shots = pack.shots ?? [];
  if (shots.length < 3) return [];
  const { shots: next, diversified } = diversifyDialogueDupVdShots(shots, { minRun: 3 });
  if (!diversified) return [];
  pd.preDesignPack = { ...pack, shots: next };
  plan.planData = pd;
  if ((plan as { preDesignPack?: unknown }).preDesignPack) {
    (plan as { preDesignPack: { shots?: unknown[] } }).preDesignPack = {
      ...((plan as { preDesignPack: object }).preDesignPack as object),
      shots: next,
    };
  }
  return [
    {
      ruleId: "DEX-DUP-VD",
      detail: `diversified ${diversified} dialogue same-VD shots via frame+lineCue`,
      path: "preDesignPack.shots[].visualDescription",
    },
  ];
}

function softHealVideoHomologyOnPlan(
  plan: Record<string, unknown>,
  opts?: { vendorId?: string | null },
): AutoCloseChange[] {
  try {
    const { softHealVideoHomologyOnShots } =
      require("../heal/videoHomologyHeal") as typeof import("../heal/videoHomologyHeal");
    const pd = asPd(plan);
    const pack = (pd.preDesignPack as { shots?: Record<string, unknown>[] } | undefined) ?? { shots: [] };
    const shots = pack.shots ?? [];
    if (!shots.length) return [];
    const vh = softHealVideoHomologyOnShots({ shots, vendorId: opts?.vendorId ?? null });
    if (!vh.changed) return [];
    pd.preDesignPack = { ...pack, shots: vh.shots };
    plan.planData = pd;
    if ((plan as { preDesignPack?: unknown }).preDesignPack) {
      (plan as { preDesignPack: { shots?: unknown[] } }).preDesignPack = {
        ...((plan as { preDesignPack: object }).preDesignPack as object),
        shots: vh.shots,
      };
    }
    const ruleId = vh.findings.some((f) => f.id === "DEX-VID-VOICE-MODE")
      ? "DEX-VID-VOICE-MODE"
      : vh.heals.some((h) => /voice|orphan_lip|set_voice/.test(h))
        ? "DEX-VID-VOICE-MODE"
        : "DEX-VID-PSEUDO-LINE";
    return [
      {
        ruleId,
        detail: `videoHomology heals=${vh.heals.slice(0, 8).join(",")};cleared=${vh.cleared}`,
        path: "preDesignPack.shots",
      },
    ];
  } catch {
    return [];
  }
}

/** Mutate ScriptBundle shots in place — import belt before sync. */
export function collapseCloneVdOnBundle(bundle: {
  preDesignPack?: { shots?: Record<string, unknown>[] } | null;
  planData?: Record<string, unknown> | null;
  meta?: Record<string, unknown>;
}): { merged: number; before: number; after: number; foldedLines: number } {
  const pack = bundle.preDesignPack;
  const shots = pack?.shots ?? [];
  const before = shots.length;
  if (before < 3) return { merged: 0, before, after: before, foldedLines: 0 };
  const { shots: next, merged, foldedLines } = collapseCloneVdShots(shots, { minRun: 3 });
  if (!merged || !pack) return { merged: 0, before, after: before, foldedLines: 0 };
  pack.shots = next;
  const pd = (bundle.planData ?? {}) as Record<string, unknown>;
  const nested = (pd.preDesignPack as { shots?: unknown[] } | undefined) ?? {};
  pd.preDesignPack = { ...nested, ...pack, shots: next };
  bundle.planData = pd;
  const meta = (bundle.meta ??= {});
  meta.cloneVdCollapsed = { before, after: next.length, merged, foldedLines };
  return { merged, before, after: next.length, foldedLines };
}

function syncPlanToShots(
  plan: Record<string, unknown>,
  opts?: { forceExpand?: boolean },
): AutoCloseChange[] {
  const pd = asPd(plan);
  const pack = (pd.preDesignPack as { shots?: Record<string, unknown>[] } | undefined) ?? { shots: [] };
  const shots = pack.shots ?? [];
  if (!shots.length) return [];
  const forceExpand = Boolean(opts?.forceExpand);
  const re = runForwardReentryAfterRepair({
    planData: pd,
    shots,
    meta: (pd.meta as Record<string, unknown>) ?? {},
    // Import soft / no forceExpand: mirror only — clause split invents same-VD lip children
    applyClauseSplit: forceExpand,
    applyVisBeatExpanders: forceExpand,
    applySemanticSplit: forceExpand,
  });
  Object.assign(pd, re.planData);
  pd.preDesignPack = { ...pack, shots: re.shots };
  plan.planData = pd;
  if ((plan as { preDesignPack?: unknown }).preDesignPack) {
    (plan as { preDesignPack: { shots?: unknown[] } }).preDesignPack = {
      ...((plan as { preDesignPack: object }).preDesignPack as object),
      shots: re.shots,
    };
  }
  return [
    {
      ruleId: "DC-01",
      detail: `forwardReentry mirrored; stale=${re.reentry.staleClientIds.length};semantic=${forceExpand ? "on" : "off"}`,
      path: "preDesignPack.shots",
    },
  ];
}

/**
 * One-pass high-confidence close against current failedIds (or full gate diagnose).
 * Duration raise runs BEFORE designExit so canSilentRaise does not false-green SB exit.
 */
export function runDesignAutoClose(
  plan: Record<string, unknown>,
  opts?: {
    stageId?: string;
    maxRounds?: number;
    failedIds?: string[];
    forceExpand?: boolean;
    vendorId?: string | null;
  },
): DesignAutoCloseResult {
  const stageId = opts?.stageId ?? "SB";
  let maxRounds = opts?.maxRounds ?? 1;
  const changes: AutoCloseChange[] = [];
  const exitOpts = { forceExpand: Boolean(opts?.forceExpand) };
  const cleared = new Set<string>();

  // P0: raise canSilentRaise / DFW short shots before exit diagnose
  try {
    const { raiseDurationHygieneOnPlan } =
      require("../export/durationHygiene") as typeof import("../export/durationHygiene");
    const hy = raiseDurationHygieneOnPlan(plan, { vendorId: opts?.vendorId ?? null });
    if (hy.raised) {
      changes.push({
        ruleId: "LIP-01",
        detail: `design_raise:${hy.raised};skip_split=${hy.skippedNeedsSplit};cap=${hy.skippedCap};${hy.log.slice(0, 6).join(",")}`,
        path: "preDesignPack.shots[].duration",
      });
      cleared.add("LIP-01");
      cleared.add("DEX-LIP-SPLIT");
      cleared.add("DFW-DURATION");
    }
  } catch {
    /* optional */
  }

  let exitGate = runDesignExitGate(stageId, plan, exitOpts);
  maxRounds = Math.max(maxRounds, untilClearRoundBoost(exitGate.failedIds.concat(opts?.failedIds ?? [])));

  for (let round = 0; round < maxRounds; round++) {
    const failed = new Set(opts?.failedIds?.length && round === 0 ? opts.failedIds : exitGate.failedIds);
    if (!failed.size && exitGate.ok) break;

    const before = new Set(exitGate.failedIds);
    let touched = false;

    // Re-raise if LIP/DFW still open after other patches
    if (
      failed.has("DEX-LIP-SPLIT") ||
      failed.has("LIP-01") ||
      stageId === "SB"
    ) {
      try {
        const { raiseDurationHygieneOnPlan } =
          require("../export/durationHygiene") as typeof import("../export/durationHygiene");
        const hy = raiseDurationHygieneOnPlan(plan, { vendorId: opts?.vendorId ?? null });
        if (hy.raised) {
          touched = true;
          changes.push({
            ruleId: "LIP-01",
            detail: `design_raise_round:${hy.raised};${hy.log.slice(0, 4).join(",")}`,
            path: "preDesignPack.shots[].duration",
          });
        }
      } catch {
        /* optional */
      }
    }

    if (failed.has("NAR-15") || failed.has("NAR-14")) {
      const rd = redesignCharacterDialogue(plan, { allowPlaceholderRaWhenLocked: true });
      if (rd.ok && rd.changes.length) {
        touched = true;
        changes.push({
          ruleId: "NAR-15",
          detail: `redesign ${rd.changes.length} dialogue ops (placeholder RA when needed)`,
          path: "planData.dialoguePlan.lines",
        });
      }
    }

    if (failed.has("DC-01-EXTRA")) {
      // Same kernel as touch/import homology heal (until-clear; no demote)
      try {
        const { softHealTouchHomology } =
          require("../heal/touchHomologyHeal") as typeof import("../heal/touchHomologyHeal");
        const pdLocal = asPd(plan);
        const packLocal =
          (pdLocal.preDesignPack as { shots?: Record<string, unknown>[] } | undefined) ?? { shots: [] };
        const mini = {
          script: String((plan as { script?: string }).script ?? pdLocal.script ?? ""),
          planData: pdLocal,
          preDesignPack: packLocal,
        } as ScriptBundle;
        const heal = softHealTouchHomology(mini);
        if (heal.absorbed > 0 || heal.strippedNoise > 0 || heal.f0Declared.length) {
          touched = true;
          pdLocal.dialoguePlan =
            (mini.planData as { dialoguePlan?: unknown })?.dialoguePlan ?? pdLocal.dialoguePlan;
          pdLocal.preDesignPack = mini.preDesignPack ?? packLocal;
          plan.planData = pdLocal;
          changes.push({
            ruleId: "DC-01-EXTRA",
            detail: `homology cleared=${heal.cleared};absorb=${heal.absorbed};noise=${heal.strippedNoise};left=${heal.extrasLeft}`,
            path: "planData.dialoguePlan.lines",
          });
        }
      } catch {
        /* fall through strip */
      }
      const stripped = stripHighConfidenceExtras(plan);
      if (stripped.length) {
        touched = true;
        changes.push(...stripped);
      }
    }
    {
      const emptied = stripEmptyDialoguePlanNoise(plan);
      if (emptied.length) {
        touched = true;
        changes.push(...emptied);
      }
    }
    if (failed.has("DEX-DUP-VD") || stageId === "SB") {
      const merged = mergeDupVdShots(plan);
      if (merged.length) {
        touched = true;
        changes.push(...merged);
      }
      // 仅在 DUP 失败时 diversify（禁无故 SB 每轮改写 VD）
      if (failed.has("DEX-DUP-VD")) {
        const div = diversifyDupVdShots(plan);
        if (div.length) {
          touched = true;
          changes.push(...div);
        }
      }
    }
    if (
      failed.has("DEX-VID-VOICE-MODE") ||
      failed.has("DEX-VID-PSEUDO-LINE") ||
      failed.has("DEX-VID-BEAT-DUR") ||
      failed.has("DEX-VID-MOTION-VERB") ||
      failed.has("DEX-VID-INTENT-MAP")
    ) {
      const vh = softHealVideoHomologyOnPlan(plan, { vendorId: opts?.vendorId ?? null });
      if (vh.length) {
        touched = true;
        changes.push(...vh);
      }
    }
    if (
      failed.has("DEX-DIRTY-STILL-PROMPT") ||
      failed.has("DEX-HAND-LIP") ||
      stageId === "SB"
    ) {
      const healed = healDirtyStillPrompts(plan);
      if (healed.length) {
        touched = true;
        changes.push(...healed);
      }
    }

    // After HAND-LIP may set none: on-camera dialogue must upgrade (NO-LIP-DIALOGUE homology)
    if (failed.has("NO-LIP-DIALOGUE") || Boolean(opts?.forceExpand) || stageId === "SB") {
      try {
        const { softHealNoLipDialogueOnBundle } =
          require("../quality/resolveLipSyncPolicy") as typeof import("../quality/resolveLipSyncPolicy");
        const mini = {
          planData: plan.planData,
          preDesignPack:
            (plan.planData as { preDesignPack?: { shots?: Record<string, unknown>[] } } | undefined)
              ?.preDesignPack ?? (plan.preDesignPack as { shots?: Record<string, unknown>[] } | undefined),
        };
        const lip = softHealNoLipDialogueOnBundle(mini);
        if (lip.upgraded > 0) {
          touched = true;
          if (mini.planData) plan.planData = mini.planData;
          if (mini.preDesignPack) {
            (plan as { preDesignPack?: unknown }).preDesignPack = mini.preDesignPack;
            const pd = (plan.planData ?? {}) as Record<string, unknown>;
            pd.preDesignPack = mini.preDesignPack;
            plan.planData = pd;
          }
          changes.push({
            ruleId: "NO-LIP-DIALOGUE",
            detail: `upgrade_oncam_lip shots=${lip.shotIndexes.join(",")}`,
            path: "preDesignPack.shots[].shotDesign.lipSyncPolicy",
          });
        }
      } catch {
        /* optional */
      }
    }

    if (failed.has("DEX-SHOT-INTENT") || failed.has("DEX-INTENT-PIC")) {
      const ens = ensureShotDesignIntentsFromPeaks(plan);
      if (ens.applied) {
        touched = true;
        changes.push({
          ruleId: "DEX-SHOT-INTENT",
          detail: ens.reasons.join(";") || "ensured from peaks",
          path: "planData.shotDesignIntent",
        });
      }
      // G14/G15: INTENT-PIC untilClear — sidecar picture ← VD（禁发明 VD）；与 exit audit 同核
      if (failed.has("DEX-INTENT-PIC") || Boolean(opts?.forceExpand)) {
        try {
          const { getShotDesignIntentsFromPlan, syncIntentPicturesFromShots, auditIntentPictureSync } =
            require("./shotDesignIntent") as typeof import("./shotDesignIntent");
          const pdLocal = asPd(plan);
          const pack =
            (pdLocal.preDesignPack as { shots?: Record<string, unknown>[] } | undefined) ??
            ((plan as { preDesignPack?: { shots?: Record<string, unknown>[] } }).preDesignPack ?? {
              shots: [],
            });
          const shots = [...(pack.shots ?? [])];
          const intents = getShotDesignIntentsFromPlan(plan);
          const before = auditIntentPictureSync({ intents, shots });
          const synced = syncIntentPicturesFromShots({ intents, shots });
          if (synced.synced > 0) {
            pdLocal.shotDesignIntent = synced.intents;
            const nb = (pdLocal.narrativeBrief as Record<string, unknown> | undefined) ?? {};
            if (Array.isArray(nb.shotDesignIntent)) nb.shotDesignIntent = synced.intents;
            pdLocal.preDesignPack = pack;
            plan.planData = pdLocal;
            (plan as { preDesignPack?: unknown }).preDesignPack = pack;
            touched = true;
            const after = auditIntentPictureSync({ intents: synced.intents, shots });
            changes.push({
              ruleId: "DEX-INTENT-PIC",
              detail: `sync_picture=${synced.synced};before=${before.findings.length};after=${after.findings.length}`,
              path: "planData.shotDesignIntent[].picture",
            });
          }
        } catch {
          /* optional */
        }
      }
    } else if (stageId === "SB" || Boolean(opts?.forceExpand)) {
      // G14: idempotent intent sync even when not currently failing
      try {
        const { validateShotDesignIntents, getShotDesignIntentsFromPlan } =
          require("./shotDesignIntent") as typeof import("./shotDesignIntent");
        if (!validateShotDesignIntents(getShotDesignIntentsFromPlan(plan)).ok) {
          const ens = ensureShotDesignIntentsFromPeaks(plan);
          if (ens.applied) {
            touched = true;
            changes.push({
              ruleId: "DEX-SHOT-INTENT",
              detail: ens.reasons.join(";") || "patched incomplete",
              path: "planData.shotDesignIntent",
            });
          }
        }
      } catch {
        /* optional */
      }
    }

    if (failed.has("FX-GRADE-01") || failed.has("DG-FALSE-GREEN-FX")) {
      try {
        const { declareF0OnBundle } =
          require("../import/declareF0") as typeof import("../import/declareF0");
        const pdLocal = asPd(plan);
        const pack =
          (pdLocal.preDesignPack as { shots?: Record<string, unknown>[] } | undefined) ?? { shots: [] };
        const mini = {
          planData: pdLocal,
          preDesignPack: pack,
          characterDesign: (plan as { characterDesign?: unknown }).characterDesign,
        } as import("../bundle/types").ScriptBundle;
        const f0 = declareF0OnBundle(mini);
        if (f0.declared.length) {
          pdLocal.preDesignPack = mini.preDesignPack ?? pack;
          plan.planData = pdLocal;
          if (mini.preDesignPack) {
            (plan as { preDesignPack?: unknown }).preDesignPack = mini.preDesignPack;
          }
          touched = true;
          changes.push({
            ruleId: "FX-GRADE-01",
            detail: `declare_f0 shots=${f0.declared.join(",")}`,
            path: "preDesignPack.shots[].fxFeasibility",
          });
        }
      } catch {
        /* optional */
      }
    }

    // G14: EXPR / AUD theme glue — default performance + seed audioPrompt (no invent VD)
    if (failed.has("DEX-EXPR-SPEAK") || failed.has("CHAT-AUD-01") || Boolean(opts?.forceExpand)) {
      try {
        const { ensureShotPerformanceDefaults } =
          require("../emotion/defaultPerformance") as typeof import("../emotion/defaultPerformance");
        const pdLocal = asPd(plan);
        const pack =
          (pdLocal.preDesignPack as { shots?: Record<string, unknown>[] } | undefined) ??
          ((plan as { preDesignPack?: { shots?: Record<string, unknown>[] } }).preDesignPack ?? {
            shots: [],
          });
        const shots = [...(pack.shots ?? [])];
        let exprN = 0;
        let audN = 0;
        for (const s of shots) {
          if (failed.has("DEX-EXPR-SPEAK") || Boolean(opts?.forceExpand)) {
            if (ensureShotPerformanceDefaults(s as never)) exprN += 1;
          }
          if (failed.has("CHAT-AUD-01") || Boolean(opts?.forceExpand)) {
            const gen = ((s as { generation?: Record<string, unknown> }).generation ??= {});
            if (!String(gen.audioPrompt ?? "").trim()) {
              const cue = String((s as { audioCue?: string }).audioCue ?? "").trim();
              const lines =
                ((s as { narrative?: { dialogue?: { lines?: { text?: string }[] } } }).narrative?.dialogue
                  ?.lines ?? []) as { text?: string }[];
              const dial = lines.map((l) => String(l?.text ?? "").trim()).filter(Boolean).join("\n");
              const av = String(
                (s as { avCausality?: { audioBeat?: string } }).avCausality?.audioBeat ?? "",
              ).trim();
              const seed = (cue || av || dial).slice(0, 80);
              if (seed) {
                gen.audioPrompt = cue || av ? `音效与对白：${seed}` : `口型同步对白：${seed}`;
                audN += 1;
              }
            }
          }
        }
        if (exprN || audN) {
          pack.shots = shots;
          pdLocal.preDesignPack = pack;
          plan.planData = pdLocal;
          (plan as { preDesignPack?: unknown }).preDesignPack = pack;
          touched = true;
          if (exprN) {
            changes.push({
              ruleId: "DEX-EXPR-SPEAK",
              detail: `default_performance=${exprN}`,
              path: "preDesignPack.shots[].shotDesign.performance",
            });
          }
          if (audN) {
            changes.push({
              ruleId: "CHAT-AUD-01",
              detail: `seed_audioPrompt=${audN}`,
              path: "preDesignPack.shots[].generation.audioPrompt",
            });
          }
        }
      } catch {
        /* optional */
      }
    }

    // Literary XOR/CONTACT: import/design same-kernel smart split first; residual Confirm/soft-fill
    if (
      failed.has("DEX-LIT-CONTACT-XOR") ||
      failed.has("DEX-LIT-CONTACT") ||
      failed.has("DEX-LIT-ANCHOR") ||
      failed.has("DEX-PROP-CONT")
    ) {
      try {
        const { expandLitContactXor } =
          require("./expandLitContactXor") as typeof import("./expandLitContactXor");
        const { sliceFieldsAfterIrdSplit } =
          require("./sliceFieldsAfterIrdSplit") as typeof import("./sliceFieldsAfterIrdSplit");
        const { applyLitFillToShots, buildLitFillSuggestions } =
          require("./literaryDetailLlmFill") as typeof import("./literaryDetailLlmFill");
        const { diagnoseStillIntent } =
          require("./stillIntentReverse") as typeof import("./stillIntentReverse");
        const pd = (plan.planData ?? {}) as Record<string, unknown>;
        const pack =
          (pd.preDesignPack as { shots?: Record<string, unknown>[] } | undefined) ??
          (plan.preDesignPack as { shots?: Record<string, unknown>[] } | undefined) ??
          {};
        let shots = [...(pack.shots ?? [])];
        if (shots.length) {
          const lx2 = expandLitContactXor(shots, { forceExpand: true, chatStrict: false });
          if (lx2.expandedCount > 0) {
            shots = sliceFieldsAfterIrdSplit(lx2.shots).shots;
            pack.shots = shots;
            if (pd.preDesignPack) (pd.preDesignPack as { shots: unknown }).shots = shots;
            else pd.preDesignPack = { shots };
            plan.planData = pd;
            if (plan.preDesignPack) (plan.preDesignPack as { shots: unknown }).shots = shots;
            const meta = ((pd.meta as Record<string, unknown>) ??
              ((plan.meta as Record<string, unknown>) ?? (pd.meta = {}))) as Record<string, unknown>;
            meta.litDesignSmartSplit = lx2.expandedCount;
            plan.meta = { ...(plan.meta as object), ...meta };
            touched = true;
            changes.push({
              ruleId: "DEX-LIT-CONTACT-XOR",
              detail: `smart_split expanded=${lx2.expandedCount};${lx2.log.slice(0, 3).join("|")}`,
              path: "preDesignPack.shots",
            });
          } else {
            const ird = diagnoseStillIntent(shots, { meta: (pd.meta as Record<string, unknown>) ?? {}, planData: pd });
            if (ird.primaryAction === "confirm_split" || ird.primaryAction === "confirm_enhance") {
              const meta = ((pd.meta as Record<string, unknown>) ??
                ((plan.meta as Record<string, unknown>) ?? (pd.meta = {}))) as Record<string, unknown>;
              meta.irdConfirmRequired = true;
              meta.litDebtPrimaryAction = ird.primaryAction;
              meta.litDebtCta = ird.ctaLabel;
              plan.meta = { ...(plan.meta as object), ...meta };
              pd.meta = meta;
              plan.planData = pd;
              touched = true;
              changes.push({
                ruleId: failed.has("DEX-LIT-CONTACT-XOR") ? "DEX-LIT-CONTACT-XOR" : "DEX-LIT-CONTACT",
                detail: `ird:${ird.primaryAction};cta=${ird.ctaLabel ?? ""}`,
                path: "meta.irdConfirmRequired",
              });
            } else if (ird.primaryAction === "apply_auto_enhance" || failed.has("DEX-LIT-CONTACT")) {
              const sug = buildLitFillSuggestions({
                shots,
                literaryDetailLlmFill: true,
                intentVisualEnhance: true,
                confidence: 0.85,
              });
              if (sug.suggestions.length) {
                const filled = applyLitFillToShots({
                  shots,
                  fills: sug.suggestions.map((s) => ({ shotIndex: s.shotIndex, append: s.suggestedAppend })),
                  literaryDetailLlmFill: true,
                  intentVisualEnhance: true,
                  confidence: 0.85,
                  forceApply: true,
                });
                if (filled.applied.length) {
                  pack.shots = filled.shots;
                  if (pd.preDesignPack) (pd.preDesignPack as { shots: unknown }).shots = filled.shots;
                  else pd.preDesignPack = { shots: filled.shots };
                  plan.planData = pd;
                  if (plan.preDesignPack) (plan.preDesignPack as { shots: unknown }).shots = filled.shots;
                  touched = true;
                  changes.push({
                    ruleId: "DEX-LIT-CONTACT",
                    detail: `auto_enhance shots=${filled.applied.join(",")}`,
                    path: "preDesignPack.shots[].visualDescription",
                  });
                }
              }
            }
          }
        }
      } catch {
        /* optional */
      }
    }

    // Still one-beat / VisBeat expand — untilClear auto-apply at high confidence (no forceExpand gate)
    if (failed.has("DEX-STILL-ONEBEAT") || failed.has("DEX-VIS-SPLIT")) {
      try {
        const { expandStillOneBeat } =
          require("./expandStillOneBeat") as typeof import("./expandStillOneBeat");
        const pd = (plan.planData ?? {}) as Record<string, unknown>;
        const pack =
          (pd.preDesignPack as { shots?: Record<string, unknown>[] } | undefined) ??
          (plan.preDesignPack as { shots?: Record<string, unknown>[] } | undefined) ??
          {};
        let shots = [...(pack.shots ?? [])];
        if (shots.length) {
          const ob = expandStillOneBeat(shots as never, { forceExpand: true, chatStrict: false } as never);
          if (ob && (ob as { expandedCount?: number }).expandedCount) {
            shots = ((ob as { shots?: Record<string, unknown>[] }).shots ?? shots) as Record<string, unknown>[];
            pack.shots = shots;
            if (pd.preDesignPack) (pd.preDesignPack as { shots: unknown }).shots = shots;
            else pd.preDesignPack = { shots };
            plan.planData = pd;
            touched = true;
            changes.push({
              ruleId: "DEX-STILL-ONEBEAT",
              detail: `onebeat_expand=${(ob as { expandedCount?: number }).expandedCount}`,
              path: "preDesignPack.shots",
            });
          }
        }
      } catch {
        /* optional */
      }
    }

    // DEX-STILL-CU-CAST untilClear：slice_cast + 高置信 expand；低置信 stamp IRD（禁 chatStrict 挡愈）
    if (failed.has("DEX-STILL-CU-CAST") || failed.has("IRD-CONFIRM")) {
      try {
        const { expandStillCuCast } =
          require("./expandStillCuCast") as typeof import("./expandStillCuCast");
        const pd = (plan.planData ?? {}) as Record<string, unknown>;
        const pack =
          (pd.preDesignPack as { shots?: Record<string, unknown>[] } | undefined) ??
          (plan.preDesignPack as { shots?: Record<string, unknown>[] } | undefined) ??
          {};
        const shots = [...(pack.shots ?? [])];
        if (shots.length) {
          const cu = expandStillCuCast(shots, { chatStrict: false, forceExpand: false });
          if (cu.expandedCount > 0 || cu.slicedCount > 0) {
            pack.shots = cu.shots;
            if (pd.preDesignPack) (pd.preDesignPack as { shots: unknown }).shots = cu.shots;
            else pd.preDesignPack = { shots: cu.shots };
            plan.planData = pd;
            if (plan.preDesignPack) (plan.preDesignPack as { shots: unknown }).shots = cu.shots;
            touched = true;
            changes.push({
              ruleId: "DEX-STILL-CU-CAST",
              detail: `cu_cast expand=${cu.expandedCount};slice=${cu.slicedCount};confirm=${cu.confirmRequired};${cu.log.slice(0, 4).join("|")}`,
              path: "preDesignPack.shots",
            });
          } else if (cu.confirmRequired) {
            changes.push({
              ruleId: "IRD-CONFIRM",
              detail: `cu_cast_confirm_residual refused=${cu.refused}`,
              path: "preDesignPack.shots",
            });
          }
        }
      } catch {
        /* optional */
      }
    }

    // OS-NAME / FILLER untilClear strip（裸名 + 去无画面填料）
    if (failed.has("DEX-STILL-OS-NAME") || failed.has("DEX-STILL-FILLER")) {
      try {
        const { peelOsFromVisual } =
          require("./expandStillOneBeat") as typeof import("./expandStillOneBeat");
        const { hasDesignFiller, hasOsInNameDisplay } =
          require("../compilers/stillIdentitySsot") as typeof import("../compilers/stillIdentitySsot");
        const pd = (plan.planData ?? {}) as Record<string, unknown>;
        const pack =
          (pd.preDesignPack as { shots?: Record<string, unknown>[] } | undefined) ??
          (plan.preDesignPack as { shots?: Record<string, unknown>[] } | undefined) ??
          {};
        const shots = [...(pack.shots ?? [])];
        let n = 0;
        for (const s of shots) {
          let vd = String(s.visualDescription ?? "");
          const before = vd;
          if (failed.has("DEX-STILL-OS-NAME") || hasOsInNameDisplay(vd)) {
            const peeled = peelOsFromVisual(vd);
            vd = peeled.visual.replace(/[（(]OS[）)]/g, "").replace(/\s{2,}/g, " ").trim();
          }
          if ((failed.has("DEX-STILL-FILLER") || hasDesignFiller(vd)) && hasDesignFiller(vd)) {
            vd = vd
              .replace(/对白瞬间[^，。；;\n]{0,24}/g, "")
              .replace(/瞬间神态[^，。；;\n]{0,16}/g, "")
              .replace(/内心独白[^，。；;\n]{0,20}/g, "")
              .replace(/[，,]{2,}/g, "，")
              .replace(/\s{2,}/g, " ")
              .trim();
          }
          if (vd && vd !== before) {
            s.visualDescription = vd;
            const narr = { ...((s.narrative as object) ?? {}) } as Record<string, unknown>;
            if (narr.visualDescription != null) narr.visualDescription = vd;
            s.narrative = narr;
            n++;
          }
        }
        if (n) {
          pack.shots = shots;
          if (pd.preDesignPack) (pd.preDesignPack as { shots: unknown }).shots = shots;
          else pd.preDesignPack = { shots };
          plan.planData = pd;
          touched = true;
          changes.push({
            ruleId: failed.has("DEX-STILL-FILLER") ? "DEX-STILL-FILLER" : "DEX-STILL-OS-NAME",
            detail: `stripped_os_or_filler shots=${n}`,
            path: "preDesignPack.shots[].visualDescription",
          });
        }
      } catch {
        /* optional */
      }
    }

    // Industry AV Wave-2: only when FACE/CAM/CU debts open — 禁无债语义 inflate
    if (failed.has("DEX-FACE-BUDGET") || failed.has("DEX-CAM-FIT") || failed.has("DEX-STILL-CU-CAST")) {
    try {
      const { healShotSizeOrSplit } =
        require("./healShotSizeOrSplit") as typeof import("./healShotSizeOrSplit");
      const { collectRepairChangelog } =
        require("./industryAvSilentRepair") as typeof import("./industryAvSilentRepair");
      const pdInd = (plan.planData ?? {}) as Record<string, unknown>;
      const packInd =
        (pdInd.preDesignPack as { shots?: Record<string, unknown>[] } | undefined) ??
        (plan.preDesignPack as { shots?: Record<string, unknown>[] } | undefined) ??
        {};
      const shotsInd = [...(packInd.shots ?? [])];
      if (shotsInd.length) {
        const beforeN = shotsInd.length;
        const ind = healShotSizeOrSplit(shotsInd, { maxMs: 6000 });
        if (ind.changed > 0 || ind.diffs.length) {
          const afterN = (ind.shots ?? []).length;
          if (afterN > beforeN + 2 && !failed.has("DEX-FACE-BUDGET") && !failed.has("DEX-CAM-FIT")) {
            changes.push({
              ruleId: "DEX-FACE-BUDGET",
              detail: `industry_silent_skipped_inflate before=${beforeN} after=${afterN}`,
              path: "preDesignPack.shots",
            });
          } else {
          packInd.shots = ind.shots;
          if (pdInd.preDesignPack) (pdInd.preDesignPack as { shots: unknown }).shots = ind.shots;
          else pdInd.preDesignPack = { shots: ind.shots };
          plan.planData = pdInd;
          if (plan.preDesignPack) (plan.preDesignPack as { shots: unknown }).shots = ind.shots;
          touched = true;
          changes.push({
            ruleId: "DEX-FACE-BUDGET",
            detail: `heal_shotsize_split kind=${ind.oneClickRepairKind};changed=${ind.changed};diffs=${ind.diffs.join(",") || "none"};residual=${ind.residualDebts.join(",") || "none"};shots=${beforeN}->${afterN}`,
            path: "preDesignPack.shots",
          });
          (plan as { repairChangelog?: unknown }).repairChangelog = collectRepairChangelog(ind.shots);
          (plan as { oneClickRepairKind?: string }).oneClickRepairKind = ind.oneClickRepairKind;
          if (ind.residualDebts.length) {
            (plan as { industryResidualDebts?: string[] }).industryResidualDebts = ind.residualDebts;
          }
          }
        }
      }
    } catch {
      /* optional industry pass */
    }
    }

    // LGIA: always stamp stillPhase / IntentGraph (even when FACE/CAM closed) — import survive
    try {
      const { applyLiteraryIntentGraphToShot } =
        require("../compilers/literaryIntentGraph") as typeof import("../compilers/literaryIntentGraph");
      const pdLgia = (plan.planData ?? {}) as Record<string, unknown>;
      const packLgia =
        (pdLgia.preDesignPack as { shots?: Record<string, unknown>[] } | undefined) ??
        (plan.preDesignPack as { shots?: Record<string, unknown>[] } | undefined) ??
        {};
      const shotsLgia = [...(packLgia.shots ?? [])];
      let lgiaChanged = 0;
      for (const s of shotsLgia) {
        const r = applyLiteraryIntentGraphToShot(s);
        if (r.changed) lgiaChanged++;
      }
      if (lgiaChanged > 0) {
        packLgia.shots = shotsLgia;
        if (pdLgia.preDesignPack) (pdLgia.preDesignPack as { shots: unknown }).shots = shotsLgia;
        else pdLgia.preDesignPack = { shots: shotsLgia };
        plan.planData = pdLgia;
        if (plan.preDesignPack) (plan.preDesignPack as { shots: unknown }).shots = shotsLgia;
        touched = true;
        changes.push({
          ruleId: "LGIA-STILL-PHASE",
          detail: `stillPhase_stamp shots=${lgiaChanged}`,
          path: "preDesignPack.shots[].narrative.stillPhase",
        });
      }
    } catch {
      /* optional LGIA stamp */
    }

    // PROP-CONT: declare-only propState carry (never invent VD) — import/design homology
    if (failed.has("DEX-PROP-CONT") || Boolean(opts?.forceExpand)) {
      try {
        const { softHealPropContinuityOnBundle } =
          require("../compilers/propContinuitySsot") as typeof import("../compilers/propContinuitySsot");
        const mini = {
          planData: plan.planData,
          preDesignPack:
            (plan.planData as { preDesignPack?: { shots?: Record<string, unknown>[] } } | undefined)
              ?.preDesignPack ?? (plan.preDesignPack as { shots?: Record<string, unknown>[] } | undefined),
        };
        const ph = softHealPropContinuityOnBundle(mini);
        if (ph.mutated > 0) {
          touched = true;
          if (mini.planData) plan.planData = mini.planData;
          if (mini.preDesignPack) {
            (plan as { preDesignPack?: unknown }).preDesignPack = mini.preDesignPack;
            const pd = (plan.planData ?? {}) as Record<string, unknown>;
            pd.preDesignPack = mini.preDesignPack;
            plan.planData = pd;
          }
          changes.push({
            ruleId: "DEX-PROP-CONT",
            detail: `propState_carry mutated=${ph.mutated};blocksLeft=${ph.blocksLeft}`,
            path: "preDesignPack.shots[].propState",
          });
          // untilClear: if still BLOCK, one more pass (3+ 镜链)
          if (ph.blocksLeft > 0) {
            const ph2 = softHealPropContinuityOnBundle(mini);
            if (ph2.mutated > 0) {
              if (mini.preDesignPack) {
                (plan as { preDesignPack?: unknown }).preDesignPack = mini.preDesignPack;
                const pd = (plan.planData ?? {}) as Record<string, unknown>;
                pd.preDesignPack = mini.preDesignPack;
                plan.planData = pd;
              }
              changes.push({
                ruleId: "DEX-PROP-CONT",
                detail: `propState_carry_pass2 mutated=${ph2.mutated};blocksLeft=${ph2.blocksLeft}`,
                path: "preDesignPack.shots[].propState",
              });
            }
          }
        }
      } catch {
        /* optional */
      }
    }

    // CREF bind: on fail or always attempt on SB/AS (writes charCodes/plan for compose)
    if (failed.has("DEX-ASSET-CREF") || stageId === "SB" || stageId === "AS") {
      const bind = ensureAssetCrefBind(plan);
      if (bind.applied) {
        touched = true;
        changes.push(
          ...bind.changes.map((c) => ({
            ruleId: c.ruleId,
            detail: c.detail,
            path: c.path,
          })),
        );
      } else if (bind.changes.length && failed.has("DEX-ASSET-CREF")) {
        changes.push(
          ...bind.changes.map((c) => ({
            ruleId: c.ruleId,
            detail: c.detail,
            path: c.path,
          })),
        );
      }
    }

    if (
      failed.has("DC-01") ||
      failed.has("NAR-15") ||
      failed.has("DC-01-EXTRA") ||
      failed.has("DEX-CAM-FIT") ||
      failed.has("DEX-LIP-SPLIT") ||
      failed.has("LIP-01")
    ) {
      // LIP pressure → semantic differentiated split only under forceExpand / Confirm
      // Import soft (no forceExpand): raise/soft-banner residual — 禁同文 clause 扩伪设计
      const wantSemantic = Boolean(opts?.forceExpand);
      try {
        if (wantSemantic) {
          const { healMisboundDialoguePlacement } =
            require("./dialoguePlacementMatch") as typeof import("./dialoguePlacementMatch");
          const pd = (plan.planData ?? {}) as Record<string, unknown>;
          const pack = (pd.preDesignPack as { shots?: Record<string, unknown>[] } | undefined) ?? {};
          const shots = [...(pack.shots ?? [])];
          if (shots.length) {
            const healed = healMisboundDialoguePlacement(shots);
            pack.shots = healed.shots;
            pd.preDesignPack = pack;
            plan.planData = pd;
            if (healed.stripped || healed.peeledToAudio) {
              touched = true;
              changes.push({
                ruleId: "DEX-DIAL-BIND",
                detail: `strip=${healed.stripped};peelAudio=${healed.peeledToAudio};remain=${healed.remainingPressure}`,
                path: "preDesignPack.shots[].narrative.dialogue",
              });
            }
          }
        }
      } catch {
        /* optional */
      }
      const sync = syncPlanToShots(plan, { forceExpand: wantSemantic || Boolean(opts?.forceExpand) });
      if (sync.length) {
        touched = true;
        changes.push(...sync);
      }
    }

    if (!touched) break;

    exitGate = runDesignExitGate(stageId, plan, exitOpts);
    for (const id of before) {
      if (!exitGate.failedIds.includes(id)) cleared.add(id);
    }
  }

  return {
    applied: changes.length > 0,
    changes,
    clearedIds: [...cleared],
    remainingFailedIds: exitGate.failedIds,
    plan,
    exitGate,
    chatRetryRequired: (() => {
      try {
        const { filterAuthorMustFixIds } =
          require("../exportGate") as typeof import("../exportGate");
        return filterAuthorMustFixIds(exitGate.failedIds).length > 0;
      } catch {
        return !exitGate.ok;
      }
    })(),
  };
}

/** Mutate ScriptBundle in place with auto-close; returns summary for export/dryRun. */
export function applyDesignAutoCloseToBundle(
  bundle: ScriptBundle,
  opts?: { stageId?: string; maxRounds?: number; forceExpand?: boolean },
): BundleAutoCloseResult {
  const plan = deepCloneJson(planFromBundleForDesignExit(bundle));
  if (bundle.characterDesign && !(plan as { characterDesign?: unknown }).characterDesign) {
    (plan as { characterDesign: unknown }).characterDesign = bundle.characterDesign;
  }
  const result = runDesignAutoClose(plan, {
    stageId: opts?.stageId ?? "SB",
    maxRounds: opts?.maxRounds ?? 1,
    forceExpand: Boolean(opts?.forceExpand),
  });

  const pd = (result.plan.planData as Record<string, unknown>) ?? {};
  bundle.planData = {
    ...(bundle.planData as object),
    ...pd,
  } as ScriptBundle["planData"];

  const nestedPack = pd.preDesignPack as { shots?: Record<string, unknown>[]; scriptPlan?: string } | undefined;
  if (nestedPack?.shots?.length) {
    bundle.preDesignPack = {
      ...(bundle.preDesignPack ?? {}),
      ...nestedPack,
      shots: nestedPack.shots,
      scriptPlan: nestedPack.scriptPlan ?? bundle.preDesignPack?.scriptPlan ?? bundle.script,
    } as ScriptBundle["preDesignPack"];
    if (result.applied) {
      try {
        const { cascadeForwardStale } =
          require("../quality/forwardStaleCascade") as typeof import("../quality/forwardStaleCascade");
        const { loadRepairConfidenceLadder } =
          require("../quality/practiceCompleteness") as typeof import("../quality/practiceCompleteness");
        if (loadRepairConfidenceLadder().requireCascadeAfterApply !== false) {
          cascadeForwardStale({
            shots: nestedPack.shots,
            forwardStages: ["SB", "MD-IMG", "EN", "MD-VID"],
          });
        }
      } catch {
        /* optional */
      }
    }
  }

  if (pd.dialoguePlan) {
    (bundle.planData as Record<string, unknown>).dialoguePlan = pd.dialoguePlan;
  }
  if (pd.narrativeBrief) {
    (bundle.planData as Record<string, unknown>).narrativeBrief = pd.narrativeBrief;
  }
  if (pd.shotDesignIntent) {
    (bundle.planData as Record<string, unknown>).shotDesignIntent = pd.shotDesignIntent;
  }
  if (pd.assetCrefPlan) {
    (bundle.planData as Record<string, unknown>).assetCrefPlan = pd.assetCrefPlan;
  }

  // Always seal theme glue after autoClose (homology with export)
  try {
    const { sealThemeGlueUntilClear } =
      require("./sealThemeGlueUntilClear") as typeof import("./sealThemeGlueUntilClear");
    const seal = sealThemeGlueUntilClear(bundle);
    if (seal.sealedIds.length) {
      result.clearedIds = [...new Set([...result.clearedIds, ...seal.sealedIds])];
      result.remainingFailedIds = result.remainingFailedIds.filter((id) => !seal.sealedIds.includes(id));
      result.applied = true;
      result.changes.push(
        ...seal.sealedIds.map((id) => ({
          ruleId: id,
          detail: "theme_glue_seal",
          path: "sealThemeGlueUntilClear",
        })),
      );
    }
  } catch {
    /* optional */
  }

  return {
    bundle,
    autoClosed: {
      applied: result.applied,
      clearedIds: result.clearedIds,
      remainingFailedIds: result.remainingFailedIds,
      changes: result.changes,
      chatRetryRequired: result.chatRetryRequired && result.remainingFailedIds.length > 0,
    },
    repairChangelog: Array.isArray((result.plan as { repairChangelog?: unknown }).repairChangelog)
      ? ((result.plan as { repairChangelog: unknown[] }).repairChangelog)
      : undefined,
    industryResidualDebts: (result.plan as { industryResidualDebts?: string[] }).industryResidualDebts,
  };
}
