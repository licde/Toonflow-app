/**
 * Practice Completeness Ladder + Key-optional quality state helpers (SSOT loaders).
 */
import { readFixtureJson } from "../utils/fixturesPath";

export type PracticeLadderStep =
  | "declare"
  | "mount"
  | "hard"
  | "untilClear"
  | "feBlock"
  | "noEscape";

export type PracticeClass = {
  id: string;
  declare: string[];
  mount: string[];
  hard: boolean;
  untilClear: boolean;
  feBlock: boolean;
  noEscape: string;
  l0Always?: boolean;
  l1WhenKey?: boolean;
};

export type PracticeInventory = {
  version?: string;
  ladder: PracticeLadderStep[];
  keyPolicy?: { required?: boolean; absent?: string; present?: string };
  classes: PracticeClass[];
};

export type QualityStateMatrix = {
  version?: string;
  stillQuality?: Record<string, { burn?: string; mapsTo?: string; requires?: string[] }>;
  pixelDims?: Record<string, { videoPass?: boolean | string; feCode?: string }>;
  forbidden?: string[];
};

const LADDER_DEFAULT: PracticeLadderStep[] = [
  "declare",
  "mount",
  "hard",
  "untilClear",
  "feBlock",
  "noEscape",
];

export function loadPracticeInventory(): PracticeInventory {
  return readFixtureJson<PracticeInventory>("practice_completeness_inventory.json", {
    ladder: LADDER_DEFAULT,
    keyPolicy: { required: false },
    classes: [],
  });
}

export function loadQualityStateMatrix(): QualityStateMatrix {
  return readFixtureJson<QualityStateMatrix>("quality_state_matrix.json", {
    forbidden: [],
  });
}

/** Key is never a product hard requirement. */
export function isVlmKeyRequired(): boolean {
  const inv = loadPracticeInventory();
  return inv.keyPolicy?.required === true;
}

/**
 * Pixel / motion dims: Key present ⇒ measured path; absent ⇒ unmeasured (not measured_fail).
 */
export function pixelDimStatus(opts: {
  keyOrAdapterPresent: boolean;
  observed?: boolean | null;
}): "unmeasured" | "measured_pass" | "measured_fail" {
  if (!opts.keyOrAdapterPresent) return "unmeasured";
  if (opts.observed == null) return "unmeasured";
  return opts.observed ? "measured_pass" : "measured_fail";
}

/** Contact / must visual dims: unmeasured or measured_fail ⇒ forbid videoPass. */
export function mustDimAllowsVideoPass(status: ReturnType<typeof pixelDimStatus>): boolean {
  return status === "measured_pass";
}

export type PracticeIncomplete = { id: string; missing: PracticeLadderStep[] };

export function auditPracticeCompleteness(inv?: PracticeInventory): PracticeIncomplete[] {
  const inventory = inv ?? loadPracticeInventory();
  const out: PracticeIncomplete[] = [];
  for (const c of inventory.classes ?? []) {
    const missing: PracticeLadderStep[] = [];
    if (!c.declare?.length) missing.push("declare");
    if (!c.mount?.length) missing.push("mount");
    if (!c.hard) missing.push("hard");
    if (!c.untilClear) missing.push("untilClear");
    if (!c.feBlock) missing.push("feBlock");
    if (!c.noEscape?.trim()) missing.push("noEscape");
    if (missing.length) out.push({ id: c.id, missing });
  }
  return out;
}

export function stillQualityUserMessage(opts: {
  keyAbsent?: boolean;
  vendorPollFail?: boolean;
  measuredFail?: boolean;
  weak?: boolean;
  /** Literary primary effects missing — takes precedence over「仅结构通过」 */
  missingEffects?: Array<string | { id?: string }> | null;
  literaryEffectsQualified?: boolean | null;
  /** Explicit sample Must fulfillment (closed loop) */
  sampleMustFulfilled?: boolean | null;
  /** Hostile refs forced plate swap (generic refs contract) */
  bendHostileRefsForced?: boolean | null;
  platesSwapped?: boolean | null;
  /**
   * Pose gate for「已换板重出」— require true when action.* still miss.
   * undefined treated as unknown → do not claim swap-complete for action miss.
   */
  poseEvidenceOk?: boolean | null;
  /** Realization ladder honesty (降方案不降意图) */
  realizationDegraded?: boolean | null;
  realizationNote?: string | null;
  /** softEnv keepSoft but role/bytes missing — never claim「必须元素已兑现」 */
  softEnvMissingHonest?: boolean | null;
  /** Should-only misses surfaced in UX (bend/glyph) — does not block trunk */
  shouldMissIds?: string[] | null;
}): string {
  const missIds = (opts.missingEffects ?? [])
    .map((m) => (typeof m === "string" ? m : String(m?.id ?? "")))
    .filter(Boolean)
    .slice(0, 4);
  const shouldIds = (opts.shouldMissIds ?? []).map(String).filter(Boolean).slice(0, 2);
  const shouldNote = shouldIds.length
    ? `；细节待增强：${shouldIds.join("、")}`
    : "";
  if (opts.softEnvMissingHonest === true) {
    return "软环境板未挂入厂商参考（keepSoft≠像素殿）；场景 Must 未兑现；弱图不可作视频首帧；请继续生成智能修";
  }
  const trunkMiss =
    opts.sampleMustFulfilled === false || opts.literaryEffectsQualified === false;
  // Pose-only / should misses with trunk OK → honest degrade note, not「样本未兑现」
  if (
    !trunkMiss &&
    opts.realizationDegraded === true &&
    (opts.literaryEffectsQualified === true || opts.sampleMustFulfilled === true)
  ) {
    const note =
      String(opts.realizationNote ?? "").trim() ||
      "实现已降级：弯腰→持纸站姿/跪持；设计意图仍为弯腰捡拾";
    return `${note}${shouldNote}；主干可烧；弱图债·可烧视频`;
  }
  const sampleMiss = trunkMiss || (missIds.length > 0 && opts.literaryEffectsQualified !== true);
  // Whole-shot design intent miss — not a body-part patch; egress-only ≠ fulfilled
  if (sampleMiss) {
    const sceneMiss = missIds.some((id) =>
      /bg\.no_gray|bg\.scene|void|gray_studio|identity\.no_modern/i.test(id),
    );
    const label = sceneMiss
      ? `软环境已挂，场景像素未证实：${missIds.join("、") || "bg"}`
      : missIds.length
        ? `设计意图样本未兑现：${missIds.join("、")}`
        : "设计意图样本未兑现";
    const keyNote = opts.keyAbsent ? "；像素未测（Key 可选，非失败）" : "";
    const hostileRefs =
      missIds.some((id) => /occupancy\.|prop\.locus|prop\.in_frame|bg\.|action\.|identity\./.test(id)) ||
      opts.bendHostileRefsForced === true;
    const actionMiss = missIds.some((id) => /action\.|occupancy\./.test(id));
    const poseOk = opts.poseEvidenceOk === true;
    const plateNote = hostileRefs
      ? opts.platesSwapped === true
        ? actionMiss && !poseOk
          ? "；已换板但姿态未过，须复验弯腰触地"
          : poseOk || !actionMiss
            ? "；已按参考契约换板重出"
            : "；已换板但姿态未过，须复验弯腰触地"
        : "；须换板（四视图/整殿/展示卡仍挂，非法绿结案）"
      : "";
    return `${label}${keyNote}${plateNote}；弱图不可作视频首帧；请继续生成智能修`;
  }
  if (opts.vendorPollFail) {
    return "成图诊断未完成（轮询失败）；弱图不可作视频首帧；可稍后重试诊断";
  }
  // Design intent Must fulfilled; Key absent → honest unmeasured (never imply burn-ready)
  if (
    (opts.sampleMustFulfilled === true || opts.literaryEffectsQualified === true) &&
    opts.keyAbsent &&
    opts.softEnvMissingHonest !== true &&
    opts.realizationDegraded !== true
  ) {
    return `设计意图必须元素已兑现${shouldNote}；像素未测（Key 可选，非失败）；弱图债·可烧视频（设计意图优先）`;
  }
  if (opts.keyAbsent) {
    return "设计意图待核；像素未测（Key 可选，非失败）；弱图债·可烧视频，可人审或继续生成";
  }
  if (opts.measuredFail) {
    return "设计意图像素复核未过；请按债条修复后重出；弱图不可作视频首帧";
  }
  if (opts.weak) {
    return "静照未过高质量；弱图不可作视频首帧";
  }
  return "静照质量未就绪；弱图不可作视频首帧";
}

export type RepairConfidenceLadder = {
  version?: string;
  thresholds?: { autoApplyMin?: number; forkMin?: number; confirmBelow?: number };
  autoApplyTriggers?: string[];
  forkTriggers?: string[];
  requireCascadeAfterApply?: boolean;
  requireReGateAfterApply?: boolean;
};

export function loadRepairConfidenceLadder(): RepairConfidenceLadder {
  return readFixtureJson<RepairConfidenceLadder>("repair_confidence_ladder.json", {
    thresholds: { autoApplyMin: 0.85, forkMin: 0.55, confirmBelow: 0.55 },
    autoApplyTriggers: [],
    forkTriggers: [],
    requireCascadeAfterApply: true,
    requireReGateAfterApply: true,
  });
}

export function repairActionForConfidence(
  trigger: string,
  confidence: number,
): "apply_auto" | "presentation_fork" | "confirm_only" {
  const ladder = loadRepairConfidenceLadder();
  const autoMin = ladder.thresholds?.autoApplyMin ?? 0.85;
  const forkMin = ladder.thresholds?.forkMin ?? 0.55;
  const autoSet = new Set(ladder.autoApplyTriggers ?? []);
  const forkSet = new Set(ladder.forkTriggers ?? []);
  if (autoSet.has(trigger) || confidence >= autoMin) return "apply_auto";
  if (forkSet.has(trigger) || confidence >= forkMin) return "presentation_fork";
  return "confirm_only";
}
