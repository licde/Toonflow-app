import express from "express";
import u from "@/utils";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { ReferenceList } from "@/utils/ai";
import { classifyGenerationFailure } from "@/ruleEngine/bundle/generationFailureHelper";
import { compileTrackVideoPrompt } from "@/ruleEngine/compilers/videoTrackCompiler";
import { precheckContentPolicy } from "@/ruleEngine/compilers/contentPolicyAdapter";
import { loadEpisodePackage } from "@/ruleEngine/storage/episodePackageStore";
import { buildExtractContext, extractDesignFields } from "@/ruleEngine/design/designFieldRegistry";
import { bridgeShotToVendor, applyTextHardening } from "@/ruleEngine/compilers/shotVendorBridge";
import { gateIdentityForShot } from "@/ruleEngine/compilers/resolveShotIdentity";
import { resolveVendorCapability, vendorIdFromModel } from "@/ruleEngine/compilers/vendorCapabilityMap";
import { collectAudioBindGaps } from "@/ruleEngine/compilers/audioBindDelivery";
import { buildBurnGateEnvelope } from "@/ruleEngine/compilers/burnGateEnvelope";
import { applyVendorPromptPack } from "@/ruleEngine/vendor-packs/videoVendorPack";
import { finalizeFiveSectionPrompt } from "@/ruleEngine/compilers/finalizeFiveSectionPrompt";
import { decideVideoQuality, serializeQualityDecision } from "@/ruleEngine/compilers/qualityDecision";
import { splitDialogueUtterances } from "@/ruleEngine/dialogueMetrics";
import { resolveLipDuration } from "@/ruleEngine/compilers/promptIR";
const router = express.Router();

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
    uploadData: z.array(
      z.object({
        id: z.number(),
        sources: z.string(),
      }),
    ),
    prompt: z.string(),
    model: z.string(),
    mode: z.string(),
    resolution: z.string(),
    duration: z.number(),
    audio: z.boolean().optional(),
    trackId: z.number(),
  }),
  async (req, res) => {
    try {
    const { scriptId, projectId, prompt, uploadData, model, duration, resolution, audio, mode, trackId } = req.body;
    let modeData = [];
    if (Array.isArray(mode)) {
    } else if (typeof mode === "string" && mode.startsWith('["') && mode.endsWith('"]')) {
      try {
        modeData = JSON.parse(mode);
      } catch (e) {}
    }
    const ratio = await u.db("o_project").select("videoRatio").where("id", projectId).first();
    const storyboardId = (uploadData as UploadItem[]).find((item) => item.sources === "storyboard")?.id;
    const pkg = await loadEpisodePackage(u.db, projectId, scriptId);
    const shotMeta = storyboardId != null ? pkg?.shots?.find((s) => s.storyboardId === storyboardId) : undefined;
    const { identity: resolvedId, gate: identityGate, missingQueue } = await gateIdentityForShot({
      db: u.db,
      projectId,
      storyboardId: storyboardId ?? shotMeta?.storyboardId,
      shot: shotMeta,
      extraPrompt: prompt,
    });
    const designFields = extractDesignFields(
      buildExtractContext({
        modality: "video",
        mode: typeof mode === "string" ? mode : "text",
        episodeShot: shotMeta,
        charCodes: resolvedId.charCodes,
      }),
    );
    if (!identityGate.ok) {
      const feedback = await classifyGenerationFailure({
        modality: "video",
        shotId: String(trackId),
        error: `IDENTITY_IMAGE_GAP:${identityGate.gaps.map((g) => `${g.code}:${g.reason}`).join(",")}`,
      });
      let heal: Awaited<ReturnType<typeof import("@/ruleEngine/design/selfHealOrchestrator").runSelfHeal>> | undefined;
      try {
        const { runSelfHeal } = await import("@/ruleEngine/design/selfHealOrchestrator");
        heal = await runSelfHeal({
          projectId,
          scriptId,
          shotId: trackId,
          errorText: `IDENTITY_IMAGE_GAP`,
          jobKind: "video",
          round: 1,
          dryRun: false,
          db: u.db,
          identityGaps: identityGate.gaps,
        });
      } catch {
        /* best-effort */
      }
      const envelope = buildBurnGateEnvelope(
        [
          {
            id: "IMG-CREF",
            message: `身份参考图缺失：${identityGate.gaps.map((g) => g.code).join(",")}`,
            reverseTrigger: identityGate.reverseTrigger ?? "img_cref_missing",
          },
        ],
        { decision: "rePush_design", nextStep: "batch_still" },
      );
      const chatRepairText = [
        "【闭环修复清单 — 身份 cref/静照】",
        `待处理：IMG-CREF`,
        "",
        ...envelope.repairHints.map((h) => `[${h.id}] ${h.chatTemplate ?? ""}`).filter(Boolean),
        "",
        "回推 EN/MD-IMG 仅跳转；请补静照后重试烧视频。",
      ].join("\n");
      return res
        .status(400)
        .send(
          error(`身份参考图缺失：${identityGate.gaps.map((g) => g.code).join(",")}（禁假绿 cref）`, {
            feedback,
            identityGate,
            reverseTrigger: identityGate.reverseTrigger ?? "img_cref_missing",
            missingAssetImageQueue: missingQueue,
            heal,
            healRound: heal?.healRound,
            stillRunner: heal?.stillRunner,
            retrySuggested: heal?.retrySuggested,
            rePushPlan: envelope.rePushPlan,
            repairHints: envelope.repairHints,
            nextStep: envelope.nextStep,
            chatRepairText,
            decision: "rePush_design",
          }),
        );
    }

    const lipForBridge = shotMeta ? resolveLipDuration(shotMeta as never) : null;
    const bridge = bridgeShotToVendor({
      designFields,
      request: {
        duration,
        audio,
        resolution,
        mode,
        aspectRatio: (ratio?.videoRatio as string) || "16:9",
      },
      referenceCount: uploadData?.length ?? 0,
      capability: resolveVendorCapability(vendorIdFromModel(model)),
      lipMin: lipForBridge?.lipMin,
    });

    if (bridge.params.audio) {
      const roleIds = identityGate.bound.filter((b) => /^CHAR-/i.test(b.code)).map((b) => b.assetId);
      const audioBind = await collectAudioBindGaps(u.db, roleIds);
      if (audioBind.audioGap) {
        // Soft warn in payload — dialogue still forces generate_audio native; bound file missing is audioGap
        (req as { __audioGap?: unknown }).__audioGap = audioBind;
      }
    }

    const compiled = await compileTrackVideoPrompt(
      u.db,
      scriptId,
      storyboardId,
      applyTextHardening(prompt, bridge.textHardening),
      (ratio?.videoRatio as string) || "16:9",
    );
    const policy = precheckContentPolicy(compiled.vendorPrompt);
    const vendorPrompt = policy.hasSensitiveTerms ? policy.softenedPrompt : compiled.vendorPrompt;

    // Quality gate: LANG + CAM + FX(F4/F5 only) before burn
    try {
      const { qualityGate } = await import("@/ruleEngine/qualityGate");
      const { flattenDialogueText } = await import("@/ruleEngine/design/dialogueCoverage");
      const dial = flattenDialogueText(shotMeta?.narrative?.dialogue?.lines);
      const shotIndex = Number(shotMeta?.shotIndex ?? shotMeta?.index ?? 1) || 1;
      const fxPrompt = String(shotMeta?.generation?.fxPrompt ?? shotMeta?.fxPrompt ?? "");
      const fxFeasibility = String(
        shotMeta?.generation?.fxFeasibility ?? shotMeta?.fxFeasibility ?? shotMeta?.fxLevel ?? "",
      );
      const qg = qualityGate(
        {
          bundleType: "script",
          script: "",
          preDesignPack: {
            scriptPlan: "",
            shots: [
              {
                shotIndex,
                narrative: {
                  dialogue: shotMeta?.narrative?.dialogue,
                  transitionType: shotMeta?.narrative?.transitionType,
                },
                videoPrompt: vendorPrompt,
                fxFeasibility: fxFeasibility || undefined,
                generation: {
                  videoPrompt: vendorPrompt,
                  audioPrompt: shotMeta?.generation?.audioPrompt,
                  fxPrompt,
                  fxFeasibility: fxFeasibility || undefined,
                },
              },
            ],
          },
        } as never,
        {
          stage: "burn",
          promptOverride: {
            videoPrompt: vendorPrompt,
            audioPrompt: shotMeta?.generation?.audioPrompt,
            dialogueLines: dial,
            shotIndex,
          },
        },
      );
      if (qg.blocked) {
        const envelope = buildBurnGateEnvelope(qg.blocks);
        const chatRepairText = [
          "【闭环修复清单 — 烧片前质量门】",
          `待处理：${qg.blocks.map((b) => b.id).join(", ")}`,
          "",
          ...qg.blocks.slice(0, 24).map((b) => `- ${b.id}: ${b.message}`),
          "",
          ...envelope.repairHints.map((h) => `[${h.id}] ${h.chatTemplate ?? ""}`).filter(Boolean),
          "",
          "回推舞台仅跳转；请改 JSON 后重导/重生。",
        ].join("\n");
        return res.status(400).send(
          error(`触达前质量门禁未通过: ${qg.blocks.map((b) => `${b.id} ${b.message}`).join("; ")}`, {
            qualityGate: qg,
            blocks: qg.blocks,
            rePushPlan: envelope.rePushPlan,
            repairHints: envelope.repairHints,
            nextStep: envelope.nextStep,
            reverseTriggers: envelope.triggers,
            chatRepairText,
            decision:
              envelope.decision ??
              (envelope.nextStep === "split_shot"
                ? "split_shot"
                : envelope.nextStep === "soft_patch"
                  ? "soft_patch"
                  : "rePush_design"),
          }),
        );
      }
    } catch {
      /* best-effort — never skip identity; lang gate failure should not crash */
    }

    const aspectRatio = (compiled.aspectRatio ?? ratio?.videoRatio ?? bridge.params.aspectRatio ?? "16:9") as "16:9" | "9:16";
    const dialLines = splitDialogueUtterances(shotMeta?.narrative?.dialogue?.lines);
    const lip = lipForBridge ?? (shotMeta ? resolveLipDuration(shotMeta as never) : null);
    let burnDuration = Math.max(bridge.params.duration, lip?.durationSec ?? 0) || bridge.params.duration;
    const fin = finalizeFiveSectionPrompt({
      prompt: vendorPrompt,
      dialogueLines: dialLines,
      durationSec: burnDuration,
      preferStaticOnDialogue: dialLines.length > 0,
    });
    let burnPrompt = fin.prompt;

    let stillQuality: "missing" | "weak" | "hq_ok" | null = null;
    let stillMeta: Record<string, unknown> | null = null;
    let stillPromptForHandoff = "";
    try {
      const { inferStillQuality } = await import("@/ruleEngine/compilers/stillQuality");
      const sbRow = await u.db("o_storyboard").where({ id: storyboardId, projectId, scriptId }).first();
      stillPromptForHandoff = String(sbRow?.prompt ?? "");
      try {
        stillMeta = sbRow?.reason ? JSON.parse(String(sbRow.reason)) : null;
      } catch {
        stillMeta = null;
      }
      // G7: only persisted meta.stillQuality === hq_ok with visualPassAt allows burn
      stillQuality = inferStillQuality({
        filePath: sbRow?.filePath,
        imageId: sbRow?.imageId,
        meta: stillMeta?.stillQuality ? (stillMeta as { stillQuality?: "missing" | "weak" | "hq_ok" }) : null,
        requireVisualPass: true,
      });
      if (stillMeta?.videoStale) {
        /* still may be hq_ok but video is stale — burn gate for still still allows; FE shows stale */
      }
      const { assertStillFirstFrameContract } = await import("@/ruleEngine/qc/stillFirstFrameGate");
      const { markStillStaleOnDescChange } = await import("@/ruleEngine/compilers/stillQuality");
      const literaryDesc = String(
        (shotMeta as { visualDescription?: string } | undefined)?.visualDescription ?? "",
      );
      const staleMeta = markStillStaleOnDescChange(stillMeta as never, literaryDesc);
      if (staleMeta && sbRow) {
        stillMeta = { ...(stillMeta as object), ...staleMeta };
        stillQuality = "weak";
      }
      const ff = assertStillFirstFrameContract({
        stillPrompt: stillPromptForHandoff,
        stillFilePath: sbRow?.filePath,
        requireStill: true,
        literaryDesc,
        literaryDescHashAtCompose: (stillMeta as { literaryDescHash?: string } | null)?.literaryDescHash,
      });
      if (!ff.ok && ff.severity === "BLOCK") {
        const { buildBurnGateEnvelope } = await import("@/ruleEngine/compilers/burnGateEnvelope");
        const env = buildBurnGateEnvelope(
          [{ id: ff.code ?? "STILL-FIRSTFRAME-DIRTY", message: ff.message || "静照首帧不合格", reverseTrigger: ff.reverseTrigger }],
          { nextStep: ff.primaryNextStep === "batch_still" ? "batch_still" : "chat_repair" },
        );
        return res.status(400).send(
          error(ff.message || "静照首帧不合格", {
            code: ff.code ?? "STILL-FIRSTFRAME-DIRTY",
            primaryNextStep: ff.primaryNextStep ?? "chat_repair",
            userMessage: ff.message,
            ctaLabel: env.ctaLabel || "回 SB 改描写",
            reverseTrigger: ff.reverseTrigger ?? "still_firstframe_dirty",
            rePushPlan: env.rePushPlan,
            repairHints: env.repairHints,
            chatRepairText: env.userMessage,
          }),
        );
      }
    } catch {
      stillQuality = null;
    }

    // Audio literary L0 + mouth handoff before burn
    try {
    const {
      buildAudioLiteraryFidelityChecklist,
      assertAudioLiteraryFidelity,
      syncDualAudioSsot,
      loadAudioLiteraryFidelityConfig,
    } = await import("@/ruleEngine/compilers/audioLiteraryFidelityChecklist");
    const audioCfg = loadAudioLiteraryFidelityConfig();
    const emotionTarget = String(
      (shotMeta as { emotionTarget?: string; emotion?: string } | undefined)?.emotionTarget ??
        (shotMeta as { emotion?: string } | undefined)?.emotion ??
        "",
    );
    const audioCue = String(
      (shotMeta as { audioCue?: string } | undefined)?.audioCue ??
        (shotMeta?.narrative as { avCausality?: { audioBeat?: string } } | undefined)?.avCausality?.audioBeat ??
        "",
    );
    const audioPromptSrc = String(shotMeta?.generation?.audioPrompt ?? "");
    const audioItems = buildAudioLiteraryFidelityChecklist({
      dialogueLines: dialLines,
      audioPrompt: audioPromptSrc,
      videoPrompt: burnPrompt,
      audioCue,
      emotionTarget,
    });
    let audioAssert = assertAudioLiteraryFidelity({
      items: audioItems,
      audioPrompt: audioPromptSrc,
      videoPrompt: burnPrompt,
    });
    if (!audioAssert.ok) {
      const synced = syncDualAudioSsot({
        audioPrompt: audioPromptSrc,
        videoPrompt: burnPrompt,
        dialogueLines: dialLines,
      });
      burnPrompt = synced.videoPrompt;
      audioAssert = assertAudioLiteraryFidelity({
        items: audioItems,
        audioPrompt: synced.audioPrompt,
        videoPrompt: burnPrompt,
      });
    }
    if (
      dialLines.length &&
      audioCfg.requireAudioPassForDialogueBurn !== false &&
      !audioAssert.ok
    ) {
      return res.status(400).send(
        error("音轨文学保真未过：对白未入轨或 Audio XOR 冲突", {
          code: "AUD-LIT-L0",
          primaryNextStep: "chat_repair",
          userMessage: `音轨文学保真缺项：${audioAssert.missing.map((m) => m.id).join(", ")}`,
          ctaLabel: "修复音轨后重试",
          audioMissing: audioAssert.missing.map((m) => m.id),
        }),
      );
    }

    try {
      const { assertAudioVoiceBindGate } = await import("@/ruleEngine/qc/audioVoiceBindGate");
      const roleIds = (uploadData ?? [])
        .filter((u: { sources?: string }) => u.sources === "assets")
        .map((u: { id?: number }) => Number(u.id))
        .filter(Boolean);
      const voicePresent = Boolean(
        (shotMeta as { voiceProfile?: unknown } | undefined)?.voiceProfile ||
          (shotMeta?.generation as { voiceProfile?: unknown } | undefined)?.voiceProfile,
      );
      const voiceGate = await assertAudioVoiceBindGate({
        db: u.db,
        roleAssetIds: roleIds,
        hasDialogue: dialLines.length > 0,
        qualityMode: "hq_update",
        voiceProfilePresent: voicePresent || roleIds.length === 0,
      });
      if (!voiceGate.ok && voiceGate.hard) {
        return res.status(400).send(
          error(voiceGate.userMessage || "音色绑定门禁未过", {
            code: "AUD-VOICE-BIND",
            primaryNextStep: voiceGate.primaryNextStep,
            userMessage: voiceGate.userMessage,
            ctaLabel: voiceGate.ctaLabel,
          }),
        );
      }
    } catch {
      /* voice gate best-effort */
    }
    } catch (e) {
      const errMsg = u.error(e).message || "audio L0 failed";
      return res.status(400).send(
        error(errMsg, {
          code: "AUD-LIT-L0",
          primaryNextStep: "chat_repair",
          userMessage: errMsg,
          ctaLabel: "修复音轨后重试",
        }),
      );
    }

    try {
      const { assertStillMouthVideoHandoff } = await import("@/ruleEngine/qc/stillMouthVideoHandoff");
      const mouthGate = assertStillMouthVideoHandoff({
        stillPrompt: stillPromptForHandoff,
        videoPrompt: burnPrompt,
        stillMouthDetail: String((stillMeta as { mouthDetail?: string } | null)?.mouthDetail ?? ""),
      });
      if (!mouthGate.ok && mouthGate.strengthen) {
        burnPrompt = finalizeFiveSectionPrompt({
          prompt: burnPrompt,
          dialogueLines: dialLines,
          durationSec: burnDuration,
          preferStaticOnDialogue: dialLines.length > 0,
          strengthen: mouthGate.strengthen,
        }).prompt;
      }
    } catch (e) {
      const errMsg = u.error(e).message || "mouth handoff failed";
      return res.status(400).send(
        error(errMsg, {
          code: "AUD-LIT-MOUTH",
          primaryNextStep: "chat_repair",
          userMessage: errMsg,
        }),
      );
    }

    const qdFx = String(shotMeta?.generation?.fxFeasibility ?? shotMeta?.fxFeasibility ?? shotMeta?.fxLevel ?? "");
    let workingShot = shotMeta as Record<string, unknown> | undefined;
    let burnPromptWorking = burnPrompt;
    let qd = decideVideoQuality({
      videoPrompt: burnPromptWorking,
      shot: workingShot as never,
      vendorId: vendorIdFromModel(model),
      fxGrade: qdFx,
      missingStillOrCref: false,
      stillQuality,
    });
    const { applySilentSoftPatches } = await import("@/ruleEngine/heal/applySilentSoftPatches");
    const heal = await applySilentSoftPatches({
      db: u.db,
      projectId,
      scriptId,
      storyboardId,
      vendorId: vendorIdFromModel(model),
      shot: workingShot,
      prompt: burnPromptWorking,
      decision: qd,
    });
    if (heal.healed) {
      if (heal.prompt) burnPromptWorking = heal.prompt;
      if (heal.shot) workingShot = heal.shot as Record<string, unknown>;
      burnPrompt = burnPromptWorking;
      if (heal.duration != null) {
        burnDuration = Math.max(burnDuration, heal.duration);
      } else if (workingShot) {
        burnDuration = Math.max(burnDuration, Number((workingShot as { duration?: number }).duration) || 0);
      }
      qd = decideVideoQuality({
        videoPrompt: burnPromptWorking,
        shot: workingShot as never,
        vendorId: vendorIdFromModel(model),
        fxGrade: qdFx,
        missingStillOrCref: false,
        stillQuality,
      });
    }
    if (!qd.burnAllowed) {
      const env = qd.envelope ?? buildBurnGateEnvelope([{ id: "LIP-01", message: qd.reasons.join(","), reverseTrigger: "pr_lip_duration" }]);
      // Never persist splitHint on burn block — false-green; Confirm/Orchestrator owns physical split.
      return res.status(400).send(
        error(env.userMessage || `质量决策挡烧: ${qd.decision} — ${qd.reasons.join("; ")}`, {
          qualityDecision: serializeQualityDecision(qd, { autoHealed: heal.autoHealed, duration: heal.duration }),
          rePushPlan: env.rePushPlan,
          repairHints: env.repairHints,
          nextStep: qd.nextStep,
          primaryNextStep: env.primaryNextStep ?? qd.nextStep,
          userMessage: env.userMessage,
          ctaLabel: env.ctaLabel,
          userMessageKey: env.userMessageKey,
          suggestedValue: env.suggestedValue,
          splitHint: qd.splitHint,
          reverseTriggers: env.triggers,
          ...(heal.autoHealed?.length ? { autoHealed: heal.autoHealed } : {}),
          chatRepairText: [
            "【闭环修复清单 — 质量决策挡烧】",
            env.userMessage,
            `reasons: ${qd.reasons.join("; ")}`,
            qd.reasons.includes("multi_line_one_shot") || qd.reasons.includes("lip_over_vendor")
              ? "须 Confirm 设计拆分（Orchestrator），不可只靠抬 duration / 不可把 reactionAction 当 splitHint"
              : "",
            qd.splitHint && /^[a-z][a-z0-9_]*$/i.test(qd.splitHint) ? `splitHint 建议(枚举): ${qd.splitHint}` : "",
            "",
            ...env.repairHints.map((h) => `[${h.id}] ${h.chatTemplate ?? ""}`).filter(Boolean),
            "",
            "回推仅跳转；请按清单改 SB/W3 后再导出烧片。",
          ]
            .filter((l) => l !== undefined && l !== "")
            .join("\n"),
        }),
      );
    }

    const packed = applyVendorPromptPack({
      prompt: burnPrompt,
      vendorId: vendorIdFromModel(model),
      duration: burnDuration,
      audio: bridge.params.audio,
      lipMin: lip?.lipMin || undefined,
      nativeAudio: resolveVendorCapability(vendorIdFromModel(model)).nativeAudio,
    });
    // Sync Camera text to API duration
    burnPrompt = finalizeFiveSectionPrompt({
      prompt: packed.prompt,
      dialogueLines: dialLines,
      durationSec: packed.duration,
      preferStaticOnDialogue: dialLines.length > 0,
    }).prompt;
    const generateAudio = packed.audio;
    const runDuration = packed.duration;
    const vendorPromptFinal = burnPrompt;

    const inferMediaType = (filePath?: string | null, dbType?: string | null): "image" | "video" | "audio" => {
      if (dbType === "audio" || dbType === "video" || dbType === "image") return dbType;
      const ext = (filePath ?? "").split(".").pop()?.toLowerCase() ?? "";
      if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) return "video";
      if (["mp3", "wav", "ogg", "aac", "flac", "m4a"].includes(ext)) return "audio";
      return "image";
    };
    const images = await Promise.all(
      uploadData.map(async (item: UploadItem) => {
        if (item.sources === "storyboard") {
          const filePath = await u.db("o_storyboard").where("id", item.id).select("filePath").first();
          return { path: filePath?.filePath, mediaType: inferMediaType(filePath?.filePath, "image") as "image" | "video" | "audio" };
        }
        if (item.sources === "assets") {
          const filePath = await u
            .db("o_assets")
            .where("o_assets.id", item.id)
            .leftJoin("o_image", "o_assets.imageId", "o_image.id")
            .select("o_image.filePath", "o_image.type", "o_assets.type as assetType")
            .first();
          const mediaType = inferMediaType(
            filePath?.filePath,
            filePath?.type || (filePath?.assetType === "audio" ? "audio" : null),
          );
          return { path: filePath?.filePath, mediaType };
        }
      }),
    );
    const base64 = await Promise.all(
      images.map(async (item) => {
        if (!item?.path) return null;
        return { base64: await u.oss.getImageBase64(item.path), type: item.mediaType };
      }),
    );
    const videoPath = `/${projectId}/video/${uuidv4()}.mp4`;
    const [videoId] = await u.db("o_video").insert({
      filePath: videoPath,
      time: Date.now(),
      state: "生成中",
      scriptId,
      projectId,
      videoTrackId: trackId,
    });
    res.status(200).send(success(videoId));
    const relatedObjects = {
      projectId,
      videoId,
      scriptId,
      type: "视频",
    };
    const aiVideo = u.Ai.Video(model);
    aiVideo
      .run(
        {
          prompt: vendorPromptFinal,
          referenceList: base64.filter(Boolean) as ReferenceList[],
          mode: modeData.length > 0 ? modeData : mode,
          duration: runDuration,
          aspectRatio,
          resolution: bridge.params.resolution ?? resolution,
          audio: generateAudio,
        },
        {
          projectId,
          taskClass: "视频生成",
          describe: "根据提示词生成视频",
          relatedObjects: JSON.stringify(relatedObjects),
        },
      )
      .then(async () => await aiVideo.save(videoPath))
      .then(async () => {
        const { runPostBurnRuntime } = await import("@/ruleEngine/qc/postBurnRuntime");
        const visualPass = stillQuality === "hq_ok";
        const post = runPostBurnRuntime({
          shotId: storyboardId,
          hasDialogue: dialLines.length > 0,
          visualPass,
          audioL1: {
            vendorReportedAudio: generateAudio !== false,
            dialogueLines: dialLines,
          },
          videoPrompt: vendorPromptFinal,
        });
        await u.db("o_video").where("id", videoId).update({
          state: post.videoPass ? "生成成功" : "生成成功",
          errorReason: JSON.stringify({
            postBurn: {
              videoPass: post.videoPass,
              audioPass: post.audioPass,
              findings: post.findings,
              seedStrengthen: post.seedStrengthen,
              primaryNextStep: post.primaryNextStep,
              userMessage: post.userMessage,
            },
          }),
        });
        // Seed still reason for ID_DRIFT / LIT feedback
        if (Object.keys(post.seedStrengthen).length && storyboardId) {
          try {
            const row = await u.db("o_storyboard").where({ id: storyboardId }).first();
            const prev = row?.reason ? JSON.parse(String(row.reason)) : {};
            await u.db("o_storyboard").where({ id: storyboardId }).update({
              reason: JSON.stringify({
                ...prev,
                videoPass: post.videoPass,
                videoPassAt: post.videoPassAt,
                audioPass: post.audioPass,
                audioPassAt: post.audioPassAt,
                postBurnStrengthen: post.seedStrengthen,
                postBurnNextStep: post.primaryNextStep,
                videoStale: !post.videoPass,
              }),
            });
          } catch {
            /* best-effort seed */
          }
        }
      })
      .catch(async (error: unknown) => {
        const errMsg = u.error(error).message;
        const feedback = await classifyGenerationFailure({
          modality: "video",
          shotId: String(trackId),
          error: errMsg,
          prompt,
        });
        let heal: Awaited<ReturnType<typeof import("@/ruleEngine/design/selfHealOrchestrator").runSelfHeal>> | undefined;
        try {
          const { runSelfHeal } = await import("@/ruleEngine/design/selfHealOrchestrator");
          heal = await runSelfHeal({
            projectId,
            scriptId,
            shotId: trackId,
            errorText: errMsg,
            category: feedback.category,
            jobKind: "video",
            round: 1,
            dryRun: false,
            db: u.db,
            shot: shotMeta as unknown as Record<string, unknown> | undefined,
            identityGaps: identityGate.gaps,
          });
        } catch {
          /* heal best-effort */
        }
        await u
          .db("o_video")
          .where("id", videoId)
          .update({
            state: "生成失败",
            errorReason: JSON.stringify({
              message: errMsg,
              feedback,
              suggestedPrompt: feedback.suggestedPrompt,
              heal,
              healRound: heal?.healRound,
              patchesApplied: heal?.patchesApplied,
              exhausted: heal?.exhausted,
              retrySuggested: heal?.retrySuggested,
            }),
          });
      });
    } catch (e) {
      const errMsg = u.error(e).message || "generateVideo failed";
      if (!res.headersSent) {
        return res.status(500).send(
          error(errMsg, {
            code: "GENERATE_VIDEO",
            userMessage: errMsg,
            primaryNextStep: "chat_repair",
          }),
        );
      }
    }
  },
);
