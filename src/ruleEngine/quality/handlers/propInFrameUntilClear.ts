/**
 * PROP_IN_FRAME — required prop must appear in frame and stay coupled to the contact event.
 */
import { matchContactEventVd } from "../../compilers/contactEventPolicy";
import type { UntilClearFinding, UntilClearHealPatch, UntilClearHandlerCtx } from "../untilClearRuntime";

export const CLASS_ID = "PROP_IN_FRAME";

export function detect(ctx: UntilClearHandlerCtx): UntilClearFinding[] {
  const vd = String(ctx.visualDescription ?? "");
  const m = matchContactEventVd(vd);
  if (!m.isContactEvent) return [];
  const items = ctx.fidelityItems ?? [];
  const findings: UntilClearFinding[] = [];
  if (items.some((i) => !i.pass && /prop:|mustProps|contact/i.test(i.id))) {
    findings.push({
      classId: CLASS_ID,
      layer: "L1_pixel",
      code: "prop_missing_in_frame",
      message: "道具缺席/仅痕迹无实体道具",
      debtKind: "pixel",
    });
  }
  return findings;
}

export function heal(): UntilClearHealPatch {
  return {
    actuators: ["prompt_inject", "fidelity_edit", "regen_storyboard_hq"],
    primaryNextStep: "batch_still",
    ctaLabel: "重出HQ静照（道具入画）",
  };
}

export function reassert(ctx: UntilClearHandlerCtx): boolean {
  return detect(ctx).length === 0;
}
