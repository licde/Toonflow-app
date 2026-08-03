/**
 * IDENTITY_PLATE untilClear — missing look/cref is contract debt, not a gray-button gate.
 */
import type { UntilClearFinding, UntilClearHealPatch, UntilClearHandlerCtx } from "../untilClearRuntime";

export const CLASS_ID = "IDENTITY_PLATE";

export function detect(ctx: UntilClearHandlerCtx): UntilClearFinding[] {
  const missing = ctx.descCoverageMissing ?? [];
  if (
    missing.some((x) => /identity|定妆|IMG-CREF|CREF_MISSING|missing_identity/i.test(x)) ||
    ctx.keyAbsent === true
  ) {
    /* keyAbsent is Ark Key — not identity plate */
  }
  if (missing.some((x) => /identity|定妆|IMG-CREF|CREF_MISSING|missing_identity/i.test(x))) {
    return [
      {
        classId: CLASS_ID,
        layer: "design_exit",
        code: "missing_identity",
        message: "缺定妆身份板 — 入队补资产并继续可拍治愈",
        debtKind: "design",
      },
    ];
  }
  return [];
}

export function heal(): UntilClearHealPatch {
  return {
    actuators: ["enqueue_identity", "soft_env_ref", "regen_storyboard_hq"],
    primaryNextStep: "batch_still",
    ctaLabel: "补定妆并继续生成",
  };
}

export function reassert(ctx: UntilClearHandlerCtx): boolean {
  return detect(ctx).length === 0;
}
