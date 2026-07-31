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
  keepSoftEnvRef?: boolean;
  bgMode?: "keep_plate" | "soft_env" | "atmosphere_only";
  bgPolicy?: string;
  bgPolicyReason?: string;
  /** Import soft ≠ design exit pass — show in DebtBar */
  importOkNotExit?: boolean;
  settingsDeepLink?: string;
  /** BE hint: FE must not silent re-POST generate */
  blockSilentRegen?: boolean;
  /** After split_shot: reload panels before generating children */
  refreshStoryboardBeforeRegen?: boolean;
  /** Key optional — absent ⇒ unmeasured, not must-configure */
  keyOptional?: boolean;
  /** unmeasured | measured_fail | measured_pass */
  pixelDimStatus?: "unmeasured" | "measured_fail" | "measured_pass" | string;
  promptLintConflicts?: string[];
  promptProvenance?: Array<{ source: string; note?: string }>;
  evidenceTtlMs?: number;
  evidenceHash?: string;
  contractVersion?: string;
  contractHash?: string;
  contactGeomEvidence?: Record<string, unknown>;
  propReadableEvidence?: Record<string, unknown>;
  poseEvidence?: Record<string, unknown>;
  roleScopeEvidence?: Record<string, unknown>;
  sceneDominanceEvidence?: Record<string, unknown>;
  i2vReady?: boolean;
  i2vBlockReason?: string;
  autoRepairStage?: string;
  autoRepairRound?: number;
  autoRepairBudgetLeft?: number;
  handoffReason?: string;
  /** Event refs echo */
  refsRoles?: string[];
  propPlateMissing?: boolean;
  synthesizedPropPlate?: boolean;
  softEnvMissingHonest?: boolean;
  softEnvBakedIntoIdentity?: boolean;
  softEnvContinuity?: "must" | "optional" | "none" | string;
  propSource?: string;
  vendorCalled?: boolean;
  vendorMs?: number;
  /** Structure form miss vs Key-unmeasured — FE must not collapse */
  debtKind?: "prop_form" | "prop_plate" | "soft_env" | "key_unmeasured" | "lit_slot" | string;
}

/** Split structure/form debt vs Key-optional unmeasured (never「要素未见=没写约束」). */
export function resolveStillDebtSemantics(meta: StillMeta | null | undefined): {
  kind: "prop_form" | "prop_plate" | "soft_env" | "key_unmeasured" | "lit_slot" | "none";
  ctaLabel: string;
  explain: string;
} {
  if (!meta) return { kind: "none", ctaLabel: "", explain: "" };
  const slots = meta.missingSlots ?? [];
  const blob = `${meta.userMessage ?? ""} ${meta.ctaLabel ?? ""} ${slots.join(" ")}`;
  if (meta.keyOptional || meta.pixelDimStatus === "unmeasured") {
    if (!slots.some((s) => /prop|contact|form|glyph|softEnv/i.test(s)) && !/卷棒|薄纸|形态|道具板/.test(blob)) {
      return {
        kind: "key_unmeasured",
        ctaLabel: humanRejudgePrimaryCta(meta),
        explain: "像素诊断 Key 未装/未测（可选）。文学与形态约束仍有效；请人审或装 Key，勿当作缺约束。",
      };
    }
  }
  if (meta.propPlateMissing || slots.some((s) => /propSoft|propPlate/i.test(s)) || /道具参考板|PROP soft/i.test(blob)) {
    return {
      kind: "prop_plate",
      ctaLabel: "挂道具板后再生成",
      explain: "接触/道具事件缺道具参考板；请挂 PROP 或允许结构合成软板。",
    };
  }
  if (/卷棒|纸卷|prop_form|形态|抵颏/.test(blob) || slots.some((s) => /prop_form|form/i.test(s))) {
    return {
      kind: "prop_form",
      ctaLabel: "重出形态静照",
      explain: "道具形态未按契约（须展开薄纸片/禁卷棒抵颏）；请重出静照，勿当作 Key 未测。",
    };
  }
  if (
    meta.softEnvMissingHonest ||
    slots.some((s) => /softEnv/i.test(s)) ||
    /SOFT-ENV-BAKE-FAILED|烘焙失败/.test(blob)
  ) {
    return {
      kind: "soft_env",
      ctaLabel: /烘焙失败|BAKE/.test(blob) ? "补场景软板后重试" : "补场景软板",
      explain: /烘焙失败|BAKE/.test(blob)
        ? "软环境为连贯性必须，但 SCENE 烘焙失败；禁止仅文案写禁止灰棚。"
        : "软环境 SCENE 板未挂上；成图易灰棚，建议补场景软板。",
    };
  }
  if (slots.length) {
    return {
      kind: "lit_slot",
      ctaLabel: resolveStillRepairCtaLabel(meta),
      explain: `缺结构槽 ${slots.join("/")}；可增强或手改 VD。`,
    };
  }
  return { kind: "none", ctaLabel: resolveStillRepairCtaLabel(meta), explain: "" };
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
  if (meta?.autoRepairStage && meta?.autoRepairStage !== "handoff_human") {
    return "自动修复中";
  }
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
 * Vendor / retry_shot / Key-optional unmeasured must NEVER brick Generate.
 * Only structural split (same-shot silent regen forbidden) hard-blocks.
 */
export function shouldBlockSilentStillRegen(meta: StillMeta | null | undefined): boolean {
  if (!meta) return false;
  const step = String(meta?.primaryNextStep ?? "");
  const autoStage = String(meta?.autoRepairStage ?? "");
  // Explicit retry / auto-repair / Key-optional paths — always allow click
  if (
    step === "retry_shot" ||
    step === "soft_patch" ||
    step === "regen_storyboard_hq" ||
    step === "batch_still" ||
    (autoStage && autoStage !== "handoff_human")
  ) {
    return false;
  }
  // Key optional: unmeasured / missing Key is NOT design debt
  if (meta.keyOptional === true || meta.pixelDimStatus === "unmeasured") {
    if (meta.irdPrimaryAction !== "confirm_split" && step !== "split_shot") return false;
  }
  // Only confirm_split / split_shot bricks silent regen on the SAME shot
  const hardSplitBrick =
    step === "split_shot" || meta?.irdPrimaryAction === "confirm_split";
  if (hardSplitBrick) return true;
  // Literary enhance / hand_edit: allow Generate (apply补全 then regen, or reverse-fill then regen)
  if (
    meta?.irdPrimaryAction === "confirm_enhance" ||
    meta?.irdPrimaryAction === "apply_auto_enhance" ||
    meta?.irdPrimaryAction === "hand_edit_vd" ||
    (meta?.missingSlots?.length ?? 0) > 0
  ) {
    return false;
  }
  if (meta.blockSilentRegen === true) {
    // Stale latch without hard split → allow retry
    return false;
  }
  return false;
}

/** After split_shot success: FE must reload panels before generating child shots. */
export function requiresStoryboardRefreshBeforeRegen(meta: StillMeta | null | undefined): boolean {
  if (meta?.refreshStoryboardBeforeRegen === true) return true;
  return (
    String(meta?.primaryNextStep ?? "") === "split_shot" ||
    meta?.irdPrimaryAction === "confirm_split"
  );
}

/** Canvas banner when faceCu dropped SCENE refs (soft_env keeps one env plate) */
export function faceCuRefsEchoLabel(meta: StillMeta | null | undefined): string | null {
  if (!meta?.excludeScene) return null;
  if (meta.keepSoftEnvRef || meta.bgMode === "soft_env") {
    const n = meta.sceneRefsDropped ?? 0;
    return n > 0
      ? `特写已降建立场景抢戏（丢 ${n}），保留软环境板`
      : "特写已降建立场景抢戏，保留软环境板";
  }
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

/** Video track: soft_deliver / qcWeak playable ≠ burn-ready first frame */
export function deriveTrackBurnAllowed(opts: {
  state?: string | null;
  burnAllowed?: boolean | null;
  qcWeak?: boolean | null;
  softDeliver?: boolean | null;
  stillMeta?: StillMeta | null;
}): boolean {
  if (opts.state === "需完善") return false;
  if (opts.burnAllowed === false) return false;
  if (opts.qcWeak === true || opts.softDeliver === true) return false;
  return deriveBurnReady(opts.stillMeta ?? null);
}

/** IMPORT_OK_NOT_EXIT must surface in DebtBar — not treated as design exit pass */
export function showImportOkNotExitBanner(meta: StillMeta | null | undefined): boolean {
  return meta?.importOkNotExit === true;
}
