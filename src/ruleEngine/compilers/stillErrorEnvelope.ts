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
  const isTimeout = /timeout|ECONNABORTED/i.test(msg);
  const isNetwork = /ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|网络错误/i.test(msg);
  const is4xx = /\b40\d\b|invalid api|unauthorized|forbidden|bad request/i.test(msg);
  const is5xx = /\b50\d\b|server error|upstream/i.test(msg);

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

  if (code === "DEX-PROP-PLATE-MISSING" || /道具参考板|PROP soft|propSoftPlate/i.test(msg)) {
    const primary = buildPrimaryBlock("batch_still", {
      stage: "prompt",
      userMessageOverride:
        msg || "接触/道具事件缺道具参考板；请挂 PROP 资产或允许结构合成软板后再生成",
    });
    return {
      code: "DEX-PROP-PLATE-MISSING",
      primaryNextStep: primary.primaryNextStep,
      userMessage: primary.userMessage,
      ctaLabel: primary.ctaLabel || "挂道具板后再生成",
    };
  }

  // Structure / prop form debt — regen with form (not Key install)
  if (
    code === "PROP-FORM" ||
    code === "DEX-PROP-FORM" ||
    /卷棒|纸卷|薄纸片形态|prop_form|形态债|抵颏冒充/i.test(msg)
  ) {
    const primary = buildPrimaryBlock("batch_still", {
      stage: "prompt",
      userMessageOverride:
        msg || "道具形态未按契约（须展开薄纸片/禁卷棒抵颏）；请重出静照，勿当作 Key 未测",
    });
    return {
      code: code || "PROP-FORM",
      primaryNextStep: primary.primaryNextStep,
      userMessage: primary.userMessage,
      ctaLabel: "重出形态静照",
    };
  }

  // Code-first only: vendor/errMsg often embeds full prompt (含「软环境」) — never regex-hijack.
  if (code === "SOFT-ENV-PLATE-MISSING" || code === "SOFT-ENV-BAKE-FAILED") {
    const primary = buildPrimaryBlock("batch_still", {
      stage: "prompt",
      userMessageOverride:
        msg ||
        (code === "SOFT-ENV-BAKE-FAILED"
          ? "软环境连贯性烘焙失败；请补场景板后重试"
          : "软环境 SCENE 板未挂上；成图易灰棚，建议补场景软板后再生成"),
    });
    return {
      code: code === "SOFT-ENV-BAKE-FAILED" ? "SOFT-ENV-BAKE-FAILED" : "SOFT-ENV-PLATE-MISSING",
      primaryNextStep: primary.primaryNextStep,
      // Soft-env is continuity debt — never imply hard Generate brick in CTA alone
      userMessage: primary.userMessage,
      ctaLabel: code === "SOFT-ENV-BAKE-FAILED" ? "补场景软板后重试" : "补场景软板",
    };
  }

  // Key-optional unmeasured — never imply "no literary constraints written"
  if (
    code === "KEY-UNMEASURED" ||
    code === "KEY_OPTIONAL" ||
    /Key未测|像素未测|keyOptional|未装 Key/i.test(msg)
  ) {
    const primary = buildPrimaryBlock("retry_shot", {
      stage: "qc",
      userMessageOverride:
        msg || "像素诊断 Key 未装/未测（可选）。文学与形态约束仍有效；请人审或装 Key，勿当作缺约束",
    });
    return {
      code: "KEY-UNMEASURED",
      primaryNextStep: primary.primaryNextStep,
      userMessage: primary.userMessage,
      ctaLabel: "人审通过（未测）",
    };
  }

  if (code === "STILL-NO-VENDOR" || /未调用供应商|空转旧图|vendorCalled=false/i.test(msg)) {
    const primary = buildPrimaryBlock("retry_shot", {
      stage: "prompt",
      userMessageOverride: msg || "未真实调用出图供应商（疑似空转旧图）；请重试生图",
    });
    return {
      code: "STILL-NO-VENDOR",
      primaryNextStep: primary.primaryNextStep,
      userMessage: primary.userMessage,
      ctaLabel: "重试生图",
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
    cat === "network_timeout" ||
    cat === "network_error" ||
    cat === "vendor_4xx" ||
    cat === "vendor_5xx" ||
    cat.includes("vendor") ||
    code.startsWith("VENDOR") ||
    /timeout|rate.?limit|502|503|ECONN|供应商|vendor|模型|image queue input|download input image|upload image queue/i.test(
      msg,
    )
  ) {
    const summary = msg.replace(/\s+/g, " ").trim().slice(0, 80) || "未知错误";
    const prefix = isTimeout
      ? "供应商超时"
      : isNetwork
        ? "供应商网络错误"
        : is4xx
          ? "供应商请求错误"
          : is5xx
            ? "供应商服务错误"
            : "供应商返回错误";
    const primary = buildPrimaryBlock("retry_shot", {
      stage: "prompt",
      userMessageOverride: `${prefix}：${summary}。请稍后重试或换模型`,
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

  if (code === "AUTO-REPAIR") {
    const primary = buildPrimaryBlock("soft_patch", {
      stage: "prompt",
      userMessageOverride: msg || "系统正在自动修复首帧质量，请稍后重试视频生成",
    });
    return {
      code: "AUTO-REPAIR",
      primaryNextStep: "soft_patch",
      userMessage: primary.userMessage,
      ctaLabel: "自动修复中",
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

/**
 * Only latch FE silent-regen block for structural split on the SAME shot.
 * Key-optional / lit enhance / chat_repair / regen_hq must NOT brick Generate.
 */
export function shouldLatchBlockSilentRegen(input: {
  primaryNextStep?: string | null;
  code?: string | null;
  missingSlots?: string[] | null;
  irdPrimaryAction?: string | null;
  errMsg?: string | null;
}): boolean {
  const step = String(input.primaryNextStep ?? "");
  const code = String(input.code ?? "").toUpperCase();
  const msg = String(input.errMsg ?? "");
  if (step === "retry_shot" || step === "soft_patch" || step === "regen_storyboard_hq" || step === "batch_still") {
    return false;
  }
  if (code === "VENDOR" || code.startsWith("VENDOR")) return false;
  if (/image queue input|download input image|upload image queue|timeout|ECONN|502|503|rate.?limit/i.test(msg)) {
    return false;
  }
  // Only confirm_split / split_shot hard-latches
  if (input.irdPrimaryAction === "confirm_split" || step === "split_shot") return true;
  return false;
}
