/**
 * Human-facing envelope for video soft_patch / raise_duration (parity with stillErrorEnvelope).
 * Never ship empty「提示词有可自动修复的问题」when we know the action + value.
 */
import { buildPrimaryBlock, type PrimaryBlock } from "../compilers/primaryBlock";
import type { BurnNextStep } from "../compilers/burnGateEnvelope";
import type { QualityDecisionResult } from "../compilers/qualityDecision";

export interface VideoHealEnvelope extends PrimaryBlock {
  autoHealed?: string[];
  stillBlocked?: boolean;
}

export function buildVideoHealEnvelope(opts: {
  nextStep: BurnNextStep;
  suggestedValue?: number | string;
  fieldPath?: string;
  userMessageOverride?: string;
  autoHealed?: string[];
}): VideoHealEnvelope {
  const base = buildPrimaryBlock(opts.nextStep, {
    suggestedValue: opts.suggestedValue,
    fieldPath: opts.fieldPath ?? (opts.nextStep === "raise_duration" ? "duration" : undefined),
    stage: "burn",
    userMessageOverride: opts.userMessageOverride,
  });

  // Enrich raise_duration / soft_patch copy when suggestedValue known
  let userMessage = base.userMessage;
  if (opts.nextStep === "raise_duration" && opts.suggestedValue != null) {
    userMessage =
      opts.userMessageOverride ??
      `台词/情绪需要更长镜头，建议时长 ${opts.suggestedValue}s`;
  } else if (opts.nextStep === "soft_patch" && opts.suggestedValue != null) {
    userMessage =
      opts.userMessageOverride ?? `提示词可自动修复：${String(opts.suggestedValue)}`;
  } else if (opts.nextStep === "soft_patch" && !opts.userMessageOverride) {
    // Avoid empty generic when we somehow land here without heal
    userMessage = "提示词需完善后才能烧片（运镜/五段/合规等）";
  }

  return {
    ...base,
    userMessage,
    autoHealed: opts.autoHealed,
  };
}

/** Enrich serialize payload after silent heal or human block. */
export function enrichQualityDecisionForClient(
  qd: QualityDecisionResult,
  extra?: { autoHealed?: string[]; duration?: number },
): Record<string, unknown> {
  const suggested =
    qd.envelope.suggestedValue ??
    (qd.nextStep === "raise_duration" && extra?.duration != null ? extra.duration : undefined) ??
    (qd.nextStep === "raise_duration" && qd.lipMin != null ? Math.max(qd.lipMin, 1) : undefined);

  const env = buildVideoHealEnvelope({
    nextStep: qd.nextStep,
    suggestedValue: suggested,
    fieldPath: qd.envelope.fieldPath,
    userMessageOverride:
      qd.nextStep === "raise_duration" && suggested != null
        ? `台词/情绪需要更长镜头，建议时长 ${suggested}s`
        : qd.envelope.userMessage,
    autoHealed: extra?.autoHealed,
  });

  return {
    decision: qd.decision,
    burnAllowed: qd.burnAllowed,
    nextStep: qd.nextStep,
    primaryNextStep: env.primaryNextStep,
    userMessage: env.userMessage,
    ctaLabel: env.ctaLabel,
    userMessageKey: env.userMessageKey,
    suggestedValue: env.suggestedValue ?? suggested,
    fieldPath: env.fieldPath ?? "duration",
    splitHint: qd.splitHint,
    reasons: qd.reasons,
    lipMin: qd.lipMin,
    vendorMax: qd.vendorMax,
    rePushPlan: qd.envelope.rePushPlan,
    repairHints: qd.envelope.repairHints,
    reverseTriggers: qd.envelope.triggers,
    ...(extra?.autoHealed?.length ? { autoHealed: extra.autoHealed } : {}),
    ...(extra?.duration != null ? { duration: extra.duration } : {}),
  };
}
