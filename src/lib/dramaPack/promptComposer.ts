import { DramaPack, DramaPackStoryboardShot, VisualLockItem } from "./schema";
import { applyProductionRules } from "./productionRuleEngine";
import {
  type PackExtensionsContext,
  lookupTurnaroundPrompt,
  lookupCharacterStagePrompt,
  parsePackExtensions,
} from "./packExtensionsResolver";
import { resolveWardrobeAssociateCodes } from "./packFieldRegistry";
import { isEmotionStageName } from "./tieredAssetPolicy";
import { shouldSkipT1ForChar } from "./personaPolicy";
import { applyAssetPromptRules } from "./assetPromptRules";
import { enrichRoleDescribe, lookupLockFace, lookupLockFaceEnglish, stripFaceTokensFromWardrobePrompt } from "./characterAssetUtils";

export type PromptSource = "import" | "ai" | "manual";

function promptContains(text: string, fragment: string): boolean {
  if (!fragment.trim()) return true;
  return text.toLowerCase().includes(fragment.toLowerCase());
}

function mergeFragment(existing: string, fragment: string): string {
  if (!fragment.trim()) return existing;
  if (promptContains(existing, fragment)) return existing;
  return existing ? `${fragment}, ${existing}` : fragment;
}


export type ComposedAsset = {
  code: string;
  name: string;
  type: "role" | "scene" | "tool";
  prompt: string;
  describe: string;
  remark: string;
  promptSource: PromptSource;
  stages?: VisualLockItem["stages"];
};

export type ComposedShot = {
  imagePrompt: string;
  videoDesc: string;
  videoPrompt: string;
  track: string;
  shouldGenerateImage: number;
  promptSource: PromptSource;
  assetCodes: string[];
  associateCodes: string[];
  duration: number;
  postProductionHints?: Record<string, string>;
};

export type CodeIndex = {
  byCode: Record<string, { name: string; type: string }>;
  charStages: Record<string, { charCode: string; charName: string; stageName: string; visualMark: string }>;
  keyPromptVideo: Record<string, string>;
};

function buildCodeIndex(pack: DramaPack): CodeIndex {
  const byCode: CodeIndex["byCode"] = {};
  const charStages: CodeIndex["charStages"] = {};

  for (const c of pack.plan.visualLock?.characters ?? []) {
    const baseName = c.name.split("（")[0].split("(")[0].trim();
    byCode[c.code] = { name: c.name, type: "role" };
    for (const s of c.stages ?? []) {
      const keys = [`${baseName}-${s.name}`, `${c.name}-${s.name}`];
      for (const key of keys) {
        charStages[key] = { charCode: c.code, charName: c.name, stageName: s.name, visualMark: s.visualMark || "" };
      }
    }
    charStages[baseName] = { charCode: c.code, charName: c.name, stageName: "", visualMark: "" };
  }
  for (const s of pack.plan.visualLock?.scenes ?? []) {
    byCode[s.code] = { name: s.name, type: "scene" };
  }
  for (const p of pack.plan.visualLock?.props ?? []) {
    byCode[p.code] = { name: p.name, type: "tool" };
  }

  const keyPromptVideo: Record<string, string> = {};
  for (const ep of pack.episodes) {
    for (const kp of ep.keyPrompts ?? []) {
      if (kp.scene && kp.videoPrompt) keyPromptVideo[kp.scene] = kp.videoPrompt;
    }
  }

  return { byCode, charStages, keyPromptVideo };
}

/**
 * 资产生图 prompt：visualLock.prompt 直通，不注入 art_skills 整本手册。
 * 手册仅用于 batchGenerateAssetsImage / polishAssetsPrompt 的 AI system，不应写入 o_assets.prompt。
 */
export function composeAssetPrompt(
  _artStyle: string,
  _type: "role" | "scene" | "tool",
  item: VisualLockItem,
  _globalStyle?: DramaPack["plan"]["visualLock"]["globalStyle"],
  isDerivative = false,
  stageVisualMark?: string,
  extensions?: PackExtensionsContext,
): string {
  const turnaround = !isDerivative && _type === "role" ? lookupTurnaroundPrompt(extensions, item.code) : "";
  const basePrompt = (turnaround || item.prompt || "").trim();
  let prompt = basePrompt;

  if (isDerivative && stageVisualMark?.trim() && !promptContains(prompt, stageVisualMark.slice(0, 8))) {
    prompt = mergeFragment(prompt, stageVisualMark);
  }

  // 双层锁脸：硬特征主锚 + 轻度自然波动说明，避免全局僵硬同脸
  if (item.lockFace?.trim()) {
    const hardLock = item.lockFace.trim();
    const hardPrefix = `lock face: ${hardLock}`;
    if (!promptContains(prompt, hardLock.slice(0, 6))) {
      prompt = mergeFragment(prompt, hardPrefix);
    }
    const softHint = "same face as base character, allow subtle variation in expression and hairstyle only";
    if (!promptContains(prompt, "allow subtle variation")) {
      prompt = mergeFragment(prompt, softHint);
    }
  }

  if (!prompt.trim() && item.desc?.trim()) {
    prompt = item.desc.trim();
  }

  return prompt.replace(/\s+/g, " ").trim();
}

/** 场景/道具资产：合并 productionSpec 中的色温与描述 */
function mergeScenePropSpecHints(
  code: string,
  type: "scene" | "tool",
  prompt: string,
  productionSpec?: DramaPack["productionSpec"],
): string {
  if (!productionSpec) return prompt;
  let result = prompt;

  if (type === "scene") {
    const locks = productionSpec.sceneColorLock as
      | Array<{ scene?: string; baseTemp?: number | string; tone?: string }>
      | undefined;
    const lock = locks?.find((l) => l.scene === code);
    if (lock?.tone && !promptContains(result, lock.tone.slice(0, 4))) {
      result = mergeFragment(result, lock.tone);
    }
    if (lock?.baseTemp != null && !promptContains(result, String(lock.baseTemp))) {
      result = mergeFragment(result, `color temperature ${lock.baseTemp}K`);
    }
    const sceneDesign = productionSpec.sceneDesign as Record<string, { desc?: string }> | undefined;
    if (sceneDesign?.[code]?.desc && result.length < 40) {
      result = mergeFragment(result, sceneDesign[code].desc!);
    }
  }

  if (type === "tool") {
    const propDesign = productionSpec.propDesign as Record<string, { desc?: string }> | undefined;
    if (propDesign?.[code]?.desc && !promptContains(result, propDesign[code].desc!.slice(0, 8))) {
      result = mergeFragment(result, propDesign[code].desc!);
    }
  }

  return result.replace(/\s+/g, " ").trim();
}

export function resolveVisualIdCodes(visualId: string | undefined, index: CodeIndex, assetCodes: string[] = [], extensions?: PackExtensionsContext, shot?: DramaPackStoryboardShot): string[] {
  return resolveWardrobeAssociateCodes(visualId, index, assetCodes, extensions, shot);
}

export async function composeStoryboardShot(
  shot: DramaPackStoryboardShot,
  pack: DramaPack,
  artStyle: string,
  index: CodeIndex,
  shotIndex: number,
  prevIntensity?: number,
  extensions?: PackExtensionsContext,
): Promise<ComposedShot> {
  return applyProductionRules(shot, pack, artStyle, index, shotIndex, "merge", prevIntensity, extensions);
}

export function matchTrackVideoPrompt(
  trackKey: string,
  shots: ComposedShot[],
  keyPrompts: DramaPack["episodes"][0]["keyPrompts"],
): string {
  for (const kp of keyPrompts ?? []) {
    if (!kp.videoPrompt) continue;
    const matched = shots.some((s) => s.videoDesc.includes(kp.scene) || s.imagePrompt.includes(kp.scene));
    if (matched) return kp.videoPrompt;
  }
  const firstWithVp = shots.find((s) => s.videoPrompt);
  return firstWithVp?.videoPrompt || keyPrompts?.[0]?.videoPrompt || "";
}

export async function composePackAssets(
  pack: DramaPack,
  artStyle: string,
  extensions?: PackExtensionsContext,
): Promise<ComposedAsset[]> {
  const globalStyle = pack.plan.visualLock?.globalStyle;
  const result: ComposedAsset[] = [];
  const lock = pack.plan.visualLock;

  for (const item of lock?.characters ?? []) {
    result.push({
      code: item.code,
      name: item.name,
      type: "role",
      prompt: composeAssetPrompt(artStyle, "role", item, globalStyle, false, undefined, extensions),
      describe: enrichRoleDescribe(extensions?.characterAssets?.[item.code] as Record<string, unknown> | undefined, [item.desc, item.lockFace ? `面部锚点：${item.lockFace}` : ""].filter(Boolean).join("；")),
      remark: `lockCode:${item.code}`,
      promptSource: "import",
      stages: item.stages,
    });
    for (const stage of item.stages ?? []) {
      if (isEmotionStageName(stage.name)) continue;
      if (shouldSkipT1ForChar(item.code, extensions?.characterAssets?.[item.code] as Record<string, unknown> | undefined)) {
        continue;
      }
      const stagePrompt =
        lookupCharacterStagePrompt(extensions, `${item.code}-${stage.name}`, [item.code]) ||
        lookupCharacterStagePrompt(extensions, `${item.name.split("（")[0]}-${stage.name}`, [item.code]) ||
        stage.visualMark ||
        "";
      const lockFace = lookupLockFaceEnglish(extensions?.characterAssets?.[item.code] as Record<string, unknown> | undefined);
      const strippedStage = stagePrompt.trim() ? stripFaceTokensFromWardrobePrompt(stagePrompt.replace(/\s*--cref.*$/i, "").replace(/\s*--sref.*$/i, "").trim()) : "";
      const rawStagePrompt = strippedStage
        ? strippedStage
        : composeAssetPrompt(artStyle, "role", item, globalStyle, true, stage.visualMark, extensions);
      const facePrefix = lockFace ? `lock face: ${lockFace}, same face as base character, allow subtle variation in expression and hairstyle only, ` : "";
      const finalStagePrompt = /^lock face:/i.test(rawStagePrompt) ? rawStagePrompt : `${facePrefix}${rawStagePrompt}`;
      result.push({
        code: `${item.code}:${stage.name}`,
        name: `${item.name}-${stage.name}`,
        type: "role",
        prompt: finalStagePrompt,
        describe: enrichRoleDescribe(
          extensions?.characterAssets?.[item.code] as Record<string, unknown> | undefined,
          [`服化：${stage.name}`, stage.visualMark || stage.episodeRange || ""].filter(Boolean).join("；"),
        ),
        remark: `lockCode:${item.code}:${stage.name}`,
        promptSource: "import",
      });
    }
  }
  for (const item of lock?.scenes ?? []) {
    const basePrompt = composeAssetPrompt(artStyle, "scene", item, globalStyle);
    result.push({
      code: item.code,
      name: item.name,
      type: "scene",
      prompt: applyAssetPromptRules("scene", mergeScenePropSpecHints(item.code, "scene", basePrompt, pack.productionSpec), pack.productionSpec),
      describe: item.desc || "",
      remark: `lockCode:${item.code}`,
      promptSource: "import",
    });
  }
  for (const item of lock?.props ?? []) {
    const basePrompt = composeAssetPrompt(artStyle, "tool", item, globalStyle);
    result.push({
      code: item.code,
      name: item.name,
      type: "tool",
      prompt: applyAssetPromptRules("tool", mergeScenePropSpecHints(item.code, "tool", basePrompt, pack.productionSpec), pack.productionSpec),
      describe: item.desc || "",
      remark: `lockCode:${item.code}`,
      promptSource: "import",
    });
  }
  return result;
}

export function buildCodeIndexFromPack(pack: DramaPack): CodeIndex {
  return buildCodeIndex(pack);
}

export { parsePackExtensions, type PackExtensionsContext } from "./packExtensionsResolver";

// Re-export for consumers
export { buildStandardVideoDesc, extractShotMeta, suggestImageQuality, getAiFailoverHint } from "./productionRuleEngine";
