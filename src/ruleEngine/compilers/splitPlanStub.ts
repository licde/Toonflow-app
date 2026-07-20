/**
 * M1 split stub — shape ⊂ M2 splitPlan (forward compatible).
 * Does not write to DB; only proposes.
 */
import { resolveRequiredDuration } from "./resolveRequiredDuration";
import type { PreDesignShot } from "../bundle/types";

export interface SplitPlanShotStub {
  order: number;
  dialogueSlice: string;
  suggestedDurationSec: number;
  role: "line" | "reaction";
}

/** Forward-compatible subset of future splitPlan. */
export interface SplitPlanStub {
  schemaVersion: "splitPlan/1";
  shotIndex?: number;
  reason: string;
  splitHint: string;
  proposedShots: SplitPlanShotStub[];
  /** M1: never auto-applied */
  writeMode: "propose_only";
}

export function buildSplitPlanStub(
  shot: PreDesignShot | Record<string, unknown>,
  opts?: { vendorId?: string | null },
): SplitPlanStub | null {
  const req = resolveRequiredDuration(shot, { vendorId: opts?.vendorId });
  if (!req.needsSplit && !req.overVendorMax) return null;

  const halves = Math.max(1, Math.ceil(req.texts.length / 2));
  const a = req.texts.slice(0, halves).join("");
  const b = req.texts.slice(halves).join("") || "（反应镜：停顿/表情）";
  const durA = Math.max(3, Math.ceil((req.required || 8) / 2));
  const durB = Math.max(2, Math.min(4, durA));

  return {
    schemaVersion: "splitPlan/1",
    shotIndex: Number((shot as PreDesignShot).shotIndex ?? 0) || undefined,
    reason: req.overVendorMax
      ? `required ${req.required}s > vendorMax ${req.vendorMax}s`
      : "multi-line lip budget needs split",
    splitHint: req.splitHint ?? "reaction_shot",
    writeMode: "propose_only",
    proposedShots: [
      { order: 1, dialogueSlice: a, suggestedDurationSec: durA, role: "line" },
      { order: 2, dialogueSlice: b, suggestedDurationSec: durB, role: "reaction" },
    ],
  };
}
