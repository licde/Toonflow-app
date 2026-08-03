/**
 * After expand/collapse: prune dangling IntentGraph edges; rebuild prop_cont stubs for split children.
 */
import type { IntentGraphEdge } from "./shootableArchitecture";

export function pruneIntentGraphEdges(input: {
  shots: Record<string, unknown>[];
  edges?: IntentGraphEdge[] | null;
}): { edges: IntentGraphEdge[]; pruned: number; rebuilt: number } {
  const keys = new Set(
    input.shots.map((s) => String(s.clientId ?? s.shotIndex ?? "")).filter(Boolean),
  );
  const src = input.edges ?? [];
  const kept: IntentGraphEdge[] = [];
  let pruned = 0;
  for (const e of src) {
    if (!keys.has(e.fromShotKey) || !keys.has(e.toShotKey)) {
      pruned += 1;
      continue;
    }
    kept.push(e);
  }

  let rebuilt = 0;
  const have = new Set(kept.map((e) => `${e.kind}:${e.fromShotKey}->${e.toShotKey}`));
  for (const s of input.shots) {
    const parent = String(
      s._stillBeatSplitId ?? s._visualSplitId ?? s._litXorSplitId ?? s._cuCastSplitId ?? "",
    );
    const child = String(s.clientId ?? "");
    if (!parent || !child || parent === child) continue;
    if (!keys.has(parent) && !keys.has(child)) continue;
    // Parent may have been removed after collapse — use stash marker
    const fromKey = keys.has(parent) ? parent : String(s._propContFrom ?? parent);
    if (!keys.has(fromKey) || !keys.has(child)) continue;
    // XOR oral / reaction children: never rebuild prop_cont (paper-in-mouth prune)
    const isOral =
      s._contactEventMustProp === false ||
      /__lit_oral$/i.test(child) ||
      String(s.visualSplitRole ?? s.beatRole ?? "") === "reaction";
    if (isOral) continue;
    const id = `prop_cont:${fromKey}->${child}`;
    if (have.has(id)) continue;
    kept.push({ kind: "prop_cont", fromShotKey: fromKey, toShotKey: child });
    have.add(id);
    rebuilt += 1;
  }

  // Drop any leftover prop_cont into oral children
  const filtered: IntentGraphEdge[] = [];
  for (const e of kept) {
    if (e.kind !== "prop_cont") {
      filtered.push(e);
      continue;
    }
    const toShot = input.shots.find((s) => String(s.clientId ?? "") === e.toShotKey);
    const oralTo =
      toShot &&
      (toShot._contactEventMustProp === false ||
        /__lit_oral$/i.test(e.toShotKey) ||
        String(toShot.visualSplitRole ?? toShot.beatRole ?? "") === "reaction");
    if (oralTo) {
      pruned += 1;
      continue;
    }
    filtered.push(e);
  }

  return { edges: filtered, pruned, rebuilt };
}

/** Attach pruned edges onto bundle.planData / meta IntentGraph if present. */
export function pruneIntentGraphOnBundle(bundle: {
  preDesignPack?: { shots?: unknown[] } | null;
  planData?: Record<string, unknown> | null;
  meta?: Record<string, unknown> | null;
}): { pruned: number; rebuilt: number } {
  const shots = (bundle.preDesignPack?.shots ?? []) as Record<string, unknown>[];
  if (!shots.length) return { pruned: 0, rebuilt: 0 };
  const pd = (bundle.planData ?? {}) as Record<string, unknown>;
  const graph = (pd.intentGraph ?? bundle.meta?.intentGraph ?? {}) as {
    edges?: IntentGraphEdge[];
  };
  const result = pruneIntentGraphEdges({ shots, edges: graph.edges });
  const nextGraph = { ...graph, edges: result.edges };
  if (bundle.planData) {
    (bundle.planData as Record<string, unknown>).intentGraph = nextGraph;
  }
  if (bundle.meta) {
    bundle.meta.intentGraph = nextGraph;
  }
  return { pruned: result.pruned, rebuilt: result.rebuilt };
}
