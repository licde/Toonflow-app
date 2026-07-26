import express from "express";
import u from "@/utils";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { ReferenceList } from "@/utils/ai";
import { classifyGenerationFailure } from "@/ruleEngine/bundle/generationFailureHelper";
import { runPreflightGate } from "@/ruleEngine/detection/preflightGate";
import { compileTrackVideoPrompt } from "@/ruleEngine/compilers/videoTrackCompiler";
import { isContentPolicyError, applyContentPolicy } from "@/ruleEngine/compilers/contentPolicyAdapter";
import { preflightVendorGates, vendorGatesBlocked } from "@/ruleEngine/compilers/preflightVendorGates";
import { expandTracksToShots } from "@/ruleEngine/trackShotExpander";
import { loadEpisodePackage } from "@/ruleEngine/storage/episodePackageStore";
import { assertNonEmptyEpisode } from "@/ruleEngine/bundle/emptyEpisodeGate";
import { sharedMediaPreflight, mediaPreflightBlocked } from "@/ruleEngine/compilers/mediaTouchParity";
import { applyDesignFieldRegistry, extractDesignFields, buildExtractContext } from "@/ruleEngine/design/designFieldRegistry";
import { generationJobQueue } from "@/ruleEngine/ports/jobQueue";
import { buildRePushPlan } from "@/ruleEngine/design/reverseRouteEngine";
import { bridgeShotToVendor, applyTextHardening } from "@/ruleEngine/compilers/shotVendorBridge";
import { gateIdentityForShot } from "@/ruleEngine/compilers/resolveShotIdentity";
import { resolveVendorCapability, vendorIdFromModel } from "@/ruleEngine/compilers/vendorCapabilityMap";
import { applyVendorPromptPack } from "@/ruleEngine/vendor-packs/videoVendorPack";
import { buildBurnGateEnvelope } from "@/ruleEngine/compilers/burnGateEnvelope";
import { finalizeFiveSectionPrompt } from "@/ruleEngine/compilers/finalizeFiveSectionPrompt";
import { decideVideoQuality, ensureSplitHintOnShot, persistSplitHintSuggestion, serializeQualityDecision } from "@/ruleEngine/compilers/qualityDecision";
import { measureDialogue, splitDialogueUtterances } from "@/ruleEngine/dialogueMetrics";
const router = express.Router();

function inferMediaType(sources: string | undefined, fileType?: string): "image" | "video" | "audio" {
  if (sources === "audio" || fileType === "audio") return "audio";
  if (sources === "video" || fileType === "video") return "video";
  return "image";
}

type Type = "imageReference" | "startImage" | "endImage" | "videoReference" | "audioReference";
interface UploadItem {
  fileType: "image" | "video" | "audio";
  type: Type;
  sources?: "assets" | "storyboard";
  id?: number;
  src?: string;
  label?: string;
  prompt?: string;
}

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
    trackData: z.array(
      z.object({
        uploadData: z.array(
          z.object({
            id: z.number(),
            sources: z.string(),
          }),
        ),
        trackId: z.number(),
        prompt: z.string(),
        duration: z.number(),
      }),
    ),
    model: z.string(),
    mode: z.string(),
    resolution: z.string(),
    audio: z.boolean().optional(),
    skipPreflight: z.boolean().optional(),
  }),
  async (req, res) => {
    try {
    const { scriptId, projectId, trackData, model, resolution, audio, mode, skipPreflight } = req.body;

    const storyboardIds = [
      ...new Set(
        (trackData as { uploadData: { id: number; sources: string }[] }[])
          .flatMap((t) => t.uploadData)
          .filter((u) => u.sources === "storyboard")
          .map((u) => u.id),
      ),
    ];

    const emptyGate = assertNonEmptyEpisode({
      storyboardCount: storyboardIds.length,
      packageShotCount: storyboardIds.length,
    });
    if (!emptyGate.ok) {
      return res.status(400).send(error(emptyGate.message ?? "EMPTY_EPISODE", { code: emptyGate.code }));
    }

    const gate = await runPreflightGate(u.db, {
      projectId,
      scriptId,
      storyboardIds: storyboardIds.length ? storyboardIds : undefined,
      modality: "VID",
      skipPreflight,
    });
    if (!gate.allowed) {
      return res.status(400).send(error(gate.blockReason ?? "preflight BLOCK", { preflight: gate.preflight, failedChecks: gate.failedChecks }));
    }

    const vendorGateSample = (trackData as { prompt: string; duration: number; uploadData: { sources: string }[] }[])[0];
    const vendorGates = preflightVendorGates({
      mode: typeof mode === "string" ? mode : Array.isArray(mode) ? mode[0] : undefined,
      prompt: vendorGateSample?.prompt,
      duration: vendorGateSample?.duration,
      hasReferenceImage: Boolean(vendorGateSample?.uploadData?.some((u) => u.sources === "storyboard" || u.sources === "assets")),
    });
    if (vendorGatesBlocked(vendorGates)) {
      return res.status(400).send(error("vendor gates BLOCK", { vendorGates, failedChecks: vendorGates.filter((g) => !g.passed) }));
    }

    let modeData = [];
    if (Array.isArray(mode)) {
    } else if (typeof mode === "string" && mode.startsWith('["') && mode.endsWith('"]')) {
      try {
        modeData = JSON.parse(mode);
      } catch (e) {}
    }

    // Once hydrate: ratio + package
    const ratio = await u.db("o_project").select("videoRatio").where("id", projectId).first();
    const pkg = await loadEpisodePackage(u.db, projectId, scriptId);

    // Track = UI group; expand to per-shot tasks when package available
    const expandInput = (trackData as { trackId: number; prompt: string; duration: number; uploadData: { id: number; sources: string }[] }[]).map(
      (t) => ({
        trackId: t.trackId,
        storyboardId: t.uploadData.find((u) => u.sources === "storyboard")?.id ?? 0,
        prompt: t.prompt,
        duration: t.duration,
      }),
    );
    let shotTasks = expandInput;
    if (pkg?.shots?.length) {
      try {
        const expanded = expandTracksToShots(
          pkg,
          expandInput.filter((t) => t.storyboardId),
        );
        shotTasks = expanded.map((e) => ({
          trackId: e.trackId ?? 0,
          storyboardId: e.storyboardId,
          prompt: e.compiled.video,
          duration: Number(e.shot.narrative?.duration ?? expandInput.find((t) => t.trackId === e.trackId)?.duration ?? 4),
        }));
      } catch {
        /* fall back to track-level when expander cannot resolve */
      }
    }

    // Identity gate BEFORE HTTP 200 — no false-green enqueue
    const identityBlocks: {
      trackId: number;
      storyboardId?: number;
      gaps: { code: string; reason: string; kind: string }[];
      missingAssetImageQueue: ReturnType<
        typeof import("@/ruleEngine/compilers/identityAssetGate").buildMissingAssetImageQueue
      >;
    }[] = [];
    for (const track of trackData as {
      uploadData: { id: number; sources: string }[];
      trackId: number;
      prompt: string;
    }[]) {
      const storyboardId = track.uploadData.find((item) => item.sources === "storyboard")?.id;
      const shotMeta = storyboardId != null ? pkg?.shots?.find((s) => s.storyboardId === storyboardId) : undefined;
      const shotOverride = shotTasks.find((s) => s.trackId === track.trackId);
      const { gate, missingQueue } = await gateIdentityForShot({
        db: u.db,
        projectId,
        storyboardId: storyboardId ?? shotMeta?.storyboardId,
        shot: shotMeta,
        extraPrompt: shotOverride?.prompt ?? track.prompt,
        failClosedBound: true,
      });
      if (!gate.ok) {
        identityBlocks.push({
          trackId: track.trackId,
          storyboardId,
          gaps: gate.gaps,
          missingAssetImageQueue: missingQueue,
        });
      }
    }
    if (identityBlocks.length) {
      const first = identityBlocks[0];
      return res.status(400).send(
        error(`身份参考图缺失：${first.gaps.map((g) => g.code).join(",")}（禁假绿 cref）`, {
          identityBlocks,
          identityGate: { ok: false, gaps: first.gaps },
          missingAssetImageQueue: first.missingAssetImageQueue,
          reverseTrigger: "img_cref_missing",
        }),
      );
    }

    const tasks: Array<{
      videoId: number;
      videoPath: string;
      prompt: string;
      duration: number;
      images: Array<{ path?: string; sources?: string } | undefined>;
      trackId: number;
      storyboardId?: number;
      skipReason?: string;
    }> = [];
    for (const track of trackData as {
      uploadData: { id: number; sources: string }[];
      trackId: number;
      prompt: string;
      duration: number;
    }[]) {
      try {
        const { uploadData, trackId, prompt, duration } = track;
        const shotOverride = shotTasks.find((s) => s.trackId === trackId);

        const images = await Promise.all(
          uploadData.map(async (item) => {
            if (item.sources === "storyboard") {
              const filePath = await u.db("o_storyboard").where("id", item.id).select("filePath").first();
              return { path: filePath?.filePath as string | undefined, sources: "storyBoard" };
            }
            if (item.sources === "assets") {
              const filePath = await u
                .db("o_assets")
                .where("o_assets.id", item.id)
                .leftJoin("o_image", "o_assets.imageId", "o_image.id")
                .select("o_image.filePath", "o_image.type")
                .first();
              return { path: filePath?.filePath as string | undefined, sources: filePath?.type ?? "image" };
            }
            return { path: undefined, sources: item.sources };
          }),
        );

        const missingPath = images.find((i) => i && !i.path);
        if (missingPath) {
          const videoPath = `/${projectId}/video/${uuidv4()}.mp4`;
          const [videoId] = await u.db("o_video").insert({
            filePath: videoPath,
            time: Date.now(),
            state: "生成失败",
            scriptId,
            projectId,
            videoTrackId: trackId,
            errorReason: JSON.stringify({
              message: "参考图路径缺失",
              code: "MEDIA_PATH_MISSING",
              userMessage: "参考图路径缺失，请检查资产/分镜图",
            }),
          });
          tasks.push({
            videoId,
            videoPath,
            prompt: shotOverride?.prompt ?? prompt,
            duration: shotOverride?.duration ?? duration,
            images,
            trackId,
            storyboardId: uploadData.find((item) => item.sources === "storyboard")?.id,
            skipReason: "MEDIA_PATH_MISSING",
          });
          continue;
        }

        const ossChecks = sharedMediaPreflight({
          paths: images.map((i) => i?.path),
          forceAudio: audio,
          nativeAudio: audio,
          requireAtLeastOne: false,
        });
        if (mediaPreflightBlocked(ossChecks.filter((c) => c.code !== "MEDIA_EMPTY"))) {
          const msg = ossChecks.find((c) => !c.ok)?.message ?? "OSS preflight BLOCK";
          const videoPath = `/${projectId}/video/${uuidv4()}.mp4`;
          const [videoId] = await u.db("o_video").insert({
            filePath: videoPath,
            time: Date.now(),
            state: "生成失败",
            scriptId,
            projectId,
            videoTrackId: trackId,
            errorReason: JSON.stringify({ message: msg, code: "MEDIA_PREFLIGHT" }),
          });
          tasks.push({
            videoId,
            videoPath,
            prompt: shotOverride?.prompt ?? prompt,
            duration: shotOverride?.duration ?? duration,
            images,
            trackId,
            storyboardId: uploadData.find((item) => item.sources === "storyboard")?.id,
            skipReason: "MEDIA_PREFLIGHT",
          });
          continue;
        }

        const storyboardId = uploadData.find((item) => item.sources === "storyboard")?.id;

        // Homology with generateVideo: still first-frame / sheetLeak / weak must block batch burn
        if (storyboardId) {
          try {
            const sbRow = await u.db("o_storyboard").where({ id: storyboardId }).first();
            const { parseStillMetaFromReason, inferStillQuality } =
              await import("@/ruleEngine/compilers/stillQuality");
            const { assertStillDetectForBurn } = await import("@/ruleEngine/qc/stillDetectRepair");
            const { assertStillFirstFrameContract } = await import("@/ruleEngine/qc/stillFirstFrameGate");
            const stillMeta = parseStillMetaFromReason(sbRow?.reason);
            let sheetLeak = Boolean(stillMeta?.sheetLeak);
            const stillPrompt = String(sbRow?.prompt ?? "");
            try {
              const { promptImpliesSheetCollageLeak } =
                await import("@/ruleEngine/compilers/stillFirstFrameLiterarySsot");
              sheetLeak = sheetLeak || promptImpliesSheetCollageLeak(stillPrompt);
            } catch {
              /* optional */
            }
            let stillQuality = inferStillQuality({
              filePath: sbRow?.filePath,
              meta: stillMeta,
              requireVisualPass: true,
            });
            if (sheetLeak) stillQuality = "weak";
            const literaryDesc = String(
              (shotTasks.find((s) => s.trackId === trackId) as { visualDescription?: string } | undefined)
                ?.visualDescription ??
                pkg?.shots?.find((s) => s.storyboardId === storyboardId)?.visualDescription ??
                "",
            );
            const detect = assertStillDetectForBurn({
              stillPrompt,
              stillFilePath: sbRow?.filePath,
              literaryDesc,
              literaryDescHashAtCompose: stillMeta?.literaryDescHash,
              stillMeta: stillMeta as never,
              stillQuality,
              sheetLeak,
            });
            const ff = assertStillFirstFrameContract({
              stillPrompt,
              stillFilePath: sbRow?.filePath,
              requireStill: true,
              literaryDesc,
              literaryDescHashAtCompose: stillMeta?.literaryDescHash,
              stillQuality,
              sheetLeak,
            });
            if (!detect.ok || (!ff.ok && ff.severity === "BLOCK")) {
              const msg = detect.message || ff.message || "静照首帧未过，批量烧片已跳过";
              const code = detect.code ?? ff.code ?? "STILL-FIRSTFRAME-WEAK";
              const videoPath = `/${projectId}/video/${uuidv4()}.mp4`;
              const [videoId] = await u.db("o_video").insert({
                filePath: videoPath,
                time: Date.now(),
                state: "生成失败",
                scriptId,
                projectId,
                videoTrackId: trackId,
                errorReason: JSON.stringify({
                  message: msg,
                  code,
                  primaryNextStep: detect.primaryNextStep ?? ff.primaryNextStep ?? "batch_still",
                  userMessage: msg,
                }),
              });
              tasks.push({
                videoId,
                videoPath,
                prompt: shotOverride?.prompt ?? prompt,
                duration: shotOverride?.duration ?? duration,
                images,
                trackId,
                storyboardId,
                skipReason: code,
              });
              continue;
            }
          } catch (gateErr) {
            const msg = u.error(gateErr).message || "静照首帧校验异常";
            const videoPath = `/${projectId}/video/${uuidv4()}.mp4`;
            const [videoId] = await u.db("o_video").insert({
              filePath: videoPath,
              time: Date.now(),
              state: "生成失败",
              scriptId,
              projectId,
              videoTrackId: trackId,
              errorReason: JSON.stringify({
                message: msg,
                code: "STILL-FIRSTFRAME-GATE-ERROR",
                primaryNextStep: "chat_repair",
              }),
            });
            tasks.push({
              videoId,
              videoPath,
              prompt: shotOverride?.prompt ?? prompt,
              duration: shotOverride?.duration ?? duration,
              images,
              trackId,
              storyboardId,
              skipReason: "STILL-FIRSTFRAME-GATE-ERROR",
            });
            continue;
          }
        }

        const videoPath = `/${projectId}/video/${uuidv4()}.mp4`;
        const [videoId] = await u.db("o_video").insert({
          filePath: videoPath,
          time: Date.now(),
          state: "生成中",
          scriptId,
          projectId,
          videoTrackId: trackId,
        });

        await generationJobQueue.enqueue({
          id: `vid-${videoId}`,
          shotId: String(storyboardId ?? trackId),
          modality: "video",
          priority: 1,
        });

        tasks.push({
          videoId,
          videoPath,
          prompt: shotOverride?.prompt ?? prompt,
          duration: shotOverride?.duration ?? duration,
          images,
          trackId,
          storyboardId,
        });
      } catch (e) {
        const errMsg = u.error(e).message || "batch track prep failed";
        const videoPath = `/${projectId}/video/${uuidv4()}.mp4`;
        const [videoId] = await u.db("o_video").insert({
          filePath: videoPath,
          time: Date.now(),
          state: "生成失败",
          scriptId,
          projectId,
          videoTrackId: track.trackId,
          errorReason: JSON.stringify({ message: errMsg, code: "BATCH_TRACK_PREP" }),
        });
        tasks.push({
          videoId,
          videoPath,
          prompt: track.prompt,
          duration: track.duration,
          images: [],
          trackId: track.trackId,
          skipReason: "BATCH_TRACK_PREP",
        });
      }
    }

    // Batch runs still first-frame gate per track (homology with generateVideo); audio L0 still deferred on async burn
    const payload = tasks.map((t) => ({
      videoId: t.videoId,
      trackId: t.trackId,
      skipped: Boolean(t.skipReason),
      skipReason: t.skipReason,
      stillGateApplied: true as const,
      audioGateDeferred: true as const,
    }));
    res.status(200).send(success(payload));
    for (const { videoId, videoPath, prompt, duration, images, trackId, storyboardId, skipReason } of tasks) {
      if (skipReason) continue;
      const compiled = await compileTrackVideoPrompt(
        u.db,
        scriptId,
        storyboardId,
        prompt,
        (ratio?.videoRatio as string) || "16:9",
      );
      const shotMeta = pkg?.shots?.find((s) => s.storyboardId === storyboardId);
      const designFields = extractDesignFields(
        buildExtractContext({
          modality: "video",
          mode: Array.isArray(modeData) ? modeData[0] : mode,
          episodeShot: shotMeta,
          charCodes: (shotMeta?.narrative?.assetCodes ?? []).filter((c) => /^CHAR-/i.test(c)),
        }),
      );

      let vendorBase = applyDesignFieldRegistry(compiled.vendorPrompt, designFields, { modality: "video" }).prompt;
      const soft = applyContentPolicy(vendorBase);
      let vendorPrompt = soft.hasSensitiveTerms ? soft.softenedPrompt : vendorBase;
      let softenUsed = soft.hasSensitiveTerms;
      const aspectRatio = (compiled.aspectRatio ?? ratio?.videoRatio ?? "16:9") as "16:9" | "9:16";
      const capability = resolveVendorCapability(vendorIdFromModel(model));
      const dialLines = splitDialogueUtterances(shotMeta?.narrative?.dialogue?.lines);
      const lipMin = dialLines.length ? Math.ceil(measureDialogue({ text: dialLines.join("") }).minDurationSec) : 0;
      const bridged = bridgeShotToVendor({
        designFields,
        request: { duration, audio, resolution, mode: modeData.length > 0 ? modeData : mode, aspectRatio },
        referenceCount: images.filter(Boolean).length,
        capability,
        lipMin: lipMin || undefined,
      });
      vendorPrompt = applyTextHardening(vendorPrompt, bridged.textHardening);
      vendorPrompt = finalizeFiveSectionPrompt({
        prompt: vendorPrompt,
        dialogueLines: dialLines,
        durationSec: bridged.params.duration,
        preferStaticOnDialogue: dialLines.length > 0,
      }).prompt;

      const qdFxBatch = String((shotMeta as { fxFeasibility?: string })?.fxFeasibility ?? "");
      let workingShot = shotMeta as Record<string, unknown> | undefined;
      let workingPrompt = vendorPrompt;
      let qd = decideVideoQuality({
        videoPrompt: workingPrompt,
        shot: workingShot as never,
        vendorId: vendorIdFromModel(model),
        fxGrade: qdFxBatch,
        batchMode: true,
      });
      const { applySilentSoftPatches } = await import("@/ruleEngine/heal/applySilentSoftPatches");
      const heal = await applySilentSoftPatches({
        db: u.db,
        projectId,
        scriptId,
        storyboardId,
        vendorId: vendorIdFromModel(model),
        shot: workingShot,
        prompt: workingPrompt,
        decision: qd,
      });
      if (heal.healed) {
        if (heal.prompt) workingPrompt = heal.prompt;
        if (heal.shot) workingShot = heal.shot as Record<string, unknown>;
        vendorPrompt = workingPrompt;
        qd = decideVideoQuality({
          videoPrompt: workingPrompt,
          shot: workingShot as never,
          vendorId: vendorIdFromModel(model),
          fxGrade: qdFxBatch,
          batchMode: true,
        });
      }
      if (!qd.burnAllowed) {
        if (qd.splitHint) {
          if (workingShot) ensureSplitHintOnShot(workingShot as never, qd.splitHint);
          await persistSplitHintSuggestion({
            db: u.db,
            projectId,
            scriptId,
            storyboardId,
            splitHint: qd.splitHint,
          }).catch(() => false);
        }
        const envelope = qd.envelope ?? buildBurnGateEnvelope([
          { id: "LIP-01", message: qd.reasons.join(","), reverseTrigger: "pr_lip_duration" },
        ]);
        await u.db("o_video").where("id", videoId).update({
          state: "生成失败",
          errorReason: JSON.stringify({
            message: `soft_defer: ${qd.decision}`,
            deferred: true,
            ...serializeQualityDecision(qd, { autoHealed: heal.autoHealed, duration: heal.duration }),
            rePushPlan: envelope.rePushPlan,
            repairHints: envelope.repairHints,
          }),
        });
        continue;
      }

      const packedDuration = Math.max(
        bridged.params.duration,
        heal.duration ?? 0,
        Number((workingShot as { duration?: number } | undefined)?.duration ?? 0),
      );
      const packed = applyVendorPromptPack({
        prompt: vendorPrompt,
        vendorId: vendorIdFromModel(model),
        duration: packedDuration || bridged.params.duration,
        audio: bridged.params.audio,
        lipMin: lipMin || undefined,
        nativeAudio: capability.nativeAudio,
      });
      vendorPrompt = finalizeFiveSectionPrompt({
        prompt: packed.prompt,
        dialogueLines: dialLines,
        durationSec: packed.duration,
      }).prompt;
      const generateAudio = packed.audio;
      const vendorDuration = packed.duration;

      // Soft-defer: lip snap impossible
      if (bridged.durationSnapOk === false || packed.warnings.some((w) => /split required/i.test(w))) {
        const envelope = buildBurnGateEnvelope([
          { id: "LIP-01", message: packed.warnings.find((w) => /split|lip/i.test(w)) ?? "口型时长无法落入厂商桶", reverseTrigger: "pr_lip_duration" },
        ], { decision: "soft_defer", nextStep: "split_shot" });
        await persistSplitHintSuggestion({
          db: u.db,
          projectId,
          scriptId,
          storyboardId,
          splitHint: "reaction_shot",
        }).catch(() => false);
        await u.db("o_video").where("id", videoId).update({
          state: "生成失败",
          errorReason: JSON.stringify({
            message: "soft_defer: lip/duration budget",
            deferred: true,
            decision: "soft_defer",
            nextStep: "split_shot",
            splitHint: "reaction_shot",
            rePushPlan: envelope.rePushPlan,
            repairHints: envelope.repairHints,
            reverseTriggers: envelope.triggers,
            warnings: [...bridged.warnings, ...packed.warnings],
          }),
        });
        continue;
      }
      const base64 = await Promise.all(
        images.map(async (item) => {
          if (!item?.path) return null;
          return {
            base64: await u.oss.getImageBase64(item.path),
            type: inferMediaType(item.sources),
          };
        }),
      );
      const relatedObjects = { projectId, videoId, scriptId, type: "视频", trackId };
      const aiVideo = u.Ai.Video(model);

      const runVideo = (p: string) =>
        aiVideo.run(
          {
            prompt: p,
            referenceList: base64.filter(Boolean) as ReferenceList[],
            mode: modeData.length > 0 ? modeData : mode,
            duration: vendorDuration,
            aspectRatio,
            resolution: bridged.params.resolution ?? resolution,
            audio: generateAudio,
          },
          {
            projectId,
            taskClass: "视频生成",
            describe: "根据提示词生成视频",
            relatedObjects: JSON.stringify(relatedObjects),
          },
        );

      runVideo(vendorPrompt)
        .then(async () => await aiVideo.save(videoPath))
        .then(async () => await u.db("o_video").where("id", videoId).update({ state: "生成成功" }))
        .catch(async (err: unknown) => {
          const errMsg = u.error(err).message;
          if (softenUsed && isContentPolicyError(errMsg)) {
            // Second fail after soften → escalate rewrite (rePush SB/EN), do not soften again
            const feedback = await classifyGenerationFailure({
              modality: "video",
              shotId: String(trackId),
              error: errMsg,
              prompt: vendorPrompt,
            });
            const rePushPlan = buildRePushPlan(["content_policy_rewrite"]);
            await u.db("o_video").where("id", videoId).update({
              state: "生成失败",
              errorReason: JSON.stringify({
                message: errMsg,
                feedback,
                escalate: "rewrite",
                rePushPlan,
                suggestedPrompt: feedback.suggestedPrompt,
              }),
            });
            return;
          }
          if (!softenUsed && isContentPolicyError(errMsg)) {
            const again = applyContentPolicy(vendorBase);
            vendorPrompt = again.softenedPrompt;
            softenUsed = true;
            try {
              await runVideo(vendorPrompt);
              await aiVideo.save(videoPath);
              await u.db("o_video").where("id", videoId).update({ state: "生成成功" });
              return;
            } catch (e2) {
              const msg2 = u.error(e2).message;
              const feedback = await classifyGenerationFailure({
                modality: "video",
                shotId: String(trackId),
                error: msg2,
                prompt: vendorPrompt,
              });
              const rePushPlan = buildRePushPlan(["content_policy_rewrite"]);
              await u.db("o_video").where("id", videoId).update({
                state: "生成失败",
                errorReason: JSON.stringify({ message: msg2, feedback, escalate: "rewrite", rePushPlan }),
              });
              return;
            }
          }
          const feedback = await classifyGenerationFailure({
            modality: "video",
            shotId: String(trackId),
            error: errMsg,
            prompt,
          });
          await u.db("o_video").where("id", videoId).update({
            state: "生成失败",
            errorReason: JSON.stringify({ message: errMsg, feedback, suggestedPrompt: feedback.suggestedPrompt }),
          });
        });
    }
    } catch (e) {
      const errMsg = u.error(e).message || "batchGenerateVideo failed";
      if (!res.headersSent) {
        return res.status(500).send(
          error(errMsg, {
            code: "BATCH_GENERATE_VIDEO",
            userMessage: errMsg,
            primaryNextStep: "chat_repair",
          }),
        );
      }
    }
  },
);
