/**
 * UX SSOT: primary nextStep + userMessage / ctaLabel (plan §6 / D14).
 * FE should consume these fields only — not QualityDecisionKind.
 */
import type { BurnNextStep } from "./burnGateEnvelope";

export type GateStage = "design" | "import" | "prompt" | "burn" | "qc";

export interface PrimaryBlock {
  primaryNextStep: BurnNextStep;
  userMessage: string;
  ctaLabel: string;
  userMessageKey: string;
  suggestedValue?: number | string;
  fieldPath?: string;
  stage?: GateStage;
}

const PRIORITY: BurnNextStep[] = [
  "batch_still",
  "regen_storyboard_hq",
  "raise_duration",
  "split_shot",
  "soft_patch",
  "retry_shot",
  "chat_repair",
  "burn",
];

const COPY: Record<
  BurnNextStep,
  { userMessage: string; ctaLabel: string; userMessageKey: string }
> = {
  batch_still: {
    userMessage: "角色定妆图还没有",
    ctaLabel: "去生成定妆",
    userMessageKey: "gate.batch_still",
  },
  regen_storyboard_hq: {
    userMessage: "分镜静照未过高质量（不可作视频首帧），请更新高质量分镜图",
    ctaLabel: "更新高质量分镜图",
    userMessageKey: "gate.regen_storyboard_hq",
  },
  raise_duration: {
    userMessage: "台词/情绪需要更长镜头",
    ctaLabel: "一键加长",
    userMessageKey: "gate.raise_duration",
  },
  split_shot: {
    userMessage: "一句太长/多拍冲突，请 Confirm 设计拆分（Orchestrator），勿只写 hint",
    ctaLabel: "打开拆镜确认",
    userMessageKey: "gate.split_shot",
  },
  soft_patch: {
    userMessage: "提示词需完善后才能烧片（运镜/五段/合规等）",
    ctaLabel: "一键完善",
    userMessageKey: "gate.soft_patch",
  },
  retry_shot: {
    userMessage: "本镜需要重试生成",
    ctaLabel: "重试本镜",
    userMessageKey: "gate.retry_shot",
  },
  chat_repair: {
    userMessage: "需要改剧本/设计",
    ctaLabel: "复制给 Chat",
    userMessageKey: "gate.chat_repair",
  },
  burn: {
    userMessage: "可以继续生成",
    ctaLabel: "继续生成",
    userMessageKey: "gate.burn",
  },
};

export function pickPrimaryNextStep(candidates: BurnNextStep[]): BurnNextStep {
  for (const p of PRIORITY) {
    if (candidates.includes(p)) return p;
  }
  return candidates[0] ?? "chat_repair";
}

export function buildPrimaryBlock(
  nextStep: BurnNextStep,
  opts?: {
    suggestedValue?: number | string;
    fieldPath?: string;
    stage?: GateStage;
    userMessageOverride?: string;
    ctaLabelOverride?: string;
  },
): PrimaryBlock {
  const base = COPY[nextStep] ?? COPY.chat_repair;
  return {
    primaryNextStep: nextStep,
    userMessage: opts?.userMessageOverride ?? base.userMessage,
    ctaLabel: opts?.ctaLabelOverride ?? base.ctaLabel,
    userMessageKey: base.userMessageKey,
    suggestedValue: opts?.suggestedValue,
    fieldPath: opts?.fieldPath,
    stage: opts?.stage,
  };
}

/** Empty-project cold start CTA. */
export function coldStartPrimaryBlock(stage: GateStage = "import"): PrimaryBlock {
  return {
    primaryNextStep: "chat_repair",
    userMessage: "还没有可导入的设计包，请先完成设计或导入剧本",
    ctaLabel: "去设计/导入",
    userMessageKey: "gate.cold_start",
    stage,
  };
}
