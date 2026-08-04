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

    let storyboardIds = [
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
      if (!epStill.ok && epStill.blockers.length) {
        return res.status(400).send(
          error(epStill.blockers[0]?.message ?? "EPISODE-STILL-WEAK", {
            code: "EPISODE-STILL-WEAK",
            blockers: epStill.blockers,
            primaryNextStep: "batch_still",
          }),
        );
      }
      // Weak contact shots → heal queue; filter burn set to burnableIds when present
      if (epStill.healQueue?.length && epStill.burnableIds?.length) {
        storyboardIds = epStill.burnableIds.filter((id) => storyboardIds.includes(id));
      } else if (epStill.healQueue?.length && !epStill.burnableIds?.length) {
        return res.status(400).send(
          error("接触镜均未 hq，已入修复队列（不砖他集策略）；请先修静帧", {
            code: "EPISODE-STILL-HEAL-QUEUE",
            healQueue: epStill.healQueue,
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
    // heal_then_burn：仓债不硬拒 — 吸收后继续批量烧（实现已降级反馈）
    {
      const { readWarehouseDebtFromPackage, warehouseDebtBlocksVideo } =
        require("@/ruleEngine/bundle/warehouseDebtMeta") as typeof import("@/ruleEngine/bundle/warehouseDebtMeta");
      const debt = readWarehouseDebtFromPackage(pkg);
      if (warehouseDebtBlocksVideo(debt) && pkg) {
        const meta = ((pkg as { meta?: Record<string, unknown> }).meta ??= {});
        meta.lipConfirmRequired = false;
        meta.importOkNotExitPass = false;
        meta.irdConfirmRequired = false;
        meta.implementationDegraded = true;
        meta.healThenBurnAbsorbed = ["warehouseDebt"];
        try {
          const { saveEpisodePackage } = await import("@/ruleEngine/storage/episodePackageStore");
          await saveEpisodePackage(u.db, pkg);
        } catch {
          /* best-effort */
        }
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

        // heal_then_burn：需完善不跳过 — 吸收后继续本轨烧片
        {
          const trackRow = await u
            .db("o_videoTrack")
            .where({ id: trackId })
            .select("state", "reason")
            .first();
          let burnAllowedMeta: boolean | undefined;
          let reasonObj: Record<string, unknown> = {};
          try {
            const r =
              typeof trackRow?.reason === "string" && String(trackRow.reason).trim().startsWith("{")
                ? JSON.parse(trackRow.reason)
                : null;
            if (r && typeof r === "object") reasonObj = r;
            if (r && typeof r.burnAllowed === "boolean") burnAllowedMeta = r.burnAllowed;
          } catch {
            /* ignore */
          }
          if (trackRow?.state === "需完善" || burnAllowedMeta === false) {
            await u.db("o_videoTrack").where({ id: trackId }).update({
              state: "已完成",
              reason: JSON.stringify({
                ...reasonObj,
                burnAllowed: true,
                healThenBurn: true,
                implementationDegraded: true,
                userMessage: "实现已降级：契约债已智能吸收后继续烧",
              }),
            });
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
            // Vendor egress for gates — literary o_storyboard.prompt is edit SSOT only
            const stillPrompt =
              String(stillMeta?.promptUsed ?? "").trim() || String(sbRow?.prompt ?? "");
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
            if (!detect.ok || (!ff.ok && (ff.severity === "BLOCK" || ff.severity === "HEAL" || ff.severity === "CONTRACT"))) {
              // heal_then_burn: soft_defer this shot, never 400 the whole episode
              const msg = detect.message || ff.message || "静照首帧契约债 — 已入 heal 队列";
              const code = detect.code ?? ff.code ?? "STILL-FIRSTFRAME-WEAK";
              const videoPath = `/${projectId}/video/${uuidv4()}.mp4`;
              const [videoId] = await u.db("o_video").insert({
                filePath: videoPath,
                time: Date.now(),
                state: "需完善",
                scriptId,
                projectId,
                videoTrackId: trackId,
                errorReason: JSON.stringify({
                  message: msg,
                  code,
                  softDefer: true,
                  primaryNextStep: detect.primaryNextStep ?? ff.primaryNextStep ?? "batch_still",
                  userMessage: `${msg}；请增强静帧后继续烧`,
                  irdPrimaryAction: detect.irdPrimaryAction,
                  missingSlots: detect.missingSlots,
                  ctaLabel: detect.ctaLabel ?? "智能修复",
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
                        // Wave-2: chain stale after heal — soft absorb, continue burn with live hash
                        const msg =
                          eg.findings[0]?.message || eg2.findings[0]?.message || "设计/对白已变，已用最新指纹续烧";
                        stamped = liveHash;
                        const note = `${msg}（VIDEO-PROMPT-STALE）·链路债已标·可智能修复·可降级烧`;
                        if (shotOverride && typeof shotOverride === "object") {
                          (shotOverride as { __softDebtNotes?: string[] }).__softDebtNotes = [
                            ...(((shotOverride as { __softDebtNotes?: string[] }).__softDebtNotes) ?? []),
                            note,
                          ];
                        }                      }
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

    // Episode AV preflight — per-shot adapt + cross-shot polish (feature-flagged)
    let episodeAvMetrics: import("@/ruleEngine/quality/episodeAvEnhanceOrchestrator").EpisodeAvMetrics | null =
      null;
    let episodeAvAdaptSummary: string | undefined;
    try {
      const { runEpisodeAvEnhanceOrchestrator, episodeAvMetricsSummary } =
        await import("@/ruleEngine/quality/episodeAvEnhanceOrchestrator");
      const { episodeInputsFromPackageShots, persistEpisodeAvEnhanceToShots } =
        await import("@/ruleEngine/compilers/persistEpisodeAvEnhance");
      const shotInputs = tasks
        .filter((t) => !t.skipReason)
        .map((t) => {
          const sm = (pkg?.shots?.find((s) => s.storyboardId === t.storyboardId) ?? {}) as Record<
            string,
            unknown
          >;
          const base = episodeInputsFromPackageShots([
            { ...sm, duration: t.duration ?? sm.duration },
          ])[0]!;
          return base;
        })
        .filter((s) => s.shotMeta && Object.keys(s.shotMeta).length > 0);
      if (shotInputs.length) {
        const epResult = runEpisodeAvEnhanceOrchestrator({ shots: shotInputs });
        episodeAvMetrics = epResult.metrics;
        episodeAvAdaptSummary = episodeAvMetricsSummary(epResult.metrics);
        if (pkg?.shots?.length) {
          persistEpisodeAvEnhanceToShots({
            packageShots: pkg.shots as unknown as Array<Record<string, unknown>>,
            results: epResult.shots,
          });
        }
      }
    } catch {
      /* optional episode orchestrator */
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
        adaptedShots: episodeAvMetrics?.adaptHitCount ?? 0,
        adaptMetrics: episodeAvMetrics ?? undefined,
        adaptSummary: episodeAvAdaptSummary,
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
        // Wave-2 parity with single: soft absorb fidelity debt, continue burn
        const { fidelityMissesBlockAbsorb } =
          require("@/ruleEngine/compilers/burnAbsorbPolicy") as typeof import("@/ruleEngine/compilers/burnAbsorbPolicy");
        const critical = fidelityMissesBlockAbsorb(burnAdapt.fidelity.items);
        const misses = burnAdapt.fidelity.items.filter((it) => !it.pass);
        const note = critical.length
          ? `设计意图关键项未尽（禁假绿）：${critical.map((m) => m.id).join(", ")}`
          : `设计意图未尽命中已降级继续烧：${misses.map((m) => m.id).join(", ")}`;
        const softNote = `${note}·可智能修复·可降级烧`;
        if (shotOverride && typeof shotOverride === "object") {
          (shotOverride as { __softDebtNotes?: string[] }).__softDebtNotes = [
            ...(((shotOverride as { __softDebtNotes?: string[] }).__softDebtNotes) ?? []),
            softNote,
          ];
        }
        await patchVideoTrackReason(u.db, trackId, {
          state: "需完善",
          burnAllowed: true,
          decision: "soft_defer",
          nextStep: "chat_repair",
          reasons: misses.map((m) => m.id),
          ctaLabel: "智能修复",
          designIntentFidelity: burnAdapt.fidelity,
          healThenBurn: true,
          healThenBurnNotes: [softNote],
        }).catch(() => undefined);
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
      const batchHealNotes: string[] = [];
      {
        const soft = (shotOverride as { __softDebtNotes?: string[] } | undefined)?.__softDebtNotes;
        if (Array.isArray(soft) && soft.length) batchHealNotes.push(...soft);
      }
      const aspectRatio = (compiled.aspectRatio ?? ratio?.videoRatio ?? "16:9") as "16:9" | "9:16";
      const capability = resolveVendorCapability(vendorIdFromModel(model));
      const { literaryDialogueTexts, scrubVideoPromptForBurn } =
        await import("@/ruleEngine/compilers/videoDesignContract");
      const litDial = literaryDialogueTexts(shotMeta?.narrative?.dialogue?.lines);
      const dialLines = litDial.length ? litDial : splitDialogueUtterances(shotMeta?.narrative?.dialogue?.lines);
      // LANG-01 hard gate after registry (prevent EN dual-track re-entry)
      if (litDial.length) {
        try {
          const { checkLangVid01 } = await import("@/ruleEngine/validators/langAudFxCam");
          const langHit = checkLangVid01({
            dialogueLines: litDial.join("\n"),
            videoPrompt: vendorPrompt,
            shotIndex: Number((shotMeta as { shotIndex?: number })?.shotIndex ?? 0) || undefined,
          });
          if (langHit) {
            batchHealNotes.push(langHit.message || "LANG-01 已标债·智能修复");
            // Wave-2 never-block: soft continue (homology generateVideo)
          }
        } catch {
          /* optional */
        }
      }
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
        batchHealNotes.push(`${scrubB.block.message}·运镜调解债已标·可智能修复·可降级烧`);
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
        const { resolveLipSyncPolicyFromShot } = await import("@/ruleEngine/quality/resolveLipSyncPolicy");
        const onCam = hasOnCameraDialogue(shotMeta?.narrative?.dialogue?.lines) && litDial.length > 0;
        if (onCam) {
          const mouth = assertStillMouthVideoHandoff({
            stillPrompt: batchStillPrompt,
            videoPrompt: vendorPrompt,
            hasDialogue: true,
            lipSyncPolicy:
              resolveLipSyncPolicyFromShot(shotMeta as Record<string, unknown> | undefined) || "subtle_natural",
          });
          if (!mouth.ok && mouth.severity === "BLOCK") {
            batchHealNotes.push(mouth.message || "口型交接债已吸收·可烧视频");
          } else if (!mouth.ok && mouth.strengthen) {
            vendorPrompt = finalizeFiveSectionPrompt({
              prompt: vendorPrompt,
              dialogueLines: dialLines,
              durationSec: bridged.params.duration,
              preferStaticOnDialogue: dialLines.length > 0,
              strengthen: mouth.strengthen,
            }).prompt;
            batchHealNotes.push(mouth.message || "口型已 soft 降级·可烧视频");
          }
        }
      } catch {
        /* optional mouth module */
      }

      // I2V readiness + contact handoff homology with generateVideo
      try {
        const vdContact = String(
          (shotMeta as { visualDescription?: string } | undefined)?.visualDescription ??
            (shotMeta as { narrative?: { visualDescription?: string } } | undefined)?.narrative
              ?.visualDescription ??
            "",
        );
        try {
          const { assessStillVideoReadiness } = await import("@/ruleEngine/qc/stillVideoReadiness");
          const readiness = assessStillVideoReadiness({
            stillQuality: batchStillQuality,
            visualPass: (batchStillMeta as { visualPass?: boolean } | null)?.visualPass ?? null,
            sheetLeak: Boolean((batchStillMeta as { sheetLeak?: boolean } | null)?.sheetLeak),
            fidelityItems: ((batchStillMeta as { fidelityItems?: Array<{ id: string; pass: boolean }> } | null)
              ?.fidelityItems ?? []) as Array<{ id: string; pass: boolean }>,
            promptUsed: batchStillPrompt,
            visualDescription: vdContact,
            i2vCriticalFacts:
              ((batchStillMeta as { i2vCriticalFacts?: string[] } | null)?.i2vCriticalFacts ??
                (batchStillMeta as { generationContract?: { i2vCriticalFacts?: string[] } } | null)
                  ?.generationContract?.i2vCriticalFacts ??
                null) as string[] | null,
            contract:
              ((batchStillMeta as { generationContract?: unknown } | null)?.generationContract ??
                null) as import("@/ruleEngine/design/deriveGenerationContract").GenerationContract | null,
            stillMeta: batchStillMeta as Record<string, unknown> | null,
          });
          const softMisses = (readiness.softMisses ?? []).filter(Boolean);
          const hardMisses = (readiness.hardMisses ?? []).filter(Boolean);
          const { mayAbsorbBurnDebt } = await import("@/ruleEngine/compilers/burnAbsorbPolicy");
          if (readiness.i2vReady && softMisses.length && mayAbsorbBurnDebt("still_i2v_ready")) {
            batchHealNotes.push(
              `首帧债已吸收（${softMisses.slice(0, 4).join(",")}）·可烧视频`,
            );
          } else if (!readiness.i2vReady) {
            const qStill = String(batchStillQuality ?? "");
            const softOnly =
              hardMisses.length === 0 &&
              qStill !== "missing" &&
              mayAbsorbBurnDebt("still_i2v_ready");
            if (softOnly) {
              batchHealNotes.push(
                softMisses.length
                  ? `首帧债已吸收（${softMisses.slice(0, 4).join(",")}）·可烧视频`
                  : "首帧债已吸收·可烧视频（设计意图优先）",
              );
            } else {
              // Wave-2 never-block: homology generateVideo — soft absorb + continue
              batchHealNotes.push(
                `I2V就绪债已吸收（${(hardMisses.length ? hardMisses : readiness.criticalMisses ?? [])
                  .slice(0, 3)
                  .join(",") || readiness.reason}）·已标债可智能修复·可降级烧`,
              );
            }
          }
        } catch {
          /* readiness optional if module missing */
        }
        const { assertStillContactVideoHandoff } = await import("@/ruleEngine/qc/stillContactVideoHandoff");
        const contact = assertStillContactVideoHandoff({
          visualDescription: vdContact,
          stillPrompt: batchStillPrompt,
          stillMeta: batchStillMeta,
          stillQuality: batchStillQuality,
          propMissing: Boolean(batchStillMeta?.propMissing),
        });
        if (!contact.ok && contact.severity === "BLOCK") {
          batchHealNotes.push(
            contact.message || "接触交接债已吸收·可降级烧·智能修复重出带道具静照",
          );
        } else if (contact.severity === "WARN" && contact.message) {
          batchHealNotes.push(contact.message);
        }
        // Motion 起态写入 [Motion] — homology with generateVideo
        const stillPhaseBatch = String(
          (batchStillMeta as { stillPhase?: string } | null)?.stillPhase ??
            (batchStillMeta as { narrative?: { stillPhase?: string } } | null)?.narrative?.stillPhase ??
            "",
        );
        let motionHint = String(
          (batchStillMeta as { videoMotionStartHint?: string } | null)?.videoMotionStartHint ??
            (batchStillMeta as { generationContract?: { videoMotionStartHint?: string } } | null)
              ?.generationContract?.videoMotionStartHint ??
            "",
        ).trim();
        if (stillPhaseBatch === "held" && !/禁止再.*弯腰|持态/.test(motionHint)) {
          motionHint = [motionHint, "从静帧持态起，禁止再弯腰触及"].filter(Boolean).join("；");
        }
        if (stillPhaseBatch === "approaching" && !/接近未握|尚未捏紧/.test(motionHint)) {
          motionHint = [motionHint, "起态=接近未握，Motion可递进至触及捏紧"].filter(Boolean).join("；");
        }
        if (motionHint && !/禁止弯腰绿继承/.test(motionHint)) {
          const slice = motionHint.slice(0, Math.min(10, motionHint.length));
          if (!vendorPrompt.includes(slice)) {
            const mAt = vendorPrompt.search(/\[Motion\]/i);
            if (mAt >= 0) {
              const after = vendorPrompt.slice(mAt);
              const nl = after.indexOf("\n");
              const insertAt = mAt + (nl >= 0 ? nl + 1 : 8);
              vendorPrompt = `${vendorPrompt.slice(0, insertAt)}${motionHint}\n${vendorPrompt.slice(insertAt)}`.trim();
            } else {
              vendorPrompt = `${vendorPrompt}\n[Motion]\n${motionHint}`.trim();
            }
          }
        }
        // G3: pose handoff — absorb BLOCK (intent-first), homology with generateVideo
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
            batchHealNotes.push(poseGate.message || "姿态交接债已吸收·可烧视频");
          } else if (poseGate.code === "REALIZATION-MOTION-MISMATCH" && poseGate.message) {
            batchHealNotes.push(poseGate.message);
          }
          try {
            const { assertFaceReadableHandoff, assessFaceBudget } =
              await import("@/ruleEngine/compilers/faceBudgetPolicy");
            const { hasOnCameraDialogue } = await import("@/ruleEngine/design/onCameraDialogue");
            const onCamFace = hasOnCameraDialogue(
              (shotMeta as { narrative?: { dialogue?: { lines?: unknown } } })?.narrative?.dialogue?.lines,
            );
            const faceGate = assertFaceReadableHandoff({
              hasDialogue: onCamFace,
              stillMeta: batchStillMeta,
              visualDescription: vdContact,
              shotSize: String((shotMeta as { shotSize?: string })?.shotSize ?? ""),
            });
            if (faceGate.severity === "WARN" && faceGate.message) batchHealNotes.push(faceGate.message);
            const budget = assessFaceBudget({
              visualDescription: vdContact,
              shotSize: String((shotMeta as { shotSize?: string })?.shotSize ?? ""),
              hasDialogue: onCamFace,
              lipSyncPolicy: String(
                (shotMeta as { shotDesign?: { lipSyncPolicy?: string } })?.shotDesign?.lipSyncPolicy ?? "",
              ),
              realizationOccupancy: String(
                (batchStillMeta as { realizationOccupancy?: string } | null)?.realizationOccupancy ?? "",
              ),
              videoIntentClass: onCamFace ? "speak_lip" : undefined,
            });
            if (budget.unreachable) {
              batchHealNotes.push(
                `脸预算不可达：${budget.reason ?? "须 Confirm 拆镜"}（${budget.splitHint ?? "action_then_dialogue_mcu"}）`,
              );
            }
          } catch {
            /* optional */
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
            batchHealNotes.push(
              `音轨文学保真缺项已标债（${(audioAssert.missing ?? []).map((m) => m.id).slice(0, 4).join(",")}）·可智能修复·可降级烧`,
            );
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
            batchHealNotes.push(
              `${voiceGate.userMessage ?? "音色绑定未过"}·已标债·可智能修复·可降级烧`,
            );
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
          ctaLabel: envelope.ctaLabel ?? "智能修复",
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
      // LANG-01 again on packed egress (homology with generateVideo)
      if (litDial.length) {
        try {
          const { checkLangVid01 } = await import("@/ruleEngine/validators/langAudFxCam");
          const langHit2 = checkLangVid01({
            dialogueLines: litDial.join("\n"),
            videoPrompt: vendorPrompt,
          });
          if (langHit2) {
            batchHealNotes.push(langHit2.message || "LANG-01 egress 已标债·智能修复");
          }
        } catch {
          /* optional */
        }
      }
      const generateAudio = packed.audio;
      const vendorDuration = packed.duration;

      // Soft-defer: lip snap impossible
      if (bridged.durationSnapOk === false || packed.warnings.some((w) => /split required/i.test(w))) {
        // Wave-2 parity with single: mark debt, do not skip burn
        const envelope = buildBurnGateEnvelope(
          [
            {
              id: "LIP-01",
              message: packed.warnings.find((w) => /split|lip/i.test(w)) ?? "口型时长无法落入厂商桶",
              reverseTrigger: "pr_lip_duration",
            },
          ],
          { decision: "soft_defer", nextStep: "split_shot" },
        );
        await persistSplitHintSuggestion({
          db: u.db,
          projectId,
          scriptId,
          storyboardId,
          splitHint: "reaction_shot",
        }).catch(() => false);
        batchHealNotes.push(
          envelope.userMessage ||
            `口型时长预算紧张·已标债建议拆镜·可智能修复·可降级烧（${[...bridged.warnings, ...packed.warnings]
              .slice(0, 2)
              .join("; ")}）`,
        );
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
        ...(batchHealNotes.length
          ? {
              healThenBurn: true,
              healThenBurnNotes: batchHealNotes,
              implementationDegraded: true,
              ctaLabel: "智能修复",
              debtLedger: batchHealNotes.map((n, i) => ({
                id: `note_${i}`,
                label: n.length > 36 ? `${n.slice(0, 36)}…` : n,
              })),
              repairChangelog: Array.isArray(
                (shotMeta as { repairChangelog?: unknown })?.repairChangelog,
              )
                ? (shotMeta as { repairChangelog: unknown[] }).repairChangelog.slice(-8)
                : [],
            }
          : {}),
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
