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
import { composeStillPrompt, computeComposeHash, isDirtyStillPrompt, resolveComposeMode, scrubStillPromptNoise, shouldDefaultFidelityCompose, stripIdentityTokens, type ComposeMode } from "@/ruleEngine/compilers/composeStillPrompt";
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
}

export async function defaultUrlToBase64(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith("/oss/")) {
    return await u.oss.getImageBase64(u.replaceUrl(imageUrl).replace("/smallImage", ""));
  }
  imageUrl = await u.oss.getFileUrl(u.replaceUrl(imageUrl));
  const response = await axios.get(imageUrl, {
    responseType: "arraybuffer",
    headers: { "ngrok-skip-browser-warning": "true" },
  });
  const contentType = response.headers["content-type"] || "image/png";
  const base64 = Buffer.from(response.data, "binary").toString("base64");
  return `data:${contentType};base64,${base64}`;
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
}> {
  const { model, ratio, projectId, storyboardId, requireParentRef } = body;
  const references = orderReferenceUrls(body.references ?? []);
  const qualityMode = body.qualityMode ?? (storyboardId ? "hq_update" : "draft");
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

  let prevMeta: ReturnType<typeof parseStillMetaFromReason> = null;
  if (storyboardId) {
    const sbRow = await db("o_storyboard").where({ id: storyboardId }).select("reason", "prompt").first();
    prevMeta = parseStillMetaFromReason(sbRow?.reason);
    const prevBody = scrubStillPromptNoise(
      stripIdentityTokens(String(prevMeta?.promptUsed ?? sbRow?.prompt ?? prompt)).body,
    ).cleaned;
    if (prevBody) composeCtx.previousVisualBody = prevBody;
  }

  const composeMode = resolveComposeMode({
    requested: body.composeMode,
    existingPrompt: prompt,
    promptState: prevMeta?.promptState,
    composeHash: prevMeta?.composeHash,
    currentHash: computeComposeHash(composeCtx),
    preferFidelity: shouldDefaultFidelityCompose(composeCtx),
  });
  // Dirty / empty / weak shells always force design synthesis
  const forceFull = isDirtyStillPrompt(prompt) || !String(prompt ?? "").trim();
  const composed = composeStillPrompt(composeCtx, { mode: forceFull && !body.composeMode ? "full" : composeMode });
  if (!composed.ok) {
    const env = buildStillErrorEnvelope({
      code: composed.missingLeadAsset ? "IMG-CREF" : "QP-02",
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
  if (!descSsot.ok && qualityMode === "hq_update" && storyboardId) {
    const env = buildStillErrorEnvelope({ code: "QP-02", errMsg: "缺少画面描写，无法文学复原" });
    throw Object.assign(new Error("请先补全画面描写（visualDescription）再生成高质量静照"), {
      code: "QP-02",
      primaryNextStep: "chat_repair",
      userMessage: "缺少画面描写，无法文学复原静照",
      ctaLabel: env.ctaLabel ?? "去补描写",
      stillQuality: "missing" as const,
    });
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
  const { preflightSeatingCref } = await import("@/ruleEngine/qc/stillCrefPreflight");
  const bgPol = resolveStillBgPolicy({
    description: literaryDesc,
    characterNames: charNames,
    shotSize: composeCtx.shotSize,
  });
  const seatingPack = bgPol.pack;
  const crefGate = preflightSeatingCref({
    seatingHard: seatingPack.hasSeatingOrKneel,
    characters: composeCtx.characters,
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
  });

  const touched = touchPromptForVendor(composed.prompt, ratio);
  const aspectRatio = touched.aspectRatio ?? ratio;
  const toB64 = deps.urlToBase64 ?? defaultUrlToBase64;
  const { runStillVisualFidelityLoop } = await import("@/ruleEngine/qc/stillVisualFidelityLoop");
  const { resolveShotIdentityBinding } = await import("@/ruleEngine/compilers/resolveShotIdentityBinding");
  const { resolveLayoutForShot } = await import("@/ruleEngine/qc/stillLayoutControl");
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
          throw Object.assign(new Error(lastComposed.userMessage || "compose failed"), {
            code: "QP-02",
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
          sceneCode: lastComposed.excludeScene ? null : (composeCtx.sceneCode ?? null),
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
        if (storyboardId) {
          const built = await buildReferenceListForStoryboard(
            db,
            projectId,
            storyboardId,
            vendorPrompt,
            bind.orderedCodes.length ? bind.orderedCodes : lastComposed.orderedCrefCodes ?? [],
            bind.orderedCodes.length ? bind.orderedCodes : lastComposed.orderedCrefCodes,
            { excludeScene: Boolean(lastComposed.excludeScene) },
          );
          referenceList = built.referenceList;
          sceneRefsDropped = built.sceneRefsDropped ?? 0;
        }
        for (const url of references) {
          if (!url) continue;
          referenceList.push({ type: "image" as const, base64: await toB64(url) });
        }

        let editStrategy: string | undefined;
        let layoutTemplateId: string | undefined;
        let layoutSkipped: string | undefined;
        let stageCost = 1;
        const useLayoutPreserve = Boolean(layoutPreserve) || (useEdit && seatingPack.hasSeatingOrKneel);

        if (useEdit) {
          const { prepareStillImageEdit } = await import("@/ruleEngine/qc/stillImageEdit");
          const { buildLiteraryEditPrompt } = await import("@/ruleEngine/compilers/stillEditLiteraryPrompt");
          const litEdit = buildLiteraryEditPrompt({
            fullPrompt: vendorPrompt,
            description: literaryDesc,
            fixHints: fixHints ?? [],
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
            layoutPreserve: useLayoutPreserve,
            strategy: useLayoutPreserve ? "layout_preserve" : undefined,
          });
          vendorPrompt = prep.promptUsed;
          referenceList = prep.referenceList.map((r) => ({ type: "image" as const, base64: r.base64 }));
          editStrategy = prep.strategy;
        } else if (seatingPack.hasSeatingOrKneel) {
          const layout = await resolveLayoutForShot({
            pack: seatingPack,
            characterCount: charNames.length,
            qualityMode,
            excludeId: swapLayoutTemplate ? excludeLayoutTemplateId : undefined,
          });
          layoutTemplateId = layout.template?.id;
          layoutSkipped = layout.layoutSkipped;
          if (layout.twoStage && layout.layoutBase64 && layout.template) {
            const stageAPrompt = layout.template.stageAPrompt;
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
                  describe: `still StageA layout template=${layout.template.id}`,
                  relatedObjects: JSON.stringify({ stage: "layout", templateId: layout.template.id }),
                  projectId,
                },
              );
              const tmpPath = `/${projectId}/workFlow/${u.uuid()}-layout.jpg`;
              await imageClass.save(tmpPath.replace(/^\//, ""));
              const tmpUrl = await u.oss.getSmallImageUrl(tmpPath.replace(/^\//, ""));
              stageAB64 = await toB64(tmpUrl);
            }
            if (stageAB64) {
              stageCost = 2;
              referenceList = [
                { type: "image" as const, base64: stageAB64.replace(/^data:image\/\w+;base64,/, "") },
                ...referenceList,
              ];
              vendorPrompt = `${vendorPrompt} 【布局锁】以上一方图为座次构图锚，保持高坐低跪相对位置，贴脸与服装来自角色定妆。`;
            } else {
              layoutSkipped = layoutSkipped ?? "no_file";
            }
          }
        }
        referenceCount = referenceList.length;

        let url: string;
        let savePath: string;
        let imageBase64: string;
        if (deps.imageRunner) {
          const stub = await deps.imageRunner({
            prompt: vendorPrompt,
            referenceList,
            size: quality,
            aspectRatio: aspectRatio ?? ratio,
          });
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
          savePath = `/${projectId}/workFlow/${u.uuid()}.jpg`;
          await imageClass.save(savePath.replace(/^\//, ""));
          url = await u.oss.getSmallImageUrl(savePath.replace(/^\//, ""));
          imageBase64 = await toB64(url);
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
          bgPolicy: lastComposed.bgPolicy ?? bgPol.policy,
          sceneRefsDropped,
          stageCost,
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
  },
) {
  // Literary + visual gate: hq_ok only when L1 visualPass (or L0 when VLM skipped/disabled)
  const coverageOk = input.composed.descCoverageOk !== false;
  const vlmSkipped =
    input.fidelityStopReason === "skipped_draft" || input.fidelityStopReason === "disabled";
  const literaryGate = vlmSkipped ? input.allowHqOk === true : input.visualPass === true;
  const hq = input.qualityMode === "hq_update" && coverageOk && literaryGate && !input.collapsed;
  let stillQuality: "missing" | "weak" | "hq_ok" = hq ? "hq_ok" : "weak";
  const keyMissing = /VLM_API_KEY_MISSING|api\s*key/i.test(String(input.vlmError ?? ""));
  // vlm_error: do NOT nudge regen_hq (would empty-loop while critic is down) — chat_repair / human rejudge
  const primary = buildPrimaryBlock(
    hq ? "burn" : input.fidelityStopReason === "vlm_error" ? "chat_repair" : "regen_storyboard_hq",
    {
      stage: "burn",
      userMessageOverride:
        input.fidelityStopReason === "vlm_error"
          ? `成图评审服务不可用${input.infraEditBypassUsed ? "（已按硬约束尝试 1 次文学 Edit）" : "（未空烧修正）"}；未标高质量。请配置/修复 VLM 模型后重试，或人审通过。${
              input.vlmError ? `（${input.vlmError.slice(0, 80)}）` : ""
            }`
          : undefined,
    },
  );
  const vlmCta =
    input.fidelityStopReason === "vlm_error"
      ? keyMissing
        ? "去配置火山引擎 API Key"
        : input.pendingHumanRejudge
          ? "人审通过或修复评审配置"
          : "修复评审配置后重试"
      : primary.ctaLabel;
  const userMessage = hq
    ? input.composed.didSynthesize
      ? "已按设计智能合成并标记高质量首帧"
      : "已标记高质量首帧"
    : input.fidelityStopReason === "vlm_error"
      ? primary.userMessage
      : input.fidelityStopReason === "converged"
        ? "成图文学保真项反复未过，已收敛停机；未标高质量"
        : input.fidelityStopReason === "budget"
          ? "成图文学保真自动重试次数已用尽；未标高质量"
          : input.collapsed
            ? "静照提示词文学主体塌缩，已回退合成正文；未标高质量"
            : !coverageOk
              ? `描写动作未覆盖完整（缺 ${input.composed.descCoverageMissing?.join("、") || "硬约束"}），未标高质量`
              : primary.userMessage;

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
      repairRoute: input.repairRoute,
      sceneRefsDropped: input.sceneRefsDropped,
      stageCost: input.stageCost,
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
    const reason = mergeReasonMeta(row?.reason, {
      ...hqMeta,
      ...(life.stillMeta ?? {}),
      nextStep: life.primaryNextStep,
      primaryNextStep: life.primaryNextStep,
      userMessage,
      ctaLabel: vlmCta,
      didSynthesize: input.composed.didSynthesize,
      scrubbed: input.composed.scrubbed,
      warnings: input.composed.warnings,
      healLogTail: `compose:${input.composed.sources.join("|")}${input.autoHealed?.length ? `|heal:${input.autoHealed.join(",")}` : ""}`,
      pendingHumanRejudge: input.pendingHumanRejudge,
      infraEditBypassUsed: input.infraEditBypassUsed,
      ...(input.policy.hasSensitiveTerms ? { policyWarnings: input.policy.warnings } : {}),
    });
    // Persist vendor egress (pipeline SSOT) — same string sent to vendor
    const promptWrite =
      input.composed.ok && input.promptUsed.trim() && !isDirtyStillPrompt(input.composed.visualBody)
        ? input.promptUsed
        : undefined;
    await db("o_storyboard").where({ id: input.storyboardId }).update({
      filePath: input.savePath,
      state: "已完成",
      shouldGenerateImage: 1,
      reason,
      ...(promptWrite ? { prompt: promptWrite } : {}),
    });
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
    primaryNextStep: primary.primaryNextStep,
    userMessage,
    ctaLabel: vlmCta,
    composeSources: input.composed.sources,
    didSynthesize: input.composed.didSynthesize,
    healBudget: input.healBudget,
    resolvedQuality: input.resolvedQuality,
    warnings: input.composed.warnings,
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
  };
}
