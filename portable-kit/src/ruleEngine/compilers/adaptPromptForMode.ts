/**
 * Mode adapt = alias of compileKernel (no shallow [mode=] tags).
 */
import { applyModeDialect, postModeSanitize } from "./compileOrGenerateVideoPrompt";
import { sanitizeVideoPrompt } from "./sanitizeVideoPrompt";
import { compileOrGenerate } from "../kernels/compileKernel";
import { resolveGenerationModeRules, type GenerationModality } from "./resolveGenerationModeRules";

export interface AdaptPromptInput {
  modality: GenerationModality;
  fromMode?: string | null;
  toMode: string;
  prompt: string;
  modelName?: string | null;
  storyboardContext?: string;
  referenceCount?: number;
  modelPromptRoot?: string;
  projectVideoRatio?: string | null;
  invokeLlm?: (args: { system: string; user: string; assistant?: string }) => Promise<string>;
  storyboard?: Parameters<typeof compileOrGenerate>[0]["storyboard"];
  assets?: Parameters<typeof compileOrGenerate>[0]["assets"];
  slots?: Parameters<typeof compileOrGenerate>[0]["slots"];
  pkg?: Parameters<typeof compileOrGenerate>[0]["pkg"];
  storyboardId?: number;
  charCodes?: string[];
  sceneCode?: string | null;
  propCodes?: string[];
}

export interface AdaptPromptResult {
  prompt: string;
  modeId: string;
  templatePath: string;
  mediaContract: ReturnType<typeof resolveGenerationModeRules>["mediaContract"];
  adapted: boolean;
  note?: string;
  source?: string;
  warnings?: string[];
}

export async function adaptPromptForMode(input: AdaptPromptInput): Promise<AdaptPromptResult> {
  const storyboard =
    input.storyboard ??
    (input.storyboardContext
      ? [{ videoDesc: input.storyboardContext, prompt: input.prompt }]
      : [{ videoDesc: input.prompt, prompt: input.prompt }]);

  const result = await compileOrGenerate({
    modality: input.modality === "image" ? "image" : "video",
    mode: input.toMode,
    modelName: input.modelName,
    existingPrompt: input.prompt,
    fromMode: input.fromMode,
    modelPromptRoot: input.modelPromptRoot,
    projectVideoRatio: input.projectVideoRatio,
    invokeLlm: input.invokeLlm,
    storyboard,
    assets: input.assets,
    slots: input.slots,
    pkg: input.pkg,
    storyboardId: input.storyboardId,
    preferCompile: Boolean(input.pkg && input.storyboardId),
    charCodes: input.charCodes,
    sceneCode: input.sceneCode,
    propCodes: input.propCodes,
  });

  const old = (input.prompt ?? "").trim();
  return {
    prompt: result.prompt,
    modeId: result.modeId,
    templatePath: result.templatePath,
    mediaContract: result.mediaContract,
    adapted: result.prompt.trim() !== old,
    note: result.source,
    source: result.source,
    warnings: result.warnings,
  };
}

/** Sync dialect helper for tests / FE soft path without LLM */
export function adaptPromptForModeSync(prompt: string, toMode: string, modelName?: string): AdaptPromptResult {
  const rules = resolveGenerationModeRules({ modality: "video", mode: toMode, modelName });
  const san = sanitizeVideoPrompt({ prompt });
  const next = postModeSanitize(applyModeDialect(san.prompt, rules.modeId, san.prompt), rules.modeId);
  return {
    prompt: next,
    modeId: rules.modeId,
    templatePath: rules.templatePath,
    mediaContract: rules.mediaContract,
    adapted: next.trim() !== (prompt ?? "").trim(),
    note: "sync_dialect",
    source: "sync_dialect",
  };
}

/** Truncate reference list length to mediaContract.maxRefs (keep first N). */
export function trimRefsToContract<T>(refs: T[], maxRefs: number): T[] {
  if (maxRefs < 0) return refs;
  if (refs.length <= maxRefs) return refs;
  return refs.slice(0, maxRefs);
}

export { applyModeDialect };
