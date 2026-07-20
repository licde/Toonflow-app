/**
 * DC-01 (dialogue coverage) human Envelope — never surface raw dialogue_hash_mismatch→SB alone.
 */
import { buildPrimaryBlock, type PrimaryBlock } from "../compilers/primaryBlock";
import type { BurnNextStep } from "../compilers/burnGateEnvelope";

export interface Dc01EnvelopeInput {
  message?: string;
  evidence?: Record<string, unknown> | null;
}

export interface Dc01HumanEnvelope extends PrimaryBlock {
  trigger: "dialogue_hash_mismatch";
  softPatchable: boolean;
  checkId: "DC-01";
}

export function buildDc01HumanEnvelope(input: Dc01EnvelopeInput = {}): Dc01HumanEnvelope {
  const evidence = input.evidence ?? {};
  const missingCount = Number(evidence.missingCount ?? 0) || 0;
  const samples = (evidence.missingSamples as string[] | undefined) ?? [];
  const sample = samples[0];
  const reasons = (evidence.repairReasons as string[] | undefined) ?? [];
  const softPatchable =
    reasons.includes("unique_missing_line") ||
    reasons.includes("empty_target_shot") ||
    (missingCount > 0 && missingCount <= 3);

  const userMessage =
    missingCount > 0
      ? `分镜台词与剧本对不上：还缺 ${missingCount} 句${sample ? `（如「${sample}」）` : ""}。${
          softPatchable ? "可一键把缺失台词补进空镜，再继续生成。" : "请对照剧本把台词补进分镜后再生成。"
        }`
      : input.message?.includes("台词")
        ? input.message
        : "分镜台词与剧本对不上，请补齐台词后再生成。";

  const nextStep: BurnNextStep = softPatchable ? "soft_patch" : "chat_repair";
  const primary = buildPrimaryBlock(nextStep, {
    stage: "prompt",
    userMessageOverride: userMessage,
  });

  return {
    ...primary,
    ctaLabel: softPatchable ? "一键补台词" : primary.ctaLabel,
    trigger: "dialogue_hash_mismatch",
    softPatchable,
    checkId: "DC-01",
  };
}
