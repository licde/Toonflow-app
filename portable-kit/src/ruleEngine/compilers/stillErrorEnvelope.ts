/**
 * Map still/image generation failures to distinct human envelopes (no collapse to 构图不好).
 */
import { buildPrimaryBlock } from "./primaryBlock";
import type { BurnNextStep } from "./burnGateEnvelope";

export interface StillErrorEnvelope {
  code: string;
  primaryNextStep: BurnNextStep;
  userMessage: string;
  ctaLabel: string;
}

export function buildStillErrorEnvelope(input: {
  code?: string | null;
  errMsg?: string | null;
  feedbackCategory?: string | null;
  feedbackRuleId?: string | null;
}): StillErrorEnvelope {
  const code = String(input.code ?? "").toUpperCase();
  const cat = String(input.feedbackCategory ?? input.feedbackRuleId ?? "").toLowerCase();
  const msg = String(input.errMsg ?? "");

  if (code === "IMG-CREF-CHAR" || code === "IMG-CREF" || cat.includes("cref") || /定妆|参考图缺失|identity/i.test(msg)) {
    const primary = buildPrimaryBlock("batch_still", {
      stage: "prompt",
      userMessageOverride: /定妆|融成/.test(msg) ? msg : undefined,
    });
    return {
      code: code || "IMG-CREF",
      primaryNextStep: primary.primaryNextStep,
      userMessage: primary.userMessage,
      ctaLabel: primary.ctaLabel,
    };
  }

  if (code === "DEX-DIRTY-STILL-PROMPT" || /裸 --cref|裸 --sref|手部特写与眼神/i.test(msg)) {
    const primary = buildPrimaryBlock("chat_repair", {
      stage: "prompt",
      userMessageOverride: msg || "文学体脏静帧（手+眼同帧或裸 cref/sref 码）；请回 SB 改 VD 或绑真图",
    });
    return {
      code: "DEX-DIRTY-STILL-PROMPT",
      primaryNextStep: primary.primaryNextStep,
      userMessage: primary.userMessage,
      ctaLabel: primary.ctaLabel,
    };
  }

  if (code === "DEX-ASSET-CREF" || code === "IMG-CREF-CHAR") {
    const primary = buildPrimaryBlock("batch_still", {
      stage: "prompt",
      userMessageOverride: msg || "出脸镜缺定妆真图；请回 AS 补图后再生成",
    });
    return {
      code: code || "DEX-ASSET-CREF",
      primaryNextStep: primary.primaryNextStep,
      userMessage: primary.userMessage,
      ctaLabel: primary.ctaLabel,
    };
  }

  if (code === "QP-02" || /可拍画面|画面描述|visual body|qp-02/i.test(msg)) {
    const primary = buildPrimaryBlock("chat_repair", {
      stage: "prompt",
      userMessageOverride: "缺少可拍画面描述，请先补分镜画面（谁在哪做什么）",
    });
    return {
      code: "QP-02",
      primaryNextStep: primary.primaryNextStep,
      userMessage: primary.userMessage,
      ctaLabel: primary.ctaLabel,
    };
  }

  if (code === "STILL-DIRTY" || /契约空壳|dirty still/i.test(msg)) {
    const primary = buildPrimaryBlock("soft_patch", {
      stage: "prompt",
      userMessageOverride: "提示词仍是契约空壳，请自动重合成后再生成",
    });
    return {
      code: "STILL-DIRTY",
      primaryNextStep: "soft_patch",
      userMessage: primary.userMessage,
      ctaLabel: "自动重合成",
    };
  }

  if (
    cat === "vendor_passthrough" ||
    cat.includes("vendor") ||
    code.startsWith("VENDOR") ||
    /timeout|rate.?limit|502|503|ECONN|供应商|vendor|模型/i.test(msg)
  ) {
    const summary = msg.replace(/\s+/g, " ").trim().slice(0, 80) || "未知错误";
    const primary = buildPrimaryBlock("retry_shot", {
      stage: "prompt",
      userMessageOverride: `供应商返回错误：${summary}。请稍后重试或换模型`,
    });
    return {
      code: code.startsWith("VENDOR") ? code : "VENDOR",
      primaryNextStep: primary.primaryNextStep,
      userMessage: primary.userMessage,
      ctaLabel: "重试生图",
    };
  }

  if (code === "HEAL-BUDGET") {
    const primary = buildPrimaryBlock("chat_repair", {
      stage: "qc",
      userMessageOverride: "自动重试次数已用尽，请人工处理",
    });
    return {
      code: "HEAL-BUDGET",
      primaryNextStep: primary.primaryNextStep,
      userMessage: primary.userMessage,
      ctaLabel: primary.ctaLabel,
    };
  }

  // True composition weakness only when explicitly tagged (must say 构图 — never collapse vendor/identity here)
  if (code === "IMG-STILL-QA" || cat === "img_still_weak") {
    const primary = buildPrimaryBlock("regen_storyboard_hq", {
      stage: "prompt",
      userMessageOverride: "构图/静照质量未达标，请更新高质量分镜图（不可作视频首帧）",
    });
    return {
      code: "IMG-STILL-QA",
      primaryNextStep: primary.primaryNextStep,
      userMessage: primary.userMessage,
      ctaLabel: primary.ctaLabel,
    };
  }

  // Default: retry with vendor-ish message, NEVER silent 构图不好
  const primary = buildPrimaryBlock("retry_shot", {
    stage: "prompt",
    userMessageOverride: msg
      ? `生成失败：${msg.replace(/\s+/g, " ").trim().slice(0, 100)}`
      : "静照生成失败，请重试",
  });
  return {
    code: code || "STILL-GEN-FAIL",
    primaryNextStep: primary.primaryNextStep,
    userMessage: primary.userMessage,
    ctaLabel: primary.ctaLabel,
  };
}
