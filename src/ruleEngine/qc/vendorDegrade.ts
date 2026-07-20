/**
 * Vendor failure / quota → degrade or propose model swap (M3).
 */
import { buildPrimaryBlock, type PrimaryBlock } from "../compilers/primaryBlock";
import type { BurnNextStep } from "../compilers/burnGateEnvelope";

export type VendorFailKind = "quota" | "timeout" | "upstream_5xx" | "policy_block" | "unknown";

export interface VendorDegradePlan {
  kind: VendorFailKind;
  nextStep: BurnNextStep;
  primary: PrimaryBlock;
  suggestVendorIds?: string[];
  retryable: boolean;
}

export function planVendorDegrade(input: {
  errorText?: string;
  currentVendorId?: string;
  fallbackVendors?: string[];
}): VendorDegradePlan {
  const err = String(input.errorText ?? "").toLowerCase();
  let kind: VendorFailKind = "unknown";
  if (/quota|rate.?limit|429|额度|余额/.test(err)) kind = "quota";
  else if (/timeout|timed?\s*out|deadline/.test(err)) kind = "timeout";
  else if (/5\d\d|upstream|unavailable/.test(err)) kind = "upstream_5xx";
  else if (/policy|nsfw|sensitive|敏感/.test(err)) kind = "policy_block";

  const fallbacks = (input.fallbackVendors ?? []).filter((v) => v && v !== input.currentVendorId);
  if (kind === "quota" || kind === "upstream_5xx") {
    return {
      kind,
      nextStep: fallbacks.length ? "chat_repair" : "retry_shot",
      retryable: kind !== "quota" || fallbacks.length > 0,
      suggestVendorIds: fallbacks.slice(0, 3),
      primary: buildPrimaryBlock(fallbacks.length ? "chat_repair" : "retry_shot", {
        stage: "qc",
        userMessageOverride: fallbacks.length
          ? `当前厂商不可用，建议切换：${fallbacks.slice(0, 2).join(" / ")}`
          : "生成失败，可重试本镜",
      }),
    };
  }
  if (kind === "policy_block") {
    return {
      kind,
      nextStep: "soft_patch",
      retryable: true,
      primary: buildPrimaryBlock("soft_patch", {
        stage: "qc",
        userMessageOverride: "内容策略拦截，请弱化敏感描述后重试",
      }),
    };
  }
  return {
    kind,
    nextStep: "retry_shot",
    retryable: true,
    primary: buildPrimaryBlock("retry_shot", { stage: "qc" }),
  };
}
