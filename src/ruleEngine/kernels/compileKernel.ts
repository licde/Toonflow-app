/**
 * CompileKernel — single entry wrap around compileOrGenerateVideoPrompt + identity slots.
 */
import {
  compileOrGenerateVideoPrompt,
  applyModeDialect,
  postModeSanitize,
  type CompileOrGenerateInput,
  type CompileOrGenerateResult,
} from "../compilers/compileOrGenerateVideoPrompt";
import { sanitizeVideoPrompt } from "../compilers/sanitizeVideoPrompt";
import { finalizeFiveSectionPrompt } from "../compilers/finalizeFiveSectionPrompt";
import type { DesignFields } from "../design/designFieldRegistry";
import { canonicalModeId } from "./types";
import { assemblePromptWithSlots, buildIdentitySlots, buildMediaSlots } from "./promptKernel";

export { canonicalModeId, buildMediaSlots };

export async function compileOrGenerate(
  input: CompileOrGenerateInput & {
    charCodes?: string[];
    sceneCode?: string | null;
    propCodes?: string[];
    designFields?: DesignFields;
  },
): Promise<CompileOrGenerateResult & { identityBlock?: string }> {
  const mode = canonicalModeId(input.mode);
  const identitySlots = buildIdentitySlots({
    charCodes: input.charCodes,
    sceneCode: input.sceneCode,
    propCodes: input.propCodes,
  });

  const result = await compileOrGenerateVideoPrompt({ ...input, mode });

  const assembled = assemblePromptWithSlots({
    basePrompt: result.prompt,
    identitySlots,
    mediaSlots: input.slots?.map((s, i) => ({
      role: s.role,
      ordinal: i + 1,
      assetId: s.id,
      sources: s.sources,
      label: s.label,
    })),
    fields: input.designFields,
    modality: input.modality === "image" ? "image" : "video",
    mode,
  });

  const dialogueLines =
    input.dialogueLines ?? input.designShot?.narrative?.dialogue?.lines?.map((l) => l.text ?? "").filter(Boolean);
  const durationSec = result.generationWriteback?.durationSec ?? input.durationSec;
  let prompt = assembled.prompt;
  if (!promptIncludesModeAnchors(prompt, mode)) {
    prompt = postModeSanitize(applyModeDialect(prompt, mode), mode);
  }
  const fin = finalizeFiveSectionPrompt({
    prompt,
    dialogueLines,
    durationSec,
    preferStaticOnDialogue: Boolean(dialogueLines?.length),
  });
  prompt = fin.prompt;

  return {
    ...result,
    prompt,
    warnings: [...result.warnings, ...assembled.warnings, ...fin.conflicts],
    identityBlock: assembled.identitySlots.map((s) => s.code).join(","),
  };
}

/**
 * Per-mode matrix: each mode runs compileOrGenerate (template-bound).
 * Dialect only supplements missing structure anchors — never the sole body.
 */
export async function fillModeMatrix(input: {
  modes: string[];
  seedPrompt: string;
  charCodes?: string[];
  sceneCode?: string | null;
  propCodes?: string[];
  designFields?: DesignFields;
  modelName?: string | null;
  projectVideoRatio?: string | null;
  invokeLlm?: CompileOrGenerateInput["invokeLlm"];
  storyboard?: CompileOrGenerateInput["storyboard"];
  assets?: CompileOrGenerateInput["assets"];
}): Promise<Record<string, { prompt: string; modeId: string; source: string }>> {
  const out: Record<string, { prompt: string; modeId: string; source: string }> = {};
  const seed = input.seedPrompt?.trim() ?? "";

  for (const rawMode of input.modes) {
    const mode = canonicalModeId(rawMode);
    const gen = await compileOrGenerate({
      modality: "video",
      mode,
      modelName: input.modelName,
      storyboard: input.storyboard,
      assets: input.assets,
      projectVideoRatio: input.projectVideoRatio,
      charCodes: input.charCodes,
      sceneCode: input.sceneCode,
      propCodes: input.propCodes,
      designFields: input.designFields,
      existingPrompt: seed || undefined,
      preferCompile: true,
      invokeLlm: seed
        ? undefined
        : input.invokeLlm
          ? async (args) => input.invokeLlm!(args)
          : undefined,
    });

    let prompt = gen.prompt;
    // If seed exists and compile returned thin/empty, graft seed then apply dialect anchors only
    if (seed && (!prompt.trim() || prompt.trim().length < 40)) {
      prompt = applyModeDialect(seed, mode, seed);
      const identitySlots = buildIdentitySlots({
        charCodes: input.charCodes,
        sceneCode: input.sceneCode,
        propCodes: input.propCodes,
      });
      const assembled = assemblePromptWithSlots({
        basePrompt: prompt,
        identitySlots,
        fields: input.designFields,
        modality: "video",
        mode,
      });
      prompt = applyModeDialect(assembled.prompt, mode);
      out[rawMode] = { prompt, modeId: mode, source: "mode_matrix_seed_template" };
    } else {
      // Ensure mode structure anchors exist even on seeded compile path
      if (seed && !promptIncludesModeAnchors(prompt, mode)) {
        prompt = applyModeDialect(prompt.includes(seed) ? prompt : `${seed}\n${prompt}`, mode, seed);
      }
      out[rawMode] = {
        prompt,
        modeId: mode,
        source: gen.source === "llm" ? "mode_matrix_llm" : "mode_matrix_compile",
      };
    }
  }

  return out;
}

function promptIncludesModeAnchors(prompt: string, mode: string): boolean {
  const p = prompt.toLowerCase();
  switch (mode) {
    case "text":
      return /\[visual\]|\[motion\]|\[camera\]|text-to-video/i.test(prompt);
    case "singleImage":
      return /motion-from-frame|\[visual\]/i.test(prompt);
    case "startEndRequired":
      return /start_frame|end_frame/i.test(p);
    case "multiParameter":
      return /\[references\]|@图\d/.test(prompt);
    default:
      return true;
  }
}
