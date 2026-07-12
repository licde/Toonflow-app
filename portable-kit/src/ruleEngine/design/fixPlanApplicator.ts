import type { ScriptBundle } from "../bundle/types";
import { applyAutoFix } from "../validators/autoFix";
import type { ValidationIssue } from "../types";
import { planRePush } from "./rePushRunner";
import { buildRePushPlan } from "./reverseRouteEngine";

export function applyFixPlanToBundle(bundle: ScriptBundle, issues: ValidationIssue[]): {
  bundle: ScriptBundle;
  applied: string[];
  round: number;
  patches: Record<string, unknown>[];
  rePushPlan: ReturnType<typeof buildRePushPlan>;
} {
  const fix = applyAutoFix(issues);
  const round = ((bundle as ScriptBundle & { fixPlan?: { round?: number } }).fixPlan?.round ?? 0) + 1;
  const next = {
    ...bundle,
    fixPlan: {
      round,
      items: fix.patches.map((p, i) => ({
        id: `fix-${i + 1}`,
        ruleId: String(p.ruleId ?? ""),
        autoApplicable: true,
        confidence: 0.9,
        patch: p,
      })),
    },
  } as ScriptBundle & { fixPlan?: { round: number; items: unknown[] }; rePushPlan?: unknown[] };
  if (fix.applied.length) {
    next.rePushPlan = buildRePushPlan(fix.applied);
    planRePush(next.rePushPlan as ReturnType<typeof buildRePushPlan>);
  }
  return {
    bundle: next,
    applied: fix.applied,
    round,
    patches: fix.patches,
    rePushPlan: (next.rePushPlan ?? []) as ReturnType<typeof buildRePushPlan>,
  };
}
