/**
 * Unified adaptive rules for image/video generation modes.
 * Single source for template path, media contract, preflight codes, reverse triggers.
 */

export type GenerationModality = "image" | "video";

export type ImageModeId = "text" | "singleImage" | "multiReference";

export type VideoModeId =
  | "text"
  | "singleImage"
  | "startEndRequired"
  | "endFrameOptional"
  | "startFrameOptional"
  | "multiParameter";

export interface MediaContract {
  minRefs: number;
  maxRefs: number;
  /** start/end frame semantics for first-last family */
  startRequired?: boolean;
  endRequired?: boolean;
  /** Parsed from JSON array mode e.g. imageReference:2 */
  refSpecs?: { kind: string; count: number }[];
  requireStoryboardContext?: boolean;
}

export interface GenerationModeRules {
  modality: GenerationModality;
  modeId: string;
  templatePath: string;
  mediaContract: MediaContract;
  skillSlices: ("text" | "singleImage" | "firstLast" | "multi" | "imageText" | "imageSingle" | "imageMulti")[];
  preflightCodes: string[];
  reverseTrigger: string;
  /** Bound o_modelPrompt may override template; still must be mode-compatible */
  boundTemplateCompatible: boolean;
  inferredFromRefCount?: boolean;
}

export interface ResolveGenerationModeInput {
  modality: GenerationModality;
  mode?: string | null;
  modelName?: string | null;
  boundModelPromptPath?: string | null;
  /** When mode omitted for image, infer from this */
  referenceCount?: number;
}

const IMG = {
  text: "image/universalTextMode.md",
  singleImage: "image/universalSingleImageMode.md",
  multiReference: "image/universalMultiReferenceMode.md",
} as const;

const VID = {
  text: "video/universalTextMode.md",
  singleImage: "video/universalSingleImageMode.md",
  firstLast: "video/universalFirstAndLastFrameMode.md",
  multi: "video/universalMulti-parameterMode.md",
  wan: "video/wan2.6Single-imageFirstFrameMode.md",
  seedance: "video/seedance2Multi-parameterMode.md",
} as const;

export function inferImageModeFromRefCount(n: number): ImageModeId {
  if (n <= 0) return "text";
  if (n === 1) return "singleImage";
  return "multiReference";
}

export function parseMultiParameterMode(mode: string): { kind: string; count: number }[] | null {
  const raw = mode.trim();
  if (!(raw.startsWith("[") && raw.endsWith("]"))) return null;
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return null;
    const specs: { kind: string; count: number }[] = [];
    for (const item of arr) {
      if (typeof item !== "string") continue;
      const m = item.match(/^(imageReference|videoReference|audioReference|textReference):(\d+)$/);
      if (m) specs.push({ kind: m[1], count: Math.max(0, Number(m[2]) || 0) });
    }
    return specs.length ? specs : null;
  } catch {
    return null;
  }
}

function isBoundCompatible(boundPath: string | null | undefined, expectedPath: string): boolean {
  if (!boundPath) return true;
  const b = boundPath.replace(/\\/g, "/").toLowerCase();
  const e = expectedPath.replace(/\\/g, "/").toLowerCase();
  if (b.endsWith(e) || b.includes(e.split("/").pop()!)) return true;
  // Same family: first-last / singleImage / multi / text
  const family = (p: string) => {
    if (/textmode|universaltext/i.test(p)) return "text";
    if (/singleimage|wan2\.6/i.test(p)) return "singleImage";
    if (/firstandlast|first.?last/i.test(p)) return "firstLast";
    if (/multi-parameter|multiparameter|seedance/i.test(p)) return "multi";
    if (/multireference/i.test(p)) return "multiRef";
    return p;
  };
  return family(b) === family(e);
}

export function resolveGenerationModeRules(input: ResolveGenerationModeInput): GenerationModeRules {
  if (input.modality === "image") {
    return resolveImage(input);
  }
  return resolveVideo(input);
}

function resolveImage(input: ResolveGenerationModeInput): GenerationModeRules {
  let modeId = (input.mode || "").trim() as ImageModeId | "";
  let inferred = false;
  if (!modeId || !["text", "singleImage", "multiReference"].includes(modeId)) {
    modeId = inferImageModeFromRefCount(input.referenceCount ?? 0);
    inferred = true;
  }
  const table: Record<ImageModeId, Omit<GenerationModeRules, "modality" | "modeId" | "boundTemplateCompatible" | "inferredFromRefCount">> = {
    text: {
      templatePath: IMG.text,
      mediaContract: { minRefs: 0, maxRefs: 0 },
      skillSlices: ["imageText"],
      preflightCodes: [],
      reverseTrigger: "image_mode_ref_mismatch",
    },
    singleImage: {
      templatePath: IMG.singleImage,
      mediaContract: { minRefs: 1, maxRefs: 1 },
      skillSlices: ["imageSingle"],
      preflightCodes: ["IMAGE_MODE_REF_MISMATCH"],
      reverseTrigger: "image_mode_ref_mismatch",
    },
    multiReference: {
      templatePath: IMG.multiReference,
      mediaContract: { minRefs: 2, maxRefs: 8 },
      skillSlices: ["imageMulti"],
      preflightCodes: ["IMAGE_MODE_REF_MISMATCH"],
      reverseTrigger: "image_mode_ref_mismatch",
    },
  };
  const base = table[modeId as ImageModeId];
  return {
    modality: "image",
    modeId,
    ...base,
    boundTemplateCompatible: isBoundCompatible(input.boundModelPromptPath, base.templatePath),
    inferredFromRefCount: inferred,
  };
}

function resolveVideo(input: ResolveGenerationModeInput): GenerationModeRules {
  const mode = String(input.mode ?? "").trim();
  const modelLower = (input.modelName ?? "").toLowerCase();
  const multiSpecs = parseMultiParameterMode(mode);

  let modeId: VideoModeId | string = mode || "text";
  let templatePath: string = VID.text;
  let mediaContract: MediaContract = { minRefs: 0, maxRefs: 99, requireStoryboardContext: true };
  let skillSlices: GenerationModeRules["skillSlices"] = ["text"];
  let reverseTrigger = "mode_rules_mismatch";
  let preflightCodes = ["PROMPT_GEN_CONTEXT_MISSING"];

  if (multiSpecs) {
    modeId = "multiParameter";
    templatePath = /seedance.*2[.\-]0/i.test(modelLower) ? VID.seedance : VID.multi;
    const total = multiSpecs.reduce((s, x) => s + x.count, 0);
    mediaContract = { minRefs: total, maxRefs: total, refSpecs: multiSpecs, requireStoryboardContext: true };
    skillSlices = ["multi"];
    preflightCodes = ["PROMPT_GEN_MEDIA_MISSING"];
    reverseTrigger = "prompt_gen_media_missing";
  } else if (mode === "startEndRequired") {
    modeId = "startEndRequired";
    templatePath = VID.firstLast;
    mediaContract = { minRefs: 2, maxRefs: 2, startRequired: true, endRequired: true, requireStoryboardContext: true };
    skillSlices = ["firstLast"];
    preflightCodes = ["PROMPT_GEN_MEDIA_MISSING"];
    reverseTrigger = "prompt_gen_media_missing";
  } else if (mode === "endFrameOptional") {
    modeId = "endFrameOptional";
    templatePath = VID.firstLast;
    mediaContract = { minRefs: 1, maxRefs: 2, startRequired: true, endRequired: false, requireStoryboardContext: true };
    skillSlices = ["firstLast"];
    preflightCodes = ["PROMPT_GEN_MEDIA_MISSING"];
    reverseTrigger = "prompt_gen_media_missing";
  } else if (mode === "startFrameOptional") {
    modeId = "startFrameOptional";
    templatePath = VID.firstLast;
    mediaContract = { minRefs: 1, maxRefs: 2, startRequired: false, endRequired: true, requireStoryboardContext: true };
    skillSlices = ["firstLast"];
    preflightCodes = ["PROMPT_GEN_MEDIA_MISSING"];
    reverseTrigger = "prompt_gen_media_missing";
  } else if (mode === "singleImage") {
    modeId = "singleImage";
    templatePath = modelLower.includes("wan") && modelLower.includes("2.6") ? VID.wan : VID.singleImage;
    mediaContract = { minRefs: 1, maxRefs: 1, startRequired: true, requireStoryboardContext: true };
    skillSlices = ["singleImage"];
    preflightCodes = ["PROMPT_GEN_MEDIA_MISSING", "AG-GATE-01"];
    reverseTrigger = "prompt_gen_media_missing";
  } else if (mode === "text" || !mode) {
    modeId = "text";
    templatePath = VID.text;
    mediaContract = { minRefs: 0, maxRefs: 99, requireStoryboardContext: true };
    skillSlices = ["text"];
    preflightCodes = ["PROMPT_GEN_CONTEXT_MISSING"];
    reverseTrigger = "mode_rules_mismatch";
  } else if (modelLower.includes("wan") && modelLower.includes("2.6")) {
    // name heuristic only when mode unknown-ish
    modeId = mode || "singleImage";
    templatePath = VID.wan;
    mediaContract = { minRefs: 1, maxRefs: 2, requireStoryboardContext: true };
    skillSlices = ["singleImage", "firstLast"];
    preflightCodes = ["PROMPT_GEN_MEDIA_MISSING"];
    reverseTrigger = "prompt_gen_media_missing";
  } else if (/seedance.*2[.\-]0/i.test(modelLower)) {
    modeId = mode || "multiParameter";
    templatePath = VID.seedance;
    mediaContract = { minRefs: 0, maxRefs: 99, requireStoryboardContext: true };
    skillSlices = ["multi"];
    preflightCodes = ["PROMPT_GEN_MEDIA_MISSING"];
    reverseTrigger = "prompt_gen_media_missing";
  }

  return {
    modality: "video",
    modeId,
    templatePath,
    mediaContract,
    skillSlices,
    preflightCodes,
    reverseTrigger,
    boundTemplateCompatible: isBoundCompatible(input.boundModelPromptPath, templatePath),
  };
}

export interface MediaPreflightInput {
  rules: GenerationModeRules;
  referenceCount: number;
  hasStoryboardContext?: boolean;
  hasAssetContext?: boolean;
}

export interface MediaPreflightResult {
  ok: boolean;
  code?: string;
  reverseTrigger?: string;
  message?: string;
}

/** Validate media/context against resolved mode rules. */
export function preflightGenerationMedia(input: MediaPreflightInput): MediaPreflightResult {
  const { rules, referenceCount } = input;
  const c = rules.mediaContract;

  if (rules.modality === "image") {
    if (referenceCount < c.minRefs || referenceCount > c.maxRefs) {
      return {
        ok: false,
        code: "IMAGE_MODE_REF_MISMATCH",
        reverseTrigger: "image_mode_ref_mismatch",
        message: `图像模式 ${rules.modeId} 需要 ${c.minRefs}-${c.maxRefs} 张参考图，当前 ${referenceCount}`,
      };
    }
    return { ok: true };
  }

  // video
  if (c.requireStoryboardContext && !input.hasStoryboardContext && !input.hasAssetContext) {
    return {
      ok: false,
      code: "PROMPT_GEN_CONTEXT_MISSING",
      reverseTrigger: "prompt_gen_media_missing",
      message: "缺少分镜或资产上下文，无法生成视频提示词",
    };
  }

  if (referenceCount < c.minRefs) {
    return {
      ok: false,
      code: "PROMPT_GEN_MEDIA_MISSING",
      reverseTrigger: "prompt_gen_media_missing",
      message: `模式 ${rules.modeId} 需要至少 ${c.minRefs} 个参考媒体，当前 ${referenceCount}`,
    };
  }
  if (c.maxRefs < 99 && referenceCount > c.maxRefs) {
    return {
      ok: false,
      code: "PROMPT_GEN_MEDIA_MISSING",
      reverseTrigger: "prompt_gen_media_missing",
      message: `模式 ${rules.modeId} 最多 ${c.maxRefs} 个参考媒体，当前 ${referenceCount}`,
    };
  }
  return { ok: true };
}

/** Build full storyboardItem XML attributes for video prompt user content. */
export function buildStoryboardItemXml(item: {
  videoDesc?: string | null;
  prompt?: string | null;
  track?: string | number | null;
  duration?: string | number | null;
  associateAssetsIds?: unknown;
  shouldGenerateImage?: unknown;
}): string {
  const ids = Array.isArray(item.associateAssetsIds)
    ? JSON.stringify(item.associateAssetsIds)
    : item.associateAssetsIds != null
      ? String(item.associateAssetsIds)
      : "[]";
  const should =
    item.shouldGenerateImage === true || item.shouldGenerateImage === 1 || item.shouldGenerateImage === "true"
      ? "true"
      : item.shouldGenerateImage === false || item.shouldGenerateImage === 0
        ? "false"
        : String(item.shouldGenerateImage ?? "");
  const esc = (s: unknown) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/'/g, "&#39;");
  return `<storyboardItem
  videoDesc='${esc(item.videoDesc)}'
  prompt='${esc(item.prompt ?? "")}'
  track='${esc(item.track ?? "")}'
  duration='${esc(item.duration ?? "")}'
  associateAssetsIds="${esc(ids)}"
  shouldGenerateImage="${esc(should)}"
></storyboardItem>`;
}
