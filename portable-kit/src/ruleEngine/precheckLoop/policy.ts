/**
 * Repair decision policy — fixture-driven, not hardcoded if-else sprawl.
 */
import { readFixtureJson } from "../utils/fixturesPath";
import type { DecisionMode, DiagnosisFinding, SuggestedPatch } from "./types";

export interface CheckRepairPolicy {
  soft_patch_when?: string[];
  human_when?: string[];
  minConfidence?: number;
  maxRounds?: number;
  repairHintId?: string;
}

export interface RepairDecisionPolicy {
  version?: string;
  defaultMaxRounds?: number;
  defaultMinConfidence?: number;
  checks: Record<string, CheckRepairPolicy>;
}

const FALLBACK: RepairDecisionPolicy = {
  version: "1.0.0",
  defaultMaxRounds: 2,
  defaultMinConfidence: 0.8,
  checks: {
    "DC-01": {
      soft_patch_when: ["unique_missing_line", "empty_target_shot"],
      human_when: ["plan_script_conflict", "lineId_mode_mismatch", "ambiguous_target", "filtered_scope"],
      minConfidence: 0.8,
      maxRounds: 2,
      repairHintId: "RH-QP-03",
    },
  },
};

export function loadRepairDecisionPolicy(): RepairDecisionPolicy {
  const loaded = readFixtureJson<RepairDecisionPolicy | null>("precheck_repair_decision.json", null);
  if (!loaded?.checks) return FALLBACK;
  return {
    ...FALLBACK,
    ...loaded,
    checks: { ...FALLBACK.checks, ...loaded.checks },
  };
}

export function decideRepairMode(input: {
  findings: DiagnosisFinding[];
  patches: SuggestedPatch[];
  policy?: RepairDecisionPolicy;
}): { mode: DecisionMode; reason: string; minConfidence: number; maxRounds: number; repairHintId?: string } {
  const policy = input.policy ?? loadRepairDecisionPolicy();
  const failed = input.findings.filter((f) => !f.passed && (f.severity === "BLOCK" || f.severity === "WARN"));
  if (!failed.length) {
    return {
      mode: "ok",
      reason: "all checks passed",
      minConfidence: policy.defaultMinConfidence ?? 0.8,
      maxRounds: policy.defaultMaxRounds ?? 2,
    };
  }

  // Prefer highest-severity failed finding for decision
  const primary =
    failed.find((f) => f.severity === "BLOCK") ?? failed[0];
  const checkPolicy = policy.checks[primary.id] ?? {};
  const minConfidence = checkPolicy.minConfidence ?? policy.defaultMinConfidence ?? 0.8;
  const maxRounds = checkPolicy.maxRounds ?? policy.defaultMaxRounds ?? 2;
  const repairHintId = checkPolicy.repairHintId ?? primary.repairHintId;

  const reasons = (primary.evidence.repairReasons as string[]) ?? [];
  const humanHits = (checkPolicy.human_when ?? []).filter((r) => reasons.includes(r));
  if (humanHits.length || primary.evidence.shotScope === "filtered") {
    return {
      mode: "human",
      reason: humanHits[0] ?? "filtered_scope",
      minConfidence,
      maxRounds,
      repairHintId,
    };
  }

  const related = input.patches.filter((p) => p.checkId === primary.id);
  const softOk =
    related.length > 0 &&
    related.every((p) => p.confidence >= minConfidence) &&
    (checkPolicy.soft_patch_when ?? []).some((r) => reasons.includes(r) || reasons.length === 0);

  if (softOk && related.length === 1) {
    return {
      mode: "soft_patch",
      reason: reasons[0] ?? "unique_soft_patch",
      minConfidence,
      maxRounds,
      repairHintId,
    };
  }

  if (related.length > 0) {
    return {
      mode: "suggest",
      reason: related.length > 1 ? "ambiguous_target" : "below_confidence",
      minConfidence,
      maxRounds,
      repairHintId,
    };
  }

  return {
    mode: "human",
    reason: "no_patch",
    minConfidence,
    maxRounds,
    repairHintId,
  };
}
