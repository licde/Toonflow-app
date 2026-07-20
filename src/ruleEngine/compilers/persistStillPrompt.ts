/**
 * Persist composed still prompt onto o_storyboard (no image spend).
 */
import type { Knex } from "knex";
import {
  assertStillPromptClean,
  composeStillPrompt,
  computeComposeHash,
  isDirtyStillPrompt,
  resolveComposeMode,
  scrubStillPromptNoise,
  shouldDefaultFidelityCompose,
  stripIdentityTokens,
  stripStaleBindingFromPrevious,
  type ComposeMode,
  type ComposeStillResult,
} from "./composeStillPrompt";
import { hydrateComposeStillContext } from "./hydrateComposeStillContext";
import { mergeReasonMeta, parseStillMetaFromReason } from "./stillQuality";

export async function composeAndPersistStillPrompt(
  db: Knex,
  input: {
    projectId: number;
    storyboardId: number;
    scriptId?: number;
    mode?: ComposeMode;
    rawPrompt?: string;
    referenceUrlCount?: number;
    qualityMode?: "hq_update" | "draft";
  },
): Promise<{ ok: boolean; result: ComposeStillResult; prompt?: string; blockReason?: string }> {
  const row = await db("o_storyboard").where({ id: input.storyboardId }).first();
  if (!row) {
    return {
      ok: false,
      result: {
        ok: false,
        prompt: "",
        visualBody: "",
        didSynthesize: false,
        scrubbed: false,
        composeMode: input.mode ?? "full",
        sources: [],
        warnings: [],
        entityAnchors: [],
        compositionContractApplied: false,
        complianceHit: false,
        qp02Blocked: true,
        missingLeadAsset: false,
        dirtyInput: true,
        blockReason: "storyboard not found",
        userMessage: "分镜不存在",
      },
      blockReason: "storyboard not found",
    };
  }

  const meta = parseStillMetaFromReason(row.reason);
  const existingPrompt = String(input.rawPrompt ?? row.prompt ?? "");
  const ctx = await hydrateComposeStillContext(db, {
    projectId: input.projectId,
    storyboardId: input.storyboardId,
    scriptId: input.scriptId ?? row.scriptId,
    rawPrompt: existingPrompt,
    qualityMode: input.qualityMode ?? "hq_update",
    referenceUrlCount: input.referenceUrlCount ?? 0,
    purpose: "compose",
  });
  const currentHash = computeComposeHash(ctx);
  const mode = resolveComposeMode({
    requested: input.mode,
    existingPrompt,
    promptState: meta?.promptState,
    composeHash: meta?.composeHash,
    currentHash,
    preferFidelity: shouldDefaultFidelityCompose(ctx),
  });

  if (meta?.promptUsed || row.prompt) {
    ctx.previousVisualBody = stripStaleBindingFromPrevious(
      scrubStillPromptNoise(stripIdentityTokens(String(meta?.promptUsed ?? row.prompt)).body).cleaned,
    );
  }

  const result = composeStillPrompt(ctx, { mode });
  if (!result.ok) {
    return { ok: false, result, blockReason: result.blockReason };
  }

  // Gate: never persist contract-shell / dirty noise (recipe-at-end composed prompts are OK)
  const clean = assertStillPromptClean(result.visualBody);
  if (!clean.ok && isDirtyStillPrompt(result.visualBody)) {
    return {
      ok: false,
      result: {
        ...result,
        ok: false,
        blockReason: clean.reason ?? "dirty still prompt blocked",
        userMessage: "提示词仍是契约空壳，已禁止入库；请先补画面描述",
      },
      blockReason: clean.reason,
    };
  }

  // Pipeline SSOT: persist egress (literary body + safe tails), not raw assemble-collapse risk
  const { runStillPromptPipeline } = await import("./stillPromptPipeline");
  const { buildIdentitySlots } = await import("../kernels/promptKernel");
  const { extractDesignFields } = await import("../design/designFieldRegistry");
  const imagedCodes = (ctx.characters ?? [])
    .filter((c) => c.kind !== "scene" && c.hasImage && c.code)
    .map((c) => String(c.code).toUpperCase());
  const pipeline = runStillPromptPipeline({
    composed: result,
    description: ctx.visualDescription ?? ctx.videoDesc ?? result.visualBody,
    characterNames: (ctx.characters ?? []).map((c) => c.name).filter(Boolean) as string[],
    identitySlots: buildIdentitySlots({
      charCodes: imagedCodes,
      sceneCode: ctx.sceneCode ?? null,
    }),
    fields: extractDesignFields({
      modality: "image",
      charCodes: imagedCodes,
      storyboard: {
        duration: row.duration,
        fxPrompt: row.fxPrompt ?? row.visualEffect,
        audioPrompt: row.audioPrompt,
        videoDesc: row.videoDesc,
        track: row.track,
      },
    }),
    aspectRatioFallback: ctx.videoRatio ?? undefined,
    modality: "image",
  });
  const promptToStore = pipeline.egressPrompt || result.prompt;
  const promptState =
    mode === "fidelity" ? "fidelity" : mode === "refine" ? "refined" : "composed";

  await db("o_storyboard")
    .where({ id: input.storyboardId })
    .update({
      prompt: promptToStore,
      reason: mergeReasonMeta(row.reason, {
        promptState,
        composeMode: mode,
        composeHash: currentHash,
        composedAt: new Date().toISOString(),
        composeSources: result.sources,
        entityAnchors: result.entityAnchors,
        didSynthesize: result.didSynthesize,
        scrubbed: result.scrubbed,
        promptUsed: promptToStore.slice(0, 2000),
        literaryChars: pipeline.literaryChars,
        collapsed: pipeline.collapsed,
        autoHealed: pipeline.autoHealed,
        pipelineVersion: pipeline.pipelineVersion,
      }),
    });

  return { ok: true, result, prompt: promptToStore };
}

export async function batchComposeAndPersistStillPrompts(
  db: Knex,
  input: {
    projectId: number;
    scriptId: number;
    storyboardIds: number[];
    mode?: ComposeMode;
  },
): Promise<{
  results: Array<{
    storyboardId: number;
    ok: boolean;
    prompt?: string;
    userMessage?: string;
    blockReason?: string;
    composeMode?: string;
  }>;
}> {
  const results: Array<{
    storyboardId: number;
    ok: boolean;
    prompt?: string;
    userMessage?: string;
    blockReason?: string;
    composeMode?: string;
  }> = [];
  for (const id of input.storyboardIds) {
    const out = await composeAndPersistStillPrompt(db, {
      projectId: input.projectId,
      scriptId: input.scriptId,
      storyboardId: id,
      mode: input.mode ?? "full",
    });
    results.push({
      storyboardId: id,
      ok: out.ok,
      prompt: out.prompt,
      userMessage: out.result.userMessage ?? out.result.blockReason,
      blockReason: out.result.blockReason ?? out.blockReason,
      composeMode: out.result.composeMode,
    });
  }
  return { results };
}
