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
    const { resolveStoryboardForTrack } = await import("@/ruleEngine/compilers/resolveTrackStoryboard");
    const infoSbIds = (uploadData as UploadItem[])
      .filter((item) => item.sources === "storyboard" && item.id != null)
      .map((item) => Number(item.id));
    const trackBind = await resolveStoryboardForTrack(u.db, trackId, infoSbIds);
    const storyboardId =
      trackBind?.storyboardId ??
      (uploadData as UploadItem[]).find((item) => item.sources === "storyboard")?.id;
    const pkg = await loadEpisodePackage(u.db, projectId, scriptId);
    let shotMeta = storyboardId != null ? pkg?.shots?.find((s) => s.storyboardId === storyboardId) : undefined;
    if (!shotMeta && trackBind?.row?.index != null && pkg?.shots?.length) {
      const idx = Number(trackBind.row.index);
      shotMeta =
        pkg.shots.find((s) => Number((s as { shotIndex?: number }).shotIndex) === idx) ??
        pkg.shots.find((s) => Number((s as { index?: number }).index) === idx);
    }
    // Enrich shotMeta with track panel — package literary VD wins over motion-template videoDesc
    if (trackBind?.row || shotMeta) {
      const { preferLiteraryVisualDesc } = await import("@/ruleEngine/compilers/resolveTrackStoryboard");
      const vd = preferLiteraryVisualDesc(
        (shotMeta as { visualDescription?: string } | undefined)?.visualDescription,
        String(trackBind?.row?.videoDesc ?? "").trim(),
      );
      shotMeta = {
        ...(shotMeta as object),
        storyboardId: trackBind?.storyboardId ?? (shotMeta as { storyboardId?: number } | undefined)?.storyboardId,
        shotIndex: trackBind?.row?.index ?? (shotMeta as { shotIndex?: number } | undefined)?.shotIndex,
        visualDescription: vd || (shotMeta as { visualDescription?: string } | undefined)?.visualDescription || undefined,
        duration:
          (shotMeta as { duration?: number } | undefined)?.duration ??
          (trackBind?.row?.duration != null ? Number(trackBind.row.duration) : undefined),
        generation: {
          ...((shotMeta as { generation?: object } | undefined)?.generation ?? {}),
          audioPrompt:
            (shotMeta as { generation?: { audioPrompt?: string } } | undefined)?.generation?.audioPrompt ??
            trackBind?.row?.audioPrompt ??
            undefined,
          fxPrompt:
            (shotMeta as { generation?: { fxPrompt?: string } } | undefined)?.generation?.fxPrompt ??
            trackBind?.row?.fxPrompt ??
            undefined,
        },
      } as typeof shotMeta;
    }
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
        (req as { __audioGap?: unknown }).__audioGap = audioBind;
        // Homology with assertAudioVoiceBindGate: bound-but-no-file must not silent-burn
        const dialEarly = (() => {
          try {
            const { flattenDialogueText } = require("@/ruleEngine/design/dialogueCoverage") as typeof import("@/ruleEngine/design/dialogueCoverage");
            return Boolean(flattenDialogueText(shotMeta?.narrative?.dialogue?.lines)?.trim());
          } catch {
            return false;
          }
        })();
        if (dialEarly) {
          return res.status(400).send(
            error("对白镜音色绑定文件缺失，禁止假绿烧片", {
              code: "AUD-VOICE-BIND",
              primaryNextStep: "chat_repair",
              userMessage: "角色已绑音色但音频文件缺失；请补音色资产后再烧",
              ctaLabel: "补音色后重试",
              audioGaps: audioBind.gaps,
            }),
          );
        }
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
    const { hasOnCameraDialogue } = await import("@/ruleEngine/design/onCameraDialogue");
    const { resolveLipSyncPolicyFromShot } = await import("@/ruleEngine/quality/resolveLipSyncPolicy");
    const onCamDialogue = hasOnCameraDialogue(shotMeta?.narrative?.dialogue?.lines);
    const lip = lipForBridge ?? (shotMeta ? resolveLipDuration(shotMeta as never) : null);
    let burnDuration = Math.max(bridge.params.duration, lip?.durationSec ?? 0) || bridge.params.duration;
    const fin = finalizeFiveSectionPrompt({
      prompt: vendorPrompt,
      dialogueLines: dialLines,
      durationSec: burnDuration,
      preferStaticOnDialogue: dialLines.length > 0,
    });
    let burnPrompt = fin.prompt;
    // Heal-first: thin/pollution → spine; hard BLOCK only on true design gap
    {
      const { sanitizeVideoPrompt } = await import("@/ruleEngine/compilers/sanitizeVideoPrompt");
      const { assertVideoPromptReady } = await import("@/ruleEngine/compilers/assertVideoPromptReady");
      const { compileVideoPromptSpine } = await import("@/ruleEngine/compilers/compileVideoPromptSpine");
      const {
        hydrateShotCompileContextSync,
        mergeWorkbenchCompileSources,
        isTrueDesignGap,
      } = await import("@/ruleEngine/compilers/hydrateShotCompileContext");
      const scrubbed = sanitizeVideoPrompt({
        prompt: burnPrompt,
        dialogueLines: dialLines,
        durationSec: burnDuration,
        preferStaticOnDialogue: dialLines.length > 0,
      });
      burnPrompt = scrubbed.prompt;
      const merged = mergeWorkbenchCompileSources({
        designShot: shotMeta as never,
        shotMeta: shotMeta as never,
        storyboard: null,
      });
      // Prefer VD from shotMeta / visualDescription
      if (!(merged.shotMeta.visualDescription as string)?.trim()) {
        const vd = String((shotMeta as { visualDescription?: string } | undefined)?.visualDescription ?? "").trim();
        if (vd) merged.shotMeta.visualDescription = vd;
      }
      if (dialLines.length) {
        merged.shotMeta.narrative = {
          ...((merged.shotMeta.narrative as object) ?? {}),
          dialogue: { lines: dialLines.map((t) => ({ text: t })) },
        };
      }
      const ctx = hydrateShotCompileContextSync({
        designShot: merged.designShot,
        shotMeta: merged.shotMeta,
        seedPrompt: burnPrompt,
        shotIndex:
          Number((shotMeta as { shotIndex?: number } | undefined)?.shotIndex) ||
          Number((shotMeta as { index?: number } | undefined)?.index) ||
          null,
        vendorId: "agnesai",
      });
      let ready = assertVideoPromptReady(burnPrompt, ctx);
      if (!ready.ok && ctx.canAuthorFromDesign) {
        const spine = compileVideoPromptSpine({
          ctx: { ...ctx, durationSec: burnDuration || ctx.durationSec },
          forceRebuild: true,
          includeSidecar: false,
        });
        if (spine.prompt) burnPrompt = spine.prompt;
        if (spine.durationSec) burnDuration = spine.durationSec;
        ready = assertVideoPromptReady(burnPrompt, ctx);
      }
      if (!ready.ok && isTrueDesignGap(ctx)) {
        return res.status(400).send(
          error("本镜缺少画面描写与对白，无法烧片；请补设计后重编译", {
            code: "VP-THIN-SHELL",
            primaryNextStep: "chat_repair",
            reverseTrigger: "video_prompt_stub",
            conflicts: scrubbed.conflicts,
            reasons: ["true_design_gap", ...ready.reasons],
          }),
        );
      }
      // Material present: proceed with healed prompt even if soft WARN
    }
    {
      const { resolveLipDurationSingleSource } = await import("@/ruleEngine/quality/resolveLipDuration");
      const lipPol = resolveLipSyncPolicyFromShot(shotMeta as Record<string, unknown> | undefined);
      const ss = resolveLipDurationSingleSource({
        prompt: burnPrompt,
        lipSyncPolicy: lipPol,
        hasDialogue: onCamDialogue,
        durationSec: burnDuration,
        hardBlockNoLipOnDialogue: true,
        refuseExplicitSilent: true,
      });
      if (ss.blocked) {
        return res.status(400).send(
          error(ss.blockMessage || "no lip on dialogue", {
            code: ss.blockCode ?? "NO-LIP-DIALOGUE",
            primaryNextStep: "chat_repair",
            userMessage: ss.blockMessage,
            reverseTrigger: "no_lip_dialogue",
          }),
        );
      }
      burnPrompt = ss.prompt;
      if (ss.durationSec != null) burnDuration = Math.max(burnDuration, ss.durationSec);
    }
    // M0/M5/M9: ShotChainContract egress at burn
    {
      const { buildShotChainContract, assertChainEgress, chainContractEnabled } =
        await import("@/ruleEngine/quality/shotChainContract");
      const meta = (shotMeta as { meta?: Record<string, unknown> } | undefined)?.meta;
      if (chainContractEnabled(meta) && shotMeta) {
        const designDur = Number(
          (shotMeta as { duration?: number }).duration ??
            (shotMeta as { narrative?: { duration?: number } }).narrative?.duration ??
            0,
        );
        const c = buildShotChainContract(shotMeta as Record<string, unknown>);
        const eg = assertChainEgress("burn", c, {
          videoPrompt: burnPrompt,
          burnDuration,
        });
        if (!eg.ok) {
          return res.status(400).send(
            error(eg.findings[0]?.message || "chain egress blocked", {
              code: eg.codes[0] ?? "CHAIN-EGRESS",
              primaryNextStep: eg.breakAt === "split" || eg.breakAt === "cam_split" ? "split_shot" : "chat_repair",
              userMessage: eg.findings.map((f) => f.message).join("；"),
              reverseTrigger: eg.codes[0] === "DUR-DESYNC" ? "dur_desync" : eg.codes[0] === "PROMPT-FIDELITY" ? "prompt_fidelity" : "design_loss",
              breakAt: eg.breakAt,
              designDuration: designDur || c.durationSec,
            }),
          );
        }
        // Raise-only: never burn shorter than trusted design
        if (c.durationTrusted && c.durationSec > burnDuration) {
          burnDuration = c.durationSec;
        }
      }
    }
    {
      const { injectMirrorAntiWarp } = await import("@/ruleEngine/qc/mirrorAntiWarp");
      const mir = injectMirrorAntiWarp(
        burnPrompt,
        String((shotMeta as { visualDescription?: string })?.visualDescription ?? ""),
      );
      burnPrompt = mir.prompt;
    }

    let stillQuality: "missing" | "weak" | "hq_ok" | null = null;
    let stillMeta: Record<string, unknown> | null = null;
    let stillPromptForHandoff = "";
    let resolvedStillPath = "";
    try {
      const { inferStillQuality } = await import("@/ruleEngine/compilers/stillQuality");
      const { resolveStillForBurn, isStillVlmInfraGap } = await import("@/ruleEngine/qc/resolveStillForBurn");
      const resolved = await resolveStillForBurn({
        db: u.db as never,
        projectId,
        scriptId,
        trackId,
        uploadStoryboardId: storyboardId ?? null,
        packageStoryboardIds: (pkg?.shots ?? [])
          .map((s: { storyboardId?: number }) => Number(s.storyboardId))
          .filter((n: number) => Number.isFinite(n) && n > 0),
      });
      if (resolved.storyboardId != null && resolved.storyboardId !== storyboardId) {
        (req as { __resolvedStoryboardId?: number }).__resolvedStoryboardId = resolved.storyboardId;
      }
      const sbRow = resolved.row;
      resolvedStillPath = resolved.filePath;
      stillPromptForHandoff = resolved.prompt || String(sbRow?.prompt ?? "");
      try {
        stillMeta = resolved.reasonRaw ? JSON.parse(resolved.reasonRaw) : null;
      } catch {
        stillMeta = null;
      }
      const vlmInfra = isStillVlmInfraGap(stillMeta);
      let sheetLeak = Boolean((stillMeta as { sheetLeak?: boolean } | null)?.sheetLeak);
      try {
        const { promptImpliesSheetCollageLeak } =
          await import("@/ruleEngine/compilers/stillFirstFrameLiterarySsot");
        sheetLeak = sheetLeak || promptImpliesSheetCollageLeak(stillPromptForHandoff);
      } catch {
        /* optional */
      }
      // G7 / P2: stillQuality !== hq_ok or sheetLeak → never first_frame (no weak→hq fake upgrade)
      stillQuality = inferStillQuality({
        filePath: resolvedStillPath || (sbRow?.filePath as string | undefined),
        imageId: sbRow?.imageId as number | undefined,
        meta: stillMeta?.stillQuality ? (stillMeta as { stillQuality?: "missing" | "weak" | "hq_ok" }) : null,
        requireVisualPass: true,
      });
      if (sheetLeak) {
        stillQuality = "weak";
      }
      if (stillMeta?.videoStale && !vlmInfra) {
        /* still may be hq_ok but video is stale — burn gate for still still allows; FE shows stale */
      }
      const { assertStillFirstFrameContract } = await import("@/ruleEngine/qc/stillFirstFrameGate");
      const { assertStillDetectForBurn } = await import("@/ruleEngine/qc/stillDetectRepair");
      const { markStillStaleOnDescChange } = await import("@/ruleEngine/compilers/stillQuality");
      const pkgShotVd = (
        pkg?.shots?.find(
          (s: { storyboardId?: number }) => Number(s.storyboardId) === Number(resolved.storyboardId ?? storyboardId),
        ) as { visualDescription?: string } | undefined
      )?.visualDescription;
      const literaryDesc = String(
        (shotMeta as { visualDescription?: string } | undefined)?.visualDescription ?? pkgShotVd ?? "",
      );
      const staleMeta = !vlmInfra ? markStillStaleOnDescChange(stillMeta as never, literaryDesc) : null;
      if (staleMeta && sbRow) {
        stillMeta = { ...(stillMeta as object), ...staleMeta };
        stillQuality = "weak";
      }
      const detect = assertStillDetectForBurn({
        stillPrompt: stillPromptForHandoff,
        stillFilePath: resolvedStillPath,
        literaryDesc,
        literaryDescHashAtCompose: (stillMeta as { literaryDescHash?: string } | null)?.literaryDescHash,
        stillMeta: stillMeta as never,
        stillQuality,
        sheetLeak,
        fidelityFailed:
          !vlmInfra &&
          stillQuality === "weak" &&
          Boolean((stillMeta as { fidelityFailed?: boolean } | null)?.fidelityFailed),
        shot: shotMeta as Record<string, unknown> | null,
      });
      if (!detect.ok) {
        const { buildBurnGateEnvelope } = await import("@/ruleEngine/compilers/burnGateEnvelope");
        const noFile = !resolvedStillPath;
        // Homology: pass through split_shot — never collapse to chat_repair
        const next = noFile
          ? "batch_still"
          : detect.primaryNextStep === "batch_still"
            ? "batch_still"
            : detect.primaryNextStep === "split_shot"
              ? "split_shot"
              : detect.primaryNextStep === "chat_repair"
                ? "chat_repair"
                : detect.primaryNextStep === "regen_storyboard_hq"
                  ? "regen_storyboard_hq"
                  : "chat_repair";
        const env = buildBurnGateEnvelope(
          [{ id: detect.code ?? "STILL-FIRSTFRAME-DIRTY", message: detect.message || "静照检测未过", reverseTrigger: detect.reverseTrigger }],
          { nextStep: next },
        );
        return res.status(400).send(
          error(detect.message || "静照检测未过", {
            code: detect.code ?? "STILL-FIRSTFRAME-DIRTY",
            primaryNextStep: noFile ? "batch_still" : detect.primaryNextStep ?? next,
            reverseTrigger: detect.reverseTrigger ?? "still_firstframe_dirty",
            rePushPlan: env.rePushPlan,
            repairHints: env.repairHints,
            nextStep: next,
            resolvedStoryboardId: resolved.storyboardId,
            hasStillFile: Boolean(resolvedStillPath),
            vlmInfraGap: vlmInfra,
            resolveSource: resolved.resolveSource,
            irdPrimaryAction: detect.irdPrimaryAction,
            missingSlots: detect.missingSlots,
            ctaLabel: detect.ctaLabel ?? (detect.irdPrimaryAction === "hand_edit_vd" ? "手改VD" : undefined),
          }),
        );
      }
      const ff = assertStillFirstFrameContract({
        stillPrompt: stillPromptForHandoff,
        stillFilePath: resolvedStillPath,
        requireStill: true,
        literaryDesc,
        literaryDescHashAtCompose: (stillMeta as { literaryDescHash?: string } | null)?.literaryDescHash,
        stillQuality,
        sheetLeak,
      });
      if (!ff.ok && ff.severity === "BLOCK") {
        const { buildBurnGateEnvelope } = await import("@/ruleEngine/compilers/burnGateEnvelope");
        const noFile = !resolvedStillPath || ff.code === "STILL-FIRSTFRAME-MISSING";
        // Homology: pass through split_shot — never collapse to chat_repair
        const next = noFile || ff.primaryNextStep === "batch_still"
          ? "batch_still"
          : ff.primaryNextStep === "split_shot"
            ? "split_shot"
            : ff.primaryNextStep === "chat_repair"
              ? "chat_repair"
              : ff.primaryNextStep === "regen_storyboard_hq"
                ? "regen_storyboard_hq"
                : "chat_repair";
        const env = buildBurnGateEnvelope(
          [{ id: ff.code ?? "STILL-FIRSTFRAME-DIRTY", message: ff.message || "静照首帧不合格", reverseTrigger: ff.reverseTrigger }],
          { nextStep: next },
        );
        return res.status(400).send(
          error(ff.message || "静照首帧不合格", {
            code: ff.code ?? "STILL-FIRSTFRAME-DIRTY",
            primaryNextStep: noFile ? "batch_still" : ff.primaryNextStep ?? next,
            userMessage: ff.message,
            ctaLabel:
              noFile ? "去生成静照" : next === "split_shot" ? env.ctaLabel || "确认智能拆镜" : env.ctaLabel || "回 SB 改描写",
            reverseTrigger: ff.reverseTrigger ?? "still_firstframe_dirty",
            rePushPlan: env.rePushPlan,
            repairHints: env.repairHints,
            nextStep: next,
            chatRepairText: env.userMessage,
            resolvedStoryboardId: resolved.storyboardId,
            hasStillFile: Boolean(resolvedStillPath),
            vlmInfraGap: vlmInfra,
            resolveSource: resolved.resolveSource,
          }),
        );
      }
    } catch (gateErr) {
      // Fail-closed: never swallow first-frame gate errors into burn-open
      const gateMsg = u.error(gateErr).message || "静照首帧校验异常";
      return res.status(400).send(
        error(gateMsg, {
          code: "STILL-FIRSTFRAME-GATE-ERROR",
          primaryNextStep: "chat_repair",
          reverseTrigger: "still_firstframe_dirty",
          userMessage: "静照首帧校验异常，禁止烧片；请回制作台检查静照后重试",
          ctaLabel: "回制作台",
          nextStep: "chat_repair",
        }),
      );
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
        lipSyncPolicy: resolveLipSyncPolicyFromShot(shotMeta as Record<string, unknown> | undefined),
        hasDialogue: onCamDialogue,
      });
      if (!mouthGate.ok && mouthGate.severity === "BLOCK") {
        return res.status(400).send(
          error(mouthGate.message || "mouth handoff blocked", {
            code: "STILL-MOUTH-HANDOFF",
            primaryNextStep: "regen_storyboard_hq",
            ctaLabel: "重出开口静照",
            userMessage: mouthGate.message,
            reverseTrigger: mouthGate.reverseTrigger ?? "still_mouth_handoff",
          }),
        );
      }
      if (!mouthGate.ok && mouthGate.strengthen) {
        burnPrompt = finalizeFiveSectionPrompt({
          prompt: burnPrompt,
          dialogueLines: dialLines,
          durationSec: burnDuration,
          preferStaticOnDialogue: dialLines.length > 0,
          strengthen: mouthGate.strengthen,
        }).prompt;
        const again = assertStillMouthVideoHandoff({
          stillPrompt: stillPromptForHandoff,
          videoPrompt: burnPrompt,
          stillMouthDetail: String((stillMeta as { mouthDetail?: string } | null)?.mouthDetail ?? ""),
          hasDialogue: onCamDialogue,
          lipSyncPolicy: mouthGate.strengthen?.lipSyncPolicy ?? "subtle",
          afterStrengthen: true,
        });
        // subtle policy should clear strongLip; if still closed∩strong → BLOCK
        if (!again.ok && again.severity === "BLOCK") {
          return res.status(400).send(
            error(again.message || "mouth handoff still blocked", {
              code: "STILL-MOUTH-HANDOFF",
              primaryNextStep: "regen_storyboard_hq",
              ctaLabel: "重出开口静照",
              userMessage: again.message,
              reverseTrigger: "still_mouth_handoff",
            }),
          );
        }
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
    // Sync Camera text to API duration + scrub XML/sidecar/EN QF shells
    {
      const { sanitizeVideoPrompt } = await import("@/ruleEngine/compilers/sanitizeVideoPrompt");
      const scrubbed = sanitizeVideoPrompt({
        prompt: packed.prompt,
        dialogueLines: dialLines,
        durationSec: packed.duration,
        preferStaticOnDialogue: dialLines.length > 0,
      });
      burnPrompt = finalizeFiveSectionPrompt({
        prompt: scrubbed.prompt,
        dialogueLines: dialLines,
        durationSec: packed.duration,
        preferStaticOnDialogue: dialLines.length > 0,
      }).prompt;
    }
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
          const path = String(filePath?.filePath ?? "").trim() || resolvedStillPath;
          return { path: path || undefined, mediaType: inferMediaType(path, "image") as "image" | "video" | "audio" };
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
    // FE omitted storyboard in uploadData — inject track-resolved still as start frame
    if (resolvedStillPath && !images.some((i) => i?.path === resolvedStillPath)) {
      images.unshift({ path: resolvedStillPath, mediaType: "image" });
    }
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
    // Keep track pointer on newest clip (history rows remain in o_video)
    try {
      const trackRow = await u.db("o_videoTrack").where({ id: trackId }).select("prompt", "reason").first();
      let reason: Record<string, unknown> = {};
      try {
        reason = typeof trackRow?.reason === "string" ? JSON.parse(trackRow.reason || "{}") : { ...(trackRow?.reason ?? {}) };
      } catch {
        reason = {};
      }
      const promptNow = String(trackRow?.prompt ?? "");
      reason.promptOverwriteAt = new Date().toISOString();
      reason.promptHash = require("crypto").createHash("sha1").update(promptNow).digest("hex").slice(0, 12);
      reason.note = "track.prompt 覆盖非版本库；片历史在 o_video 多行";
      await u.db("o_videoTrack").where({ id: trackId }).update({
        videoId,
        reason: JSON.stringify(reason),
      });
    } catch {
      await u.db("o_videoTrack").where({ id: trackId }).update({ videoId }).catch(() => undefined);
    }
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
          state: post.videoPass ? "生成成功" : "质检未过",
          errorReason: JSON.stringify({
            postBurn: {
              videoPass: post.videoPass,
              audioPass: post.audioPass,
              findings: post.findings,
              seedStrengthen: post.seedStrengthen,
              primaryNextStep: post.primaryNextStep,
              userMessage: post.userMessage,
              scorecard: post.scorecard,
              failDims: post.failDims,
              unknownDims: post.unknownDims,
              deeplinks: post.deeplinks,
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
