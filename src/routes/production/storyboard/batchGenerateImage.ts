import express from "express";
import u from "@/utils";
import { z } from "zod";
import { error, success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { assetItemSchema } from "@/agents/productionAgent/tools";
import { isRuleEngineEnabled } from "@/ruleEngine/featureFlag";
import { loadEpisodePackage } from "@/ruleEngine/storage/episodePackageStore";
import { getCompiledPromptForStoryboard, syncFromFlowData } from "@/ruleEngine/facade";
import { touchPromptForVendor } from "@/ruleEngine/compilers/vendorPromptAdapter";
import { precheckContentPolicy } from "@/ruleEngine/compilers/contentPolicyAdapter";
import { buildReferenceListFromAssetIds } from "@/ruleEngine/compilers/referenceListBuilder";
import { classifyGenerationFailure } from "@/ruleEngine/bundle/generationFailureHelper";
import { runPreflightGate } from "@/ruleEngine/detection/preflightGate";
import { loadModePromptTemplate } from "@/ruleEngine/compilers/loadModePromptTemplate";
import { resolveGenerationModeRules } from "@/ruleEngine/compilers/resolveGenerationModeRules";
import { gateIdentityForShot } from "@/ruleEngine/compilers/resolveShotIdentity";
import path from "path";
const router = express.Router();

function getModelPromptRoot(): string {
  return path.join(process.cwd(), "data", "modelPrompt");
}
export type AssetData = z.infer<typeof assetItemSchema>;

export default router.post(
  "/",
  validateFields({
    storyboardIds: z.array(z.number()),
    projectId: z.number(),
    scriptId: z.number(),
    concurrentCount: z.number().min(1).optional(),
    compulsory: z.boolean().optional(),
    skipPreflight: z.boolean().optional(),
    qualityMode: z.enum(["hq_update", "draft"]).optional(),
  }),
  async (req, res) => {
    const {
      storyboardIds,
      projectId,
      scriptId,
      concurrentCount = 5,
      compulsory = false,
      skipPreflight,
      qualityMode = "hq_update",
    }: {
      storyboardIds: number[];
      projectId: number;
      scriptId: number;
      concurrentCount: number;
      compulsory: boolean;
      skipPreflight?: boolean;
      qualityMode?: "hq_update" | "draft";
    } = req.body;
    if (!storyboardIds || storyboardIds.length === 0) return res.status(400).send(error("storyboardIds不能为空"));
    let finalStoryboardIds: number[] = storyboardIds || [];

    // Warehouse debt: draft OK; hq_update gets enhance CTA (never gray-button forever)
    {
      const pkg = await loadEpisodePackage(u.db, projectId, scriptId);
      const { readWarehouseDebtFromPackage, warehouseDebtStillEnhance } =
        require("@/ruleEngine/bundle/warehouseDebtMeta") as typeof import("@/ruleEngine/bundle/warehouseDebtMeta");
      const debt = readWarehouseDebtFromPackage(pkg);
      const enhance = warehouseDebtStillEnhance(debt);
      if (enhance.enhance && qualityMode === "hq_update" && !compulsory) {
        return res.status(400).send(
          error(enhance.userMessage, {
            code: "WAREHOUSE_DEBT_STILL_ENHANCE",
            decision: "soft_defer",
            primaryNextStep: "enhance_design",
            ctaLabel: enhance.ctaLabel,
            warehouseDebt: debt,
            hint: "可改 qualityMode=draft 先出草稿；draft≠hq_ok≠设计已闭",
          }),
        );
      }
    }

    // V5-N11b: skipPreflight must never bypass lit/contact/weak still debt
    if (skipPreflight) {
      const rows = await u
        .db("o_storyboard")
        .where({ projectId, scriptId })
        .whereIn("id", finalStoryboardIds)
        .select("id", "reason", "prompt");
      const dirty = rows.filter((r) => {
        const reason =
          typeof r.reason === "string"
            ? (() => {
                try {
                  return JSON.parse(r.reason);
                } catch {
                  return {};
                }
              })()
            : (r.reason as Record<string, unknown>) ?? {};
        const sq = String(reason.stillQuality ?? "");
        const vd = String(reason.visualDescription ?? r.prompt ?? "");
        return (
          /weak|unmeasured|draft|contact|lit_debt|sheetLeak/i.test(sq) ||
          /贴颊|贴脸|摩挲|扳指|接触/.test(vd)
        );
      });
      if (dirty.length) {
        return res.status(400).send(
          error("skipPreflight 不得绕过接触/弱图/文学债镜（V5-N11b）", {
            code: "SKIP-PREFLIGHT-FORBIDDEN",
            dirtyStoryboardIds: dirty.map((d) => d.id),
            primaryNextStep: "human_review",
            ctaLabel: "人审或修 VD 后再生成",
          }),
        );
      }
    }
    const gate = await runPreflightGate(u.db, {
      projectId,
      scriptId,
      storyboardIds: finalStoryboardIds,
      modality: "IMG",
      skipPreflight: Boolean(skipPreflight),
    });
    if (!gate.allowed) {
      return res.status(400).send(
        error(gate.userMessage ?? gate.blockReason ?? "preflight BLOCK", {
          preflight: gate.preflight,
          failedChecks: gate.failedChecks,
          primaryNextStep: gate.primaryNextStep,
          userMessage: gate.userMessage,
          ctaLabel: gate.ctaLabel,
        }),
      );
    }

    const storyboardData = await u.db("o_storyboard").where("scriptId", scriptId).where("projectId", projectId).whereIn("id", finalStoryboardIds);
    if (!storyboardData.length) return res.status(500).send(error("未查到分镜数据"));
    const storyIds = storyboardData.map((i) => i.id);
    if (compulsory) {
      await u.db("o_storyboard").whereIn("id", storyIds).where("scriptId", scriptId).update({ state: "生成中", shouldGenerateImage: 1 });
    } else {
      await u.db("o_storyboard").whereIn("id", storyIds).where("scriptId", scriptId).where("shouldGenerateImage", 0).update({ state: "未生成" });
      await u.db("o_storyboard").whereIn("id", storyIds).where("scriptId", scriptId).where("shouldGenerateImage", 1).update({ state: "生成中" });
    }

    const projectSettingData = await u.db("o_project").where("id", projectId).select("imageModel", "imageQuality", "artStyle", "videoRatio").first();

    const assets2StoryboardRows = await u
      .db("o_assets2Storyboard")
      .whereIn("storyboardId", storyIds)
      .orderBy("rowid")
      .select("storyboardId", "assetId");

    const allAssetIds = [...new Set(assets2StoryboardRows.map((r) => r.assetId).filter(Boolean))] as number[];
    const assetImageMap: Record<number, number> = {};
    if (allAssetIds.length > 0) {
      const assetRows = await u.db("o_assets").whereIn("id", allAssetIds).select("id", "imageId");
      assetRows.forEach((row) => {
        if (row.id != null && row.imageId != null) assetImageMap[row.id] = row.imageId;
      });
    }

    const assetRecord: Record<number, number[]> = {};
    assets2StoryboardRows.forEach((item) => {
      if (!item.storyboardId || !item.assetId) return;
      if (!assetRecord[item.storyboardId]) {
        assetRecord[item.storyboardId] = [];
      }
      const imageId = assetImageMap[item.assetId];
      if (imageId != null) {
        assetRecord[item.storyboardId].push(imageId);
      }
    });
    const realStoryData = await u.db("o_storyboard").where("scriptId", scriptId).where("projectId", projectId).whereIn("id", storyIds);
    res.status(200).send(
      success(
        realStoryData.map((i) => ({
          id: i.id,
          prompt: i.prompt,
          associateAssetsIds: assetRecord[i.id!],
          src: null,
          state: i.state,
          videoDesc: i.videoDesc,
          shouldGenerateImage: i.shouldGenerateImage,
        })),
      ),
    );

    const generateTask = async (item: (typeof storyboardData)[number]) => {
      let promptText = item.prompt!;
      // Smart cast bind: charCodes → o_assets2Storyboard when link missing (消 UI X)
      try {
        const pkgBind = await loadEpisodePackage(u.db, projectId, scriptId);
        const shotBind = pkgBind?.shots?.find((s) => s.storyboardId === item.id);
        const codes = (shotBind?.charCodes ?? []).map(String).filter((c) => /^CHAR-/i.test(c));
        if (codes.length) {
          const existing = assets2StoryboardRows.filter((r) => r.storyboardId === item.id && r.assetId);
          if (!existing.length) {
            const scriptAssetRows = await u.db("o_scriptAssets").where({ scriptId }).select("assetId");
            const candidateIds = scriptAssetRows.map((r: { assetId: number }) => r.assetId).filter(Boolean);
            if (candidateIds.length) {
              const assets = await u
                .db("o_assets")
                .whereIn("id", candidateIds)
                .select("id", "remark", "imageId", "name");
              const toLink: number[] = [];
              for (const code of codes) {
                const hit = (assets as Array<{ id: number; remark?: string; imageId?: number }>).find((a) =>
                  String(a.remark ?? "").includes(`assetCode:${code}`),
                );
                if (hit?.id && hit.imageId) toLink.push(hit.id);
              }
              for (const assetId of [...new Set(toLink)]) {
                const already = assets2StoryboardRows.some(
                  (r) => r.storyboardId === item.id && r.assetId === assetId,
                );
                if (already) continue;
                await u.db("o_assets2Storyboard").insert({ assetId, storyboardId: item.id });
                assets2StoryboardRows.push({ storyboardId: item.id!, assetId });
                if (assetImageMap[assetId] == null) {
                  const row = (assets as Array<{ id: number; imageId?: number }>).find((a) => a.id === assetId);
                  if (row?.imageId) assetImageMap[assetId] = row.imageId;
                }
                if (!assetRecord[item.id!]) assetRecord[item.id!] = [];
                if (assetImageMap[assetId] != null) assetRecord[item.id!].push(assetImageMap[assetId]);
              }
            }
          }
        }
      } catch {
        /* best-effort associate */
      }
      if (await isRuleEngineEnabled(u.db, projectId)) {
        let pkg = await loadEpisodePackage(u.db, projectId, scriptId);
        if (!pkg) {
          const flowRow = await u.db("o_agentWorkData").where({ projectId, episodesId: scriptId, key: "productionAgent" }).first();
          if (flowRow?.data) {
            const flow = JSON.parse(flowRow.data as string);
            pkg = await syncFromFlowData(u.db, {
              projectId,
              scriptId,
              script: flow.script,
              scriptPlan: flow.scriptPlan,
              storyboardTable: flow.storyboardTable,
              storyboard: flow.storyboard,
            });
          }
        }
        const compiled = pkg ? getCompiledPromptForStoryboard(pkg, item.id!, "image") : null;
        if (compiled) promptText = compiled;
      }

      // Image stub rebuild (parity with video IR) when prompt is thin
      try {
        const { isImagePromptStub, buildPromptIR } = await import("@/ruleEngine/compilers/promptIR");
        if (isImagePromptStub(promptText)) {
          const pkg2 = await loadEpisodePackage(u.db, projectId, scriptId);
          const shotMeta = pkg2?.shots?.find((s) => s.storyboardId === item.id);
          if (shotMeta) {
            const ir = buildPromptIR(
              {
                shotIndex: shotMeta.shotIndex,
                visualDescription: shotMeta.visualDescription ?? item.prompt,
                sceneName: shotMeta.sceneName,
                charCodes: shotMeta.charCodes,
                shotDesign: shotMeta.shotDesign as never,
                generation: { imagePrompt: promptText },
              } as never,
              {},
            );
            if (ir.imagePrompt) promptText = ir.imagePrompt;
          }
        }
      } catch {
        /* best-effort */
      }

      // Still-before-ref gate (parity with video identity gate)
      try {
        const pkgForGate = await loadEpisodePackage(u.db, projectId, scriptId);
        const shotMeta = pkgForGate?.shots?.find((s) => s.storyboardId === item.id);
        const { gate: identityGate, missingQueue } = await gateIdentityForShot({
          db: u.db,
          projectId,
          storyboardId: item.id!,
          shot: shotMeta,
          extraPrompt: promptText,
        });
        const hasCrefOrSref = /--(?:cref|sref)\b/i.test(promptText);
        if (!identityGate.ok && (hasCrefOrSref || (shotMeta?.charCodes?.length ?? 0) > 0)) {
          const feedback = await classifyGenerationFailure({
            modality: "image",
            shotId: String(item.id),
            error: `IDENTITY_IMAGE_GAP:${identityGate.gaps.map((g) => `${g.code}:${g.reason}`).join(",")}`,
            prompt: promptText,
          });
          let heal: unknown;
          try {
            const { runSelfHeal } = await import("@/ruleEngine/design/selfHealOrchestrator");
            heal = await runSelfHeal({
              projectId,
              scriptId,
              shotId: item.id!,
              errorText: "IDENTITY_IMAGE_GAP",
              jobKind: "image",
              round: 1,
              dryRun: false,
              db: u.db,
              identityGaps: identityGate.gaps,
            });
          } catch {
            /* best-effort prepare still queue */
          }
          const { mergeReasonMeta: mergeFail } = await import("@/ruleEngine/compilers/stillQuality");
          await u.db("o_storyboard").where("id", item.id).update({
            filePath: "",
            state: "生成失败",
            reason: mergeFail(item.reason, {
              message: `身份参考图缺失：${identityGate.gaps.map((g) => g.code).join(",")}`,
              feedback,
              identityGate,
              missingAssetImageQueue: missingQueue,
              heal,
              nextStep: "batch_still",
              reverseTrigger: identityGate.reverseTrigger ?? "img_cref_missing",
            }),
          });
          return;
        }
      } catch {
        /* gate best-effort — continue to generate if package missing */
      }

      const assetIdsEarly = assets2StoryboardRows
        .filter((r) => r.storyboardId === item.id && r.assetId)
        .map((r) => r.assetId!) as number[];
      const imgMode = resolveGenerationModeRules({
        modality: "image",
        mode: assetIdsEarly.length >= 2 ? "multiReference" : assetIdsEarly.length === 1 ? "singleImage" : "text",
        referenceCount: assetIdsEarly.length,
      });
      try {
        const loaded = await loadModePromptTemplate(getModelPromptRoot, {
          modality: "image",
          mode: imgMode.mode,
          referenceCount: assetIdsEarly.length,
        });
        if (loaded.template?.trim()) {
          promptText = `${loaded.template.trim()}\n\n${promptText}`;
        }
      } catch {
        /* template optional */
      }
      const { markHqOk, mergeReasonMeta } = await import("@/ruleEngine/compilers/stillQuality");
      const { hashLiteraryDesc } = await import("@/ruleEngine/qc/stillFirstFrameGate");
      const { composeStillPrompt, computeComposeHash, shouldDefaultFidelityCompose, buildStillPreviousIngress, literaryComposeHash } =
        await import("@/ruleEngine/compilers/composeStillPrompt");
      const { hydrateComposeStillContext } = await import("@/ruleEngine/compilers/hydrateComposeStillContext");
      const hq = qualityMode === "hq_update";
      const composeCtx = await hydrateComposeStillContext(u.db, {
        projectId,
        storyboardId: item.id!,
        scriptId,
        rawPrompt: promptText,
        qualityMode: hq ? "hq_update" : "draft",
        referenceUrlCount: (assetRecord[item.id!] ?? []).length,
        purpose: "generate",
      });
      composeCtx.videoRatio = projectSettingData?.videoRatio ?? composeCtx.videoRatio;
      composeCtx.artStyle = projectSettingData?.artStyle ?? composeCtx.artStyle;
      const ingress = buildStillPreviousIngress({
        reason: item.reason,
        storedPrompt: item.prompt,
        requestPrompt: promptText,
        currentHash: computeComposeHash(composeCtx),
        preferFidelity: shouldDefaultFidelityCompose(composeCtx),
        loadPrevious: true,
        currentClientId: String(item.id ?? ""),
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
        if (Array.isArray(gated) && gated.length) {
          composeCtx.gatedHealInject = gated.map((s) => String(s)).filter(Boolean);
        }
        const priorSeal = prevMeta?.primaryIntentSeal;
        if (priorSeal && typeof priorSeal === "object") {
          composeCtx.priorPrimaryIntentSeal =
            priorSeal as import("@/ruleEngine/compilers/primaryIntentSeal").PrimaryIntentCarrierSet;
        }
      } catch {
        /* optional */
      }
      // Batch has no per-item requestedMode — forceFull always wins to full
      const composed = composeStillPrompt(composeCtx, {
        mode: ingress.forceFull ? "full" : ingress.composeMode,
      });
      if (!composed.ok) {
        const { buildPrimaryBlock } = await import("@/ruleEngine/compilers/primaryBlock");
        const primary = buildPrimaryBlock(composed.primaryNextStep ?? "chat_repair", { stage: "prompt" });
        await u.db("o_storyboard").where("id", item.id).update({
          filePath: "",
          state: "生成失败",
          reason: mergeReasonMeta(item.reason, {
            message: composed.blockReason ?? composed.userMessage,
            nextStep: composed.primaryNextStep ?? primary.primaryNextStep,
            primaryNextStep: composed.primaryNextStep ?? primary.primaryNextStep,
            userMessage: composed.userMessage ?? primary.userMessage,
            ctaLabel: composed.ctaLabel ?? primary.ctaLabel,
            composeSources: composed.sources,
            code:
              composed.blockReason === "DEX-ASSET-CREF" || composed.missingLeadAsset
                ? "IMG-CREF"
                : composed.blockReason === "DEX-STILL-ONEBEAT"
                  ? "DEX-STILL-ONEBEAT"
                  : "QP-02",
          }),
        });
        return;
      }
      const { assertStillIdentityPreflight } = await import("@/ruleEngine/compilers/stillIdentityPreflight");
      const { parsePromptRefs } = await import("@/ruleEngine/compilers/vendorPromptAdapter");
      const batchRefs = parsePromptRefs(promptText || composed.prompt || "");
      const idGate = assertStillIdentityPreflight({
        characters: composeCtx.characters,
        description: composeCtx.visualDescription,
        dialogueSpeakers: composeCtx.dialogueSpeakers,
        promptCrefCodes: batchRefs.crefs,
        enforce: true,
      });
      if (!idGate.ok) {
        await u.db("o_storyboard").where("id", item.id).update({
          filePath: "",
          state: "生成失败",
          reason: mergeReasonMeta(item.reason, {
            message: idGate.userMessage,
            code: idGate.code,
            nextStep: idGate.primaryNextStep ?? "batch_still",
            primaryNextStep: idGate.primaryNextStep ?? "batch_still",
            userMessage: idGate.userMessage,
            ctaLabel: idGate.ctaLabel,
            missingChars: idGate.missing,
            suggestBatchStill: idGate.suggestBatchStill,
          }),
        });
        return;
      }
      promptText = composed.prompt;
      const { runStillPromptPipeline } = await import("@/ruleEngine/compilers/stillPromptPipeline");
      const { buildIdentitySlots } = await import("@/ruleEngine/kernels/promptKernel");
      const { extractDesignFields } = await import("@/ruleEngine/design/designFieldRegistry");
      const imagedCodes = (composeCtx.characters ?? [])
        .filter((c) => c.kind !== "scene" && c.hasImage && c.code)
        .map((c) => String(c.code).toUpperCase());
      const identitySlots = buildIdentitySlots({
        charCodes: imagedCodes,
        sceneCode:
          composed.excludeScene && !composed.keepSoftEnvRef ? null : (composeCtx.sceneCode ?? null),
      });
      const designFields = extractDesignFields({
        modality: "image",
        charCodes: imagedCodes,
        storyboard: {
          duration: item.duration,
          fxPrompt: (item as { fxPrompt?: string }).fxPrompt ?? (item as { visualEffect?: string }).visualEffect,
          audioPrompt: (item as { audioPrompt?: string }).audioPrompt,
          videoDesc: item.videoDesc,
          track: (item as { track?: string }).track,
        },
      });
      const { buildLiteraryFidelityChecklist } = await import("@/ruleEngine/compilers/literaryFidelityChecklist");
      const { runStillVisualFidelityLoop } = await import("@/ruleEngine/qc/stillVisualFidelityLoop");
      const charNames = (composeCtx.characters ?? []).map((c) => c.name).filter(Boolean) as string[];
      // Literary SSOT: never use motion-template videoDesc when visualDescription empty
      const literaryDesc =
        String(composeCtx.visualDescription ?? "").trim() || String(composed.visualBody ?? "").trim();
      const { resolveStillBgPolicy } = await import("@/ruleEngine/compilers/stillBgPolicy");
      const shotSizeHint = (item as { shotSize?: string }).shotSize ?? composeCtx.shotSize;
      const sceneEstablishingHint =
        Boolean((item as { sceneEstablishing?: boolean }).sceneEstablishing) ||
        /建立镜头|establishing|空镜|全景建立/i.test(literaryDesc);
      const bgPol = resolveStillBgPolicy({
        description: literaryDesc,
        characterNames: charNames,
        shotSize: shotSizeHint,
        sceneEstablishingHint,
      });
      const checklist = buildLiteraryFidelityChecklist({
        description: literaryDesc,
        characterNames: charNames,
        requireDualIdentity: charNames.length >= 2,
        bgPolicy: bgPol.policy,
        shotSize: shotSizeHint,
      });
      let pipeline = runStillPromptPipeline({
        composed,
        description: literaryDesc,
        characterNames: charNames,
        identitySlots,
        fields: designFields,
        aspectRatioFallback: projectSettingData?.videoRatio as string | undefined,
        modality: "image",
        shotSize: (item as { shotSize?: string }).shotSize ?? composeCtx.shotSize,
        checklist,
      });
      const touched = touchPromptForVendor(composed.prompt, projectSettingData?.videoRatio as string | undefined);
      const policy = precheckContentPolicy(pipeline.egressPrompt);
      const assetIds = assets2StoryboardRows
        .filter((r) => r.storyboardId === item.id && r.assetId)
        .map((r) => r.assetId!) as number[];
      const repeloadObj = {
        prompt: pipeline.egressPrompt,
        size: projectSettingData?.imageQuality as "1K" | "2K" | "4K",
        aspectRatio: (touched.aspectRatio ?? projectSettingData?.videoRatio) as `${number}:${number}`,
      };
      try {
        const { resolveShotIdentityBinding } = await import("@/ruleEngine/compilers/resolveShotIdentityBinding");
        const { buildReferenceListForStoryboard } = await import("@/ruleEngine/compilers/referenceListBuilder");
        let actuatorEcho: {
          actuatorId?: string;
          actuatorDegraded?: boolean;
          propPlateGrade?: string;
          workflowHash?: string;
        } = {};
        // Hoist pipe state so lit reassert / re-vendor share Core homology
        let composedForPipe: typeof composed = composed;
        type BatchGenOnce = (args: {
          strengthen: Record<string, unknown>;
          mode: string;
          fixHints?: string[];
          failedImageBase64?: string;
          layoutPreserve?: boolean;
          forbidLayoutPreserve?: boolean;
          forceFullCompose?: boolean;
          round?: number;
        }) => Promise<{
          url: string;
          savePath: string;
          promptUsed: string;
          imageBase64: string;
          allowHqOkL0?: boolean;
          fidelityMissing?: unknown;
          strategy: string;
        }>;
        let batchGenerateOnce: BatchGenOnce | null = null;
        const batchGenerateOnceInner: BatchGenOnce = async ({
            strengthen,
            mode,
            fixHints,
            failedImageBase64,
            layoutPreserve,
            forbidLayoutPreserve: roundForbidLayoutPreserve,
          }) => {
            const useEdit = mode === "edit";
            if (!useEdit && Object.keys(strengthen).length) {
              composeCtx.strengthen = { ...(composeCtx.strengthen ?? {}), ...strengthen };
            }
            const recomposed = composeStillPrompt(composeCtx, {
              mode: useEdit || Object.keys(strengthen).length ? "fidelity" : "full",
            });
            composedForPipe = recomposed.ok ? recomposed : composed;
            const bind = resolveShotIdentityBinding({
              description: literaryDesc,
              characters: (composeCtx.characters ?? []).filter((c) => c.kind !== "scene"),
              assetCodes: imagedCodes,
            });
            const reboundSlots = buildIdentitySlots({
              charCodes: bind.orderedCodes.length ? bind.orderedCodes : imagedCodes,
              sceneCode:
                composedForPipe.excludeScene && !composedForPipe.keepSoftEnvRef
                  ? null
                  : (composeCtx.sceneCode ?? null),
            });
            pipeline = runStillPromptPipeline({
              composed: composedForPipe,
              description: literaryDesc,
              characterNames: charNames,
              identitySlots: reboundSlots,
              fields: designFields,
              aspectRatioFallback: projectSettingData?.videoRatio as string | undefined,
              modality: "image",
              shotSize: (item as { shotSize?: string }).shotSize ?? composeCtx.shotSize,
              checklist,
            });
            let vendorPrompt = pipeline.egressPrompt;
            try {
              const {
                assertSingleShotClosedInputs,
                stripForeignBeatAtomsFromEgress,
                isClosedComposeTrue,
              } = await import("@/ruleEngine/compilers/singleShotClosedCompose");
              const closed = assertSingleShotClosedInputs({
                storyboardId: item.id,
                boundShotIndex: (composeCtx as { boundShotIndex?: number }).boundShotIndex,
                bindOk: (composeCtx as { bindOk?: boolean }).bindOk !== false,
                bindCode: (composeCtx as { bindCode?: string }).bindCode,
                visualDescription: literaryDesc,
                compiledImagePrompt: composeCtx.compiledImagePrompt,
                purpose: "generate",
                continuityInject: (composeCtx as { continuityInject?: string }).continuityInject,
                shotSize: composeCtx.shotSize,
                foreground: composeCtx.foreground,
              });
              (composedForPipe as { closedCompose?: boolean }).closedCompose = isClosedComposeTrue(
                closed.closedCompose,
              );
              (composedForPipe as { framingMode?: string }).framingMode = closed.framingMode;
              const scrubbed = stripForeignBeatAtomsFromEgress(vendorPrompt, literaryDesc);
              vendorPrompt = scrubbed.text;
              if (scrubbed.stripped.length) {
                (composedForPipe as { sources?: string[] }).sources = [
                  ...((composedForPipe as { sources?: string[] }).sources ?? []),
                  ...scrubbed.stripped.map((s) => `closed.strip:${s}`),
                ];
              }
            } catch {
              /* optional closed parity */
            }
            const pol = precheckContentPolicy(vendorPrompt);
            if (pol.hasSensitiveTerms) vendorPrompt = pol.softenedPrompt;
            const { resolvePropSoftCodes } = await import("@/ruleEngine/compilers/eventPlateReadiness");
            const propCodes = resolvePropSoftCodes({
              contract: composedForPipe.generationContract,
              visualDescription: literaryDesc,
            });
            const builtRefs = await buildReferenceListForStoryboard(
              u.db,
              projectId,
              item.id!,
              vendorPrompt,
              bind.orderedCodes.length ? bind.orderedCodes : imagedCodes,
              bind.orderedCodes.length ? bind.orderedCodes : imagedCodes,
              {
                excludeScene: Boolean(composedForPipe.excludeScene),
                softEnvRef: Boolean(composedForPipe.keepSoftEnvRef),
                propSoftCodes: propCodes,
                secondaryCharacterBudget: (() => {
                  try {
                    const dip = (
                      composedForPipe.generationContract as { designIntentProfile?: { secondaryBudget?: string } }
                    )?.designIntentProfile;
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
              },
            );
            let referenceList = builtRefs.referenceList;
            if (builtRefs.turnaroundCrefUsed && !/四视图仅借身份|单镜头成片/.test(vendorPrompt.slice(-80))) {
              try {
                const {
                  STILL_SHEET_AS_IDENTITY_ONLY_EDIT_ZH,
                  STILL_SINGLE_FRAME_LOCK_EDIT_ZH,
                } = require("@/ruleEngine/compilers/stillFirstFrameLiterarySsot") as typeof import("@/ruleEngine/compilers/stillFirstFrameLiterarySsot");
                vendorPrompt = `${String(vendorPrompt).trim()}。${STILL_SHEET_AS_IDENTITY_ONLY_EDIT_ZH}${STILL_SINGLE_FRAME_LOCK_EDIT_ZH}`;
              } catch {
                /* optional */
              }
            }
            if (!referenceList.length && !composedForPipe.excludeScene) {
              referenceList = await buildReferenceListFromAssetIds(u.db, assetIds);
            }
            // Path parity with canvas: event prop plate synth + hard gate + face-bias
            let synthesizedProp = false;
            let propPresent = Boolean(builtRefs.propSoftKept);
            let eventObj = false;
            try {
              const {
                objectiveNeedsPropPlate,
                cropIdentityPlateToFaceBias,
                synthesizePropSoftPlate,
                resolvePropPlateLabel,
                decideEventPlateGate,
              } = await import("@/ruleEngine/compilers/eventPlateReadiness");
              eventObj = objectiveNeedsPropPlate(
                (composedForPipe.generationContract as { objectiveClass?: string } | undefined)?.objectiveClass,
              );
              let softPresent = Boolean(builtRefs.softEnvKept);
              let batchRefsContract: import("@/ruleEngine/compilers/stillRefsContract").StillRefsContract | null =
                null;
              try {
                const { resolveStillRefsContract } = await import("@/ruleEngine/compilers/stillRefsContract");
                const sealCropB0 = (composedForPipe.generationContract as {
                  primaryIntentSeal?: { poseOccupancy?: string; primaryObjective?: string };
                } | undefined)?.primaryIntentSeal;
                batchRefsContract = resolveStillRefsContract({
                  primaryObjective: sealCropB0?.primaryObjective,
                  objectiveClass: composedForPipe.generationContract?.objectiveClass,
                  poseOccupancy: sealCropB0?.poseOccupancy,
                  visualDescription: literaryDesc,
                });
                (composedForPipe as { stillRefsContract?: typeof batchRefsContract }).stillRefsContract =
                  batchRefsContract;
              } catch {
                batchRefsContract = null;
              }
              if (eventObj && referenceList[0]?.base64) {
                const { resolveIdentityCropTopRatio } = await import(
                  "@/ruleEngine/compilers/eventPlateReadiness"
                );
                const sealCropB = (composedForPipe.generationContract as {
                  primaryIntentSeal?: { poseOccupancy?: string; primaryObjective?: string };
                } | undefined)?.primaryIntentSeal;
                const preferActionBody =
                  batchRefsContract?.identityPreferActionBody === true ||
                  sealCropB?.poseOccupancy === "bend_pickup" ||
                  /弯腰|捡起|捡拾|俯身/.test(String(literaryDesc ?? ""));
                const topRatio = resolveIdentityCropTopRatio({
                  objectiveClass: composedForPipe.generationContract?.objectiveClass,
                  keepSoftEnvRef: composedForPipe.keepSoftEnvRef && !batchRefsContract?.dropFullSoftEnv,
                  softEnvContinuity: softPresent && !batchRefsContract?.dropFullSoftEnv ? "must" : "none",
                  poseOccupancy: sealCropB?.poseOccupancy,
                  primaryObjective: sealCropB?.primaryObjective,
                });
                const face = await cropIdentityPlateToFaceBias(referenceList[0].base64, {
                  topRatio,
                  preferActionBody,
                });
                if (face.cropped && face.base64) {
                  referenceList[0] = { type: "image" as const, base64: face.base64 };
                }
                const replaceStandB =
                  batchRefsContract?.identityReplaceStandingSheet === true ||
                  preferActionBody ||
                  sealCropB?.poseOccupancy === "bend_pickup";
                if (replaceStandB && referenceList[0]?.base64) {
                  try {
                    const { composeBendIdentityPlate } = await import(
                      "@/ruleEngine/compilers/eventPlateReadiness"
                    );
                    const bendId = await composeBendIdentityPlate({
                      faceSourceBase64: referenceList[0].base64,
                    });
                    if (bendId.usedFace && bendId.base64) {
                      referenceList[0] = { type: "image" as const, base64: bendId.base64 };
                      (composedForPipe as { bendIdentityReplaced?: boolean }).bendIdentityReplaced = true;
                      (composedForPipe as { bendIdentityReason?: string }).bendIdentityReason =
                        bendId.reason;
                    }
                  } catch {
                    /* keep */
                  }
                }
              }
              const forceOccProp = batchRefsContract?.forcePropOccupancySynth === true;
              if (eventObj && (!propPresent || forceOccProp)) {
                const label = resolvePropPlateLabel({
                  contract: composedForPipe.generationContract ?? null,
                  visualDescription: literaryDesc,
                });
                let skipSynth = false;
                const occForPlate =
                  (composedForPipe.generationContract as {
                    primaryIntentSeal?: { poseOccupancy?: string };
                    designIntentProfile?: { poseOccupancy?: string };
                  } | undefined)?.primaryIntentSeal?.poseOccupancy ??
                  (composedForPipe.generationContract as {
                    designIntentProfile?: { poseOccupancy?: string };
                  } | undefined)?.designIntentProfile?.poseOccupancy ??
                  null;
                try {
                  const { resolvePropPlateLadder } = await import("@/ruleEngine/compilers/propPlateLadder");
                  const ladder = await resolvePropPlateLadder({
                    db: u.db,
                    projectId,
                    storyboardId: item.id,
                    propClassId: label.propClassId,
                    propCanonical: label.canonical,
                    glyphText: label.glyphText,
                    poseOccupancy: occForPlate,
                    plateMode: label.plateMode,
                  });
                  if (ladder.skipSynth) {
                    // Honesty: only skip when plate bytes hang; else force synth
                    // Asset-first: warehouse paper kept under bend
                    let hung = false;
                    if (ladder.assetId) {
                      try {
                        const asset = await u.db("o_assets").where({ id: ladder.assetId }).first();
                        const imageId = (asset as { imageId?: number } | undefined)?.imageId;
                        if (imageId) {
                          const img = await u.db("o_image").where({ id: imageId }).first();
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
                              hung = true;
                              propPresent = true;
                              synthesizedProp = false;
                            }
                          }
                        }
                      } catch {
                        hung = false;
                      }
                    }
                    skipSynth = hung;
                    if (!hung) propPresent = false;
                  }
                } catch {
                  /* optional */
                }
                if (!skipSynth) {
                  const synthOcc =
                    batchRefsContract?.propPoseOccupancy ||
                    (forceOccProp ? "bend_pickup" : "") ||
                    (composedForPipe.generationContract as { primaryIntentSeal?: { poseOccupancy?: string } } | undefined)
                      ?.primaryIntentSeal?.poseOccupancy ||
                    (composedForPipe.generationContract as { designIntentProfile?: { poseOccupancy?: string } } | undefined)
                      ?.designIntentProfile?.poseOccupancy ||
                    null;
                  let synth = await synthesizePropSoftPlate({
                    propClassId: label.propClassId,
                    canonical: label.canonical,
                    glyphText: label.glyphText,
                    softPlateHint: label.softPlateHint,
                    plateMode: synthOcc === "bend_pickup" ? "object_inset" : label.plateMode,
                    poseOccupancy: synthOcc,
                  });
                  if (synthOcc === "bend_pickup") {
                    try {
                      const { composeBendPropSoftFromScene } = await import(
                        "@/ruleEngine/compilers/eventPlateReadiness"
                      );
                      const softB64 =
                        softPresent && referenceList.length >= 2
                          ? referenceList[referenceList.length - 1]?.base64
                          : undefined;
                      const fromScene = await composeBendPropSoftFromScene({ sceneBase64: softB64 });
                      if (fromScene?.base64) {
                        synth = {
                          base64: fromScene.base64,
                          kind: fromScene.kind,
                          label: label.canonical || "纸",
                          plateMode: "object_inset",
                        };
                        (composedForPipe as { bendPropFromScene?: boolean }).bendPropFromScene = true;
                      }
                    } catch {
                      /* keep SVG */
                    }
                  }
                  if (synth.base64) {
                    const softTail = softPresent && referenceList.length >= 2 ? referenceList.splice(-1, 1) : [];
                    // Always replace existing propSoft — never splice second mid-slot
                    if (propPresent && referenceList.length >= 2) {
                      referenceList[1] = { type: "image", base64: synth.base64 };
                    } else if (referenceList.length >= 1) {
                      referenceList.splice(1, 0, { type: "image", base64: synth.base64 });
                    } else {
                      referenceList.push({ type: "image", base64: synth.base64 });
                    }
                    referenceList.push(...softTail);
                    propPresent = true;
                    synthesizedProp = true;
                    if (forceOccProp) {
                      (composedForPipe as { litPlatesSwapped?: boolean }).litPlatesSwapped = true;
                    }
                    try {
                      const { persistSynthesizedPropPlate } = await import(
                        "@/ruleEngine/compilers/persistPropSoftPlate"
                      );
                      await persistSynthesizedPropPlate({
                        db: u.db,
                        writeFile: (p, d) => u.oss.writeFile(p, d),
                        projectId,
                        storyboardId: item.id,
                        base64: synth.base64,
                        propClassId: label.propClassId,
                        canonical: label.canonical,
                        glyphText: label.glyphText,
                        plateMode: label.plateMode ?? synth.plateMode,
                        poseOccupancy: occForPlate,
                      });
                    } catch {
                      /* persist best-effort */
                    }
                    const formBits = (composedForPipe.generationContract?.mustShowFacts ?? [])
                      .filter((f: { id: string }) => f.id === "prop_form" || f.id === "prop_glyph" || f.id === "prop_pose")
                      .map((f: { text: string }) => f.text)
                      .slice(0, 3);
                    const occ =
                      (composedForPipe.generationContract as { primaryIntentSeal?: { poseOccupancy?: string }; designIntentProfile?: { poseOccupancy?: string } } | undefined)
                        ?.primaryIntentSeal?.poseOccupancy ??
                      (composedForPipe.generationContract as { designIntentProfile?: { poseOccupancy?: string } } | undefined)
                        ?.designIntentProfile?.poseOccupancy ??
                      "";
                    const lit = String(composedForPipe.visualBody ?? composedForPipe.prompt ?? "");
                    const propLead =
                      occ === "bend_pickup" || /弯腰|捡起|捡拾|俯身/.test(lit)
                        ? `${label.canonical}入画于主手触地捡拾（薄纸片软板，非书、非颊触、非胸前展示卡）`
                        : `${label.canonical}入画于触点（薄纸片软板，非书、非手持卡片）`;
                    vendorPrompt = `${formBits.join("。")}。${propLead}。${vendorPrompt}`;
                  }
                }
              }
              // Fragment / atmosphere hang without SCENE (batch ≡ single generate)
              try {
                const { deriveDesignIntentProfile, profileNeedsFragmentPlate } = await import(
                  "@/ruleEngine/compilers/designIntentProfile"
                );
                const { synthesizePropSoftPlate, synthesizeAtmospherePlate } = await import(
                  "@/ruleEngine/compilers/eventPlateReadiness"
                );
                const dipB = deriveDesignIntentProfile({
                  visualDescription: composedForPipe.visualBody ?? composedForPipe.prompt,
                  imagePrompt: (composedForPipe as { compiledImagePrompt?: string }).compiledImagePrompt,
                });
                if (
                  profileNeedsFragmentPlate(dipB) &&
                  referenceList.length >= 1 &&
                  batchRefsContract?.dropFullSoftEnv === true
                ) {
                  const frag = await synthesizePropSoftPlate({
                    propClassId: "generic",
                    canonical: "次角碎片裙摆",
                    softPlateHint: "cloth_fold",
                    plateMode: "fragment_sil",
                  });
                  if (frag.base64) {
                    referenceList.push({ type: "image" as const, base64: frag.base64 });
                    (composedForPipe as { fragmentPlateHung?: boolean }).fragmentPlateHung = true;
                  }
                }
                const atm = dipB.atmosphere || /烛火|烛光|月光|暖光|冷光|夜色|灯火/.exec(String(composedForPipe.visualBody ?? ""))?.[0];
                // Scene-first: only drop when contract says so
                const dropLatchB = batchRefsContract?.dropFullSoftEnv === true;
                if (dropLatchB) {
                  (composedForPipe as { droppedSoftEnv?: boolean }).droppedSoftEnv = true;
                  (composedForPipe as { vendorDroppedSoftEnv?: boolean }).vendorDroppedSoftEnv = true;
                  (composedForPipe as { softEnvMissingHonest?: boolean }).softEnvMissingHonest = false;
                  composedForPipe.keepSoftEnvRef = false;
                  (composedForPipe as { softEnvContinuity?: string }).softEnvContinuity = "none";
                } else {
                  // Skirt ZH enhancement when keeping SCENE
                  if (/裙摆|衣角|碎片/.test(String(composedForPipe.visualBody ?? "")) && !/裙摆|衣角/.test(vendorPrompt)) {
                    vendorPrompt = `背景浅景深，裙摆/衣角虚化可辨（加强项）。${vendorPrompt}`;
                  }
                  if (!/浅景深|主场景|禁止灰棚/.test(vendorPrompt)) {
                    vendorPrompt = `背景：主场景浅景深虚化，禁止灰棚白棚。${vendorPrompt}`;
                  }
                }
                if (atm && !softPresent && referenceList.length >= 1) {
                  if (dropLatchB) {
                    (composedForPipe as { atmospherePlateHung?: boolean }).atmospherePlateHung = true;
                    (composedForPipe as { atmosphereZhOnly?: boolean }).atmosphereZhOnly = true;
                    vendorPrompt = `保留${atm}氛围可辨，禁止灰棚白棚。${vendorPrompt}`;
                  } else {
                    const atmPlate = await synthesizeAtmospherePlate({ atmosphere: String(atm) });
                    if (atmPlate?.base64) {
                      referenceList.push({ type: "image" as const, base64: atmPlate.base64 });
                      softPresent = true;
                      (composedForPipe as { atmospherePlateHung?: boolean }).atmospherePlateHung = true;
                      (composedForPipe as { keepSoftEnvRef?: boolean }).keepSoftEnvRef = true;
                      vendorPrompt = `保留${atm}氛围可辨，禁止灰棚白棚。${vendorPrompt}`;
                    }
                  }
                }
              } catch {
                /* optional */
              }
              const gate = decideEventPlateGate({
                contract: composedForPipe.generationContract ?? null,
                keepSoftEnvRef: composedForPipe.keepSoftEnvRef,
                propPlatePresent: propPresent,
                softEnvPlatePresent: softPresent,
                allowSynthesizeProp: true,
                synthesizedPropApplied: synthesizedProp || propPresent,
                synthAttempted: eventObj,
              });
              if (!gate.allowVendor) {
                throw Object.assign(new Error(gate.userMessage || "DEX-PROP-PLATE-MISSING"), {
                  code: gate.code || "DEX-PROP-PLATE-MISSING",
                  primaryNextStep: gate.primaryNextStep || "batch_still",
                  userMessage: gate.userMessage,
                  ctaLabel: gate.ctaLabel,
                  missingSlots: gate.missingSlots,
                });
              }
              if (gate.softEnvMissing && gate.userMessage) {
                vendorPrompt = `${gate.userMessage}。禁止灰棚/白棚空白背景。${vendorPrompt}`;
              }
              // Continuity-aware refs + 图N binding
              const {
                applyContinuityAwareRefBudget,
                buildEventRefOrdinalBinding,
              } = await import("@/ruleEngine/compilers/eventPlateReadiness");
              // Homology with Core: infer roles — 2-slot identity+softEnv must NOT tag index1 as propSoft
              const { inferEventRefRoles } = await import("@/ruleEngine/compilers/eventPlateReadiness");
              const inferredRoles = inferEventRefRoles({
                count: referenceList.length,
                propPresent,
                softEnvPresent: softPresent,
                keepSoftEnvRef: Boolean(composedForPipe.keepSoftEnvRef),
                propRequired: eventObj,
              });
              const tagged = referenceList.map((r, i) => ({
                type: "image" as const,
                base64: r.base64,
                role: (inferredRoles[i] ?? "identity") as "identity" | "propSoft" | "softEnv",
              }));
              const continuity =
                (composedForPipe as { softEnvContinuity?: "must" | "optional" | "none" }).softEnvContinuity ??
                (composedForPipe.keepSoftEnvRef ? "must" : "none");
              const dropLatchBudget = batchRefsContract?.dropFullSoftEnv === true;
              const chosen = await applyContinuityAwareRefBudget({
                refs: tagged,
                propRequired: eventObj,
                maxSlots: 3,
                softEnvContinuity: dropLatchBudget ? "none" : continuity,
                allowPixelBake: false,
                forceThreeSlotProp:
                  !dropLatchBudget &&
                  continuity === "must" &&
                  (composedForPipe.generationContract?.objectiveClass === "action_primary" ||
                    batchRefsContract?.poseOccupancy === "bend_pickup"),
              });
              if (chosen.droppedSoftEnv && continuity === "must" && !dropLatchBudget) {
                vendorPrompt = `软环境为连贯性必须但槽位不足；禁止灰棚白棚。${vendorPrompt}`;
              }
              referenceList = chosen.refs.map((r) => ({ type: "image" as const, base64: r.base64 }));
              (composedForPipe as { refsRoles?: string[] }).refsRoles = chosen.roles;
              const propPresentAfter = chosen.roles.includes("propSoft");
              propPresent = propPresentAfter;
              (composedForPipe as { propPlateMissing?: boolean }).propPlateMissing =
                eventObj && !propPresentAfter;
              if (dropLatchBudget) {
                const roles = ((composedForPipe as { refsRoles?: string[] }).refsRoles ?? chosen.roles ?? []).slice();
                const nextRefs: typeof referenceList = [];
                const nextRoles: string[] = [];
                for (let i = 0; i < referenceList.length; i++) {
                  const role = roles[i] || "identity";
                  if (role === "softEnv") {
                    (composedForPipe as { droppedSoftEnv?: boolean }).droppedSoftEnv = true;
                    continue;
                  }
                  nextRefs.push(referenceList[i]!);
                  nextRoles.push(String(role));
                }
                referenceList = nextRefs;
                (composedForPipe as { refsRoles?: string[] }).refsRoles = nextRoles;
                softPresent = false;
                composedForPipe.keepSoftEnvRef = false;
                (composedForPipe as { softEnvContinuity?: string }).softEnvContinuity = "none";
                (composedForPipe as { droppedSoftEnv?: boolean }).droppedSoftEnv = true;
                (composedForPipe as { vendorDroppedSoftEnv?: boolean }).vendorDroppedSoftEnv = true;
                (composedForPipe as { softEnvMissingHonest?: boolean }).softEnvMissingHonest = false;
              } else {
                softPresent = chosen.roles.includes("softEnv") || chosen.softEnvBakedIntoIdentity;
                (composedForPipe as { droppedSoftEnv?: boolean }).droppedSoftEnv = chosen.droppedSoftEnv;
                (composedForPipe as { vendorDroppedSoftEnv?: boolean }).vendorDroppedSoftEnv = Boolean(
                  chosen.droppedSoftEnv,
                );
                if (softPresent) {
                  (composedForPipe as { softEnvMissingHonest?: boolean }).softEnvMissingHonest = false;
                  // Mild DOF blur on SCENE softEnv
                  try {
                    const roles = chosen.roles ?? [];
                    const softIdx = roles.lastIndexOf("softEnv");
                    if (softIdx >= 0 && referenceList[softIdx]?.base64) {
                      const { softenSoftEnvPlateForAtmosphere } = await import(
                        "@/ruleEngine/compilers/eventPlateReadiness"
                      );
                      const blurred = await softenSoftEnvPlateForAtmosphere(referenceList[softIdx]!.base64, {
                        softEnvContinuity:
                          (composedForPipe as { softEnvContinuity?: string }).softEnvContinuity ?? "must",
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
              const thin = (composedForPipe.generationContract?.mustShowFacts ?? []).some(
                (f: { id: string }) => f.id === "prop_form",
              );
              const sealBindB = (composedForPipe.generationContract as {
                primaryIntentSeal?: { poseOccupancy?: string };
                designIntentProfile?: { plateMode?: string };
              } | undefined)?.primaryIntentSeal;
              const bindZh = buildEventRefOrdinalBinding({
                roles: ((composedForPipe as { refsRoles?: string[] }).refsRoles ?? chosen.roles) as Array<
                  "identity" | "propSoft" | "softEnv"
                >,
                propRequired: eventObj,
                thinSheets: thin,
                softEnvBakedIntoIdentity: dropLatchBudget ? false : chosen.softEnvBakedIntoIdentity,
                poseOccupancy: sealBindB?.poseOccupancy,
                plateMode: (composedForPipe.generationContract as { designIntentProfile?: { plateMode?: string } } | undefined)
                  ?.designIntentProfile?.plateMode,
                fragmentPlateHung: Boolean((composedForPipe as { fragmentPlateHung?: boolean }).fragmentPlateHung),
              });
              if (bindZh && !/参考绑定：/.test(vendorPrompt)) {
                vendorPrompt = `${String(vendorPrompt).trim()}。${bindZh}`;
              }
              if (
                sealBindB?.poseOccupancy === "bend_pickup" ||
                /弯腰|捡起|捡拾|俯身/.test(String(composedForPipe.visualBody ?? ""))
              ) {
                if (!/站姿弯腰|禁止蹲跪/.test(vendorPrompt.slice(0, 80))) {
                  vendorPrompt = `占位：站姿弯腰捡拾，躯干前倾；禁止蹲跪盘坐替代弯腰。${String(vendorPrompt).trim()}`;
                }
              }
              {
                const { stripOrphanSceneSref } = await import("@/ruleEngine/compilers/eventPlateReadiness");
                const rolesNow = ((composedForPipe as { refsRoles?: string[] }).refsRoles ?? []) as string[];
                vendorPrompt = stripOrphanSceneSref(vendorPrompt, {
                  softEnvIndependentSlot: rolesNow.includes("softEnv") && !chosen.softEnvBakedIntoIdentity,
                  softEnvBakedIntoIdentity: dropLatchBudget ? false : chosen.softEnvBakedIntoIdentity,
                });
              }
              try {
                const { lintStillPromptBody } = await import("@/ruleEngine/compilers/stillPromptLint");
                vendorPrompt = lintStillPromptBody({
                  prompt: vendorPrompt,
                  visualDescription: literaryDesc,
                }).prompt;
              } catch {
                /* optional */
              }
            } catch (plateErr: unknown) {
              if (plateErr && typeof plateErr === "object" && "code" in plateErr) throw plateErr;
              /* optional plate module */
            }
            let editStrategy: string | undefined;
            let layoutTemplateId: string | undefined;
            let layoutSkipped: string | undefined;
            if (useEdit) {
              const { prepareStillImageEdit } = await import("@/ruleEngine/qc/stillImageEdit");
              const { buildLiteraryEditPrompt } = await import("@/ruleEngine/compilers/stillEditLiteraryPrompt");
              const { shouldForbidLayoutPreserve } = await import("@/ruleEngine/compilers/stillRefSlotContract");
              const wantPreserve = Boolean(layoutPreserve) || Boolean(composedForPipe.excludeScene);
              const forbidPreserve =
                Boolean(roundForbidLayoutPreserve) ||
                shouldForbidLayoutPreserve({ fixHints: fixHints ?? [] });
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
                model: String(projectSettingData?.imageModel ?? ""),
                vendorHint: String(projectSettingData?.imageModel ?? "").split(":")[0],
                layoutPreserve: wantPreserve && !forbidPreserve,
                strategy: wantPreserve && !forbidPreserve ? "layout_preserve" : undefined,
                castNames: bind.orderedNames.length ? bind.orderedNames : charNames,
                highName: bind.highRole?.name ?? bind.orderedNames[0],
                lowName: bind.lowRole?.name ?? bind.orderedNames[1],
                forbidLayoutPreserve: forbidPreserve,
                shotSize: (item as { shotSize?: string }).shotSize ?? composeCtx.shotSize,
                visualDescription: literaryDesc,
                seatingHard: bgPol.pack.hasSeatingOrKneel,
              });
              vendorPrompt = prep.promptUsed;
              referenceList = prep.referenceList.map((r) => ({ type: "image" as const, base64: r.base64 }));
              editStrategy = prep.strategy;
            } else {
              // StageA layout via Composition Spec (parity with generateFlowImageCore)
              const { selectLayoutFamily } = await import("@/ruleEngine/qc/stillCompositionSpec");
              const { classifyStillIntent } = await import("@/ruleEngine/compilers/stillIntentPolicy");
              const intent = classifyStillIntent({
                visualDescription: literaryDesc,
                shotSize: composeCtx.shotSize,
                hasSeatingOrKneel: bgPol.pack.hasSeatingOrKneel,
                characterCount: charNames.length,
                characterNames: charNames,
                episodeVisualDescriptions: composeCtx.episodeVisualDescriptions,
              });
              const recipeMode = intent.recipeMode;
              const layoutFamily = selectLayoutFamily({
                visualDescription: literaryDesc,
                shotSize: composeCtx.shotSize,
                characterCount: charNames.length,
                hasSeatingOrKneel: bgPol.pack.hasSeatingOrKneel || intent.seating,
                recipeMode,
                intentSeating: intent.seating,
                intentRecipeMode: intent.recipeMode,
                characterNames: charNames,
              });
              if (layoutFamily.family.twoStage && layoutFamily.family.templateId) {
              const { resolveLayoutForShot, applyLayoutAnchorToBurn } = await import(
                "@/ruleEngine/qc/stillLayoutControl"
              );
              const { expandStageAPrompt } = await import("@/ruleEngine/compilers/stillRefSlotContract");
              const layout = await resolveLayoutForShot({
                pack: bgPol.pack,
                characterCount: charNames.length,
                qualityMode: hq ? "hq_update" : "draft",
                familyTemplateId: layoutFamily.family.templateId,
                forceTwoStage: true,
              });
              layoutTemplateId = layout.template?.id;
              layoutSkipped = layout.layoutSkipped;
              if (layout.twoStage && layout.layoutBase64 && layout.template) {
                const stageAPrompt = expandStageAPrompt(
                  layout.template.stageAPrompt,
                  Math.max(layoutFamily.family.minCast ?? 1, charNames.length),
                );
                try {
                  const imageClsA = await u.Ai.Image(
                    projectSettingData?.imageModel as `${string}:${string}`,
                  ).run(
                    {
                      prompt: stageAPrompt,
                      referenceList: [{ type: "image" as const, base64: layout.layoutBase64 }],
                      size: repeloadObj.size,
                      aspectRatio: repeloadObj.aspectRatio,
                    },
                    {
                      taskClass: "生成分镜图片",
                      describe: `batch still StageA family=${layoutFamily.familyId} layout=${layout.template.id}`,
                      relatedObjects: JSON.stringify({
                        stage: "layout",
                        templateId: layout.template.id,
                        layoutFamilyId: layoutFamily.familyId,
                      }),
                      projectId,
                    },
                  );
                  const tmpPath = `/${projectId}/assets/${scriptId}/${u.uuid()}-layout.jpg`;
                  await imageClsA.save(tmpPath);
                  let stageAB64 = "";
                  try {
                    stageAB64 = await u.oss.getImageBase64(tmpPath.replace(/^\//, ""));
                  } catch {
                    stageAB64 = "";
                  }
                  if (stageAB64) {
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
                  } else {
                    layoutSkipped = layoutSkipped ?? "no_file";
                  }
                } catch {
                  layoutSkipped = layoutSkipped ?? "no_file";
                }
              }
              } else {
                layoutSkipped = "family_skip";
              }
            }
            void layoutTemplateId;
            void layoutSkipped;
            // Bend seal: strip neighbor oral-CU (shot2 特写咬唇) before vendor
            try {
              const sealStripB = (composedForPipe.generationContract as {
                primaryIntentSeal?: import("@/ruleEngine/compilers/primaryIntentSeal").PrimaryIntentCarrierSet;
              } | undefined)?.primaryIntentSeal ?? null;
              const { stripHostileCheekLegislation } = await import("@/ruleEngine/compilers/stillSealGate");
              const stripped = stripHostileCheekLegislation(vendorPrompt, sealStripB, {
                currentVisualDescription: literaryDesc,
              });
              vendorPrompt = stripped.prompt;
            } catch {
              /* optional */
            }
            // Apply literary plate delta before spend (Core homology)
            const litDeltaB = (composedForPipe as {
              _litRepairDelta?: Awaited<
                ReturnType<typeof import("@/ruleEngine/quality/applyLiteraryRepairDeltas").applyLiteraryRepairDeltas>
              >;
            })._litRepairDelta;
            if (litDeltaB) {
              if (
                litDeltaB.referenceList?.length &&
                (litDeltaB.platesSwapped || litDeltaB.propSoftBase64 || litDeltaB.droppedSoftEnv)
              ) {
                referenceList = litDeltaB.referenceList.map((r) => ({
                  type: "image" as const,
                  base64: r.base64,
                }));
                (composedForPipe as { refsRoles?: string[] }).refsRoles = litDeltaB.refsRoles;
                if (litDeltaB.droppedSoftEnv) {
                  (composedForPipe as { droppedSoftEnv?: boolean }).droppedSoftEnv = true;
                  (composedForPipe as { softEnvContinuity?: string }).softEnvContinuity = "none";
                  composedForPipe.keepSoftEnvRef = false;
                }
                if (litDeltaB.propSoftBase64) {
                  (composedForPipe as { propPlateGrade?: string }).propPlateGrade = "synthetic_geometry";
                  (composedForPipe as { synthesizedPropPlate?: boolean }).synthesizedPropPlate = true;
                }
              }
              if (litDeltaB.injectLines?.length) {
                vendorPrompt = `${litDeltaB.injectLines.join("。")}。${String(vendorPrompt).trim()}`;
              }
              delete (composedForPipe as { _litRepairDelta?: unknown })._litRepairDelta;
            }
            (composedForPipe as { lastReferenceList?: Array<{ type: "image"; base64: string; role?: string }> }).lastReferenceList =
              referenceList.map((r, i) => ({
                type: "image" as const,
                base64: r.base64,
                role: (composedForPipe as { refsRoles?: string[] }).refsRoles?.[i],
              }));
            const { runStillVendorWithActuatorCore } = await import(
              "@/ruleEngine/actuators/runStillVendorWithActuator"
            );
            const vendorOut = await runStillVendorWithActuatorCore({
              vendorPrompt,
              referenceList,
              refsRoles: (composedForPipe as { refsRoles?: string[] }).refsRoles,
              objectiveClass: composedForPipe.generationContract?.objectiveClass,
              softEnvContinuity: (composedForPipe as { softEnvContinuity?: string }).softEnvContinuity,
              keepSoftEnvRef: composedForPipe.keepSoftEnvRef,
              propClassId: (composedForPipe.generationContract as { propClassId?: string } | undefined)
                ?.propClassId,
              propSource: (composedForPipe as { propSource?: string }).propSource,
              synthesizedProp,
              propPlateMissing: !propPresent && eventObj,
              propPlateGrade: synthesizedProp ? "synthetic_geometry" : undefined,
              projectId,
              uuid: () => u.uuid(),
              ossWriteFile: (p, d) => u.oss.writeFile(p, d),
              getSmallImageUrl: (p) => u.oss.getSmallImageUrl(p),
              deltaHints:
                litDeltaB?.deltaHints ??
                (composedForPipe as { litRepairDeltaHints?: string[] }).litRepairDeltaHints ??
                null,
              visualDescription: literaryDesc,
              poseOccupancy: (composedForPipe.generationContract as { primaryIntentSeal?: { poseOccupancy?: string }; designIntentProfile?: { poseOccupancy?: string } } | undefined)
                ?.primaryIntentSeal?.poseOccupancy ??
                (composedForPipe.generationContract as { designIntentProfile?: { poseOccupancy?: string } } | undefined)
                  ?.designIntentProfile?.poseOccupancy,
              primaryIntentSeal: (composedForPipe.generationContract as { primaryIntentSeal?: { poseOccupancy?: string; sealHash?: string } } | undefined)
                ?.primaryIntentSeal,
              runSeedream: async (promptOverride?: string) => {
                const seedPrompt = promptOverride || vendorPrompt;
                const imageCls = await u.Ai.Image(
                  projectSettingData?.imageModel as `${string}:${string}`,
                ).run(
                  {
                    referenceList,
                    prompt: seedPrompt,
                    size: repeloadObj.size,
                    aspectRatio: repeloadObj.aspectRatio,
                  },
                  {
                    taskClass: "生成分镜图片",
                    describe: `分镜图片生成 edit=${editStrategy ?? "generate"}`,
                    relatedObjects: JSON.stringify({
                      ...repeloadObj,
                      prompt: seedPrompt,
                      editStrategy,
                    }),
                    projectId: projectId,
                  },
                );
                const sp = `/${projectId}/assets/${scriptId}/${u.uuid()}.jpg`;
                await imageCls.save(sp);
                const uurl = await u.oss.getSmallImageUrl(sp.replace(/^\//, ""));
                let b64 = "";
                try {
                  b64 = await u.oss.getImageBase64(sp.replace(/^\//, ""));
                } catch {
                  b64 = "dGVzdA==";
                }
                return { url: uurl, savePath: sp, imageBase64: b64 };
              },
            });
            (composedForPipe as { actuatorId?: string }).actuatorId = vendorOut.actuatorId;
            (composedForPipe as { actuatorDegraded?: boolean }).actuatorDegraded =
              vendorOut.actuatorDegraded;
            (composedForPipe as { propPlateGrade?: string }).propPlateGrade = vendorOut.propPlateGrade;
            (composedForPipe as { workflowHash?: string }).workflowHash = vendorOut.workflowHash;
            if (vendorOut.vendorPromptUsed) {
              (composedForPipe as { vendorPromptUsed?: string }).vendorPromptUsed = vendorOut.vendorPromptUsed;
            }
            actuatorEcho = {
              actuatorId: vendorOut.actuatorId,
              actuatorDegraded: vendorOut.actuatorDegraded,
              propPlateGrade: vendorOut.propPlateGrade,
              workflowHash: vendorOut.workflowHash,
            };
            return {
              url: vendorOut.url,
              savePath: vendorOut.savePath,
              promptUsed: vendorPrompt,
              imageBase64: vendorOut.imageBase64,
              allowHqOkL0: pipeline.allowHqOk && !pipeline.collapsed,
              fidelityMissing: pipeline.fidelityMissing,
              strategy: (editStrategy as "agnes_i2i" | "atlas_native" | "focus_regen" | "generate") ?? "generate",
            };
          };
        batchGenerateOnce = batchGenerateOnceInner;
        const loopOut = await runStillVisualFidelityLoop({
          qualityMode: hq ? "hq_update" : "draft",
          storyboardId: item.id!,
          description: literaryDesc,
          checklist,
          db: u.db,
          bgPolicy: bgPol.policy,
          generateOnce: batchGenerateOnceInner,
        });
        // Literary primary effects + per-atom re-vendor (batch ≡ Core MAX_LIT)
        let litAfter: Awaited<
          ReturnType<
            typeof import("@/ruleEngine/quality/literaryEffectsAfterStill").reassertLiteraryEffectsAfterStill
          >
        > | null = null;
        let batchLitOut = loopOut;
        try {
          const { reassertLiteraryEffectsAfterStill, literaryEffectsPersistSlice } =
            require("@/ruleEngine/quality/literaryEffectsAfterStill") as typeof import("@/ruleEngine/quality/literaryEffectsAfterStill");
          const { applyLiteraryRepairDeltas } = await import("@/ruleEngine/quality/applyLiteraryRepairDeltas");
          const seal =
            (composedForPipe.generationContract as { primaryIntentSeal?: import("@/ruleEngine/compilers/primaryIntentSeal").PrimaryIntentCarrierSet })
              ?.primaryIntentSeal ?? null;
          const MAX_LIT = 3;
          for (let litRound = 0; litRound < MAX_LIT; litRound++) {
            litAfter = await reassertLiteraryEffectsAfterStill({
              visualDescription: String(literaryDesc ?? composeCtx.visualDescription ?? ""),
              promptUsed: batchLitOut.promptUsed,
              seal,
              refsRoles: (composedForPipe as { refsRoles?: string[] }).refsRoles,
              propPlateGrade: (composedForPipe as { propPlateGrade?: string }).propPlateGrade,
              propPlateMissing: (composedForPipe as { propPlateMissing?: boolean }).propPlateMissing,
              imageBase64: batchLitOut.imageBase64,
              videoMotionStartHint: (composedForPipe.generationContract as { videoMotionStartHint?: string } | undefined)
                ?.videoMotionStartHint,
              shotDesignSample: (composedForPipe as { shotDesignSample?: import("@/ruleEngine/design/shotDesignSample").ShotDesignSample })
                .shotDesignSample,
              episodeShot: item as unknown as Record<string, unknown>,
              droppedSoftEnv: (composedForPipe as { droppedSoftEnv?: boolean }).droppedSoftEnv,
              fragmentPlateHung: (composedForPipe as { fragmentPlateHung?: boolean }).fragmentPlateHung,
              referenceList: (composedForPipe as { lastReferenceList?: Array<{ type: "image"; base64: string; role?: string }> })
                .lastReferenceList,
            });
            (composedForPipe as { literaryEffectsPersist?: Record<string, unknown> }).literaryEffectsPersist =
              literaryEffectsPersistSlice(litAfter);
            if (litAfter.videoMotionStartHint && composedForPipe.generationContract) {
              (composedForPipe.generationContract as { videoMotionStartHint?: string }).videoMotionStartHint =
                litAfter.videoMotionStartHint;
            }
            if (litAfter.i2vCriticalFacts?.length && composedForPipe.generationContract) {
              (composedForPipe.generationContract as { i2vCriticalFacts?: string[] }).i2vCriticalFacts =
                litAfter.i2vCriticalFacts;
            }
            if (litAfter.sampleMustFulfilled === true || litAfter.literaryEffectsQualified === true) break;
            const actionStillMiss = (litAfter.sampleMustMissIds ?? litAfter.missingEffects.map((m) => m.id)).some((id) =>
              /action\.|occupancy\./.test(String(id)),
            );
            if (!actionStillMiss && litRound >= 2) break;

            const delta = await applyLiteraryRepairDeltas({
              missingEffects: litAfter.missingEffects,
              deltaHints: litAfter.repairDeltaHints,
              injectLines: litAfter.repairInjectLines,
              poseOccupancy: seal?.poseOccupancy ?? null,
              visualDescription: String(literaryDesc ?? ""),
              referenceList: (composedForPipe as { lastReferenceList?: Array<{ type: "image"; base64: string; role?: string }> })
                .lastReferenceList,
              refsRoles: (composedForPipe as { refsRoles?: string[] }).refsRoles,
            });
            if (!delta.claimPlateRepair && !delta.platesSwapped && !delta.propSoftBase64) {
              (composedForPipe as { literaryEffectsPersist?: Record<string, unknown> }).literaryEffectsPersist = {
                ...((composedForPipe as { literaryEffectsPersist?: Record<string, unknown> }).literaryEffectsPersist ??
                  {}),
                litAutoRevendorStamped: false,
                litPlatesSwapped: false,
                sampleMustFulfilled: false,
                repairDeltaHints: delta.deltaHints,
              };
              break;
            }
            (composedForPipe as { _litRepairDelta?: typeof delta })._litRepairDelta = delta;
            (composedForPipe as { litRepairDeltaHints?: string[] }).litRepairDeltaHints = delta.deltaHints;
            if (delta.droppedSoftEnv) {
              (composedForPipe as { droppedSoftEnv?: boolean }).droppedSoftEnv = true;
              (composedForPipe as { softEnvContinuity?: string }).softEnvContinuity = "none";
              composedForPipe.keepSoftEnvRef = false;
            }
            const once = await batchGenerateOnceInner({
              strengthen: {},
              mode: "generate",
              fixHints: delta.injectLines,
              forceFullCompose: true,
              round: 100 + litRound,
            });
            batchLitOut = {
              ...batchLitOut,
              url: once.url,
              savePath: once.savePath,
              promptUsed: once.promptUsed,
              imageBase64: once.imageBase64,
            };
          }
          if (litAfter) {
            try {
              const { assessStillVideoReadiness } = await import("@/ruleEngine/qc/stillVideoReadiness");
              const ready = assessStillVideoReadiness({
                stillQuality: "weak",
                visualPass: false,
                literaryEffectsQualified: litAfter.literaryEffectsQualified,
                promptUsed: String(batchLitOut.promptUsed ?? ""),
                visualDescription: String(literaryDesc ?? ""),
                stillMeta: {
                  ...literaryEffectsPersistSlice(litAfter),
                  droppedSoftEnv: (composedForPipe as { droppedSoftEnv?: boolean }).droppedSoftEnv,
                  softEnvContinuity: (composedForPipe as { softEnvContinuity?: string }).softEnvContinuity,
                },
              });
              (composedForPipe as { literaryEffectsPersist?: Record<string, unknown> }).literaryEffectsPersist = {
                ...((composedForPipe as { literaryEffectsPersist?: Record<string, unknown> }).literaryEffectsPersist ??
                  {}),
                i2vReady: ready.i2vReady,
                i2vBlockReason: ready.reason,
                sampleMustFulfilled: litAfter.sampleMustFulfilled,
                droppedSoftEnv: (composedForPipe as { droppedSoftEnv?: boolean }).droppedSoftEnv === true,
                softEnvContinuity: (composedForPipe as { softEnvContinuity?: string }).softEnvContinuity,
              };
            } catch {
              /* optional */
            }
          }
        } catch {
          /* optional */
        }
        const allowHq =
          hq &&
          loopOut.visualPass &&
          !loopOut.sheetLeak &&
          composed.descCoverageOk !== false &&
          composed.ok !== false &&
          litAfter?.literaryEffectsQualified !== false &&
          litAfter?.sampleMustFulfilled !== false;
        const sheetLeak =
          Boolean(loopOut.sheetLeak) ||
          (loopOut.fidelityItems ?? []).some(
            (i) => !i.pass && /single_frame|拼版|四视|turnaround|四宫格/i.test(`${i.id}${i.fixHint ?? ""}`),
          );
        const litHash = hashLiteraryDesc(String(literaryDesc ?? composeCtx.visualDescription ?? ""));
        const homologizePu = (raw: string): string => {
          let pu = String(raw ?? "").slice(0, 2000);
          try {
            const { homologizeStillPromptForStore } =
              require("@/ruleEngine/compilers/stillPromptHomology") as typeof import("@/ruleEngine/compilers/stillPromptHomology");
            pu = homologizeStillPromptForStore(pu).prompt || pu;
          } catch {
            /* optional */
          }
          return pu.slice(0, 2000);
        };
        const vendorPu = String((composedForPipe as { vendorPromptUsed?: string }).vendorPromptUsed ?? "").trim();
        const persistPromptUsed = homologizePu(batchLitOut.promptUsed || loopOut.promptUsed);
        const hqMeta = allowHq
          ? markHqOk({
              qualityMode: "hq_update",
              composeSources: composed.sources,
              promptUsed: persistPromptUsed,
              literaryDescHash: litHash,
              literaryHash: litHash,
              compositionContractApplied: composed.compositionContractApplied,
              composeMode: composed.composeMode,
              entityAnchors: composed.entityAnchors,
              composeHash: computeComposeHash(composeCtx),
              literaryChars: pipeline.literaryChars,
              collapsed: pipeline.collapsed,
              autoHealed: [...(pipeline.autoHealed ?? []), ...loopOut.autoHealed],
              pipelineVersion: pipeline.pipelineVersion,
              recipeHeals: pipeline.recipeHeals ?? composed.recipeHeals,
              visualPass: true,
              visualPassAt: loopOut.visualPassAt,
              fidelityItems: loopOut.fidelityItems,
              sheetLeak: false,
              egressCompressed: Boolean((composedForPipe as { egressCompressed?: boolean }).egressCompressed),
              ...(vendorPu && vendorPu !== loopOut.promptUsed
                ? { vendorPromptUsed: vendorPu.slice(0, 2000) }
                : {}),
            })
          : {
              stillQuality: "weak" as const,
              qualityMode: "draft" as const,
              promptState: "composed" as const,
              promptUsed: homologizePu(loopOut.promptUsed),
              literaryDescHash: litHash,
              literaryHash: litHash,
              literaryChars: pipeline.literaryChars,
              collapsed: pipeline.collapsed,
              autoHealed: [...(pipeline.autoHealed ?? []), ...loopOut.autoHealed],
              pipelineVersion: pipeline.pipelineVersion,
              recipeHeals: pipeline.recipeHeals ?? composed.recipeHeals,
              visualPass: false,
              fidelityFailed: true,
              fidelityItems: loopOut.fidelityItems,
              fidelityStopReason: loopOut.stopReason,
              vlmError: loopOut.vlmError,
              pendingHumanRejudge: loopOut.pendingHumanRejudge === true,
              sheetLeak,
              reverseTrigger:
                loopOut.stopReason === "vlm_error"
                  ? "img_still_weak"
                  : loopOut.stopReason === "budget" || loopOut.stopReason === "converged"
                    ? "still_firstframe_weak"
                    : "still_firstframe_dirty",
              egressCompressed: Boolean((composedForPipe as { egressCompressed?: boolean }).egressCompressed),
              ...(vendorPu && vendorPu !== loopOut.promptUsed
                ? { vendorPromptUsed: vendorPu.slice(0, 2000) }
                : {}),
            };
        const { applyLifecycleInvalidation } = await import("@/ruleEngine/heal/lifecycleInvalidate");
        const life = applyLifecycleInvalidation("still_regenerated", hqMeta);
        const keyMissing = /VLM_API_KEY_MISSING|api\s*key/i.test(String(loopOut.vlmError ?? ""));
        const exhausted = loopOut.stopReason === "budget" || loopOut.stopReason === "converged";
        let repairRoute: { nextStep?: string; ctaLabel?: string; userMessage?: string; settingsDeepLink?: string } | undefined;
        try {
          const { routeStillRepair } = await import("@/ruleEngine/qc/stillRepairRoute");
          repairRoute = routeStillRepair({
            itemResults: loopOut.itemResults,
            checklist,
            vlmError: loopOut.vlmError,
            exhausted,
            sheetLeak,
            literaryPrompt: composed.prompt ?? composed.visualBody,
            visualDescription: String(literaryDesc ?? composeCtx.visualDescription ?? ""),
            shotSize: (item as { shotSize?: string }).shotSize ?? composeCtx.shotSize,
            castNames: charNames,
          });
        } catch {
          /* optional */
        }
        // Homology: do not let lifecycle overwrite design reverse with burn when weak/exhausted
        const litDebtStop = loopOut.repairIrdPrimaryAction === "hand_edit_vd";
        // Key optional: never force chat_repair as if Key were required
        const primaryNext =
          litDebtStop || repairRoute?.nextStep === "chat_repair"
            ? "chat_repair"
            : repairRoute?.nextStep === "split_shot"
              ? "split_shot"
              : keyMissing
                ? "batch_still"
                : loopOut.stopReason === "vlm_error" || !allowHq
                  ? repairRoute?.nextStep === "batch_still"
                    ? "batch_still"
                    : life.primaryNextStep === "burn"
                      ? "batch_still"
                      : life.primaryNextStep ?? "batch_still"
                  : life.primaryNextStep;
        const { buildPrimaryBlock } = await import("@/ruleEngine/compilers/primaryBlock");
        const { buildRePushPlan } = await import("@/ruleEngine/design/reverseRouteEngine");
        const weakPrimary = buildPrimaryBlock(
          primaryNext === "split_shot"
            ? "split_shot"
            : primaryNext === "chat_repair"
              ? "chat_repair"
              : primaryNext === "batch_still"
                ? "batch_still"
                : "regen_storyboard_hq",
          { stage: "burn" },
        );
        const weakMsg =
          litAfter && litAfter.literaryEffectsQualified === false
            ? (() => {
                const { stillQualityUserMessage } =
                  require("@/ruleEngine/quality/practiceCompleteness") as typeof import("@/ruleEngine/quality/practiceCompleteness");
                return stillQualityUserMessage({
                  keyAbsent: keyMissing,
                  missingEffects: litAfter.sampleMustMissIds?.length
                    ? litAfter.sampleMustMissIds
                    : litAfter.missingEffects,
                  literaryEffectsQualified: false,
                  sampleMustFulfilled: false,
                  bendHostileRefsForced: true,
                  platesSwapped: Boolean((composedForPipe as { litPlatesSwapped?: boolean }).litPlatesSwapped),
                  softEnvMissingHonest: Boolean(
                    (composedForPipe as { softEnvMissingHonest?: boolean }).softEnvMissingHonest,
                  ),
                  realizationDegraded: litAfter.realization?.realizationDegraded === true,
                  realizationNote: litAfter.ctaLabel,
                  shouldMissIds: (litAfter.shouldMisses ?? [])
                    .map((m) => m.id)
                    .filter((id) => /action\.|occupancy\.|glyph/i.test(String(id)))
                    .slice(0, 2),
                  poseEvidenceOk: (() => {
                    const miss = litAfter.sampleMustMissIds ?? litAfter.missingEffects.map((m) => m.id);
                    if (!miss.some((id) => /action\.|occupancy\./.test(String(id)))) return true;
                    return false;
                  })(),
                });
              })()
          : litAfter &&
              litAfter.literaryEffectsQualified === true &&
              litAfter.realization?.realizationDegraded === true
            ? (() => {
                const { stillQualityUserMessage } =
                  require("@/ruleEngine/quality/practiceCompleteness") as typeof import("@/ruleEngine/quality/practiceCompleteness");
                return stillQualityUserMessage({
                  keyAbsent: keyMissing,
                  literaryEffectsQualified: true,
                  sampleMustFulfilled: true,
                  realizationDegraded: true,
                  realizationNote: litAfter.ctaLabel,
                });
              })()
          : keyMissing
            ? (() => {
                const { stillQualityUserMessage } =
                  require("@/ruleEngine/quality/practiceCompleteness") as typeof import("@/ruleEngine/quality/practiceCompleteness");
                return stillQualityUserMessage({ keyAbsent: true });
              })()
            : litDebtStop
              ? (loopOut.repairMissingSlots?.length
                  ? `文学细节契约未过（缺 ${loopOut.repairMissingSlots.join("/")}）；请手改 VD，禁止只 regen；弱图不可作视频首帧`
                  : "文学细节契约未过；请手改 VD，禁止只 regen；弱图不可作视频首帧")
              : loopOut.stopReason === "converged"
              ? "成图文学保真项反复未过，已收敛停机；弱图不可作视频首帧；请回设计或重出 HQ"
              : exhausted
                ? repairRoute?.userMessage ??
                  "修复预算耗尽；请回 SB 智能拆或改描写；弱图不可作视频首帧"
                : pipeline.collapsed
                  ? "静照提示词文学主体塌缩，已回退合成正文；弱图不可作视频首帧"
                  : repairRoute?.userMessage
                    ? /弱图不可作视频首帧/.test(repairRoute.userMessage)
                      ? repairRoute.userMessage
                      : `${repairRoute.userMessage}；弱图不可作视频首帧`
                    : !allowHq
                      ? weakPrimary.userMessage
                      : undefined;
        const rePushPlan =
          exhausted || primaryNext === "split_shot" || primaryNext === "chat_repair" || (!allowHq && primaryNext !== "burn")
            ? buildRePushPlan([
                keyMissing
                  ? "img_still_weak"
                  : litDebtStop
                    ? "lit_detail_anchor"
                    : primaryNext === "split_shot"
                      ? "still_onebeat_multi"
                      : "still_firstframe_weak",
              ])
            : undefined;
        // M7: preserve prior reason (hash etc.) + stamp live designContentHash (≠ mergeReasonMeta(null))
        let designStamp: Record<string, unknown> = {};
        try {
          const { buildShotChainContract } = await import("@/ruleEngine/quality/shotChainContract");
          const chain = buildShotChainContract({
            visualDescription: String(literaryDesc ?? composeCtx.visualDescription ?? ""),
            duration: item.duration,
            shotSize: composeCtx.shotSize,
            charCodes: (composeCtx.characters ?? []).map((c) => c.code).filter(Boolean),
          });
          designStamp = {
            designContentHash: chain.designContentHash,
            dialogueFingerprint: chain.dialogueFingerprint || undefined,
          };
        } catch {
          /* optional */
        }
        // Literary SSOT stays in o_storyboard.prompt — never overwrite with vendor egress
        await u.db("o_storyboard").where("id", item.id).update({
          filePath: batchLitOut.savePath || loopOut.savePath,
          state: "已完成",
          reason: mergeReasonMeta(item.reason, {
            ...(policy.hasSensitiveTerms ? { policyWarnings: policy.warnings } : {}),
            ...hqMeta,
            ...(life.stillMeta ?? {}),
            ...designStamp,
            nextStep: primaryNext,
            primaryNextStep: primaryNext,
            didSynthesize: composed.didSynthesize,
            scrubbed: composed.scrubbed,
            settingsDeepLink: keyMissing
              ? "/settings/vendor?focus=volcengine&field=apiKey"
              : repairRoute?.settingsDeepLink,
            ctaLabel:
              litAfter?.ctaLabel ||
              (keyMissing
                ? loopOut.pendingHumanRejudge
                  ? "人审通过（未测·非失败）"
                  : "继续生成修复"
                : loopOut.repairCtaLabel ??
                  repairRoute?.ctaLabel ??
                  (!allowHq ? weakPrimary.ctaLabel : undefined)),
            keyOptional: true,
            pixelDimStatus: keyMissing ? "unmeasured" : allowHq ? "measured_pass" : "measured_fail",
            actuatorId: actuatorEcho.actuatorId,
            actuatorDegraded: Boolean(actuatorEcho.actuatorDegraded),
            propPlateGrade: actuatorEcho.propPlateGrade,
            workflowHash: actuatorEcho.workflowHash,
            userMessage: weakMsg,
            missingSlots: loopOut.repairMissingSlots ?? repairRoute?.missingSlots,
            irdPrimaryAction: loopOut.repairIrdPrimaryAction ?? repairRoute?.irdPrimaryAction,
            videoStale: true,
            deliveryTier:
              allowHq && litAfter?.literaryEffectsQualified !== false
                ? "burn"
                : litAfter?.literaryEffectsQualified === false
                  ? "draft"
                  : "preview",
            debtKind: litAfter?.debtKind,
            ...((composedForPipe as { literaryEffectsPersist?: Record<string, unknown> }).literaryEffectsPersist ??
              {}),
            i2vCriticalFacts:
              litAfter?.i2vCriticalFacts ??
              (composedForPipe.generationContract as { i2vCriticalFacts?: string[] } | undefined)
                ?.i2vCriticalFacts,
            videoMotionStartHint:
              litAfter?.videoMotionStartHint ??
              (composedForPipe.generationContract as { videoMotionStartHint?: string } | undefined)
                ?.videoMotionStartHint,
            designIntentProfile:
              (composed.generationContract as { designIntentProfile?: unknown } | undefined)
                ?.designIntentProfile ??
              (composedForPipe as { generationContract?: { designIntentProfile?: unknown } }).generationContract
                ?.designIntentProfile,
            primaryIntentSeal:
              (composed.generationContract as { primaryIntentSeal?: unknown } | undefined)
                ?.primaryIntentSeal ??
              (composedForPipe as { generationContract?: { primaryIntentSeal?: unknown } }).generationContract
                ?.primaryIntentSeal,
            ...(rePushPlan ? { rePushPlan } : {}),
          }),
        });
        if (allowHq) {
          try {
            const { cascadeTrackAfterStillHqOk } = await import(
              "@/ruleEngine/quality/cascadeTrackAfterStillHq"
            );
            await cascadeTrackAfterStillHqOk({
              db: u.db,
              storyboardId: item.id,
              stillQuality: "hq_ok",
              visualPass: true,
            });
          } catch {
            /* cascade best-effort */
          }
        }
      } catch (e) {
        const errMsg = u.error(e).message;
        const feedback = await classifyGenerationFailure({
          modality: "image",
          shotId: String(item.id),
          error: errMsg,
          prompt: promptText,
        });
        const { buildPrimaryBlock } = await import("@/ruleEngine/compilers/primaryBlock");
        const failPrimary = buildPrimaryBlock(hq ? "regen_storyboard_hq" : "batch_still", { stage: "burn" });
        await u.db("o_storyboard").where("id", item.id).update({
          filePath: "",
          reason: mergeReasonMeta(item.reason, {
            message: errMsg,
            feedback,
            nextStep: hq ? "regen_storyboard_hq" : "batch_still",
            primaryNextStep: hq ? "regen_storyboard_hq" : "batch_still",
            userMessage: failPrimary.userMessage,
            ctaLabel: failPrimary.ctaLabel,
          }),
          state: "生成失败",
        });
      }
    };
    let generateList = [];
    if (compulsory) {
      generateList = storyboardData;
    } else {
      generateList = storyboardData.filter((item) => item.shouldGenerateImage !== 0);
    }
    const { sortStoryboardsForContinuity } = await import("@/ruleEngine/qc/crossShotContinuity");
    const { withStoryboardLock } = await import("@/ruleEngine/heal/storyboardLock");
    generateList = sortStoryboardsForContinuity(
      generateList.map((item, idx) => ({ ...item, index: idx })),
    );
    // HQ: serialize by lock per shot; keep concurrent batches but each task locks
    const lockedTask = async (item: (typeof generateList)[0]) => {
      if (!item.id) return generateTask(item);
      return withStoryboardLock(item.id, () => generateTask(item));
    };
    for (let i = 0; i < generateList.length; i += concurrentCount) {
      const batch = generateList.slice(i, i + concurrentCount);
      await Promise.all(batch.map(lockedTask));
    }
  },
);
