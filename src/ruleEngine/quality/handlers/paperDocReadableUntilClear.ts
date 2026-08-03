/**
 * PAPER_DOC_READABLE — paper/doc must be visible and readable enough, not blank blur.
 * Detects via contact OR non-contact paper_doc intent (pickup/hold).
 */
import { resolvePaperDocIntent } from "../../compilers/propFormDoctrine";
import type { UntilClearFinding, UntilClearHealPatch, UntilClearHandlerCtx } from "../untilClearRuntime";

export const CLASS_ID = "PAPER_DOC_READABLE";

export function detect(ctx: UntilClearHandlerCtx): UntilClearFinding[] {
  const vd = String(ctx.visualDescription ?? "");
  const paper = resolvePaperDocIntent(vd);
  if (!paper.isPaperDoc) return [];
  const findings: UntilClearFinding[] = [];
  const items = ctx.fidelityItems ?? [];
  const missPixel = items.some((i) => !i.pass && /prop_readable|paper|doc|glyph/i.test(`${i.id}${i.fixHint ?? ""}`));
  const missCoverage = (ctx.descCoverageMissing ?? []).some((m) => /paper|doc|glyph|字迹|休书|纸面/i.test(m));
  const egressWeak =
    Boolean(ctx.visualDescription) &&
    /字迹|可读|纸面|休书|婚书/.test(vd) &&
    items.length > 0 &&
    items.every((i) => i.pass !== false) === false;
  if (missPixel || missCoverage || egressWeak) {
    findings.push({
      classId: CLASS_ID,
      layer: missPixel ? "L1_pixel" : "L0_prompt",
      code: "paper_doc_unreadable",
      message: paper.viaContact
        ? "纸契不可读/糊成空白纸"
        : "文书纸面不可读或未入画（非仅接触镜）",
      debtKind: missPixel ? "pixel" : "compose",
    });
  }
  return findings;
}

export function heal(): UntilClearHealPatch {
  return {
    actuators: ["fidelity_edit", "regen_storyboard_hq"],
    injectLines: ["纸面可见墨迹，薄笺展开可读，形态为薄片笺面非卷轴厚本"],
    primaryNextStep: "batch_still",
    ctaLabel: "重出HQ静照（纸契可读）",
  };
}

export function reassert(ctx: UntilClearHandlerCtx): boolean {
  return detect(ctx).length === 0;
}
