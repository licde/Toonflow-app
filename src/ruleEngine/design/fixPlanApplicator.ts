import type { ScriptBundle } from "../bundle/types";
import { applyAutoFix } from "../validators/autoFix";
import type { ValidationIssue } from "../types";

export function applyFixPlanToBundle(bundle: ScriptBundle, issues: ValidationIssue[]): {
  bundle: ScriptBundle;
  applied: string[];
  round: number;
} {
  const fix = applyAutoFix(issues);
  const round = ((bundle as ScriptBundle & { fixPlan?: { round?: number } }).fixPlan?.round ?? 0) + 1;
  return { bundle, applied: fix.applied, round };
}
