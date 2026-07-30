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
}): string {
  if (opts.vendorPollFail) {
    return "成图诊断未完成（轮询失败）；弱图不可作视频首帧；可稍后重试诊断";
  }
  if (opts.keyAbsent) {
    return "未配置诊断·仅结构通过；像素未测，弱图不可作视频首帧（Key 可选，非必装）";
  }
  if (opts.measuredFail) {
    return "成图诊断未过；请按债条修复后重出；弱图不可作视频首帧";
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
