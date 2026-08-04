/**
 * Soft CTA single surface — BE shootableArchitecture is authority;
 * FE docs stillQuality labels must not invent a second policy.
 */
export {
  resolveStillPrimaryCtaLabel,
  shouldBlockSilentStillRegen,
  type StillMeta,
} from "../../../docs/toonflow-web/types/stillQuality";

export { resolveStillPrimaryCta } from "../../ruleEngine/design/shootableArchitecture";

/** Unified soft CTA: design debt → 设计细化; realization → soft note; never VENDOR. */
export function resolveStillSoftCta(meta: {
  contaminationClass?: string | null;
  requireFixBeforeBurn?: boolean;
  stillPhase?: string | null;
  primaryNextStep?: string | null;
  ctaLabel?: string | null;
  literaryCtaLabel?: string | null;
  realizationDegraded?: boolean | null;
  realizationNote?: string | null;
  designDebt?: boolean | null;
  missingSlots?: string[] | null;
  [k: string]: unknown;
}): {
  ctaLabel: string;
  adviseSmartRepair: boolean;
  requireFixBeforeBurn: boolean;
  ctaKind: "design_refine" | "realization_soft" | "regen" | "other";
} {
  const realization =
    meta.realizationDegraded === true ||
    /实现已降级|跪|realization/i.test(String(meta.realizationNote ?? meta.ctaLabel ?? ""));
  const designDebt =
    meta.designDebt === true ||
    (Array.isArray(meta.missingSlots) && meta.missingSlots.length > 0) ||
    /设计|补VD|IntentGraph|文学细节/i.test(String(meta.literaryCtaLabel ?? meta.ctaLabel ?? ""));

  if (designDebt && !realization) {
    return {
      ctaLabel: String(meta.literaryCtaLabel ?? meta.ctaLabel ?? "设计细化后重生成"),
      adviseSmartRepair: true,
      requireFixBeforeBurn: false,
      ctaKind: "design_refine",
    };
  }
  if (realization) {
    return {
      ctaLabel: String(
        meta.realizationNote ?? meta.ctaLabel ?? "实现已降级（可烧）；词侧已对齐设计，可继续生成或人审",
      ),
      adviseSmartRepair: true,
      requireFixBeforeBurn: false,
      ctaKind: "realization_soft",
    };
  }
  try {
    const { resolveStillPrimaryCta } =
      require("../../ruleEngine/design/shootableArchitecture") as typeof import("../../ruleEngine/design/shootableArchitecture");
    const be = resolveStillPrimaryCta(meta as never);
    if (be?.ctaLabel) {
      return {
        ctaLabel: String(be.ctaLabel),
        adviseSmartRepair: true,
        requireFixBeforeBurn: Boolean(be.requireFixBeforeBurn) && Boolean(meta.requireFixBeforeBurn),
        ctaKind: "other",
      };
    }
  } catch {
    /* fall through */
  }
  try {
    const { resolveStillPrimaryCtaLabel } =
      require("../../../docs/toonflow-web/types/stillQuality") as typeof import("../../../docs/toonflow-web/types/stillQuality");
    const label = resolveStillPrimaryCtaLabel(meta as never);
    return {
      ctaLabel: label || String(meta.ctaLabel ?? meta.literaryCtaLabel ?? "智能修复"),
      adviseSmartRepair: true,
      requireFixBeforeBurn: false,
      ctaKind: "regen",
    };
  } catch {
    return {
      ctaLabel: String(meta.ctaLabel ?? "智能修复"),
      adviseSmartRepair: true,
      requireFixBeforeBurn: false,
      ctaKind: "other",
    };
  }
}
