/**
 * Lightweight QualityGate L0 — Touch + preflight must not be silently skipped in prod.
 */
export type QualityGateLevel = "L0" | "L1" | "L2";

export interface QualityGateResult {
  level: QualityGateLevel;
  passed: boolean;
  blockers: string[];
  warnings: string[];
}

export function runQualityGateL0(input: {
  preflightSkipped?: boolean;
  preflightBlocked?: boolean;
  modalityBlocks?: number;
  falseGreen?: boolean;
}): QualityGateResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (input.preflightSkipped) blockers.push("preflight_skipped_in_prod");
  if (input.preflightBlocked) blockers.push("preflight_blocked");
  if ((input.modalityBlocks ?? 0) > 0) blockers.push(`modality_blocks:${input.modalityBlocks}`);
  if (input.falseGreen) warnings.push("chat_self_report_false_green");
  return {
    level: "L0",
    passed: blockers.length === 0,
    blockers,
    warnings,
  };
}
