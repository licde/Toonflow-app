/**
 * ACTION_MISFIRE untilClear — occupancy miss (desk≠pickup, kneel≠bend), grip miss.
 * Intent debt may remain when realizationDegraded && trunkOk — does not brick burn.
 */
import type { UntilClearFinding, UntilClearHealPatch, UntilClearHandlerCtx } from "../untilClearRuntime";

export const CLASS_ID = "ACTION_MISFIRE";

type CtxExt = UntilClearHandlerCtx & {
  localPoseSignals?: {
    holdCardSuspected?: boolean;
    groundPropSuspected?: boolean;
  };
  realizationDegraded?: boolean | null;
  literaryEffectsQualified?: boolean | null;
  realizationOccupancy?: string | null;
};

export function detect(ctx: UntilClearHandlerCtx): UntilClearFinding[] {
  const x = ctx as CtxExt;
  const vd = String(ctx.visualDescription ?? "");
  if (!/弯腰|捡|捏紧|指节|俯身/.test(vd)) return [];
  const findings: UntilClearFinding[] = [];
  const items = ctx.fidelityItems ?? [];
  const missPrompt =
    items.some(
      (i) =>
        !i.pass &&
        !/unmeasured|vlm_infra_unmeasured/i.test(String((i as { evidence?: string }).evidence ?? "")) &&
        /action|pickup|grip|role_action|occupancy|捡|捏/i.test(`${i.id}${i.fixHint ?? ""}`),
    ) || (ctx.descCoverageMissing ?? []).some((m) => /捡|捏|弯腰|action|occupancy/i.test(m));
  const pose = String(ctx.poseEvidence?.primaryPose ?? "");
  const poseBad =
    pose === "upright_desk" ||
    pose === "lean_table" ||
    pose === "kneel_hold" ||
    pose === "desk_lean";
  const wantsBend = /弯腰|捡起|俯身/.test(vd);
  const localHold =
    x.localPoseSignals?.holdCardSuspected === true && x.localPoseSignals?.groundPropSuspected !== true;
  const degradedTrunkOk =
    x.realizationDegraded === true && x.literaryEffectsQualified === true;
  if (missPrompt || (wantsBend && poseBad) || (wantsBend && localHold)) {
    if (degradedTrunkOk) {
      findings.push({
        classId: CLASS_ID,
        layer: "L0_prompt",
        code: "action_misfire_intent_debt",
        message: "实现已降级记账（意图仍为弯腰；不挡主干烧片）",
        debtKind: "compose",
      });
    } else {
      findings.push({
        classId: CLASS_ID,
        layer: "L0_prompt",
        code: "action_misfire",
        message: "动作占位错位（弯腰捡未实现或被桌靠/跪坐替代）",
        debtKind: "compose",
      });
    }
  }
  if ((ctx.healBudgetRemaining ?? 1) <= 0 && findings.some((f) => f.code === "action_misfire")) {
    findings.push({
      classId: CLASS_ID,
      layer: "burn_meta",
      code: "action_misfire_budget",
      message: "动作错位修复预算耗尽，draft 继续修复",
      debtKind: "compose",
    });
  }
  return findings;
}

export function heal(ctx: UntilClearHandlerCtx, _findings: UntilClearFinding[]): UntilClearHealPatch {
  const x = ctx as CtxExt;
  if (x.realizationDegraded === true && x.literaryEffectsQualified === true) {
    return {
      actuators: ["soft_cta"],
      primaryNextStep: "batch_still",
      ctaLabel: "实现已降级·可烧主干",
    };
  }
  const budget = ctx.healBudgetRemaining ?? 2;
  if (budget <= 0) {
    return {
      actuators: ["soft_cta"],
      primaryNextStep: "batch_still",
      ctaLabel: "继续修复动作主导",
    };
  }
  return {
    actuators: ["compose_regen", "prompt_inject", "regen_storyboard_hq"],
    injectLines: [
      "占位：弯腰捡拾，躯干前倾，纸在主手，指尖捏紧指节泛白",
      "握持：道具在主手同框入画",
    ],
    primaryNextStep: "batch_still",
    ctaLabel: "重出动作主导静帧",
    forceFull: true,
  };
}

export function reassert(ctx: UntilClearHandlerCtx): boolean {
  const x = ctx as CtxExt;
  // Trunk burn clear when realization degraded honestly and literary trunk passed
  if (x.realizationDegraded === true && x.literaryEffectsQualified === true) return true;
  return detect(ctx).filter((f) => f.code === "action_misfire" || f.code === "action_misfire_budget")
    .length === 0;
}
