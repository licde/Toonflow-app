import type { StructuredScriptJson, StructuredShot } from "./types";
import { validateStructuredScript } from "./schema";
import { compileImage, compileVideo } from "../generationContext/PromptCompiler";
import { resolveReferenceCodes } from "../generationContext/ReferenceResolver";
import { selectVariantPrompt } from "../generationContext/VariantSelector";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  precheck: {
    unresolvedCodes: string[];
    missingVisualIds: number[];
    durationIssues: number[];
  };
}

/** Zod + GCE 预检（V 规则子集） */
export function validateStructuredScriptFull(
  data: unknown,
  opts?: { codeMap?: Map<string, number> },
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsed = validateStructuredScript(data);
  if (!parsed.success) {
    return {
      valid: false,
      errors: [parsed.error.message],
      warnings: [],
      precheck: { unresolvedCodes: [], missingVisualIds: [], durationIssues: [] },
    };
  }

  const json = parsed.data as StructuredScriptJson;
  if (json.version && json.version !== "1.0") {
    warnings.push(`JSON version ${json.version}，推荐 1.0`);
  }

  const unresolvedCodes: string[] = [];
  const missingVisualIds: number[] = [];
  const durationIssues: number[] = [];
  const codeMap = opts?.codeMap;

  for (const ep of json.episodes ?? []) {
    for (const shot of ep.storyboard ?? []) {
      const codes = resolveReferenceCodes(shot as StructuredShot);
      for (const c of codes) {
        if (codeMap && !codeMap.has(c) && !c.startsWith("CHAR-")) {
          if (!unresolvedCodes.includes(c)) unresolvedCodes.push(c);
        }
      }

      const charCode = shot.assetCodes?.find((c) => c.startsWith("CHAR-"));
      if (shot.visualId && charCode && json.characterAssets) {
        const { deriveCode } = selectVariantPrompt(shot as StructuredShot, json.characterAssets);
        if (shot.visualId && !deriveCode && !json.characterAssets[shot.visualId]) {
          missingVisualIds.push(shot.镜号);
        }
      }

      if (!shot.imagePrompt && !shot.videoPrompt) {
        warnings.push(`镜 ${shot.镜号} 缺少 imagePrompt/videoPrompt`);
      }

      try {
        const img = compileImage(shot as StructuredShot, { json, episode: ep });
        const vid = compileVideo(shot as StructuredShot, { json, episode: ep });
        if (vid.duration > 30) durationIssues.push(shot.镜号);
        if (!img.prompt) errors.push(`镜 ${shot.镜号} 编译后图片 prompt 为空`);
      } catch (e) {
        errors.push(`镜 ${shot.镜号} 编译失败: ${(e as Error).message}`);
      }
    }
  }

  if (unresolvedCodes.length) warnings.push(`未解析资产 CODE: ${unresolvedCodes.join(", ")}`);
  if (missingVisualIds.length) warnings.push(`visualId 可能无匹配变体: 镜 ${missingVisualIds.join(",")}`);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    precheck: { unresolvedCodes, missingVisualIds, durationIssues },
  };
}
