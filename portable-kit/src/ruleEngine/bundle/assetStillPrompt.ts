/**
 * Asset still generation policy — aspect + prompt mode (identity plate vs turnaround sheet).
 * Identity stills must NOT inherit project videoRatio.
 */

export type AssetStillType = "role" | "scene" | "tool";
export type AssetStillPromptMode = "identity_plate" | "turnaround_sheet";

export type AssetStillAspect = "3:1" | "4:1" | "1:1" | "16:9" | "9:16";

export function resolveAssetStillAspect(
  type: AssetStillType,
  promptMode: AssetStillPromptMode = "identity_plate",
): AssetStillAspect {
  if (type === "tool") return "1:1";
  if (type === "scene") return "16:9";
  // role
  return promptMode === "turnaround_sheet" ? "4:1" : "3:1";
}

/**
 * Derivative / deep-dig assets use parent ref + LLM variant prompt —
 * NOT turnaround sheet aspect (role stays 16:9, matching legacy behavior).
 */
export function resolveAssetDerivativeAspect(type: AssetStillType): AssetStillAspect {
  if (type === "tool") return "1:1";
  return "16:9";
}

/** Map to vendor-accepted ratios when API only supports a subset. */
export function toVendorAspectRatio(aspect: AssetStillAspect): "16:9" | "9:16" | "1:1" | "3:1" | "4:1" {
  return aspect;
}

const SHEET_MARKERS = /四视图|turnaround|character design sheet|四宫格/i;

export function promptAlreadySheetShaped(prompt: string): boolean {
  return SHEET_MARKERS.test(prompt);
}

export interface AssetStillPromptConfig {
  label: string;
  taskClass: string;
  dir: string;
  promptTitle: string;
  promptEnd: string;
}

export function assetStillTypeConfig(
  type: AssetStillType,
  promptMode: AssetStillPromptMode = "identity_plate",
): AssetStillPromptConfig {
  if (type === "scene") {
    return {
      label: "场景",
      taskClass: "场景图生成",
      dir: "scene",
      promptTitle: "标准场景图",
      promptEnd: "标准场景图",
    };
  }
  if (type === "tool") {
    return {
      label: "道具",
      taskClass: "道具图生成",
      dir: "props",
      promptTitle: "标准道具图",
      promptEnd: "标准道具图",
    };
  }
  if (promptMode === "turnaround_sheet") {
    return {
      label: "角色",
      taskClass: "角色图生成",
      dir: "role",
      promptTitle: "角色标准四视图",
      promptEnd: "人物角色四视图",
    };
  }
  return {
    label: "角色",
    taskClass: "角色图生成",
    dir: "role",
    promptTitle: "角色身份板（单人全身正面）",
    promptEnd: "单人全身身份参考图，纯色或简洁背景，供 cref 使用，禁止四视图拼图",
  };
}

export function buildAssetStillPrompt(
  type: AssetStillType,
  artStyle: string,
  name: string,
  prompt: string,
  promptMode: AssetStillPromptMode = "identity_plate",
): string {
  if (promptAlreadySheetShaped(prompt) && promptMode === "identity_plate") {
    // Already a full sheet prompt — avoid double-wrapping with identity title
    return prompt.trim();
  }
  if (promptAlreadySheetShaped(prompt) && promptMode === "turnaround_sheet") {
    return prompt.trim();
  }
  const cfg = assetStillTypeConfig(type, promptMode);
  return `
    请根据以下参数生成${cfg.promptTitle}：

    **基础参数：**
    - 画风风格: ${artStyle || "未指定"}

    **${cfg.label}设定：**
    - 名称:${name},
    - 提示词:${prompt},

    请严格按照系统规范生成${cfg.promptEnd}。
  `.trim();
}

export function isBatchExcludedRemark(remark: string | null | undefined): boolean {
  const r = String(remark ?? "");
  // Only true stubs / speaker seeds — NOT weakPrompt alone (main CHAR may be weak until polished)
  return (
    r.includes("batchExclude:1") ||
    r.includes("cdStub:1") ||
    r.includes("speakerSeed:1") ||
    r.includes("orphanStub:1")
  );
}

export function isWeakAssetPrompt(
  prompt: string | null | undefined,
  name?: string,
  type?: AssetStillType,
): boolean {
  const p = String(prompt ?? "").trim();
  if (!p) return true;
  if (/^stub for\b/i.test(p)) return true;
  if (name && (p === name || p === `角色设定 ${name}` || p === `配角 ${name}` || p === `道具 ${name}`)) return true;
  if (/^配角\s/.test(p) && p.length < 40) return true;
  if (/^角色设定\s/.test(p) && p.length < 30) return true;
  if (type === "tool") {
    if (p.length < 24) return true;
    if (name && p.startsWith(name) && p.length < name.length + 16 && !/材质|形制|叙事/.test(p)) return true;
  }
  if (type === "scene") {
    if (p.length < 20) return true;
    if (name && p === name) return true;
  }
  return false;
}

export function shouldBlockAssetStillGen(opts: {
  remark?: string | null;
  prompt?: string | null;
  promptState?: string | null;
  name?: string;
  type?: AssetStillType;
  allowOverride?: boolean;
}): { block: boolean; reason?: string } {
  if (opts.allowOverride) return { block: false };
  if (isBatchExcludedRemark(opts.remark)) {
    return { block: true, reason: "stub/弱设定资产不可默认生成，请先补全设定或润色" };
  }
  if (/^stub for\b/i.test(String(opts.prompt ?? ""))) {
    return { block: true, reason: "占位提示词不可生成" };
  }
  if (opts.promptState !== "已完成" && isWeakAssetPrompt(opts.prompt, opts.name, opts.type)) {
    return { block: true, reason: "弱提示词未润色，请先批量润色后再生成" };
  }
  return { block: false };
}
