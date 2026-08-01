/**
 * Persist composed still prompt onto o_storyboard (no image spend).
 */
import type { Knex } from "knex";
import {
  assertStillPromptClean,
  buildStillPreviousIngress,
  composeStillPrompt,
  computeComposeHash,
  isDirtyStillPrompt,
  shouldDefaultFidelityCompose,
  type ComposeMode,
  type ComposeStillResult,
} from "./composeStillPrompt";
import { hydrateComposeStillContext } from "./hydrateComposeStillContext";
import { mergeReasonMeta } from "./stillQuality";
import { hashLiteraryDesc } from "../qc/stillFirstFrameGate";

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
  const ingress = buildStillPreviousIngress({
    reason: row.reason,
    storedPrompt: row.prompt,
    requestPrompt: existingPrompt,
    requestedMode: input.mode,
    currentHash,
    preferFidelity: shouldDefaultFidelityCompose(ctx),
    loadPrevious: true,
  });
  const meta = ingress.prevMeta;
  ctx.previousVisualBody = ingress.previousVisualBody;
  let result = composeStillPrompt(ctx, { mode: ingress.effectiveMode });
  if (!result.ok) {
    return { ok: false, result, blockReason: result.blockReason };
  }

  // M5: PROMPT-FIDELITY — heal dual-write, never persist-block
  try {
    const { assertPromptDesignFidelity } =
      require("../quality/assertPromptDesignFidelity") as typeof import("../quality/assertPromptDesignFidelity");
    const { healPromptFidelityAnchors } =
      require("../design/healPromptFidelityAnchors") as typeof import("../design/healPromptFidelityAnchors");
    let imagePrompt = result.visualBody || result.prompt;
    const fid = assertPromptDesignFidelity({
      shot: {
        visualDescription: ctx.visualDescription,
        duration: row.duration,
        charCodes: (ctx.characters ?? []).map((c) => c.code).filter(Boolean),
      },
      knownNames: (ctx.characters ?? []).map((c) => c.name).filter(Boolean) as string[],
      imagePrompt,
      stage: "compose",
      fidelityHard: false,
    });
    if (fid.findings.some((f) => f.id === "PROMPT-FIDELITY")) {
      const healed = healPromptFidelityAnchors({
        visualDescription: ctx.visualDescription,
        visualBody: imagePrompt,
        knownNames: (ctx.characters ?? []).map((c) => c.name).filter(Boolean) as string[],
      });
      if (healed.visualDescription) ctx.visualDescription = healed.visualDescription;
      result = {
        ...result,
        visualBody: healed.visualBody,
        sources: [...result.sources, ...healed.sources],
        warnings: [...result.warnings, "PROMPT-FIDELITY", ...healed.sources],
      };
    }
  } catch {
    /* optional */
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
  const promptToStoreRaw = pipeline.egressPrompt || result.prompt;
  let promptToStore = promptToStoreRaw;
  try {
    const { homologizeStillPromptForStore } =
      require("./stillPromptHomology") as typeof import("./stillPromptHomology");
    promptToStore = homologizeStillPromptForStore(promptToStoreRaw).prompt || promptToStoreRaw;
  } catch {
    /* optional */
  }
  const composeMode = result.composeMode ?? ingress.effectiveMode ?? input.mode ?? "full";
  const promptState =
    composeMode === "fidelity" ? "fidelity" : composeMode === "refine" ? "refined" : "composed";

  let designContentHash = "";
  let dialogueFingerprint = "";
  try {
    const { buildShotChainContract } =
      require("../quality/shotChainContract") as typeof import("../quality/shotChainContract");
    const chainShot: Record<string, unknown> = {
      visualDescription: String(ctx.visualDescription ?? ""),
      duration: row.duration,
      shotSize: (row as { shotSize?: string }).shotSize ?? (ctx as { shotSize?: string }).shotSize,
      charCodes: (ctx.characters ?? []).map((c) => c.code).filter(Boolean),
      narrative: {
        dialogue: (ctx as { dialogueLines?: unknown }).dialogueLines
          ? { lines: (ctx as { dialogueLines?: unknown }).dialogueLines }
          : undefined,
      },
    };
    const contract = buildShotChainContract(chainShot, {
      knownNames: (ctx.characters ?? []).map((c) => c.name || "").filter(Boolean),
    });
    designContentHash = contract.designContentHash;
    dialogueFingerprint = contract.dialogueFingerprint;
  } catch {
    /* optional */
  }

  let stillIntentClass: string | undefined;
  try {
    const { classifyStillIntent } = await import("./stillIntentPolicy");
    stillIntentClass = classifyStillIntent({
      visualDescription: String(ctx.visualDescription ?? ""),
      shotSize: String((row as { shotSize?: string }).shotSize ?? (ctx as { shotSize?: string }).shotSize ?? ""),
      promptBlob: promptToStore,
    }).intentClass;
  } catch {
    /* optional */
  }

  await db("o_storyboard")
    .where({ id: input.storyboardId })
    .update({
      // SSOT: only composed prompt slot — never write recipe layers back into visualDescription
      prompt: promptToStore,
      reason: mergeReasonMeta(row.reason, {
        promptState,
        composeMode,
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
        recipeHeals: pipeline.recipeHeals ?? result.recipeHeals,
        literaryDescHash: hashLiteraryDesc(String(ctx.visualDescription ?? "")),
        ...(designContentHash
          ? { designContentHash, dialogueFingerprint: dialogueFingerprint || undefined }
          : {}),
        recipeNotPersistedToVd: true,
        stillIntentClass,
        // M7: design hash recorded; video stale if prior hash differs
        ...(meta?.literaryDescHash &&
        meta.literaryDescHash !== hashLiteraryDesc(String(ctx.visualDescription ?? ""))
          ? { chainStale: { still: false, video: true, burn: true }, videoStale: true }
          : {}),
        ...(meta?.designContentHash &&
        designContentHash &&
        meta.designContentHash !== designContentHash
          ? { videoStale: true, promptState: "stale" }
          : {}),
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
