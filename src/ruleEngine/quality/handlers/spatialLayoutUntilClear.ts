/**
 * SPATIAL_LAYOUT untilClear handler — minimal pose evidence + CTA.
 * bg_fragment / skirt_blur: do NOT expectStand secondary (doctrine: fragment > full-figure).
 */
import type { UntilClearFinding, UntilClearHealPatch, UntilClearHandlerCtx } from "../untilClearRuntime";

export const CLASS_ID = "SPATIAL_LAYOUT";

function isBgFragment(ctx: UntilClearHandlerCtx): boolean {
  const vd = String(ctx.visualDescription ?? "");
  if (/裙摆|衣角|袖缘|袍角/.test(vd) && /虚化|背景|浅景深|碎片/.test(vd)) return true;
  try {
    const { resolveBgFragment } =
      require("../../compilers/stillFirstFrameLiterarySsot") as typeof import("../../compilers/stillFirstFrameLiterarySsot");
    return resolveBgFragment({ visualDescription: vd }).stripFullSecondary;
  } catch {
    return false;
  }
}

export function detect(ctx: UntilClearHandlerCtx): UntilClearFinding[] {
  const vd = String(ctx.visualDescription ?? "");
  const findings: UntilClearFinding[] = [];
  const expectKneel = /跪|跪坐|蒲团/.test(vd);
  const fragment = isBgFragment(ctx);
  const expectStand = !fragment && /站立|站于|高位/.test(vd);
  const evidence = ctx.poseEvidence ?? {};
  if (expectKneel && evidence.primaryPose && evidence.primaryPose !== "kneeling_or_seated") {
    findings.push({
      classId: CLASS_ID,
      layer: "L1_pixel",
      code: "pose_primary_not_kneel",
      message: "主角跪坐/坐姿与像素不符",
      debtKind: "pixel",
    });
  }
  if (expectStand && evidence.secondaryPose && evidence.secondaryPose !== "standing") {
    findings.push({
      classId: CLASS_ID,
      layer: "L1_pixel",
      code: "pose_secondary_not_stand",
      message: "次角色站立与像素不符",
      debtKind: "pixel",
    });
  }
  if ((expectKneel || expectStand) && !evidence.primaryPose && !evidence.secondaryPose) {
    findings.push({
      classId: CLASS_ID,
      layer: "L0_prompt",
      code: "pose_evidence_missing",
      message: "站位/姿态证据未写回",
      debtKind: "coverage",
    });
  }
  return findings;
}

export function heal(_ctx: UntilClearHandlerCtx, findings: UntilClearFinding[]): UntilClearHealPatch {
  const pixelFail = findings.some((f) => f.layer === "L1_pixel");
  return {
    actuators: pixelFail ? ["fidelity_edit", "regen_storyboard_hq"] : ["prompt_inject"],
    primaryNextStep: pixelFail ? "batch_still" : "chat_repair",
    ctaLabel: pixelFail ? "重出HQ静照（站位姿态）" : "手改VD补站位",
  };
}

export function reassert(ctx: UntilClearHandlerCtx): boolean {
  return detect(ctx).length === 0;
}
