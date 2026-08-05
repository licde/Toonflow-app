/**
 * Soft CTA single surface — BE shootableArchitecture is authority;
 * FE docs stillQuality labels must not invent a second policy.
 */
export {
  resolveStillPrimaryCtaLabel,
  resolveStillDualSurface,
  looksLikeStillIrSoup,
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
  oneClickRepairKind?: string | null;
  composeSources?: string[] | null;
  ssotSealed?: boolean | null;
  debtKind?: string | null;
  keyOptional?: boolean;
  pixelDimStatus?: string | null;
  [k: string]: unknown;
}): {
  ctaLabel: string;
  adviseSmartRepair: boolean;
  requireFixBeforeBurn: boolean;
  ctaKind: "design_refine" | "realization_soft" | "regen" | "one_click_heal" | "other";
  blocksGenerate: false;
} {
  const ock = String(meta.oneClickRepairKind ?? "");
  if (ock && ock !== "none" && ock !== "confirm_required") {
    return {
      ctaLabel:
        ock === "split" || ock === "shotSize_and_split"
          ? "一键智拆并生成"
          : ock === "shotSize"
            ? "一键改景别并生成"
            : "一键智能修复",
      adviseSmartRepair: true,
      requireFixBeforeBurn: false,
      ctaKind: "one_click_heal",
      blocksGenerate: false,
    };
  }
  const sealed =
    meta.ssotSealed === true ||
    Boolean(String(meta.stillPhase ?? "").trim()) ||
    (meta.composeSources ?? []).some((s) => /ff\.ssot_only_egress|ssot\.phase/.test(String(s)));
  const realization =
    meta.realizationDegraded === true ||
    /实现已降级|跪|realization|prop_plate|plate_geometry|contamination/i.test(
      String(meta.realizationNote ?? meta.ctaLabel ?? meta.debtKind ?? meta.contaminationClass ?? ""),
    );
  const designDebt =
    !sealed &&
    (meta.designDebt === true ||
      (Array.isArray(meta.missingSlots) && meta.missingSlots.length > 0) ||
      /设计|补VD|IntentGraph|文学细节/i.test(String(meta.literaryCtaLabel ?? meta.ctaLabel ?? "")));

  if (designDebt && !realization) {
    return {
      ctaLabel: String(meta.literaryCtaLabel ?? meta.ctaLabel ?? "设计细化后重生成"),
      adviseSmartRepair: true,
      requireFixBeforeBurn: false,
      ctaKind: "design_refine",
      blocksGenerate: false,
    };
  }
  if (realization || (sealed && (meta.keyOptional || meta.pixelDimStatus === "unmeasured"))) {
    return {
      ctaLabel: String(
        meta.realizationNote ??
          meta.ctaLabel ??
          (sealed ? "减冲突增强后重出（设计已密封）" : "实现已降级（可烧）；词侧已对齐设计，可继续生成或人审"),
      ),
      adviseSmartRepair: true,
      requireFixBeforeBurn: false,
      ctaKind: "realization_soft",
      blocksGenerate: false,
    };
  }
  try {
    const { resolveStillPrimaryCta } =
      require("../../ruleEngine/design/shootableArchitecture") as typeof import("../../ruleEngine/design/shootableArchitecture");
    const be = resolveStillPrimaryCta(meta as never);
    if (be?.label) {
      return {
        ctaLabel: String(be.label),
        adviseSmartRepair: true,
        requireFixBeforeBurn: false,
        ctaKind:
          be.kind === "realization_soft"
            ? "realization_soft"
            : be.kind === "one_click_heal"
              ? "one_click_heal"
              : be.kind === "enhance_and_generate"
                ? "design_refine"
                : "other",
        blocksGenerate: false,
      };
    }
  } catch {
    /* fall through */
  }
  return {
    ctaLabel: String(meta.ctaLabel ?? "智能修复"),
    adviseSmartRepair: true,
    requireFixBeforeBurn: false,
    ctaKind: "other",
    blocksGenerate: false,
  };
}
