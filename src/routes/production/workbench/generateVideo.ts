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
    // Homology with batchGenerateVideo: persisted 需完善 / burnAllowed=false refuses burn
    {
      const trackRow = await u.db("o_videoTrack").where({ id: trackId }).select("state", "reason").first();
      let burnAllowedMeta: boolean | undefined;
      try {
        const r =
          typeof trackRow?.reason === "string" && String(trackRow.reason).trim().startsWith("{")
            ? JSON.parse(trackRow.reason)
            : null;
        if (r && typeof r.burnAllowed === "boolean") burnAllowedMeta = r.burnAllowed;
      } catch { /* ignore */ }
      if (trackRow?.state === "需完善" || burnAllowedMeta === false) {
        return res.status(400).send(
          error("轨道提示词需完善，不可烧片", {
            code: "TRACK_PROMPT_NOT_BURN_READY",
            primaryNextStep: "chat_repair",
            userMessage: "提示词状态为需完善或 burnAllowed=false，请先重编译后再烧",
            ctaLabel: "完善后重编译",
          }),
        );
      }
    }
    const trackBind = await resolveStoryboardForTrack(u.db, trackId, infoSbIds);
    const storyboardId =
      trackBind?.storyboardId ??
      (uploadData as UploadItem[]).find((item) => item.sources === "storyboard")?.id;
    const pkg = await loadEpisodePackage(u.db, projectId, scriptId);
    // Homology with batchGeneratePrompt / generateVideoPrompt: design/import lip open → refuse burn
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
    const persistedIntent =
      String((shotMeta as { generation?: { intentClass?: string } } | undefined)?.generation?.intentClass ?? "").trim() ||
      null;
    const { adaptBurnFromDesign } = await import("@/ruleEngine/compilers/adaptBurnFromDesign");
    const burnAdapt = adaptBurnFromDesign({
      shotMeta: (shotMeta ?? {}) as Record<string, unknown>,
      trackPrompt: prompt,
      vendorId: vendorIdFromModel(model),
      trackId,
      storyboardId: storyboardId ?? undefined,
      modeId: typeof mode === "string" ? mode : undefined,
    });
    if (burnAdapt.fidelity && !burnAdapt.fidelity.pass) {
      const misses = burnAdapt.fidelity.items.filter((i) => !i.pass);
      return res.status(400).send(
        error(`设计意图未命中：${misses.map((m) => m.id).join(", ")}`, {
          code: "DEX-VID-FIDELITY",
          designIntentFidelity: burnAdapt.fidelity,
          virdFindings: burnAdapt.fidelity.virdFindings,
          primaryNextStep: "chat_repair",
          ctaLabel: "确认视频设计修复",
          userMessage: misses.map((m) => `${m.label}：期望 ${m.expected ?? "—"}`).join("；"),
        }),
      );
    }
    const burnSeedPrompt = burnAdapt.prompt || prompt;
    const designDurationSec = burnAdapt.durationSec > 0 ? burnAdapt.durationSec : duration;
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
        {
          decision: "rePush_design",
          nextStep: "batch_still",
          primary: {
            userMessage: "角色定妆图还没有",
            ctaLabel: "去生成定妆",
          },
        },
      );
      const chatRepairText = [
        "【闭环修复清单 — 身份 cref/静照】",
        `待处理：IMG-CREF`,
        "",
        ...envelope.repairHints.map((h) => `[${h.id}] ${h.chatTemplate ?? ""}`).filter(Boolean),
        "",
        "回推 EN/MD-IMG 仅跳转；请补定妆图后重试烧视频。",
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
            primaryNextStep: envelope.primaryNextStep,
            userMessage: envelope.userMessage,
            ctaLabel: envelope.ctaLabel,
            chatRepairText,
            decision: "rePush_design",
          }),
        );
    }

    const lipForBridge = shotMeta ? resolveLipDuration(shotMeta as never) : null;
    const bridge = bridgeShotToVendor({
      designFields,
      request: {
        duration: designDurationSec,
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
      applyTextHardening(burnSeedPrompt, bridge.textHardening),
      (ratio?.videoRatio as string) || "16:9",
    );
    const policy = precheckContentPolicy(compiled.vendorPrompt);
    let vendorPrompt = policy.hasSensitiveTerms ? policy.softenedPrompt : compiled.vendorPrompt;

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
    const { literaryDialogueTexts, scrubVideoPromptForBurn, assertNoPadDuration } =
      await import("@/ruleEngine/compilers/videoDesignContract");
    const litDial = literaryDialogueTexts(shotMeta?.narrative?.dialogue?.lines);
    const onCamDialogue = hasOnCameraDialogue(shotMeta?.narrative?.dialogue?.lines) && litDial.length > 0;
    const lip = lipForBridge ?? (shotMeta ? resolveLipDuration(shotMeta as never) : null);
    const authorBeat = Math.max(
      Number((shotMeta as { beatDuration?: number })?.beatDuration) || 0,
      Number((shotMeta as { narrative?: { beatDuration?: number; duration?: number } })?.narrative?.beatDuration) || 0,
      Number((shotMeta as { narrative?: { duration?: number } })?.narrative?.duration) || 0,
      Number((shotMeta as { duration?: number })?.duration) || 0,
    );
    let burnDuration = Math.max(bridge.params.duration, lip?.durationSec ?? 0) || bridge.params.duration;
    // Pad gate: no silent raise far above author beat without dialogue/lip
    {
      const pad = assertNoPadDuration({
        authorBeatSec: authorBeat,
        burnDurationSec: burnDuration,
        hasLiteraryDialogue: onCamDialogue,
        lipMin: lip?.lipMin ?? lip?.durationSec,
      });
      if (pad && authorBeat > 0) {
        burnDuration = Math.max(authorBeat, onCamDialogue ? Number(lip?.lipMin ?? lip?.durationSec) || authorBeat : authorBeat);
      }
    }
    // Sole-author SSOT: adaptBurn already authored spine + fidelity — one egress pass only (no re-spine).
    {
      const { sanitizeVideoPrompt } = await import("@/ruleEngine/compilers/sanitizeVideoPrompt");
      const { assertVideoPromptReady } = await import("@/ruleEngine/compilers/assertVideoPromptReady");
      const {
        hydrateShotCompileContextSync,
        mergeWorkbenchCompileSources,
        isTrueDesignGap,
      } = await import("@/ruleEngine/compilers/hydrateShotCompileContext");
      const merged = mergeWorkbenchCompileSources({
        designShot: shotMeta as never,
        shotMeta: shotMeta as never,
        storyboard: null,
      });
      if (!(merged.shotMeta.visualDescription as string)?.trim()) {
        const vd = String((shotMeta as { visualDescription?: string } | undefined)?.visualDescription ?? "").trim();
        if (vd) merged.shotMeta.visualDescription = vd;
      }
      const ctx = hydrateShotCompileContextSync({
        designShot: merged.designShot,
        shotMeta: merged.shotMeta,
        seedPrompt: burnAdapt.prompt || vendorPrompt,
        shotIndex:
          Number((shotMeta as { shotIndex?: number } | undefined)?.shotIndex) ||
          Number((shotMeta as { index?: number } | undefined)?.index) ||
          null,
        vendorId: vendorIdFromModel(model),
        preferStillIntentClass: persistedIntent,
      });
      let burnPromptLocal = burnAdapt.prompt || vendorPrompt;
      const fin = finalizeFiveSectionPrompt({
        prompt: burnPromptLocal,
        dialogueLines: litDial,
        durationSec: burnDuration,
        preferStaticOnDialogue: litDial.length > 0,
      });
      burnPromptLocal = fin.prompt;
      const scrubbed = sanitizeVideoPrompt({
        prompt: burnPromptLocal,
        dialogueLines: litDial,
        durationSec: burnDuration,
        preferStaticOnDialogue: litDial.length > 0,
      });
      burnPromptLocal = scrubbed.prompt;
      const scrub2 = scrubVideoPromptForBurn({
        prompt: burnPromptLocal,
        vendorId: vendorIdFromModel(model),
        dialogueLines: litDial,
      });
      if (scrub2.block) {
        return res.status(400).send(
          error(scrub2.block.message, {
            code: scrub2.block.id,
            primaryNextStep: "chat_repair",
            ctaLabel: "确认运镜调解",
            reverseTrigger: "vid_cam_mediate",
          }),
        );
      }
      burnPromptLocal = scrub2.prompt;
      const pad2 = assertNoPadDuration({
        authorBeatSec: authorBeat,
        burnDurationSec: burnDuration,
        hasLiteraryDialogue: onCamDialogue,
        lipMin: lip?.lipMin ?? lip?.durationSec,
      });
      if (pad2 && authorBeat > 0 && authorBeat <= 2 && !onCamDialogue) {
        burnDuration = Math.max(authorBeat, Number(lip?.lipMin ?? 0) || authorBeat);
      }
      const ready = assertVideoPromptReady(burnPromptLocal, ctx);
      if (!ready.ok && isTrueDesignGap(ctx)) {
        return res.status(400).send(
          error(ready.reasons.join(", ") || "视频提示词设计缺口", {
            code: ready.code ?? "VP-THIN-SHELL",
            primaryNextStep: "chat_repair",
            reverseTrigger: "video_prompt_stub",
          }),
        );
      }
      vendorPrompt = burnPromptLocal;
    }
    const fin = finalizeFiveSectionPrompt({
      prompt: vendorPrompt,
      dialogueLines: litDial,
      durationSec: burnDuration,
      preferStaticOnDialogue: litDial.length > 0,
    });
    let burnPrompt = fin.prompt;
    /** UX: if we detect VIDEO-PROMPT-STALE early, auto-unblock by updating burn egress hash. */
    let autoRecompiledVideoPrompt = false;
    /** Use live design hash for shot chain egress to avoid recompile-block UX. */
    let designContentHashNowForEgress: string | null = null;
    {
      const { resolveLipDurationSingleSource } = await import("@/ruleEngine/quality/resolveLipDuration");
      const {
        resolveLipSyncPolicyFromShot,
        softHealNoLipDialogueOnShots,
        DEFAULT_ONCAM_LIP_POLICY,
      } = await import("@/ruleEngine/quality/resolveLipSyncPolicy");
      // Homology until-clear: on-camera + none/silent → subtle before burn (no chat_repair 400)
      if (onCamDialogue && shotMeta) {
        softHealNoLipDialogueOnShots([shotMeta as Record<string, unknown>]);
        try {
          if (pkg?.shots?.length && storyboardId != null) {
            const ix = pkg.shots.findIndex((s) => s.storyboardId === storyboardId);
            if (ix >= 0) {
              const row = pkg.shots[ix] as Record<string, unknown>;
              const sd = { ...((row.shotDesign as object) ?? {}), lipSyncPolicy: DEFAULT_ONCAM_LIP_POLICY };
              const narr = { ...((row.narrative as object) ?? {}), lipSyncPolicy: DEFAULT_ONCAM_LIP_POLICY };
              pkg.shots[ix] = { ...row, shotDesign: sd, narrative: narr, lipSyncPolicy: DEFAULT_ONCAM_LIP_POLICY } as never;
              const { saveEpisodePackage } = await import("@/ruleEngine/storage/episodePackageStore");
              await saveEpisodePackage(u.db, pkg);
            }
          }
        } catch {
          /* best-effort persist */
        }
      }
      let lipPol = resolveLipSyncPolicyFromShot(shotMeta as Record<string, unknown> | undefined);
      if (onCamDialogue && /^(none|silent)$/i.test(lipPol)) {
        lipPol = DEFAULT_ONCAM_LIP_POLICY;
      }
      const ss = resolveLipDurationSingleSource({
        prompt: burnPrompt,
        lipSyncPolicy: lipPol,
        hasDialogue: onCamDialogue,
        durationSec: burnDuration,
        // Soft-upgrade path only — refuseExplicitSilent retired for burn (homology with import)
        hardBlockNoLipOnDialogue: false,
        refuseExplicitSilent: false,
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
        let designHashAtCompile =
          String(
            (shotMeta as { designContentHash?: string }).designContentHash ??
              (meta as { designContentHash?: string } | undefined)?.designContentHash ??
              "",
          ).trim() || undefined;
        // Prefer stamp written when video prompt was compiled onto the track
        if (!designHashAtCompile && trackId) {
          try {
            const tr = await u.db("o_videoTrack").where({ id: trackId }).select("reason").first();
            const trReason =
              typeof tr?.reason === "string"
                ? JSON.parse(String(tr.reason || "{}"))
                : { ...(tr?.reason as object | undefined) };
            const h = String((trReason as { designContentHash?: string })?.designContentHash ?? "").trim();
            if (h) designHashAtCompile = h;
            if ((trReason as { videoStale?: boolean })?.videoStale) {
              (shotMeta as { videoStale?: boolean }).videoStale = true;
            }
          } catch {
            /* optional */
          }
        }
        if (designContentHashNowForEgress) {
          // UX: when stale detected, recompile prompt earlier; update chain-ejection hash to live design.
          designHashAtCompile = designContentHashNowForEgress;
        }
        let eg = assertChainEgress("burn", c, {
          videoPrompt: burnPrompt,
          burnDuration,
          designContentHashAtCompile: designHashAtCompile,
        });
        if (!eg.ok && eg.codes.includes("VIDEO-PROMPT-STALE")) {
          // Self-heal only with track writeback of live prompt + hash (no silent clear)
          let wrote = false;
          try {
            autoRecompiledVideoPrompt = true;
            const row = shotMeta as Record<string, unknown>;
            const c2 = buildShotChainContract(row);
            designContentHashNowForEgress = c2.designContentHash;
            if (trackId && burnPrompt) {
              const tr = await u.db("o_videoTrack").where({ id: trackId }).select("reason").first();
              let trReason: Record<string, unknown> = {};
              try {
                trReason =
                  typeof tr?.reason === "string"
                    ? JSON.parse(String(tr.reason || "{}"))
                    : { ...((tr?.reason as object) ?? {}) };
              } catch {
                trReason = {};
              }
              await u.db("o_videoTrack").where({ id: trackId }).update({
                prompt: burnPrompt,
                reason: JSON.stringify({
                  ...trReason,
                  designContentHash: designContentHashNowForEgress,
                  videoStale: false,
                  staleClearedAt: new Date().toISOString(),
                  staleClearSource: "chain_egress_writeback",
                }),
              });
              wrote = true;
            }
            if (wrote) {
              row.videoStale = false;
              try {
                const reason =
                  typeof row.reason === "string"
                    ? JSON.parse(String(row.reason || "{}"))
                    : { ...((row.reason as Record<string, unknown>) ?? {}) };
                const chainStale = { ...((reason.chainStale as Record<string, unknown>) ?? {}), video: false };
                row.reason = { ...reason, chainStale };
              } catch {
                /* optional */
              }
              eg = assertChainEgress("burn", c2, {
                videoPrompt: burnPrompt,
                burnDuration,
                designContentHashAtCompile: designContentHashNowForEgress,
              });
            }
          } catch {
            wrote = false;
          }
        }
        if (!eg.ok) {
          return res.status(400).send(
            error(eg.findings[0]?.message || "chain egress blocked", {
              code: eg.codes[0] ?? "CHAIN-EGRESS",
              primaryNextStep: eg.breakAt === "split" || eg.breakAt === "cam_split" ? "split_shot" : "chat_repair",
              userMessage: eg.findings.map((f) => f.message).join("；"),
              reverseTrigger:
                eg.codes[0] === "DUR-DESYNC"
                  ? "dur_desync"
                  : eg.codes[0] === "PROMPT-FIDELITY"
                    ? "prompt_fidelity"
                    : eg.codes[0] === "VIDEO-PROMPT-STALE"
                      ? "video_prompt_stale"
                      : "design_loss",
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
    /** VLM infra gap + usable still file: do not forever-block via IMG-STILL-QA */
    let softAllowWeakStillForInfra = false;
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
      try {
        stillMeta = resolved.reasonRaw ? JSON.parse(resolved.reasonRaw) : null;
      } catch {
        stillMeta = null;
      }
      // Vendor egress for sheetLeak/contact/mouth — literary column is edit SSOT only
      stillPromptForHandoff =
        String(resolved.promptUsed ?? "").trim() ||
        String((stillMeta as { promptUsed?: string } | null)?.promptUsed ?? "").trim() ||
        resolved.prompt ||
        String(sbRow?.prompt ?? "");
      const vlmInfra = isStillVlmInfraGap(stillMeta);
      let sheetLeak = Boolean((stillMeta as { sheetLeak?: boolean } | null)?.sheetLeak);
      try {
        const { promptImpliesSheetCollageLeak, detectSheetLeakFromVlmItems } =
          await import("@/ruleEngine/compilers/stillFirstFrameLiterarySsot");
        // Sticky sheetLeak from VLM-infra single_frame placeholders ≠ pixel 拼版
        if (vlmInfra && sheetLeak) {
          const items = (stillMeta as { fidelityItems?: Array<{ id: string; pass?: boolean; evidence?: string }> } | null)
            ?.fidelityItems;
          if (!items?.length || !detectSheetLeakFromVlmItems(items)) {
            sheetLeak = false;
          }
        }
        sheetLeak = sheetLeak || promptImpliesSheetCollageLeak(stillPromptForHandoff);
      } catch {
        if (vlmInfra) sheetLeak = false;
      }
      softAllowWeakStillForInfra = vlmInfra && !sheetLeak && Boolean(resolvedStillPath);
      // G0/G12: Key-absent never soft-allows quality burn
      try {
        const { isStillKeyAbsentOnly } = await import("@/ruleEngine/qc/resolveStillForBurn");
        if (isStillKeyAbsentOnly(stillMeta)) softAllowWeakStillForInfra = false;
      } catch {
        /* optional */
      }
      // Contact-event + prop missing: never soft-allow weak still as burn-ok (SOFT-ALLOW-CONTACT-PROP-FORBIDDEN)
      try {
        const { isContactEventVd, textHasPropInFrame, matchContactEventVd, woundVisibleIsNotProp } =
          await import("@/ruleEngine/compilers/contactEventPolicy");
        const vdCheck = String(
          (shotMeta as { visualDescription?: string } | undefined)?.visualDescription ?? "",
        );
        if (isContactEventVd(vdCheck)) {
          const m = matchContactEventVd(vdCheck);
          const stillBlob = stillPromptForHandoff;
          const propOk = textHasPropInFrame(stillBlob, m) && !woundVisibleIsNotProp(stillBlob);
          if (!propOk) {
            softAllowWeakStillForInfra = false;
            if (stillMeta) {
              stillMeta = { ...(stillMeta as object), propMissing: true, propInFrame: false };
            }
          }
          // G12: cheek/mouth contact — still egress must carry mouth-ban HARD or block soft path
          const stillBlobLower = stillPromptForHandoff;
          if (
            /面颊|颊|贴颊/.test(vdCheck) &&
            !/禁口含|纸未入口|禁纸入口|仅.+触非口含/.test(stillBlobLower)
          ) {
            softAllowWeakStillForInfra = false;
            if (stillMeta) {
              stillMeta = {
                ...(stillMeta as object),
                mouthBanMissing: true,
                stillQuality: stillMeta.stillQuality === "hq_ok" ? "weak" : stillMeta.stillQuality,
              };
            }
          }
        }
        // G12: design spatial present but still/VD lack 站位/空间 — block soft burn
        const spatialDesign = String(
          (shotMeta as { spatialRelation?: string } | undefined)?.spatialRelation ??
            (shotMeta as { narrative?: { spatialRelation?: string } } | undefined)?.narrative
              ?.spatialRelation ??
            "",
        ).trim();
        if (
          spatialDesign &&
          !/站位：|空间关系：|左右|对峙|近景相对/.test(
            `${stillPromptForHandoff}\n${vdCheck}`,
          )
        ) {
          softAllowWeakStillForInfra = false;
          if (stillMeta) {
            stillMeta = { ...(stillMeta as object), spatialMissing: true };
          }
        }
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
        // Practice: VIDEO-PROMPT-STALE — clear only after track prompt writeback with live hash
        let wroteTrack = false;
        try {
          const { buildShotChainContract } = await import("@/ruleEngine/quality/shotChainContract");
          designContentHashNowForEgress = buildShotChainContract(shotMeta as Record<string, unknown>).designContentHash;
          autoRecompiledVideoPrompt = true;
          const promptNow = String(burnPrompt || prompt || "").trim();
          if (trackId && promptNow) {
            const trReasonRaw = await u.db("o_videoTrack").where("id", trackId).first();
            let trReason: Record<string, unknown> = {};
            try {
              trReason = JSON.parse(String((trReasonRaw as { reason?: string } | undefined)?.reason || "{}"));
            } catch {
              trReason = {};
            }
            await u.db("o_videoTrack").where("id", trackId).update({
              prompt: promptNow,
              reason: JSON.stringify({
                ...trReason,
                designContentHash: designContentHashNowForEgress,
                videoStale: false,
                staleClearedAt: new Date().toISOString(),
                staleClearSource: "burn_writeback",
              }),
            });
            wroteTrack = true;
          }
        } catch {
          wroteTrack = false;
        }
        if (wroteTrack) {
          stillMeta = { ...(stillMeta as object), videoStale: false };
        }
        // If writeback failed, keep videoStale — chain egress may still BLOCK
      }
      const { assertStillFirstFrameContract } = await import("@/ruleEngine/qc/stillFirstFrameGate");
      const { assertStillDetectForBurn } = await import("@/ruleEngine/qc/stillDetectRepair");
      const { markStillStaleOnDescChange, markVideoStaleOnDesignContentChange } =
        await import("@/ruleEngine/compilers/stillQuality");
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
      // M7 dialogue/VD designContentHash drift → require still recompose/regen before clearing videoStale
      if (!vlmInfra && shotMeta && stillMeta) {
        try {
          const { buildShotChainContract } = await import("@/ruleEngine/quality/shotChainContract");
          const liveHash = buildShotChainContract(shotMeta as Record<string, unknown>).designContentHash;
          const drift = markVideoStaleOnDesignContentChange(stillMeta as never, liveHash);
          if (drift) {
            designContentHashNowForEgress = liveHash;
            // Do NOT clear videoStale or fake-green: still must recompose/regen first
            stillMeta = {
              ...(stillMeta as object),
              ...drift,
              designContentHash: liveHash,
              videoStale: true,
              stillQuality: "weak",
              requireStillRegenBeforeVideo: true,
              staleClearSource: "hash_drift_need_still_regen",
            };
            stillQuality = "weak";
          }
        } catch {
          /* optional */
        }
      }
      const detect = assertStillDetectForBurn({
        stillPrompt: stillPromptForHandoff,
        stillFilePath: resolvedStillPath,
        literaryDesc,
        literaryDescHashAtCompose: (stillMeta as { literaryDescHash?: string } | null)?.literaryDescHash,
        stillMeta: stillMeta as never,
        // Infra gap: do not feed weak into detect (homology test-still-burn-resolve)
        stillQuality: vlmInfra && !sheetLeak ? undefined : stillQuality,
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
          {
            nextStep: next,
            primary: {
              userMessage: detect.message,
              ctaLabel: detect.ctaLabel,
            },
          },
        );
        return res.status(400).send(
          error(detect.message || "静照检测未过", {
            code: detect.code ?? "STILL-FIRSTFRAME-DIRTY",
            primaryNextStep: noFile ? "batch_still" : detect.primaryNextStep ?? next,
            reverseTrigger: detect.reverseTrigger ?? "still_firstframe_dirty",
            rePushPlan: env.rePushPlan,
            repairHints: env.repairHints,
            nextStep: next,
            userMessage: env.userMessage,
            ctaLabel:
              detect.ctaLabel ??
              env.ctaLabel ??
              (detect.irdPrimaryAction === "hand_edit_vd" ? "手改VD" : undefined),
            resolvedStoryboardId: resolved.storyboardId,
            hasStillFile: Boolean(resolvedStillPath),
            vlmInfraGap: vlmInfra,
            resolveSource: resolved.resolveSource,
            irdPrimaryAction: detect.irdPrimaryAction,
            missingSlots: detect.missingSlots,
          }),
        );
      }
      const ff = assertStillFirstFrameContract({
        stillPrompt: stillPromptForHandoff,
        stillFilePath: resolvedStillPath,
        requireStill: true,
        literaryDesc,
        literaryDescHashAtCompose: (stillMeta as { literaryDescHash?: string } | null)?.literaryDescHash,
        stillQuality: vlmInfra && !sheetLeak ? undefined : stillQuality,
        sheetLeak,
        qualityMode: (stillMeta as { qualityMode?: string } | null)?.qualityMode,
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
          {
            nextStep: next,
            primary: {
              userMessage: ff.message,
              ctaLabel:
                noFile ? "去生成静照" : next === "split_shot" ? "确认智能拆镜" : next === "batch_still" ? "去生成静照" : undefined,
            },
          },
        );
        return res.status(400).send(
          error(ff.message || "静照首帧不合格", {
            code: ff.code ?? "STILL-FIRSTFRAME-DIRTY",
            primaryNextStep: noFile ? "batch_still" : ff.primaryNextStep ?? next,
            userMessage: env.userMessage,
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

    try {
      const { assessStillVideoReadiness } = await import("@/ruleEngine/qc/stillVideoReadiness");
      const vdForReadiness = String(
        (shotMeta as { visualDescription?: string } | undefined)?.visualDescription ??
          (shotMeta as { narrative?: { visualDescription?: string } } | undefined)?.narrative
            ?.visualDescription ??
          "",
      );
      const readiness = assessStillVideoReadiness({
        stillQuality: typeof stillQuality === "string" ? stillQuality : null,
        visualPass: (stillMeta as { visualPass?: boolean } | null)?.visualPass ?? null,
        sheetLeak: (stillMeta as { sheetLeak?: boolean } | null)?.sheetLeak ?? null,
        fidelityItems: ((stillMeta as { fidelityItems?: Array<{ id: string; pass: boolean }> } | null)?.fidelityItems ??
          []) as Array<{ id: string; pass: boolean }>,
        promptUsed: stillPromptForHandoff,
        visualDescription: vdForReadiness,
        i2vCriticalFacts:
          ((stillMeta as { i2vCriticalFacts?: string[] } | null)?.i2vCriticalFacts ??
            (stillMeta as { generationContract?: { i2vCriticalFacts?: string[] } } | null)
              ?.generationContract?.i2vCriticalFacts ??
            null) as string[] | null,
        contract:
          ((stillMeta as { generationContract?: unknown } | null)?.generationContract ??
            null) as import("@/ruleEngine/design/deriveGenerationContract").GenerationContract | null,
        stillMeta: stillMeta as Record<string, unknown> | null,
      });
      if (!readiness.i2vReady) {
        return res.status(400).send(
          error("静照未达到视频起始帧标准", {
            code: "STILL-I2V-NOT-READY",
            primaryNextStep: "regen_storyboard_hq",
            ctaLabel: "重出HQ静照",
            userMessage: readiness.reason || "still 可看但不适合作视频起始帧",
            criticalMisses: readiness.criticalMisses,
          }),
        );
      }
      const { assertStillContactVideoHandoff } = await import("@/ruleEngine/qc/stillContactVideoHandoff");
      const vdForContact = String(
        (shotMeta as { visualDescription?: string } | undefined)?.visualDescription ??
          (shotMeta as { narrative?: { visualDescription?: string } } | undefined)?.narrative?.visualDescription ??
          "",
      );
      const contactGate = assertStillContactVideoHandoff({
        visualDescription: vdForContact,
        stillPrompt: stillPromptForHandoff,
        stillMeta: stillMeta as Record<string, unknown> | null,
        stillQuality: typeof stillQuality === "string" ? stillQuality : null,
        propMissing: Boolean((stillMeta as { propMissing?: boolean } | null)?.propMissing),
      });
      if (!contactGate.ok && contactGate.severity === "BLOCK") {
        return res.status(400).send(
          error(contactGate.message || "contact handoff blocked", {
            code: "STILL-CONTACT-HANDOFF",
            primaryNextStep: contactGate.primaryNextStep ?? "regen_storyboard_hq",
            ctaLabel: "重出带道具静照",
            userMessage: contactGate.message,
            reverseTrigger: contactGate.reverseTrigger ?? "still_prop_missing",
            missingSlots: contactGate.missingSlots,
          }),
        );
      }
      // AV enhance Motion 起态补助 — L3 handoff only; never reseals still L0
      const motionHint = String(
        (stillMeta as { videoMotionStartHint?: string } | null)?.videoMotionStartHint ??
          (stillMeta as { generationContract?: { videoMotionStartHint?: string } } | null)
            ?.generationContract?.videoMotionStartHint ??
          "",
      ).trim();
      if (motionHint && !burnPrompt.includes(motionHint.slice(0, Math.min(12, motionHint.length)))) {
        burnPrompt = `${motionHint}\n${burnPrompt}`.trim();
      }
      const { assertStillVideoPoseHandoff } = await import("@/ruleEngine/qc/stillVideoPoseHandoff");
      const poseGate = assertStillVideoPoseHandoff({
        visualDescription: vdForContact,
        stillPrompt: stillPromptForHandoff,
        stillMeta: stillMeta as Record<string, unknown> | null,
        videoPrompt: burnPrompt,
        contactStartState: (stillMeta as { contactStartState?: string } | null)?.contactStartState as
          | import("@/ruleEngine/compilers/contactEventPolicy").ContactStartState
          | undefined,
      });
      if (!poseGate.ok && poseGate.severity === "BLOCK") {
        return res.status(400).send(
          error(poseGate.message || "still/video pose handoff blocked", {
            code: poseGate.code ?? "STILL-VIDEO-POSE-MISMATCH",
            primaryNextStep: poseGate.primaryNextStep ?? "regen_storyboard_hq",
            ctaLabel: "重编译 Motion 或重出静照",
            userMessage: poseGate.message,
            stillPoseAnchor: poseGate.stillPoseAnchor,
          }),
        );
      }
    } catch (e) {
      const errMsg = u.error(e).message || "contact handoff failed";
      return res.status(400).send(
        error(errMsg, {
          code: "STILL-CONTACT-HANDOFF",
          primaryNextStep: "regen_storyboard_hq",
          userMessage: errMsg,
        }),
      );
    }

    const qdFx = String(shotMeta?.generation?.fxFeasibility ?? shotMeta?.fxFeasibility ?? shotMeta?.fxLevel ?? "");
    let workingShot = shotMeta as Record<string, unknown> | undefined;
    let burnPromptWorking = burnPrompt;
    {
      const { softHealVideoHomologyOnShots } = await import("@/ruleEngine/heal/videoHomologyHeal");
      if (workingShot) {
        const hom = softHealVideoHomologyOnShots({ shots: [workingShot], vendorId: vendorIdFromModel(model) });
        if (hom.changed && hom.shots[0]) workingShot = hom.shots[0];
      }
      const scrubQd = scrubVideoPromptForBurn({
        prompt: burnPromptWorking,
        vendorId: vendorIdFromModel(model),
        dialogueLines: litDial,
      });
      if (scrubQd.block) {
        return res.status(400).send(
          error(scrubQd.block.message, {
            code: scrubQd.block.id,
            primaryNextStep: "chat_repair",
            ctaLabel: "确认运镜调解",
            reverseTrigger: "vid_cam_mediate",
          }),
        );
      }
      burnPromptWorking = scrubQd.prompt;
      burnPrompt = burnPromptWorking;
    }
    let qd = decideVideoQuality({
      videoPrompt: burnPromptWorking,
      shot: workingShot as never,
      vendorId: vendorIdFromModel(model),
      fxGrade: qdFx,
      missingStillOrCref: false,
      // Homology: infra gap + file must not forever-block as IMG-STILL-QA
      stillQuality: softAllowWeakStillForInfra ? null : stillQuality,
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
        stillQuality: softAllowWeakStillForInfra ? null : stillQuality,
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
    const burnDebug = {
      model,
      mode: modeData.length > 0 ? modeData : mode,
      source: burnAdapt.source,
      staleSeedDiscarded: burnAdapt.staleSeedDiscarded,
      designDurationSec,
      runDuration,
      promptHash: require("crypto").createHash("sha1").update(vendorPromptFinal).digest("hex").slice(0, 12),
      promptPreview: vendorPromptFinal.slice(0, 500),
      designIntentFidelity: burnAdapt.fidelity,
    };
    const [videoId] = await u.db("o_video").insert({
      filePath: videoPath,
      time: Date.now(),
      state: "生成中",
      scriptId,
      projectId,
      videoTrackId: trackId,
      errorReason: JSON.stringify({ stage: "burn_start", burnDebug }),
    });
    // Keep track pointer on newest clip (history rows remain in o_video)
    try {
      const { mergeTrackReasonMeta, designHashStampFromShot } = await import("@/ruleEngine/qc/persistVideoTrackPromptHash");
      const trackRow = await u.db("o_videoTrack").where({ id: trackId }).select("prompt", "reason").first();
      const stamp = designHashStampFromShot((shotMeta as unknown as Record<string, unknown>) ?? null);
      const promptNow = String(vendorPromptFinal ?? trackRow?.prompt ?? "");
      const reason = mergeTrackReasonMeta(trackRow?.reason, {
        promptOverwriteAt: new Date().toISOString(),
        promptHash: require("crypto").createHash("sha1").update(promptNow).digest("hex").slice(0, 12),
        ...stamp,
        burnPromptSource: burnAdapt.source,
        burnDurationSec: runDuration,
        designIntentFidelity: burnAdapt.fidelity,
        note: autoRecompiledVideoPrompt
          ? "auto recompile to bypass VIDEO-PROMPT-STALE；片历史在 o_video 多行"
          : "track.prompt 覆盖非版本库；片历史在 o_video 多行",
        videoId,
      });
      await u.db("o_videoTrack").where({ id: trackId }).update({
        videoId,
        prompt: promptNow,
        duration: runDuration,
        reason,
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
        const { buildPostBurnVideoUpdate } = await import("@/ruleEngine/qc/persistPostBurnVideo");
        const visualPass = stillQuality === "hq_ok";
        // softAllow skips IMG-STILL-QA gate only — must not forge visualPass / L1 stamp
        const { pixelDimStatus, mustDimAllowsVideoPass } =
          require("@/ruleEngine/quality/practiceCompleteness") as typeof import("@/ruleEngine/quality/practiceCompleteness");
        // Key/adapter optional: absent ⇒ unmeasured must-dims cannot claim videoPass via motion
        const vlmAdapterPresent = Boolean(
          process.env.STILL_VLM_ADAPTER ||
            process.env.VOLCENGINE_API_KEY ||
            process.env.ARK_API_KEY,
        );
        const motionStatus = pixelDimStatus({
          keyOrAdapterPresent: vlmAdapterPresent,
          observed: undefined,
        });
        const post = runPostBurnRuntime({
          shotId: storyboardId,
          hasDialogue: dialLines.length > 0,
          visualPass,
          vlmAdapterPresent,
          audioL1: {
            vendorReportedAudio: generateAudio !== false,
            dialogueLines: dialLines,
          },
          videoPrompt: vendorPromptFinal,
          visualDescription: String(
            (shotMeta as { visualDescription?: string } | undefined)?.visualDescription ?? "",
          ),
          shotSize: String(
            (shotMeta as { shotSize?: string } | undefined)?.shotSize ??
              (shotMeta as { narrative?: { shotSize?: string } } | undefined)?.narrative?.shotSize ??
              "",
          ),
        });
        // Contact / must-dim honesty: unmeasured forbids treating as videoPass when contact VD
        try {
          const { isContactEventVd } =
            require("@/ruleEngine/compilers/contactEventPolicy") as typeof import("@/ruleEngine/compilers/contactEventPolicy");
          const vd = String(
            (shotMeta as { visualDescription?: string } | undefined)?.visualDescription ?? "",
          );
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
        if (storyboardId && scriptId) {
          try {
            const { writebackBurnVideoToPackage } = await import("@/ruleEngine/qc/persistBurnPackageWriteback");
            await writebackBurnVideoToPackage({
              db: u.db,
              projectId,
              scriptId,
              storyboardId,
              videoPrompt: vendorPromptFinal,
              promptHash: require("crypto").createHash("sha1").update(vendorPromptFinal).digest("hex").slice(0, 12),
              durationSec: runDuration,
              intentClass: burnAdapt.intentClass,
              shotMeta: (shotMeta as Record<string, unknown>) ?? null,
            });
          } catch {
            /* best-effort package writeback */
          }
        }
        const { seedStoryboardAfterPostBurn } = await import("@/ruleEngine/qc/persistPostBurnVideo");
        await seedStoryboardAfterPostBurn(u.db, { storyboardId, post });
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
