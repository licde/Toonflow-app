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
  resolveImageQualityAnchor,
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
  promptUsed: string;
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
  refsRoles?: string[];
  vendorCalled?: boolean;
  vendorMs?: number;
  bgMode?: "keep_plate" | "soft_env" | "atmosphere_only";
  bgPolicy?: string;
  bgPolicyReason?: string;
  settingsDeepLink?: string;
  sheetLeak?: boolean;
  blockSilentRegen?: boolean;
  refreshStoryboardBeforeRegen?: boolean;
  autoRepairStage?: string;
  autoRepairRound?: number;
  autoRepairBudgetLeft?: number;
  handoffReason?: string;
  i2vReady?: boolean;
  i2vBlockReason?: string;
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
  const quality = resolveImageQualityAnchor(body.quality, projectRow?.imageQuality);

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
  });
  composeCtx.previousVisualBody = ingress.previousVisualBody;
  const composeMode = ingress.composeMode;

  // XOR smart-split stays on import/design only — never rewrite shot count mid-generate
  const composed = composeStillPrompt(composeCtx, { mode: ingress.effectiveMode });
  if (!composed.ok) {
    const br = String(composed.blockReason ?? "");
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
    throw Object.assign(new Error(composed.userMessage || composed.blockReason || env.userMessage), {
      code: env.code,
      primaryNextStep: composed.primaryNextStep ?? env.primaryNextStep,
      userMessage: composed.userMessage ?? env.userMessage,
      ctaLabel: composed.ctaLabel ?? env.ctaLabel,
      composeSources: composed.sources,
      stillQuality: "missing" as const,
    });
  }

  // Description SSOT — hq path cannot invent literary body from dirty prompt
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
    const env = buildStillErrorEnvelope({ code: "QP-02", errMsg: "缺少画面描写，无法文学复原" });
    throw Object.assign(new Error("请先补全画面描写（visualDescription）再生成高质量静照"), {
      code: "QP-02",
      primaryNextStep: "chat_repair",
      userMessage: "缺少画面描写，无法文学复原静照",
      ctaLabel: env.ctaLabel ?? "去补描写",
      stillQuality: "missing" as const,
    });
  }

  // Design intent fidelity — same kernel as persist compose (HQ hard)
  if (qualityMode === "hq_update") {
    try {
      const { assertPromptDesignFidelity } =
        require("@/ruleEngine/quality/assertPromptDesignFidelity") as typeof import("@/ruleEngine/quality/assertPromptDesignFidelity");
      const fid = assertPromptDesignFidelity({
        shot: {
          visualDescription: composeCtx.visualDescription ?? descSsot.description,
          charCodes: (composeCtx.characters ?? []).map((c) => c.code).filter(Boolean),
        },
        knownNames: (composeCtx.characters ?? []).map((c) => c.name).filter(Boolean) as string[],
        imagePrompt: composed.visualBody || composed.prompt,
        stage: "compose",
        fidelityHard: true,
      });
      const blockFid = fid.findings.filter((f) => f.severity === "BLOCK");
      if (blockFid.length) {
        throw Object.assign(new Error(blockFid[0]!.message), {
          code: blockFid[0]!.id,
          primaryNextStep: "chat_repair",
          userMessage: `${blockFid[0]!.message}；请 stillIntentOps 反推改 VD 或重 compose`,
          ctaLabel: "去补设计描写",
          stillQuality: "missing" as const,
          composeSources: composed.sources,
        });
      }
    } catch (e: unknown) {
      if (e && typeof e === "object" && "code" in e) throw e;
      /* optional module */
    }
  }

  // Dual seating + multi-char: missing look → hard stop (一人一脸)
  // Role URL refs + --cref CHAR-* credit looks before vendor spend; scene URLs never credit faces
  const { parsePromptRefs } = await import("@/ruleEngine/compilers/vendorPromptAdapter");
  const promptRefs = parsePromptRefs(composed.prompt || prompt);
  const identityGate = assertStillIdentityPreflight({
    characters: composeCtx.characters,
    description: descSsot.description || composeCtx.visualDescription,
    dialogueSpeakers: composeCtx.dialogueSpeakers,
    referenceUrls: references,
    promptCrefCodes: promptRefs.crefs,
    enforce: true,
  });
  if (!identityGate.ok) {
    throw Object.assign(new Error(identityGate.userMessage || "角色定妆不齐"), {
      code: identityGate.code ?? "IMG-CREF-CHAR",
      primaryNextStep: identityGate.primaryNextStep ?? "batch_still",
      userMessage: identityGate.userMessage,
      ctaLabel: identityGate.ctaLabel,
      stillQuality: "missing" as const,
      missingChars: identityGate.missing,
      suggestBatchStill: identityGate.suggestBatchStill,
    });
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
      throw Object.assign(new Error(primary.userMessage), {
        code: "HEAL-BUDGET",
        primaryNextStep: primary.primaryNextStep,
        userMessage: primary.userMessage,
        ctaLabel: primary.ctaLabel,
        healBudget: budget,
      });
    }
    budget = consumeRegenRetry(budget);
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

  const charNames = (composeCtx.characters ?? []).map((c) => c.name).filter(Boolean) as string[];
  const literaryDesc = descSsot.description || composeCtx.visualDescription || composed.visualBody;
  const { resolveStillBgPolicy } = await import("@/ruleEngine/compilers/stillBgPolicy");
  const { extractDescPredicates } = await import("@/ruleEngine/compilers/extractDescPredicates");
  const { preflightFamilyCref } = await import("@/ruleEngine/qc/stillCrefPreflight");
  const { selectLayoutFamily } = await import("@/ruleEngine/qc/stillCompositionSpec");
  const { classifyStillIntent } = await import("@/ruleEngine/compilers/stillIntentPolicy");
  const bgPol = resolveStillBgPolicy({
    description: literaryDesc,
    characterNames: charNames,
    shotSize: composeCtx.shotSize,
    sceneEstablishingHint:
      Boolean((composeCtx as { sceneEstablishing?: boolean }).sceneEstablishing) ||
      /建立镜头|establishing|空镜建立|全景建立/i.test(String(literaryDesc ?? "")),
    hasSceneLink: Boolean(
      composeCtx.sceneCode ||
        (composeCtx.sceneAssets ?? []).length ||
        composed.keepSoftEnvRef ||
        /--sref\s+SCENE-/i.test(String(prompt ?? "")),
    ),
  });
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
  let lastComposed = composed;
  let lastPipeline = runStillPromptPipeline({
    composed,
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
    const loopOut = await runStillVisualFidelityLoop({
      qualityMode,
      storyboardId,
      description: literaryDesc,
      checklist,
      healBudget: budget,
      strengthen: body.strengthen,
      judgeFn: deps.vlmJudgeFn,
      db,
      bgPolicy: bgPol.policy,
      generateOnce: async ({
        strengthen,
        mode,
        fixHints,
        failedImageBase64,
        layoutPreserve,
        forbidLayoutPreserve: roundForbidLayoutPreserve,
        swapLayoutTemplate,
        excludeLayoutTemplateId,
      }) => {
        const useEdit = mode === "edit";
        // Edit rounds: do not re-stack strengthen into compose; use fixHint focus prompt
        if (!useEdit) {
          composeCtx.strengthen = { ...(composeCtx.strengthen ?? {}), ...strengthen };
        }
        lastComposed = composeStillPrompt(composeCtx, {
          mode: useEdit || Object.keys(strengthen).length ? "fidelity" : composeMode,
        });
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
          const propCodes = resolvePropSoftCodes({
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
            },
          );
          referenceList = built.referenceList;
          sceneRefsDropped = built.sceneRefsDropped ?? 0;
          turnaroundCrefUsed = Boolean(built.turnaroundCrefUsed);
          if (built.propSoftKept) {
            propPlatePresent = true;
            propPlateMissing = false;
            (lastComposed as { propSource?: string }).propSource = "asset";
          } else if (
            lastComposed.generationContract?.objectiveClass === "contact_geom" ||
            lastComposed.generationContract?.objectiveClass === "prop_readable"
          ) {
            propPlateMissing = true;
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
          const softEnv = Boolean(lastComposed.keepSoftEnvRef);
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
              const cropped = await cropTurnaroundSheetToIdentityPlate(base64, {
                assumeSheet: true,
                threeViewStrip: true,
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
              // Event objectives: face-bias only when softEnv will NOT be baked (bake face-crops)
              if (eventObj && !(softEnv && softEnvB64)) {
                const face = await cropIdentityPlateToFaceBias(base64);
                if (face.cropped && face.base64) base64 = face.base64;
              }
              identityPlates.push({ type: "image" as const, base64 });
            } else if (!dropScene && likelyScene) {
              if (softEnv && !softEnvB64) softEnvB64 = base64;
              else identityPlates.push({ type: "image" as const, base64 });
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
            const tagged: Array<{ type: "image"; base64: string; role?: "identity" | "propSoft" | "softEnv" }> = [];
            for (const p of identityPlates.slice(0, 1)) {
              tagged.push({ type: "image", base64: p.base64, role: "identity" });
            }
            if (propB64) {
              tagged.push({ type: "image", base64: propB64, role: "propSoft" });
              (lastComposed as { propSource?: string }).propSource = "fe";
            } else if (eventObj) propPlateMissing = true;
            if (softEnv && softEnvB64) tagged.push({ type: "image", base64: softEnvB64, role: "softEnv" });
            const budgeted = await applyContinuityAwareRefBudget({
              refs: tagged,
              propRequired: eventObj,
              maxSlots: 3,
              softEnvContinuity: continuity,
              allowPixelBake: false,
            });
            referenceList = budgeted.refs.map((r) => ({ type: "image" as const, base64: r.base64 }));
            propPlatePresent = budgeted.roles.includes("propSoft");
            softEnvPlatePresent = budgeted.roles.includes("softEnv") || budgeted.softEnvBakedIntoIdentity;
            if (eventObj && !propPlatePresent) propPlateMissing = true;
            (lastComposed as { refsRoles?: string[] }).refsRoles = budgeted.roles;
            (lastComposed as { droppedSoftEnv?: boolean }).droppedSoftEnv = budgeted.droppedSoftEnv;
            (lastComposed as { softEnvBakedIntoIdentity?: boolean }).softEnvBakedIntoIdentity =
              budgeted.softEnvBakedIntoIdentity;
            (lastComposed as { softEnvBakeFailed?: boolean }).softEnvBakeFailed = budgeted.bakeFailed;
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
          const softEnv = Boolean(lastComposed.keepSoftEnvRef);
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
          if (softEnv && softEnvB64) {
            tagged.push({ type: "image", base64: softEnvB64, role: "softEnv" });
          } else if (softEnvPlatePresent) {
            const softIdx =
              propPlatePresent && referenceList.length >= 3
                ? referenceList.length - 1
                : !propPlatePresent && referenceList.length >= 2
                  ? referenceList.length - 1
                  : -1;
            if (softIdx > 0 && referenceList[softIdx]?.base64) {
              tagged.push({ type: "image", base64: referenceList[softIdx]!.base64, role: "softEnv" });
            }
          }

          const budgeted = await applyContinuityAwareRefBudget({
            refs: tagged,
            propRequired: eventObj,
            maxSlots: 3,
            softEnvContinuity: continuity,
            allowPixelBake: false,
          });
          if (budgeted.refs.length) {
            referenceList = budgeted.refs.map((r) => ({ type: "image" as const, base64: r.base64 }));
          }
          propPlatePresent = budgeted.roles.includes("propSoft") || propPlatePresent;
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

        // Always echo continuity flags (even false) for FE/debug
        if (lastComposed.keepSoftEnvRef) {
          (lastComposed as { softEnvContinuity?: string }).softEnvContinuity =
            (lastComposed as { softEnvContinuity?: string }).softEnvContinuity ?? "must";
          if ((lastComposed as { softEnvBakedIntoIdentity?: boolean }).softEnvBakedIntoIdentity == null) {
            (lastComposed as { softEnvBakedIntoIdentity?: boolean }).softEnvBakedIntoIdentity = false;
          }
        }

        // Structure whitelist: synthesize PROP soft plate when event objective lacks one
        let synthAttempted = false;
        if (
          propPlateMissing &&
          !propPlatePresent &&
          !synthesizedProp &&
          (lastComposed.generationContract?.objectiveClass === "contact_geom" ||
            lastComposed.generationContract?.objectiveClass === "prop_readable")
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
            const synth = await synthesizePropSoftPlate({
              propClassId: label.propClassId,
              canonical: label.canonical,
              glyphText: label.glyphText,
              softPlateHint: label.softPlateHint,
            });
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
              if (referenceList.length >= 1) {
                referenceList.splice(1, 0, { type: "image" as const, base64: synth.base64 });
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
              const formBits = (lastComposed.generationContract?.mustShowFacts ?? [])
                .filter((f) => f.id === "prop_form" || f.id === "prop_glyph" || f.id === "prop_pose")
                .map((f) => f.text)
                .slice(0, 3);
              const anti = (lastComposed.generationContract?.forbiddenSubstitutions ?? [])
                .filter((s) => /书本|卷轴|厚本|薄纸|替代/.test(s))
                .slice(0, 2);
              vendorPrompt = [...formBits, ...anti, `${label.canonical}须清晰入画（薄纸片软板，非书）`]
                .filter(Boolean)
                .join("。")
                .concat("。")
                .concat(String(vendorPrompt).trim());
            }
          } catch (synthErr) {
            console.warn("[generateFlowImage] prop soft plate synth failed", u.error(synthErr).message);
          }
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
        try {
          const facts = (lastComposed.generationContract?.mustShowFacts ?? []).filter((f) =>
            f.id === "prop_form" || f.id === "prop_glyph" || f.id === "prop_pose" || f.id === "contact_event",
          );
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
            if (
              lastComposed.generationContract?.objectiveClass === "contact_geom" ||
              lastComposed.generationContract?.objectiveClass === "prop_readable"
            ) {
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
          // Face-bias only when softEnv was NOT baked (bake already face-crops — avoid double destroy)
          if (eventObj && !softEnvBaked && referenceList[0]?.base64) {
            const face = await cropIdentityPlateToFaceBias(referenceList[0].base64);
            if (face.cropped && face.base64) {
              referenceList[0] = { type: "image" as const, base64: face.base64 };
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
            const pick = await applyContinuityAwareRefBudget({
              refs: tagged,
              propRequired: eventObj,
              maxSlots: 3,
              softEnvContinuity: continuity,
              allowPixelBake: false,
            });
            referenceList = pick.refs.map((r) => ({ type: "image" as const, base64: r.base64 }));
            refsRolesEcho = pick.roles;
            propPlatePresent = pick.roles.includes("propSoft") || propPlatePresent;
            softEnvPlatePresent = pick.roles.includes("softEnv") || pick.softEnvBakedIntoIdentity;
            softEnvBaked = pick.softEnvBakedIntoIdentity;
            (lastComposed as { refsRoles?: string[] }).refsRoles = pick.roles;
            (lastComposed as { droppedSoftEnv?: boolean }).droppedSoftEnv = pick.droppedSoftEnv;
            (lastComposed as { softEnvBakedIntoIdentity?: boolean }).softEnvBakedIntoIdentity =
              pick.softEnvBakedIntoIdentity;
            (lastComposed as { softEnvBakeFailed?: boolean }).softEnvBakeFailed = pick.bakeFailed;
          } else {
            softEnvPlatePresent = true;
            (lastComposed as { refsRoles?: string[] }).refsRoles = refsRolesEcho;
          }
          const bindZh = buildEventRefOrdinalBinding({
            roles: refsRolesEcho as Array<"identity" | "propSoft" | "softEnv">,
            propRequired: eventObj,
            thinSheets: Boolean(thin),
            softEnvBakedIntoIdentity: softEnvBaked,
          });
          if (bindZh && !/参考绑定：/.test(vendorPrompt)) {
            vendorPrompt = `${String(vendorPrompt).trim()}。${bindZh}`;
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
          // Soft-env honesty + candle atmosphere lead keep
          if (
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
            const atm = /烛火|烛光|月光|暖光|冷光|夜色|灯火/.exec(String(literaryDesc))?.[0];
            if (atm && !vendorPrompt.includes(atm)) {
              vendorPrompt = `保留${atm}氛围可辨。${String(vendorPrompt).trim()}`;
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

        let url: string;
        let savePath: string;
        let imageBase64: string;
        const vendorT0 = Date.now();
        let vendorCalled = false;
        if (deps.imageRunner) {
          const stub = await deps.imageRunner({
            prompt: vendorPrompt,
            referenceList,
            size: quality,
            aspectRatio: aspectRatio ?? ratio,
          });
          vendorCalled = true;
          savePath = `/${projectId}/workFlow/${u.uuid()}.jpg`;
          await stub.save(savePath.replace(/^\//, ""));
          url = stub.getResultUrl
            ? await stub.getResultUrl()
            : await u.oss.getSmallImageUrl(savePath.replace(/^\//, ""));
          imageBase64 = stub.resultBase64 ?? (await toB64(url));
        } else {
          const imageClass = await u.Ai.Image(model as `${string}:${string}`).run(
            {
              prompt: vendorPrompt,
              referenceList,
              size: quality as "1K" | "2K" | "4K",
              aspectRatio: aspectRatio as `${number}:${number}`,
            },
            {
              taskClass: "工作流图片生成",
              describe: `工作流图片生成 mode=${modeRules.modeId} edit=${editStrategy ?? "generate"} stageCost=${stageCost}`,
              relatedObjects: JSON.stringify({
                ...body,
                resolvedImageMode: modeRules.modeId,
                qualityMode,
                editStrategy,
                layoutTemplateId,
                bgPolicy: lastComposed.bgPolicy ?? bgPol.policy,
                sceneRefsDropped,
                stageCost,
              }),
              projectId,
            },
          );
          vendorCalled = true;
          savePath = `/${projectId}/workFlow/${u.uuid()}.jpg`;
          await imageClass.save(savePath.replace(/^\//, ""));
          url = await u.oss.getSmallImageUrl(savePath.replace(/^\//, ""));
          imageBase64 = await toB64(url);
        }
        const vendorMs = Date.now() - vendorT0;
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
      },
    });

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
      prompt: lastComposed.prompt,
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
  const coverageOk =
    input.pipelineCoverageOk !== false &&
    (input.pipelineCoverageOk === true ||
      input.composed.descCoverageOk !== false ||
      (input.pipelineCoverageMissing?.length ?? 0) === 0);
  const coverageMissing =
    (input.pipelineCoverageOk === false
      ? input.pipelineCoverageMissing
      : input.composed.descCoverageOk === false
        ? input.composed.descCoverageMissing
        : []) ?? [];
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
  const evidenceHash = hashLiteraryDesc(
    JSON.stringify({
      contact: input.contactGeomEvidence ?? null,
      prop: input.propReadableEvidence ?? null,
      pose: input.poseEvidence ?? null,
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
    poseEvidence: (input.poseEvidence as { primaryPose?: string; secondaryPose?: string; faceCuOnly?: boolean }) ?? null,
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
    !sheetLeak;
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
  const autoRepair = decideAutoRepairPolicy({
    repairIrdPrimaryAction: input.repairIrdPrimaryAction,
    fidelityStopReason: input.fidelityStopReason,
    visualPass: input.visualPass,
    keyMissing,
    round: prevRound + 1,
    findings: [
      ...(coverageMissing ?? []),
      ...((input.fidelityItems ?? []).filter((i) => !i.pass).map((i) => i.id) ?? []),
    ],
    missingSlots: input.repairMissingSlots,
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
            ? autoRepair.autoRepairStage === "handoff_human"
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
  // Only structural split bricks silent regen; Key可选/文学可补槽/自动修复均保持可点生成
  const blockSilentRegen =
    nextStepOut === "split_shot" || input.repairIrdPrimaryAction === "confirm_split";
  const refreshStoryboardBeforeRegen = nextStepOut === "split_shot";
  const vlmCta =
    litDebtStop
      ? input.repairIrdPrimaryAction === "confirm_split"
        ? input.repairCtaLabel || "确认智能拆镜"
        : litEnhanceable
          ? input.repairCtaLabel || "应用补全后重生成"
          : input.repairCtaLabel || "手改VD后重生成"
      : input.fidelityStopReason === "vlm_error"
      ? keyMissing
        ? autoRepair.allowSilentRegen
          ? "继续生成修复"
          : input.pendingHumanRejudge
            ? "人审通过（未测·非失败）"
            : "可选：配置诊断 Key 后人审"
        : input.pendingHumanRejudge
          ? "人审通过或修复评审配置"
          : "修复评审配置后重试"
      : primary.ctaLabel;
  const userMessage = hq
    ? input.composed.didSynthesize
      ? "已按设计智能合成并标记高质量首帧"
      : "已标记高质量首帧"
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
            : !coverageOk
              ? `描写动作未覆盖完整（缺 ${coverageMissing.join("、") || "硬约束"}），弱图不可作视频首帧`
              : primary.userMessage;
  const { assessStillVideoReadiness } =
    require("@/ruleEngine/qc/stillVideoReadiness") as typeof import("@/ruleEngine/qc/stillVideoReadiness");
  const readiness = assessStillVideoReadiness({
    stillQuality: hq ? "hq_ok" : "weak",
    visualPass: input.visualPass,
    sheetLeak,
    fidelityItems: input.fidelityItems,
    promptUsed: input.promptUsed,
    visualDescription: input.literaryDesc,
    i2vCriticalFacts: (input.composed.generationContract as { i2vCriticalFacts?: string[] } | undefined)
      ?.i2vCriticalFacts,
    contract: input.composed.generationContract ?? null,
    stillMeta: {
      grayStudio: Boolean((input.sceneDominanceEvidence as { grayStudio?: boolean } | undefined)?.grayStudio),
      sceneDominanceEvidence: input.sceneDominanceEvidence,
    },
  });

  if (input.persistToStoryboard && input.storyboardId) {
    const row = await db("o_storyboard").where({ id: input.storyboardId }).first();
    const prevMeta = parseStillMetaFromReason(row?.reason);
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
      poseEvidence: input.poseEvidence,
      roleScopeEvidence: input.roleScopeEvidence,
      sceneDominanceEvidence: input.sceneDominanceEvidence,
      evidenceHash,
      evidenceTtlMs: 6 * 60 * 60 * 1000,
      generationContract: input.composed.generationContract,
      contractVersion: (input.composed.generationContract as { contractVersion?: string } | undefined)?.contractVersion,
      contractHash: (input.composed.generationContract as { contractHash?: string } | undefined)?.contractHash,
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
          promptUsed: input.promptUsed.slice(0, 2000),
          literaryDescHash: hashLiteraryDesc(String(input.literaryDesc ?? "")),
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
          promptUsed: input.promptUsed.slice(0, 2000),
          literaryDescHash: hashLiteraryDesc(String(input.literaryDesc ?? "")),
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
            atom.mustFail.includes("missing_prop_glyph") ||
            atom.mustFail.includes("missing_contact_event"),
        );
        const m = matchContactEventVd(vd || blob);
        if (!propPlateMissing && atom.ok) {
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
          // Forbid false handoff — do not declare at_locus when atoms fail
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
            poseHandoffBlockReasons: atom.mustFail,
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
      ctaLabel: vlmCta,
      didSynthesize: input.composed.didSynthesize,
      scrubbed: input.composed.scrubbed,
      warnings: input.composed.warnings,
      healLogTail: `compose:${input.composed.sources.join("|")}${input.autoHealed?.length ? `|heal:${input.autoHealed.join(",")}` : ""}`,
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
      vendorCalled: (input.composed as { vendorCalled?: boolean }).vendorCalled,
      vendorMs: (input.composed as { vendorMs?: number }).vendorMs,
      synthesizedPropPlate: Boolean((input.composed as { synthesizedPropPlate?: boolean }).synthesizedPropPlate),
      softEnvMissingHonest: Boolean((input.composed as { softEnvMissingHonest?: boolean }).softEnvMissingHonest),
      softEnvBakedIntoIdentity: Boolean(
        (input.composed as { softEnvBakedIntoIdentity?: boolean }).softEnvBakedIntoIdentity,
      ),
      softEnvContinuity: (input.composed as { softEnvContinuity?: string }).softEnvContinuity,
      propSource: (input.composed as { propSource?: string }).propSource,
      autoRepairStage: autoRepair.autoRepairStage,
      autoRepairRound: autoRepair.autoRepairRound,
      autoRepairBudgetLeft: autoRepair.autoRepairBudgetLeft,
      handoffReason: autoRepair.handoffReason,
      i2vReady: readiness.i2vReady,
      i2vBlockReason: readiness.reason,
      ...(input.policy.hasSensitiveTerms ? { policyWarnings: input.policy.warnings } : {}),
      ...poseAnchorMeta,
    });
    // Persist vendor egress (pipeline SSOT) — same string sent to vendor; strip lock soup
    let promptWrite: string | undefined =
      input.composed.ok && input.promptUsed.trim() && !isDirtyStillPrompt(input.composed.visualBody)
        ? input.promptUsed
        : undefined;
    if (promptWrite) {
      try {
        const { homologizeStillPromptForStore } = await import(
          "@/ruleEngine/compilers/stillPromptHomology"
        );
        promptWrite = homologizeStillPromptForStore(promptWrite).prompt || promptWrite;
      } catch {
        /* optional */
      }
    }
    await db("o_storyboard").where({ id: input.storyboardId }).update({
      filePath: input.savePath,
      state: "已完成",
      shouldGenerateImage: 1,
      reason,
      ...(promptWrite ? { prompt: promptWrite } : {}),
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
        await cascadeTrackAfterStillHqOk({
          db,
          storyboardId: input.storyboardId,
          stillQuality: "hq_ok",
          visualPass: true,
          litDebt: Boolean(input.repairIrdPrimaryAction && input.repairIrdPrimaryAction !== "none"),
        });
      } catch {
        /* optional cascade */
      }
    }
    stillQuality = hqMeta.stillQuality;
  }

  return {
    url: input.url,
    promptUsed: input.promptUsed,
    contentPolicyWarnings: input.policy.hasSensitiveTerms ? input.policy.warnings : undefined,
    feedback: input.feedback,
    referenceCount: input.referenceCount,
    imageMode: input.imageMode,
    rePushPlan: input.rePushPlan,
    stillQuality,
    primaryNextStep: nextStepOut,
    userMessage,
    ctaLabel: vlmCta,
    missingSlots: input.repairMissingSlots,
    irdPrimaryAction: input.repairIrdPrimaryAction,
    composeSources: input.composed.sources,
    didSynthesize: input.composed.didSynthesize,
    healBudget: input.healBudget,
    resolvedQuality: input.resolvedQuality,
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
    refsRoles: (input.composed as { refsRoles?: string[] }).refsRoles,
    droppedSoftEnv: Boolean((input.composed as { droppedSoftEnv?: boolean }).droppedSoftEnv),
    softEnvMissingHonest: Boolean((input.composed as { softEnvMissingHonest?: boolean }).softEnvMissingHonest),
    softEnvBakedIntoIdentity: Boolean(
      (input.composed as { softEnvBakedIntoIdentity?: boolean }).softEnvBakedIntoIdentity,
    ),
    softEnvContinuity: (input.composed as { softEnvContinuity?: string }).softEnvContinuity,
    propSource: (input.composed as { propSource?: string }).propSource,
    vendorCalled: (input.composed as { vendorCalled?: boolean }).vendorCalled,
    vendorMs: (input.composed as { vendorMs?: number }).vendorMs,
    bgMode: input.composed.bgMode,
    bgPolicy: input.bgPolicy ?? input.composed.bgPolicy,
    bgPolicyReason: input.composed.bgPolicyReason,
    settingsDeepLink: input.settingsDeepLink,
    sheetLeak: input.sheetLeak,
    blockSilentRegen,
    refreshStoryboardBeforeRegen,
    autoRepairStage: autoRepair.autoRepairStage,
    autoRepairRound: autoRepair.autoRepairRound,
    autoRepairBudgetLeft: autoRepair.autoRepairBudgetLeft,
    handoffReason: autoRepair.handoffReason,
    i2vReady: readiness.i2vReady,
    i2vBlockReason: readiness.reason,
    promptLintConflicts: input.composed.promptLintConflicts,
    promptProvenance: [
      { source: "visualDescription", note: "lead" },
      { source: "doctrine", note: "policy" },
    ],
    evidenceTtlMs: 6 * 60 * 60 * 1000,
    evidenceHash,
    contactGeomEvidence: input.contactGeomEvidence,
    propReadableEvidence: input.propReadableEvidence,
    poseEvidence: input.poseEvidence,
    roleScopeEvidence: input.roleScopeEvidence,
    sceneDominanceEvidence: input.sceneDominanceEvidence,
  };
}
