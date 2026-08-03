/**
 * After IntentGraph split: inherit continuity via refs/meta edges — never copy parent dual VD.
 */
import type { IntentGraphEdge } from "./shootableArchitecture";

export function inheritContinuityAlongEdges(input: {
  shots: Record<string, unknown>[];
  edges?: IntentGraphEdge[] | null;
}): { shots: Record<string, unknown>[]; inherited: number } {
  const byKey = new Map(
    input.shots.map((s) => [String(s.clientId ?? s.shotIndex ?? ""), s] as const),
  );
  let inherited = 0;
  const edges = input.edges?.length
    ? input.edges
    : input.shots
        .filter((s) => s._litXorSplitId || s._stillBeatSplitId)
        .map((s) => ({
          kind: "prop_cont" as const,
          fromShotKey: String(s._litXorSplitId ?? s._stillBeatSplitId ?? ""),
          toShotKey: String(s.clientId ?? ""),
        }))
        .filter((e) => e.fromShotKey && e.toShotKey && e.fromShotKey !== e.toShotKey);

  for (const e of edges) {
    if (e.kind !== "prop_cont" && e.kind !== "look_cont") continue;
    const from = byKey.get(e.fromShotKey);
    const to = byKey.get(e.toShotKey);
    if (!from || !to) continue;
    // Prefer parent look codes / colorTemp — not visualDescription body
    if (!to.charCodes && from.charCodes) {
      to.charCodes = from.charCodes;
      inherited += 1;
    }
    const fromNarr = (from.narrative as Record<string, unknown>) ?? {};
    const toNarr = { ...((to.narrative as Record<string, unknown>) ?? {}) };
    if (!toNarr.colorTemp && fromNarr.colorTemp) {
      toNarr.colorTemp = fromNarr.colorTemp;
      to.narrative = toNarr;
      inherited += 1;
    }
    if (!to.sceneCode && from.sceneCode) {
      to.sceneCode = from.sceneCode;
      inherited += 1;
    }
    // PROP continuity marker for theme-glue / PROP-CONT exempt path
    if (from.xorSplit || to.xorSplit) {
      to.xorSplit = true;
      to._propContFrom = e.fromShotKey;
    }
  }
  return { shots: input.shots, inherited };
}
