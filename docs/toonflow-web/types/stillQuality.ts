/**
 * Still quality / burn-ready contract for Toonflow-web FE.
 * Copy alongside STILL_INTENT_OPS_CONTRACT.md — keep/upload must not forge HQ.
 */

/** Persisted on o_storyboard.reason (and API responses) */
export type StillQuality = "missing" | "weak" | "hq_ok" | "stale_inherited";

export interface StillMeta {
  stillQuality?: StillQuality;
  visualPass?: boolean;
  visualPassAt?: string;
  /** Collage / turnaround sheet leak from VLM — burn must treat as weak */
  sheetLeak?: boolean;
  burnReady?: boolean;
  /** Preview / compose-only — never true until L1 visualPass */
  pixelHq?: boolean;
  pendingHumanRejudge?: boolean;
  fidelityStopReason?: string;
  vlmError?: string;
  primaryNextStep?: string;
  ctaLabel?: string;
  userMessage?: string;
  rePushPlan?: unknown[];
  literaryDescHash?: string;
  videoStale?: boolean;
  /** IRD primary when design debt (LIT/PROP) — prefer enhance/hand_edit over batch_still */
  irdPrimaryAction?:
    | "apply_auto"
    | "apply_auto_enhance"
    | "confirm_split"
    | "confirm_enhance"
    | "hand_edit_vd"
    | "batch_still_hq"
    | "none"
    | string;
  /** Structure slots still missing from diagnose/detect — FE chips */
  missingSlots?: string[];
  /** generateFlowImage ops echo — faceCu dropped SCENE refs */
  sceneRefsDropped?: number;
  excludeScene?: boolean;
  bgPolicy?: string;
  bgPolicyReason?: string;
  settingsDeepLink?: string;
  /** Key optional — absent ⇒ unmeasured, not must-configure */
  keyOptional?: boolean;
  /** unmeasured | measured_fail | measured_pass */
  pixelDimStatus?: "unmeasured" | "measured_fail" | "measured_pass" | string;
  /** BE hint: FE must not silent re-POST generate */
  blockSilentRegen?: boolean;
  /** After split_shot: reload panels before generating children */
  refreshStoryboardBeforeRegen?: boolean;
}

/**
 * FE: storyboard.state「已完成」≠ stillQuality hq_ok.
 * burnReady only when hq_ok && visualPass && !sheetLeak.
 */
export function deriveBurnReady(meta: StillMeta | null | undefined): boolean {
  if (!meta) return false;
  if (meta.sheetLeak) return false;
  if (meta.stillQuality !== "hq_ok") return false;
  if (meta.visualPass !== true) return false;
  return true;
}

export function stillQualityBadgeLabel(meta: StillMeta | null | undefined): string {
  if (!meta) return "缺静照";
  if (meta.sheetLeak) return "拼版弱图";
  if (meta.stillQuality === "hq_ok" && meta.visualPass) return "可燃片";
  if (meta.pixelDimStatus === "unmeasured" || meta.keyOptional) {
    if (meta.stillQuality === "weak" || meta.pendingHumanRejudge) return "未测·弱图";
  }
  if (meta.stillQuality === "weak" || meta.pendingHumanRejudge) return "弱图不可作视频首帧";
  if (meta.stillQuality === "missing") return "缺静照";
  return "待验收";
}

/** BE I5 homology: sheetLeak / single_frame collage → CTA「禁拼版重抽」(≠ generic HQ regen). */
export function isSheetLeakSignal(meta: StillMeta | null | undefined): boolean {
  if (!meta) return false;
  if (meta.sheetLeak === true) return true;
  const blob = `${meta.ctaLabel ?? ""} ${meta.userMessage ?? ""} ${meta.fidelityStopReason ?? ""}`;
  return /sheetLeak|拼版|四视|四宫格|禁拼版/i.test(blob);
}

/** Prefer BE ctaLabel when already「禁拼版*」; else force sheet-leak CTA (never「更新高质量分镜图」alone). */
export function sheetLeakCtaLabel(meta: StillMeta | null | undefined): string {
  const be = String(meta?.ctaLabel ?? "").trim();
  if (/禁拼版/.test(be)) return be;
  return "禁拼版重抽";
}

/** Resolve primary still-repair CTA: sheetLeak wins over generic HQ / batch_still. */
export function resolveStillRepairCtaLabel(meta: StillMeta | null | undefined): string {
  if (isSheetLeakSignal(meta)) return sheetLeakCtaLabel(meta);
  const be = String(meta?.ctaLabel ?? "").trim();
  if (be) return be;
  const step = String(meta?.primaryNextStep ?? "");
  if (step === "split_shot") return "确认智能拆镜";
  if (step === "chat_repair") return "复制给 Chat";
  if (step === "batch_still") return "去生成静照";
  return "更新高质量分镜图";
}

/** Key optional: primary CTA when pendingHumanRejudge without VLM Key */
export function humanRejudgePrimaryCta(meta: StillMeta | null | undefined): string {
  if (meta?.pendingHumanRejudge || meta?.pixelDimStatus === "unmeasured" || meta?.keyOptional) {
    return "人审通过（未测·非失败）";
  }
  return "人审通过";
}

/** Show human rejudge entry when Key absent or unmeasured — valid delivery path */
export function shouldOfferHumanRejudge(meta: StillMeta | null | undefined): boolean {
  if (!meta) return false;
  if (meta.pendingHumanRejudge === true) return true;
  if (meta.keyOptional === true) return true;
  if (meta.pixelDimStatus === "unmeasured") return true;
  if (meta.stillQuality === "weak" && Boolean(meta.vlmError)) return true;
  return false;
}

/**
 * Prefer BE `blockSilentRegen` when present; else derive from nextStep / slots.
 */
export function shouldBlockSilentStillRegen(meta: StillMeta | null | undefined): boolean {
  if (!meta) return false;
  if (meta.blockSilentRegen === true) return true;
  const step = String(meta?.primaryNextStep ?? "");
  if (!step) return false;
  return (
    step === "split_shot" ||
    step === "chat_repair" ||
    step === "human_review" ||
    meta?.irdPrimaryAction === "confirm_split" ||
    meta?.irdPrimaryAction === "confirm_enhance" ||
    meta?.irdPrimaryAction === "hand_edit_vd" ||
    (meta?.missingSlots?.length ?? 0) > 0 ||
    Boolean(meta?.vlmError && /VLM_API_KEY|api\s*key/i.test(meta.vlmError)) ||
    meta?.pixelDimStatus === "unmeasured" ||
    meta?.pixelDimStatus === "measured_fail"
  );
}

/** After split_shot success: FE must reload panels before generating child shots. */
export function requiresStoryboardRefreshBeforeRegen(meta: StillMeta | null | undefined): boolean {
  if (meta?.refreshStoryboardBeforeRegen === true) return true;
  return (
    String(meta?.primaryNextStep ?? "") === "split_shot" ||
    meta?.irdPrimaryAction === "confirm_split"
  );
}

/** Canvas banner when faceCu dropped SCENE refs */
export function faceCuRefsEchoLabel(meta: StillMeta | null | undefined): string | null {
  if (!meta?.excludeScene) return null;
  const n = meta.sceneRefsDropped ?? 0;
  if (n > 0) return `特写已丢 ${n} 张场景参考，仅用身份板`;
  return "特写已排除场景参考，仅用身份板";
}

/** Preflight homology: prefer passed over stale failed for same rule id */
export type PreflightDetectionRow = {
  id?: string;
  ruleId?: string;
  severity?: string;
  passed?: boolean;
  message?: string;
};

/**
 * FE runPreflight merge: never toast a BLOCK that a later/passed row cleared.
 * Order: production detectionResults then touch issues; same id → passed wins.
 */
export function mergePreflightBlocksForToast(
  prodRows: PreflightDetectionRow[],
  touchIssues: PreflightDetectionRow[],
): PreflightDetectionRow[] {
  const byId = new Map<string, PreflightDetectionRow>();
  const keyOf = (r: PreflightDetectionRow) => String(r.id || r.ruleId || "");
  for (const r of [...prodRows, ...touchIssues]) {
    const k = keyOf(r);
    if (!k) continue;
    const prev = byId.get(k);
    if (!prev) {
      byId.set(k, r);
      continue;
    }
    const prevFail = prev.passed === false || String(prev.severity).toUpperCase() === "BLOCK";
    const nextPass = r.passed === true || String(r.severity).toUpperCase() !== "BLOCK";
    if (prevFail && nextPass) byId.set(k, r);
    else if (!prevFail && r.passed === false) {
      /* keep cleared */
    } else byId.set(k, r);
  }
  return [...byId.values()].filter(
    (r) => r.passed === false || String(r.severity).toUpperCase() === "BLOCK",
  );
}

/** Homology class: after BE until-clear these must not appear as hard toast */
export const HOMOLOGY_CLEAR_RULE_IDS = new Set([
  "DC-01-EXTRA",
  "DC-01",
  "H3",
  "R2",
  "FX-GRADE-01",
  "DG-FALSE-GREEN-FX",
]);
