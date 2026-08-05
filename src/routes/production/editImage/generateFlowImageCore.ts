import type { Knex } from "knex";
import axios from "axios";
import u from "@/utils";
import { touchPromptForVendor } from "@/ruleEngine/compilers/vendorPromptAdapter";
import { precheckContentPolicy } from "@/ruleEngine/compilers/contentPolicyAdapter";
import { classifyGenerationFailure } from "@/ruleEngine/bundle/generationFailureHelper";
import { buildReferenceListForStoryboard } from "@/ruleEngine/compilers/referenceListBuilder";
import {
  inferImageModeFromRefCount,
  preflightGenerationMedia,
  resolveGenerationModeRules,
} from "@/ruleEngine/compilers/resolveGenerationModeRules";
import { buildRePushPlan } from "@/ruleEngine/design/reverseRouteEngine";
import {
  buildStillPreviousIngress,
  composeStillPrompt,
  computeComposeHash,
  isDirtyStillPrompt,
  literaryComposeHash,
  scrubStillPromptNoise,
  shouldDefaultFidelityCompose,
  stripIdentityTokens,
  type ComposeMode,
} from "@/ruleEngine/compilers/composeStillPrompt";
import {
  hydrateComposeStillContext,
  orderReferenceUrls,
} from "@/ruleEngine/compilers/hydrateComposeStillContext";
import {
  markHqOk,
  mergeReasonMeta,
  parseStillMetaFromReason,
  resolveStillVendorSizeLadder,
  resolveStillGenerationProfile,
} from "@/ruleEngine/compilers/stillQuality";
import { hashLiteraryDesc } from "@/ruleEngine/qc/stillFirstFrameGate";
import { buildPrimaryBlock } from "@/ruleEngine/compilers/primaryBlock";
import { applyLifecycleInvalidation } from "@/ruleEngine/heal/lifecycleInvalidate";
import {
  canRegenRetry,
  consumeRegenRetry,
  createHealBudget,
  type HealBudgetState,
} from "@/ruleEngine/heal/healBudgetLedger";
import { assertStillIdentityPreflight } from "@/ruleEngine/compilers/stillIdentityPreflight";
import { buildStillErrorEnvelope } from "@/ruleEngine/compilers/stillErrorEnvelope";
import type { VlmJudgeFn } from "@/ruleEngine/qc/stillLiteraryVlmJudge";

export interface GenerateFlowImageBody {
  model: string;
  references?: string[];
  quality: string;
  ratio: string;
  prompt: string;
  projectId: number;
  storyboardId?: number;
  /** image mode: text | singleImage | multiReference — optional, inferred from refs */
  mode?: string;
  /** when true (derive), require ≥1 parent reference */
  requireParentRef?: boolean;
  /** default hq_update for storyboard-linked stills */
  qualityMode?: "hq_update" | "draft";
  /** optional Seedream seed lock for hq refine */
  seed?: number;
  /** explore | refine | edit — default explore (handbook progressive) */
  stillStage?: "explore" | "refine" | "edit";
  exploreCount?: number;
  /** persist filePath + stillQuality when storyboardId present (default true) */
  persistToStoryboard?: boolean;
  /** optional QC strengthen map from postBurn */
  strengthen?: Record<string, string>;
  /** optional heal budget carry (regen retries) */
  healBudget?: HealBudgetState;
  /** full | refine | fidelity — description fidelity compose */
  composeMode?: ComposeMode;
}

export interface GenerateFlowImageDeps {
  imageRunner?: (input: {
    prompt: string;
    referenceList: { type: "image"; base64: string }[];
    size: string;
    aspectRatio: string;
    seed?: number;
  }) => Promise<{ save: (path: string) => Promise<void>; getResultUrl?: () => Promise<string>; resultBase64?: string }>;
  urlToBase64?: (url: string) => Promise<string>;
  /** Inject for tests — skip live Vision */
  vlmJudgeFn?: VlmJudgeFn;
  /** Optional StageA cast count gate; on fail skip layout lock */
  stageACastChecker?: (stageABase64: string, expectedCount: number) => Promise<{ ok: boolean; count?: number }>;
}

export async function defaultUrlToBase64(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith("/oss/")) {
    return await u.oss.getImageBase64(u.replaceUrl(imageUrl).replace("/smallImage", ""));
  }
  imageUrl = await u.oss.getFileUrl(u.replaceUrl(imageUrl));
  const response = await axios.get(imageUrl, {
    responseType: "arraybuffer",
    headers: { "ngrok-skip-browser-warning": "true" },
    timeout: 30_000,
    validateStatus: (s) => s >= 200 && s < 300,
  });
  const contentType = String(response.headers["content-type"] || "image/png");
  if (!/^image\//i.test(contentType) && !/octet-stream/i.test(contentType)) {
    throw new Error(`download input image invalid content-type: ${contentType}`);
  }
  const buf = Buffer.from(response.data);
  if (buf.length < 64) {
    throw new Error("download input image invalid: empty/too small");
  }
  const base64 = buf.toString("base64");
  return `data:${contentType.split(";")[0] || "image/png"};base64,${base64}`;
}

/** Drop empty / truncated / non-image refs before vendor upload (avoids image[0] queue invalid). */
export function sanitizeReferenceList(
  refs: { type: "image"; base64: string }[],
): { type: "image"; base64: string }[] {
  return refs.filter((r) => {
    const raw = String(r?.base64 ?? "");
    const payload = raw.includes("base64,") ? raw.split("base64,").pop() ?? "" : raw;
    if (payload.length < 128) return false;
    if (!/^[A-Za-z0-9+/=\s]+$/.test(payload.slice(0, 200))) return false;
    return true;
  });
}

export async function runGenerateFlowImageCore(
  db: Knex,
  body: GenerateFlowImageBody,
  deps: GenerateFlowImageDeps = {},
): Promise<{
  url: string;
  /** Literary edit SSOT — never egress soup */
  prompt?: string;
  promptUsed: string;
  egressPrompt?: string;
  contentPolicyWarnings?: string[];
  feedback?: Awaited<ReturnType<typeof classifyGenerationFailure>>;
  referenceCount: number;
  imageMode?: string;
  rePushPlan?: ReturnType<typeof buildRePushPlan>;
  stillQuality?: "missing" | "weak" | "hq_ok";
  primaryNextStep?: string;
  userMessage?: string;
  ctaLabel?: string;
  missingSlots?: string[];
  irdPrimaryAction?: string;
  composeSources?: string[];
  didSynthesize?: boolean;
  healBudget?: HealBudgetState;
  resolvedQuality?: string;
  warnings?: string[];
  visualPass?: boolean;
  visualPassAt?: string;
  fidelityItems?: Array<{ id: string; pass: boolean; evidence?: string; fixHint?: string }>;
  fidelityStopReason?: string;
  bestPassCount?: number;
  fixHintsUsed?: string[];
  parallelM?: number;
  editStrategy?: string;
  vlmError?: string;
  pendingHumanRejudge?: boolean;
  infraEditBypassUsed?: boolean;
  /** Ops echo for FE canvas — faceCu dropped SCENE count */
  sceneRefsDropped?: number;
  excludeScene?: boolean;
  keepSoftEnvRef?: boolean;
  propPlateMissing?: boolean;
  synthesizedPropPlate?: boolean;
  softEnvBakedIntoIdentity?: boolean;
  softEnvContinuity?: string;
  softEnvMissingHonest?: boolean;
  droppedSoftEnv?: boolean;
  propSource?: string;
  /** Warehouse / synth PROP soft plate — FE hangs as upload card */
  softAssetId?: number;
  propSoftPreviewUrl?: string;
  refsRoles?: string[];
  refThumbUrls?: string[];
  vendorPromptUsed?: string;
  canvasDisplayPrompt?: string;
  oneClickRepairKind?: string | null;
  vendorCalled?: boolean;
  vendorMs?: number;
  actuatorId?: string;
  workflowHash?: string;
  actuatorDegraded?: boolean;
  actuatorDegradedReason?: string;
  propPlateGrade?: string;
  egressCompressed?: boolean;
  keyOptional?: boolean;
  pixelDimStatus?: string;
  debtKind?: string;
  bgMode?: "keep_plate" | "soft_env" | "atmosphere_only";
  bgPolicy?: string;
  bgPolicyReason?: string;
  settingsDeepLink?: string;
  sheetLeak?: boolean;
  blockSilentRegen?: boolean;
  refreshStoryboardBeforeRegen?: boolean;
  deliveryTier?: string;
  requireFixBeforeBurn?: boolean;
  /** LGIA: soft advise only — never alone greys burn when keyOptional */
  adviseSmartRepair?: boolean;
  burnAllowed?: boolean;
  stillPhase?: string | null;
  ctaKind?: string;
  autoRepairStage?: string;
  autoRepairRound?: number;
  autoRepairBudgetLeft?: number;
  handoffReason?: string;
  i2vReady?: boolean;
  i2vBlockReason?: string;
  /** SingleShotClosedCompose echo */
  closedCompose?: boolean;
  boundShotIndex?: number | null;
  contaminationClass?: string | null;
}> {
  const { model, ratio, projectId, storyboardId, requireParentRef } = body;
  const references = orderReferenceUrls(body.references ?? []);
  // Design literary intent: workflow canvas defaults HQ (explicit draft only escapes)
  const qualityMode = body.qualityMode ?? "hq_update";
  const persistToStoryboard = body.persistToStoryboard ?? Boolean(storyboardId);
  if (typeof body.prompt !== "string") {
    throw Object.assign(new Error("prompt 不能为空且必须为字符串"), { code: "API-PROMPT-TYPE" });
  }
  const prompt = body.prompt;

  const projectRow = await db("o_project").where({ id: projectId }).select("imageQuality").first();
  const genProfile = resolveStillGenerationProfile({
    stillStage: body.stillStage,
    qualityMode,
    requestedQuality: body.quality,
    projectQuality: projectRow?.imageQuality,
    lockSeed: typeof body.seed === "number" ? body.seed : null,
    exploreCount: body.exploreCount,
  });
  const sizeLadder = {
    size: genProfile.size,
    ladder: genProfile.ladder === "edit_i2i" ? ("hq_refine" as const) : genProfile.ladder,
    seed: genProfile.seed,
    seedLockPreferred: genProfile.stage !== "explore",
  };
  const quality = sizeLadder.size;
  const vendorSeed = sizeLadder.seed;
  (body as { resolvedQualityLadder?: string }).resolvedQualityLadder = sizeLadder.ladder;
  (body as { stillStageResolved?: string }).stillStageResolved = genProfile.stage;

  // Compose + design enrich before spending vendor quota
  const composeCtx = await hydrateComposeStillContext(db, {
    projectId,
    storyboardId,
    rawPrompt: prompt,
    qualityMode,
    strengthen: body.strengthen,
    referenceUrlCount: references.filter(Boolean).length,
    purpose: "generate",
  });
  // Prefer request ratio for contract
  composeCtx.videoRatio = ratio || composeCtx.videoRatio;

  const {
    assertSingleShotClosedInputs,
    filterInjectToDeclaredAtoms,
    stripForeignBeatAtomsFromEgress,
    isOralMicroNotActionPrimary,
    isClosedComposeTrue,
    gateHealInjectLines,
  } = await import("@/ruleEngine/compilers/singleShotClosedCompose");
  const closedAssert = assertSingleShotClosedInputs({
    storyboardId,
    boundShotIndex: composeCtx.boundShotIndex,
    bindOk: composeCtx.bindOk !== false || !storyboardId,
    bindCode: composeCtx.bindCode,
    visualDescription: composeCtx.visualDescription,
    compiledImagePrompt: composeCtx.compiledImagePrompt,
    purpose: "generate",
    episodeLexiconLegislates: Boolean(
      (composeCtx as { episodeLexiconLegislates?: boolean }).episodeLexiconLegislates,
    ),
    continuityInject: (composeCtx as { continuityInject?: string }).continuityInject,
    continuitySealed: Boolean((composeCtx as { continuitySealed?: boolean }).continuitySealed),
    shotSize: composeCtx.shotSize,
    foreground: composeCtx.foreground,
    mouthDetail: (composeCtx as { mouthDetail?: string }).mouthDetail,
  });
  if (storyboardId && composeCtx.bindOk === false) {
    const env = buildStillErrorEnvelope({
      code: composeCtx.bindCode || "BIND_SHOT_MISMATCH",
      errMsg: closedAssert.userMessage,
    });
    throw Object.assign(new Error(closedAssert.userMessage || env.userMessage), {
      code: closedAssert.code || env.code,
      primaryNextStep: "chat_repair",
      userMessage: closedAssert.userMessage ?? env.userMessage,
      ctaLabel: closedAssert.ctaLabel ?? "重新导入或重绑分镜",
      stillQuality: "missing" as const,
      closedCompose: false,
      boundShotIndex: closedAssert.boundShotIndex,
    });
  }
  // Fail-closed: only explicit true
  (composeCtx as { closedCompose?: boolean }).closedCompose = isClosedComposeTrue(
    closedAssert.closedCompose,
  );
  (composeCtx as { closedAssertReasons?: string[] }).closedAssertReasons = closedAssert.reasons;
  (composeCtx as { framingMode?: string }).framingMode = closedAssert.framingMode;
  void gateHealInjectLines;
  if (composeCtx.strengthen) {
    const filtered: Record<string, string> = {};
    for (const [k, v] of Object.entries(composeCtx.strengthen)) {
      const kept = filterInjectToDeclaredAtoms([String(v)], composeCtx.visualDescription);
      if (kept.length) filtered[k] = kept[0]!;
    }
    composeCtx.strengthen = Object.keys(filtered).length ? filtered : null;
  }

  let sbReason: unknown;
  let sbPrompt: string | undefined;
  if (storyboardId) {
    const sbRow = await db("o_storyboard").where({ id: storyboardId }).select("reason", "prompt").first();
    sbReason = sbRow?.reason;
    sbPrompt = sbRow?.prompt != null ? String(sbRow.prompt) : undefined;
  }
  const ingress = buildStillPreviousIngress({
    reason: sbReason,
    storedPrompt: sbPrompt,
    requestPrompt: prompt,
    requestedMode: body.composeMode,
    currentHash: computeComposeHash(composeCtx),
    preferFidelity: shouldDefaultFidelityCompose(composeCtx),
    loadPrevious: Boolean(storyboardId),
    currentClientId: String((composeCtx as { clientId?: string }).clientId ?? storyboardId ?? ""),
    literaryHash: literaryComposeHash({
      visualDescription: composeCtx.visualDescription,
      compiledImagePrompt: composeCtx.compiledImagePrompt,
    }),
    visualDescription: composeCtx.visualDescription,
  });
  composeCtx.previousVisualBody = ingress.previousVisualBody;
  try {
    const prevMeta = ingress.prevMeta as Record<string, unknown> | null;
    const gated = prevMeta?.untilClearGatedInject;
    const litInject = filterInjectToDeclaredAtoms(
      ingress.literaryRepairInjectLines ?? [],
      composeCtx.visualDescription,
    );
    const mergedInject = [
      ...(Array.isArray(gated) ? gated.map((s) => String(s)) : []),
      ...litInject,
    ].filter(Boolean);
    const gatedFiltered = filterInjectToDeclaredAtoms(mergedInject, composeCtx.visualDescription);
    if (gatedFiltered.length) {
      composeCtx.gatedHealInject = [...new Set(gatedFiltered)].slice(0, 8);
    }
    const priorSeal = prevMeta?.primaryIntentSeal;
    if (priorSeal && typeof priorSeal === "object") {
      composeCtx.priorPrimaryIntentSeal =
        priorSeal as import("@/ruleEngine/compilers/primaryIntentSeal").PrimaryIntentCarrierSet;
    }
    if (ingress.forceFull && litInject.length) {
      (composeCtx as { literaryRepairDeltaHints?: string[] }).literaryRepairDeltaHints =
        ingress.literaryRepairDeltaHints;
    }
  } catch {
    /* optional */
  }
  const composeMode = ingress.composeMode;

  // XOR smart-split stays on import/design only — never rewrite shot count mid-generate
  let composed = composeStillPrompt(composeCtx, { mode: ingress.effectiveMode });
  if (!composed.ok) {
    const br = String(composed.blockReason ?? "");
    const bodyOk = String(composed.visualBody || composed.prompt || "").trim().length >= 12;
    const hardNoSoft =
      br === "DEX-STILL-ONEBEAT" ||
      br === "DEX-STILL-OS-NAME" ||
      br === "DEX-STILL-FILLER" ||
      br === "BIND_SHOT_MISMATCH" ||
      br === "BIND_SHOT_UNBOUND" ||
      br === "CLOSED_COMPOSE_THIN_VD" ||
      /ONEBEAT|BIND_SHOT|CLOSED_COMPOSE/i.test(br);
    // Policy compose debts: soft-continue when we still have a shootable body — never for ONEBEAT/bind
    if (
      bodyOk &&
      !hardNoSoft &&
      br !== "DEX-QP-02" &&
      !composed.qp02Blocked &&
      br !== "visual body too thin after compose"
    ) {
      composed = {
        ...composed,
        ok: true,
        sources: [...(composed.sources ?? []), "compose.policy.softContinue", `compose.debt:${br || "unknown"}`],
        requireFixBeforeBurn: true,
        // softContinue must never fake closedCompose green
        closedCompose: false,
      } as typeof composed;
      (composeCtx as { closedCompose?: boolean }).closedCompose = false;
    } else {
      // Empty VD — try salvage from prompt scraps before refusing
      const salvage = String(composeCtx.visualDescription || composeCtx.videoDesc || prompt || "").trim();
      if (salvage.length >= 8) {
        composeCtx.visualDescription = salvage.slice(0, 400);
        composed = composeStillPrompt(composeCtx, { mode: "full" });
        if (composed.ok) {
          composed = {
            ...composed,
            sources: [...(composed.sources ?? []), "compose.salvageVd"],
            requireFixBeforeBurn: true,
          } as typeof composed;
        }
      }
      if (!composed.ok) {
        const code =
          composed.missingLeadAsset || br === "DEX-ASSET-CREF" || br === "IMG-CREF"
            ? composed.missingLeadAsset
              ? "IMG-CREF"
              : br || "IMG-CREF"
            : br === "DEX-DIRTY-STILL-PROMPT"
              ? "DEX-DIRTY-STILL-PROMPT"
              : br === "DEX-STILL-ONEBEAT" || br === "DEX-STILL-OS-NAME" || br === "DEX-STILL-FILLER"
                ? br
                : /^DEX-LIT-|DEX-PROP-CONT/.test(br)
                  ? br
                  : br === "DEX-QP-02" || composed.qp02Blocked
                    ? "QP-02"
                    : br || "QP-02";
        const env = buildStillErrorEnvelope({
          code,
          errMsg: composed.userMessage || composed.blockReason,
        });
        // Last resort soft_defer envelope — still prefer chat_repair CTA over brick if body partial
        throw Object.assign(new Error(composed.userMessage || composed.blockReason || env.userMessage), {
          code: env.code,
          primaryNextStep: composed.primaryNextStep ?? "enhance_and_generate",
          userMessage: composed.userMessage ?? env.userMessage,
          ctaLabel: composed.ctaLabel ?? "增强设计并生成",
          composeSources: composed.sources,
          stillQuality: "missing" as const,
          softDefer: true,
        });
      }
    }
  }

  // Description SSOT — hq path cannot invent literary body from dirty prompt
  let fidelityHealSources: string[] = [];
  let fidelityDebtKind: string | undefined;
  let fidelityRequireFix = false;
  const { resolveLiteraryDescriptionSsot, buildLiteraryFidelityChecklist } = await import(
    "@/ruleEngine/compilers/literaryFidelityChecklist"
  );
  const descSsot = resolveLiteraryDescriptionSsot({
    visualDescription: composeCtx.visualDescription,
    videoDesc: composeCtx.videoDesc,
    cleanPasteBody:
      qualityMode === "hq_update" && !isDirtyStillPrompt(prompt) ? scrubStillPromptNoise(stripIdentityTokens(prompt).body).cleaned : null,
  });
  if (!descSsot.ok && qualityMode === "hq_update") {
    const salvage = String(composeCtx.visualDescription || composeCtx.videoDesc || composed.visualBody || "").trim();
    if (salvage.length >= 8) {
      composeCtx.visualDescription = salvage.slice(0, 400);
      fidelityHealSources.push("repair.qp02.salvageContinue");
      fidelityRequireFix = true;
    } else {
      const env = buildStillErrorEnvelope({ code: "QP-02", errMsg: "缺少画面描写，无法文学复原" });
      throw Object.assign(new Error("请先补全画面描写（visualDescription）再生成高质量静照"), {
        code: "QP-02",
        primaryNextStep: "enhance_and_generate",
        userMessage: "缺少画面描写，无法文学复原静照 — 请反推补 VD 后继续生成",
        ctaLabel: env.ctaLabel ?? "增强设计并生成",
        stillQuality: "missing" as const,
        softDefer: true,
      });
    }
  }

  // Design intent fidelity — CONTRACT debt → heal dual-write, never HTTP 400
  if (qualityMode === "hq_update") {
    try {
      const { assertPromptDesignFidelity } =
        require("@/ruleEngine/quality/assertPromptDesignFidelity") as typeof import("@/ruleEngine/quality/assertPromptDesignFidelity");
      const { healPromptFidelityAnchors } =
        require("@/ruleEngine/design/healPromptFidelityAnchors") as typeof import("@/ruleEngine/design/healPromptFidelityAnchors");
      let imagePrompt = composed.visualBody || composed.prompt;
      let fid = assertPromptDesignFidelity({
        shot: {
          visualDescription: composeCtx.visualDescription ?? descSsot.description,
          charCodes: (composeCtx.characters ?? []).map((c) => c.code).filter(Boolean),
        },
        knownNames: (composeCtx.characters ?? []).map((c) => c.name).filter(Boolean) as string[],
        imagePrompt,
        stage: "compose",
        fidelityHard: false,
      });
      const debtFid = fid.findings.filter(
        (f) => f.id === "PROMPT-FIDELITY" && (f.severity === "CONTRACT" || f.severity === "HEAL" || f.severity === "BLOCK" || f.severity === "WARN"),
      );
      if (debtFid.length) {
        const healed = healPromptFidelityAnchors({
          visualDescription: composeCtx.visualDescription ?? descSsot.description,
          visualBody: imagePrompt,
          knownNames: (composeCtx.characters ?? []).map((c) => c.name).filter(Boolean) as string[],
        });
        imagePrompt = healed.visualBody;
        composed.visualBody = healed.visualBody;
        if (healed.visualDescription) {
          composeCtx.visualDescription = healed.visualDescription;
        }
        fidelityHealSources = healed.sources;
        composed.sources = [...(composed.sources ?? []), ...healed.sources];
        fidelityRequireFix = healed.softDefer || !healed.ok;
        fidelityDebtKind = healed.debtKind;
        // Re-check after heal — still debt is soft_defer, continue vendor
        fid = assertPromptDesignFidelity({
          shot: {
            visualDescription: composeCtx.visualDescription ?? descSsot.description,
            charCodes: (composeCtx.characters ?? []).map((c) => c.code).filter(Boolean),
          },
          knownNames: (composeCtx.characters ?? []).map((c) => c.name).filter(Boolean) as string[],
          imagePrompt,
          stage: "compose",
          fidelityHard: false,
        });
        if (fid.findings.some((f) => f.id === "PROMPT-FIDELITY")) {
          fidelityRequireFix = true;
          fidelityDebtKind = "prompt_fidelity";
          fidelityHealSources.push("repair.fidelity.softDeferContinue");
        }
      }
    } catch (e: unknown) {
      if (e && typeof e === "object" && "code" in e && String((e as { code?: string }).code) === "API-PROMPT-TYPE") throw e;
      /* heal optional — never brick generate on fidelity module errors */
    }
  }

  // Dual seating + multi-char: missing look → contract debt (enqueue), continue soft shoot when possible
  // Role URL refs + --cref CHAR-* credit looks before vendor spend; scene URLs never credit faces
  const { parsePromptRefs } = await import("@/ruleEngine/compilers/vendorPromptAdapter");
  const promptRefs = parsePromptRefs(composed.prompt || prompt);
  const identityGate = assertStillIdentityPreflight({
    characters: composeCtx.characters,
    description: descSsot.description || composeCtx.visualDescription,
    dialogueSpeakers: composeCtx.dialogueSpeakers,
    referenceUrls: references,
    promptCrefCodes: promptRefs.crefs,
    enforce: false,
  });
  let identityDebtKind: string | undefined;
  if (!identityGate.ok) {
    identityDebtKind = "missing_identity";
    fidelityHealSources.push("repair.identity.enqueueContinue");
    // Do not throw — soft continue; deliveryTier stays draft until plate present
  }

  // Stamp heal debt onto composed for response echo
  (composed as { fidelityRequireFix?: boolean }).fidelityRequireFix =
    fidelityRequireFix || Boolean((composed as { requireFixBeforeBurn?: boolean }).requireFixBeforeBurn);
  (composed as { fidelityDebtKind?: string }).fidelityDebtKind =
    fidelityDebtKind || identityDebtKind;
  (composed as { identityDebtKind?: string }).identityDebtKind = identityDebtKind;
  if (fidelityHealSources.length) {
    composed.sources = [...(composed.sources ?? []), ...fidelityHealSources];
  }

  let budget = body.healBudget ?? createHealBudget();
  // strengthen regen budget is consumed inside visual fidelity loop; only pre-consume if not looping
  const { shouldRunVisualFidelityLoop } = await import("@/ruleEngine/qc/stillVisualFidelityLoop");
  const willLoop = shouldRunVisualFidelityLoop({ qualityMode, storyboardId });
  if (!willLoop && body.strengthen && Object.keys(body.strengthen).length) {
    if (!canRegenRetry(budget)) {
      const primary = buildPrimaryBlock("chat_repair", {
        stage: "qc",
        userMessageOverride: "自动重试次数已用尽，请人工处理",
      });
      // soft_defer — do not throw; clear strengthen and continue best-effort
      fidelityHealSources.push("repair.healBudget.softDefer");
      fidelityRequireFix = true;
      body.strengthen = undefined;
      void primary;
    } else {
      budget = consumeRegenRetry(budget);
    }
  }

  const urlRefCount = references.filter(Boolean).length;
  const modeRules = resolveGenerationModeRules({
    modality: "image",
    mode: body.mode,
    modelName: model.split(/:(.+)/)[1],
    referenceCount: urlRefCount,
  });

  if (requireParentRef === true && modeRules.minRefs > 0 && urlRefCount < 1) {
    const feedback = await classifyGenerationFailure({
      modality: "image",
      shotId: String(storyboardId ?? "workflow"),
      error: "DERIVE_PARENT_REF_MISSING",
      prompt: composed.prompt,
    });
    const rePushPlan = buildRePushPlan(["derive_parent_ref_missing"]);
    throw Object.assign(new Error("衍生图缺少父图参考，请先生成父资产图"), {
      code: "DERIVE_PARENT_REF_MISSING",
      feedback: { ...feedback, category: "derive_parent_ref_missing", ruleId: "derive_parent_ref_missing" },
      rePushPlan,
      referenceCount: 0,
    });
  }

  const mediaCheck = preflightGenerationMedia({
    rules: modeRules,
    referenceCount: urlRefCount,
  });
  if (body.mode && !mediaCheck.ok) {
    const rePushPlan = buildRePushPlan(["image_mode_ref_mismatch"]);
    throw Object.assign(new Error(mediaCheck.message ?? "IMAGE_MODE_REF_MISMATCH"), {
      code: "IMAGE_MODE_REF_MISMATCH",
      feedback: { category: "image_mode_ref_mismatch", ruleId: "image_mode_ref_mismatch" },
      rePushPlan,
      referenceCount: urlRefCount,
    });
  }

  // Still prompt pipeline SSOT — touch → assemble → literary gate → restore → egress
  const { runStillPromptPipeline } = await import("@/ruleEngine/compilers/stillPromptPipeline");
  const { buildIdentitySlots } = await import("@/ruleEngine/kernels/promptKernel");
  const { extractDesignFields } = await import("@/ruleEngine/design/designFieldRegistry");

  let identitySlots = buildIdentitySlots({
    charCodes: (composeCtx.characters ?? [])
      .filter((c) => c.kind !== "scene" && c.hasImage && c.code)
      .map((c) => String(c.code).toUpperCase()),
    sceneCode: composeCtx.sceneCode ?? null,
  });
  let designFields = extractDesignFields({
    modality: "image",
    charCodes: identitySlots.filter((s) => s.kind === "CHAR").map((s) => s.code),
    shot: undefined,
    storyboard: undefined,
  });
  let pendingMountGate: {
    missingSlots: string[];
    reason: string;
    ctaLabel: string;
  } | null = null;
  let mountedIdentityNames: string[] = [];
  let mountedSceneName: string | null = null;
  let mountedPropName: string | null = null;

  if (storyboardId) {
    try {
      const sb = await db("o_storyboard").where({ id: storyboardId }).first();
      const assetRows = await db("o_assets2Storyboard").where({ storyboardId }).select("assetId");
      const assets = assetRows.length
        ? await db("o_assets").whereIn(
            "id",
            assetRows.map((r: { assetId: number }) => r.assetId),
          )
        : [];
      try {
        const { resolveDesignMountGate } =
          require("@/ruleEngine/compilers/designMountGate") as typeof import("@/ruleEngine/compilers/designMountGate");
        const mount = resolveDesignMountGate({
          assets: (assets as Array<{ id?: number; type?: string; name?: string }>).map((a) => ({
            assetId: a.id,
            type: a.type,
            name: a.name,
          })),
          visualDescription: String(composeCtx.visualDescription ?? body.prompt ?? ""),
        });
        if (!mount.ok) {
          pendingMountGate = {
            missingSlots: mount.missingSlots,
            reason: mount.reason,
            ctaLabel: mount.ctaLabel,
          };
        }
      } catch {
        /* optional */
      }
      const namedAssets = (assets as Array<{ type?: string; name?: string }>).map((a) => ({
        type: String(a.type ?? "").trim(),
        name: String(a.name ?? "").trim(),
      }));
      mountedIdentityNames = namedAssets
        .filter((a) => a.name && /role|char|character|identity|人物|角色|定妆/i.test(`${a.type} ${a.name}`))
        .map((a) => a.name);
      mountedSceneName =
        namedAssets.find((a) => a.name && /scene|bg|环境|场景/i.test(`${a.type} ${a.name}`))?.name || null;
      mountedPropName =
        namedAssets.find((a) => a.name && /tool|prop|道具|纸|书|信|灯笼/i.test(`${a.type} ${a.name}`))?.name || null;
      const codes = assets
        .map((a: { remark?: string }) => {
          const m = String(a.remark ?? "").match(/(?:assetCode|charCode):([A-Za-z]+-[A-Za-z0-9]+)/i);
          return m?.[1]?.toUpperCase();
        })
        .filter(Boolean) as string[];
      const imagedCharCodes = (composeCtx.characters ?? [])
        .filter((c) => c.kind !== "scene" && c.hasImage && c.code)
        .map((c) => String(c.code).toUpperCase());
      const allCharCodes = [...new Set([...imagedCharCodes, ...codes.filter((c) => /^CHAR-/i.test(c))])];
      const sceneCode = composeCtx.sceneCode || codes.find((c) => /^SCENE-/i.test(c)) || null;
      identitySlots = buildIdentitySlots({
        charCodes: allCharCodes,
        sceneCode,
        associateCodes: codes,
      });
      designFields = extractDesignFields({
        modality: "image",
        charCodes: codes.filter((c) => /^CHAR-/i.test(c)),
        shot: {
          emotion: sb?.emotion,
          narrative: {
            emotionIntensity: typeof sb?.emotion === "number" ? sb.emotion : undefined,
            spatialRelation: sb?.spatialRelation,
          },
          generation: { fxPrompt: sb?.fxPrompt ?? sb?.visualEffect },
        },
        storyboard: sb
          ? {
              duration: sb.duration,
              fxPrompt: sb.fxPrompt ?? sb.visualEffect,
              audioPrompt: sb.audioPrompt,
              videoDesc: sb.videoDesc,
              track: sb.track,
            }
          : undefined,
      });
    } catch {
      /* identity hydrate best-effort */
    }
  }

  const charNames =
    mountedIdentityNames.length > 0
      ? mountedIdentityNames
      : ((composeCtx.characters ?? []).map((c) => c.name).filter(Boolean) as string[]);
  const literaryDesc = (() => {
    try {
      const { resolveLiteraryStillPrompt } =
        require("@/ruleEngine/compilers/literaryStillSsot") as typeof import("@/ruleEngine/compilers/literaryStillSsot");
      const lit = resolveLiteraryStillPrompt({
        visualDescription: descSsot.description || composeCtx.visualDescription,
        compiledImagePrompt: composeCtx.compiledImagePrompt,
        background: composeCtx.background,
        spatialRelation: composeCtx.spatialRelation,
      }).literary;
      if (lit) return lit;
    } catch {
      /* fall through */
    }
    return descSsot.description || composeCtx.visualDescription || composed.visualBody;
  })();
  const { resolveStillBgPolicy } = await import("@/ruleEngine/compilers/stillBgPolicy");
  const { extractDescPredicates } = await import("@/ruleEngine/compilers/extractDescPredicates");
  const { preflightFamilyCref } = await import("@/ruleEngine/qc/stillCrefPreflight");
  const { selectLayoutFamily } = await import("@/ruleEngine/qc/stillCompositionSpec");
  const { classifyStillIntent } = await import("@/ruleEngine/compilers/stillIntentPolicy");
  // Workflow canvas: FE references[] carry SCENE nodes — must count as hasSceneLink
  // even without storyboard sceneCode (else faceCu drops temple → grey studio).
  const { classifyFeReferenceRole } = await import("@/ruleEngine/compilers/eventPlateReadiness");
  const { inferHasSceneLink } = await import("@/ruleEngine/compilers/shotModalityIntent");
  const feRefUrls = (references ?? []).filter(Boolean).map(String);
  const feHasScenePlate =
    feRefUrls.length >= 2 &&
    feRefUrls.some(
      (url, i) =>
        classifyFeReferenceRole(url, i, { softEnvNeeded: true, total: feRefUrls.length }) === "scene",
    );
  const hasSceneLink = Boolean(
    inferHasSceneLink({
      sceneCode: composeCtx.sceneCode,
      sceneName: (composeCtx as { sceneName?: string }).sceneName,
      sceneAssets: composeCtx.sceneAssets,
      promptText: String(prompt ?? ""),
    }) ||
      composed.keepSoftEnvRef ||
      feHasScenePlate,
  );
  const bgPol = resolveStillBgPolicy({
    description: literaryDesc,
    characterNames: charNames,
    shotSize: composeCtx.shotSize,
    sceneEstablishingHint:
      Boolean((composeCtx as { sceneEstablishing?: boolean }).sceneEstablishing) ||
      /建立镜头|establishing|空镜建立|全景建立/i.test(String(literaryDesc ?? "")),
    hasSceneLink,
    bgBlur: (composeCtx as { bgBlur?: boolean }).bgBlur,
  });
  // Oral ECU: softEnv rim-only — prefer excludeScene + keepSoftEnvRef; never bake hall paper
  if (isOralMicroNotActionPrimary(literaryDesc)) {
    (bgPol as { excludeScene?: boolean }).excludeScene = true;
    (bgPol as { keepSoftEnvRef?: boolean }).keepSoftEnvRef = Boolean(hasSceneLink);
    (bgPol as { softEnvContinuity?: string }).softEnvContinuity = hasSceneLink ? "optional" : "none";
    (bgPol as { reason?: string }).reason = `${bgPol.reason || "faceCu"}:oral_rim`;
  }
  const seatingPack = bgPol.pack;
  const intent = classifyStillIntent({
    visualDescription: literaryDesc,
    shotSize: composeCtx.shotSize,
    hasSeatingOrKneel: seatingPack.hasSeatingOrKneel,
    characterCount: charNames.length,
    characterNames: charNames,
    episodeVisualDescriptions: composeCtx.episodeVisualDescriptions,
  });
  const recipeMode = intent.recipeMode;
  const seatingHard = seatingPack.hasSeatingOrKneel || intent.seating;
  const layoutFamily = selectLayoutFamily({
    visualDescription: literaryDesc,
    shotSize: composeCtx.shotSize,
    characterCount: charNames.length,
    hasSeatingOrKneel: seatingHard,
    recipeMode,
    intentSeating: intent.seating,
    intentRecipeMode: intent.recipeMode,
    characterNames: charNames,
  });
  const familyMinCref = Math.max(
    0,
    layoutFamily.family.minCast ?? (seatingHard ? 2 : 0),
  );
  const crefGate = preflightFamilyCref({
    required: Boolean(layoutFamily.family.twoStage) && familyMinCref >= 1,
    characters: composeCtx.characters,
    minImaged: familyMinCref || 1,
    label: `构图母型 ${layoutFamily.familyId}`,
    code: seatingHard ? "CREF_MISSING_FOR_SEATING" : "CREF_MISSING_FOR_FAMILY",
  });
  if (crefGate && qualityMode === "hq_update") {
    const primary = buildPrimaryBlock(crefGate.primaryNextStep, {
      stage: "prompt",
      userMessageOverride: crefGate.userMessage,
      ctaLabelOverride: crefGate.ctaLabel,
    });
    throw Object.assign(new Error(crefGate.userMessage), {
      code: crefGate.code,
      primaryNextStep: primary.primaryNextStep,
      userMessage: primary.userMessage,
      ctaLabel: primary.ctaLabel,
      healBudget: budget,
    });
  }
  const checklist = buildLiteraryFidelityChecklist({
    description: literaryDesc,
    characterNames: charNames,
    requireDualIdentity: charNames.length >= 2,
    bgPolicy: bgPol.policy,
    shotSize: composeCtx.shotSize,
  });

  const touched = touchPromptForVendor(composed.prompt, ratio);
  const aspectRatio = touched.aspectRatio ?? ratio;
  const toB64 = deps.urlToBase64 ?? defaultUrlToBase64;
  const { runStillVisualFidelityLoop } = await import("@/ruleEngine/qc/stillVisualFidelityLoop");
  const { resolveShotIdentityBinding } = await import("@/ruleEngine/compilers/resolveShotIdentityBinding");
  const { resolveLayoutForShot, applyLayoutAnchorToBurn } = await import("@/ruleEngine/qc/stillLayoutControl");
  const { expandStageAPrompt } = await import("@/ruleEngine/compilers/stillRefSlotContract");
  const { shouldForbidLayoutPreserve } = await import("@/ruleEngine/compilers/stillRefSlotContract");
  void extractDescPredicates; // used via bgPol.pack

  let feedback: Awaited<ReturnType<typeof classifyGenerationFailure>> | undefined;
  let referenceCount = 0;
  // Sync bg policy onto compose result — compose may have missed FE-only SCENE links
  let lastComposed = {
    ...composed,
    excludeScene: bgPol.excludeScene,
    keepSoftEnvRef: bgPol.keepSoftEnvRef,
    softEnvContinuity: bgPol.softEnvContinuity,
    bgMode: bgPol.bgMode,
    bgPolicy: bgPol.policy,
    bgPolicyReason: bgPol.reason,
    closedCompose: isClosedComposeTrue((composeCtx as { closedCompose?: boolean }).closedCompose),
    boundShotIndex: composeCtx.boundShotIndex ?? null,
    framingMode: (composeCtx as { framingMode?: string }).framingMode ?? closedAssert.framingMode,
    closedAssertReasons: (composeCtx as { closedAssertReasons?: string[] }).closedAssertReasons ?? [],
  } as typeof composed;
  if (pendingMountGate) {
    (lastComposed as { missingSlots?: string[] }).missingSlots = [
      ...new Set([
        ...((lastComposed as { missingSlots?: string[] }).missingSlots ?? []),
        ...pendingMountGate.missingSlots,
      ]),
    ];
    (lastComposed as { oneClickRepairKind?: string }).oneClickRepairKind = "design_refine";
    (lastComposed as { mountGateReason?: string }).mountGateReason = pendingMountGate.reason;
  }
  if (bgPol.bgGuidance && bgPol.keepSoftEnvRef) {
    (lastComposed as { softEnvContinuity?: string }).softEnvContinuity = bgPol.softEnvContinuity;
  }
  let lastPipeline = runStillPromptPipeline({
    composed: lastComposed,
    description: literaryDesc,
    characterNames: charNames,
    identitySlots,
    fields: designFields,
    aspectRatioFallback: ratio,
    modality: "image",
    mode: body.mode,
    checklist,
  });
  const policy = precheckContentPolicy(lastPipeline.egressPrompt);

  try {
    const generateOnce = async ({
        strengthen,
        mode,
        fixHints,
        failedImageBase64,
        layoutPreserve,
        forbidLayoutPreserve: roundForbidLayoutPreserve,
        swapLayoutTemplate,
        excludeLayoutTemplateId,
        forceFullCompose,
      }) => {
        const useEdit = mode === "edit";
        // Edit rounds: do not re-stack strengthen into compose; use fixHint focus prompt
        if (!useEdit) {
          composeCtx.strengthen = { ...(composeCtx.strengthen ?? {}), ...strengthen };
        }
        if (forceFullCompose) {
          composeCtx.previousVisualBody = undefined;
        }
        const roundComposeMode: ComposeMode = forceFullCompose
          ? "full"
          : useEdit || Object.keys(strengthen).length
            ? "fidelity"
            : composeMode;
        lastComposed = composeStillPrompt(composeCtx, {
          mode: roundComposeMode,
        });
        if (forceFullCompose && lastComposed.ok) {
          lastComposed = {
            ...lastComposed,
            sources: [...(lastComposed.sources ?? []), "infra.forceFullCompose"],
          } as typeof lastComposed;
        }
        if (!lastComposed.ok) {
          const br = String(lastComposed.blockReason ?? "");
          const code =
            lastComposed.missingLeadAsset || br === "DEX-ASSET-CREF" || br === "IMG-CREF"
              ? "IMG-CREF"
              : br === "DEX-DIRTY-STILL-PROMPT"
                ? "DEX-DIRTY-STILL-PROMPT"
                : br || "QP-02";
          throw Object.assign(new Error(lastComposed.userMessage || "compose failed"), {
            code,
          });
        }
        // Preserve FE-aware softEnv (recompose may lose canvas-only SCENE link)
        lastComposed = {
          ...lastComposed,
          excludeScene: bgPol.excludeScene,
          keepSoftEnvRef: bgPol.keepSoftEnvRef,
          softEnvContinuity: bgPol.softEnvContinuity,
          bgMode: bgPol.bgMode,
          bgPolicy: bgPol.policy,
          bgPolicyReason: bgPol.reason,
        } as typeof lastComposed;
        // Rebind cref order each round (prevent ref drift)
        const bind = resolveShotIdentityBinding({
          description: literaryDesc,
          characters: (composeCtx.characters ?? []).filter((c) => c.kind !== "scene"),
          assetCodes: (composeCtx.characters ?? [])
            .filter((c) => c.hasImage && c.code)
            .map((c) => String(c.code).toUpperCase()),
        });
        identitySlots = buildIdentitySlots({
          charCodes: bind.orderedCodes.length
            ? bind.orderedCodes
            : (composeCtx.characters ?? [])
                .filter((c) => c.kind !== "scene" && c.hasImage && c.code)
                .map((c) => String(c.code).toUpperCase()),
          sceneCode:
            lastComposed.excludeScene && !lastComposed.keepSoftEnvRef
              ? null
              : (composeCtx.sceneCode ?? null),
        });
        lastPipeline = runStillPromptPipeline({
          composed: lastComposed,
          description: literaryDesc,
          characterNames: charNames,
          identitySlots,
          fields: designFields,
          aspectRatioFallback: ratio,
          modality: "image",
          mode: body.mode,
          checklist,
        });
        let vendorPrompt = lastPipeline.egressPrompt;
        try {
          const stripped = stripForeignBeatAtomsFromEgress(vendorPrompt, literaryDesc);
          if (stripped.stripped.length) {
            vendorPrompt = stripped.text;
            lastComposed = {
              ...lastComposed,
              sources: [
                ...(lastComposed.sources ?? []),
                ...stripped.stripped.map((s) => `closed.strip:${s}`),
              ],
            } as typeof lastComposed;
          }
        } catch {
          /* optional */
        }
        const pol = precheckContentPolicy(vendorPrompt);
        if (pol.hasSensitiveTerms) vendorPrompt = pol.softenedPrompt;

        let referenceList: { type: "image"; base64: string }[] = [];
        let sceneRefsDropped = 0;
        let turnaroundCrefUsed = false;
        let propPlateMissing = false;
        let softEnvPlatePresent = false;
        let propPlatePresent = false;
        let synthesizedProp = false;
        if (storyboardId) {
          const { resolvePropSoftCodes } = await import("@/ruleEngine/compilers/eventPlateReadiness");
          // Oral / lip-CU beat: never hang paper/休书 propSoft plates from neighbor contracts
          const propCodes = isOralMicroNotActionPrimary(literaryDesc)
            ? []
            : resolvePropSoftCodes({
                contract: lastComposed.generationContract,
                visualDescription: literaryDesc,
              });
          const built = await buildReferenceListForStoryboard(
            db,
            projectId,
            storyboardId,
            vendorPrompt,
            bind.orderedCodes.length ? bind.orderedCodes : lastComposed.orderedCrefCodes ?? [],
            bind.orderedCodes.length ? bind.orderedCodes : lastComposed.orderedCrefCodes,
            {
              excludeScene: Boolean(lastComposed.excludeScene),
              softEnvRef: Boolean(lastComposed.keepSoftEnvRef),
              propSoftCodes: propCodes,
              secondaryCharacterBudget: (() => {
                try {
                  const narrBudget = String(
                    (composeCtx as { narrative?: { secondaryBudget?: string } }).narrative?.secondaryBudget ??
                      (lastComposed as { firstFrameExtract?: { secondaryBudget?: string } }).firstFrameExtract
                        ?.secondaryBudget ??
                      "",
                  );
                  if (narrBudget === "skirt_blur" || narrBudget === "hands_only") return narrBudget;
                  const dip = (lastComposed.generationContract as { designIntentProfile?: { secondaryBudget?: string } })
                    ?.designIntentProfile;
                  if (dip?.secondaryBudget === "skirt_blur" || dip?.secondaryBudget === "hands_only") {
                    return dip.secondaryBudget;
                  }
                  const { deriveDesignIntentProfile } = require("@/ruleEngine/compilers/designIntentProfile");
                  return deriveDesignIntentProfile({ visualDescription: literaryDesc }).secondaryBudget;
                } catch {
                  return undefined;
                }
              })(),
              leadCharCodes: bind.orderedCodes.length ? bind.orderedCodes.slice(0, 1) : undefined,
              literaryPrimary:
                (composeCtx as { narrative?: { literaryPrimary?: string } }).narrative?.literaryPrimary ??
                (lastComposed as { firstFrameExtract?: { primaryName?: string } }).firstFrameExtract?.primaryName ??
                null,
            },
          );
          referenceList = built.referenceList;
          sceneRefsDropped = built.sceneRefsDropped ?? 0;
          turnaroundCrefUsed = Boolean(built.turnaroundCrefUsed);
          if (built.propSoftKept) {
            propPlatePresent = true;
            propPlateMissing = false;
            (lastComposed as { propSource?: string }).propSource = "asset";
          } else {
            try {
              const { objectiveNeedsPropPlate } = await import("@/ruleEngine/compilers/eventPlateReadiness");
              if (objectiveNeedsPropPlate(lastComposed.generationContract?.objectiveClass)) {
                propPlateMissing = true;
              }
            } catch {
              if (
                lastComposed.generationContract?.objectiveClass === "contact_geom" ||
                lastComposed.generationContract?.objectiveClass === "prop_readable"
              ) {
                propPlateMissing = true;
              }
            }
          }
          softEnvPlatePresent = Boolean(built.softEnvKept);
        }
        // FE / workflow canvas: order identity → prop soft → soft SCENE; honor excludeScene + softEnv + prop.
        // Homology: no storyboardId still uses this path when FE sends references.
        if (references?.length && !referenceList.length) {
          const { cropTurnaroundSheetToIdentityPlate } = await import(
            "@/ruleEngine/compilers/cropTurnaroundToIdentityPlate"
          );
          const {
            classifyFeReferenceRole,
            cropIdentityPlateToFaceBias,
            objectiveNeedsPropPlate,
            salvageSoftEnvFromFeRefs,
          } = await import("@/ruleEngine/compilers/eventPlateReadiness");
          const dropScene = Boolean(lastComposed.excludeScene);
          // Re-resolve with FE scene hung so bend cannot default-drop hung softEnv
          try {
            const { resolveStillRefsContract: resolveRefsFe } = await import(
              "@/ruleEngine/compilers/stillRefsContract"
            );
            const sealFe = (lastComposed.generationContract as {
              primaryIntentSeal?: { poseOccupancy?: string; primaryObjective?: string };
            } | undefined)?.primaryIntentSeal;
            const feHung =
              Boolean(lastComposed.keepSoftEnvRef) ||
              lastComposed.softEnvContinuity === "must";
            if (feHung) {
              const refsFe = resolveRefsFe({
                primaryObjective: sealFe?.primaryObjective,
                objectiveClass: lastComposed.generationContract?.objectiveClass,
                poseOccupancy: sealFe?.poseOccupancy,
                visualDescription: literaryDesc,
                feSceneHung: true,
              });
              (lastComposed as { stillRefsContract?: typeof refsFe }).stillRefsContract = refsFe;
            }
          } catch {
            /* keep composed contract */
          }
          // dropFullSoftEnv: never hang FE temple as softEnv/identity (Seedream handbook slots)
          const dropSoftContract =
            (lastComposed as { stillRefsContract?: { dropFullSoftEnv?: boolean } }).stillRefsContract
              ?.dropFullSoftEnv === true;
          const softEnv = Boolean(lastComposed.keepSoftEnvRef) && !dropSoftContract;
          const eventObj = objectiveNeedsPropPlate(lastComposed.generationContract?.objectiveClass);
          let softEnvB64: string | undefined;
          let propB64: string | undefined;
          const identityPlates: { type: "image"; base64: string }[] = [];
          const allFePlates: Array<{ base64: string; roleHint?: string; url?: string }> = [];
          for (let ri = 0; ri < references.length; ri++) {
            const url = references[ri];
            if (!url) continue;
            let base64 = "";
            try {
              base64 = await toB64(url);
            } catch (refErr) {
              console.warn("[generateFlowImage] skip bad reference", url, u.error(refErr).message);
              continue;
            }
            if (!sanitizeReferenceList([{ type: "image", base64 }]).length) continue;
            const role = classifyFeReferenceRole(String(url), ri, {
              softEnvNeeded: softEnv,
              total: references.length,
            });
            allFePlates.push({ base64, roleHint: role, url: String(url) });
            const likelyScene = role === "scene";
            const likelyProp = role === "prop";
            const likelyCharSheet = role === "char" || role === "unknown";
            if ((dropScene || softEnv) && likelyScene) {
              if (softEnv && !softEnvB64) {
                const cropped = await cropTurnaroundSheetToIdentityPlate(base64, { assumeSheet: false });
                softEnvB64 =
                  cropped.cropped && cropped.reason === "four_up_left_quarter" && cropped.base64
                    ? cropped.base64
                    : base64;
              }
              if (dropScene) {
                sceneRefsDropped += 1;
                continue;
              }
            }
            if (likelyProp && eventObj && !propB64) {
              propB64 = base64;
              continue;
            }
            if (likelyCharSheet || (dropScene && !likelyScene && !likelyProp)) {
              const sealCropEarly = (lastComposed.generationContract as {
                primaryIntentSeal?: { poseOccupancy?: string; primaryObjective?: string };
              } | undefined)?.primaryIntentSeal;
              let preferActionBody = false;
              let faceOnlyLockEarly = false;
              let topRatioEarly = 0.55;
              try {
                const { resolveStillRefsContract } = await import(
                  "@/ruleEngine/compilers/stillRefsContract"
                );
                const { resolveBendIdentityCropPlan } = await import(
                  "@/ruleEngine/compilers/eventPlateReadiness"
                );
                const refsC = resolveStillRefsContract({
                  primaryObjective: sealCropEarly?.primaryObjective,
                  objectiveClass: lastComposed.generationContract?.objectiveClass,
                  poseOccupancy: sealCropEarly?.poseOccupancy,
                  visualDescription: literaryDesc,
                  feSceneHung:
                    Boolean(lastComposed.keepSoftEnvRef) ||
                    lastComposed.softEnvContinuity === "must" ||
                    ((lastComposed as { refsRoles?: string[] }).refsRoles ?? []).includes("softEnv"),
                });
                (lastComposed as { stillRefsContract?: typeof refsC }).stillRefsContract = refsC;
                const plan = resolveBendIdentityCropPlan({
                  identityReplaceStandingSheet: refsC.identityReplaceStandingSheet,
                  identityPreferActionBody: refsC.identityPreferActionBody,
                  poseOccupancy: sealCropEarly?.poseOccupancy,
                  primaryObjective: sealCropEarly?.primaryObjective,
                  objectiveClass: lastComposed.generationContract?.objectiveClass,
                  keepSoftEnvRef: softEnv,
                  softEnvContinuity: softEnv ? "must" : "none",
                  visualDescription: literaryDesc,
                });
                preferActionBody = plan.preferActionBody;
                faceOnlyLockEarly = plan.faceOnlyLock;
                topRatioEarly = plan.topRatio;
              } catch {
                const { resolveBendIdentityCropPlan } = await import(
                  "@/ruleEngine/compilers/eventPlateReadiness"
                );
                const plan = resolveBendIdentityCropPlan({
                  poseOccupancy: sealCropEarly?.poseOccupancy,
                  primaryObjective: sealCropEarly?.primaryObjective,
                  objectiveClass: lastComposed.generationContract?.objectiveClass,
                  visualDescription: literaryDesc,
                });
                preferActionBody = plan.preferActionBody;
                faceOnlyLockEarly = plan.faceOnlyLock;
                topRatioEarly = plan.topRatio;
              }
              const cropped = await cropTurnaroundSheetToIdentityPlate(base64, {
                assumeSheet: true,
                threeViewStrip: true,
                preferActionBody,
              });
              if (cropped.cropped && cropped.base64) {
                base64 = cropped.base64;
                turnaroundCrefUsed = true;
              } else if (cropped.aspectBefore != null && cropped.aspectBefore >= 1.55) {
                // Wide non-sheet: likely scene misclassified as char — peel to softEnv
                if (softEnv && !softEnvB64) {
                  softEnvB64 = base64;
                  sceneRefsDropped += 1;
                  continue;
                }
                continue;
              }
              // Event: upper-body bias OR bend face-lock (never torso+namecard for Seedream collage)
              if (faceOnlyLockEarly) {
                const face = await cropIdentityPlateToFaceBias(base64, {
                  topRatio: topRatioEarly,
                  faceOnly: true,
                  preferActionBody: false,
                });
                if (face.cropped && face.base64) {
                  base64 = face.base64;
                } else {
                  try {
                    const { stampTunLedgerOntoMeta } =
                      require("@/ruleEngine/compilers/tunOrdinalLedger") as typeof import("@/ruleEngine/compilers/tunOrdinalLedger");
                    Object.assign(
                      lastComposed as object,
                      stampTunLedgerOntoMeta(lastComposed as Record<string, unknown>, {
                        kind: "identity_sheet",
                        detail: "face crop failed — sheet debt",
                        missingSlot: "identity.sheet",
                      }),
                    );
                    (lastComposed as { missingSlots?: string[] }).missingSlots = [
                      ...new Set([
                        ...((lastComposed as { missingSlots?: string[] }).missingSlots ?? []),
                        "identity.sheet",
                      ]),
                    ];
                  } catch {
                    /* optional */
                  }
                }
              } else if (eventObj && !(softEnv && softEnvB64)) {
                const { resolveIdentityCropTopRatio } = await import(
                  "@/ruleEngine/compilers/eventPlateReadiness"
                );
                const sealCrop = sealCropEarly;
                const topRatio = resolveIdentityCropTopRatio({
                  objectiveClass: lastComposed.generationContract?.objectiveClass,
                  keepSoftEnvRef: softEnv,
                  softEnvContinuity: softEnv ? "must" : "none",
                  poseOccupancy: sealCrop?.poseOccupancy,
                  primaryObjective: sealCrop?.primaryObjective,
                });
                const face = await cropIdentityPlateToFaceBias(base64, {
                  topRatio,
                  preferActionBody,
                });
                if (face.cropped && face.base64) base64 = face.base64;
              }
              // Bend: replace standing sheet with face-only plate
              {
                const refsForBend =
                  (lastComposed as { stillRefsContract?: { identityReplaceStandingSheet?: boolean } })
                    .stillRefsContract;
                const replaceStand =
                  faceOnlyLockEarly ||
                  refsForBend?.identityReplaceStandingSheet === true ||
                  sealCropEarly?.poseOccupancy === "bend_pickup";
                if (replaceStand) {
                  try {
                    const { composeBendIdentityPlate } = await import(
                      "@/ruleEngine/compilers/eventPlateReadiness"
                    );
                    const bendId = await composeBendIdentityPlate({
                      faceSourceBase64: base64,
                    });
                    if (bendId.usedFace && bendId.base64) {
                      base64 = bendId.base64;
                      (lastComposed as { bendIdentityReplaced?: boolean; bendIdentityReason?: string }).bendIdentityReplaced =
                        true;
                      (lastComposed as { bendIdentityReason?: string }).bendIdentityReason = bendId.reason;
                    }
                  } catch {
                    /* keep cropped sheet */
                  }
                }
              }
              identityPlates.push({ type: "image" as const, base64 });
            } else if (!dropScene && likelyScene) {
              if (softEnv && !softEnvB64) {
                softEnvB64 = base64;
              } else {
                // Seedream handbook: SCENE must never enter identity slot (temple/outdoor leak)
                sceneRefsDropped += 1;
                continue;
              }
            } else if (!dropScene) {
              const cropped = await cropTurnaroundSheetToIdentityPlate(base64, { assumeSheet: false });
              if (cropped.cropped && cropped.reason === "four_up_left_quarter" && cropped.base64) {
                base64 = cropped.base64;
              }
              identityPlates.push({ type: "image" as const, base64 });
            } else {
              sceneRefsDropped += 1;
            }
          }
          // Identity contamination latch: reject modern/gray studio as image0 when period expected
          if (identityPlates[0]?.base64) {
            try {
              const { probeIdentityPlateContamination } = await import(
                "@/ruleEngine/compilers/eventPlateReadiness"
              );
              const periodExpected =
                lastComposed.keepSoftEnvRef === true ||
                lastComposed.generationContract?.objectiveClass === "action_primary" ||
                /古装|汉服|殿|弯腰|休书/.test(String(literaryDesc ?? ""));
              const probe = await probeIdentityPlateContamination({
                imageBase64: identityPlates[0].base64,
                urlOrRemark: String(references?.[0] ?? ""),
                periodCostumeExpected: periodExpected,
              });
              (lastComposed as { identityContamProbe?: typeof probe }).identityContamProbe = probe;
              if (probe.contaminated) {
                (lastComposed as { identityContaminated?: boolean }).identityContaminated = true;
                (lastComposed as { identityContamReason?: string }).identityContamReason = probe.reason;
                lastPipeline = {
                  ...lastPipeline,
                  autoHealed: [
                    ...(lastPipeline.autoHealed ?? []),
                    `identity_contam:${probe.reason}`,
                  ],
                };
                // Prefer next char plate if available; else keep but mark debt (vendor still runs with honesty)
                if (identityPlates.length > 1) {
                  const swapped = identityPlates.splice(1, 1)[0];
                  if (swapped) identityPlates[0] = swapped;
                } else if (identityPlates[0]?.base64) {
                  try {
                    const { composeBendIdentityPlate } = await import(
                      "@/ruleEngine/compilers/eventPlateReadiness"
                    );
                    const faceOnly = await composeBendIdentityPlate({
                      faceSourceBase64: identityPlates[0].base64,
                    });
                    if (faceOnly?.usedFace && faceOnly.base64) {
                      identityPlates[0] = { type: "image" as const, base64: faceOnly.base64 };
                      (lastComposed as { sources?: string[] }).sources = [
                        ...((lastComposed as { sources?: string[] }).sources ?? []),
                        "identity.contam_bend_face_only",
                      ];
                      (lastComposed as { debtKind?: string }).debtKind =
                        (lastComposed as { debtKind?: string }).debtKind || "identity_plate";
                    }
                  } catch {
                    (lastComposed as { sources?: string[] }).sources = [
                      ...((lastComposed as { sources?: string[] }).sources ?? []),
                      "identity.contam_honest_no_swap",
                    ];
                    (lastComposed as { debtKind?: string }).debtKind =
                      (lastComposed as { debtKind?: string }).debtKind || "identity_plate";
                  }
                }
              }
            } catch {
              /* optional */
            }
          }
          // Salvage SCENE when URL classify missed (OSS without keywords)
          if (softEnv && !softEnvB64) {
            const salvaged = await salvageSoftEnvFromFeRefs({
              plates: allFePlates,
              softEnvNeeded: true,
            });
            if (salvaged.softEnvB64) {
              softEnvB64 = salvaged.softEnvB64;
              // If salvage took the only identity candidate that was actually scene, drop duplicate
              if (
                salvaged.fromIndex != null &&
                identityPlates.length > 1 &&
                allFePlates[salvaged.fromIndex]?.roleHint === "scene"
              ) {
                /* keep identity from char sheet */
              }
            }
          }
          // Cap: identity → propSoft → softEnv as independent slots (max 3).
          // NEVER force pixel-bake collage — Seedream copies edges as neck/face drift.
          {
            const { applyContinuityAwareRefBudget } = await import(
              "@/ruleEngine/compilers/eventPlateReadiness"
            );
            const continuity =
              (lastComposed as { softEnvContinuity?: "must" | "optional" | "none" }).softEnvContinuity ??
              (lastComposed.keepSoftEnvRef ? "must" : "none");
            const forceThreeSlotProp =
              continuity === "must" &&
              (lastComposed.generationContract?.objectiveClass === "action_primary" ||
                (lastComposed.generationContract as { primaryIntentSeal?: { poseOccupancy?: string } })
                  ?.primaryIntentSeal?.poseOccupancy === "bend_pickup");
            const tagged: Array<{ type: "image"; base64: string; role?: "identity" | "propSoft" | "softEnv" }> = [];
            for (const p of identityPlates.slice(0, 1)) {
              tagged.push({ type: "image", base64: p.base64, role: "identity" });
            }
            if (propB64) {
              tagged.push({ type: "image", base64: propB64, role: "propSoft" });
              (lastComposed as { propSource?: string }).propSource = "fe";
            } else if (eventObj) propPlateMissing = true;
            if (softEnv && softEnvB64) {
              try {
                const { softenSoftEnvPlateForAtmosphere } = await import(
                  "@/ruleEngine/compilers/eventPlateReadiness"
                );
                const soft = await softenSoftEnvPlateForAtmosphere(softEnvB64, {
                  softEnvContinuity: continuity,
                  sceneMust: continuity === "must",
                });
                if (soft.base64) softEnvB64 = soft.base64;
              } catch {
                /* optional */
              }
              tagged.push({ type: "image", base64: softEnvB64, role: "softEnv" });
            }
            const budgeted = await applyContinuityAwareRefBudget({
              refs: tagged,
              propRequired: eventObj,
              maxSlots: 3,
              softEnvContinuity: continuity,
              allowPixelBake: false,
              forceThreeSlotProp,
            });
            referenceList = budgeted.refs.map((r) => ({ type: "image" as const, base64: r.base64 }));
            propPlatePresent = budgeted.roles.includes("propSoft");
            softEnvPlatePresent = budgeted.roles.includes("softEnv") || budgeted.softEnvBakedIntoIdentity;
            if (eventObj && !propPlatePresent) propPlateMissing = true;
            else if (propPlatePresent) propPlateMissing = false;
            (lastComposed as { refsRoles?: string[] }).refsRoles = budgeted.roles;
            (lastComposed as { droppedSoftEnv?: boolean }).droppedSoftEnv = budgeted.droppedSoftEnv;
            (lastComposed as { softEnvBakedIntoIdentity?: boolean }).softEnvBakedIntoIdentity =
              budgeted.softEnvBakedIntoIdentity;
            (lastComposed as { softEnvBakeFailed?: boolean }).softEnvBakeFailed = budgeted.bakeFailed;
          }
          // Refs contract: hard-drop full SCENE softEnv when objective/occupancy demands
          {
            let dropSoft = false;
            try {
              const { resolveStillRefsContract } = await import(
                "@/ruleEngine/compilers/stillRefsContract"
              );
              const sealBend = (lastComposed.generationContract as {
                primaryIntentSeal?: { poseOccupancy?: string; primaryObjective?: string };
              } | undefined)?.primaryIntentSeal;
              const refsC =
                (lastComposed as { stillRefsContract?: ReturnType<typeof resolveStillRefsContract> })
                  .stillRefsContract ??
                resolveStillRefsContract({
                  primaryObjective: sealBend?.primaryObjective,
                  objectiveClass: lastComposed.generationContract?.objectiveClass,
                  poseOccupancy: sealBend?.poseOccupancy,
                  visualDescription: literaryDesc,
                  feSceneHung:
                    Boolean(lastComposed.keepSoftEnvRef) ||
                    ((lastComposed as { refsRoles?: string[] }).refsRoles ?? []).includes("softEnv"),
                });
              (lastComposed as { stillRefsContract?: typeof refsC }).stillRefsContract = refsC;
              dropSoft = refsC.dropFullSoftEnv;
            } catch {
              // Resolve failure: keep softEnv (do not invent drop)
              dropSoft = false;
            }
            if (dropSoft) {
              const roles = ((lastComposed as { refsRoles?: string[] }).refsRoles ?? []).slice();
              const nextRefs: typeof referenceList = [];
              const nextRoles: string[] = [];
              for (let i = 0; i < referenceList.length; i++) {
                const role = roles[i] || "identity";
                if (role === "softEnv") {
                  (lastComposed as { droppedSoftEnv?: boolean }).droppedSoftEnv = true;
                  try {
                    const { stampTunLedgerOntoMeta } =
                      require("@/ruleEngine/compilers/tunOrdinalLedger") as typeof import("@/ruleEngine/compilers/tunOrdinalLedger");
                    Object.assign(
                      lastComposed as object,
                      stampTunLedgerOntoMeta(lastComposed as Record<string, unknown>, {
                        kind: "drop_softEnv",
                        detail: "contract drop softEnv (no FE hung)",
                        missingSlot: "ref.scene_mismatch",
                      }),
                    );
                  } catch {
                    /* optional */
                  }
                  continue;
                }
                nextRefs.push(referenceList[i]!);
                nextRoles.push(String(role));
              }
              if (nextRefs.length !== referenceList.length) {
                referenceList = nextRefs;
                (lastComposed as { refsRoles?: string[] }).refsRoles = nextRoles;
                softEnvPlatePresent = false;
                lastComposed.keepSoftEnvRef = false;
                (lastComposed as { softEnvContinuity?: string }).softEnvContinuity = "none";
                lastPipeline = {
                  ...lastPipeline,
                  autoHealed: [...(lastPipeline.autoHealed ?? []), "refs_contract:drop_softEnv"],
                };
              }
            }
          }
          (lastComposed as { propPlateMissing?: boolean }).propPlateMissing = propPlateMissing;
        } else if (references?.length && referenceList.length) {
          // DB refs present: still peel FE canvas SCENE/PROP (do not ignore connected nodes).
          // No early face-bias here — bakeSoftEnvIntoIdentity already face-biases (avoid double crop).
          // No early prop synth — single synth block below owns structure fill.
          const {
            classifyFeReferenceRole,
            objectiveNeedsPropPlate,
            salvageSoftEnvFromFeRefs,
            applyContinuityAwareRefBudget,
          } = await import("@/ruleEngine/compilers/eventPlateReadiness");
          const { cropTurnaroundSheetToIdentityPlate } = await import(
            "@/ruleEngine/compilers/cropTurnaroundToIdentityPlate"
          );
          const eventObj = objectiveNeedsPropPlate(lastComposed.generationContract?.objectiveClass);
          const dropSoftContract2 =
            (lastComposed as { stillRefsContract?: { dropFullSoftEnv?: boolean } }).stillRefsContract
              ?.dropFullSoftEnv === true;
          const softEnv = Boolean(lastComposed.keepSoftEnvRef) && !dropSoftContract2;
          const continuity =
            (lastComposed as { softEnvContinuity?: "must" | "optional" | "none" }).softEnvContinuity ??
            (softEnv ? "must" : "none");

          let softEnvB64: string | undefined;
          let propB64: string | undefined;
          const allFePlates: Array<{ base64: string; roleHint?: string; url?: string }> = [];
          for (let ri = 0; ri < references.length; ri++) {
            const url = references[ri];
            if (!url) continue;
            let base64 = "";
            try {
              base64 = await toB64(url);
            } catch {
              continue;
            }
            if (!sanitizeReferenceList([{ type: "image", base64 }]).length) continue;
            const role = classifyFeReferenceRole(String(url), ri, {
              softEnvNeeded: softEnv,
              total: references.length,
            });
            allFePlates.push({ base64, roleHint: role, url: String(url) });
            if (role === "scene" && softEnv && !softEnvB64) {
              const cropped = await cropTurnaroundSheetToIdentityPlate(base64, { assumeSheet: false });
              softEnvB64 =
                cropped.cropped && cropped.reason === "four_up_left_quarter" && cropped.base64
                  ? cropped.base64
                  : base64;
            }
            if (role === "prop" && eventObj && !propB64) propB64 = base64;
          }
          if (softEnv && !softEnvB64) {
            const salvaged = await salvageSoftEnvFromFeRefs({
              plates: allFePlates,
              softEnvNeeded: true,
            });
            if (salvaged.softEnvB64) softEnvB64 = salvaged.softEnvB64;
          }

          if (propB64) {
            propPlatePresent = true;
            propPlateMissing = false;
            (lastComposed as { propSource?: string }).propSource = "fe";
          } else if (eventObj && !propPlatePresent) {
            propPlateMissing = true;
          }

          const tagged: Array<{ type: "image"; base64: string; role?: "identity" | "propSoft" | "softEnv" }> = [];
          if (referenceList[0]?.base64) {
            tagged.push({ type: "image", base64: referenceList[0].base64, role: "identity" });
          }
          if (propB64) {
            tagged.push({ type: "image", base64: propB64, role: "propSoft" });
          } else if (propPlatePresent && referenceList[1]?.base64) {
            tagged.push({ type: "image", base64: referenceList[1].base64, role: "propSoft" });
          }
          // Hang softEnv: FE SCENE bytes OR DB softEnvKept tail — never strip hall when keepSoftEnvRef
          if (softEnv && !softEnvB64 && (softEnvPlatePresent || referenceList.length >= 2)) {
            const softIdx =
              propPlatePresent && referenceList.length >= 3
                ? referenceList.length - 1
                : referenceList.length >= 2
                  ? referenceList.length - 1
                  : -1;
            if (softIdx > 0 && referenceList[softIdx]?.base64) {
              softEnvB64 = referenceList[softIdx]!.base64;
            }
          }
          if (softEnv && softEnvB64) {
            try {
              const { softenSoftEnvPlateForAtmosphere } = await import(
                "@/ruleEngine/compilers/eventPlateReadiness"
              );
              const soft = await softenSoftEnvPlateForAtmosphere(softEnvB64, {
                softEnvContinuity: continuity,
                sceneMust: continuity === "must",
              });
              if (soft.base64) softEnvB64 = soft.base64;
            } catch {
              /* optional */
            }
            tagged.push({ type: "image", base64: softEnvB64, role: "softEnv" });
          }

          const budgeted = await applyContinuityAwareRefBudget({
            refs: tagged,
            propRequired: eventObj,
            maxSlots: 3,
            softEnvContinuity: continuity,
            allowPixelBake: false,
            forceThreeSlotProp:
              continuity === "must" &&
              (lastComposed.generationContract?.objectiveClass === "action_primary" ||
                (lastComposed.generationContract as { primaryIntentSeal?: { poseOccupancy?: string } })
                  ?.primaryIntentSeal?.poseOccupancy === "bend_pickup"),
          });
          if (budgeted.refs.length) {
            referenceList = budgeted.refs.map((r) => ({ type: "image" as const, base64: r.base64 }));
          }
          propPlatePresent = budgeted.roles.includes("propSoft");
          softEnvPlatePresent = budgeted.roles.includes("softEnv") || budgeted.softEnvBakedIntoIdentity;
          if (eventObj && !propPlatePresent) propPlateMissing = true;
          else if (propPlatePresent) propPlateMissing = false;
          (lastComposed as { refsRoles?: string[] }).refsRoles = budgeted.roles;
          (lastComposed as { droppedSoftEnv?: boolean }).droppedSoftEnv = budgeted.droppedSoftEnv;
          (lastComposed as { softEnvBakedIntoIdentity?: boolean }).softEnvBakedIntoIdentity =
            budgeted.softEnvBakedIntoIdentity;
          (lastComposed as { softEnvBakeFailed?: boolean }).softEnvBakeFailed = budgeted.bakeFailed;
          (lastComposed as { softEnvContinuity?: string }).softEnvContinuity = continuity;
          (lastComposed as { propPlateMissing?: boolean }).propPlateMissing = propPlateMissing;
          turnaroundCrefUsed = true;
        }

        // Shared refs-contract softEnv drop (covers DB-ref path)
        {
          let dropSoft2 = false;
          try {
            const { resolveStillRefsContract } = await import(
              "@/ruleEngine/compilers/stillRefsContract"
            );
            const sealBend2 = (lastComposed.generationContract as {
              primaryIntentSeal?: { poseOccupancy?: string; primaryObjective?: string };
            } | undefined)?.primaryIntentSeal;
            const refsC =
              (lastComposed as { stillRefsContract?: ReturnType<typeof resolveStillRefsContract> })
                .stillRefsContract ??
              resolveStillRefsContract({
                primaryObjective: sealBend2?.primaryObjective,
                objectiveClass: lastComposed.generationContract?.objectiveClass,
                poseOccupancy: sealBend2?.poseOccupancy,
                visualDescription: literaryDesc,
                feSceneHung:
                  Boolean(lastComposed.keepSoftEnvRef) ||
                  ((lastComposed as { refsRoles?: string[] }).refsRoles ?? []).includes("softEnv"),
              });
            (lastComposed as { stillRefsContract?: typeof refsC }).stillRefsContract = refsC;
            dropSoft2 = refsC.dropFullSoftEnv;
          } catch {
            // Scene-first safe default — never drop softEnv on resolve failure
            dropSoft2 = false;
          }
          if (dropSoft2 && ((lastComposed as { refsRoles?: string[] }).refsRoles ?? []).includes("softEnv")) {
            const roles = ((lastComposed as { refsRoles?: string[] }).refsRoles ?? []).slice();
            const nextRefs: typeof referenceList = [];
            const nextRoles: string[] = [];
            for (let i = 0; i < referenceList.length; i++) {
              const role = roles[i] || "identity";
              if (role === "softEnv") continue;
              nextRefs.push(referenceList[i]!);
              nextRoles.push(String(role));
            }
            referenceList = nextRefs;
            (lastComposed as { refsRoles?: string[] }).refsRoles = nextRoles;
            softEnvPlatePresent = false;
            lastComposed.keepSoftEnvRef = false;
            (lastComposed as { droppedSoftEnv?: boolean }).droppedSoftEnv = true;
            (lastComposed as { softEnvContinuity?: string }).softEnvContinuity = "none";
            lastPipeline = {
              ...lastPipeline,
              autoHealed: [...(lastPipeline.autoHealed ?? []), "refs_contract:drop_softEnv_shared"],
            };
          }
        }

        // Always echo continuity flags (even false) for FE/debug
        if (lastComposed.keepSoftEnvRef) {
          (lastComposed as { softEnvContinuity?: string }).softEnvContinuity =
            (lastComposed as { softEnvContinuity?: string }).softEnvContinuity ?? "must";
          if ((lastComposed as { softEnvBakedIntoIdentity?: boolean }).softEnvBakedIntoIdentity == null) {
            (lastComposed as { softEnvBakedIntoIdentity?: boolean }).softEnvBakedIntoIdentity = false;
          }
        }

        // Structure whitelist: synthesize PROP soft plate when event objective lacks one
        // OR refs contract forces occupancy-keyed plate (FE display-card must not skip)
        // SingleShotClosed: oral never synths paper plates
        let synthAttempted = false;
        if (isOralMicroNotActionPrimary(literaryDesc)) {
          (lastComposed as { synthesizedPropPlate?: boolean }).synthesizedPropPlate = false;
          (lastComposed as { propSoftPreviewUrl?: string }).propSoftPreviewUrl = undefined;
          (lastComposed as { propAssetId?: number }).propAssetId = undefined;
        }
        const needsPropPlate = (() => {
          if (isOralMicroNotActionPrimary(literaryDesc)) return false;
          try {
            const { objectiveNeedsPropPlate } = require("@/ruleEngine/compilers/eventPlateReadiness") as typeof import("@/ruleEngine/compilers/eventPlateReadiness");
            return objectiveNeedsPropPlate(lastComposed.generationContract?.objectiveClass);
          } catch {
            const o = lastComposed.generationContract?.objectiveClass;
            return o === "contact_geom" || o === "prop_readable" || o === "action_primary";
          }
        })();
        let forceOccupancyProp = false;
        try {
          const refsC = (lastComposed as { stillRefsContract?: { forcePropOccupancySynth?: boolean; propPoseOccupancy?: string | null } })
            .stillRefsContract;
          if (refsC?.forcePropOccupancySynth) forceOccupancyProp = true;
          else {
            const { resolveStillRefsContract } = await import("@/ruleEngine/compilers/stillRefsContract");
            const sealBend = (lastComposed.generationContract as {
              primaryIntentSeal?: { poseOccupancy?: string; primaryObjective?: string };
            } | undefined)?.primaryIntentSeal;
            const c = resolveStillRefsContract({
              primaryObjective: sealBend?.primaryObjective,
              objectiveClass: lastComposed.generationContract?.objectiveClass,
              poseOccupancy: sealBend?.poseOccupancy,
              visualDescription: literaryDesc,
              feSceneHung:
                Boolean(lastComposed.keepSoftEnvRef) ||
                ((lastComposed as { refsRoles?: string[] }).refsRoles ?? []).includes("softEnv"),
            });
            (lastComposed as { stillRefsContract?: typeof c }).stillRefsContract = c;
            forceOccupancyProp = c.forcePropOccupancySynth;
          }
          if (isOralMicroNotActionPrimary(literaryDesc)) forceOccupancyProp = false;
        } catch {
          forceOccupancyProp =
            /弯腰|捡起|捡拾|俯身/.test(String(literaryDesc ?? "")) ||
            (lastComposed.generationContract as { primaryIntentSeal?: { poseOccupancy?: string } } | undefined)
              ?.primaryIntentSeal?.poseOccupancy === "bend_pickup";
        }
        if (
          ((propPlateMissing && !propPlatePresent) || forceOccupancyProp) &&
          !synthesizedProp &&
          needsPropPlate
        ) {
          synthAttempted = true;
          try {
            const { synthesizePropSoftPlate, resolvePropPlateLabel } = await import(
              "@/ruleEngine/compilers/eventPlateReadiness"
            );
            const label = resolvePropPlateLabel({
              contract: lastComposed.generationContract,
              visualDescription: literaryDesc,
            });
            // Asset-first: skip synth when warehouse/FE plate already available —
            // EXCEPT when refs contract forces occupancy-keyed geometry (bend 触地)
            let skipSynth = false;
            const occForPlate =
              (lastComposed.generationContract as {
                primaryIntentSeal?: { poseOccupancy?: string };
                designIntentProfile?: { poseOccupancy?: string; plateMode?: string };
              } | undefined)?.primaryIntentSeal?.poseOccupancy ??
              (lastComposed.generationContract as { designIntentProfile?: { poseOccupancy?: string } } | undefined)
                ?.designIntentProfile?.poseOccupancy ??
              null;
            try {
              const { resolvePropPlateLadder } = await import("@/ruleEngine/compilers/propPlateLadder");
              const ladder = await resolvePropPlateLadder({
                db,
                projectId,
                storyboardId: storyboardId ?? null,
                propClassId: label.propClassId,
                propCanonical: label.canonical,
                glyphText: label.glyphText,
                poseOccupancy: occForPlate,
                plateMode: label.plateMode,
              });
              
              const stillPhaseForProp =
                (composeCtx as { stillPhase?: string }).stillPhase ??
                (lastComposed as { stillPhase?: string }).stillPhase ??
                ((lastComposed.generationContract as { stillPhase?: string } | undefined)?.stillPhase) ??
                null;
              const approachingProp =
                stillPhaseForProp === "approaching" || stillPhaseForProp === "mid_contact";
if (ladder.skipSynth) {
                if (approachingProp) {
                  skipSynth = false;
                  (lastComposed as { sources?: string[] }).sources = [
                    ...((lastComposed as { sources?: string[] }).sources ?? []),
                    "propLadder.approaching_reject_warehouse",
                  ];
                } else {

                // Honesty: skipSynth only when plate bytes actually hang into referenceList
                // Asset-first: warehouse paper kept even under bend (forcePropOccupancySynth no longer overrides)
                let hungBytes = false;
                if (ladder.assetId && db) {
                  try {
                    const asset = await db("o_assets").where({ id: ladder.assetId }).first();
                    const imageId = (asset as { imageId?: number } | undefined)?.imageId;
                    if (imageId) {
                      const img = await db("o_image").where({ id: imageId }).first();
                      const fp = String((img as { filePath?: string } | undefined)?.filePath ?? "");
                      if (fp) {
                        const buf = await u.oss.readFile(fp).catch(() => null);
                        if (buf && Buffer.isBuffer(buf) && buf.length > 64) {
                          const b64 = buf.toString("base64");
                          if (referenceList.length >= 1) {
                            referenceList.splice(1, 0, { type: "image" as const, base64: b64 });
                          } else {
                            referenceList.push({ type: "image" as const, base64: b64 });
                          }
                          hungBytes = true;
                          propPlatePresent = true;
                          propPlateMissing = false;
                          synthesizedProp = false;
                          (lastComposed as { propSource?: string }).propSource = ladder.grade;
                          (lastComposed as { propPlateGrade?: string }).propPlateGrade = ladder.grade;
                          if (ladder.assetId) {
                            (lastComposed as { propAssetId?: number }).propAssetId = ladder.assetId;
                          }
                          if (fp) {
                            try {
                              (lastComposed as { propSoftPreviewUrl?: string }).propSoftPreviewUrl =
                                await u.oss.getSmallImageUrl(fp);
                            } catch {
                              /* optional */
                            }
                          }
                        }
                      }
                    }
                  } catch {
                    hungBytes = false;
                  }
                }
                if (!hungBytes) {
                  skipSynth = false;
                  (lastComposed as { sources?: string[] }).sources = [
                    ...((lastComposed as { sources?: string[] }).sources ?? []),
                    "propLadder.skipSynth_no_bytes_force_synth",
                  ];
                } else {
                  skipSynth = true;
                }
                }
              }
            } catch {
              /* optional */
            }
            if (!skipSynth) {
            const synthOcc =
              (lastComposed as { stillRefsContract?: { propPoseOccupancy?: string | null } }).stillRefsContract
                ?.propPoseOccupancy ||
              occForPlate ||
              (forceOccupancyProp ? "bend_pickup" : null);
            let synth = await synthesizePropSoftPlate({
              propClassId: label.propClassId,
              canonical: label.canonical,
              glyphText: label.glyphText,
              softPlateHint: label.softPlateHint,
              plateMode: synthOcc === "bend_pickup" ? "object_inset" : label.plateMode,
              poseOccupancy: synthOcc,
              stillPhase:
                (composeCtx as { stillPhase?: string }).stillPhase ??
                (lastComposed as { stillPhase?: string }).stillPhase ??
                null,
            });
            // Bend: prefer photographic SCENE floor crop over cartoon SVG (Seedream ignores flat SVG)
            if (synthOcc === "bend_pickup") {
              try {
                const { composeBendPropSoftFromScene } = await import(
                  "@/ruleEngine/compilers/eventPlateReadiness"
                );
                const softB64 =
                  referenceList.find(
                    (_, i) =>
                      ((lastComposed as { refsRoles?: string[] }).refsRoles ?? [])[i] === "softEnv",
                  )?.base64 ||
                  (softEnvPlatePresent ? referenceList[referenceList.length - 1]?.base64 : undefined);
                const fromScene = await composeBendPropSoftFromScene({ sceneBase64: softB64 });
                // pose_cue_no_paper is NOT a paper plate — keep SVG/synth with paper geometry
                const { isPoseCueNoPaperProp } =
                  require("@/ruleEngine/compilers/stillFirstFrameExtract") as typeof import("@/ruleEngine/compilers/stillFirstFrameExtract");
                if (fromScene?.base64 && !isPoseCueNoPaperProp(fromScene.reason)) {
                  synth = {
                    base64: fromScene.base64,
                    kind: fromScene.kind,
                    label: label.canonical || "纸",
                    plateMode: "object_inset",
                  };
                  (lastComposed as { bendPropFromScene?: boolean }).bendPropFromScene = true;
                  (lastComposed as { sources?: string[] }).sources = [
                    ...((lastComposed as { sources?: string[] }).sources ?? []),
                    `propSoft.${fromScene.reason}`,
                  ];
                } else if (fromScene && isPoseCueNoPaperProp(fromScene.reason)) {
                  (lastComposed as { sources?: string[] }).sources = [
                    ...((lastComposed as { sources?: string[] }).sources ?? []),
                    `propSoft.reject_pose_cue_no_paper:${fromScene.reason}`,
                  ];
                }
              } catch {
                /* keep SVG synth */
              }
            }
            if (synth.base64 && sanitizeReferenceList([{ type: "image", base64: synth.base64 }]).length) {
              // Insert after identity, before soft env (never peel baked identity's only companion if it's prop)
              const softEnvSeparate =
                Boolean(lastComposed.keepSoftEnvRef) &&
                !(lastComposed as { softEnvBakedIntoIdentity?: boolean }).softEnvBakedIntoIdentity &&
                softEnvPlatePresent &&
                referenceList.length >= 2;
              const softTail = softEnvSeparate
                ? referenceList.splice(referenceList.length - 1, 1)
                : [];
              // Always replace existing propSoft — never splice a second mid-slot (dual paper)
              const rolesNow = ((lastComposed as { refsRoles?: string[] }).refsRoles ?? []).slice();
              const propIdx = rolesNow.indexOf("propSoft");
              if (propIdx >= 0 && referenceList[propIdx]) {
                referenceList[propIdx] = { type: "image" as const, base64: synth.base64 };
              } else if (referenceList.length >= 1) {
                referenceList.splice(1, 0, { type: "image" as const, base64: synth.base64 });
                if (!rolesNow.includes("propSoft")) {
                  rolesNow.splice(1, 0, "propSoft");
                  (lastComposed as { refsRoles?: string[] }).refsRoles = rolesNow as typeof rolesNow;
                }
              } else {
                referenceList.push({ type: "image" as const, base64: synth.base64 });
              }
              referenceList.push(...softTail);
              synthesizedProp = true;
              propPlateMissing = false;
              propPlatePresent = true;
              (lastComposed as { propPlateMissing?: boolean; synthesizedPropPlate?: boolean }).propPlateMissing =
                false;
              (lastComposed as { synthesizedPropPlate?: boolean }).synthesizedPropPlate = true;
              (lastComposed as { propSource?: string }).propSource = "synth";
              (lastComposed as { propPlateGrade?: string }).propPlateGrade = "synthetic_geometry";
              if (forceOccupancyProp) {
                (lastComposed as { litPlatesSwapped?: boolean }).litPlatesSwapped = true;
                (lastComposed as { litClaimPlateRepair?: boolean }).litClaimPlateRepair = true;
                lastPipeline = {
                  ...lastPipeline,
                  autoHealed: [...(lastPipeline.autoHealed ?? []), "refs_contract:force_prop_occupancy_synth"],
                };
              }
              try {
                const { persistSynthesizedPropPlate } = await import(
                  "@/ruleEngine/compilers/persistPropSoftPlate"
                );
                const persisted = await persistSynthesizedPropPlate({
                  db,
                  writeFile: (p, d) => u.oss.writeFile(p, d),
                  projectId,
                  storyboardId: storyboardId ?? null,
                  base64: synth.base64,
                  propClassId: label.propClassId,
                  canonical: label.canonical,
                  glyphText: label.glyphText,
                  plateMode: label.plateMode ?? synth.plateMode,
                  poseOccupancy: occForPlate,
                });
                if (persisted?.assetId) {
                  (lastComposed as { propSource?: string }).propSource = "synth_persisted";
                  (lastComposed as { propAssetId?: number }).propAssetId = persisted.assetId;
                  if (persisted.filePath) {
                    try {
                      (lastComposed as { propSoftPreviewUrl?: string }).propSoftPreviewUrl =
                        await u.oss.getSmallImageUrl(persisted.filePath);
                    } catch {
                      /* optional preview */
                    }
                  }
                }
              } catch (persistErr) {
                console.warn("[generateFlowImage] prop plate persist failed", u.error(persistErr).message);
              }
              const occ =
                occForPlate ||
                (lastComposed.generationContract as { primaryIntentSeal?: { poseOccupancy?: string } } | undefined)
                  ?.primaryIntentSeal?.poseOccupancy ||
                "";
              const bendForm =
                occ === "bend_pickup" || /弯腰|捡起|捡拾|俯身/.test(String(literaryDesc));
              const formBits = (lastComposed.generationContract?.mustShowFacts ?? [])
                .filter((f) => f.id === "prop_form" || f.id === "prop_glyph" || f.id === "prop_pose")
                .map((f) => f.text)
                .filter((t) => !(bendForm && /面颊|颊触|贴合\/划过|真实贴合/.test(String(t))))
                .slice(0, 3);
              const anti = (lastComposed.generationContract?.forbiddenSubstitutions ?? [])
                .filter((s) => /书本|卷轴|厚本|薄纸|替代/.test(s))
                .slice(0, 2);
              // bend_pickup: first-frame freeze — approaching = reach, not grip-complete
              const stillPhase =
                (lastComposed as { stillPhase?: string }).stillPhase ??
                ((lastComposed.generationContract as { stillPhase?: string } | undefined)?.stillPhase) ??
                "";
              const approaching = stillPhase === "approaching" || stillPhase === "mid_contact";
              // Sole spine: approaching already has ff egress — do not prepend competing propLead
              if (!approaching) {
                const propLead = bendForm
                  ? `占位：躯干明显前倾弯腰，主手触地捏起纸；纸在地面/近地，禁止浮空纸片、禁止直立胸前举纸`
                  : `${label.canonical}入画于触点（薄纸片软板，非书、非手持卡片）`;
                vendorPrompt = [...formBits, ...anti, propLead]
                  .filter(Boolean)
                  .join("。")
                  .concat("。")
                  .concat(String(vendorPrompt).trim());
              }
            } // synth.base64 hung
            } // !skipSynth
          } catch (synthErr) {
            console.warn("[generateFlowImage] prop soft plate synth failed", u.error(synthErr).message);
          }
        }

          // Fragment sil hang (bg_fragment) — side slot; may coexist with SCENE softEnv; never steal prop
          // Also hang without SCENE (atmosphere_only path).
          try {
          const { deriveDesignIntentProfile, profileNeedsFragmentPlate } = await import(
            "@/ruleEngine/compilers/designIntentProfile"
          );
          const fragDip = deriveDesignIntentProfile({
            visualDescription: literaryDesc,
            imagePrompt: composeCtx.compiledImagePrompt,
            background: composeCtx.background,
          });
          const alreadyHasFragment = Boolean((lastComposed as { fragmentPlateHung?: boolean }).fragmentPlateHung);
          // Scene-first: fragment_sil only when contract drops hall; else skirt is ZH Should
          const skipFragPlate =
            (lastComposed as { stillRefsContract?: { dropFullSoftEnv?: boolean } }).stillRefsContract
              ?.dropFullSoftEnv !== true;
          if (
            profileNeedsFragmentPlate(fragDip) &&
            !alreadyHasFragment &&
            referenceList.length >= 1 &&
            !skipFragPlate
          ) {
            const { synthesizePropSoftPlate } = await import("@/ruleEngine/compilers/eventPlateReadiness");
            const frag = await synthesizePropSoftPlate({
              propClassId: "generic",
              canonical: "次角碎片裙摆",
              softPlateHint: "cloth_fold",
              plateMode: "fragment_sil",
            });
            if (frag.base64) {
              referenceList.push({ type: "image" as const, base64: frag.base64 });
              (lastComposed as { fragmentPlateHung?: boolean }).fragmentPlateHung = true;
              const roles = ((lastComposed as { refsRoles?: string[] }).refsRoles ?? []).slice();
              roles.push("propSoft");
              (lastComposed as { refsRoles?: string[] }).refsRoles = roles.slice(0, referenceList.length);
            }
          }

          // Scene-first: only drop softEnv when contract explicitly says so (not bend-by-default)
          const atmNeed =
            fragDip.atmosphere ||
            /烛火|烛光|月光|暖光|冷光|夜色|灯火/.exec(String(literaryDesc))?.[0] ||
            null;
          const alreadyAtm = Boolean((lastComposed as { atmospherePlateHung?: boolean }).atmospherePlateHung);
          const softEnvDropLatch = (() => {
            const c = (lastComposed as { stillRefsContract?: { dropFullSoftEnv?: boolean } }).stillRefsContract;
            return c?.dropFullSoftEnv === true;
          })();
          // Skirt fragment: ZH only when SCENE softEnv present (Should enhancement)
          // T2I primary: never re-legislate 浅景深 when bgBlur===false / egress forbids it
          const bgBlurFalseCore =
            (composeCtx as { bgBlur?: boolean }).bgBlur === false ||
            /禁止浅景深/.test(String(vendorPrompt));
          const hasSceneSoft =
            softEnvPlatePresent ||
            Boolean(lastComposed.keepSoftEnvRef) ||
            (lastComposed as { softEnvContinuity?: string }).softEnvContinuity === "must";
          if (hasSceneSoft && !softEnvDropLatch) {
            if (
              !bgBlurFalseCore &&
              !/裙摆|衣角|碎片/.test(vendorPrompt) &&
              /裙摆|衣角|碎片/.test(String(literaryDesc ?? ""))
            ) {
              vendorPrompt = `背景浅景深，裙摆/衣角虚化可辨（加强项）。${String(vendorPrompt).trim()}`;
            } else if (
              bgBlurFalseCore &&
              !/裙摆|衣角|碎片/.test(vendorPrompt) &&
              /裙摆|衣角|碎片/.test(String(literaryDesc ?? ""))
            ) {
              vendorPrompt = `裙摆/衣角虚化可辨（加强项）；背景轮廓可辨，禁止浅景深抢戏。${String(vendorPrompt).trim()}`;
            }
            if (!bgBlurFalseCore && !/浅景深|主场景/.test(vendorPrompt)) {
              vendorPrompt = `背景：主场景浅景深虚化，禁止灰棚白棚。${String(vendorPrompt).trim()}`;
            }
            // Mild blur on SCENE softEnv for DOF — skip when bgBlur:false (T2I / stamp homology)
            if (!bgBlurFalseCore) {
              try {
                const roles = ((lastComposed as { refsRoles?: string[] }).refsRoles ?? []).slice();
                const softIdx = roles.lastIndexOf("softEnv");
                if (softIdx >= 0 && referenceList[softIdx]?.base64) {
                  const { softenSoftEnvPlateForAtmosphere } = await import("@/ruleEngine/compilers/eventPlateReadiness");
                  const blurred = await softenSoftEnvPlateForAtmosphere(referenceList[softIdx]!.base64, {
                    softEnvContinuity:
                      (lastComposed as { softEnvContinuity?: string }).softEnvContinuity ?? "must",
                    sceneMust: true,
                  });
                  if (blurred.softened && blurred.base64) {
                    referenceList[softIdx] = { type: "image" as const, base64: blurred.base64 };
                  }
                }
              } catch {
                /* optional */
              }
            }
          }
          if (softEnvDropLatch) {
            (lastComposed as { droppedSoftEnv?: boolean }).droppedSoftEnv = true;
            (lastComposed as { keepSoftEnvRef?: boolean }).keepSoftEnvRef = false;
            (lastComposed as { softEnvContinuity?: string }).softEnvContinuity = "none";
            lastComposed.keepSoftEnvRef = false;
            // Belt: strip any residual softEnv role even if early hang raced keepSoftEnvRef
            {
              const roles = ((lastComposed as { refsRoles?: string[] }).refsRoles ?? []).slice();
              if (roles.includes("softEnv")) {
                const nextRefs: typeof referenceList = [];
                const nextRoles: string[] = [];
                for (let i = 0; i < referenceList.length; i++) {
                  const role = roles[i] || "identity";
                  if (role === "softEnv") continue;
                  nextRefs.push(referenceList[i]!);
                  nextRoles.push(String(role));
                }
                referenceList = nextRefs;
                (lastComposed as { refsRoles?: string[] }).refsRoles = nextRoles;
                softEnvPlatePresent = false;
              }
            }
          }
          if (atmNeed && !alreadyAtm) {
            if (softEnvDropLatch) {
              // T2I-first dropped altar SCENE — MUST hang dark wood/candle atm plate.
              // ZH-only leaves cref white studio as sole env signal → 白棚+名卡复现.
              let hungAtm = false;
              if (referenceList.length >= 1) {
                try {
                  const { synthesizeAtmospherePlate } = await import(
                    "@/ruleEngine/compilers/eventPlateReadiness"
                  );
                  const atmPlate = await synthesizeAtmospherePlate({
                    atmosphere: String(atmNeed),
                  });
                  if (atmPlate?.base64) {
                    referenceList.push({ type: "image" as const, base64: atmPlate.base64 });
                    softEnvPlatePresent = true;
                    hungAtm = true;
                    (lastComposed as { atmospherePlateHung?: boolean }).atmospherePlateHung = true;
                    (lastComposed as { atmosphereZhOnly?: boolean }).atmosphereZhOnly = false;
                    (lastComposed as { keepSoftEnvRef?: boolean }).keepSoftEnvRef = true;
                    (lastComposed as { softEnvContinuity?: string }).softEnvContinuity = "optional";
                    lastComposed.keepSoftEnvRef = true;
                    const roles = ((lastComposed as { refsRoles?: string[] }).refsRoles ?? []).slice();
                    roles.push("softEnv");
                    (lastComposed as { refsRoles?: string[] }).refsRoles = roles.slice(
                      0,
                      referenceList.length,
                    );
                    lastPipeline = {
                      ...lastPipeline,
                      autoHealed: [
                        ...(lastPipeline.autoHealed ?? []),
                        "atm:synth_softEnv_after_scene_drop",
                      ],
                    };
                  }
                } catch {
                  /* fall through ZH */
                }
              }
              if (!hungAtm) {
                (lastComposed as { atmospherePlateHung?: boolean }).atmospherePlateHung = true;
                (lastComposed as { atmosphereZhOnly?: boolean }).atmosphereZhOnly = true;
                lastPipeline = {
                  ...lastPipeline,
                  autoHealed: [...(lastPipeline.autoHealed ?? []), "atm:zh_only_fallback"],
                };
              }
              if (!vendorPrompt.includes(String(atmNeed))) {
                vendorPrompt = `保留${atmNeed}氛围可辨（木作烛光环境），禁止灰棚白棚。${String(vendorPrompt).trim()}`;
              }
            } else if (
              !softEnvPlatePresent &&
              !(lastComposed as { softEnvBakedIntoIdentity?: boolean }).softEnvBakedIntoIdentity &&
              referenceList.length >= 1
            ) {
              const { synthesizeAtmospherePlate } = await import("@/ruleEngine/compilers/eventPlateReadiness");
              const atmPlate = await synthesizeAtmospherePlate({ atmosphere: String(atmNeed) });
              if (atmPlate?.base64) {
                referenceList.push({ type: "image" as const, base64: atmPlate.base64 });
                softEnvPlatePresent = true;
                (lastComposed as { atmospherePlateHung?: boolean }).atmospherePlateHung = true;
                (lastComposed as { keepSoftEnvRef?: boolean }).keepSoftEnvRef = true;
                (lastComposed as { softEnvContinuity?: string }).softEnvContinuity =
                  (lastComposed as { softEnvContinuity?: string }).softEnvContinuity === "must"
                    ? "must"
                    : "optional";
                const roles = ((lastComposed as { refsRoles?: string[] }).refsRoles ?? []).slice();
                roles.push("softEnv");
                (lastComposed as { refsRoles?: string[] }).refsRoles = roles.slice(0, referenceList.length);
                if (!vendorPrompt.includes(String(atmNeed))) {
                  vendorPrompt = `保留${atmNeed}氛围可辨，禁止灰棚白棚。${String(vendorPrompt).trim()}`;
                }
              }
            }
          } else if (softEnvDropLatch && !softEnvPlatePresent && referenceList.length >= 1) {
            // No atm keyword in VD — still hang warm wood plate so cref white studio cannot win
            try {
              const { synthesizeAtmospherePlate } = await import(
                "@/ruleEngine/compilers/eventPlateReadiness"
              );
              const atmPlate = await synthesizeAtmospherePlate({ atmosphere: "烛光" });
              if (atmPlate?.base64) {
                referenceList.push({ type: "image" as const, base64: atmPlate.base64 });
                softEnvPlatePresent = true;
                (lastComposed as { atmospherePlateHung?: boolean }).atmospherePlateHung = true;
                (lastComposed as { keepSoftEnvRef?: boolean }).keepSoftEnvRef = true;
                (lastComposed as { softEnvContinuity?: string }).softEnvContinuity = "optional";
                lastComposed.keepSoftEnvRef = true;
                const roles = ((lastComposed as { refsRoles?: string[] }).refsRoles ?? []).slice();
                roles.push("softEnv");
                (lastComposed as { refsRoles?: string[] }).refsRoles = roles.slice(0, referenceList.length);
                vendorPrompt = `保留暖光烛火氛围可辨（木作环境），禁止灰棚白棚。${String(vendorPrompt).trim()}`;
                lastPipeline = {
                  ...lastPipeline,
                  autoHealed: [
                    ...(lastPipeline.autoHealed ?? []),
                    "atm:synth_default_after_scene_drop",
                  ],
                };
              }
            } catch {
              /* optional */
            }
          }
        } catch {
          /* optional fragment / atmosphere */
        }

        // Gate: prop missing after synth → soft debt (allow); only brick if never attempted
        {
          const { decideEventPlateGate } = await import("@/ruleEngine/compilers/eventPlateReadiness");
          const gate = decideEventPlateGate({
            contract: lastComposed.generationContract,
            keepSoftEnvRef: lastComposed.keepSoftEnvRef,
            hasSceneLink: Boolean(
              lastComposed.keepSoftEnvRef ||
                (lastComposed as { softEnvContinuity?: string }).softEnvContinuity === "must",
            ),
            softEnvContinuity:
              (lastComposed as { softEnvContinuity?: "must" | "optional" | "none" }).softEnvContinuity ??
              (lastComposed.keepSoftEnvRef ? "must" : "none"),
            propPlatePresent: propPlatePresent || synthesizedProp,
            softEnvPlatePresent,
            softEnvBakedIntoIdentity: Boolean(
              (lastComposed as { softEnvBakedIntoIdentity?: boolean }).softEnvBakedIntoIdentity,
            ),
            allowSynthesizeProp: true,
            synthesizedPropApplied: synthesizedProp,
            synthAttempted,
          });
          if (!gate.allowVendor) {
            throw Object.assign(new Error(gate.userMessage || "DEX-PROP-PLATE-MISSING"), {
              code: gate.code || "DEX-PROP-PLATE-MISSING",
              primaryNextStep: gate.primaryNextStep || "batch_still",
              userMessage: gate.userMessage,
              ctaLabel: gate.ctaLabel || "挂道具板后再生成",
              missingSlots: gate.missingSlots,
              stillQuality: "missing" as const,
              propPlateMissing: gate.propPlateMissing,
              softEnvBakedIntoIdentity: gate.softEnvBakedIntoIdentity,
              blockSilentRegen: false,
            });
          }
          if (gate.userMessage && (gate.softEnvMissing || gate.propPlateMissing)) {
            vendorPrompt = `${gate.userMessage}。禁止灰棚/白棚空白背景。${vendorPrompt}`;
          }
        }

        // 四视图可作身份 cref：短锁句跟在文学正文后（禁止置顶——会淹没动作、成图变通用拼场景）
        if (turnaroundCrefUsed) {
          try {
            const { STILL_SHEET_AS_IDENTITY_ONLY_EDIT_ZH, STILL_SINGLE_FRAME_LOCK_EDIT_ZH } =
              await import("@/ruleEngine/compilers/stillFirstFrameLiterarySsot");
            const slim = `${STILL_SHEET_AS_IDENTITY_ONLY_EDIT_ZH}${STILL_SINGLE_FRAME_LOCK_EDIT_ZH}`;
            if (!/仅借身份|禁四视图\/拼版|禁复刻多格/.test(vendorPrompt.slice(-120))) {
              vendorPrompt = `${String(vendorPrompt).trim()}。${slim}`;
            }
          } catch {
            /* optional */
          }
        }

        // Pre-vendor atom gate: structure fills by objectiveClass (generic, no shot hardcode)
        let atomMisses: string[] = [];
        try {
          const { deriveStillAtomContract, buildAtomStructureFills } = await import(
            "@/ruleEngine/compilers/stillAtomContract"
          );
          const atom = deriveStillAtomContract({
            contract: lastComposed.generationContract ?? null,
            visualDescription: literaryDesc,
            prompt: vendorPrompt,
            characterNames: charNames,
          });
          atomMisses = atom.mustFail;
          if (!atom.ok) {
            const fills = buildAtomStructureFills({
              contract: lastComposed.generationContract ?? null,
              visualDescription: literaryDesc,
              atom,
            });
            if (fills.length) {
              vendorPrompt = `${fills.join("。")}。${String(vendorPrompt).trim()}`;
              lastPipeline = { ...lastPipeline, autoHealed: [...(lastPipeline.autoHealed ?? []), ...fills.map((f) => `atom:${f.slice(0, 24)}`)] };
            }
          }
          if ((lastComposed as { propPlateMissing?: boolean }).propPlateMissing) {
            atomMisses = [...new Set([...atomMisses, "propPlateMissing"])];
          }
        } catch {
          /* optional */
        }

        // Enhance / form parity: re-assert prop_form / glyph / pose facts into egress (same kernel as compose)
        // Sole spine: approaching SSOT owns egress — do not prepend form soup
        try {
          const phaseParity = String(
            (lastComposed as { stillPhase?: string }).stillPhase ??
              (lastComposed.generationContract as { stillPhase?: string } | undefined)?.stillPhase ??
              "",
          );
          if (phaseParity === "approaching" || phaseParity === "mid_contact") {
            /* skip form prepend — reseal later */
          } else {
          const bendParity =
            (lastComposed.generationContract as { primaryIntentSeal?: { poseOccupancy?: string } } | undefined)
              ?.primaryIntentSeal?.poseOccupancy === "bend_pickup" ||
            /弯腰|捡起|捡拾|俯身/.test(String(literaryDesc));
          const facts = (lastComposed.generationContract?.mustShowFacts ?? []).filter((f) => {
            if (!(f.id === "prop_form" || f.id === "prop_glyph" || f.id === "prop_pose" || f.id === "contact_event")) {
              return false;
            }
            // bend: never re-inject cheek contact legislation
            if (bendParity && /面颊|颊触|贴合\/划过|真实贴合|contact_event/.test(`${f.id}${f.text}`)) {
              return false;
            }
            return true;
          });
          const missingFacts = facts.filter((f) => {
            const tip = String(f.text ?? "").slice(0, 12);
            return tip && !String(vendorPrompt).includes(tip);
          });
          if (missingFacts.length) {
            vendorPrompt = `${missingFacts.map((f) => f.text).join("。")}。${String(vendorPrompt).trim()}`;
            lastPipeline = {
              ...lastPipeline,
              autoHealed: [...(lastPipeline.autoHealed ?? []), "enhance_parity:form"],
            };
          }
          const antis = (lastComposed.generationContract?.forbiddenSubstitutions ?? []).filter((s) =>
            /书本|卷轴|卷棒|纸卷|抵颏|薄纸/.test(s),
          );
          for (const a of antis.slice(0, 3)) {
            if (a && !vendorPrompt.includes(a.slice(0, 10))) {
              vendorPrompt = `${a}。${String(vendorPrompt).trim()}`;
            }
          }
          }
        } catch {
          /* optional */
        }

        // Repair delta: when isomorphic, inject literary fills + force refsSig change — NEVER cluster.hint eng tokens
        try {
          const { isIsomorphicRegen, refsSignature, deriveFailureCluster, literaryFillsForCluster } = await import(
            "@/ruleEngine/quality/failureClusterLibrary"
          );
          const { parseStillMetaFromReason } = await import("@/ruleEngine/compilers/stillQuality");
          let prevHash = "";
          let prevRefs = "";
          if (storyboardId) {
            const row = await db("o_storyboard").where({ id: storyboardId }).select("reason").first();
            const meta = parseStillMetaFromReason(row?.reason) as {
              contractHash?: string;
              refsSig?: string;
            } | null;
            prevHash = String(meta?.contractHash ?? "");
            prevRefs = String(meta?.refsSig ?? "");
          }
          const nextHash = String(lastComposed.generationContract?.contractHash ?? "");
          let nextRefs = refsSignature(referenceList);
          const forceParity = Boolean(
            (body as { _forceRefsDelta?: boolean; _forceComposeParity?: boolean })._forceRefsDelta ||
              (body as { _forceComposeParity?: boolean })._forceComposeParity ||
              (composeCtx as { _forceRefsDelta?: boolean })._forceRefsDelta ||
              (composeCtx as { _litEnhanceApplied?: boolean })._litEnhanceApplied,
          );
          const isomorphic =
            !forceParity &&
            isIsomorphicRegen({
              prevContractHash: prevHash,
              nextContractHash: nextHash,
              prevRefsSig: prevRefs,
              nextRefsSig: nextRefs,
            });
          if ((isomorphic || forceParity) && (atomMisses.length || propPlatePresent || synthesizedProp || forceParity)) {
            const cluster = deriveFailureCluster({
              promptUsed: vendorPrompt,
              visualDescription: literaryDesc,
              atomMisses,
              objectiveClass: lastComposed.generationContract?.objectiveClass,
              isomorphic: true,
            });
            const fills = literaryFillsForCluster({
              kind: cluster?.kind,
              hint: cluster?.hint,
              objectiveClass: lastComposed.generationContract?.objectiveClass,
              atomMisses,
              visualDescription: literaryDesc,
            });
            if (fills.length) {
              vendorPrompt = `${fills.join("。")}。${String(vendorPrompt).trim()}`;
              lastPipeline = {
                ...lastPipeline,
                autoHealed: [...(lastPipeline.autoHealed ?? []), "iso:literary_fill"],
              };
            }
            // Force refsSig delta: re-synth prop soft plate when event objective
            const needsPropPlateIso = (() => {
              try {
                const { objectiveNeedsPropPlate } =
                  require("@/ruleEngine/compilers/eventPlateReadiness") as typeof import("@/ruleEngine/compilers/eventPlateReadiness");
                return objectiveNeedsPropPlate(lastComposed.generationContract?.objectiveClass);
              } catch {
                const o = lastComposed.generationContract?.objectiveClass;
                return o === "contact_geom" || o === "prop_readable" || o === "action_primary";
              }
            })();
            if (needsPropPlateIso) {
              try {
                const { synthesizePropSoftPlate, resolvePropPlateLabel } = await import(
                  "@/ruleEngine/compilers/eventPlateReadiness"
                );
                const label = resolvePropPlateLabel({
                  contract: lastComposed.generationContract,
                  visualDescription: literaryDesc,
                });
                const synth = await synthesizePropSoftPlate({
                  propClassId: label.propClassId,
                  canonical: label.canonical,
                  glyphText: `${label.glyphText}·`,
                  softPlateHint: label.softPlateHint,
                  stillPhase:
                    (composeCtx as { stillPhase?: string }).stillPhase ??
                    (lastComposed as { stillPhase?: string }).stillPhase ??
                    null,
                });
                if (synth.base64 && sanitizeReferenceList([{ type: "image", base64: synth.base64 }]).length) {
                  if (referenceList.length >= 2) {
                    referenceList[1] = { type: "image" as const, base64: synth.base64 };
                  } else {
                    referenceList.push({ type: "image" as const, base64: synth.base64 });
                  }
                  synthesizedProp = true;
                  propPlatePresent = true;
                  (lastComposed as { synthesizedPropPlate?: boolean }).synthesizedPropPlate = true;
                }
              } catch {
                /* optional */
              }
            }
            nextRefs = refsSignature(referenceList);
          }
          (lastComposed as { atomMisses?: string[]; refsSig?: string }).atomMisses = atomMisses;
          (lastComposed as { atomMisses?: string[]; refsSig?: string }).refsSig = nextRefs;
        } catch {
          /* optional */
        }

        // Event refs: continuity-aware budget + 图N ordinal binding
        let refsRolesEcho: string[] = (lastComposed as { refsRoles?: string[] }).refsRoles ?? [];
        try {
          const {
            applyContinuityAwareRefBudget,
            buildEventRefOrdinalBinding,
            objectiveNeedsPropPlate,
            inferEventRefRoles,
            cropIdentityPlateToFaceBias,
          } = await import("@/ruleEngine/compilers/eventPlateReadiness");
          const eventObj = objectiveNeedsPropPlate(lastComposed.generationContract?.objectiveClass);
          const thin =
            lastComposed.generationContract?.mustShowFacts?.some((f) => f.id === "prop_form") ||
            /薄纸片|paper_doc/.test(String(literaryDesc));
          const continuity =
            (lastComposed as { softEnvContinuity?: "must" | "optional" | "none" }).softEnvContinuity ??
            (lastComposed.keepSoftEnvRef ? "must" : "none");
          let softEnvBaked = Boolean(
            (lastComposed as { softEnvBakedIntoIdentity?: boolean }).softEnvBakedIntoIdentity,
          );
          // Upper-body / face-lock when softEnv was NOT baked
          if (eventObj && !softEnvBaked && referenceList[0]?.base64) {
            const { resolveBendIdentityCropPlan, composeBendIdentityPlate } = await import(
              "@/ruleEngine/compilers/eventPlateReadiness"
            );
            const sealCrop2 = (lastComposed.generationContract as {
              primaryIntentSeal?: { poseOccupancy?: string; primaryObjective?: string };
            } | undefined)?.primaryIntentSeal;
            const refsC2 = (lastComposed as {
              stillRefsContract?: {
                identityPreferActionBody?: boolean;
                identityReplaceStandingSheet?: boolean;
              };
            }).stillRefsContract;
            const plan2 = resolveBendIdentityCropPlan({
              identityReplaceStandingSheet: refsC2?.identityReplaceStandingSheet,
              identityPreferActionBody: refsC2?.identityPreferActionBody,
              poseOccupancy: sealCrop2?.poseOccupancy,
              primaryObjective: sealCrop2?.primaryObjective,
              objectiveClass: lastComposed.generationContract?.objectiveClass,
              keepSoftEnvRef: lastComposed.keepSoftEnvRef,
              softEnvContinuity: continuity,
              visualDescription: literaryDesc,
            });
            const face = await cropIdentityPlateToFaceBias(referenceList[0].base64, {
              topRatio: plan2.topRatio,
              preferActionBody: plan2.preferActionBody,
              faceOnly: plan2.faceOnlyLock,
            });
            if (face.cropped && face.base64) {
              referenceList[0] = { type: "image" as const, base64: face.base64 };
            }
            if (plan2.replaceStandingSheet && referenceList[0]?.base64) {
              try {
                const bendId = await composeBendIdentityPlate({
                  faceSourceBase64: referenceList[0].base64,
                });
                if (bendId.usedFace && bendId.base64) {
                  referenceList[0] = { type: "image" as const, base64: bendId.base64 };
                  (lastComposed as { bendIdentityReplaced?: boolean }).bendIdentityReplaced = true;
                  (lastComposed as { bendIdentityReason?: string }).bendIdentityReason = bendId.reason;
                }
              } catch {
                /* keep */
              }
            }
            // Pre-vendor: if identity still white-studio / namecard, force face-lock again
            if (plan2.replaceStandingSheet && referenceList[0]?.base64) {
              try {
                const { probeIdentitySheetLeakPixels, composeBendIdentityPlate: reBend } =
                  await import("@/ruleEngine/compilers/eventPlateReadiness");
                const leak = await probeIdentitySheetLeakPixels({
                  imageBase64: referenceList[0].base64,
                });
                (lastComposed as { identitySheetLeakProbe?: typeof leak }).identitySheetLeakProbe = leak;
                if (leak.sheetLeakSuspected) {
                  const again = await reBend({ faceSourceBase64: referenceList[0].base64 });
                  if (again.usedFace && again.base64) {
                    referenceList[0] = { type: "image" as const, base64: again.base64 };
                    (lastComposed as { bendIdentityReason?: string }).bendIdentityReason =
                      `${again.reason}|reface:${leak.reason}`;
                    lastPipeline = {
                      ...lastPipeline,
                      autoHealed: [
                        ...(lastPipeline.autoHealed ?? []),
                        `identity_sheet_leak_reface:${leak.reason}`,
                      ],
                    };
                  }
                  vendorPrompt = `图1仅锁脸型发饰，禁止复刻白棚定妆/手持名卡/牛仔夹克拼入场面。${String(vendorPrompt).trim()}`;
                }
              } catch {
                /* optional */
              }
            }
          }
          if (!refsRolesEcho.length || refsRolesEcho.length !== referenceList.length) {
            refsRolesEcho = inferEventRefRoles({
              count: referenceList.length,
              propPresent: propPlatePresent || synthesizedProp,
              softEnvPresent: softEnvPlatePresent && !softEnvBaked,
              softEnvBakedIntoIdentity: softEnvBaked,
              keepSoftEnvRef: lastComposed.keepSoftEnvRef,
              propRequired: eventObj,
            });
          }
          const tagged = referenceList.map((r, i) => ({
            type: "image" as const,
            base64: r.base64,
            role: (refsRolesEcho[i] as "identity" | "propSoft" | "softEnv") || "identity",
          }));
          if (!softEnvBaked) {
            // dropFullSoftEnv = drop altar SCENE; keep synth atmosphere softEnv if hung
            const atmHung = Boolean(
              (lastComposed as { atmospherePlateHung?: boolean }).atmospherePlateHung,
            );
            const dropLatch =
              (lastComposed as { stillRefsContract?: { dropFullSoftEnv?: boolean } }).stillRefsContract
                ?.dropFullSoftEnv === true && !atmHung;
            const pick = await applyContinuityAwareRefBudget({
              refs: tagged,
              propRequired: eventObj,
              maxSlots: 3,
              softEnvContinuity: dropLatch ? "none" : continuity,
              allowPixelBake: false,
              forceThreeSlotProp:
                !dropLatch &&
                continuity === "must" &&
                (lastComposed.generationContract?.objectiveClass === "action_primary" ||
                  (lastComposed.generationContract as { primaryIntentSeal?: { poseOccupancy?: string } })
                    ?.primaryIntentSeal?.poseOccupancy === "bend_pickup"),
            });
            referenceList = pick.refs.map((r) => ({ type: "image" as const, base64: r.base64 }));
            refsRolesEcho = pick.roles;
            if (dropLatch) {
              const nextRefs: typeof referenceList = [];
              const nextRoles: string[] = [];
              for (let i = 0; i < referenceList.length; i++) {
                const role = refsRolesEcho[i] || "identity";
                if (role === "softEnv") continue;
                nextRefs.push(referenceList[i]!);
                nextRoles.push(String(role));
              }
              referenceList = nextRefs;
              refsRolesEcho = nextRoles;
              softEnvPlatePresent = false;
              (lastComposed as { droppedSoftEnv?: boolean }).droppedSoftEnv = true;
              (lastComposed as { keepSoftEnvRef?: boolean }).keepSoftEnvRef = false;
              (lastComposed as { softEnvContinuity?: string }).softEnvContinuity = "none";
              (lastComposed as { softEnvMissingHonest?: boolean }).softEnvMissingHonest = false;
              (lastComposed as { vendorDroppedSoftEnv?: boolean }).vendorDroppedSoftEnv = true;
              lastComposed.keepSoftEnvRef = false;
            } else {
              (lastComposed as { droppedSoftEnv?: boolean }).droppedSoftEnv = pick.droppedSoftEnv;
              softEnvPlatePresent = pick.roles.includes("softEnv") || pick.softEnvBakedIntoIdentity;
              (lastComposed as { vendorDroppedSoftEnv?: boolean }).vendorDroppedSoftEnv = Boolean(
                pick.droppedSoftEnv,
              );
              if (softEnvPlatePresent) {
                (lastComposed as { softEnvMissingHonest?: boolean }).softEnvMissingHonest = false;
              }
            }
            propPlatePresent = pick.roles.includes("propSoft");
            if (eventObj && !propPlatePresent) {
              propPlateMissing = true;
              (lastComposed as { propPlateMissing?: boolean }).propPlateMissing = true;
            } else if (propPlatePresent) {
              propPlateMissing = false;
              (lastComposed as { propPlateMissing?: boolean }).propPlateMissing = false;
            }
            softEnvBaked = dropLatch ? false : pick.softEnvBakedIntoIdentity;
            (lastComposed as { refsRoles?: string[] }).refsRoles = refsRolesEcho;
            (lastComposed as { softEnvBakedIntoIdentity?: boolean }).softEnvBakedIntoIdentity = softEnvBaked;
            (lastComposed as { softEnvBakeFailed?: boolean }).softEnvBakeFailed = pick.bakeFailed;
          } else {
            softEnvPlatePresent = true;
            (lastComposed as { refsRoles?: string[] }).refsRoles = refsRolesEcho;
          }
          const sealBind = (lastComposed.generationContract as {
            primaryIntentSeal?: { poseOccupancy?: string };
            designIntentProfile?: { plateMode?: string };
          } | undefined)?.primaryIntentSeal;
          const bindZh = buildEventRefOrdinalBinding({
            roles: refsRolesEcho as Array<"identity" | "propSoft" | "softEnv">,
            propRequired: eventObj,
            thinSheets: Boolean(thin),
            softEnvBakedIntoIdentity: softEnvBaked,
            poseOccupancy: sealBind?.poseOccupancy,
            plateMode: (lastComposed.generationContract as { designIntentProfile?: { plateMode?: string } } | undefined)
              ?.designIntentProfile?.plateMode,
            fragmentPlateHung: Boolean((lastComposed as { fragmentPlateHung?: boolean }).fragmentPlateHung),
            stillPhase:
              (lastComposed as { stillPhase?: string }).stillPhase ??
              (lastComposed.generationContract as { stillPhase?: string } | undefined)?.stillPhase ??
              null,
            castNames: charNames?.length ? charNames : undefined,
            propName: /休书|婚书|信笺/.exec(String(literaryDesc ?? ""))?.[0] ?? null,
            sceneName: (composeCtx as { background?: string }).background ?? null,
          });
          // Mid-pipeline: never append legacy 参考绑定：图N=；full ZH recompile happens pre-vendor
          if (bindZh && !/@图\d\s*为/.test(vendorPrompt) && !/参考绑定\s*[：:]/.test(vendorPrompt)) {
            vendorPrompt = `${String(vendorPrompt).trim()}。${bindZh}`;
          }
          // Scene-first: if keepSoftEnvRef but softEnv slot missing after budget, honest debt + strong ban
          if (
            lastComposed.keepSoftEnvRef &&
            !dropLatch &&
            !refsRolesEcho.includes("softEnv") &&
            !softEnvBaked
          ) {
            (lastComposed as { softEnvMissingHonest?: boolean }).softEnvMissingHonest = true;
            if (!/禁止灰棚/.test(vendorPrompt)) {
              vendorPrompt = `主场景软环境须可辨，禁止灰棚白棚。${String(vendorPrompt).trim()}`;
            }
          }
          // Anti-kneel / anti-squat lead + ground paper when bend occupancy
          const phaseBind = String(
            (lastComposed as { stillPhase?: string }).stillPhase ??
              (lastComposed.generationContract as { stillPhase?: string } | undefined)?.stillPhase ??
              "",
          );
          const approachingBind = phaseBind === "approaching" || phaseBind === "mid_contact";
          if (
            sealBind?.poseOccupancy === "bend_pickup" ||
            /弯腰|捡起|捡拾|俯身|蹲身捡|蹲身拾/.test(String(literaryDesc ?? ""))
          ) {
            vendorPrompt = String(vendorPrompt)
              .replace(/蹲身(拾起|捡起|捡拾|捡)/g, "弯腰$1")
              .replace(/跪坐(持|捧|捡|拾)/g, approachingBind ? "弯腰俯身" : "弯腰捡拾")
              .replace(/盘坐(捡|拾|持)/g, approachingBind ? "弯腰俯身" : "弯腰捡拾");
            if (approachingBind) {
              if (!/伸向纸缘|接近地面|禁止跪坐/.test(vendorPrompt.slice(0, 160))) {
                vendorPrompt = `占位：弯腰俯身接近地面薄纸，主手伸向纸缘（尚未捏紧）；禁止蹲跪盘坐替代弯腰，禁止胸前举卡。${String(vendorPrompt).trim()}`;
              }
            } else if (!/站姿弯腰|禁止蹲跪/.test(vendorPrompt.slice(0, 100))) {
              vendorPrompt = `占位：站姿弯腰捡拾，躯干前倾，休书薄纸主手近地触地；禁止蹲跪盘坐替代弯腰，禁止胸前举卡。${String(vendorPrompt).trim()}`;
            } else if (!/休书薄纸|近地触地|主手触地/.test(vendorPrompt.slice(0, 120))) {
              vendorPrompt = `休书薄纸主手近地触地。${String(vendorPrompt).trim()}`;
            }
          }
          // Orphan --sref SCENE-* without independent softEnv slot confuses vendor
          {
            const { stripOrphanSceneSref } = await import("@/ruleEngine/compilers/eventPlateReadiness");
            const softIndependent = refsRolesEcho.includes("softEnv") && !softEnvBaked;
            vendorPrompt = stripOrphanSceneSref(vendorPrompt, {
              softEnvIndependentSlot: softIndependent,
              softEnvBakedIntoIdentity: softEnvBaked,
            });
          }
          // Soft-env honesty + candle / shallow DOF lead
          if (
            (lastComposed as { stillRefsContract?: { dropFullSoftEnv?: boolean } }).stillRefsContract
              ?.dropFullSoftEnv === true &&
            ((lastComposed as { droppedSoftEnv?: boolean }).droppedSoftEnv ||
              (lastComposed as { vendorDroppedSoftEnv?: boolean }).vendorDroppedSoftEnv)
          ) {
            (lastComposed as { softEnvMissingHonest?: boolean }).softEnvMissingHonest = false;
            const atm = /烛火|烛光|月光|暖光|冷光|夜色|灯火/.exec(String(literaryDesc))?.[0];
            if (atm && !vendorPrompt.includes(atm) && !vendorPrompt.includes("氛围可辨")) {
              vendorPrompt = `保留${atm}氛围可辨，禁止灰棚白棚。${String(vendorPrompt).trim()}`;
            }
          } else if (
            lastComposed.keepSoftEnvRef &&
            !softEnvPlatePresent &&
            !(lastComposed as { softEnvBakedIntoIdentity?: boolean }).softEnvBakedIntoIdentity
          ) {
            const atm = /烛火|烛光|月光|暖光|冷光|夜色|灯火/.exec(String(literaryDesc))?.[0];
            const softHint = atm
              ? `软环境缺 SCENE 板：保留${atm}氛围可辨，禁止灰棚白棚`
              : "软环境缺 SCENE 板：保留室内轮廓可辨，禁止灰棚白棚";
            if (!vendorPrompt.includes("软环境缺") && !vendorPrompt.includes("SCENE 像素未进")) {
              vendorPrompt = `${softHint}。${String(vendorPrompt).trim()}`;
            }
            (lastComposed as { softEnvMissingHonest?: boolean }).softEnvMissingHonest = true;
          } else if (softEnvPlatePresent || softEnvBaked) {
            (lastComposed as { softEnvMissingHonest?: boolean }).softEnvMissingHonest = false;
            (lastComposed as { vendorDroppedSoftEnv?: boolean }).vendorDroppedSoftEnv = false;
            const atm = /烛火|烛光|月光|暖光|冷光|夜色|灯火/.exec(String(literaryDesc))?.[0];
            if (atm && !vendorPrompt.includes(atm)) {
              vendorPrompt = `保留${atm}氛围可辨。${String(vendorPrompt).trim()}`;
            }
            const bgBlurFalse =
              (composeCtx as { bgBlur?: boolean }).bgBlur === false ||
              /禁止浅景深/.test(vendorPrompt);
            if (!bgBlurFalse && !/浅景深/.test(vendorPrompt)) {
              vendorPrompt = `背景浅景深虚化。${String(vendorPrompt).trim()}`;
            }
          }
        } catch {
          /* optional */
        }

        // Final egress lint — strip ENG_ONLY / FLOW_ONLY before vendor
        try {
          const { lintStillPromptBody } = await import("@/ruleEngine/compilers/stillPromptLint");
          const linted = lintStillPromptBody({
            prompt: vendorPrompt,
            visualDescription: literaryDesc,
          });
          vendorPrompt = linted.prompt;
          if (linted.removed.length) {
            lastPipeline = {
              ...lastPipeline,
              autoHealed: [...(lastPipeline.autoHealed ?? []), ...linted.removed.map((r) => `lint:${r}`)],
            };
          }
        } catch {
          /* optional */
        }

        let editStrategy: string | undefined;
        let layoutTemplateId: string | undefined;
        let layoutSkipped: string | undefined;
        let stageCost = 1;
        const useLayoutPreserve = Boolean(layoutPreserve) || (useEdit && Boolean(layoutFamily.family.twoStage));
        const forbidPreserve =
          Boolean(roundForbidLayoutPreserve) ||
          turnaroundCrefUsed ||
          shouldForbidLayoutPreserve({
            castOvercrowd: Boolean((fixHints ?? []).some((h) => /出镜人数|第三人|超员|群像|拼版|四视|单镜头/.test(h))),
            seatMissing: Boolean((fixHints ?? []).some((h) => /太师椅|蒲团|无座|端坐|跪/.test(h))),
            fixHints: fixHints ?? [],
            turnaroundCrefUsed,
          });

        if (useEdit) {
          const { prepareStillImageEdit } = await import("@/ruleEngine/qc/stillImageEdit");
          const { buildLiteraryEditPrompt } = await import("@/ruleEngine/compilers/stillEditLiteraryPrompt");
          const litEdit = buildLiteraryEditPrompt({
            fullPrompt: vendorPrompt,
            description: literaryDesc,
            fixHints: fixHints ?? [],
            characterNames: charNames,
          });
          const prep = prepareStillImageEdit({
            failedImageBase64: failedImageBase64 || "",
            fixHints: fixHints ?? [],
            literaryPrompt: litEdit,
            crefOrderedRefs: referenceList.map((r) => ({
              type: "image" as const,
              base64: r.base64,
              role: "cref" as const,
            })),
            model: String(model),
            vendorHint: String(model).split(":")[0],
            layoutPreserve: useLayoutPreserve && !forbidPreserve,
            strategy: useLayoutPreserve && !forbidPreserve ? "layout_preserve" : undefined,
            castNames: bind.orderedNames.length ? bind.orderedNames : charNames,
            highName: bind.highRole?.name ?? bind.orderedNames[0],
            lowName: bind.lowRole?.name ?? bind.orderedNames[1],
            forbidLayoutPreserve: forbidPreserve,
            shotSize: composeCtx.shotSize,
            visualDescription: literaryDesc,
            seatingHard: seatingHard,
          });
          vendorPrompt = prep.promptUsed;
          referenceList = prep.referenceList.map((r) => ({ type: "image" as const, base64: r.base64 }));
          editStrategy = prep.strategy;
        } else if (layoutFamily.family.twoStage !== false && layoutFamily.family.templateId) {
          const layout = await resolveLayoutForShot({
            pack: seatingPack,
            characterCount: charNames.length,
            qualityMode,
            excludeId: swapLayoutTemplate ? excludeLayoutTemplateId : undefined,
            familyTemplateId: layoutFamily.family.templateId,
            forceTwoStage: layoutFamily.family.twoStage !== false,
          });
          layoutTemplateId = layout.template?.id;
          layoutSkipped = layout.layoutSkipped;
          if (layout.twoStage && layout.layoutBase64 && layout.template) {
            const stageAPrompt = expandStageAPrompt(
              layout.template.stageAPrompt,
              Math.max(layoutFamily.family.minCast ?? 1, charNames.length),
            );
            const stageARefs = [{ type: "image" as const, base64: layout.layoutBase64 }];
            let stageAB64 = "";
            if (deps.imageRunner) {
              const stub = await deps.imageRunner({
                prompt: stageAPrompt,
                referenceList: stageARefs,
                size: quality,
                aspectRatio: aspectRatio ?? ratio,
              });
              stageAB64 = stub.resultBase64 ?? "";
              if (!stageAB64 && stub.getResultUrl) {
                try {
                  stageAB64 = await toB64(await stub.getResultUrl());
                } catch {
                  /* ignore */
                }
              }
            } else {
              const imageClass = await u.Ai.Image(model as `${string}:${string}`).run(
                {
                  prompt: stageAPrompt,
                  referenceList: stageARefs,
                  size: quality as "1K" | "2K" | "4K",
                  aspectRatio: aspectRatio as `${number}:${number}`,
                },
                {
                  taskClass: "工作流图片生成",
                  describe: `still StageA layout family=${layoutFamily.familyId} template=${layout.template.id}`,
                  relatedObjects: JSON.stringify({
                    stage: "layout",
                    templateId: layout.template.id,
                    layoutFamilyId: layoutFamily.familyId,
                  }),
                  projectId,
                },
              );
              const tmpPath = `/${projectId}/workFlow/${u.uuid()}-layout.jpg`;
              await imageClass.save(tmpPath.replace(/^\//, ""));
              const tmpUrl = await u.oss.getSmallImageUrl(tmpPath.replace(/^\//, ""));
              stageAB64 = await toB64(tmpUrl);
            }
            if (stageAB64) {
              const castN = Math.max(layoutFamily.family.minCast ?? 1, charNames.length);
              let stageAOk = true;
              if (deps.stageACastChecker) {
                try {
                  const gate = await deps.stageACastChecker(stageAB64, castN);
                  stageAOk = gate.ok !== false;
                } catch {
                  stageAOk = true;
                }
              }
              if (!stageAOk) {
                layoutSkipped = "stageA_cast_mismatch";
              } else {
                stageCost = 2;
                const applied = applyLayoutAnchorToBurn({
                  vendorPrompt,
                  referenceList,
                  layoutBase64: stageAB64,
                  castNames: bind.orderedNames.length ? bind.orderedNames : charNames,
                  highName: bind.highRole?.name ?? bind.orderedNames[0],
                  lowName: bind.lowRole?.name ?? bind.orderedNames[1],
                  orderedCrefCodes: bind.orderedCodes,
                  seatingHard: true,
                });
                vendorPrompt = applied.vendorPrompt;
                referenceList = applied.referenceList;
              }
            } else {
              layoutSkipped = layoutSkipped ?? "no_file";
            }
          }
        } else {
          layoutSkipped = layoutSkipped ?? "family_skip";
        }
        referenceList = sanitizeReferenceList(referenceList);
        referenceCount = referenceList.length;
        try {
          const { gateReferenceQualityAndCapability } = await import(
            "@/ruleEngine/compilers/referenceQualityCapabilityGate"
          );
          const gate = gateReferenceQualityAndCapability({
            model,
            prompt: vendorPrompt,
            referenceCount,
          });
          if (gate.downgraded) {
            vendorPrompt = `${vendorPrompt}。主导动作优先，道具接触与主体清晰优先于模板人像和背景陈设`;
          }
        } catch {
          /* optional */
        }

        // Re-lint after layout/edit mutations (eng tokens must not escape)
        try {
          const { lintStillPromptBody } = await import("@/ruleEngine/compilers/stillPromptLint");
          vendorPrompt = lintStillPromptBody({
            prompt: vendorPrompt,
            visualDescription: literaryDesc,
          }).prompt;
        } catch {
          /* optional */
        }

        // Sample Must正铅：首发按 shotDesignSample 挂载（单法源，禁仅靠后置 inject）
        try {
          const sample =
            (composeCtx as { shotDesignSample?: import("@/ruleEngine/design/shotDesignSample").ShotDesignSample })
              .shotDesignSample ??
            (lastComposed as { shotDesignSample?: import("@/ruleEngine/design/shotDesignSample").ShotDesignSample })
              .shotDesignSample;
          if (sample?.must?.length) {
            const { mergeDebtInjectsByPrecedence } = await import("@/ruleEngine/design/stillDebtPrecedence");
            const { sampleMustSurviveStems } = await import("@/ruleEngine/design/shotDesignSample");
            const merged = mergeDebtInjectsByPrecedence(
              [{ layer: "sample_must", lines: sampleMustSurviveStems(sample) }],
              { mustStems: sampleMustSurviveStems(sample) },
            );
            for (const line of merged.lines) {
              if (line && !String(vendorPrompt).includes(line.slice(0, 8))) {
                vendorPrompt = `${line}。${String(vendorPrompt).trim()}`;
              }
            }
            (lastComposed as { shotDesignSample?: typeof sample }).shotDesignSample = sample;
            lastPipeline = {
              ...lastPipeline,
              autoHealed: [...(lastPipeline.autoHealed ?? []), "sample_must:first_shot"],
            };
          }
        } catch {
          /* optional */
        }

        // Literary repair delta (auto re-vendor): apply propSoft/drop_softEnv/seed before spend
        const litDelta = (lastComposed as {
          _litRepairDelta?: Awaited<
            ReturnType<typeof import("@/ruleEngine/quality/applyLiteraryRepairDeltas").applyLiteraryRepairDeltas>
          >;
        })._litRepairDelta;
        if (litDelta) {
          // Must swap plates before spend — inject-only is auxiliary
          if (
            litDelta.referenceList?.length &&
            (litDelta.platesSwapped || litDelta.propSoftBase64 || litDelta.droppedSoftEnv)
          ) {
            referenceList = litDelta.referenceList.map((r) => ({
              type: "image" as const,
              base64: r.base64,
            }));
            (lastComposed as { refsRoles?: string[] }).refsRoles = litDelta.refsRoles;
            propPlatePresent = (litDelta.refsRoles ?? []).includes("propSoft");
            propPlateMissing = !propPlatePresent;
            softEnvPlatePresent = (litDelta.refsRoles ?? []).includes("softEnv");
            if (litDelta.droppedSoftEnv) {
              (lastComposed as { droppedSoftEnv?: boolean }).droppedSoftEnv = true;
              lastComposed.keepSoftEnvRef = false;
            }
            if (litDelta.propSoftBase64) {
              (lastComposed as { propPlateGrade?: string }).propPlateGrade = "synthetic_geometry";
              (lastComposed as { synthesizedPropPlate?: boolean }).synthesizedPropPlate = true;
              propPlatePresent = true;
              propPlateMissing = false;
            }
            (lastComposed as { litPlatesSwapped?: boolean }).litPlatesSwapped = Boolean(litDelta.platesSwapped);
            (lastComposed as { litClaimPlateRepair?: boolean }).litClaimPlateRepair = Boolean(
              litDelta.claimPlateRepair,
            );
          } else if (litDelta.platesSwapped === false) {
            lastPipeline = {
              ...lastPipeline,
              autoHealed: [...(lastPipeline.autoHealed ?? []), "lit_delta:inject_only_no_claim"],
            };
          }
          if (litDelta.injectLines?.length) {
            vendorPrompt = `${litDelta.injectLines.join("。")}。${String(vendorPrompt).trim()}`;
          }
          delete (lastComposed as { _litRepairDelta?: unknown })._litRepairDelta;
        }

        // Final bend strip: never let cheek legislation escape to vendor
        try {
          const sealStrip =
            (lastComposed.generationContract as { primaryIntentSeal?: import("@/ruleEngine/compilers/primaryIntentSeal").PrimaryIntentCarrierSet })
              ?.primaryIntentSeal ?? null;
          const { stripHostileCheekLegislation } = await import("@/ruleEngine/compilers/stillSealGate");
          const stripped = stripHostileCheekLegislation(vendorPrompt, sealStrip, {
            currentVisualDescription: literaryDesc,
          });
          vendorPrompt = stripped.prompt;
          if (stripped.stripped.length) {
            lastPipeline = {
              ...lastPipeline,
              autoHealed: [...(lastPipeline.autoHealed ?? []), "stripHostileCheek:preVendor"],
            };
          }
        } catch {
          /* optional */
        }

        // Sole spine reseal: after all Core soup mutations, rebuild egress from SSOT
        try {
          const ff = (lastComposed as { firstFrameExtract?: import("@/ruleEngine/compilers/stillFirstFrameExtract").StillFirstFrameExtract })
            .firstFrameExtract;
          const phaseNow = String(
            (lastComposed as { stillPhase?: string }).stillPhase ??
              (lastComposed.generationContract as { stillPhase?: string } | undefined)?.stillPhase ??
              ff?.stillPhase ??
              "",
          );
          if (ff) {
            const { resealVendorPromptToSsot } = await import("@/ruleEngine/compilers/stillSsotRead");
            const { resolveGatedSoftHints } = await import("@/ruleEngine/compilers/industryNormGate");
            const gatedN = resolveGatedSoftHints({
              stillIntentClass: String(ff.intentClass ?? lastComposed.generationContract?.objectiveClass ?? ""),
              stillPhase: phaseNow || ff.stillPhase,
              shotSize: String(composeCtx.shotSize ?? ""),
              visualDescription: literaryDesc,
              otsLike: ff.intentClass === "ots",
              faceish: ff.intentClass === "face",
              speakLike: ff.intentClass === "speak",
            });
            const colorTemp =
              String((composeCtx as { colorTemp?: string }).colorTemp ?? "").trim() ||
              (() => {
                try {
                  const { resolveColorTempFromCtx } =
                    require("@/ruleEngine/compilers/composeStillPrompt") as {
                      resolveColorTempFromCtx?: (c: typeof composeCtx) => string | null;
                    };
                  // resolveColorTempFromCtx may be module-private — fall through
                  void resolveColorTempFromCtx;
                } catch {
                  /* */
                }
                return "";
              })();
            const sceneName = String(
              (composeCtx as { sceneName?: string }).sceneName ?? composeCtx.sceneCode ?? "",
            ).trim();
            const envLine =
              sceneName && !/^SCENE-/i.test(sceneName) && !/CHAR-SCENE/i.test(sceneName)
                ? `环境：${sceneName.replace(/^SCENE-/i, "")}轮廓可辨`
                : null;
            const colorLine = colorTemp
              ? /色温：/.test(colorTemp)
                ? colorTemp
                : `色温：${colorTemp}`
              : /4500|暖光|烛/.test(String(literaryDesc ?? ""))
                ? "色温：4500K"
                : null;
            const forceReseal =
              phaseNow === "approaching" ||
              phaseNow === "mid_contact" ||
              Boolean(ff.stillPhase);
            const resealed = resealVendorPromptToSsot({
              vendorPrompt,
              extract: { ...ff, stillPhase: (phaseNow || ff.stillPhase) as typeof ff.stillPhase },
              normHints: gatedN.hints,
              colorTempLine: colorLine,
              envLine,
              force: forceReseal,
            });
            if (resealed.resealed) {
              vendorPrompt = resealed.prompt;
              if (!/禁止跪坐|禁止蹲跪/.test(vendorPrompt)) {
                vendorPrompt = `${vendorPrompt}。禁止跪坐/蹲跪替代弯腰俯身`;
              }
              lastPipeline = {
                ...lastPipeline,
                autoHealed: [...(lastPipeline.autoHealed ?? []), "ff.ssot_reseal:preVendor"],
                egressPrompt: vendorPrompt,
              };
            }
          }
        } catch {
          /* optional */
        }

        // Persist last refs for literary auto-repair
        (lastComposed as { lastReferenceList?: Array<{ type: "image"; base64: string }> }).lastReferenceList =
          referenceList.map((r) => ({ type: "image" as const, base64: r.base64 }));

        // Seedream handbook: ≤3 slots identity→prop→softEnv; skirt_blur single identity
        {
          const { capStillRefsHandbookSlots } = await import(
            "@/ruleEngine/compilers/eventPlateReadiness"
          );
          let singleId = true;
          try {
            const narr = (composeCtx as { narrative?: { secondaryBudget?: string } }).narrative;
            const dip = (lastComposed.generationContract as {
              designIntentProfile?: { secondaryBudget?: string };
            } | undefined)?.designIntentProfile;
            const budget =
              narr?.secondaryBudget ?? dip?.secondaryBudget ?? "";
            singleId = budget === "skirt_blur" || budget === "hands_only" || budget === "none" || !budget;
          } catch {
            singleId = true;
          }
          const rolesNow = ((lastComposed as { refsRoles?: string[] }).refsRoles ?? []).slice();
          const taggedHb = referenceList.map((r, i) => ({
            type: "image" as const,
            base64: r.base64,
            role: (rolesNow[i] as "identity" | "propSoft" | "softEnv") || "identity",
          }));
          const capped = capStillRefsHandbookSlots({
            refs: taggedHb,
            maxSlots: 20,
            singleIdentityOnly: singleId,
          });
          referenceList = capped.refs.map((r) => ({ type: "image" as const, base64: r.base64 }));
          (lastComposed as { refsRoles?: string[] }).refsRoles = capped.roles;
          if (capped.dropped.length) {
            (lastComposed as { handbookRefsDropped?: string[] }).handbookRefsDropped = capped.dropped;
          }
          // Period / face-lock: never burn pure-text as identity lock
          const wantsId =
            (lastComposed as { stillRefsContract?: { identityReplaceStandingSheet?: boolean } })
              .stillRefsContract?.identityReplaceStandingSheet === true ||
            (lastComposed.generationContract as { primaryIntentSeal?: { poseOccupancy?: string } } | undefined)
              ?.primaryIntentSeal?.poseOccupancy === "bend_pickup" ||
            lastComposed.generationContract?.objectiveClass === "action_primary";
          if (wantsId && referenceList.length < 1 && qualityMode === "hq_update") {
            throw Object.assign(new Error("定妆锁需要至少1张身份参考图；禁止无图纯文冒充"), {
              code: "CREF_MISSING_FOR_IDENTITY_LOCK",
              primaryNextStep: "chat_repair",
              userMessage: "请挂定妆/脸锁参考后再生成",
              ctaLabel: "补参考后生成",
            });
          }
          // Final 图N bind from capped roles — replace any incomplete 图1-only prefix
          {
            const { buildEventRefOrdinalBinding } = await import(
              "@/ruleEngine/compilers/eventPlateReadiness"
            );
            const sealBindFinal = (lastComposed.generationContract as {
              primaryIntentSeal?: { poseOccupancy?: string };
              designIntentProfile?: { plateMode?: string };
            } | undefined)?.primaryIntentSeal;
            const finalRoles = ((lastComposed as { refsRoles?: string[] }).refsRoles ??
              []) as Array<"identity" | "propSoft" | "softEnv">;
            const propNameFinal =
              mountedPropName || (/休书|婚书|信笺/.exec(String(literaryDesc ?? ""))?.[0] ?? null);
            const sceneNameFinal =
              mountedSceneName || ((composeCtx as { background?: string }).background ?? null);
            const castFinal =
              charNames?.length
                ? charNames
                : [
                    (lastComposed as { primaryName?: string }).primaryName ||
                      (lastComposed.generationContract as { primaryName?: string } | undefined)
                        ?.primaryName,
                  ].filter(Boolean) as string[];
            const bindFinal = buildEventRefOrdinalBinding({
              roles: finalRoles,
              propRequired: Boolean(
                lastComposed.generationContract?.objectiveClass === "contact_geom" ||
                  lastComposed.generationContract?.objectiveClass === "action_primary",
              ),
              softEnvBakedIntoIdentity: Boolean(
                (lastComposed as { softEnvBakedIntoIdentity?: boolean }).softEnvBakedIntoIdentity,
              ),
              poseOccupancy: sealBindFinal?.poseOccupancy,
              plateMode: (lastComposed.generationContract as { designIntentProfile?: { plateMode?: string } } | undefined)
                ?.designIntentProfile?.plateMode,
              fragmentPlateHung: Boolean((lastComposed as { fragmentPlateHung?: boolean }).fragmentPlateHung),
              stillPhase:
                (lastComposed as { stillPhase?: string }).stillPhase ??
                (lastComposed.generationContract as { stillPhase?: string } | undefined)?.stillPhase ??
                null,
              castNames: castFinal,
              propName: propNameFinal,
              sceneName: sceneNameFinal,
            });
            if (bindFinal || finalRoles.length > 0) {
              // Drop legacy 参考绑定：图N= and EN Avoid — Seedream ZH @图N only
              try {
                const { compileSeedreamAtTuZhPrompt, stripLegacyStillVendorEgress } =
                  require("@/ruleEngine/compilers/tunOrdinalBinding") as typeof import("@/ruleEngine/compilers/tunOrdinalBinding");
                vendorPrompt = compileSeedreamAtTuZhPrompt({
                  refsRoles: finalRoles,
                  castNames: castFinal,
                  propName: propNameFinal,
                  primaryName: castFinal[0],
                  visualDescription: literaryDesc,
                  shotSize: (lastComposed as { shotSize?: string }).shotSize,
                  sceneName: sceneNameFinal,
                  poseOccupancy: sealBindFinal?.poseOccupancy,
                  stillPhase:
                    (lastComposed as { stillPhase?: string }).stillPhase ??
                    (lastComposed.generationContract as { stillPhase?: string } | undefined)?.stillPhase,
                  readableZhText: propNameFinal || undefined,
                  preferredBindingBlock: bindFinal,
                }).prompt;
                vendorPrompt = stripLegacyStillVendorEgress(vendorPrompt);
              } catch {
                vendorPrompt = `${bindFinal || ""}，【画面】${String(literaryDesc || vendorPrompt).slice(0, 120)}。`;
              }
            }
          }
          // Bend: force face-crop on identity[0] if still wide turnaround sheet
          if (
            wantsId &&
            referenceList[0]?.base64 &&
            ((lastComposed as { stillRefsContract?: { identityReplaceStandingSheet?: boolean } })
              .stillRefsContract?.identityReplaceStandingSheet === true ||
              (lastComposed.generationContract as { primaryIntentSeal?: { poseOccupancy?: string } } | undefined)
                ?.primaryIntentSeal?.poseOccupancy === "bend_pickup")
          ) {
            try {
              let b64 = referenceList[0].base64;
              const { cropTurnaroundSheetToIdentityPlate } = await import(
                "@/ruleEngine/compilers/cropTurnaroundToIdentityPlate"
              );
              const sheet = await cropTurnaroundSheetToIdentityPlate(b64, {
                assumeSheet: true,
                threeViewStrip: true,
              });
              if (sheet.cropped && sheet.base64) b64 = sheet.base64;
              const { cropIdentityPlateToFaceBias } = await import(
                "@/ruleEngine/compilers/eventPlateReadiness"
              );
              const face = await cropIdentityPlateToFaceBias(b64, {
                topRatio: 0.45,
                faceOnly: true,
                preferActionBody: false,
              });
              if (face.cropped && face.base64) {
                referenceList[0] = { type: "image", base64: face.base64 };
              } else {
                const { stampTunLedgerOntoMeta } =
                  require("@/ruleEngine/compilers/tunOrdinalLedger") as typeof import("@/ruleEngine/compilers/tunOrdinalLedger");
                Object.assign(
                  lastComposed as object,
                  stampTunLedgerOntoMeta(lastComposed as Record<string, unknown>, {
                    kind: "identity_sheet",
                    detail: "preVendor face crop failed",
                    missingSlot: "identity.sheet",
                  }),
                );
              }
            } catch {
              /* optional */
            }
          }
        }

        let url: string;
        let savePath: string;
        let imageBase64: string;
        const vendorT0 = Date.now();
        let vendorCalled = false;
        const { runStillVendorWithActuatorCore } = await import(
          "@/ruleEngine/actuators/runStillVendorWithActuator"
        );
        const vendorOut = await runStillVendorWithActuatorCore({
          vendorPrompt,
          referenceList,
          refsRoles: (lastComposed as { refsRoles?: string[] }).refsRoles,
          objectiveClass: lastComposed.generationContract?.objectiveClass,
          softEnvContinuity: (lastComposed as { softEnvContinuity?: string }).softEnvContinuity,
          keepSoftEnvRef: lastComposed.keepSoftEnvRef,
          propClassId: (lastComposed.generationContract as { propClassId?: string } | undefined)?.propClassId,
          propSource: (lastComposed as { propSource?: string }).propSource,
          synthesizedProp,
          propPlateMissing,
          propPlateGrade: (lastComposed as { propPlateGrade?: string }).propPlateGrade,
          projectId,
          uuid: () => u.uuid(),
          ossWriteFile: (p, d) => u.oss.writeFile(p, d),
          getSmallImageUrl: (p) => u.oss.getSmallImageUrl(p),
          imageRunner: deps.imageRunner,
          prevGenFingerprint: (lastComposed as { genFingerprint?: string }).genFingerprint ?? null,
          deltaHints: litDelta?.deltaHints ?? (lastComposed as { litRepairDeltaHints?: string[] }).litRepairDeltaHints ?? null,
          visualDescription: literaryDesc,
          castNames: charNames,
          primaryName: charNames?.[0] || (lastComposed as { primaryName?: string }).primaryName,
          propName: mountedPropName || (/休书|婚书|信笺/.exec(String(literaryDesc ?? ""))?.[0] ?? null),
          sceneName: mountedSceneName || ((composeCtx as { background?: string }).background ?? null),
          readableZhText: mountedPropName || (/休书|婚书|信笺/.exec(String(literaryDesc ?? ""))?.[0] ?? null),
          shotSize: (lastComposed as { shotSize?: string }).shotSize ?? composeCtx.shotSize,
          colorTempK: (lastComposed as { colorTempK?: number | string }).colorTempK,
          poseOccupancy: (lastComposed.generationContract as { primaryIntentSeal?: { poseOccupancy?: string }; designIntentProfile?: { poseOccupancy?: string } } | undefined)
            ?.primaryIntentSeal?.poseOccupancy ??
            (lastComposed.generationContract as { designIntentProfile?: { poseOccupancy?: string } } | undefined)
              ?.designIntentProfile?.poseOccupancy,
          primaryIntentSeal: (lastComposed.generationContract as { primaryIntentSeal?: { poseOccupancy?: string; sealHash?: string } } | undefined)
            ?.primaryIntentSeal,
          stillPhase:
            (lastComposed as { stillPhase?: string }).stillPhase ??
            (lastComposed.generationContract as { stillPhase?: string } | undefined)?.stillPhase ??
            (lastComposed as { firstFrameExtract?: { stillPhase?: string } }).firstFrameExtract?.stillPhase ??
            null,
          runSeedream: async (promptOverride?: string) => {
            const seedPrompt = promptOverride || vendorPrompt;
            if (deps.imageRunner) {
              const stub = await deps.imageRunner({
                prompt: seedPrompt,
                referenceList,
                size: quality,
                aspectRatio: aspectRatio ?? ratio,
                seed: vendorSeed,
              });
              const sp = `/${projectId}/workFlow/${u.uuid()}.jpg`;
              await stub.save(sp.replace(/^\//, ""));
              const uurl = stub.getResultUrl
                ? await stub.getResultUrl()
                : await u.oss.getSmallImageUrl(sp.replace(/^\//, ""));
              return {
                url: uurl,
                savePath: sp,
                imageBase64: stub.resultBase64 ?? (await toB64(uurl)),
              };
            }
            const imageClass = await u.Ai.Image(model as `${string}:${string}`).run(
              {
                prompt: seedPrompt,
                referenceList,
                size: quality as "1K" | "2K" | "4K",
                aspectRatio: aspectRatio as `${number}:${number}`,
                ...(vendorSeed != null ? { seed: vendorSeed } : {}),
              },
              {
                taskClass: "工作流图片生成",
                describe: `工作流图片生成 mode=${modeRules.modeId} edit=${editStrategy ?? "generate"} stageCost=${stageCost}`,
                relatedObjects: JSON.stringify({
                  ...body,
                  resolvedImageMode:
                    referenceList.length >= 2
                      ? "multiReference"
                      : referenceList.length === 1
                        ? "singleImage"
                        : modeRules.modeId,
                  qualityMode,
                  qualityLadder: sizeLadder.ladder,
                  vendorSeed,
                  refsRoles: (lastComposed as { refsRoles?: string[] }).refsRoles,
                  editStrategy,
                  layoutTemplateId,
                  bgPolicy: lastComposed.bgPolicy ?? bgPol.policy,
                  sceneRefsDropped,
                  stageCost,
                }),
                projectId,
              },
            );
            const sp = `/${projectId}/workFlow/${u.uuid()}.jpg`;
            await imageClass.save(sp.replace(/^\//, ""));
            const uurl = await u.oss.getSmallImageUrl(sp.replace(/^\//, ""));
            return { url: uurl, savePath: sp, imageBase64: await toB64(uurl) };
          },
        });
        url = vendorOut.url;
        savePath = vendorOut.savePath;
        imageBase64 = vendorOut.imageBase64;
        vendorCalled = vendorOut.vendorCalled;
        (lastComposed as { actuatorId?: string }).actuatorId = vendorOut.actuatorId;
        (lastComposed as { actuatorDegraded?: boolean }).actuatorDegraded = vendorOut.actuatorDegraded;
        (lastComposed as { actuatorDegradedReason?: string }).actuatorDegradedReason =
          vendorOut.actuatorDegradedReason;
        (lastComposed as { workflowHash?: string }).workflowHash = vendorOut.workflowHash;
        (lastComposed as { propPlateGrade?: string }).propPlateGrade = vendorOut.propPlateGrade;
        (lastComposed as { egressCompressed?: boolean }).egressCompressed = vendorOut.egressCompressed;
        if (vendorOut.vendorPromptUsed) {
          (lastComposed as { vendorPromptUsed?: string }).vendorPromptUsed = vendorOut.vendorPromptUsed;
          // Handbook: promptUsed = ZH @图N bytes actually sent to Seedream
          vendorPrompt = vendorOut.vendorPromptUsed;
        }
        // Stamp refsRoles + refThumbUrls in physical send order (cropped bytes)
        {
          const rolesStamp = (lastComposed as { refsRoles?: string[] }).refsRoles ?? [];
          (lastComposed as { refsRoles?: string[] }).refsRoles = rolesStamp.length
            ? rolesStamp
            : rolesStamp;
          const thumbs: string[] = [];
          const thumbMissing: string[] = [];
          for (let i = 0; i < referenceList.length; i++) {
            const raw = String(referenceList[i]?.base64 ?? "").replace(/^data:image\/\w+;base64,/, "");
            if (!raw) {
              thumbs.push("");
              thumbMissing.push("ref.thumb_missing");
              continue;
            }
            if (raw.length > 180_000) {
              thumbs.push("");
              thumbMissing.push("ref.thumb_missing");
            } else {
              thumbs.push(`data:image/jpeg;base64,${raw}`);
            }
          }
          (lastComposed as { refThumbUrls?: string[] }).refThumbUrls = thumbs;
          if (thumbMissing.length) {
            (lastComposed as { missingSlots?: string[] }).missingSlots = [
              ...new Set([
                ...((lastComposed as { missingSlots?: string[] }).missingSlots ?? []),
                "ref.thumb_missing",
              ]),
            ];
          }
          try {
            const { assertAtTuHomology } =
              require("@/ruleEngine/compilers/tunOrdinalBinding") as typeof import("@/ruleEngine/compilers/tunOrdinalBinding");
            const homo = assertAtTuHomology(String(vendorOut.vendorPromptUsed ?? vendorPrompt), referenceList.length);
            if (!homo.ok) {
              (lastComposed as { missingSlots?: string[] }).missingSlots = [
                ...new Set([
                  ...((lastComposed as { missingSlots?: string[] }).missingSlots ?? []),
                  ...homo.missingSlots,
                ]),
              ];
            }
          } catch {
            /* optional */
          }
        }
        (lastComposed as { vendorSeed?: number }).vendorSeed = vendorSeed;
        (lastComposed as { qualityLadder?: string }).qualityLadder = sizeLadder.ladder;
        (lastComposed as { stillStage?: string }).stillStage = genProfile.stage;
        if (vendorOut.healedFields?.length) {
          (lastComposed as { healedFields?: string[] }).healedFields = vendorOut.healedFields;
          (lastComposed as { sources?: string[] }).sources = [
            ...((lastComposed as { sources?: string[] }).sources ?? []),
            ...vendorOut.healedFields.map((f) => `heal.field:${f}`),
          ];
        }
        if (vendorOut.missingSlots?.length) {
          (lastComposed as { missingSlots?: string[] }).missingSlots = [
            ...new Set([
              ...((lastComposed as { missingSlots?: string[] }).missingSlots ?? []),
              ...vendorOut.missingSlots,
            ]),
          ];
        }
        try {
          const { resolveTunOneClickHeal } =
            require("@/ruleEngine/design/tunOneClickHeal") as typeof import("@/ruleEngine/design/tunOneClickHeal");
          const { stampTunLedgerOntoMeta } =
            require("@/ruleEngine/compilers/tunOrdinalLedger") as typeof import("@/ruleEngine/compilers/tunOrdinalLedger");
          const { assertVendorTunSurvived } =
            require("@/ruleEngine/compilers/tunOrdinalBinding") as typeof import("@/ruleEngine/compilers/tunOrdinalBinding");
          const roles = (lastComposed as { refsRoles?: string[] }).refsRoles ?? [];
          if (!assertVendorTunSurvived(String(vendorOut.vendorPromptUsed ?? ""), roles.length)) {
            (lastComposed as { missingSlots?: string[] }).missingSlots = [
              ...new Set([
                ...((lastComposed as { missingSlots?: string[] }).missingSlots ?? []),
                "ref.ordinal_mismatch",
              ]),
            ];
            Object.assign(
              lastComposed as object,
              stampTunLedgerOntoMeta(lastComposed as Record<string, unknown>, {
                kind: "ordinal_rebind",
                detail: "vendor egress missing 图N binding",
                missingSlot: "ref.ordinal_mismatch",
              }),
            );
          } else if (roles.length) {
            Object.assign(
              lastComposed as object,
              stampTunLedgerOntoMeta(lastComposed as Record<string, unknown>, {
                kind: "tun_kept",
                detail: `图N survived n=${roles.length}`,
              }),
            );
          }
          const tunCta = resolveTunOneClickHeal({
            missingSlots: (lastComposed as { missingSlots?: string[] }).missingSlots,
            existingKind: (lastComposed as { oneClickRepairKind?: string }).oneClickRepairKind,
          });
          if (tunCta.oneClickRepairKind !== "none") {
            (lastComposed as { oneClickRepairKind?: string }).oneClickRepairKind =
              tunCta.oneClickRepairKind;
            if (tunCta.ctaLabel) {
              (lastComposed as { ctaLabel?: string }).ctaLabel = tunCta.ctaLabel;
            }
          }
        } catch {
          /* optional */
        }
        if (vendorOut.seedreamFields) {
          (lastComposed as { seedreamFields?: Record<string, string> }).seedreamFields =
            vendorOut.seedreamFields;
        }
        (lastComposed as { atmospherePlateHung?: boolean }).atmospherePlateHung = Boolean(
          (lastComposed as { atmospherePlateHung?: boolean }).atmospherePlateHung,
        );
        try {
          const { createHash } = require("crypto") as typeof import("crypto");
          const fp = createHash("sha256")
            .update(
              `${vendorOut.vendorPromptUsed || vendorPrompt}|${(lastComposed as { refsRoles?: string[] }).refsRoles?.join(",") ?? ""}|${referenceList.length}`,
            )
            .digest("hex")
            .slice(0, 24);
          (lastComposed as { genFingerprint?: string }).genFingerprint = fp;
        } catch {
          (lastComposed as { genFingerprint?: string }).genFingerprint = `fp_${Date.now().toString(36)}`;
        }
        const vendorMs = vendorOut.vendorMs || Date.now() - vendorT0;
        (lastComposed as { vendorCalled?: boolean; vendorMs?: number; refsRoles?: string[] }).vendorCalled =
          vendorCalled;
        (lastComposed as { vendorMs?: number }).vendorMs = vendorMs;
        if (!vendorCalled) {
          throw Object.assign(new Error("未真实调用出图供应商（疑似空转旧图）"), {
            code: "STILL-NO-VENDOR",
            primaryNextStep: "retry_shot",
            userMessage: "未真实调用出图供应商（疑似空转旧图）；请重试生图",
            ctaLabel: "重试生图",
          });
        }
        (lastComposed as { lastImageBase64?: string }).lastImageBase64 = imageBase64;
        // Wave-10: local soft face box (provisional; never measured)
        try {
          const { estimateLocalSoftFaceBox, stampLocalSoftFaceBoxOnMeta } =
            await import("@/ruleEngine/compilers/localSoftFaceBox");
          const softBox = await estimateLocalSoftFaceBox({ imageBase64 });
          if (softBox) {
            stampLocalSoftFaceBoxOnMeta(lastComposed as Record<string, unknown>, softBox);
          }
        } catch {
          /* optional */
        }
        return {
          url,
          savePath,
          promptUsed: vendorPrompt,
          imageBase64,
          allowHqOkL0: lastPipeline.allowHqOk,
          fidelityMissing: lastPipeline.fidelityMissing,
          strategy: (editStrategy as "agnes_i2i" | "atlas_native" | "focus_regen" | "layout_preserve" | "generate") ?? "generate",
          layoutTemplateId,
          layoutSkipped,
          layoutFamilyId: layoutFamily.familyId,
          bgPolicy: lastComposed.bgPolicy ?? bgPol.policy,
          sceneRefsDropped,
          stageCost,
          vendorCalled,
          vendorMs,
        };
      };

    let loopOut = await runStillVisualFidelityLoop({
      qualityMode,
      storyboardId,
      description: literaryDesc,
      checklist,
      healBudget: budget,
      strengthen: body.strengthen,
      judgeFn: deps.vlmJudgeFn,
      db,
      bgPolicy: bgPol.policy,
      generateOnce,
    });

    // Literary auto-repair re-vendor (budget 2) — real delta, not stamp-and-wait
    try {
      const { reassertLiteraryEffectsAfterStill, literaryEffectsPersistSlice } = await import(
        "@/ruleEngine/quality/literaryEffectsAfterStill"
      );
      const { applyLiteraryRepairDeltas } = await import("@/ruleEngine/quality/applyLiteraryRepairDeltas");
      const seal =
        (lastComposed.generationContract as { primaryIntentSeal?: import("@/ruleEngine/compilers/primaryIntentSeal").PrimaryIntentCarrierSet })
          ?.primaryIntentSeal ?? null;
      const MAX_LIT = 3;
      for (let litRound = 0; litRound < MAX_LIT; litRound++) {
        const lit = await reassertLiteraryEffectsAfterStill({
          visualDescription: literaryDesc,
          promptUsed: loopOut.promptUsed,
          seal,
          refsRoles: (lastComposed as { refsRoles?: string[] }).refsRoles,
          propPlateGrade: (lastComposed as { propPlateGrade?: string }).propPlateGrade,
          propPlateMissing: (lastComposed as { propPlateMissing?: boolean }).propPlateMissing,
          imageBase64: loopOut.imageBase64 ?? (lastComposed as { lastImageBase64?: string }).lastImageBase64,
          videoMotionStartHint: (lastComposed.generationContract as { videoMotionStartHint?: string } | undefined)
            ?.videoMotionStartHint,
          shotDesignSample: (lastComposed as { shotDesignSample?: import("@/ruleEngine/design/shotDesignSample").ShotDesignSample })
            .shotDesignSample,
          episodeShot: (lastComposed as { episodeShot?: Record<string, unknown> }).episodeShot,
          droppedSoftEnv: (lastComposed as { droppedSoftEnv?: boolean }).droppedSoftEnv,
          fragmentPlateHung: (lastComposed as { fragmentPlateHung?: boolean }).fragmentPlateHung,
          referenceList: (lastComposed as { lastReferenceList?: Array<{ type: "image"; base64: string; role?: string }> })
            .lastReferenceList,
          identityContam: (lastComposed as {
            identityContamProbe?: { modernAttireSuspected?: boolean; grayStudioSuspected?: boolean };
          }).identityContamProbe,
          stillPhase:
            (lastComposed as { stillPhase?: string }).stillPhase ??
            ((lastComposed as { episodeShot?: { narrative?: { stillPhase?: string } } }).episodeShot?.narrative
              ?.stillPhase) ??
            null,
        });
        (lastComposed as { literaryEffectsPersist?: Record<string, unknown> }).literaryEffectsPersist =
          literaryEffectsPersistSlice(lit);
        if (lit.sampleMustFulfilled === true || lit.literaryEffectsQualified === true) break;
        const trunkStillMiss = (lit.sampleMustMissIds ?? lit.missingEffects.map((m) => m.id)).some((id) =>
          /prop\.|fg\.|bg\.|identity\.|camera\./.test(String(id)),
        );
        // Cap early when trunk Must cleared path is stuck without plate-swappable trunk miss
        if (!trunkStillMiss && litRound >= 2) break;
        const delta = await applyLiteraryRepairDeltas({
          missingEffects: [...lit.missingEffects, ...lit.shouldMisses.slice(0, 2)],
          deltaHints: lit.repairDeltaHints,
          injectLines: lit.repairInjectLines,
          poseOccupancy: seal?.poseOccupancy ?? null,
          visualDescription: literaryDesc,
          referenceList: (lastComposed as { lastReferenceList?: Array<{ type: "image"; base64: string; role?: string }> })
            .lastReferenceList,
          refsRoles: (lastComposed as { refsRoles?: string[] }).refsRoles,
          softEnvBase64: (() => {
            const roles = (lastComposed as { refsRoles?: string[] }).refsRoles ?? [];
            const refs =
              (lastComposed as { lastReferenceList?: Array<{ base64?: string; role?: string }> })
                .lastReferenceList ?? [];
            const idx = roles.indexOf("softEnv");
            if (idx >= 0) return refs[idx]?.base64;
            const byRole = refs.find((r) => r.role === "softEnv");
            return byRole?.base64;
          })(),
          stillPhase:
            (lastComposed as { stillPhase?: string }).stillPhase ??
            (lastComposed.generationContract as { stillPhase?: string } | undefined)?.stillPhase ??
            null,
        });
        // Refuse inject-only revendor claim when plates were not swapped
        if (!delta.claimPlateRepair && !delta.platesSwapped) {
          lastPipeline = {
            ...lastPipeline,
            autoHealed: [
              ...(lastPipeline.autoHealed ?? []),
              `lit_auto_revendor_blocked_no_plate_swap:${litRound + 1}`,
              ...delta.sources,
            ],
          };
          if (
            !delta.propSoftBase64 &&
            !delta.referenceList?.some((r) => (r.role === "propSoft" || r.role === "softEnv") && r.base64)
          ) {
            continue;
          }
        }
        (lastComposed as { _litRepairDelta?: typeof delta })._litRepairDelta = delta;
        (lastComposed as { litRepairDeltaHints?: string[] }).litRepairDeltaHints = delta.deltaHints;
        if (delta.droppedSoftEnv) {
          (lastComposed as { droppedSoftEnv?: boolean }).droppedSoftEnv = true;
          (lastComposed as { softEnvContinuity?: string }).softEnvContinuity = "none";
          lastComposed.keepSoftEnvRef = false;
        }
        if (delta.refsRoles?.includes("softEnv") && !delta.droppedSoftEnv) {
          (lastComposed as { droppedSoftEnv?: boolean }).droppedSoftEnv = false;
          lastComposed.keepSoftEnvRef = true;
          (lastComposed as { softEnvContinuity?: string }).softEnvContinuity =
            (lastComposed as { softEnvContinuity?: string }).softEnvContinuity ?? "must";
        }
        lastPipeline = {
          ...lastPipeline,
          autoHealed: [
            ...(lastPipeline.autoHealed ?? []),
            delta.claimPlateRepair
              ? `lit_auto_revendor:${litRound + 1}:plates_swapped`
              : `lit_auto_revendor:${litRound + 1}:aux`,
            ...delta.sources,
          ],
        };
        const once = await generateOnce({
          strengthen: {},
          mode: "generate",
          fixHints: delta.injectLines,
          forceFullCompose: true,
          round: 100 + litRound,
        });
        loopOut = {
          ...loopOut,
          url: once.url,
          savePath: once.savePath,
          promptUsed: once.promptUsed,
          imageBase64: once.imageBase64,
          autoHealed: [
            ...(loopOut.autoHealed ?? []),
            delta.claimPlateRepair
              ? `lit_auto_revendor:${litRound + 1}:plates_swapped`
              : `lit_auto_revendor:${litRound + 1}:aux`,
          ],
          editStrategy: once.strategy,
        };
      }
    } catch (litErr) {
      console.warn("[generateFlowImage] literary auto-revendor failed", u.error(litErr).message);
    }

    budget = loopOut.healBudget;
    return await finalizeSuccess(db, {
      url: loopOut.url,
      savePath: loopOut.savePath,
      promptUsed: loopOut.promptUsed,
      literaryDesc,
      policy,
      storyboardId,
      persistToStoryboard,
      qualityMode,
      composed: lastComposed,
      composeHash: computeComposeHash(composeCtx),
      referenceCount,
      imageMode: modeRules.modeId || inferImageModeFromRefCount(referenceCount),
      healBudget: budget,
      resolvedQuality: quality,
      allowHqOk: loopOut.visualPass || (loopOut.stopReason === "skipped_draft" && lastPipeline.allowHqOk),
      literaryChars: lastPipeline.literaryChars,
      collapsed: lastPipeline.collapsed,
      autoHealed: [...(lastPipeline.autoHealed ?? []), ...loopOut.autoHealed],
      pipelineVersion: lastPipeline.pipelineVersion,
      recipeHeals: lastPipeline.recipeHeals ?? lastComposed.recipeHeals,
      pipelineCoverageOk: lastPipeline.coverage?.ok !== false && lastComposed.descCoverageOk !== false,
      pipelineCoverageMissing:
        lastPipeline.coverage?.ok === false
          ? lastPipeline.coverage.missing
          : lastComposed.descCoverageMissing,
      visualPass: loopOut.visualPass,
      visualPassAt: loopOut.visualPassAt,
      fidelityItems: loopOut.fidelityItems,
      fidelityStopReason: loopOut.stopReason,
      bestPassCount: loopOut.bestPassCount,
      fixHintsUsed: loopOut.fixHintsUsed,
      parallelM: loopOut.parallelM,
      editStrategy: loopOut.editStrategy,
      vlmError: loopOut.vlmError,
      pendingHumanRejudge: loopOut.pendingHumanRejudge,
      infraEditBypassUsed: loopOut.infraEditBypassUsed,
      repairRoute: (loopOut as { repairRoute?: string }).repairRoute,
      layoutTemplateId: (loopOut as { layoutTemplateId?: string }).layoutTemplateId,
      bgPolicy: lastComposed.bgPolicy ?? bgPol.policy,
      sceneRefsDropped: (loopOut as { sceneRefsDropped?: number }).sceneRefsDropped,
      stageCost: (loopOut as { stageCost?: number }).stageCost,
      settingsDeepLink: (loopOut as { settingsDeepLink?: string }).settingsDeepLink,
      sheetLeak: Boolean(loopOut.sheetLeak),
      repairCtaLabel: loopOut.repairCtaLabel,
      repairMissingSlots: loopOut.repairMissingSlots,
      repairIrdPrimaryAction: loopOut.repairIrdPrimaryAction,
    });
  } catch (e) {
    const errMsg = u.error(e).message;
    feedback = await classifyGenerationFailure({
      modality: "image",
      shotId: String(storyboardId ?? "workflow"),
      error: errMsg,
      prompt: (lastComposed as { prompt?: string } | undefined)?.prompt,
    });
    const trigger =
      feedback.category === "vendor_passthrough"
        ? "vendor_passthrough"
        : feedback.ruleId || feedback.category || "generation_feedback";
    const rePushPlan = trigger === "vendor_passthrough" ? [] : buildRePushPlan([String(trigger)]);
    const env = buildStillErrorEnvelope({
      code: (e as { code?: string })?.code,
      errMsg,
      feedbackCategory: feedback.category,
      feedbackRuleId: feedback.ruleId,
    });
    throw Object.assign(new Error(errMsg), {
      feedback,
      suggestedPrompt: feedback.suggestedPrompt,
      referenceCount,
      rePushPlan,
      imageMode: modeRules.modeId,
      code: env.code,
      primaryNextStep: env.primaryNextStep,
      userMessage: env.userMessage,
      ctaLabel: env.ctaLabel,
      healBudget: budget,
    });
  }
}

async function finalizeSuccess(
  db: Knex,
  input: {
    url: string;
    savePath: string;
    promptUsed: string;
    literaryDesc?: string;
    policy: ReturnType<typeof precheckContentPolicy>;
    storyboardId?: number;
    persistToStoryboard: boolean;
    qualityMode: "hq_update" | "draft";
    composed: ReturnType<typeof composeStillPrompt>;
    composeHash?: string;
    referenceCount: number;
    imageMode?: string;
    feedback?: Awaited<ReturnType<typeof classifyGenerationFailure>>;
    rePushPlan?: ReturnType<typeof buildRePushPlan>;
    healBudget?: HealBudgetState;
    resolvedQuality?: string;
    allowHqOk?: boolean;
    literaryChars?: number;
    collapsed?: boolean;
    autoHealed?: string[];
    pipelineVersion?: string;
    recipeHeals?: string[];
    /** Pipeline untilClear coverage (prefer over composed.descCoverageOk) */
    pipelineCoverageOk?: boolean;
    pipelineCoverageMissing?: string[];
    visualPass?: boolean;
    visualPassAt?: string;
    fidelityItems?: Array<{ id: string; pass: boolean; evidence?: string; fixHint?: string }>;
    fidelityStopReason?: string;
    bestPassCount?: number;
    fixHintsUsed?: string[];
    parallelM?: number;
    editStrategy?: string;
    vlmError?: string;
    pendingHumanRejudge?: boolean;
    infraEditBypassUsed?: boolean;
    sheetLeak?: boolean;
    repairRoute?: string;
    layoutTemplateId?: string;
    bgPolicy?: string;
    sceneRefsDropped?: number;
    stageCost?: number;
    settingsDeepLink?: string;
    repairCtaLabel?: string;
    repairMissingSlots?: string[];
    repairIrdPrimaryAction?: string;
    /** Prior still meta autoRepairRound — increment each finalize */
    prevAutoRepairRound?: number;
    contactGeomEvidence?: Record<string, unknown>;
    propReadableEvidence?: Record<string, unknown>;
    poseEvidence?: Record<string, unknown>;
    roleScopeEvidence?: Record<string, unknown>;
    sceneDominanceEvidence?: Record<string, unknown>;
  },
) {
  // Literary + visual gate: hq_ok only when L1 visualPass (or L0 when VLM skipped/disabled)
  // Prefer pipeline-cleared coverage over stale compose flag (contact_geom untilClear inject)
  const coverageMissingRaw =
    (input.pipelineCoverageOk === false
      ? input.pipelineCoverageMissing
      : input.composed.descCoverageOk === false
        ? input.composed.descCoverageMissing
        : []) ?? [];
  // Soft lit debts (wound under bend) must not drive hard coverage CTA
  const coverageMissing = coverageMissingRaw.filter(
    (id) => !/lit:wound_visible|wound_visible/i.test(String(id)),
  );
  const coverageOk =
    input.pipelineCoverageOk !== false &&
    (input.pipelineCoverageOk === true ||
      input.composed.descCoverageOk !== false ||
      coverageMissing.length === 0 ||
      (coverageMissingRaw.length > 0 && coverageMissing.length === 0));
  const keyMissing = /VLM_API_KEY_MISSING|api\s*key/i.test(String(input.vlmError ?? ""));
  const { decideAutoRepairPolicy } =
    require("@/ruleEngine/quality/autoRepairPolicy") as typeof import("@/ruleEngine/quality/autoRepairPolicy");
  let prevAutoRepairRound = Math.max(0, Number(input.prevAutoRepairRound ?? 0));
  if (!prevAutoRepairRound && input.persistToStoryboard && input.storyboardId) {
    try {
      const row = await db("o_storyboard").where({ id: input.storyboardId }).first();
      const prevMeta = parseStillMetaFromReason(row?.reason);
      prevAutoRepairRound = Math.max(0, Number((prevMeta as { autoRepairRound?: number } | null)?.autoRepairRound ?? 0));
    } catch {
      /* optional */
    }
  }
  // Produce poseEvidence from VD/egress when caller did not stamp (feeds handoff + untilClear)
  let poseEvidence = input.poseEvidence;
  if (!poseEvidence || !(poseEvidence as { primaryPose?: string }).primaryPose) {
    try {
      const { producePoseEvidence, poseEvidenceForUntilClear } =
        require("@/ruleEngine/quality/poseEvidenceProducer") as typeof import("@/ruleEngine/quality/poseEvidenceProducer");
      poseEvidence = poseEvidenceForUntilClear(
        producePoseEvidence({
          visualDescription: input.literaryDesc,
          promptUsed: input.promptUsed,
        }),
      ) as Record<string, unknown>;
    } catch {
      /* optional */
    }
  }

  // Literary primary effects qualify (no Comfy / no Key) — L0+L1 must
  let litAfter: Awaited<
    ReturnType<
      typeof import("@/ruleEngine/quality/literaryEffectsAfterStill").reassertLiteraryEffectsAfterStill
    >
  > | null = null;
  try {
    const { reassertLiteraryEffectsAfterStill } =
      require("@/ruleEngine/quality/literaryEffectsAfterStill") as typeof import("@/ruleEngine/quality/literaryEffectsAfterStill");
    const seal =
      (input.composed.generationContract as { primaryIntentSeal?: import("@/ruleEngine/compilers/primaryIntentSeal").PrimaryIntentCarrierSet })
        ?.primaryIntentSeal ??
      (input.composed as { primaryIntentSeal?: import("@/ruleEngine/compilers/primaryIntentSeal").PrimaryIntentCarrierSet })
        .primaryIntentSeal ??
      null;
    litAfter = await reassertLiteraryEffectsAfterStill({
      visualDescription: input.literaryDesc,
      promptUsed: input.promptUsed,
      seal,
      refsRoles: (input.composed as { refsRoles?: string[] }).refsRoles,
      propPlateGrade: (input.composed as { propPlateGrade?: string }).propPlateGrade,
      propPlateMissing: (input.composed as { propPlateMissing?: boolean }).propPlateMissing,
      imageBase64: (input.composed as { lastImageBase64?: string }).lastImageBase64,
      videoMotionStartHint: (input.composed.generationContract as { videoMotionStartHint?: string } | undefined)
        ?.videoMotionStartHint,
      identityContam: (input.composed as {
        identityContamProbe?: { modernAttireSuspected?: boolean; grayStudioSuspected?: boolean };
      }).identityContamProbe,
      stillPhase:
        (input.composed as { stillPhase?: string }).stillPhase ??
        ((input.composed.generationContract as { stillPhase?: string } | undefined)?.stillPhase) ??
        ((input.composed as { narrative?: { stillPhase?: string } }).narrative?.stillPhase) ??
        null,
      referenceList: (input.composed as { referenceList?: Array<{ base64?: string; role?: string }> })
        .referenceList,
    });
    // Feed local pose into poseEvidence for untilClear / CTA
    if (litAfter.localPoseSignals.primaryPoseGuess) {
      poseEvidence = {
        ...(poseEvidence ?? {}),
        primaryPose: litAfter.localPoseSignals.primaryPoseGuess,
        holdCardSuspected: litAfter.localPoseSignals.holdCardSuspected,
        groundPropSuspected: litAfter.localPoseSignals.groundPropSuspected,
        source: "localStillPoseHeuristic",
      };
    }
    // Propagate gray/void scene signals into dominance (same truth as literary trunk)
    if (
      litAfter.localPoseSignals.grayStudioSuspected === true ||
      litAfter.localPoseSignals.voidBgSuspected === true ||
      litAfter.localPoseSignals.sceneIllegibleSuspected === true
    ) {
      input.sceneDominanceEvidence = {
        ...(input.sceneDominanceEvidence ?? {}),
        grayStudio:
          litAfter.localPoseSignals.grayStudioSuspected === true ||
          litAfter.localPoseSignals.voidBgSuspected === true ||
          litAfter.localPoseSignals.sceneIllegibleSuspected === true,
        voidBg: litAfter.localPoseSignals.voidBgSuspected === true,
        sceneIllegible: litAfter.localPoseSignals.sceneIllegibleSuspected === true,
        source: "localStillPoseHeuristic",
      };
    }
    // Sync modality hints onto generationContract
    if (litAfter.videoMotionStartHint && input.composed.generationContract) {
      (input.composed.generationContract as { videoMotionStartHint?: string }).videoMotionStartHint =
        litAfter.videoMotionStartHint;
    }
    if (litAfter.i2vCriticalFacts?.length && input.composed.generationContract) {
      (input.composed.generationContract as { i2vCriticalFacts?: string[] }).i2vCriticalFacts =
        litAfter.i2vCriticalFacts;
    }
    if (litAfter.realizationAdaptPack && input.composed.generationContract) {
      (input.composed.generationContract as { realizationAdaptPack?: unknown }).realizationAdaptPack =
        litAfter.realizationAdaptPack;
    }
  } catch {
    /* optional */
  }

  const evidenceHash = hashLiteraryDesc(
    JSON.stringify({
      contact: input.contactGeomEvidence ?? null,
      prop: input.propReadableEvidence ?? null,
      pose: poseEvidence ?? null,
      role: input.roleScopeEvidence ?? null,
      dominance: input.sceneDominanceEvidence ?? null,
    }),
  );
  const vlmSkipped =
    input.fidelityStopReason === "skipped_draft" || input.fidelityStopReason === "disabled";
  const { mayStampHqOk } =
    require("@/ruleEngine/quality/untilClearRuntime") as typeof import("@/ruleEngine/quality/untilClearRuntime");
  const stampGate = mayStampHqOk({
    phase: "still_L1",
    visualDescription: input.literaryDesc,
    stillQuality: input.visualPass ? "hq_ok" : "weak",
    visualPass: input.visualPass,
    visualPassAt: input.visualPassAt,
    keyAbsent: keyMissing,
    fidelityItems: input.fidelityItems,
    descCoverageMissing: coverageMissing,
    poseEvidence: (poseEvidence as { primaryPose?: string; secondaryPose?: string; faceCuOnly?: boolean }) ?? null,
  });
  const literaryGate = vlmSkipped
    ? input.allowHqOk === true && stampGate.ok
    : input.visualPass === true && stampGate.ok;
  const sheetLeak =
    input.sheetLeak === true ||
    (input.fidelityItems ?? []).some(
      (i) => !i.pass && /single_frame|拼版|四视|turnaround|四宫格/i.test(`${i.id}${i.fixHint ?? ""}`),
    );
  const hq =
    input.qualityMode === "hq_update" &&
    coverageOk &&
    literaryGate &&
    !input.collapsed &&
    !sheetLeak &&
    litAfter?.literaryEffectsQualified !== false;
  let stillQuality: "missing" | "weak" | "hq_ok" = hq ? "hq_ok" : "weak";
  const { stillQualityUserMessage, pixelDimStatus: pixelDimStatusFn } =
    require("@/ruleEngine/quality/practiceCompleteness") as typeof import("@/ruleEngine/quality/practiceCompleteness");
  const flowPixelDimStatus = keyMissing
    ? ("unmeasured" as const)
    : input.visualPass === true
      ? ("measured_pass" as const)
      : input.fidelityStopReason === "vlm_error"
        ? ("measured_fail" as const)
        : ("unmeasured" as const);
  const litDebtStop =
    input.repairIrdPrimaryAction === "hand_edit_vd" ||
    input.repairIrdPrimaryAction === "confirm_split" ||
    input.repairIrdPrimaryAction === "confirm_enhance" ||
    input.repairIrdPrimaryAction === "apply_auto_enhance";
  // vlm_error / keyMissing: structure-led auto repair; Key optional never bricks Generate
  const prevRound = Math.max(0, Number(prevAutoRepairRound ?? 0));
  const earlyContam = String(
    (input.composed.generationContract as { contaminationClass?: string } | undefined)
      ?.contaminationClass ??
      ((input.composed as { sources?: string[] }).sources ?? [])
        .map((s) => /^contaminationClass:(.+)$/.exec(String(s))?.[1])
        .find(Boolean) ??
      "",
  ).trim();
  const litMissFindings = (litAfter?.missingEffects ?? []).map((m) => m.id);
  const autoRepair = decideAutoRepairPolicy({
    repairIrdPrimaryAction: input.repairIrdPrimaryAction,
    fidelityStopReason: input.fidelityStopReason,
    visualPass: input.visualPass,
    keyMissing,
    round: prevRound + 1,
    findings: [
      ...(coverageMissing ?? []),
      ...((input.fidelityItems ?? []).filter((i) => !i.pass && !/unmeasured/i.test(String(i.evidence ?? ""))).map((i) => i.id) ?? []),
      ...(earlyContam && earlyContam !== "none" ? [earlyContam] : []),
      ...litMissFindings,
    ],
    missingSlots: input.repairMissingSlots,
    contaminationClass: earlyContam || null,
  });
  const litEnhanceable = Boolean(autoRepair.preferLitEnhance);
  const primary = buildPrimaryBlock(
    hq
      ? "burn"
      : autoRepair.autoRepairStage === "handoff_human"
        ? input.repairIrdPrimaryAction === "confirm_split"
          ? "split_shot"
          : litEnhanceable
            ? "regen_storyboard_hq"
            : "chat_repair"
      : autoRepair.autoRepairStage === "retry_shot"
        ? "retry_shot"
        : "regen_storyboard_hq",
    {
      stage: "burn",
      userMessageOverride:
        litDebtStop
          ? input.repairIrdPrimaryAction === "confirm_split"
            ? `文学双接触/结构债须拆镜；请刷新分镜后生成子镜，禁止静默重打旧镜；弱图不可作视频首帧`
            : litEnhanceable
              ? input.repairMissingSlots?.length
                ? `文学细节缺槽（${input.repairMissingSlots.join("/")}）可按反推契约「应用补全」后继续生成；当前弱图不可作视频首帧`
                : "文学细节可按反推契约补全后继续生成；当前弱图不可作视频首帧"
              : input.repairMissingSlots?.length
                ? `文学细节契约未过（缺 ${input.repairMissingSlots.join("/")}）；请手改 VD 或复制给 Chat 反推补全后重生成；弱图不可作视频首帧`
                : "文学细节契约未过；请手改 VD 或复制给 Chat 反推补全后重生成；弱图不可作视频首帧"
          : input.fidelityStopReason === "vlm_error"
          ? keyMissing
            ? litAfter && litAfter.literaryEffectsQualified === false
              ? `${stillQualityUserMessage({
                  keyAbsent: true,
                  missingEffects: litAfter.missingEffects,
                  literaryEffectsQualified: false,
                  sampleMustFulfilled: litAfter.sampleMustFulfilled === false,
                  realizationDegraded: litAfter.realization?.realizationDegraded,
                  realizationNote: litAfter.ctaLabel,
                  softEnvMissingHonest: Boolean(
                    (input.composed as { softEnvMissingHonest?: boolean }).softEnvMissingHonest,
                  ),
                })} 当前图仍不可作视频首帧；请继续生成智能修。`
              : autoRepair.autoRepairStage === "handoff_human"
                ? `${stillQualityUserMessage({ keyAbsent: true })} 当前图仍不可作视频首帧；可人审放行或继续生成修复。`
                : "像素诊断未配置，系统将按结构契约继续自动修复首帧；可再次点击生成；当前结果仍不可直接作视频首帧。"
            : `图已出，但未过高质量：视觉评审不可用${input.infraEditBypassUsed ? "（已尝试 1 次禁拼图重抽）" : ""}。请修复评审配置后人审或重抽；当前弱图不可作视频首帧。${
                input.vlmError ? `（${input.vlmError.slice(0, 60)}）` : ""
              }`
          : undefined,
    },
  );
  const nextStepOut = litDebtStop && autoRepair.autoRepairStage === "handoff_human"
    ? input.repairIrdPrimaryAction === "confirm_split"
      ? "split_shot"
      : litEnhanceable
        ? "regen_storyboard_hq"
        : "chat_repair"
    : primary.primaryNextStep;
  // Shootable-first: never brick Generate for split/lit debt (advise CTA only)
  const blockSilentRegen = false;
  const refreshStoryboardBeforeRegen = nextStepOut === "split_shot";
  const vlmCta =
    litAfter?.ctaLabel ||
    (litDebtStop
      ? input.repairIrdPrimaryAction === "confirm_split"
        ? input.repairCtaLabel || "确认智能拆镜"
        : litEnhanceable
          ? input.repairCtaLabel || "应用补全后重生成"
          : input.repairCtaLabel || "手改VD后重生成"
      : input.fidelityStopReason === "vlm_error"
      ? keyMissing
        ? autoRepair.allowSilentRegen
          ? "继续生成修复"
          : "人审通过（未测·非失败）"
        : input.pendingHumanRejudge
          ? "人审通过或修复评审配置"
          : "修复评审配置后重试"
      : primary.ctaLabel);
  // Literary miss always wins over vlm_error/keyAbsent structure copy
  const litMissUserMessage = (() => {
    if (
      !litAfter ||
      (litAfter.literaryEffectsQualified !== false && litAfter.sampleMustFulfilled !== false)
    ) {
      return null;
    }
    try {
      const { stillQualityUserMessage: sqm } =
        require("@/ruleEngine/quality/practiceCompleteness") as typeof import("@/ruleEngine/quality/practiceCompleteness");
      return sqm({
        keyAbsent: keyMissing,
        missingEffects: litAfter.sampleMustMissIds?.length
          ? litAfter.sampleMustMissIds
          : litAfter.missingEffects,
        literaryEffectsQualified: false,
        sampleMustFulfilled: false,
        bendHostileRefsForced: true,
        platesSwapped: Boolean((input.composed as { litPlatesSwapped?: boolean }).litPlatesSwapped),
        poseEvidenceOk: (() => {
          // Honest: any action/occupancy Must miss ⇒ pose not ok (never「已换板重出」假绿)
          const miss = litAfter.sampleMustMissIds ?? litAfter.missingEffects.map((m) => m.id);
          if (miss.some((id) => /action\.|occupancy\./.test(String(id)))) return false;
          return true;
        })(),
      });
    } catch {
      return `设计意图样本未兑现：${(litAfter.sampleMustMissIds ?? litAfter.missingEffects.map((m) => m.id)).slice(0, 3).join("、")}；已换板但姿态未过；弱图不可作视频首帧`;
    }
  })();
  const litOkKeyAbsentMessage = (() => {
    if (!litAfter || litAfter.literaryEffectsQualified !== true || !keyMissing || hq) return null;
    try {
      const { stillQualityUserMessage: sqm } =
        require("@/ruleEngine/quality/practiceCompleteness") as typeof import("@/ruleEngine/quality/practiceCompleteness");
      const shouldMiss = (litAfter.shouldMisses ?? [])
        .map((m) => m.id)
        .filter((id) => /action\.|occupancy\.|glyph/i.test(String(id)))
        .slice(0, 2);
      return sqm({
        keyAbsent: true,
        literaryEffectsQualified: true,
        sampleMustFulfilled: litAfter.sampleMustFulfilled !== false,
        weak: true,
        realizationDegraded: litAfter.realization?.realizationDegraded === true,
        realizationNote: litAfter.ctaLabel ?? litAfter.realization?.realizationNote,
        softEnvMissingHonest: Boolean(
          (input.composed as { softEnvMissingHonest?: boolean }).softEnvMissingHonest,
        ),
        shouldMissIds: shouldMiss,
      });
    } catch {
      return "设计意图必须元素已兑现；像素未测（Key 可选，非失败）；弱图债·可烧视频（设计意图优先）";
    }
  })();
  const sealedUserMessageOverride = (() => {
    try {
      const src = (input.composed as { sources?: string[] }).sources ?? [];
      const phase =
        (input.composed as { stillPhase?: string }).stillPhase ??
        ((input.composed.generationContract as { stillPhase?: string } | undefined)?.stillPhase) ??
        null;
      const { isStillSsotSealed, sealedRealizationUserMessage } =
        require("@/ruleEngine/design/shootableArchitecture") as typeof import("@/ruleEngine/design/shootableArchitecture");
      if (!hq && isStillSsotSealed({ stillPhase: phase, composeSources: src })) {
        return sealedRealizationUserMessage({
          keyUnmeasured: keyMissing,
          refInterference:
            ((input.composed as { refsRoles?: string[] }).refsRoles ?? []).length > 1 ||
            litAfter?.debtKind === "contamination" ||
            litAfter?.realization?.realizationDegraded === true,
        });
      }
    } catch {
      /* optional */
    }
    return null;
  })();
  const userMessage = sealedUserMessageOverride
    ? sealedUserMessageOverride
    : hq
    ? input.composed.didSynthesize
      ? "已按设计智能合成并标记高质量首帧"
      : "已标记高质量首帧"
    : litMissUserMessage
      ? litMissUserMessage
      : litOkKeyAbsentMessage
        ? litOkKeyAbsentMessage
    : (input.composed as { actuatorDegraded?: boolean }).actuatorDegraded &&
        Boolean(input.composed.keepSoftEnvRef) &&
        /contact_geom|prop_readable/.test(
          String((input.composed.generationContract as { objectiveClass?: string } | undefined)?.objectiveClass ?? ""),
        )
      ? `高难接触镜可控后端不可用（${(input.composed as { actuatorDegradedReason?: string }).actuatorDegradedReason || "degraded"}），已诚实降级弱多图；殿内软环境/颊触几何可能未锁住，白棚属预期。请启动 Comfy（COMFY_URL）或人审后重出；勿当作「少写禁令」。`
      : litDebtStop
      ? primary.userMessage
      : input.fidelityStopReason === "vlm_error"
      ? primary.userMessage
      : input.fidelityStopReason === "converged"
        ? "成图文学保真项反复未过，已收敛停机；弱图不可作视频首帧"
        : input.fidelityStopReason === "budget"
          ? "成图文学保真自动重试次数已用尽；弱图不可作视频首帧"
          : input.collapsed
            ? "静照提示词文学主体塌缩，已回退合成正文；弱图不可作视频首帧"
            : (() => {
                const vd = String(input.literaryDesc ?? "");
                const wantsBend = /弯腰|捡起|捡拾|俯身/.test(vd);
                const pose = String((poseEvidence as { primaryPose?: string } | undefined)?.primaryPose ?? "");
                const poseBad =
                  pose === "kneel_hold" ||
                  pose === "upright_desk" ||
                  pose === "lean_table" ||
                  pose === "desk_lean" ||
                  (/跪|捧持|胸前/.test(String(input.promptUsed ?? "")) && wantsBend);
                const propMissing = Boolean(
                  (input.composed as { propPlateMissing?: boolean }).propPlateMissing,
                );
                if (wantsBend && poseBad) {
                  return "设计意图未全达（动作占位被跪持/展示替代）；弱图不可作视频首帧；请重出动作主导静帧";
                }
                if (propMissing && wantsBend) {
                  return "设计意图缺触地道具软板（propSoft）；可继续试拍，请挂板或自动合成后重出";
                }
                if (!coverageOk && coverageMissing.length) {
                  return `描写动作未覆盖完整（缺 ${coverageMissing.join("、")}），弱图不可作视频首帧`;
                }
                return primary.userMessage;
              })();
  const ctaResolved = (() => {
    try {
      const { resolveStillPrimaryCta } =
        require("@/ruleEngine/design/shootableArchitecture") as typeof import("@/ruleEngine/design/shootableArchitecture");
      const vd = String(input.literaryDesc ?? "");
      const wantsBend = /弯腰|捡起|捡拾|俯身/.test(vd);
      const pose = String((poseEvidence as { primaryPose?: string } | undefined)?.primaryPose ?? "");
      const poseBad =
        pose === "kneel_hold" ||
        pose === "upright_desk" ||
        pose === "lean_table" ||
        pose === "desk_lean";
      return resolveStillPrimaryCta({
        primaryNextStep: nextStepOut,
        irdPrimaryAction: input.repairIrdPrimaryAction,
        stillQuality: hq ? "hq_ok" : "weak",
        visualPass: input.visualPass,
        keyOptional: keyMissing,
        pixelDimStatus: keyMissing ? "unmeasured" : input.visualPass ? "measured_pass" : "measured_fail",
        contaminationClass: (input.composed.generationContract as { contaminationClass?: string } | undefined)
          ?.contaminationClass,
        deliveryTier: undefined,
        debtKind:
          litAfter?.debtKind ||
          (wantsBend && poseBad
            ? "action_misfire"
            : (input.composed as { propPlateMissing?: boolean }).propPlateMissing
              ? "prop_plate"
              : (input.composed as { debtKind?: string }).debtKind),
        stillPhase:
          (input.composed as { stillPhase?: string }).stillPhase ??
          ((input.composed.generationContract as { stillPhase?: string } | undefined)?.stillPhase) ??
          null,
        composeSources: (input.composed as { sources?: string[] }).sources ?? [],
        ssotSealed: ((input.composed as { sources?: string[] }).sources ?? []).some((x) =>
          /ff\.ssot_only_egress|ssot\.phase/.test(String(x)),
        ),
        realizationDegraded: litAfter?.realization?.realizationDegraded === true,
        oneClickRepairKind: (input.composed as { oneClickRepairKind?: string }).oneClickRepairKind ?? null
      });
    } catch {
      return null;
    }
  })();
  let deliveryTier =
    hq && input.visualPass && litAfter?.literaryEffectsQualified !== false
      ? "burn"
      : litAfter?.literaryEffectsQualified === false
        ? "draft"
        : hq || !keyMissing
          ? "preview"
          : "draft";
  if (litAfter?.literaryEffectsQualified === true && !input.visualPass && keyMissing) {
    deliveryTier = "preview";
  }
  let contaminationClass = "none";
  try {
    const { classifyStillContamination } =
      require("@/ruleEngine/compilers/stillSealGate") as typeof import("@/ruleEngine/compilers/stillSealGate");
    const seal =
      (input.composed.generationContract as { primaryIntentSeal?: { poseOccupancy?: string; primaryObjective?: string } })
        ?.primaryIntentSeal ?? null;
    const stillPhaseForContam =
      (input.composed as { stillPhase?: string }).stillPhase ??
      ((input.composed.generationContract as { stillPhase?: string } | undefined)?.stillPhase) ??
      null;
    contaminationClass = classifyStillContamination({
      promptUsed: input.promptUsed,
      seal,
      composeSources: (input.composed as { sources?: string[] }).sources,
      propPlateMissing: Boolean((input.composed as { propPlateMissing?: boolean }).propPlateMissing),
      previousDroppedOffBeat: ((input.composed as { sources?: string[] }).sources ?? []).some((s) =>
        /previous\.dropped/.test(s),
      ),
      stillPhase: stillPhaseForContam,
    });
    const gcContam = String(
      (input.composed.generationContract as { contaminationClass?: string } | undefined)?.contaminationClass ?? "",
    ).trim();
    if (gcContam) contaminationClass = gcContam;
    if (contaminationClass !== "none" && deliveryTier === "burn") deliveryTier = "draft";
  } catch {
    /* optional */
  }
  const ctaResolvedFinal = (() => {
    if (!ctaResolved) return null;
    if (contaminationClass === "none") return ctaResolved;
    try {
      const { resolveStillPrimaryCta } =
        require("@/ruleEngine/design/shootableArchitecture") as typeof import("@/ruleEngine/design/shootableArchitecture");
      return resolveStillPrimaryCta({
        primaryNextStep: nextStepOut,
        irdPrimaryAction: input.repairIrdPrimaryAction,
        stillQuality: hq ? "hq_ok" : "weak",
        visualPass: input.visualPass,
        keyOptional: keyMissing,
        pixelDimStatus: keyMissing ? "unmeasured" : input.visualPass ? "measured_pass" : "measured_fail",
        contaminationClass,
        deliveryTier: deliveryTier as "draft" | "preview" | "burn",
        debtKind: litAfter?.debtKind || (input.composed as { debtKind?: string }).debtKind,
        stillPhase:
          (input.composed as { stillPhase?: string }).stillPhase ??
          ((input.composed.generationContract as { stillPhase?: string } | undefined)?.stillPhase) ??
          null,
        composeSources: (input.composed as { sources?: string[] }).sources ?? [],
        ssotSealed: ((input.composed as { sources?: string[] }).sources ?? []).some((x) =>
          /ff\.ssot_only_egress|ssot\.phase/.test(String(x)),
        ),
        realizationDegraded: litAfter?.realization?.realizationDegraded === true,
        oneClickRepairKind: (input.composed as { oneClickRepairKind?: string }).oneClickRepairKind ?? null
      });
    } catch {
      return ctaResolved;
    }
  })();
  const composeSourcesForSeal = (input.composed as { sources?: string[] }).sources ?? [];
  const stillPhaseForSeal =
    (input.composed as { stillPhase?: string }).stillPhase ??
    ((input.composed.generationContract as { stillPhase?: string } | undefined)?.stillPhase) ??
    null;
  const ssotSealedForCta = (() => {
    try {
      const { isStillSsotSealed } =
        require("@/ruleEngine/design/shootableArchitecture") as typeof import("@/ruleEngine/design/shootableArchitecture");
      return isStillSsotSealed({
        stillPhase: stillPhaseForSeal,
        composeSources: composeSourcesForSeal,
      });
    } catch {
      return composeSourcesForSeal.some((x) => /ff\.ssot_only_egress|ssot\.phase/.test(String(x)));
    }
  })();
  const ctaOut = (() => {
    if (
      (input.composed as { actuatorDegraded?: boolean }).actuatorDegraded &&
      Boolean(input.composed.keepSoftEnvRef) &&
      !hq
    ) {
      return "启动Comfy或人审";
    }
    if (ssotSealedForCta && !hq) {
      try {
        const { sealedRealizationCtaLabel } =
          require("@/ruleEngine/design/shootableArchitecture") as typeof import("@/ruleEngine/design/shootableArchitecture");
        return (
          ctaResolvedFinal?.label ||
          ctaResolved?.label ||
          sealedRealizationCtaLabel({
            keyUnmeasured: keyMissing,
            refInterference: Boolean(
              ((input.composed as { refsRoles?: string[] }).refsRoles ?? []).length > 1 ||
                litAfter?.debtKind === "contamination",
            ),
          })
        );
      } catch {
        return ctaResolvedFinal?.label || ctaResolved?.label || vlmCta;
      }
    }
    return litAfter?.ctaLabel || ctaResolvedFinal?.label || ctaResolved?.label || vlmCta;
  })();
  // LGIA: Key optional; quality debt never alone forces requireFixBeforeBurn
  const lgiaDelivery = (() => {
    try {
      const { resolveLgiaDelivery } =
        require("@/ruleEngine/compilers/lgiaDeliveryPolicy") as typeof import("@/ruleEngine/compilers/lgiaDeliveryPolicy");
      return resolveLgiaDelivery({
        keyOptional: keyMissing,
        pixelDimStatus: keyMissing ? "unmeasured" : input.visualPass ? "measured_pass" : "measured_fail",
        vlmKeyMissing: keyMissing,
        stillPhase:
          (input.composed as { stillPhase?: string }).stillPhase ??
          ((input.composed.generationContract as { stillPhase?: string } | undefined)?.stillPhase) ??
          null,
        literaryEffectsQualified: litAfter?.literaryEffectsQualified,
        contaminationClass,
        fidelityRequireFix: Boolean((input.composed as { fidelityRequireFix?: boolean }).fidelityRequireFix),
        composedRequireFix: Boolean((input.composed as { requireFixBeforeBurn?: boolean }).requireFixBeforeBurn),
        trueUnshootable:
          nextStepOut === "split_shot" ||
          (nextStepOut === "chat_repair" && litDebtStop),
      });
    } catch {
      return null;
    }
  })();
  if (lgiaDelivery) {
    deliveryTier = lgiaDelivery.deliveryTier;
  }
  const requireFixBeforeBurn = lgiaDelivery
    ? lgiaDelivery.requireFixBeforeBurn
    : Boolean((input.composed as { requireFixBeforeBurn?: boolean }).requireFixBeforeBurn) ||
      litDebtStop ||
      nextStepOut === "split_shot" ||
      nextStepOut === "chat_repair";
  const adviseSmartRepair = lgiaDelivery?.adviseSmartRepair === true;
  const burnAllowed = lgiaDelivery?.burnAllowed !== false;
  const { assessStillVideoReadiness } =
    require("@/ruleEngine/qc/stillVideoReadiness") as typeof import("@/ruleEngine/qc/stillVideoReadiness");
  const readiness = assessStillVideoReadiness({
    stillQuality: hq ? "hq_ok" : "weak",
    visualPass: input.visualPass,
    sheetLeak,
    fidelityItems: input.fidelityItems,
    promptUsed: input.promptUsed,
    visualDescription: input.literaryDesc,
    i2vCriticalFacts:
      litAfter?.i2vCriticalFacts ??
      (input.composed.generationContract as { i2vCriticalFacts?: string[] } | undefined)?.i2vCriticalFacts,
    contract: input.composed.generationContract ?? null,
    literaryEffectsQualified: litAfter?.literaryEffectsQualified,
    stillMeta: {
      grayStudio: Boolean((input.sceneDominanceEvidence as { grayStudio?: boolean } | undefined)?.grayStudio),
      sceneDominanceEvidence: input.sceneDominanceEvidence,
      contaminationClass,
      deliveryTier,
      literaryEffectsQualified: litAfter?.literaryEffectsQualified,
      missingEffects: litAfter?.missingEffects,
      realizationOccupancy: litAfter?.realization?.realizationOccupancy,
      realizationDegraded: litAfter?.realization?.realizationDegraded,
      realizationReason: litAfter?.realization?.realizationReason,
      primaryIntentSeal: litAfter?.realization
        ? {
            ...(((input.composed.generationContract as { primaryIntentSeal?: Record<string, unknown> } | undefined)
              ?.primaryIntentSeal as Record<string, unknown>) ?? {}),
            intentOccupancy: litAfter.realization.intentOccupancy,
            realizationOccupancy: litAfter.realization.realizationOccupancy,
            realizationDegraded: litAfter.realization.realizationDegraded,
            realizationReason: litAfter.realization.realizationReason,
            realizationLadder: litAfter.realization.ladder,
          }
        : (input.composed.generationContract as { primaryIntentSeal?: unknown } | undefined)?.primaryIntentSeal,
    },
  });

  if (input.persistToStoryboard && input.storyboardId) {
    const row = await db("o_storyboard").where({ id: input.storyboardId }).first();
    const prevMeta = parseStillMetaFromReason(row?.reason);
    const litPersist = (() => {
      try {
        const { literaryEffectsPersistSlice } =
          require("@/ruleEngine/quality/literaryEffectsAfterStill") as typeof import("@/ruleEngine/quality/literaryEffectsAfterStill");
        return litAfter ? literaryEffectsPersistSlice(litAfter) : {};
      } catch {
        return {};
      }
    })();
    const pipelineMeta = {
      literaryChars: input.literaryChars,
      collapsed: input.collapsed,
      autoHealed: input.autoHealed,
      pipelineVersion: input.pipelineVersion,
      recipeHeals: input.recipeHeals ?? input.composed.recipeHeals,
      fidelityItems: input.fidelityItems,
      fidelityStopReason: input.fidelityStopReason,
      visualPass: input.visualPass,
      visualPassAt: input.visualPassAt,
      bestPassCount: input.bestPassCount,
      fixHintsUsed: input.fixHintsUsed,
      parallelM: input.parallelM,
      editStrategy: input.editStrategy,
      vlmError: input.vlmError,
      bgPolicy: input.bgPolicy,
      layoutTemplateId: input.layoutTemplateId,
      layoutFamilyId: (input as { layoutFamilyId?: string }).layoutFamilyId,
      repairRoute: input.repairRoute,
      sceneRefsDropped: input.sceneRefsDropped,
      stageCost: input.stageCost,
      contactGeomEvidence: input.contactGeomEvidence,
      propReadableEvidence: input.propReadableEvidence,
      poseEvidence: poseEvidence,
      roleScopeEvidence: input.roleScopeEvidence,
      sceneDominanceEvidence: input.sceneDominanceEvidence,
      evidenceHash,
      evidenceTtlMs: 6 * 60 * 60 * 1000,
      generationContract: input.composed.generationContract,
      contractVersion: (input.composed.generationContract as { contractVersion?: string } | undefined)?.contractVersion,
      contractHash: (input.composed.generationContract as { contractHash?: string } | undefined)?.contractHash,
      designIntentProfile:
        (input.composed.generationContract as { designIntentProfile?: unknown } | undefined)
          ?.designIntentProfile ??
        (input.composed as { designIntentProfile?: unknown }).designIntentProfile,
      primaryIntentSeal:
        (input.composed.generationContract as { primaryIntentSeal?: unknown } | undefined)
          ?.primaryIntentSeal ??
        (input.composed as { primaryIntentSeal?: unknown }).primaryIntentSeal,
      contaminationClass,
      deliveryTier,
      i2vCriticalFacts:
        litAfter?.i2vCriticalFacts ??
        (input.composed.generationContract as { i2vCriticalFacts?: string[] } | undefined)?.i2vCriticalFacts,
      videoMotionStartHint:
        litAfter?.videoMotionStartHint ??
        (input.composed.generationContract as { videoMotionStartHint?: string } | undefined)
          ?.videoMotionStartHint,
      ...litPersist,
      beatIsolationFailed:
        contaminationClass === "off_beat_cu" ||
        ((input.composed as { sources?: string[] }).sources ?? []).some((s) =>
          /previous\.dropped_off_beat|contaminationClass:off_beat/i.test(String(s)),
        ),
      offBeatContamination:
        contaminationClass === "off_beat_cu" ||
        ((input.composed as { sources?: string[] }).sources ?? []).some((s) =>
          /previous\.dropped_off_beat|contaminationClass:off_beat/i.test(String(s)),
        ),
      evidenceBoundHash: evidenceHash,
      autoRepairStage: autoRepair.autoRepairStage,
      autoRepairRound: autoRepair.autoRepairRound,
      autoRepairBudgetLeft: autoRepair.autoRepairBudgetLeft,
      handoffReason: autoRepair.handoffReason,
      i2vReady: readiness.i2vReady,
      i2vBlockReason: readiness.reason,
      failureCluster: (() => {
        try {
          const { deriveFailureCluster } =
            require("@/ruleEngine/quality/failureClusterLibrary") as typeof import("@/ruleEngine/quality/failureClusterLibrary");
          return deriveFailureCluster({
            promptUsed: input.promptUsed,
            visualDescription: input.literaryDesc,
            criticalMisses: readiness.criticalMisses,
            atomMisses: (input.composed as { atomMisses?: string[] }).atomMisses,
            objectiveClass: (input.composed.generationContract as { objectiveClass?: string } | undefined)
              ?.objectiveClass,
            i2vReady: readiness.i2vReady,
            stillQuality: hq ? "hq_ok" : "weak",
            contaminationClass,
          });
        } catch {
          return undefined;
        }
      })(),
    };
    if (input.fidelityStopReason === "converged" || input.fidelityStopReason === "budget") {
      try {
        const { writeJudgeCorpusEntry } = await import("@/ruleEngine/qc/judgeSelfImprove");
        writeJudgeCorpusEntry({
          id: `converge-${input.storyboardId}-${Date.now()}`,
          createdAt: new Date().toISOString(),
          description: String(input.promptUsed ?? "").slice(0, 400),
          items: (input.fidelityItems ?? []).map((i) => ({
            id: i.id,
            pass: i.pass,
            evidence: i.evidence,
            fixHint: i.fixHint,
          })),
          source: "converge",
          modality: "still",
        });
      } catch {
        /* corpus best-effort */
      }
    }
    const hqMeta = hq
      ? markHqOk({
          ...prevMeta,
          composeSources: input.composed.sources,
          promptUsed: (() => {
            let pu = input.promptUsed.slice(0, 2000);
            try {
              const { homologizeStillPromptForStore } =
                require("@/ruleEngine/compilers/stillPromptHomology") as typeof import("@/ruleEngine/compilers/stillPromptHomology");
              pu = homologizeStillPromptForStore(pu).prompt || pu;
            } catch {
              /* optional */
            }
            return pu.slice(0, 2000);
          })(),
          literaryDescHash: hashLiteraryDesc(String(input.literaryDesc ?? "")),
          literaryHash: hashLiteraryDesc(String(input.literaryDesc ?? "")),
          compositionContractApplied: input.composed.compositionContractApplied,
          resolvedQuality: input.resolvedQuality,
          composeMode: input.composed.composeMode,
          entityAnchors: input.composed.entityAnchors,
          composeHash: input.composeHash,
          visualPass: true,
          visualPassAt: input.visualPassAt ?? new Date().toISOString(),
          ...pipelineMeta,
        })
      : {
          stillQuality: "weak" as const,
          qualityMode: "draft",
          composeSources: input.composed.sources,
          promptUsed: (() => {
            let pu = input.promptUsed.slice(0, 2000);
            try {
              const { homologizeStillPromptForStore } =
                require("@/ruleEngine/compilers/stillPromptHomology") as typeof import("@/ruleEngine/compilers/stillPromptHomology");
              pu = homologizeStillPromptForStore(pu).prompt || pu;
            } catch {
              /* optional */
            }
            return pu.slice(0, 2000);
          })(),
          literaryDescHash: hashLiteraryDesc(String(input.literaryDesc ?? "")),
          literaryHash: hashLiteraryDesc(String(input.literaryDesc ?? "")),
          resolvedQuality: input.resolvedQuality,
          promptState: input.composed.composeMode === "fidelity" ? "fidelity" : "composed",
          composeMode: input.composed.composeMode,
          composeHash: input.composeHash,
          ...pipelineMeta,
        };
    const life = applyLifecycleInvalidation("still_regenerated", hqMeta);
    const nextStep = litDebtStop
      ? "chat_repair"
      : life.primaryNextStep === "burn" && !hq
        ? "regen_storyboard_hq"
        : life.primaryNextStep;
    let designStamp: Record<string, unknown> = {};
    try {
      const { buildShotChainContract } = await import("@/ruleEngine/quality/shotChainContract");
      const chain = buildShotChainContract({
        visualDescription: String(input.literaryDesc ?? ""),
        duration: row?.duration,
        shotSize: (row as { shotSize?: string } | undefined)?.shotSize,
      });
      designStamp = {
        designContentHash: chain.designContentHash,
        dialogueFingerprint: chain.dialogueFingerprint || undefined,
      };
    } catch {
      /* optional */
    }
    // G2: honest stillPoseAnchor — only at_locus when contact/prop atoms ok and plate not missing
    let poseAnchorMeta: Record<string, unknown> = { videoStale: true, videoPass: false };
    try {
      const {
        isContactEventVd,
        inferContactStartStateFromStill,
        matchContactEventVd,
      } = await import("@/ruleEngine/compilers/contactEventPolicy");
      const { deriveStillAtomContract } = await import("@/ruleEngine/compilers/stillAtomContract");
      const vd = String(
        (input.composed as { visualBody?: string })?.visualBody ?? input.promptUsed ?? "",
      );
      const blob = String(input.promptUsed ?? vd);
      if (isContactEventVd(vd) || isContactEventVd(blob)) {
        const atom = deriveStillAtomContract({
          contract: input.composed.generationContract ?? null,
          visualDescription: vd,
          prompt: blob,
        });
        const propPlateMissing = Boolean(
          (input.composed as { propPlateMissing?: boolean }).propPlateMissing ||
            atom.mustFail.includes("propPlateMissing") ||
            atom.mustFail.includes("missing_prop_readable") ||
            atom.mustFail.includes("missing_prop_pose_locus") ||
            atom.mustFail.includes("missing_contact_event"),
        );
        const actuatorDegraded = Boolean(
          (input.composed as { actuatorDegraded?: boolean }).actuatorDegraded,
        );
        const synthGeom =
          (input.composed as { propPlateGrade?: string }).propPlateGrade === "synthetic_geometry" ||
          Boolean((input.composed as { synthesizedPropPlate?: boolean }).synthesizedPropPlate);
        const geomUnmeasured =
          input.pendingHumanRejudge === true ||
          flowPixelDimStatus === "unmeasured" ||
          (input.fidelityItems ?? []).some(
            (i) => /contact_geom/i.test(i.id) && !i.pass,
          );
        const blockAtLocus = actuatorDegraded || synthGeom || geomUnmeasured || !atom.ok || propPlateMissing;
        const m = matchContactEventVd(vd || blob);
        if (!blockAtLocus) {
          const inferred = inferContactStartStateFromStill({
            stillPrompt: blob,
            visualDescription: vd,
          });
          // Prefer at_locus for successful contact still freeze (trajectory mid-contact)
          const state =
            inferred.state === "entering" && /贴合|贴颊|划过|触肤|已贴/.test(blob)
              ? "at_locus"
              : inferred.state;
          poseAnchorMeta = {
            ...poseAnchorMeta,
            stillPoseAnchor: {
              state,
              prop: m.propCanonical || m.propAlias,
              locus: m.locus || inferred.locus,
              source: "honest_atom" as const,
            },
            contactStartState: state,
            contactTrajSummary: "接近→划过→停住（触肤瞬间）",
          };
        } else {
          // Forbid false handoff — degraded/synth/unmeasured geom must not claim at_locus
          const blockReasons = [
            ...atom.mustFail,
            ...(actuatorDegraded ? ["actuator_degraded"] : []),
            ...(synthGeom ? ["synthetic_geometry"] : []),
            ...(geomUnmeasured ? ["contact_geom_unmeasured"] : []),
          ];
          poseAnchorMeta = {
            ...poseAnchorMeta,
            stillPoseAnchor: {
              state: "entering",
              prop: m.propCanonical || m.propAlias,
              locus: m.locus,
              source: "atom_blocked" as const,
            },
            contactStartState: "entering",
            poseHandoffBlocked: true,
            poseHandoffBlockReasons: blockReasons,
          };
        }
      }
    } catch {
      /* optional */
    }
    const reason = mergeReasonMeta(row?.reason, {
      ...hqMeta,
      ...(life.stillMeta ?? {}),
      ...designStamp,
      nextStep,
      primaryNextStep: nextStep,
      userMessage,
      ctaLabel: ctaOut,
      didSynthesize: input.composed.didSynthesize,
      scrubbed: input.composed.scrubbed,
      warnings: input.composed.warnings,
      healLogTail: (() => {
        const base = `compose:${input.composed.sources.join("|")}${input.autoHealed?.length ? `|heal:${input.autoHealed.join(",")}` : ""}`;
        const tun = String((input.composed as { healLogTail?: string }).healLogTail ?? "").trim();
        return tun ? `${base}|${tun}` : base;
      })(),
      tunLedger: (input.composed as { tunLedger?: unknown }).tunLedger,
      oneClickRepairKind: (input.composed as { oneClickRepairKind?: string }).oneClickRepairKind ?? null,
      pendingHumanRejudge: input.pendingHumanRejudge,
      infraEditBypassUsed: input.infraEditBypassUsed,
      sheetLeak,
      keyOptional: keyMissing,
      pixelDimStatus: flowPixelDimStatus,
      settingsDeepLink: keyMissing
        ? "/settings/vendor?focus=volcengine&field=apiKey"
        : undefined,
      missingSlots: input.repairMissingSlots,
      irdPrimaryAction: input.repairIrdPrimaryAction,
      promptLintConflicts: input.composed.promptLintConflicts,
      promptProvenance: [
        { source: "visualDescription", note: "lead" },
        { source: "doctrine", note: "policy" },
        ...(input.autoHealed?.length ? [{ source: "repair_inject", note: input.autoHealed.join(",") }] : []),
      ],
      contractVersion: (input.composed.generationContract as { contractVersion?: string } | undefined)?.contractVersion,
      contractHash: (input.composed.generationContract as { contractHash?: string } | undefined)?.contractHash,
      refsSig: (input.composed as { refsSig?: string }).refsSig,
      atomMisses: (input.composed as { atomMisses?: string[] }).atomMisses,
      refsRoles: (input.composed as { refsRoles?: string[] }).refsRoles,
      refThumbUrls: (input.composed as { refThumbUrls?: string[] }).refThumbUrls,
      vendorSeed: (input.composed as { vendorSeed?: number }).vendorSeed,
      qualityLadder: (input.composed as { qualityLadder?: string }).qualityLadder,
      bendIdentityReplaced: Boolean((input.composed as { bendIdentityReplaced?: boolean }).bendIdentityReplaced),
      atmospherePlateHung: Boolean((input.composed as { atmospherePlateHung?: boolean }).atmospherePlateHung),
      vendorCalled: (input.composed as { vendorCalled?: boolean }).vendorCalled,
      vendorMs: (input.composed as { vendorMs?: number }).vendorMs,
      synthesizedPropPlate: Boolean((input.composed as { synthesizedPropPlate?: boolean }).synthesizedPropPlate),
      softEnvMissingHonest: Boolean((input.composed as { softEnvMissingHonest?: boolean }).softEnvMissingHonest),
      softEnvBakedIntoIdentity: Boolean(
        (input.composed as { softEnvBakedIntoIdentity?: boolean }).softEnvBakedIntoIdentity,
      ),
      softEnvContinuity: (input.composed as { softEnvContinuity?: string }).softEnvContinuity,
      propSource: (input.composed as { propSource?: string }).propSource,
      actuatorId: (input.composed as { actuatorId?: string }).actuatorId,
      workflowHash: (input.composed as { workflowHash?: string }).workflowHash,
      actuatorDegraded: Boolean((input.composed as { actuatorDegraded?: boolean }).actuatorDegraded),
      actuatorDegradedReason: (input.composed as { actuatorDegradedReason?: string }).actuatorDegradedReason,
      propPlateGrade: (input.composed as { propPlateGrade?: string }).propPlateGrade,
      egressCompressed: Boolean((input.composed as { egressCompressed?: boolean }).egressCompressed),
      vendorPromptUsed: (() => {
        const v = String((input.composed as { vendorPromptUsed?: string }).vendorPromptUsed ?? "").trim();
        const pu = String(input.promptUsed ?? "").trim();
        // Always stamp vendor surface when present (EN compiler egress)
        if (v) return v.slice(0, 2000);
        if (pu) return pu.slice(0, 2000);
        return undefined;
      })(),
      seedreamFields: (input.composed as { seedreamFields?: Record<string, string> }).seedreamFields,
      healedFields: (input.composed as { healedFields?: string[] }).healedFields,
      stillStage: (input.composed as { stillStage?: string }).stillStage,
      autoRepairStage: autoRepair.autoRepairStage,
      autoRepairRound: autoRepair.autoRepairRound,
      autoRepairBudgetLeft: autoRepair.autoRepairBudgetLeft,
      handoffReason: autoRepair.handoffReason,
      i2vReady: readiness.i2vReady,
      i2vBlockReason: readiness.reason,
      ...(input.policy.hasSensitiveTerms ? { policyWarnings: input.policy.warnings } : {}),
      ...poseAnchorMeta,
    });
    // Literary SSOT stays in o_storyboard.prompt — never overwrite with vendor egress.
    // Egress lives in reason.promptUsed / vendorPromptUsed (stamped via hqMeta/pipelineMeta).
    await db("o_storyboard").where({ id: input.storyboardId }).update({
      filePath: input.savePath,
      state: "已完成",
      shouldGenerateImage: 1,
      reason,
    });
    // Video-only stale for this shot — do not wipe neighbor still hq_ok
    try {
      // Prefer tracks linked via storyboard.trackId (schema has no o_videoTrack.storyboardId)
      const sb = await db("o_storyboard").where({ id: input.storyboardId }).select("trackId").first();
      const trackIds = new Set<number>();
      if (sb?.trackId != null) trackIds.add(Number(sb.trackId));
      // Legacy: some DBs may still have storyboardId column on tracks
      try {
        const legacy = await db("o_videoTrack").where({ storyboardId: input.storyboardId }).select("id");
        for (const tr of legacy as { id: number }[]) trackIds.add(Number(tr.id));
      } catch {
        /* column may not exist */
      }
      for (const trackId of trackIds) {
        const tr = await db("o_videoTrack").where({ id: trackId }).select("id", "reason").first();
        if (!tr) continue;
        let prev: Record<string, unknown> = {};
        try {
          prev = tr.reason ? JSON.parse(String(tr.reason)) : {};
        } catch {
          prev = {};
        }
        await db("o_videoTrack")
          .where({ id: trackId })
          .update({
            reason: JSON.stringify({
              ...prev,
              videoStale: true,
              videoPass: false,
              stillPoseAnchor: (poseAnchorMeta as { stillPoseAnchor?: unknown }).stillPoseAnchor,
              contactStartState: (poseAnchorMeta as { contactStartState?: unknown }).contactStartState,
              stillRegenAt: new Date().toISOString(),
            }),
          });
      }
    } catch {
      /* optional */
    }
    if (hq && input.visualPass) {
      try {
        const { cascadeTrackAfterStillHqOk } = await import("@/ruleEngine/quality/cascadeTrackAfterStillHq");
        const contactPending =
          Boolean(input.pendingHumanRejudge) &&
          (input.fidelityItems ?? []).some(
            (i) => /contact_geom|prop_readable|prop_pose/i.test(i.id) && !i.pass,
          );
        await cascadeTrackAfterStillHqOk({
          db,
          storyboardId: input.storyboardId,
          stillQuality: "hq_ok",
          visualPass: true,
          litDebt: Boolean(input.repairIrdPrimaryAction && input.repairIrdPrimaryAction !== "none"),
          contactPendingHuman: contactPending,
        });
      } catch {
        /* optional cascade */
      }
    }
    stillQuality = hqMeta.stillQuality;
  }

  // Resolve PROP soft preview for FE canvas hang (warehouse / prior synth)
  try {
    const composed = input.composed as {
      propAssetId?: number;
      propSoftPreviewUrl?: string;
    };
    if (!composed.propSoftPreviewUrl && composed.propAssetId) {
      const row = await db("o_assets")
        .leftJoin("o_image", "o_assets.imageId", "o_image.id")
        .where("o_assets.id", composed.propAssetId)
        .select("o_image.filePath")
        .first();
      if (row?.filePath) {
        composed.propSoftPreviewUrl = await u.oss.getSmallImageUrl(String(row.filePath));
      }
    }
  } catch {
    /* optional */
  }

  return {
    url: input.url,
    prompt: (() => {
      try {
        const { resolveLiteraryStillPrompt } =
          require("@/ruleEngine/compilers/literaryStillSsot") as typeof import("@/ruleEngine/compilers/literaryStillSsot");
        return (
          resolveLiteraryStillPrompt({
            visualDescription: input.literaryDesc,
            compiledImagePrompt: (input.composed as { compiledImagePrompt?: string })?.compiledImagePrompt,
          }).literary || String(input.literaryDesc ?? "").trim()
        );
      } catch {
        return String(input.literaryDesc ?? "").trim() || undefined;
      }
    })(),
    promptUsed: input.promptUsed,
    egressPrompt: (input.composed as { vendorPromptUsed?: string }).vendorPromptUsed || input.promptUsed,
    vendorPromptUsed: (input.composed as { vendorPromptUsed?: string }).vendorPromptUsed || input.promptUsed,
    refsRoles: (input.composed as { refsRoles?: string[] }).refsRoles,
    refThumbUrls: (input.composed as { refThumbUrls?: string[] }).refThumbUrls,
    canvasDisplayPrompt: (() => {
      try {
        const { resolveStillDualSurface } =
          require("@/agents/scriptAgent/stillCtaSsot") as typeof import("@/agents/scriptAgent/stillCtaSsot");
        return resolveStillDualSurface({
          prompt: input.literaryDesc,
          promptUsed: input.promptUsed,
          vendorPromptUsed: (input.composed as { vendorPromptUsed?: string }).vendorPromptUsed || input.promptUsed,
        }).canvasDisplayPrompt;
      } catch {
        return (input.composed as { vendorPromptUsed?: string }).vendorPromptUsed || input.promptUsed;
      }
    })(),
    seedreamFields: (input.composed as { seedreamFields?: Record<string, string> }).seedreamFields,
    stillStage: (input.composed as { stillStage?: string }).stillStage,
    contentPolicyWarnings: input.policy.hasSensitiveTerms ? input.policy.warnings : undefined,
    feedback: input.feedback,
    referenceCount: input.referenceCount,
    imageMode: input.imageMode,
    rePushPlan: input.rePushPlan,
    stillQuality,
    primaryNextStep: nextStepOut,
    userMessage,
    ctaLabel: ctaOut,
    oneClickRepairKind: (input.composed as { oneClickRepairKind?: string }).oneClickRepairKind ?? null,
    missingSlots: input.repairMissingSlots,
    irdPrimaryAction: input.repairIrdPrimaryAction,
    composeSources: input.composed.sources,
    didSynthesize: input.composed.didSynthesize,
    healBudget: input.healBudget,
    resolvedQuality: input.resolvedQuality,
    closedCompose: Boolean(
      (input.composed as { closedCompose?: boolean }).closedCompose === true &&
        contaminationClass === "none",
    ),
    boundShotIndex:
      (input.composed as { boundShotIndex?: number | null }).boundShotIndex ??
      null,
    framingMode: (input.composed as { framingMode?: string }).framingMode ?? null,
    closedAssertReasons: (input.composed as { closedAssertReasons?: string[] }).closedAssertReasons ?? [],
    contaminationClass: contaminationClass !== "none" ? contaminationClass : null,
    warnings: [
      ...(input.composed.warnings ?? []),
      ...(input.sceneRefsDropped
        ? [`faceCu:dropped_scene_refs=${input.sceneRefsDropped}`]
        : []),
    ],
    visualPass: input.visualPass,
    visualPassAt: input.visualPassAt,
    fidelityItems: input.fidelityItems,
    fidelityStopReason: input.fidelityStopReason,
    bestPassCount: input.bestPassCount,
    fixHintsUsed: input.fixHintsUsed,
    parallelM: input.parallelM,
    editStrategy: input.editStrategy,
    vlmError: input.vlmError,
    pendingHumanRejudge: input.pendingHumanRejudge,
    infraEditBypassUsed: input.infraEditBypassUsed,
    sceneRefsDropped: input.sceneRefsDropped,
    excludeScene: input.composed.excludeScene,
    keepSoftEnvRef: input.composed.keepSoftEnvRef,
    propPlateMissing: Boolean((input.composed as { propPlateMissing?: boolean }).propPlateMissing),
    synthesizedPropPlate: Boolean((input.composed as { synthesizedPropPlate?: boolean }).synthesizedPropPlate),
    propAssetId: (input.composed as { propAssetId?: number }).propAssetId,
    propSoftPreviewUrl: (() => {
      try {
        const { isOralMicroNotActionPrimary } =
          require("@/ruleEngine/compilers/singleShotClosedCompose") as typeof import("@/ruleEngine/compilers/singleShotClosedCompose");
        if (isOralMicroNotActionPrimary(input.literaryDesc)) return undefined;
      } catch {
        /* optional */
      }
      return (input.composed as { propSoftPreviewUrl?: string }).propSoftPreviewUrl;
    })(),
    refsRoles: (input.composed as { refsRoles?: string[] }).refsRoles,
    droppedSoftEnv: Boolean((input.composed as { droppedSoftEnv?: boolean }).droppedSoftEnv),
    vendorDroppedSoftEnv: Boolean(
      (input.composed as { vendorDroppedSoftEnv?: boolean }).vendorDroppedSoftEnv ||
        (input.composed as { droppedSoftEnv?: boolean }).droppedSoftEnv,
    ),
    softEnvMissingHonest: (() => {
      const dropped = Boolean(
        (input.composed as { droppedSoftEnv?: boolean }).droppedSoftEnv ||
          (input.composed as { vendorDroppedSoftEnv?: boolean }).vendorDroppedSoftEnv,
      );
      const cont = String((input.composed as { softEnvContinuity?: string }).softEnvContinuity ?? "");
      if (dropped || cont === "none") return false;
      return Boolean((input.composed as { softEnvMissingHonest?: boolean }).softEnvMissingHonest);
    })(),
    fragmentPlateHung: Boolean((input.composed as { fragmentPlateHung?: boolean }).fragmentPlateHung),
    atmosphereZhOnly: Boolean((input.composed as { atmosphereZhOnly?: boolean }).atmosphereZhOnly),
    softEnvBakedIntoIdentity: Boolean(
      (input.composed as { softEnvBakedIntoIdentity?: boolean }).softEnvBakedIntoIdentity,
    ),
    softEnvContinuity: (input.composed as { softEnvContinuity?: string }).softEnvContinuity,
    propSource: (input.composed as { propSource?: string }).propSource,
    vendorCalled: (input.composed as { vendorCalled?: boolean }).vendorCalled,
    vendorMs: (input.composed as { vendorMs?: number }).vendorMs,
    actuatorId: (input.composed as { actuatorId?: string }).actuatorId,
    workflowHash: (input.composed as { workflowHash?: string }).workflowHash,
    actuatorDegraded: Boolean((input.composed as { actuatorDegraded?: boolean }).actuatorDegraded),
    actuatorDegradedReason: (input.composed as { actuatorDegradedReason?: string }).actuatorDegradedReason,
    propPlateGrade: (input.composed as { propPlateGrade?: string }).propPlateGrade,
    egressCompressed: Boolean((input.composed as { egressCompressed?: boolean }).egressCompressed),
    keyOptional: keyMissing,
    pixelDimStatus: flowPixelDimStatus,
    debtKind: (() => {
      if (litAfter?.debtKind) return litAfter.debtKind;
      if (contaminationClass === "off_beat_cu") return "contamination";
      if (contaminationClass === "contact_zombie" || contaminationClass === "locus_mangled") {
        return "action_misfire";
      }
      if (contaminationClass === "plate_geometry" || contaminationClass === "glyph_identity") {
        return "prop_plate";
      }
      const existing =
        (input.composed as { fidelityDebtKind?: string }).fidelityDebtKind ||
        (input.composed as { identityDebtKind?: string }).identityDebtKind ||
        ((input.composed as { actuatorDegraded?: boolean }).actuatorDegraded
          ? "actuator_degraded"
          : (input.composed as { propPlateGrade?: string }).propPlateGrade === "synthetic_geometry"
            ? "prop_form"
            : litAfter?.literaryEffectsQualified === false
              ? litAfter.debtKind || "action_misfire"
              : keyMissing
                ? "key_unmeasured"
                : undefined);
      if (existing && existing !== "key_unmeasured") return existing;
      if (litAfter?.literaryEffectsQualified === false) return litAfter.debtKind || "action_misfire";
      try {
        const { judgeStillHeuristicNoVlm } =
          require("@/ruleEngine/quality/heuristicStillJudge") as typeof import("@/ruleEngine/quality/heuristicStillJudge");
        const hj = judgeStillHeuristicNoVlm({
          visualDescription: input.literaryDesc,
          promptUsed: input.promptUsed,
          propPlateGrade: (input.composed as { propPlateGrade?: string }).propPlateGrade,
          vlmKeyPresent: !keyMissing && Boolean(input.visualPassAt),
          stillPhase:
            (input.composed as { stillPhase?: string }).stillPhase ??
            ((input.composed.generationContract as { stillPhase?: string } | undefined)?.stillPhase) ??
            null,
        });
        const phase =
          (input.composed as { stillPhase?: string }).stillPhase ??
          ((input.composed.generationContract as { stillPhase?: string } | undefined)?.stillPhase) ??
          "";
        if (
          (phase === "approaching" || phase === "mid_contact") &&
          hj.debtKind === "action_misfire"
        ) {
          return "key_unmeasured"; // approaching incomplete grip ≠ action_misfire
        }
        if (hj.debtKind && hj.debtKind !== "key_unmeasured") return hj.debtKind;
      } catch {
        /* optional */
      }
      return existing;
    })(),
    designIntentProfile:
      (input.composed.generationContract as { designIntentProfile?: unknown } | undefined)
        ?.designIntentProfile ??
      (input.composed as { designIntentProfile?: unknown }).designIntentProfile,
    primaryIntentSeal:
      (input.composed.generationContract as { primaryIntentSeal?: unknown } | undefined)
        ?.primaryIntentSeal ??
      (input.composed as { primaryIntentSeal?: unknown }).primaryIntentSeal,
    bgMode: input.composed.bgMode,
    bgPolicy: input.bgPolicy ?? input.composed.bgPolicy,
    bgPolicyReason: input.composed.bgPolicyReason,
    settingsDeepLink: input.settingsDeepLink,
    sheetLeak: input.sheetLeak,
    blockSilentRegen,
    refreshStoryboardBeforeRegen,
    deliveryTier,
    contaminationClass,
    beatIsolationFailed:
      contaminationClass === "off_beat_cu" ||
      ((input.composed as { sources?: string[] }).sources ?? []).some((s) =>
        /previous\.dropped_off_beat|contaminationClass:off_beat/i.test(String(s)),
      ),
    offBeatContamination:
      contaminationClass === "off_beat_cu" ||
      ((input.composed as { sources?: string[] }).sources ?? []).some((s) =>
        /previous\.dropped_off_beat|contaminationClass:off_beat/i.test(String(s)),
      ),
    requireFixBeforeBurn,
    adviseSmartRepair,
    burnAllowed,
    stillPhase:
      (input.composed as { stillPhase?: string }).stillPhase ??
      ((input.composed.generationContract as { stillPhase?: string } | undefined)?.stillPhase) ??
      (() => {
        const src = (input.composed as { sources?: string[] }).sources ?? [];
        const hit = src.find((s) => /^ff\.phase:([^:]+)/.test(s) || /^lgia\.stillPhase:/.test(s));
        if (!hit) return null;
        const m = /^ff\.phase:([^:]+)/.exec(hit) || /^lgia\.stillPhase:(.+)$/.exec(hit);
        return m?.[1] ?? null;
      })(),
    ctaKind: (() => {
      const kind = ctaResolvedFinal?.kind ?? ctaResolved?.kind;
      if (ssotSealedForCta && !hq && kind === "enhance_and_generate") return "realization_soft";
      return kind;
    })(),
    autoRepairStage: autoRepair.autoRepairStage,
    autoRepairRound: autoRepair.autoRepairRound,
    autoRepairBudgetLeft: autoRepair.autoRepairBudgetLeft,
    handoffReason: autoRepair.handoffReason,
    i2vReady: readiness.i2vReady,
    i2vBlockReason: readiness.reason,
    literaryEffectsQualified: litAfter?.literaryEffectsQualified,
    missingEffects: litAfter?.missingEffects,
    localPoseSignals: litAfter?.localPoseSignals,
    repairInjectLines: litAfter?.repairInjectLines,
    repairDeltaHints: litAfter?.repairDeltaHints,
    videoMotionStartHint: litAfter?.videoMotionStartHint,
    promptLintConflicts: input.composed.promptLintConflicts,
    promptProvenance: [
      { source: "visualDescription", note: "lead" },
      { source: "doctrine", note: "policy" },
    ],
    evidenceTtlMs: 6 * 60 * 60 * 1000,
    evidenceHash,
    contactGeomEvidence: input.contactGeomEvidence,
    propReadableEvidence: input.propReadableEvidence,
    poseEvidence: poseEvidence,
    roleScopeEvidence: input.roleScopeEvidence,
    sceneDominanceEvidence: input.sceneDominanceEvidence,
  };
}
