/**
 * STILL_HQ_EGRESS — hq_ok requires visualPass; no L0-only stamp.
 */
import { degradeHqWithoutVisualPass } from "../../qc/stillVisualFidelityLoop";
import type { UntilClearFinding, UntilClearHealPatch, UntilClearHandlerCtx } from "../untilClearRuntime";

export const CLASS_ID = "STILL_HQ_EGRESS";

export function detect(ctx: UntilClearHandlerCtx): UntilClearFinding[] {
  const degraded = degradeHqWithoutVisualPass({
    stillQuality: ctx.stillQuality,
    visualPass: ctx.visualPass,
    visualPassAt: ctx.visualPassAt,
    humanOverride: ctx.humanOverride,
  });
  if (degraded === "weak" || degraded === "missing") {
    return [
      {
        classId: CLASS_ID,
        layer: "L1_pixel",
        code: "STILL-HQ-WITHOUT-VP",
        message: "hq_ok 需要 visualPass 或人审",
        debtKind: "stamp",
      },
    ];
  }
  if (ctx.stillQuality === "hq_ok" && ctx.visualPass !== true && !ctx.visualPassAt) {
    return [
      {
        classId: CLASS_ID,
        layer: "L1_pixel",
        code: "FORGED_HQ",
        message: "禁止 L0/infra 发明 hq_ok",
        debtKind: "stamp",
      },
    ];
  }
  return [];
}

export function heal(): UntilClearHealPatch {
  return { actuators: ["regen_storyboard_hq", "human_rejudge"], injectLines: [] };
}

export function reassert(ctx: UntilClearHandlerCtx): boolean {
  return detect(ctx).length === 0;
}
