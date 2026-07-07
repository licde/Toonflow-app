/** 资产生图 prompt：注入 imagePromptRules + sceneGenerationRules（分镜规则不适用于资产时按 type 映射） */

import type { DramaPack } from "./schema";
import { getImagePromptRuleForType } from "./imagePromptRuleParser";

function promptContains(text: string, fragment: string): boolean {
  if (!fragment.trim()) return true;
  return text.toLowerCase().includes(fragment.toLowerCase());
}

function mergeFragment(existing: string, fragment: string): string {
  if (!fragment.trim()) return existing;
  if (promptContains(existing, fragment)) return existing;
  return existing ? `${fragment}, ${existing}` : fragment;
}

function stripForbidden(prompt: string, words: string[]): string {
  let result = prompt;
  for (const word of words) {
    if (!word.trim()) continue;
    const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    result = result.replace(re, "").replace(/\s+/g, " ").trim();
  }
  return result;
}

const ASSET_RULE_TYPE: Record<"scene" | "tool", string> = {
  scene: "PURE-SCENE",
  tool: "PURE-PROP",
};

/** 场景/道具资产 prompt 应用 productionSpec 约束 */
export function applyAssetPromptRules(
  type: "scene" | "tool",
  prompt: string,
  productionSpec?: DramaPack["productionSpec"],
): string {
  if (!productionSpec) return prompt;
  let result = prompt;

  const ruleType = ASSET_RULE_TYPE[type];
  const parsed = getImagePromptRuleForType(productionSpec as Record<string, unknown>, ruleType);
  if (parsed) {
    for (const frag of parsed.mustInclude) {
      result = mergeFragment(result, frag);
    }
    result = stripForbidden(result, parsed.mustNot);
  }

  if (type === "scene") {
    const sceneRules = productionSpec.sceneGenerationRules as
      | Record<string, { forbidden?: string[] }>
      | undefined;
    const indoor = sceneRules?.["室内场景"];
    if (indoor?.forbidden?.length) {
      const enMap: Record<string, string> = {
        人物: "people",
        动物: "animals",
        天气变化: "weather change",
        室外景观: "outdoor landscape",
        特写人脸: "close-up face",
      };
      for (const f of indoor.forbidden) {
        const en = enMap[f] || f;
        result = stripForbidden(result, [en, f]);
      }
      if (!promptContains(result, "no people")) {
        result = mergeFragment(result, "no people, no characters");
      }
    }
  }

  if (type === "tool") {
    if (!promptContains(result, "isolated")) {
      result = mergeFragment(result, "isolated product shot");
    }
    if (!promptContains(result, "1:1")) {
      result = mergeFragment(result, "1:1 aspect ratio");
    }
  }

  return result.replace(/\s+/g, " ").trim();
}
