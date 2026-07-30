import type { ScriptBundle } from "../bundle/types";
import { applyAutoFix } from "../validators/autoFix";
import type { ValidationIssue } from "../types";
import { executeRePushPlan, planRePush } from "./rePushRunner";
import { buildRePushPlan } from "./reverseRouteEngine";
import { applyPatchesToShot } from "./patchApplicator";

export function applyFixPlanToBundle(bundle: ScriptBundle, issues: ValidationIssue[]): {
  bundle: ScriptBundle;
  applied: string[];
  round: number;
  patches: Record<string, unknown>[];
  rePushPlan: ReturnType<typeof buildRePushPlan>;
  fieldsWritten: string[];
  stagesExecuted: string[];
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
  } as ScriptBundle & {
    fixPlan?: { round: number; items: unknown[] };
    rePushPlan?: unknown[];
    preDesignPack?: ScriptBundle["preDesignPack"];
  };

  const fieldsWritten: string[] = [];
  // Apply patches onto preDesign shots when present (real field write, not metadata-only)
  if (next.preDesignPack?.shots?.length && fix.patches.length) {
    const shots = next.preDesignPack.shots.map((s) => ({ ...s })) as Record<string, unknown>[];
    for (const patch of fix.patches) {
      const shotId = patch.shotId as string | undefined;
      const idx = shotId
        ? shots.findIndex((s) => String((s as { id?: string }).id) === shotId)
        : 0;
      const target = shots[idx >= 0 ? idx : 0];
      if (!target) continue;
      const { shot, applied } = applyPatchesToShot(target, patch as Record<string, unknown>);
      Object.assign(target, shot);
      fieldsWritten.push(...applied);
    }
    next.preDesignPack = { ...next.preDesignPack, shots: shots as typeof next.preDesignPack.shots };
  }

  let stagesExecuted: string[] = [];
  if (fix.applied.length) {
    // Always pass ruleIds/triggers — never layer names from rePushTargets
    next.rePushPlan = buildRePushPlan(fix.applied);
    const executed = executeRePushPlan(next.rePushPlan as ReturnType<typeof buildRePushPlan>);
    stagesExecuted = executed.stagesToRerun;
    (next as { rePushExecution?: unknown }).rePushExecution = executed;
  }

  return {
    bundle: next,
    applied: fix.applied,
    round,
    patches: fix.patches,
    rePushPlan: (next.rePushPlan ?? []) as ReturnType<typeof buildRePushPlan>,
    fieldsWritten: [...new Set(fieldsWritten)],
    stagesExecuted,
  };
}

void planRePush;
