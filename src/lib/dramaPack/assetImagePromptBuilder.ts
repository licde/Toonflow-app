/**
 * 资产生图最终 prompt：compose/import 之后、润色/生图之前统一 enforce
 */

import { applyAssetPromptRules } from "./assetPromptRules";
import type { DramaPack } from "./schema";
import { parseLockCode } from "./schema";
import { detectAssetTier, type AssetTier } from "./assetTierUtils";
import { lookupLockFace, lookupLockFaceEnglish, lookupLockDescription } from "./characterAssetUtils";
import type { PackExtensionsContext } from "./packExtensionsResolver";

const T0_FOUR_VIEW_BLOCK =
  "character turnaround sheet, portrait closeup, front view, side view, back view, rear view, full body head to toe, neutral gray background #E8E8E8, four-view consistency, no crop";

const T1_WARDROBE_BLOCK =
  "single wardrobe reference image, same face as base character model, one pose only, costume and makeup focus";

function contains(text: string, frag: string): boolean {
  return text.toLowerCase().includes(frag.toLowerCase());
}

function mergeTag(existing: string, tag: string): string {
  if (!tag.trim() || contains(existing, tag)) return existing;
  return existing ? `${existing}, ${tag}` : tag;
}

export type BuildAssetImagePromptInput = {
  type: "role" | "scene" | "tool";
  dbPrompt: string;
  remark?: string | null;
  assetsId?: number | null;
  productionSpec?: DramaPack["productionSpec"];
  tier?: AssetTier;
  extensions?: PackExtensionsContext;
};

export function buildFinalAssetImagePrompt(input: BuildAssetImagePromptInput): string {
  const { type, remark, assetsId, productionSpec } = input;
  const tier = input.tier ?? detectAssetTier(remark, assetsId);
  let prompt = (input.dbPrompt || "").trim();

  if (type === "scene") {
    prompt = applyAssetPromptRules("scene", prompt, productionSpec);
    prompt = mergeTag(prompt, "no people, no characters, no human figures");
    prompt = mergeTag(prompt, "empty environment, cinematic establishing shot");
  } else if (type === "tool") {
    prompt = applyAssetPromptRules("tool", prompt, productionSpec);
    prompt = mergeTag(prompt, "isolated product shot, studio lighting");
    prompt = mergeTag(prompt, "no hands, no person, no human limbs");
    prompt = mergeTag(prompt, "1:1 aspect ratio");
  } else if (type === "role") {
    const lockCode = parseLockCode(remark ?? "");
    const charCode = lockCode?.startsWith("CHAR-") ? lockCode.split(":")[0] : undefined;
    const entry = charCode ? (input.extensions?.characterAssets?.[charCode] as Record<string, unknown> | undefined) : undefined;
    const lockFace = lookupLockFaceEnglish(entry) || lookupLockFace(entry);
    const lockDesc = lookupLockDescription(entry);

    if (tier === "t1_wardrobe" || tier === "derive_child") {
      if (lockFace && !contains(prompt, "lock face")) {
        prompt = `lock face: ${lockFace}, ${prompt}`;
      } else if (lockDesc && !contains(prompt, "lock face") && lockDesc.length < 200) {
        prompt = `lock face: ${lockDesc.slice(0, 120)}, ${prompt}`;
      }
      prompt = prompt
        .replace(/,?\s*four-view character sheet/gi, "")
        .replace(/,?\s*character turnaround sheet/gi, "")
        .replace(/,?\s*back view/gi, "")
        .replace(/,?\s*rear view/gi, "")
        .replace(/,?\s*side view/gi, "")
        .replace(/,?\s*front view/gi, "");
      prompt = mergeTag(prompt, T1_WARDROBE_BLOCK);
      prompt = mergeTag(prompt, "16:9 aspect ratio");
    } else if (tier === "t0_base") {
      for (const tag of T0_FOUR_VIEW_BLOCK.split(", ")) {
        prompt = mergeTag(prompt, tag);
      }
    }
  }

  return prompt.replace(/\s+/g, " ").trim();
}

export function validateAssetPrompt(type: string, tier: AssetTier, prompt: string): string[] {
  const missing: string[] = [];
  if (type === "scene") {
    if (!contains(prompt, "no people") && !contains(prompt, "no characters")) missing.push("no people");
  }
  if (type === "tool") {
    if (!contains(prompt, "isolated")) missing.push("isolated");
  }
  if (type === "role" && tier === "t0_base") {
    if (!contains(prompt, "back view") && !contains(prompt, "rear view")) missing.push("back view");
    if (!contains(prompt, "front view")) missing.push("front view");
  }
  return missing;
}

export function assetImageWrapper(
  type: "role" | "scene" | "tool",
  tier: AssetTier,
  artStyle: string,
  name: string,
  finalPrompt: string,
): string {
  const typeLabel =
    type === "role"
      ? tier === "t1_wardrobe" || tier === "derive_child"
        ? "角色服化单图"
        : "角色标准四视图"
      : type === "scene"
        ? "标准场景图"
        : "标准道具图";
  return `Generate ${typeLabel}. Art style: ${artStyle || "unspecified"}. Asset name: ${name}. Prompt: ${finalPrompt}`;
}
