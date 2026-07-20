/**
 * Minimal ConflictResolver: G anchors vs continuity recap — prefer continuity carry ids, warn on clash.
 */
export interface ConflictItem {
  field: string;
  gValue?: unknown;
  continuityValue?: unknown;
  resolution: "keep_continuity" | "keep_g" | "merge" | "confirm";
}

export function resolveGVsContinuity(input: {
  gAnchors?: Record<string, unknown>;
  continuity?: { recapHint?: string; carryInfoIds?: string[] };
}): { conflicts: ConflictItem[]; mergedContinuity: Record<string, unknown> } {
  const conflicts: ConflictItem[] = [];
  const g = input.gAnchors ?? {};
  const c = input.continuity ?? {};
  if (g.recapHint && c.recapHint && g.recapHint !== c.recapHint) {
    conflicts.push({
      field: "recapHint",
      gValue: g.recapHint,
      continuityValue: c.recapHint,
      resolution: "keep_continuity",
    });
  }
  return {
    conflicts,
    mergedContinuity: {
      ...c,
      recapHint: c.recapHint ?? g.recapHint,
      carryInfoIds: c.carryInfoIds ?? [],
    },
  };
}
