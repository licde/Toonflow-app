/**
 * BG_READABLE untilClear handler — L0 bgGuidance/softEnv + L1 background_readable.
 */
import type { UntilClearFinding, UntilClearHealPatch, UntilClearHandlerCtx } from "../untilClearRuntime";

export const CLASS_ID = "BG_READABLE";

export function detect(ctx: UntilClearHandlerCtx): UntilClearFinding[] {
  const out: UntilClearFinding[] = [];
  const items = ctx.fidelityItems ?? [];
  const bgFail = items.find((i) => !i.pass && /background_readable|identity:background/i.test(i.id));
  if (bgFail) {
    out.push({
      classId: CLASS_ID,
      layer: "L1_pixel",
      code: bgFail.id,
      message: bgFail.fixHint ?? "背景不可读/灰棚",
      debtKind: "pixel",
    });
  }
  if (ctx.bgMode === "atmosphere_only" && ctx.hasSceneLink && !ctx.keepSoftEnvRef) {
    out.push({
      classId: CLASS_ID,
      layer: "L0_prompt",
      code: "soft_env_missing",
      message: "有场景连线但无软环境板",
      debtKind: "compose",
    });
  }
  // keepSoftEnvRef but softEnv role/bytes absent — closed-loop debt (挂板≠像素)
  if (
    ctx.keepSoftEnvRef === true &&
    (ctx.softEnvPlatePresent === false ||
      ctx.softEnvMissingHonest === true ||
      (Array.isArray(ctx.refsRoles) && !ctx.refsRoles.includes("softEnv")))
  ) {
    out.push({
      classId: CLASS_ID,
      layer: "L0_prompt",
      code: "keep_soft_no_plate",
      message: "keepSoftEnvRef 但无 softEnv 板字节",
      debtKind: "compose",
    });
  }
  const missing = ctx.descCoverageMissing ?? [];
  if (missing.some((m) => /background|bg|禁灰棚|室内轮廓/.test(m))) {
    out.push({
      classId: CLASS_ID,
      layer: "L0_prompt",
      code: "bg_l0_missing",
      message: "L0 背景可读约束未覆盖",
      debtKind: "coverage",
    });
  }
  return out;
}

export function heal(ctx: UntilClearHandlerCtx, findings: UntilClearFinding[]): UntilClearHealPatch {
  const patch: UntilClearHealPatch = { actuators: [], injectLines: [] };
  for (const f of findings) {
    if (f.layer === "L0_prompt") {
      patch.actuators.push("prompt_inject");
      if (!patch.injectLines?.some((l) => /禁灰棚|室内轮廓/.test(l))) {
        patch.injectLines!.push(
          "背景弱化：浅景深虚化环境，保留室内轮廓可辨（墙面/木作/烛光），禁止灰棚/纯色摄影棚空白背景",
        );
      }
      if (ctx.hasSceneLink || ctx.keepSoftEnvRef || f.code === "keep_soft_no_plate") {
        patch.actuators.push("soft_env_ref");
      }
    }
    if (f.layer === "L1_pixel") {
      patch.actuators.push("fidelity_edit");
      if ((ctx.healBudgetRemaining ?? 0) > 0) patch.actuators.push("regen_storyboard_hq");
    }
  }
  return patch;
}

export function reassert(ctx: UntilClearHandlerCtx): boolean {
  return detect(ctx).length === 0;
}
