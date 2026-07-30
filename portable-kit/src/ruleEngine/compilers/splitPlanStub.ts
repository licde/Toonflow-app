/**
 * splitPlan stub — v1 lip duration; v2 still one-beat (visualDescription).
 */
import { resolveRequiredDuration } from "./resolveRequiredDuration";
import type { PreDesignShot } from "../bundle/types";
import { planStillOneBeatSplit, type StillOneBeatChild } from "../design/expandStillOneBeat";
import { shouldWarnOneBeat } from "./stillIdentitySsot";

export interface SplitPlanShotStub {
  order: number;
  dialogueSlice: string;
  suggestedDurationSec: number;
  role: "line" | "reaction" | string;
  visualDescription?: string;
  tags?: string[];
  shotSize?: string;
  confidence?: number;
}

/** Forward-compatible splitPlan. */
export interface SplitPlanStub {
  schemaVersion: "splitPlan/1" | "splitPlan/2";
  shotIndex?: number;
  reason: string;
  splitHint: string;
  proposedShots: SplitPlanShotStub[];
  /** propose_only | auto_apply when confidence high */
  writeMode: "propose_only" | "auto_apply";
  confidence?: number;
  template?: string;
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

function childToStub(c: StillOneBeatChild, order: number): SplitPlanShotStub {
  return {
    order,
    dialogueSlice: "",
    suggestedDurationSec: c.duration,
    role: c.role,
    visualDescription: c.visualDescription,
    tags: c.tags,
    shotSize: c.shotSize,
    confidence: c.confidence,
  };
}

/** Build splitPlan/2 from multi-beat visualDescription (Must). */
export function buildStillOneBeatSplitPlan(
  shot: PreDesignShot | Record<string, unknown>,
): SplitPlanStub | null {
  const vd = String((shot as { visualDescription?: string }).visualDescription ?? "").trim();
  if (!vd || !shouldWarnOneBeat(vd)) return null;
  const planned = planStillOneBeatSplit(vd);
  if (planned.children.length < 2) return null;
  return {
    schemaVersion: "splitPlan/2",
    shotIndex: Number((shot as PreDesignShot).shotIndex ?? 0) || undefined,
    reason: planned.refuse
      ? `still_onebeat low confidence ${planned.confidence}`
      : `still_onebeat ${planned.template ?? "clause"}`,
    splitHint: "still_onebeat",
    writeMode: planned.refuse ? "propose_only" : "auto_apply",
    confidence: planned.confidence,
    template: planned.template,
    proposedShots: planned.children.map((c, i) => childToStub(c, i + 1)),
  };
}
