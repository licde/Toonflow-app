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

    const gate = await runPreflightGate(u.db, {
      projectId,
      scriptId,
      storyboardIds: finalStoryboardIds,
      modality: "IMG",
      skipPreflight,
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
          await u.db("o_storyboard").where("id", item.id).update({
            filePath: "",
            state: "生成失败",
            reason: JSON.stringify({
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
      const { composeStillPrompt, isDirtyStillPrompt, resolveComposeMode, scrubStillPromptNoise, stripIdentityTokens, computeComposeHash } =
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
      const meta = (() => {
        try {
          return typeof item.reason === "string" ? JSON.parse(item.reason) : item.reason;
        } catch {
          return null;
        }
      })() as { promptState?: string; composeHash?: string; promptUsed?: string } | null;
      const prevBody = scrubStillPromptNoise(stripIdentityTokens(String(meta?.promptUsed ?? item.prompt ?? "")).body).cleaned;
      if (prevBody) composeCtx.previousVisualBody = prevBody;
      const { shouldDefaultFidelityCompose, stripStaleBindingFromPrevious } = await import(
        "@/ruleEngine/compilers/composeStillPrompt"
      );
      if (prevBody) composeCtx.previousVisualBody = stripStaleBindingFromPrevious(prevBody);
      const mode = resolveComposeMode({
        existingPrompt: promptText,
        promptState: meta?.promptState,
        composeHash: meta?.composeHash,
        currentHash: computeComposeHash(composeCtx),
        preferFidelity: shouldDefaultFidelityCompose(composeCtx),
      });
      const forceFull = isDirtyStillPrompt(promptText) || !String(promptText ?? "").trim();
      const composed = composeStillPrompt(composeCtx, { mode: forceFull ? "full" : mode });
      if (!composed.ok) {
        const { buildPrimaryBlock } = await import("@/ruleEngine/compilers/primaryBlock");
        const primary = buildPrimaryBlock(composed.primaryNextStep ?? "chat_repair", { stage: "prompt" });
        await u.db("o_storyboard").where("id", item.id).update({
          filePath: "",
          state: "生成失败",
          reason: JSON.stringify({
            message: composed.blockReason ?? composed.userMessage,
            nextStep: composed.primaryNextStep ?? primary.primaryNextStep,
            primaryNextStep: composed.primaryNextStep ?? primary.primaryNextStep,
            userMessage: composed.userMessage ?? primary.userMessage,
            ctaLabel: composed.ctaLabel ?? primary.ctaLabel,
            composeSources: composed.sources,
            code: composed.missingLeadAsset ? "IMG-CREF" : "QP-02",
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
          reason: JSON.stringify({
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
        sceneCode: composed.excludeScene ? null : (composeCtx.sceneCode ?? null),
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
      const literaryDesc = composeCtx.visualDescription ?? composeCtx.videoDesc ?? composed.visualBody;
      const { resolveStillBgPolicy } = await import("@/ruleEngine/compilers/stillBgPolicy");
      const bgPol = resolveStillBgPolicy({
        description: literaryDesc,
        characterNames: charNames,
        shotSize: (item as { shotSize?: string }).shotSize ?? composeCtx.shotSize,
      });
      const checklist = buildLiteraryFidelityChecklist({
        description: literaryDesc,
        characterNames: charNames,
        requireDualIdentity: charNames.length >= 2,
        bgPolicy: bgPol.policy,
      });
      let pipeline = runStillPromptPipeline({
        composed,
        description: literaryDesc,
        characterNames: charNames,
        identitySlots,
        fields: designFields,
        aspectRatioFallback: projectSettingData?.videoRatio as string | undefined,
        modality: "image",
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
        const loopOut = await runStillVisualFidelityLoop({
          qualityMode: hq ? "hq_update" : "draft",
          storyboardId: item.id!,
          description: literaryDesc,
          checklist,
          db: u.db,
          bgPolicy: bgPol.policy,
          generateOnce: async ({ strengthen, mode, fixHints, failedImageBase64, layoutPreserve }) => {
            const useEdit = mode === "edit";
            if (!useEdit && Object.keys(strengthen).length) {
              composeCtx.strengthen = { ...(composeCtx.strengthen ?? {}), ...strengthen };
            }
            const recomposed = composeStillPrompt(composeCtx, {
              mode: useEdit || Object.keys(strengthen).length ? "fidelity" : "full",
            });
            const composedForPipe = recomposed.ok ? recomposed : composed;
            const bind = resolveShotIdentityBinding({
              description: literaryDesc,
              characters: (composeCtx.characters ?? []).filter((c) => c.kind !== "scene"),
              assetCodes: imagedCodes,
            });
            const reboundSlots = buildIdentitySlots({
              charCodes: bind.orderedCodes.length ? bind.orderedCodes : imagedCodes,
              sceneCode: composedForPipe.excludeScene ? null : (composeCtx.sceneCode ?? null),
            });
            pipeline = runStillPromptPipeline({
              composed: composedForPipe,
              description: literaryDesc,
              characterNames: charNames,
              identitySlots: reboundSlots,
              fields: designFields,
              aspectRatioFallback: projectSettingData?.videoRatio as string | undefined,
              modality: "image",
              checklist,
            });
            let vendorPrompt = pipeline.egressPrompt;
            const pol = precheckContentPolicy(vendorPrompt);
            if (pol.hasSensitiveTerms) vendorPrompt = pol.softenedPrompt;
            let referenceList = await buildReferenceListForStoryboard(
              u.db,
              projectId,
              item.id!,
              vendorPrompt,
              bind.orderedCodes.length ? bind.orderedCodes : imagedCodes,
              bind.orderedCodes.length ? bind.orderedCodes : imagedCodes,
              { excludeScene: Boolean(composedForPipe.excludeScene) },
            ).then((b) => b.referenceList);
            if (!referenceList.length && !composedForPipe.excludeScene) {
              referenceList = await buildReferenceListFromAssetIds(u.db, assetIds);
            }
            let editStrategy: string | undefined;
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
                model: String(projectSettingData?.imageModel ?? ""),
                vendorHint: String(projectSettingData?.imageModel ?? "").split(":")[0],
                layoutPreserve: Boolean(layoutPreserve) || Boolean(composedForPipe.excludeScene),
                strategy:
                  layoutPreserve || composedForPipe.excludeScene ? "layout_preserve" : undefined,
              });
              vendorPrompt = prep.promptUsed;
              referenceList = prep.referenceList.map((r) => ({ type: "image" as const, base64: r.base64 }));
              editStrategy = prep.strategy;
            }
            const imageCls = await u.Ai.Image(projectSettingData?.imageModel as `${string}:${string}`).run(
              {
                referenceList,
                prompt: vendorPrompt,
                size: repeloadObj.size,
                aspectRatio: repeloadObj.aspectRatio,
              },
              {
                taskClass: "生成分镜图片",
                describe: `分镜图片生成 edit=${editStrategy ?? "generate"}`,
                relatedObjects: JSON.stringify({ ...repeloadObj, prompt: vendorPrompt, editStrategy }),
                projectId: projectId,
              },
            );
            const savePath = `/${projectId}/assets/${scriptId}/${u.uuid()}.jpg`;
            await imageCls.save(savePath);
            const url = await u.oss.getSmallImageUrl(savePath.replace(/^\//, ""));
            let imageBase64 = "";
            try {
              imageBase64 = await u.oss.getImageBase64(savePath.replace(/^\//, ""));
            } catch {
              imageBase64 = "dGVzdA==";
            }
            return {
              url,
              savePath,
              promptUsed: vendorPrompt,
              imageBase64,
              allowHqOkL0: pipeline.allowHqOk && !pipeline.collapsed,
              fidelityMissing: pipeline.fidelityMissing,
              strategy: (editStrategy as "agnes_i2i" | "atlas_native" | "focus_regen" | "generate") ?? "generate",
            };
          },
        });
        const allowHq = hq && loopOut.visualPass;
        const hqMeta = allowHq
          ? markHqOk({
              qualityMode: "hq_update",
              composeSources: composed.sources,
              promptUsed: loopOut.promptUsed,
              literaryDescHash: hashLiteraryDesc(String(literaryDesc ?? composeCtx.visualDescription ?? "")),
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
            })
          : {
              stillQuality: "weak" as const,
              qualityMode: "draft" as const,
              promptState: "composed" as const,
              promptUsed: loopOut.promptUsed.slice(0, 2000),
              literaryDescHash: hashLiteraryDesc(String(literaryDesc ?? composeCtx.visualDescription ?? "")),
              literaryChars: pipeline.literaryChars,
              collapsed: pipeline.collapsed,
              autoHealed: [...(pipeline.autoHealed ?? []), ...loopOut.autoHealed],
              pipelineVersion: pipeline.pipelineVersion,
              recipeHeals: pipeline.recipeHeals ?? composed.recipeHeals,
              visualPass: false,
              fidelityItems: loopOut.fidelityItems,
              fidelityStopReason: loopOut.stopReason,
            };
        const { applyLifecycleInvalidation } = await import("@/ruleEngine/heal/lifecycleInvalidate");
        const life = applyLifecycleInvalidation("still_regenerated", hqMeta);
        const promptWrite = !isDirtyStillPrompt(composed.visualBody) ? loopOut.promptUsed : undefined;
        await u.db("o_storyboard").where("id", item.id).update({
          filePath: loopOut.savePath,
          state: "已完成",
          ...(promptWrite ? { prompt: promptWrite } : {}),
          reason: mergeReasonMeta(null, {
            ...(policy.hasSensitiveTerms ? { policyWarnings: policy.warnings } : {}),
            ...hqMeta,
            ...(life.stillMeta ?? {}),
            nextStep: life.primaryNextStep,
            primaryNextStep: life.primaryNextStep,
            didSynthesize: composed.didSynthesize,
            scrubbed: composed.scrubbed,
            userMessage: loopOut.stopReason === "converged"
              ? "成图文学保真项反复未过，已收敛停机；未标高质量"
              : pipeline.collapsed
                ? "静照提示词文学主体塌缩，已回退合成正文；未标高质量"
                : undefined,
          }),
        });
      } catch (e) {
        const errMsg = u.error(e).message;
        const feedback = await classifyGenerationFailure({
          modality: "image",
          shotId: String(item.id),
          error: errMsg,
          prompt: promptText,
        });
        await u.db("o_storyboard").where("id", item.id).update({
          filePath: "",
          reason: JSON.stringify({
            message: errMsg,
            feedback,
            nextStep: hq ? "regen_storyboard_hq" : "batch_still",
            primaryNextStep: hq ? "regen_storyboard_hq" : "batch_still",
            userMessage: hq ? "分镜图构图不够好，视频会糊" : "角色定妆图还没有",
            ctaLabel: hq ? "更新高质量分镜图" : "去生成定妆",
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
