/**
 * CompileKernel — single entry wrap; prefers compileVideoPromptSpine when design material exists.
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
import { compileVideoPromptSpine } from "../compilers/compileVideoPromptSpine";
import { hydrateShotCompileContextSync } from "../compilers/hydrateShotCompileContext";
import { resolveGenerationModeRules } from "../compilers/resolveGenerationModeRules";
import { LANGUAGE_POLICY } from "../codes/assetCodeContract";

export { canonicalModeId, buildMediaSlots };

export async function compileOrGenerate(
  input: CompileOrGenerateInput & {
    charCodes?: string[];
    sceneCode?: string | null;
    propCodes?: string[];
    designFields?: DesignFields;
    agentPlan?: Record<string, unknown> | null;
    shotIndex?: number | null;
  },
): Promise<CompileOrGenerateResult & { identityBlock?: string; spineReady?: boolean; spineCode?: string }> {
  const mode = canonicalModeId(input.mode);
  const identitySlots = buildIdentitySlots({
    charCodes: input.charCodes,
    sceneCode: input.sceneCode,
    propCodes: input.propCodes,
  });
  const rules = resolveGenerationModeRules({
    modality: input.modality ?? "video",
    mode,
    modelName: input.modelName,
    referenceCount: input.slots?.length ?? 0,
  });
  const baseMeta = {
    modeId: rules.modeId,
    templatePath: rules.templatePath,
    mediaContract: rules.mediaContract,
    languagePolicy: LANGUAGE_POLICY,
    aspectRatio: input.projectVideoRatio?.replace(/\s/g, "") || undefined,
  };

  // Spine-first when designShot / storyboard VD / dialogue available
  const storyboard0 = input.storyboard?.[0];
  const seedFromSb = String(storyboard0?.videoDesc ?? storyboard0?.prompt ?? input.existingPrompt ?? "").trim();
  const ctx = hydrateShotCompileContextSync({
    designShot: input.designShot ?? null,
    shotMeta: input.designShot
      ? null
      : storyboard0
        ? {
            visualDescription: (storyboard0 as { visualDescription?: string }).visualDescription,
            videoDesc: storyboard0.videoDesc,
            prompt: seedFromSb,
            duration: (storyboard0 as { duration?: number }).duration,
            shotSize: (storyboard0 as { shotSize?: string }).shotSize,
            narrative: (storyboard0 as { narrative?: Record<string, unknown> }).narrative,
          }
        : null,
    seedPrompt: seedFromSb,
    shotIndex: input.shotIndex ?? input.designShot?.shotIndex ?? null,
    vendorId: input.modelName?.split(":")[0] ?? null,
  });

  let result: CompileOrGenerateResult;
  let spineReady: boolean | undefined;
  let spineCode: string | undefined;

  if (ctx.canAuthorFromDesign || input.preferCompile) {
    const spine = compileVideoPromptSpine({
      ctx,
      designShot: input.designShot,
      seedPrompt: seedFromSb,
      agentPlan: input.agentPlan ?? null,
      modeId: mode,
      forceRebuild: true,
      includeSidecar: Boolean(input.agentPlan),
      vendorId: ctx.vendorId,
    });
    spineReady = spine.ready;
    spineCode = spine.readyCode;
    result = {
      ...baseMeta,
      prompt: spine.prompt,
      source: "prompt_ir",
      warnings: spine.warnings,
      generationWriteback: {
        videoPrompt: spine.generationWriteback.videoPrompt,
        durationSec: spine.durationSec,
      },
      sanitizeConflicts: spine.readyReasons,
    };
    // LLM only when context insufficient AND seed stub — plan decision #6
    if (!spine.ready && !ctx.canAuthorFromDesign && input.invokeLlm) {
      result = await compileOrGenerateVideoPrompt({ ...input, mode, preferCompile: false });
    }
  } else {
    result = await compileOrGenerateVideoPrompt({ ...input, mode });
  }

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
    input.dialogueLines ??
    ctx.dialogueLines ??
    input.designShot?.narrative?.dialogue?.lines?.map((l) => l.text ?? "").filter(Boolean);
  const durationSec = result.generationWriteback?.durationSec ?? ctx.durationSec ?? input.durationSec;
  let prompt = assembled.prompt;
  // Dialect only supplements missing structure anchors — never sole body author
  if (!/\[Visual\]/i.test(prompt) && !promptIncludesModeAnchors(prompt, mode)) {
    prompt = postModeSanitize(applyModeDialect(prompt, mode), mode);
  }
  const fin = finalizeFiveSectionPrompt({
    prompt,
    dialogueLines,
    durationSec,
    preferStaticOnDialogue: Boolean(dialogueLines?.length),
  });
  prompt = fin.prompt;

  // Final sanitize pass (no second viral append here)
  prompt = sanitizeVideoPrompt({
    prompt,
    dialogueLines,
    durationSec,
    modeId: mode,
  }).prompt;

  return {
    ...result,
    prompt,
    warnings: [...result.warnings, ...assembled.warnings, ...fin.conflicts],
    identityBlock: assembled.identitySlots.map((s) => s.code).join(","),
    spineReady,
    spineCode,
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
