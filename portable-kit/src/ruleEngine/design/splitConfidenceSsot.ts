/**
 * Split confidence SSOT — single autoMin from lip_split_doctrine.
 */
import { readFixtureJson } from "../utils/fixturesPath";

export type SplitConfidenceDecision = {
  confidence: number;
  autoEligible: boolean;
  autoMin: number;
  reason?: string;
};

export function loadSplitAutoMin(): number {
  const d = readFixtureJson<{ confidence?: { autoMin?: number } }>("lip_split_doctrine.json", {});
  const n = Number(d.confidence?.autoMin);
  return Number.isFinite(n) && n > 0 ? n : 0.7;
}

/** Heuristic confidence for a planned semantic split. */
export function scoreSplitConfidence(input: {
  hasDifferentiatedVd?: boolean;
  lineCount?: number;
  propCuConflict?: boolean;
  sameVdRefuse?: boolean;
  visBeatMust?: boolean;
}): SplitConfidenceDecision {
  const autoMin = loadSplitAutoMin();
  let c = 0.85;
  if (input.sameVdRefuse) c = 0.2;
  else if (input.propCuConflict) c = 0.45;
  else if (input.visBeatMust && !input.hasDifferentiatedVd) c = 0.55;
  else if ((input.lineCount ?? 0) >= 4 && !input.hasDifferentiatedVd) c = 0.6;
  else if (input.hasDifferentiatedVd) c = 0.88;
  return {
    confidence: c,
    autoEligible: c >= autoMin,
    autoMin,
    reason: input.sameVdRefuse
      ? "same_vd_refuse"
      : input.propCuConflict
        ? "prop_cu_conflict"
        : undefined,
  };
}
