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
): Promise<{
  ok: boolean;
  result: ComposeStillResult;
  /** Literary edit SSOT — never egress soup */
  prompt?: string;
  egressPrompt?: string;
  promptUsed?: string;
  blockReason?: string;
}> {
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
  // Path parity with generate: closed bind + inject ⊆ this-shot atoms
  try {
    const { assertSingleShotClosedInputs, filterInjectToDeclaredAtoms, stripForeignBeatAtomsFromEgress } =
      await import("./singleShotClosedCompose");
    const closed = assertSingleShotClosedInputs({
      storyboardId: input.storyboardId,
      boundShotIndex: (ctx as { boundShotIndex?: number }).boundShotIndex,
      bindOk: (ctx as { bindOk?: boolean }).bindOk !== false,
      bindCode: (ctx as { bindCode?: string }).bindCode,
      visualDescription: ctx.visualDescription,
      purpose: "compose",
    });
    if ((ctx as { bindOk?: boolean }).bindOk === false) {
      return {
        ok: false,
        result: {
          ok: false,
          prompt: "",
          visualBody: "",
          didSynthesize: false,
          scrubbed: false,
          composeMode: input.mode ?? "full",
          sources: ["persist.closed.bindFail"],
          warnings: closed.reasons,
          entityAnchors: [],
          compositionContractApplied: false,
          complianceHit: false,
          qp02Blocked: true,
          missingLeadAsset: false,
          dirtyInput: true,
          blockReason: closed.code || "BIND_SHOT_MISMATCH",
          userMessage: closed.userMessage || "分镜未绑定到正确的单镜设计包",
          ctaLabel: closed.ctaLabel,
        },
        blockReason: closed.code || "BIND_SHOT_MISMATCH",
      };
    }
    (ctx as { closedCompose?: boolean }).closedCompose = closed.closedCompose;
    if (ctx.strengthen) {
      const filtered: Record<string, string> = {};
      for (const [k, v] of Object.entries(ctx.strengthen)) {
        const kept = filterInjectToDeclaredAtoms([String(v)], ctx.visualDescription);
        if (kept.length) filtered[k] = kept[0]!;
      }
      ctx.strengthen = Object.keys(filtered).length ? filtered : null;
    }
    void stripForeignBeatAtomsFromEgress;
  } catch {
    /* optional closed module */
  }
  const currentHash = computeComposeHash(ctx);
  let litHash = "";
  try {
    const { literaryComposeHash } = await import("./composeStillPrompt");
    litHash = literaryComposeHash({
      visualDescription: ctx.visualDescription,
      compiledImagePrompt: ctx.compiledImagePrompt,
      background: ctx.background,
    });
  } catch {
    litHash = hashLiteraryDesc(String(ctx.visualDescription ?? ""));
  }
  const ingress = buildStillPreviousIngress({
    reason: row.reason,
    storedPrompt: row.prompt,
    requestPrompt: existingPrompt,
    requestedMode: input.mode,
    currentHash,
    preferFidelity: shouldDefaultFidelityCompose(ctx),
    loadPrevious: true,
    currentClientId: String(input.storyboardId ?? ""),
    literaryHash: litHash,
    visualDescription: ctx.visualDescription,
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

  // Persist egress to reason only — never overwrite literary o_storyboard.prompt
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
  try {
    const { stripForeignBeatAtomsFromEgress } =
      require("./singleShotClosedCompose") as typeof import("./singleShotClosedCompose");
    const scrubbed = stripForeignBeatAtomsFromEgress(promptToStore, ctx.visualDescription);
    promptToStore = scrubbed.text;
    if (scrubbed.stripped.length) {
      result = {
        ...result,
        sources: [...(result.sources ?? []), ...scrubbed.stripped.map((s) => `closed.strip:${s}`)],
      };
    }
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

  // Echo seal/profile/contam from compose so refine/repair/I2V handoff can read before image gen
  const gc = (result.generationContract ?? {}) as {
    primaryIntentSeal?: unknown;
    designIntentProfile?: unknown;
    contaminationClass?: string;
    i2vCriticalFacts?: string[];
    videoMotionStartHint?: string;
  };
  const contamFromCompose =
    String(gc.contaminationClass ?? "").trim() ||
    (result.sources ?? [])
      .map((s) => /^contaminationClass:(.+)$/.exec(String(s))?.[1])
      .find(Boolean) ||
    "";
  const offBeat =
    (result.sources ?? []).some((s) => /previous\.dropped_off_beat|contaminationClass:off_beat/i.test(String(s))) ||
    contamFromCompose === "off_beat_cu";
  const deliveryTierCompose =
    contamFromCompose && contamFromCompose !== "none" ? "draft" : "preview";

  // LGIA: stamp stillPhase SSOT onto reason meta (triple-path parity with compose)
  let stillPhaseStamp: string | null = null;
  let contactStartStamp: string | null = null;
  try {
    const { ensureStillPhaseOnShot, readStillPhase } =
      require("./stillPhasePlan") as typeof import("./stillPhasePlan");
    const shotLike = {
      visualDescription: String(ctx.visualDescription ?? ""),
      narrative: (meta as { narrative?: Record<string, unknown> })?.narrative ?? {},
      generation: { videoPrompt: String((meta as { videoPrompt?: string })?.videoPrompt ?? "") },
      stillPhase: (result as { stillPhase?: string }).stillPhase,
    } as Record<string, unknown>;
    const ensured = ensureStillPhaseOnShot(shotLike);
    stillPhaseStamp = ensured.plan.stillPhase;
    contactStartStamp = ensured.plan.contactStartState;
    if (!(result.sources ?? []).some((s) => /lgia\.stillPhase:/.test(String(s)))) {
      (result.sources as string[] | undefined)?.push?.(`lgia.stillPhase:${stillPhaseStamp}`);
    }
    void readStillPhase;
  } catch {
    stillPhaseStamp =
      (result as { stillPhase?: string }).stillPhase ??
      ((meta as { narrative?: { stillPhase?: string } })?.narrative?.stillPhase ?? null);
  }

  // Reuse ingress litHash (VD ∪ peeled imagePrompt ∪ bg) — do not redeclare
  await db("o_storyboard")
    .where({ id: input.storyboardId })
    .update({
      // Literary SSOT column untouched — egress only in reason.promptUsed
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
        literaryDescHash: litHash,
        literaryHash: litHash,
        generationContract: result.generationContract ?? undefined,
        designIntentProfile: gc.designIntentProfile,
        primaryIntentSeal: gc.primaryIntentSeal,
        ...(contamFromCompose && contamFromCompose !== "none"
          ? { contaminationClass: contamFromCompose }
          : {}),
        deliveryTier: deliveryTierCompose,
        ...(gc.i2vCriticalFacts?.length ? { i2vCriticalFacts: gc.i2vCriticalFacts } : {}),
        ...(gc.videoMotionStartHint ? { videoMotionStartHint: gc.videoMotionStartHint } : {}),
        ...(offBeat ? { beatIsolationFailed: true, offBeatContamination: true } : {}),
        ...(designContentHash
          ? { designContentHash, dialogueFingerprint: dialogueFingerprint || undefined }
          : {}),
        recipeNotPersistedToVd: true,
        stillIntentClass,
        ...(stillPhaseStamp
          ? {
              stillPhase: stillPhaseStamp,
              contactStartState: contactStartStamp ?? undefined,
              narrative: {
                ...(((meta as { narrative?: Record<string, unknown> })?.narrative) ?? {}),
                stillPhase: stillPhaseStamp,
                ...(contactStartStamp ? { contactStartState: contactStartStamp } : {}),
              },
            }
          : {}),
        // M7: design hash recorded; video stale if prior hash differs
        ...(meta?.literaryDescHash &&
        meta.literaryDescHash !== litHash
          ? { chainStale: { still: false, video: true, burn: true }, videoStale: true }
          : {}),
        ...(meta?.designContentHash &&
        designContentHash &&
        meta.designContentHash !== designContentHash
          ? { videoStale: true, promptState: "stale" }
          : {}),
      }),
    });

  // API `prompt` = literary edit SSOT; egress stays in reason / side channels
  let literaryPrompt = "";
  try {
    const { resolveLiteraryStillPrompt } =
      require("./literaryStillSsot") as typeof import("./literaryStillSsot");
    literaryPrompt = resolveLiteraryStillPrompt({
      visualDescription: ctx.visualDescription,
      compiledImagePrompt: ctx.compiledImagePrompt,
      background: ctx.background,
      spatialRelation: ctx.spatialRelation,
    }).literary;
  } catch {
    literaryPrompt = String(ctx.visualDescription ?? result.visualBody ?? "").trim();
  }
  if (!literaryPrompt) literaryPrompt = String(result.visualBody ?? "").trim();

  return {
    ok: true,
    result,
    prompt: literaryPrompt,
    egressPrompt: promptToStore,
    promptUsed: promptToStore,
  };
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
    egressPrompt?: string;
    promptUsed?: string;
    userMessage?: string;
    blockReason?: string;
    composeMode?: string;
  }>;
}> {
  const results: Array<{
    storyboardId: number;
    ok: boolean;
    prompt?: string;
    egressPrompt?: string;
    promptUsed?: string;
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
      egressPrompt: out.egressPrompt,
      promptUsed: out.promptUsed ?? out.egressPrompt,
      userMessage: out.result.userMessage ?? out.result.blockReason,
      blockReason: out.result.blockReason ?? out.blockReason,
      composeMode: out.result.composeMode,
    });
  }
  return { results };
}
