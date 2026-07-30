import type { ScriptBundle } from "../bundle/types";
import { readFixtureJson } from "../utils/fixturesPath";
import { buildRePushPlan } from "./reverseRouteEngine";

interface DerivationEntry {
  chainId: string;
  sourceField: string;
  targetField: string;
  ruleId?: string;
}

export interface NarrativeGraph {
  nodes: { id: string; label: string }[];
  edges: { from: string; to: string; broken?: boolean }[];
  broken: { from: string; to: string; reason: string }[];
  reverseHints: { edge: string; target: string; hint: string }[];
}

function loadDerivations(): DerivationEntry[] {
  return readFixtureJson<{ derivations?: DerivationEntry[] }>("derivation_registry.json", { derivations: [] }).derivations ?? [];
}

export function buildNarrativeGraph(bundle: ScriptBundle): NarrativeGraph {
  const brief = bundle.designBrief as { infoLinkageChain?: { type?: string; desc?: string }[]; B5?: unknown[] } | undefined;
  const markers = brief?.infoLinkageChain ?? brief?.B5 ?? [];
  const nodes = (markers as { type?: string; desc?: string }[]).map((m, i) => ({
    id: `m-${i}`,
    label: m.desc ?? m.type ?? `marker-${i}`,
  }));
  const edges = nodes.slice(1).map((n, i) => ({ from: nodes[i].id, to: n.id }));
  const shots = bundle.preDesignPack?.shots ?? [];
  const hasMarkers = shots.some((s) => ((s as { markers?: unknown[] }).markers?.length ?? (s as { narrative?: { markers?: unknown[] } }).narrative?.markers?.length ?? 0) > 0);

  const broken: { from: string; to: string; reason: string }[] = [];
  if (markers.length > 0 && shots.length > 0 && !hasMarkers) {
    broken.push({ from: "designBrief.B5", to: "SB.markers", reason: "story_link_broken" });
  }

  const storyDeriv = loadDerivations().find((d) => d.chainId === "story");
  const reverseHints = broken.map((b) => ({
    edge: `${b.from}->${b.to}`,
    target: storyDeriv?.ruleId ?? "W3",
    hint: b.reason,
  }));
  if (broken.length) {
    buildRePushPlan(["story_link_broken"]);
  }

  return { nodes, edges, broken, reverseHints };
}

export function enrichNarrativeGraph(bundle: ScriptBundle): ScriptBundle {
  const g = buildNarrativeGraph(bundle);
  return { ...bundle, narrativeCausalityGraph: g as unknown as Record<string, unknown> };
}

export function narrativeGraphBroken(bundle: ScriptBundle): boolean {
  return buildNarrativeGraph(bundle).broken.length > 0;
}
