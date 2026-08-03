/**
 * SECONDARY_DOMINANCE untilClear — full secondary face/figure when bg_fragment declared.
 * Heal = re-hang fragment leads + compose_regen/forceFull; NEVER「补次角定妆」。
 */
import type { UntilClearFinding, UntilClearHealPatch, UntilClearHandlerCtx } from "../untilClearRuntime";

export const CLASS_ID = "SECONDARY_DOMINANCE";

export function detect(ctx: UntilClearHandlerCtx): UntilClearFinding[] {
  const vd = String(ctx.visualDescription ?? "");
  let fragment = /裙摆|衣角/.test(vd) && /虚化|背景|碎片|浅景深/.test(vd);
  try {
    const { resolveBgFragment } =
      require("../../compilers/stillFirstFrameLiterarySsot") as typeof import("../../compilers/stillFirstFrameLiterarySsot");
    fragment = fragment || resolveBgFragment({ visualDescription: vd }).stripFullSecondary;
  } catch {
    /* keep heuristic */
  }
  if (!fragment) return [];

  const findings: UntilClearFinding[] = [];
  const items = ctx.fidelityItems ?? [];
  const miss =
    items.some((i) => !i.pass && /secondary|dominance|完整立像|次角正脸|双人抢戏/i.test(`${i.id}${i.fixHint ?? ""}`)) ||
    (ctx.descCoverageMissing ?? []).some((m) => /secondary|完整立像|次角/i.test(m)) ||
    Boolean(
      (ctx as { roleScopeEvidence?: { dualFaceSuspected?: boolean } }).roleScopeEvidence?.dualFaceSuspected,
    ) ||
    (ctx.poseEvidence?.secondaryPose === "standing" && /弯腰|捡|裙摆/.test(vd));

  if (miss) {
    findings.push({
      classId: CLASS_ID,
      layer: "L0_prompt",
      code: "secondary_dominance",
      message: "次角完整立像/正脸抢戏（声明应为裙摆碎片）",
      debtKind: "compose",
    });
  }
  return findings;
}

export function heal(_ctx: UntilClearHandlerCtx, _findings: UntilClearFinding[]): UntilClearHealPatch {
  return {
    actuators: ["compose_regen", "prompt_inject", "regen_storyboard_hq"],
    injectLines: [
      "背景仅次角裙摆/衣角碎片虚化浅景深",
      "禁止次角完整正脸或立像抢戏",
    ],
    primaryNextStep: "batch_still",
    ctaLabel: "重出碎片背景静帧",
    forceFull: true,
  };
}

export function reassert(ctx: UntilClearHandlerCtx): boolean {
  return detect(ctx).length === 0;
}
