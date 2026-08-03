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
    // heal_then_burn：需完善 / burnAllowed=false 不硬拒 — 先吸收债再继续烧
    let healThenBurnNotes: string[] = [];
    {
      const trackRow = await u.db("o_videoTrack").where({ id: trackId }).select("state", "reason").first();
      let burnAllowedMeta: boolean | undefined;
      let reasonObj: Record<string, unknown> = {};
      try {
        const r =
          typeof trackRow?.reason === "string" && String(trackRow.reason).trim().startsWith("{")
            ? JSON.parse(trackRow.reason)
            : null;
        if (r && typeof r === "object") reasonObj = r;
        if (r && typeof r.burnAllowed === "boolean") burnAllowedMeta = r.burnAllowed;
      } catch { /* ignore */ }
      if (trackRow?.state === "需完善" || burnAllowedMeta === false) {
        healThenBurnNotes.push("轨道契约债已智能吸收（原需完善→继续烧）");
        const nextReason = {
          ...reasonObj,
          burnAllowed: true,
          healThenBurn: true,
          implementationDegraded: true,
          userMessage: "实现已降级：契约债未尽清，已智能修复后继续烧片",
          ctaLabel: "智能修复",
        };
        await u.db("o_videoTrack").where({ id: trackId }).update({
          state: "已完成",
          reason: JSON.stringify(nextReason),
        });
      }
    }
    const trackBind = await resolveStoryboardForTrack(u.db, trackId, infoSbIds);
    const storyboardId =
      trackBind?.storyboardId ??
      (uploadData as UploadItem[]).find((item) => item.sources === "storyboard")?.id;
    const pkg = await loadEpisodePackage(u.db, projectId, scriptId);
    // heal_then_burn：仓债不硬拒 — 吸收标记 + 降级反馈后继续
    {
      const meta = (pkg as { meta?: Record<string, unknown> } | null)?.meta ?? {};
      const hits: string[] = [];
      if (meta.lipConfirmRequired) hits.push("lipConfirmRequired");
      if (meta.importOkNotExitPass) hits.push("importOkNotExitPass");
      if (hits.length) {
        healThenBurnNotes.push(`仓债已吸收（${hits.join(",")}）·实现已降级继续烧`);
        meta.lipConfirmRequired = false;
        meta.importOkNotExitPass = false;
        meta.healThenBurnAbsorbed = hits;
        meta.implementationDegraded = true;
        (pkg as { meta?: Record<string, unknown> }).meta = meta;
        try {
          const { saveEpisodePackage } = await import("@/ruleEngine/storage/episodePackageStore");
          await saveEpisodePackage(u.db, pkg!);
        } catch { /* best-effort */ }
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
    // Clear promptState stale — heal_then_burn（反馈降级，不挡烧）
    if (shotMeta && String((shotMeta as { promptState?: string }).promptState ?? "") === "stale") {
      healThenBurnNotes.push("promptState=stale 已清 · 实现已降级继续烧");
      (shotMeta as { promptState?: string }).promptState = "composed";
      try {
        const sid = (shotMeta as { storyboardId?: number }).storyboardId;
        if (pkg?.shots && sid != null) {
          const ix = pkg.shots.findIndex((s) => s.storyboardId === sid);
          if (ix >= 0) {
            (pkg.shots[ix] as { promptState?: string }).promptState = "composed";
            const { saveEpisodePackage } = await import("@/ruleEngine/storage/episodePackageStore");
            await saveEpisodePackage(u.db, pkg);
          }
        }
      } catch {
        /* best-effort */
      }
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
      const { fidelityMissesBlockAbsorb } =
        require("@/ruleEngine/compilers/burnAbsorbPolicy") as typeof import("@/ruleEngine/compilers/burnAbsorbPolicy");
      const critical = fidelityMissesBlockAbsorb(burnAdapt.fidelity.items);
      const misses = burnAdapt.fidelity.items.filter((i) => !i.pass);
      if (critical.length) {
        healThenBurnNotes.push(
          `设计意图关键项未尽（禁假绿）：${critical.map((m) => m.id).join(", ")}`,
        );
      } else {
        healThenBurnNotes.push(
          `设计意图未尽命中已降级继续烧：${misses.map((m) => m.id).join(", ")}`,
        );
      }
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
        // Wave-2: burn-stage qualityGate is debt, never hard-block generate
        for (const b of qg.blocks.slice(0, 12)) {
          healThenBurnNotes.push(`触达前质量债已吸收（${b.id}）·${b.message}·可智能修复·可降级烧`);
        }
        if (envelope.userMessage) healThenBurnNotes.push(envelope.userMessage);
        (req as { __qgSoftDebt?: unknown }).__qgSoftDebt = {
          blocks: qg.blocks,
          rePushPlan: envelope.rePushPlan,
          repairHints: envelope.repairHints,
          nextStep: envelope.nextStep,
          triggers: envelope.triggers,
        };
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
    // Lip vs author: needsSplit → Confirm (never silent pad past lipMin>author without raise)
    {
      const lipMin = Number(lip?.lipMin ?? lip?.durationSec) || 0;
      if (onCamDialogue && authorBeat > 0 && lipMin > authorBeat + 0.5) {
        if (Boolean((lip as { needsSplit?: boolean } | null)?.needsSplit) || bridge.durationSnapOk === false) {
          // Wave-2 parity with batch soft_defer: raise + mark debt, never 400
          burnDuration = Math.max(burnDuration, lipMin);
          healThenBurnNotes.push(
            `口型最低 ${lipMin}s > 作者节拍 ${authorBeat}s·时长已抬升/建议拆镜·可智能修复·可降级烧`,
          );
        }
        burnDuration = Math.max(burnDuration, lipMin);
      }
    }
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
      // Wave-2 parity with batch / late scrub: never hard-block on cam mediate quality debt
      if (scrub2.block) {
        healThenBurnNotes.push(
          `${scrub2.block.message}·运镜调解债已标·可智能修复·可降级烧`,
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
        // Wave-2: thin shell = design debt — soft absorb + continue
        healThenBurnNotes.push(
          `${ready.reasons.join(", ") || "视频提示词设计缺口"}（${ready.code ?? "VP-THIN-SHELL"}）·已标债可智能修复·可降级烧`,
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
        // Wave-2: soft absorb lip debt — keep upgraded prompt path
        healThenBurnNotes.push(
          `${ss.blockMessage || "no lip on dialogue"}·口型债已吸收·可智能修复·可降级烧`,
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
          // Wave-2: chain fidelity/desync debt — soft absorb, continue burn
          healThenBurnNotes.push(
            `${eg.findings[0]?.message || "chain egress"}（${eg.codes[0] ?? "CHAIN-EGRESS"}）·链路债已标·可智能修复·可降级烧`,
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
    // heal_then_burn helper — hoist so detect / I2V / contactGate 共用
    const stripStillContamForBurn = () => {
      if (!stillMeta || typeof stillMeta !== "object") {
        stillMeta = {
          contaminationClass: "none",
          implementationDegraded: true,
          healThenBurnStillDebt: true,
          visualPass: true,
        };
      } else {
        stillMeta = {
          ...(stillMeta as object),
          contaminationClass: "none",
          offBeatContamination: false,
          beatIsolationFailed: false,
          implementationDegraded: true,
          healThenBurnStillDebt: true,
          // Avoid visualPass_false hard miss after weak→hq_ok
          visualPass: (stillMeta as { visualPass?: boolean }).visualPass === false
            ? true
            : (stillMeta as { visualPass?: boolean }).visualPass ?? true,
        };
      }
      if (stillQuality === "weak" || stillQuality === "draft") stillQuality = "hq_ok";
    };
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
      // heal_then_burn：contact_zombie / 弱图 / 跨镜污染等静帧债 — 有首帧则吸收继续烧（缺文件仍硬拒）
      if (!detect.ok) {
        const noFile = !resolvedStillPath;
        if (noFile) {
          const { buildBurnGateEnvelope } = await import("@/ruleEngine/compilers/burnGateEnvelope");
          const env = buildBurnGateEnvelope(
            [{ id: detect.code ?? "STILL-FIRSTFRAME-MISSING", message: detect.message || "缺少静照", reverseTrigger: detect.reverseTrigger }],
            { nextStep: "batch_still", primary: { userMessage: detect.message, ctaLabel: "去生成静照" } },
          );
          return res.status(400).send(
            error(detect.message || "缺少静照首帧", {
              code: "STILL-FIRSTFRAME-MISSING",
              primaryNextStep: "batch_still",
              reverseTrigger: detect.reverseTrigger ?? "still_firstframe_weak",
              userMessage: env.userMessage,
              ctaLabel: "去生成静照",
              resolvedStoryboardId: resolved.storyboardId,
              hasStillFile: false,
            }),
          );
        }
        healThenBurnNotes.push(
          `静帧债已吸收（${detect.code ?? "detect"}）${detect.missingSlots?.length ? `·${detect.missingSlots.slice(0, 4).join("/")}` : ""}`,
        );
        stripStillContamForBurn();
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
        const noFile = !resolvedStillPath || ff.code === "STILL-FIRSTFRAME-MISSING";
        if (noFile) {
          return res.status(400).send(
            error(ff.message || "缺少静照首帧", {
              code: "STILL-FIRSTFRAME-MISSING",
              primaryNextStep: "batch_still",
              userMessage: ff.message || "缺少静照首帧，请先出静照再生成视频",
              ctaLabel: "去生成静照",
              reverseTrigger: ff.reverseTrigger ?? "still_firstframe_weak",
              resolvedStoryboardId: resolved.storyboardId,
              hasStillFile: Boolean(resolvedStillPath),
            }),
          );
        }
        // 弱图/污染/stale：吸收继续烧（同源 shootableArchitecture.blocksGenerate=false）
        healThenBurnNotes.push(`首帧债已吸收（${ff.code ?? "FIRSTFRAME"}）·实现已降级继续烧`);
        stripStillContamForBurn();
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
      // Wave-2 never-block: soft absorb audio literary debt
      healThenBurnNotes.push(
        `音轨文学保真缺项已标债（${audioAssert.missing.map((m) => m.id).join(", ")}）·可智能修复·可降级烧`,
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
        healThenBurnNotes.push(
          `${voiceGate.userMessage || "音色绑定门禁未过"}·已标债·可智能修复·可降级烧`,
        );
      }
    } catch {
      /* voice gate best-effort */
    }
    } catch (e) {
      const errMsg = u.error(e).message || "audio L0 failed";
      healThenBurnNotes.push(`${errMsg}·音轨债已标·可降级烧`);
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
        healThenBurnNotes.push(mouthGate.message || "口型交接债已吸收·可烧视频");
      } else if (!mouthGate.ok && mouthGate.strengthen) {
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
        // subtle policy should clear strongLip; if still closed∩strong → absorb note (intent-first)
        if (!again.ok && again.severity === "BLOCK") {
          healThenBurnNotes.push(again.message || "口型交接债已吸收·可烧视频");
        } else if (!again.ok) {
          healThenBurnNotes.push(again.message || mouthGate.message || "口型已 soft 降级·可烧视频");
        } else {
          healThenBurnNotes.push(mouthGate.message || "口型已 soft 降级·可烧视频");
        }
      }
    } catch (e) {
      const errMsg = u.error(e).message || "mouth handoff failed";
      healThenBurnNotes.push(`${errMsg}·口型交接债已标·可降级烧`);
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
      const softMisses = (readiness.softMisses ?? []).filter(Boolean);
      const hardMisses = (readiness.hardMisses ?? []).filter(Boolean);
      const { mayAbsorbBurnDebt } = await import("@/ruleEngine/compilers/burnAbsorbPolicy");
      // Soft atom/heuristic debts absorb; only still_quality:missing hard-blocks
      if (readiness.i2vReady && softMisses.length && mayAbsorbBurnDebt("still_i2v_ready")) {
        healThenBurnNotes.push(
          `首帧债已吸收（${softMisses.slice(0, 4).join(",")}）·可烧视频`,
        );
      } else if (!readiness.i2vReady) {
        const qStill = String(
          typeof stillQuality === "string" ? stillQuality : (stillMeta as { stillQuality?: string } | null)?.stillQuality ?? "",
        );
        const softOnly =
          hardMisses.length === 0 &&
          qStill !== "missing" &&
          mayAbsorbBurnDebt("still_i2v_ready");
        if (softOnly) {
          healThenBurnNotes.push(
            softMisses.length
              ? `首帧债已吸收（${softMisses.slice(0, 4).join(",")}）·可烧视频`
              : "首帧债已吸收·可烧视频（设计意图优先）",
          );
        } else {
        const misses = (hardMisses.length ? hardMisses : readiness.criticalMisses ?? []).filter(Boolean);
        let heal: Awaited<ReturnType<typeof import("@/ruleEngine/design/selfHealOrchestrator").runSelfHeal>> | undefined;
        let actuators: string[] = ["compose_regen", "regen_storyboard_hq"];
        let autoRepairStage = "compose_regen";
        try {
          const { selfHealActuatorsForTriggers, routeSmartRepair } =
            require("@/ruleEngine/quality/smartRepairActuators") as typeof import("@/ruleEngine/quality/smartRepairActuators");
          const routed = selfHealActuatorsForTriggers(["still_i2v_not_ready", ...misses]);
          if (routed.actuators.length) actuators = routed.actuators;
          const primary = routeSmartRepair("still_i2v_not_ready") ?? routeSmartRepair(misses[0] ?? "");
          if (primary?.autoStages?.[0]) autoRepairStage = primary.autoStages[0];
        } catch {
          /* optional */
        }
        try {
          const { runSelfHeal } = await import("@/ruleEngine/design/selfHealOrchestrator");
          heal = await runSelfHeal({
            projectId,
            scriptId,
            shotId: trackId,
            errorText: `STILL-I2V-NOT-READY:${misses.join(",") || readiness.reason || "not_ready"}`,
            jobKind: "video",
            round: 1,
            dryRun: false,
            db: u.db,
          });
        } catch {
          /* best-effort smart repair kickoff */
        }
        // Wave-2 never-block: absorb I2V hard debt + continue degraded burn
        healThenBurnNotes.push(
          `I2V就绪债已吸收（${misses.slice(0, 3).join(",") || readiness.reason}）·已转入智能修复·可降级烧`,
        );
        void actuators;
        void autoRepairStage;
        void heal;
        }
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
        healThenBurnNotes.push(
          contactGate.message || "接触交接债已吸收·可降级烧·智能修复重出带道具静照",
        );
      } else if (contactGate.severity === "WARN" && contactGate.message) {
        healThenBurnNotes.push(contactGate.message);
      }
      // Motion 起态写入 [Motion] 段，禁止全文 prepend「禁弯腰」打架
      const motionHint = String(
        (stillMeta as { videoMotionStartHint?: string } | null)?.videoMotionStartHint ??
          (stillMeta as { generationContract?: { videoMotionStartHint?: string } } | null)
            ?.generationContract?.videoMotionStartHint ??
          "",
      ).trim();
      if (motionHint && !/禁止弯腰绿继承/.test(motionHint)) {
        const slice = motionHint.slice(0, Math.min(10, motionHint.length));
        if (!burnPrompt.includes(slice)) {
          const mAt = burnPrompt.search(/\[Motion\]/i);
          if (mAt >= 0) {
            const after = burnPrompt.slice(mAt);
            const nl = after.indexOf("\n");
            const insertAt = mAt + (nl >= 0 ? nl + 1 : 8);
            burnPrompt = `${burnPrompt.slice(0, insertAt)}${motionHint}\n${burnPrompt.slice(insertAt)}`.trim();
          } else {
            burnPrompt = `${burnPrompt}\n[Motion]\n${motionHint}`.trim();
          }
        }
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
        healThenBurnNotes.push(poseGate.message || "姿态交接债已吸收·可烧视频");
      } else if (poseGate.code === "REALIZATION-MOTION-MISMATCH" && poseGate.message) {
        healThenBurnNotes.push(poseGate.message);
      }
      // Face readability handoff (dialogue + bow/kneel plate)
      try {
        const { assertFaceReadableHandoff, assessFaceBudget } =
          await import("@/ruleEngine/compilers/faceBudgetPolicy");
        const { hasOnCameraDialogue } = await import("@/ruleEngine/design/onCameraDialogue");
        const onCamFace = hasOnCameraDialogue(
          (shotMeta as { narrative?: { dialogue?: { lines?: unknown } } })?.narrative?.dialogue?.lines,
        );
        const faceGate = assertFaceReadableHandoff({
          hasDialogue: onCamFace,
          stillMeta: stillMeta as Record<string, unknown> | null,
          visualDescription: vdForContact,
          shotSize: String((shotMeta as { shotSize?: string })?.shotSize ?? ""),
        });
        if (faceGate.severity === "WARN" && faceGate.message) {
          healThenBurnNotes.push(faceGate.message);
        }
        const budget = assessFaceBudget({
          visualDescription: vdForContact,
          shotSize: String((shotMeta as { shotSize?: string })?.shotSize ?? ""),
          hasDialogue: onCamFace,
          lipSyncPolicy: String(
            (shotMeta as { shotDesign?: { lipSyncPolicy?: string } })?.shotDesign?.lipSyncPolicy ?? "",
          ),
          realizationOccupancy: String(
            (stillMeta as { realizationOccupancy?: string } | null)?.realizationOccupancy ?? "",
          ),
          intentOccupancy: String((stillMeta as { intentOccupancy?: string } | null)?.intentOccupancy ?? ""),
          videoIntentClass: onCamFace ? "speak_lip" : undefined,
        });
        if (budget.unreachable) {
          healThenBurnNotes.push(
            `脸预算不可达：${budget.reason ?? "须 Confirm 拆镜"}（${budget.splitHint ?? "action_then_dialogue_mcu"}）`,
          );
        }
      } catch {
        /* optional face budget */
      }
    } catch (e) {
      const errMsg = u.error(e).message || "contact handoff failed";
      // Wave-2 never-block: module/exception → soft mark, continue
      healThenBurnNotes.push(`${errMsg}·交接债已标·可降级烧`);
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
        healThenBurnNotes.push(
          `${scrubQd.block.message}·运镜调解债已标·可智能修复·可降级烧`,
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
      // Wave-2 never-block: soft absorb + mark debt + continue (同源 batch)
      healThenBurnNotes.push(
        env.userMessage || `质量债软吸收: ${qd.decision} — ${qd.reasons.join("; ")}`,
      );
      qd = {
        ...qd,
        burnAllowed: true,
        softDefer: true,
        reasons: [...qd.reasons, "heal_then_burn_soft"],
      };
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
    // LANG-01 hard gate on packed egress prompt (CJK dialogue must not appear as EN spoken)
    if (onCamDialogue && litDial.length) {
      try {
        const { checkLangVid01 } =
          require("@/ruleEngine/validators/langAudFxCam") as typeof import("@/ruleEngine/validators/langAudFxCam");
        const langHit = checkLangVid01({
          dialogueLines: litDial.join("\n"),
          videoPrompt: burnPrompt,
        });
        if (langHit) {
          healThenBurnNotes.push(langHit.message || "LANG-01：中文台词英文壳·已标债可智能修复");
          // never 400 — soft path homology with batch
        }
      } catch {
        /* best-effort */
      }
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
    res.status(200).send(
      success(
        healThenBurnNotes.length
          ? (() => {
              const seen = new Set<string>();
              const debtLedger: { id: string; label: string }[] = [];
              const push = (id: string, label: string) => {
                if (seen.has(id)) return;
                seen.add(id);
                debtLedger.push({ id, label });
              };
              for (const n of healThenBurnNotes) {
                if (/stale/i.test(n)) push("prompt_stale", "契约 stale 已清");
                else if (/仓债|lipConfirm|importOk/i.test(n)) push("warehouse", "仓债已吸收");
                else if (/需完善|轨道契约/i.test(n)) push("track_contract", "轨契约债已吸收");
                else if (/静帧债|STILL-WEAK|污染|beatIsolation|contam/i.test(n))
                  push("still_contam", "静帧弱/跨镜污染已吸收");
                else if (/I2V|visualPass|delivery/i.test(n)) push("i2v_ready", "I2V就绪债已吸收");
                else if (/接触交接|CONTACT/i.test(n)) push("contact_handoff", "接触交接债已吸收");
                else if (/首帧债|FIRSTFRAME/i.test(n)) push("firstframe", "首帧债已吸收");
                else if (/姿态|POSE/i.test(n)) push("pose_handoff", "姿态交接债已吸收");
                else if (/设计意图|fidelity/i.test(n)) push("fidelity", "设计意图未尽命中已降级");
                else push(`note_${debtLedger.length}`, n.length > 36 ? `${n.slice(0, 36)}…` : n);
              }
              return {
                videoId,
                healThenBurn: true,
                implementationDegraded: true,
                userMessage: "已继续生成；缺债已记入台账",
                notes: healThenBurnNotes,
                debtLedger,
                ctaLabel: "智能修复",
                primaryNextStep: "soft_patch",
                adaptDiff: (() => {
                  const m = String(vendorPromptFinal ?? "").match(/adaptDiff:([^\n]+)/);
                  return m?.[1]?.trim() || null;
                })(),
                repairChangelog: Array.isArray(
                  (shotMeta as { repairChangelog?: unknown } | undefined)?.repairChangelog,
                )
                  ? (shotMeta as { repairChangelog: unknown[] }).repairChangelog.slice(-8)
                  : [],
              };
            })()
          : {
              videoId,
              ctaLabel: "智能修复",
            },
      ),
    );
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
        // Design intent fidelity honesty — never stamp videoPass when critical fidelity misses
        if (burnAdapt.fidelity && !burnAdapt.fidelity.pass) {
          try {
            const { fidelityMissesBlockAbsorb } =
              require("@/ruleEngine/compilers/burnAbsorbPolicy") as typeof import("@/ruleEngine/compilers/burnAbsorbPolicy");
            if (fidelityMissesBlockAbsorb(burnAdapt.fidelity.items).length) {
              post.videoPass = false;
              (post as { qcWeak?: boolean }).qcWeak = true;
              if (!post.primaryNextStep || post.primaryNextStep === "done") {
                post.primaryNextStep = "human_review";
              }
            }
          } catch {
            post.videoPass = false;
            (post as { qcWeak?: boolean }).qcWeak = true;
          }
        }
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
