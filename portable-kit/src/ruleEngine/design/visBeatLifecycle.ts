/**
 * VisBeat override + forward reentry + reverse loop guard (in-memory).
 */
export type VisBeatOverride = {
  reason: "oner_artistic" | "director_lock" | string;
  by?: string;
  at: string;
  note?: string;
};

const reverseLoopCounts = new Map<string, number>();

export function setVisBeatOverrideOnShot(
  shot: Record<string, unknown>,
  override: VisBeatOverride,
): Record<string, unknown> {
  return {
    ...shot,
    visBeatOverride: override,
    visBeatConflict: undefined,
    visBeatUnsplittable: undefined,
  };
}

export function checkReverseLoop(trigger: string, key: string, max = 3): { allow: boolean; count: number } {
  const k = `${trigger}:${key}`;
  const n = (reverseLoopCounts.get(k) ?? 0) + 1;
  reverseLoopCounts.set(k, n);
  return { allow: n <= max, count: n };
}

export function resetReverseLoopForTests(): void {
  reverseLoopCounts.clear();
}

/** After tag fix: mark children stale for recompose; keep hq_ok filePath if present. */
export function planForwardReentry(shots: Record<string, unknown>[]): {
  staleClientIds: string[];
  keepMediaClientIds: string[];
} {
  const staleClientIds: string[] = [];
  const keepMediaClientIds: string[] = [];
  for (const s of shots) {
    const id = String(s.clientId ?? s.shotIndex ?? "");
    if (s.stillQuality === "hq_ok" && s.filePath) keepMediaClientIds.push(id);
    else staleClientIds.push(id);
  }
  return { staleClientIds, keepMediaClientIds };
}

/**
 * Media policy after split/undo:
 * - Parent media stays on first child with same _visualSplitId if preserveParentMedia
 * - New children start with empty filePath until generate
 * - Undo: restore parent clientId, clear child rows, keep parent file if hq_ok
 */
export function applyMediaPreserveOnSplit(
  children: Record<string, unknown>[],
  parent?: Record<string, unknown> | null,
): Record<string, unknown>[] {
  if (!parent?.filePath) {
    return children.map((c) => ({ ...c, filePath: undefined, stillQuality: undefined }));
  }
  let assigned = false;
  return children.map((c) => {
    if (!assigned && (c.visualSplitRole === "reaction" || c.weaponBeatRole === "reaction")) {
      assigned = true;
      return {
        ...c,
        filePath: parent.filePath,
        stillQuality: "stale_inherited",
        composeHash: undefined,
        promptState: "stale",
      };
    }
    return { ...c, filePath: undefined, stillQuality: undefined };
  });
}

export function planUndoVisualSplit(
  shots: Record<string, unknown>[],
  parentKey: string,
): { shots: Record<string, unknown>[]; restored: boolean } {
  const children = shots.filter((s) => s._visualSplitId === parentKey);
  if (!children.length) return { shots, restored: false };
  const keep = shots.filter((s) => s._visualSplitId !== parentKey);
  const template = { ...children[0]! };
  delete template._visualSplitId;
  delete template.visualSplitRole;
  template.clientId = parentKey;
  template.composeHash = undefined;
  template.promptState = "stale";
  template.packageVersion = Number(template.packageVersion ?? 0) + 1;
  return { shots: [...keep, template], restored: true };
}
