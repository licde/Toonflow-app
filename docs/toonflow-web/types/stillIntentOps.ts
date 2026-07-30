/**
 * stillIntentOps / IRD FE contract — mirror BE stillIntentReverse + STILL_INTENT_OPS_CONTRACT.md.
 * Prefer enhance / hand_edit_vd + missingSlots over sole batch_still when LIT/PROP debt is open.
 */

export type IrdPrimaryAction =
  | "apply_auto"
  | "apply_auto_enhance"
  | "confirm_split"
  | "confirm_enhance"
  | "hand_edit_vd"
  | "batch_still_hq"
  | "presentation_fork"
  | "none";

export type IrdFinding = {
  id: string;
  severity: "BLOCK" | "WARN";
  message: string;
  breakAt?: string;
  /** Structure slots still missing (contactStruct / grip / contactRoleXor…) — declare-only */
  missingSlots?: string[];
};

export type IrdDiagnoseResponse = {
  ok: boolean;
  findings: IrdFinding[];
  primaryAction: IrdPrimaryAction;
  confirmRequired?: boolean;
  patches?: unknown[];
  /** Flattened from BLOCK LIT/PROP findings for CTA chips */
  missingSlots?: string[];
  /** Prefer enhance/hand_edit naming slots; never sole「重出静照」 */
  ctaLabel?: string;
  a11yAnnounce?: string;
  /** Med-confidence: FE must pick fork before empty hand_edit */
  presentationFork?: { fork: string; label: string }[];
};

export type LitFillSuggestion = {
  shotIndex: number;
  append: string;
  missingSlots?: string[];
  reason?: string;
  confidence?: number;
};

export type SuggestFillResponse = {
  enabled: boolean;
  refuse?: string;
  suggestions: LitFillSuggestion[];
  autoMin?: number;
};

/** Prefer FE CTA: enhance or hand-edit VD naming slots; never collapse to only「重出静照」. */
export function irdCtaLabel(input: {
  primaryAction?: IrdPrimaryAction | string | null;
  missingSlots?: string[] | null;
  /** SheetLeak / collage →「禁拼版重抽」(homology BE I5); wins over「重出HQ静照」. */
  sheetLeak?: boolean | null;
  ctaLabel?: string | null;
  userMessage?: string | null;
}): string {
  const slots = (input.missingSlots ?? []).filter(Boolean);
  if (slots.includes("propInFrame") || slots.includes("contactGeom")) {
    if (input.primaryAction === "confirm_enhance" || input.primaryAction === "apply_auto_enhance") {
      return `批准增强补${slots.slice(0, 3).join("/")}`;
    }
    if (input.primaryAction === "batch_still_hq" || /重出|静照/.test(String(input.ctaLabel ?? ""))) {
      return "重出带道具静照";
    }
    return `手改VD补${slots.slice(0, 3).join("/")}`;
  }
  if (input.primaryAction === "confirm_enhance") {
    return slots.length ? `批准增强补${slots.slice(0, 3).join("/")}` : "批准增强";
  }
  if (input.primaryAction === "apply_auto_enhance") {
    return slots.length ? `自动增强补${slots.slice(0, 3).join("/")}` : "自动增强";
  }
  if (input.primaryAction === "hand_edit_vd" || slots.length) {
    return slots.length ? `手改VD补${slots.slice(0, 3).join("/")}` : "手改VD";
  }
  if (input.primaryAction === "confirm_split" || input.primaryAction === "apply_auto") {
    return "确认拆镜";
  }
  if (input.primaryAction === "batch_still_hq") {
    const be = String(input.ctaLabel ?? "").trim();
    const blob = `${be} ${input.userMessage ?? ""}`;
    if (input.sheetLeak === true || /sheetLeak|拼版|四视|四宫格|禁拼版/i.test(blob)) {
      return /禁拼版/.test(be) ? be : "禁拼版重抽";
    }
    return "重出HQ静照";
  }
  return "查看诊断";
}

export function flattenMissingSlots(findings: IrdFinding[] | null | undefined): string[] {
  const out = new Set<string>();
  for (const f of findings ?? []) {
    if (f.severity !== "BLOCK") continue;
    for (const s of f.missingSlots ?? []) {
      if (s) out.add(String(s));
    }
  }
  return [...out];
}

export function isEnhanceAction(action?: string | null): boolean {
  return action === "confirm_enhance" || action === "apply_auto_enhance";
}

export function isSplitAction(action?: string | null): boolean {
  return action === "confirm_split" || action === "apply_auto";
}

export function isLitDebtStillMeta(meta: {
  primaryNextStep?: string | null;
  irdPrimaryAction?: string | null;
  missingSlots?: string[] | null;
  ctaLabel?: string | null;
} | null | undefined): boolean {
  if (!meta) return false;
  if ((meta.missingSlots?.length ?? 0) > 0) return true;
  if (
    meta.irdPrimaryAction === "hand_edit_vd" ||
    isEnhanceAction(meta.irdPrimaryAction) ||
    isSplitAction(meta.irdPrimaryAction)
  ) {
    return true;
  }
  if (
    meta.primaryNextStep === "chat_repair" &&
    /手改|VD|描写|缺槽|增强|互斥/i.test(String(meta.ctaLabel ?? ""))
  ) {
    return true;
  }
  return false;
}
