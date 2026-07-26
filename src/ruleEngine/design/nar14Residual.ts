/**
 * NAR-14 residual SSOT — after A clause-split, over-budget lines without punct.
 * Dual path: must = redesign/explicit splitHint; auto = B cluster + bind hint only if reaction sibling exists.
 */
import { canPhysicalClauseSplit, needsNar14Split, type Nar14LineLike } from "../nar14ClauseSplit";
import { expandDialogueClusters, type ClusterShot } from "./expandDialogueClusters";
import { readFixtureJson } from "../utils/fixturesPath";
import { mirrorAndSyncPlanToShots } from "./dialogueMirrorSsot";

export type ResidualPath = "must_redesign" | "auto_B" | "cleared" | "none";

export type ResidualFinding = {
  lineId?: string;
  text: string;
  path: ResidualPath;
  reason: string;
};

export function loadNar14ResidualDoctrine() {
  return readFixtureJson<{
    freeze?: { neverSilentInvent?: string[] };
    dualPath?: { must?: { chatRepairClass?: string }; auto?: { splitHintValue?: string } };
  }>("nar14_residual_doctrine.json", {});
}

/** True when line still needs NAR-14 and cannot be further physically clause-split. */
export function isNar14Residual(
  text: string,
  opts?: { splitHint?: string | null },
): boolean {
  if (!needsNar14Split(text, { splitHint: opts?.splitHint })) return false;
  return !canPhysicalClauseSplit(text);
}

export function collectNar14Residuals(lines: Nar14LineLike[]): ResidualFinding[] {
  const out: ResidualFinding[] = [];
  for (const l of lines) {
    const text = String(l.text ?? "").trim();
    if (!text) continue;
    if (!isNar14Residual(text, { splitHint: l.splitHint })) continue;
    out.push({
      lineId: l.lineId ? String(l.lineId) : undefined,
      text,
      path: "must_redesign",
      reason: "residual_no_punct_over_budget",
    });
  }
  return out;
}

function hasReactionSibling(shots: ClusterShot[], lineId: string): boolean {
  return shots.some(
    (s) =>
      (s.beatRole === "reaction" || s.beatRole === "emphasize") &&
      (String(s.clusterParentId ?? "") === lineId || String(s.clusterLineId ?? "") === lineId),
  );
}

/**
 * Truthful bind: set splitHint=reaction_shot only when a physical reaction sibling exists
 * for the speak shot that contains the residual line (anti false-green).
 */
export function bindSplitHintWhenReactionExists(
  planLines: Nar14LineLike[],
  shots: Record<string, unknown>[],
  hintValue = "reaction_shot",
): { planLines: Nar14LineLike[]; shots: Record<string, unknown>[]; bound: number } {
  const list = shots as ClusterShot[];
  const keysWithReact = new Set(
    list
      .filter((s) => s.beatRole === "reaction" || s.beatRole === "emphasize")
      .map((s) => String(s.clusterParentId ?? s.clusterLineId ?? ""))
      .filter(Boolean),
  );
  const lineIdsCoveredByB = new Set<string>();
  for (const s of list) {
    if (s.beatRole === "reaction" || s.beatRole === "emphasize") continue;
    const key = String(s.clusterLineId ?? lineIdFallback(s) ?? "");
    if (!key || !keysWithReact.has(key)) continue;
    const lines =
      ((s.narrative as { dialogue?: { lines?: Nar14LineLike[] } })?.dialogue?.lines ?? []) as Nar14LineLike[];
    for (const l of lines) {
      if (l.lineId) lineIdsCoveredByB.add(String(l.lineId));
    }
  }

  let bound = 0;
  const nextPlan = planLines.map((l) => {
    const lid = l.lineId ? String(l.lineId) : "";
    if (!lid || String(l.splitHint ?? "").trim()) return l;
    if (!isNar14Residual(String(l.text ?? ""), { splitHint: l.splitHint })) return l;
    if (!lineIdsCoveredByB.has(lid) && !hasReactionSibling(list, lid)) return l;
    bound++;
    return { ...l, splitHint: hintValue };
  });
  const byId = new Map(nextPlan.filter((l) => l.lineId).map((l) => [String(l.lineId), l]));
  const nextShots = list.map((s) => {
    const n = { ...(s.narrative as object) } as { dialogue?: { lines?: Nar14LineLike[] } };
    const lines = [...(n.dialogue?.lines ?? [])];
    let changed = false;
    for (let i = 0; i < lines.length; i++) {
      const lid = lines[i]?.lineId ? String(lines[i]!.lineId) : "";
      const src = lid ? byId.get(lid) : undefined;
      if (src?.splitHint && !lines[i]?.splitHint) {
        lines[i] = { ...lines[i]!, splitHint: src.splitHint };
        changed = true;
      }
    }
    if (!changed) return s;
    return { ...s, narrative: { ...n, dialogue: { lines } } };
  });
  return { planLines: nextPlan, shots: nextShots, bound };
}

function lineIdFallback(shot: ClusterShot): string {
  const lines = ((shot.narrative as { dialogue?: { lines?: Nar14LineLike[] } })?.dialogue?.lines ??
    []) as Nar14LineLike[];
  return String(lines[0]?.lineId ?? shot.clientId ?? shot.shotIndex ?? "");
}

/**
 * Force speak_react cluster for residual lines (isolate residual line onto temp speak shot), then truthful bind.
 */
export function healNar14ResidualWithB(input: {
  planLines: Nar14LineLike[];
  shots: Record<string, unknown>[];
  profileId?: string;
}): {
  planLines: Nar14LineLike[];
  shots: Record<string, unknown>[];
  expandedCount: number;
  bound: number;
  remainingResiduals: ResidualFinding[];
} {
  const doctrine = loadNar14ResidualDoctrine();
  const hintValue = doctrine.dualPath?.auto?.splitHintValue ?? "reaction_shot";
  const residuals = collectNar14Residuals(input.planLines);
  if (!residuals.length) {
    return {
      planLines: input.planLines,
      shots: input.shots,
      expandedCount: 0,
      bound: 0,
      remainingResiduals: [],
    };
  }
  const residualIds = new Set(residuals.map((r) => r.lineId).filter(Boolean) as string[]);

  // Isolate residual lines into dedicated speak shots so cluster key = residual lineId
  const expandedShots: Record<string, unknown>[] = [];
  for (const s of input.shots) {
    const n = { ...((s.narrative as object) ?? {}) } as { dialogue?: { lines?: Nar14LineLike[] } };
    const lines = [...(n.dialogue?.lines ?? [])];
    const residualOnShot = lines.filter((l) => l.lineId && residualIds.has(String(l.lineId)));
    const keep = lines.filter((l) => !l.lineId || !residualIds.has(String(l.lineId)));
    if (!residualOnShot.length) {
      expandedShots.push(s);
      continue;
    }
    if (keep.length) {
      expandedShots.push({ ...s, narrative: { ...n, dialogue: { lines: keep } } });
    }
    for (const rl of residualOnShot) {
      expandedShots.push({
        ...s,
        clientId: `${String(s.clientId ?? s.shotIndex ?? "s")}-res-${rl.lineId}`,
        _nar14Residual: true,
        narrative: {
          ...n,
          dialogue: { lines: [rl] },
          emotionIntensity: Math.max(Number((n as { emotionIntensity?: number }).emotionIntensity ?? 5), 7),
        },
      });
    }
  }

  const clustered = expandDialogueClusters(expandedShots as ClusterShot[], {
    profileId: input.profileId,
    intensity: 7,
  });
  const shots = clustered.shots as Record<string, unknown>[];

  const bound = bindSplitHintWhenReactionExists(
    input.planLines.map((l) => ({ ...l })),
    shots,
    hintValue,
  );
  const sync = mirrorAndSyncPlanToShots(bound.planLines, bound.shots);
  const remaining = collectNar14Residuals(bound.planLines);

  return {
    planLines: bound.planLines,
    shots: sync.shots,
    expandedCount: clustered.expandedCount,
    bound: bound.bound,
    remainingResiduals: remaining,
  };
}

/** Chat-repair classification: residual NAR-14 → must unless cleared by B bind. */
export function classifyNar14ForChatRepair(input: {
  planLines?: Nar14LineLike[];
  shots?: Record<string, unknown>[];
  blockHasNar14: boolean;
}): "must" | "auto" | "none" {
  if (!input.blockHasNar14) return "none";
  const plan = input.planLines ?? [];
  const residuals = collectNar14Residuals(plan);
  if (residuals.length) return "must";
  // Still NAR-14 but not residual → still A-eligible → auto
  const still = plan.some((l) => needsNar14Split(String(l.text ?? ""), { splitHint: l.splitHint }));
  if (still) return "auto";
  // Shot-only fails
  for (const s of input.shots ?? []) {
    const lines =
      ((s.narrative as { dialogue?: { lines?: Nar14LineLike[] } })?.dialogue?.lines ?? []) as Nar14LineLike[];
    if (collectNar14Residuals(lines).length) return "must";
    if (lines.some((l) => needsNar14Split(String(l.text ?? ""), { splitHint: l.splitHint }))) return "auto";
  }
  return "must";
}
