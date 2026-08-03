/**
 * Still debt inject precedence — single owner order for closed loop.
 * Violating order = false-complete / multi-SSOT fragmentation.
 */
export const STILL_DEBT_PRECEDENCE = [
  "beat_isolate",
  "sample_must",
  "untilClear_gated",
  "lit_plate_delta",
  "ird_design_only",
  "fidelity_inject",
] as const;

export type StillDebtLayer = (typeof STILL_DEBT_PRECEDENCE)[number];

export type DebtInjectEvent = {
  layer: StillDebtLayer;
  lines?: string[];
  /** Plate/ref delta — only lit_plate_delta may claim repair complete */
  platesSwapped?: boolean;
};

/**
 * Merge inject lines in precedence order. Later layers cannot erase earlier Must stems.
 * IRD design-only: lines tagged ird are kept but never alone mark sample fulfilled.
 */
export function mergeDebtInjectsByPrecedence(
  events: DebtInjectEvent[],
  opts?: { mustStems?: string[] | null },
): { lines: string[]; layersApplied: StillDebtLayer[]; sources: string[] } {
  const byLayer = new Map<StillDebtLayer, string[]>();
  for (const e of events) {
    if (!e.lines?.length) continue;
    const prev = byLayer.get(e.layer) ?? [];
    byLayer.set(e.layer, [...prev, ...e.lines.map(String)]);
  }
  const lines: string[] = [];
  const layersApplied: StillDebtLayer[] = [];
  const sources: string[] = ["debtPrecedence.merge"];
  for (const layer of STILL_DEBT_PRECEDENCE) {
    const chunk = byLayer.get(layer);
    if (!chunk?.length) continue;
    layersApplied.push(layer);
    for (const l of chunk) {
      const t = l.trim();
      if (!t) continue;
      if (!lines.some((x) => x.includes(t.slice(0, 12)) || t.includes(x.slice(0, 12)))) {
        lines.push(t);
      }
    }
    sources.push(`debt.${layer}:${chunk.length}`);
  }
  // Re-assert must stems so later inject cannot drown them
  for (const stem of opts?.mustStems ?? []) {
    const s = String(stem ?? "").trim();
    if (s && !lines.some((l) => l.includes(s.slice(0, 8)))) {
      lines.unshift(s);
      sources.push("debt.reassert_must");
    }
  }
  return { lines: lines.slice(0, 16), layersApplied, sources };
}

/** Inject-only (no plate swap) must never claim sample fulfilled. */
export function mayClaimSampleRepair(input: {
  platesSwapped?: boolean | null;
  layer?: StillDebtLayer | null;
}): boolean {
  if (input.platesSwapped !== true) return false;
  if (input.layer && input.layer !== "lit_plate_delta") return false;
  return true;
}

/** Documented single-source freeze for tests / audits. */
export const STILL_SINGLE_SOURCE_FREEZE = {
  driveFields: ["visualDescription", "shotDesign", "narrative.spatialRelation"] as const,
  forbidReverseCover: ["generation.imagePrompt"] as const,
  completeOnlyWhen: "sampleMustFulfilled",
  banFalseComplete: ["egress_regex_only", "structure_try_shoot", "inject_only_smart_repair"],
};
