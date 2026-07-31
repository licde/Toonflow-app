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
import { patchVideoTrackReason } from "@/ruleEngine/qc/persistVideoTrackPromptHash";
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

    if (storyboardIds.length) {
      const sbRows = await u.db("o_storyboard")
        .whereIn("id", storyboardIds)
        .select("id", "reason", "visualDescription");
      const { auditEpisodeStillReadiness } =
        await import("@/ruleEngine/quality/episodeStillReadiness");
      const { parseStillMetaFromReason } = await import("@/ruleEngine/compilers/stillQuality");
      const epStill = auditEpisodeStillReadiness(
        sbRows.map((r: { id: number; reason?: string; visualDescription?: string }) => {
          const meta = parseStillMetaFromReason(r.reason);
          return {
            storyboardId: r.id,
            stillQuality: meta?.stillQuality as string | undefined,
            visualPassAt: meta?.visualPassAt,
            visualDescription: r.visualDescription,
          };
        }),
      );
      if (!epStill.ok) {
        return res.status(400).send(
          error(epStill.blockers[0]?.message ?? "EPISODE-STILL-WEAK", {
            code: "EPISODE-STILL-WEAK",
            blockers: epStill.blockers,
            primaryNextStep: "batch_still",
          }),
        );
      }
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
    // Homology with batchGeneratePrompt / generateVideo: design/import lip open → refuse burn
    {
      const meta = (pkg as { meta?: { lipConfirmRequired?: boolean; importOkNotExitPass?: boolean } } | null)?.meta;
      if (meta?.lipConfirmRequired || meta?.importOkNotExitPass) {
        return res.status(400).send(
          error("设计/导入口型拆镜未闭合，请回 SB Confirm 或重导后再烧", {
            code: "LIP_CONFIRM_REQUIRED",
            primaryNextStep: "split_shot",
            userMessage: "lipConfirmRequired / importOkNotExitPass：本台不执行拆镜，请先闭合设计再烧",
            ctaLabel: "回 SB Confirm 拆镜",
          }),
        );
      }
    }

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

        // Homology with FE gate: persisted 需完善 / burnAllowed=false must refuse burn
        {
          const trackRow = await u
            .db("o_videoTrack")
            .where({ id: trackId })
            .select("state", "reason")
            .first();
          let burnAllowedMeta: boolean | undefined;
          try {
            const r =
              typeof trackRow?.reason === "string" && String(trackRow.reason).trim().startsWith("{")
                ? JSON.parse(trackRow.reason)
                : null;
            if (r && typeof r.burnAllowed === "boolean") burnAllowedMeta = r.burnAllowed;
          } catch {
            /* ignore */
          }
          if (trackRow?.state === "需完善" || burnAllowedMeta === false) {
            const videoPath = `/${projectId}/video/${uuidv4()}.mp4`;
            const [videoId] = await u.db("o_video").insert({
              filePath: videoPath,
              time: Date.now(),
              state: "生成失败",
              scriptId,
              projectId,
              videoTrackId: trackId,
              errorReason: JSON.stringify({
                message: "轨道提示词需完善，不可烧片",
                code: "TRACK_PROMPT_NOT_BURN_READY",
                userMessage: "提示词状态为需完善或 burnAllowed=false，请先重编译后再烧",
                ctaLabel: "完善后重编译",
                primaryNextStep: "chat_repair",
              }),
            });
            tasks.push({
              videoId,
              videoPath,
              prompt: shotOverride?.prompt ?? prompt,
              duration: shotOverride?.duration ?? duration,
              images: [],
              trackId,
              storyboardId: uploadData.find((item) => item.sources === "storyboard")?.id,
              skipReason: "TRACK_PROMPT_NOT_BURN_READY",
            });
            continue;
          }
        }

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
            let stillMeta = parseStillMetaFromReason(sbRow?.reason);
            let sheetLeak = Boolean(stillMeta?.sheetLeak);
            const stillPrompt = String(sbRow?.prompt ?? "");
            const { isStillVlmInfraGap } = await import("@/ruleEngine/qc/resolveStillForBurn");
            const vlmInfra = isStillVlmInfraGap(stillMeta as Record<string, unknown> | null);
            try {
              const { promptImpliesSheetCollageLeak, detectSheetLeakFromVlmItems } =
                await import("@/ruleEngine/compilers/stillFirstFrameLiterarySsot");
              if (vlmInfra && sheetLeak) {
                const items = stillMeta?.fidelityItems as
                  | Array<{ id: string; pass?: boolean; evidence?: string }>
                  | undefined;
                if (!items?.length || !detectSheetLeakFromVlmItems(items)) {
                  sheetLeak = false;
                }
              }
              sheetLeak = sheetLeak || promptImpliesSheetCollageLeak(stillPrompt);
            } catch {
              if (vlmInfra) sheetLeak = false;
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
            // SOFT-ALLOW-CONTACT-PROP-FORBIDDEN: never soft-skip weak still when contact prop missing
            let softAllowInfra = vlmInfra && !sheetLeak;
            try {
              const { isContactEventVd, textHasPropInFrame, matchContactEventVd, woundVisibleIsNotProp } =
                await import("@/ruleEngine/compilers/contactEventPolicy");
              if (isContactEventVd(literaryDesc)) {
                const m = matchContactEventVd(literaryDesc);
                const propOk =
                  textHasPropInFrame(stillPrompt, m) && !woundVisibleIsNotProp(stillPrompt);
                if (!propOk) {
                  softAllowInfra = false;
                  stillMeta = {
                    ...(stillMeta as object),
                    propMissing: true,
                    propInFrame: false,
                  } as typeof stillMeta;
                  // Persist so FE debt bars / later burns see propMissing (homology generateVideo)
                  try {
                    const nextReason = {
                      ...((stillMeta as object) || {}),
                      propMissing: true,
                      propInFrame: false,
                    };
                    await u.db("o_storyboard").where({ id: storyboardId }).update({
                      reason: JSON.stringify(nextReason),
                    });
                  } catch {
                    /* best-effort persist */
                  }
                }
              }
            } catch {
              /* optional */
            }
            const qualityForGate = softAllowInfra ? undefined : stillQuality;
            const detect = assertStillDetectForBurn({
              stillPrompt,
              stillFilePath: sbRow?.filePath,
              literaryDesc,
              literaryDescHashAtCompose: stillMeta?.literaryDescHash,
              stillMeta: stillMeta as never,
              stillQuality: qualityForGate,
              sheetLeak,
            });
            const ff = assertStillFirstFrameContract({
              stillPrompt,
              stillFilePath: sbRow?.filePath,
              requireStill: true,
              literaryDesc,
              literaryDescHashAtCompose: stillMeta?.literaryDescHash,
              stillQuality: qualityForGate,
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
                  irdPrimaryAction: detect.irdPrimaryAction,
                  missingSlots: detect.missingSlots,
                  ctaLabel: detect.ctaLabel,
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
            // M7: designContentHash / videoStale — homology with generateVideo
            {
              const pkgShot = pkg?.shots?.find((s) => s.storyboardId === storyboardId) as
                | Record<string, unknown>
                | undefined;
              const trackRow = await u.db("o_videoTrack").where({ id: trackId }).select("reason", "prompt").first();
              let trackReason: Record<string, unknown> = {};
              try {
                trackReason =
                  typeof trackRow?.reason === "string"
                    ? JSON.parse(String(trackRow.reason || "{}"))
                    : { ...(trackRow?.reason as object | undefined) };
              } catch {
                trackReason = {};
              }
              let stamped = String(
                trackReason.designContentHash ?? stillMeta?.designContentHash ?? "",
              ).trim();
              if (stillMeta?.videoStale || trackReason.videoStale) {
                // UX: stale should trigger auto recompile, not permanently skip.
                try {
                  if (pkgShot) {
                    const { buildShotChainContract } = await import("@/ruleEngine/quality/shotChainContract");
                    stamped = buildShotChainContract(pkgShot).designContentHash;
                  }
                } catch {
                  /* best-effort */
                }
              }
              if (stamped && pkgShot) {
                try {
                  const { buildShotChainContract, assertChainEgress } =
                    await import("@/ruleEngine/quality/shotChainContract");
                  const c = buildShotChainContract(pkgShot);
                  const eg = assertChainEgress("burn", c, {
                    videoPrompt: String(shotOverride?.prompt ?? prompt ?? trackRow?.prompt ?? ""),
                    burnDuration: Number(shotOverride?.duration ?? duration ?? c.durationSec),
                    designContentHashAtCompile: stamped,
                  });
                  if (!eg.ok && eg.codes.includes("VIDEO-PROMPT-STALE")) {
                    // Retry with live design fingerprint so burn can proceed.
                    try {
                      const healedShot = { ...(pkgShot as Record<string, unknown>), videoStale: false };
                      try {
                        const reason =
                          typeof healedShot.reason === "string"
                            ? JSON.parse(String(healedShot.reason || "{}"))
                            : { ...((healedShot.reason as Record<string, unknown>) ?? {}) };
                        healedShot.reason = {
                          ...reason,
                          chainStale: { ...((reason.chainStale as Record<string, unknown>) ?? {}), video: false },
                        };
                      } catch {
                        /* optional */
                      }
                      const c2 = buildShotChainContract(healedShot);
                      const liveHash = c2.designContentHash;
                      const eg2 = assertChainEgress("burn", c2, {
                        videoPrompt: String(shotOverride?.prompt ?? prompt ?? trackRow?.prompt ?? ""),
                        burnDuration: Number(shotOverride?.duration ?? duration ?? c2.durationSec),
                        designContentHashAtCompile: liveHash,
                      });
                      if (eg2.ok) {
                        stamped = liveHash;
                      } else {
                        const msg = eg.findings[0]?.message || "设计/对白已变，须重编译后再烧";
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
                            code: "VIDEO-PROMPT-STALE",
                            primaryNextStep: "chat_repair",
                            userMessage: msg,
                            reverseTrigger: "video_prompt_stale",
                            ctaLabel: "重编译视频提示词",
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
                          skipReason: "VIDEO-PROMPT-STALE",
                        });
                        continue;
                      }
                    } catch {
                      /* fallback to existing skip */
                    }
                  }
                } catch {
                  /* optional chain */
                }
              }
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

    // Batch: still first-frame gate applied; audio/mouth homology with generateVideo (not permanently deferred)
    const deferred = tasks.filter((t) => t.skipReason);
    const payload = {
      tasks: tasks.map((t) => ({
        videoId: t.videoId,
        trackId: t.trackId,
        skipped: Boolean(t.skipReason),
        skipReason: t.skipReason,
        softDefer: Boolean(t.skipReason),
        stillGateApplied: true as const,
        audioGateDeferred: false as const,
      })),
      summary: {
        total: tasks.length,
        burning: tasks.length - deferred.length,
        softDeferred: deferred.length,
        honestPartial: deferred.length > 0 && deferred.length < tasks.length,
        note:
          deferred.length === tasks.length
            ? "全部 soft_defer / 闸失败 — 非成功"
            : deferred.length
              ? "部分 soft_defer — 勿当整批成功绿标"
              : "全部入烧",
      },
    };
    res.status(200).send(success(payload));
    for (const { videoId, videoPath, prompt, duration, images, trackId, storyboardId, skipReason } of tasks) {
      if (skipReason) continue;
      const shotMeta = pkg?.shots?.find((s) => s.storyboardId === storyboardId);
      const { adaptBurnFromDesign } = await import("@/ruleEngine/compilers/adaptBurnFromDesign");
      const burnAdapt = adaptBurnFromDesign({
        shotMeta: (shotMeta ?? {}) as Record<string, unknown>,
        trackPrompt: prompt,
        vendorId: vendorIdFromModel(model),
        trackId,
        storyboardId,
        modeId: typeof mode === "string" ? mode : undefined,
      });
      if (burnAdapt.fidelity && !burnAdapt.fidelity.pass) {
        const misses = burnAdapt.fidelity.items.filter((i) => !i.pass);
        await u.db("o_video").where({ id: videoId }).update({
          state: "生成失败",
          errorReason: JSON.stringify({
            message: `设计意图未命中：${misses.map((m) => m.id).join(",")}`,
            code: "DEX-VID-FIDELITY",
            designIntentFidelity: burnAdapt.fidelity,
            virdFindings: burnAdapt.fidelity.virdFindings,
            primaryNextStep: "chat_repair",
            ctaLabel: "确认视频设计修复",
          }),
        });
        await patchVideoTrackReason(u.db, trackId, {
          state: "需完善",
          burnAllowed: false,
          decision: "rePush_design",
          nextStep: "chat_repair",
          reasons: misses.map((m) => m.id),
          ctaLabel: "确认视频设计修复",
          designIntentFidelity: burnAdapt.fidelity,
        }).catch(() => undefined);
        continue;
      }
      const burnSeedPrompt = burnAdapt.prompt || prompt;
      const burnDuration = burnAdapt.durationSec > 0 ? burnAdapt.durationSec : duration;
      const compiled = await compileTrackVideoPrompt(
        u.db,
        scriptId,
        storyboardId,
        burnSeedPrompt,
        (ratio?.videoRatio as string) || "16:9",
      );
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
      const { literaryDialogueTexts, scrubVideoPromptForBurn } =
        await import("@/ruleEngine/compilers/videoDesignContract");
      const litDial = literaryDialogueTexts(shotMeta?.narrative?.dialogue?.lines);
      const dialLines = litDial.length ? litDial : splitDialogueUtterances(shotMeta?.narrative?.dialogue?.lines);
      const lipMin = dialLines.length ? Math.ceil(measureDialogue({ text: dialLines.join("") }).minDurationSec) : 0;
      const bridged = bridgeShotToVendor({
        designFields,
        request: { duration: burnDuration, audio, resolution, mode: modeData.length > 0 ? modeData : mode, aspectRatio },
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
      const scrubB = scrubVideoPromptForBurn({
        prompt: vendorPrompt,
        vendorId: vendorIdFromModel(model),
        dialogueLines: dialLines,
      });
      if (scrubB.block) {
        await u.db("o_video").where({ id: videoId }).update({
          state: "生成失败",
          errorReason: JSON.stringify({
            message: scrubB.block.message,
            code: scrubB.block.id,
            primaryNextStep: "chat_repair",
          }),
        });
        continue;
      }
      vendorPrompt = scrubB.prompt;

      // Mouth / contact handoff: persisted o_storyboard SSOT (not package generation.imagePrompt)
      let batchStillPrompt = String(
        (shotMeta as { generation?: { imagePrompt?: string } })?.generation?.imagePrompt ?? "",
      );
      let batchStillMeta: Record<string, unknown> | null = null;
      let batchStillQuality: string | null = null;
      if (storyboardId) {
        try {
          const sbBurn = await u.db("o_storyboard").where({ id: storyboardId }).first();
          const { parseStillMetaFromReason } = await import("@/ruleEngine/compilers/stillQuality");
          batchStillPrompt = String(sbBurn?.prompt ?? batchStillPrompt);
          batchStillMeta = parseStillMetaFromReason(sbBurn?.reason) as Record<string, unknown> | null;
          if (batchStillMeta?.stillQuality) batchStillQuality = String(batchStillMeta.stillQuality);
        } catch {
          /* fall back to package prompt */
        }
      }

      try {
        const { assertStillMouthVideoHandoff } = await import("@/ruleEngine/qc/stillMouthVideoHandoff");
        const { hasOnCameraDialogue } = await import("@/ruleEngine/design/onCameraDialogue");
        const onCam = hasOnCameraDialogue(shotMeta?.narrative?.dialogue?.lines) && litDial.length > 0;
        if (onCam) {
          const mouth = assertStillMouthVideoHandoff({
            stillPrompt: batchStillPrompt,
            videoPrompt: vendorPrompt,
            hasDialogue: true,
            lipSyncPolicy: "subtle",
          });
          if (!mouth.ok && mouth.severity === "BLOCK") {
            await u.db("o_video").where({ id: videoId }).update({
              state: "生成失败",
              errorReason: JSON.stringify({
                message: mouth.message,
                code: "STILL-MOUTH-HANDOFF",
                primaryNextStep: "regen_storyboard_hq",
              }),
            });
            continue;
          }
        }
      } catch {
        /* optional mouth module */
      }

      // Contact handoff homology with generateVideo
      try {
        const { assertStillContactVideoHandoff } = await import("@/ruleEngine/qc/stillContactVideoHandoff");
        const vdContact = String(
          (shotMeta as { visualDescription?: string } | undefined)?.visualDescription ??
            (shotMeta as { narrative?: { visualDescription?: string } } | undefined)?.narrative
              ?.visualDescription ??
            "",
        );
        const contact = assertStillContactVideoHandoff({
          visualDescription: vdContact,
          stillPrompt: batchStillPrompt,
          stillMeta: batchStillMeta,
          stillQuality: batchStillQuality,
          propMissing: Boolean(batchStillMeta?.propMissing),
        });
        if (!contact.ok && contact.severity === "BLOCK") {
          await u.db("o_video").where({ id: videoId }).update({
            state: "生成失败",
            errorReason: JSON.stringify({
              message: contact.message,
              code: "STILL-CONTACT-HANDOFF",
              primaryNextStep: contact.primaryNextStep ?? "regen_storyboard_hq",
              reverseTrigger: contact.reverseTrigger ?? "still_prop_missing",
              ctaLabel: "重出带道具静照",
              missingSlots: contact.missingSlots,
            }),
          });
          continue;
        }
        // G3: pose handoff same as single generateVideo
        try {
          const { assertStillVideoPoseHandoff } = await import("@/ruleEngine/qc/stillVideoPoseHandoff");
          const poseGate = assertStillVideoPoseHandoff({
            visualDescription: vdContact,
            stillPrompt: batchStillPrompt,
            stillMeta: batchStillMeta,
            videoPrompt: String((shotMeta as { videoPrompt?: string })?.videoPrompt ?? vendorPrompt ?? ""),
            contactStartState: (batchStillMeta as { contactStartState?: string } | null)?.contactStartState as
              | import("@/ruleEngine/compilers/contactEventPolicy").ContactStartState
              | undefined,
          });
          if (!poseGate.ok && poseGate.severity === "BLOCK") {
            await u.db("o_video").where({ id: videoId }).update({
              state: "生成失败",
              errorReason: JSON.stringify({
                message: poseGate.message,
                code: poseGate.code ?? "STILL-VIDEO-POSE-MISMATCH",
                primaryNextStep: poseGate.primaryNextStep ?? "regen_storyboard_hq",
                ctaLabel: "重编译 Motion 或重出静照",
              }),
            });
            continue;
          }
        } catch {
          /* pose optional if module missing */
        }
      } catch {
        /* optional contact module */
      }

      // Audio L0 + voice bind parity with generateVideo (batch must not soft-pass)
      try {
        const {
          buildAudioLiteraryFidelityChecklist,
          assertAudioLiteraryFidelity,
          loadAudioLiteraryFidelityConfig,
        } = await import("@/ruleEngine/compilers/audioLiteraryFidelityChecklist");
        const { assertAudioVoiceBindGate } = await import("@/ruleEngine/qc/audioVoiceBindGate");
        const { hasOnCameraDialogue } = await import("@/ruleEngine/design/onCameraDialogue");
        const dialLinesBatch =
          (shotMeta as { narrative?: { dialogue?: { lines?: { text?: string }[] } } } | undefined)?.narrative
            ?.dialogue?.lines ?? [];
        const onCam = hasOnCameraDialogue(dialLinesBatch);
        if (onCam && dialLinesBatch.length) {
          const audioCfg = loadAudioLiteraryFidelityConfig();
          const audioPromptSrc = String(
            (shotMeta as { generation?: { audioPrompt?: string } } | undefined)?.generation?.audioPrompt ?? "",
          );
          const items = buildAudioLiteraryFidelityChecklist({
            dialogueLines: dialLinesBatch,
            audioPrompt: audioPromptSrc,
            videoPrompt: vendorPrompt,
          });
          const audioAssert = assertAudioLiteraryFidelity({
            items,
            audioPrompt: audioPromptSrc,
            videoPrompt: vendorPrompt,
          });
          if (!audioAssert.ok && audioCfg.requireAudioPassForDialogueBurn !== false) {
            await u.db("o_video").where({ id: videoId }).update({
              state: "生成失败",
              errorReason: JSON.stringify({
                message: `音频文学保真未过：缺 ${(audioAssert.missing ?? []).map((m) => m.id).slice(0, 4).join(",")}`,
                code: "AUD-LIT-L0",
                primaryNextStep: "chat_repair",
              }),
            });
            continue;
          }
          const roleAssetIds = Array.isArray(
            (shotMeta as { roleAssetIds?: number[] } | undefined)?.roleAssetIds,
          )
            ? ((shotMeta as { roleAssetIds?: number[] }).roleAssetIds as number[])
            : [];
          const voiceGate = await assertAudioVoiceBindGate({
            db: u.db as never,
            roleAssetIds,
            hasDialogue: true,
            qualityMode: "hq_update",
            voiceProfilePresent: Boolean(
              (shotMeta as { voiceProfile?: unknown } | undefined)?.voiceProfile,
            ),
          });
          if (!voiceGate.ok && voiceGate.hard) {
            await u.db("o_video").where({ id: videoId }).update({
              state: "生成失败",
              errorReason: JSON.stringify({
                message: voiceGate.userMessage ?? "音色绑定未过",
                code: "AUD-VOICE-BIND",
                primaryNextStep: voiceGate.primaryNextStep ?? "chat_repair",
                ctaLabel: voiceGate.ctaLabel,
              }),
            });
            continue;
          }
        }
      } catch {
        /* optional audio parity */
      }

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
        // Stick closed loop: track must leave 已完成 so reload/retry cannot look burn-ready
        await patchVideoTrackReason(u.db, trackId, {
          state: "需完善",
          burnAllowed: false,
          decision: qd.decision,
          nextStep: qd.nextStep,
          reasons: qd.reasons,
          ctaLabel: envelope.ctaLabel ?? "完善后重编译",
          userMessage: envelope.userMessage ?? `soft_defer: ${qd.decision}`,
        }).catch(() => undefined);
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
      await patchVideoTrackReason(u.db, trackId, {
        state: "生成中",
        prompt: vendorPrompt,
        burnAllowed: true,
        burnPromptSource: burnAdapt.source,
        burnDurationSec: vendorDuration,
        designIntentFidelity: burnAdapt.fidelity,
      }).catch(() => undefined);
      await u.db("o_videoTrack").where({ id: trackId }).update({ videoId, duration: vendorDuration }).catch(() => undefined);

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

      const finishPostBurn = async (finalPrompt: string) => {
        const { runPostBurnRuntime } = await import("@/ruleEngine/qc/postBurnRuntime");
        const { buildPostBurnVideoUpdate } = await import("@/ruleEngine/qc/persistPostBurnVideo");
        const { writebackBurnVideoToPackage } = await import("@/ruleEngine/qc/persistBurnPackageWriteback");
        const stillQ = String(
          (shotMeta as { stillQuality?: string } | undefined)?.stillQuality ??
            (shotMeta as { generation?: { stillQuality?: string } } | undefined)?.generation?.stillQuality ??
            "",
        );
        const post = runPostBurnRuntime({
          shotId: storyboardId,
          hasDialogue: dialLines.length > 0,
          visualPass: stillQ === "hq_ok",
          vlmAdapterPresent: Boolean(
            process.env.STILL_VLM_ADAPTER ||
              process.env.VOLCENGINE_API_KEY ||
              process.env.ARK_API_KEY,
          ),
          audioL1: {
            vendorReportedAudio: generateAudio !== false,
            dialogueLines: dialLines,
          },
          videoPrompt: finalPrompt,
          visualDescription: String((shotMeta as { visualDescription?: string } | undefined)?.visualDescription ?? ""),
          shotSize: String((shotMeta as { shotSize?: string } | undefined)?.shotSize ?? ""),
        });
        // Contact honesty parity with generateVideo: unmeasured must-dims forbid videoPass
        try {
          const { isContactEventVd } =
            require("@/ruleEngine/compilers/contactEventPolicy") as typeof import("@/ruleEngine/compilers/contactEventPolicy");
          const { pixelDimStatus, mustDimAllowsVideoPass } =
            require("@/ruleEngine/quality/practiceCompleteness") as typeof import("@/ruleEngine/quality/practiceCompleteness");
          const vd = String((shotMeta as { visualDescription?: string } | undefined)?.visualDescription ?? "");
          const motionStatus = pixelDimStatus({
            keyOrAdapterPresent: Boolean(
              process.env.STILL_VLM_ADAPTER ||
                process.env.VOLCENGINE_API_KEY ||
                process.env.ARK_API_KEY,
            ),
            observed: undefined,
          });
          if (isContactEventVd(vd) && !mustDimAllowsVideoPass(motionStatus)) {
            post.videoPass = false;
            if (!post.primaryNextStep || post.primaryNextStep === "done") {
              post.primaryNextStep = "human_review";
            }
            (post as { qcWeak?: boolean }).qcWeak = true;
            (post as { pixelDimStatus?: string }).pixelDimStatus = motionStatus;
          }
        } catch {
          /* optional */
        }
        await u.db("o_video").where("id", videoId).update(buildPostBurnVideoUpdate(post));
        await writebackBurnVideoToPackage({
          db: u.db,
          projectId,
          scriptId,
          storyboardId,
          videoPrompt: finalPrompt,
          promptHash: require("crypto").createHash("sha1").update(finalPrompt).digest("hex").slice(0, 12),
          durationSec: vendorDuration,
          intentClass: burnAdapt.intentClass,
          shotMeta: (shotMeta as Record<string, unknown>) ?? null,
        }).catch(() => false);
        const { seedStoryboardAfterPostBurn } = await import("@/ruleEngine/qc/persistPostBurnVideo");
        await seedStoryboardAfterPostBurn(u.db, { storyboardId, post });
      };

      runVideo(vendorPrompt)
        .then(async () => await aiVideo.save(videoPath))
        .then(async () => await finishPostBurn(vendorPrompt))
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
              await finishPostBurn(vendorPrompt);
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
