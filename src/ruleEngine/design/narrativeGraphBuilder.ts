import type { ScriptBundle } from "../bundle/types";
import { buildRePushPlan } from "./reverseRouteEngine";

export interface NarrativeGraph {
  nodes: { id: string; label: string }[];
  edges: { from: string; to: string; broken?: boolean }[];
  broken: { from: string; to: string; reason: string }[];
  reverseHints: { edge: string; target: string; hint: string }[];
}

export function buildNarrativeGraph(bundle: ScriptBundle): NarrativeGraph {
  const brief = bundle.designBrief as { infoLinkageChain?: { type?: string; desc?: string }[] } | undefined;
  const markers = brief?.infoLinkageChain ?? [];
  const nodes = markers.map((m, i) => ({ id: `m-${i}`, label: m.desc ?? m.type ?? `marker-${i}` }));
  const edges = nodes.slice(1).map((n, i) => ({ from: nodes[i].id, to: n.id }));
  const broken = edges.filter(() => false);
  const reverseHints = broken.map((b) => ({
    edge: `${b.from}->${b.to}`,
    target: "W3",
    hint: "补 marker 因果",
  }));
  if (broken.length && !reverseHints.length) {
    reverseHints.push({ edge: "story", target: "W3", hint: "narrative_graph_broken" });
  }
  return { nodes, edges, broken, reverseHints };
}

export function enrichNarrativeGraph(bundle: ScriptBundle): ScriptBundle {
  const g = buildNarrativeGraph(bundle);
  return { ...bundle, narrativeCausalityGraph: g as unknown as Record<string, unknown> };
}
