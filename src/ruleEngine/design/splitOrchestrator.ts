/**
 * SplitOrchestrator — after A/B/C split: mirror → shot sync → NAR/DC01 recheck → duration/ledger.
 * Compatible with runShotExpanders (VisBeat): call expanders first, then this for dialogue fields.
 */
import {
  expandLinesByClauseSplit,
  type Nar14LineLike,
} from "../nar14ClauseSplit";
import { runShotExpanders } from "./expanderRegistry";
import { diagnoseNar } from "./gateDiagnose";
import { rebindLedgerAfterExpand } from "./visBeatLedgerRebind";
import { healNar14ResidualWithB } from "./nar14Residual";
import { healLipMultiLineWithB } from "./lipSplit";
import { diagnoseDc01 } from "./gateDiagnose";
import { resolveRequiredDuration } from "../compilers/resolveRequiredDuration";

export type OrchestratorLog = { step: string; detail?: string; count?: number };

/**
 * Mirror plan line fields onto shots by lineId; also push missing plan lines into first speak shot.
 */
export function mirrorAndSyncPlanToShots(
  planLines: Nar14LineLike[],
  shots: Record<string, unknown>[],
): { shots: Record<string, unknown>[]; mirrored: number; appended: number } {
  const byId = new Map<string, Nar14LineLike>();
  for (const pl of planLines) {
    if (pl.lineId) byId.set(String(pl.lineId), pl);
  }
  let mirrored = 0;
  let appended = 0;
  const present = new Set<string>();

  const nextShots = shots.map((s) => {
    const n = { ...((s.narrative as object) ?? {}) } as {
      dialogue?: { lines?: Nar14LineLike[] };
      shotSize?: string;
    };
    const lines = [...(n.dialogue?.lines ?? [])] as Nar14LineLike[];
    for (let i = 0; i < lines.length; i++) {
      const lid = lines[i]?.lineId ? String(lines[i]!.lineId) : "";
      if (lid) present.add(lid);
      const src = lid ? byId.get(lid) : undefined;
      if (!src) continue;
      const cur = { ...lines[i]! };
      if (src.splitHint && !cur.splitHint) {
        cur.splitHint = src.splitHint;
        mirrored++;
      }
      if (src.reactionAction && !cur.reactionAction) {
        cur.reactionAction = src.reactionAction;
        mirrored++;
      }
      if (src.functions?.length && !cur.functions?.length) {
        cur.functions = [...src.functions];
        mirrored++;
      }
      if (src.text && cur.text !== src.text && lid) {
        /* keep shot text if already set; plan wins only for metadata */
      }
      lines[i] = cur;
    }
    n.dialogue = { lines };
    return { ...s, narrative: n };
  });

  const missing = planLines.filter((p) => p.lineId && !present.has(String(p.lineId)));
  if (missing.length && nextShots.length) {
    // Distribute missing lines: one new speak shot per line (never dump all onto one dialogue shot → multi_line).
    for (const m of missing) {
      const template =
        nextShots.find((s) => {
          const lines = (s.narrative as { dialogue?: { lines?: unknown[] } })?.dialogue?.lines ?? [];
          return lines.length > 0;
        }) ?? nextShots[0]!;
      const n = { ...((template.narrative as object) ?? {}) } as { dialogue?: { lines?: Nar14LineLike[] } };
      nextShots.push({
        ...template,
        clientId: `${String(template.clientId ?? template.shotIndex ?? "s")}-sync-${m.lineId}`,
        shotIndex: undefined,
        _mirrorAppend: true,
        narrative: { ...n, dialogue: { lines: [{ ...m }] } },
      });
      appended++;
    }
    nextShots.forEach((s, i) => {
      s.shotIndex = i + 1;
      s.index = i;
    });
  }

  return { shots: nextShots, mirrored, appended };
}

export function runSplitOrchestrator(
  input: {
    planData?: Record<string, unknown> | null;
    shots: Record<string, unknown>[];
    meta?: Record<string, unknown> | null;
    applyClauseSplit?: boolean;
    applyVisBeatExpanders?: boolean;
    profileId?: string;
  },
): {
  planData: Record<string, unknown>;
  shots: Record<string, unknown>[];
  log: OrchestratorLog[];
  narFails: ReturnType<typeof diagnoseNar>;
  dcFails: ReturnType<typeof diagnoseDc01>;
} {
  const log: OrchestratorLog[] = [];
  const planData = { ...(input.planData ?? {}) } as Record<string, unknown>;
  let shots = [...input.shots];

  // 1) VisBeat / weapon / cluster expanders first (compat)
  if (input.applyVisBeatExpanders !== false) {
    const exp = runShotExpanders(shots, {
      meta: input.meta,
      profileId: input.profileId,
      applyClusters: true,
    });
    shots = exp.shots;
    for (const l of exp.log) {
      if (l.expanded) log.push({ step: `expander:${l.expanderId}`, count: l.count, detail: l.detail });
    }
  }

  // 2) Clause split on plan + shots
  if (input.applyClauseSplit !== false) {
    const dp = (planData.dialoguePlan as { lines?: Nar14LineLike[] } | undefined) ?? { lines: [] };
    if (dp.lines?.length) {
      const { lines, splitCount } = expandLinesByClauseSplit(dp.lines);
      planData.dialoguePlan = { ...dp, lines };
      if (splitCount) log.push({ step: "clause_split_plan", count: splitCount });
    }
    shots = shots.map((s) => {
      const n = { ...((s.narrative as object) ?? {}) } as { dialogue?: { lines?: Nar14LineLike[] } };
      const raw = n.dialogue?.lines ?? [];
      if (!raw.length) return s;
      const { lines, splitCount } = expandLinesByClauseSplit(raw);
      if (splitCount) log.push({ step: "clause_split_shot", count: splitCount, detail: String(s.shotIndex ?? "") });
      n.dialogue = { lines };
      return { ...s, narrative: n };
    });
  }

  // 3) Mirror + append missing lineIds to shots
  let planLines =
    ((planData.dialoguePlan as { lines?: Nar14LineLike[] } | undefined)?.lines ?? []) as Nar14LineLike[];
  const sync = mirrorAndSyncPlanToShots(planLines, shots);
  shots = sync.shots;
  log.push({ step: "mirror_sync", count: sync.mirrored, detail: `appended=${sync.appended}` });

  // 3b) Residual NAR-14 → B cluster + truthful bind + re-sync
  const residualHeal = healNar14ResidualWithB({ planLines, shots, profileId: input.profileId });
  if (residualHeal.expandedCount || residualHeal.bound) {
    planData.dialoguePlan = {
      ...((planData.dialoguePlan as object) ?? {}),
      lines: residualHeal.planLines,
    };
    planLines = residualHeal.planLines;
    shots = residualHeal.shots;
    log.push({
      step: "nar14_residual_B",
      count: residualHeal.expandedCount,
      detail: `bound=${residualHeal.bound};remain=${residualHeal.remainingResiduals.length}`,
    });
  }

  // 3c) Multi-line lip pressure → cluster split (same SSOT as burn needsSplit)
  const lipHeal = healLipMultiLineWithB({ shots, profileId: input.profileId });
  if (lipHeal.expandedCount || lipHeal.healedShotIndexes.length) {
    shots = lipHeal.shots;
    log.push({
      step: "lip_multi_B",
      count: lipHeal.expandedCount,
      detail: `healed=${lipHeal.healedShotIndexes.join(",")};remain=${lipHeal.remainingPressure}`,
    });
  }

  // 3d) Re-align durations after split (respect vendor; never raise into needsSplit)
  shots = shots.map((s) => {
    const req = resolveRequiredDuration(s);
    if (req.needsSplit || req.overVendorMax) return s;
    if (req.canSilentRaise && req.required > req.authorDuration) {
      return { ...s, duration: req.required };
    }
    return s;
  });

  // 4) Ledger rebind
  const reb = rebindLedgerAfterExpand(shots);
  shots = reb.shots;
  if (reb.rebound) log.push({ step: "ledger_rebind", count: reb.rebound });

  // 5) packageVersion bump
  shots = shots.map((s) => ({
    ...s,
    packageVersion: Number(s.packageVersion ?? 0) + 1,
  }));

  const narFails = diagnoseNar({ planData, shots });
  log.push({ step: "nar_recheck", count: narFails.length });
  const dcFails = diagnoseDc01({ planData, shots });
  log.push({ step: "dc01_recheck", count: dcFails.length });

  return { planData, shots, log, narFails, dcFails };
}

/** Dry-run: predict lineId/shot deltas without mutating. */
export function dryRunSplitOrchestrator(input: {
  planData?: Record<string, unknown> | null;
  shots: Record<string, unknown>[];
  meta?: Record<string, unknown> | null;
}): {
  predictedPlanLineCount: number;
  predictedShotCount: number;
  predictedNarFails: ReturnType<typeof diagnoseNar>;
  log: OrchestratorLog[];
} {
  const r = runSplitOrchestrator({
    ...input,
    shots: input.shots.map((s) => structuredClone(s)),
    planData: input.planData ? structuredClone(input.planData) : {},
  });
  const planLines =
    ((r.planData.dialoguePlan as { lines?: unknown[] } | undefined)?.lines ?? []).length;
  return {
    predictedPlanLineCount: planLines,
    predictedShotCount: r.shots.length,
    predictedNarFails: r.narFails,
    log: r.log,
  };
}
