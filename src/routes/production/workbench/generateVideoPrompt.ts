import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { hydrateCompileInputs } from "@/ruleEngine/compilers/compileOrGenerateVideoPrompt";
import { compileOrGenerate } from "@/ruleEngine/kernels/compileKernel";
import { buildIdentitySlots } from "@/ruleEngine/kernels/promptKernel";
import { extractDesignFields, buildExtractContext } from "@/ruleEngine/design/designFieldRegistry";
import { gateIdentityForShot } from "@/ruleEngine/compilers/resolveShotIdentity";
import { bridgeShotToVendor, applyTextHardening } from "@/ruleEngine/compilers/shotVendorBridge";
import { classifyGenerationFailure } from "@/ruleEngine/bundle/generationFailureHelper";
import { buildRePushPlan } from "@/ruleEngine/design/reverseRouteEngine";
import { preflightGenerationMedia } from "@/ruleEngine/compilers/resolveGenerationModeRules";
import { loadEpisodePackage } from "@/ruleEngine/storage/episodePackageStore";
import { normalizeAssetCode } from "@/ruleEngine/codes/assetCodeContract";
import { patchVideoTrackReason } from "@/ruleEngine/qc/persistVideoTrackPromptHash";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    trackId: z.number(),
    projectId: z.number(),
    scriptId: z.number().optional(),
    info: z.array(
      z.object({
        id: z.number(),
        sources: z.string(),
        role: z.enum(["start", "end", "ref", "asset", "storyboard"]).optional(),
      }),
    ),
    model: z.string(),
    mode: z.string(),
  }),
  async (req, res) => {
    const { trackId, projectId, info, model, mode, scriptId: bodyScriptId } = req.body;
    await u.db("o_videoTrack").where({ id: trackId }).update({ state: "生成中" });

    try {
      const [vendorId, modelData] = model.split(/:(.+)/);
      const modelPromptData = await u.db("o_modelPrompt").where("vendorId", vendorId).where("model", modelData).first();
      const projectData = await u.db("o_project").select("*").where({ id: projectId }).first();
      const hydrated = await hydrateCompileInputs(u.db, projectId, info);
      // SSOT: bind storyboard to THIS track — never hydrated.storyboard[0] across tracks
      const {
        resolveStoryboardForTrack,
        pickHydratedStoryboardById,
        bestLiteraryDescFromPanels,
        preferLiteraryVisualDesc,
      } = await import("@/ruleEngine/compilers/resolveTrackStoryboard");
      const infoSbIds = (info as { id: number; sources: string }[])
        .filter((i) => i.sources === "storyboard")
        .map((i) => Number(i.id));
      const trackBind = await resolveStoryboardForTrack(u.db, trackId, infoSbIds);
      const storyboardId =
        trackBind?.storyboardId ??
        (infoSbIds[0] != null ? Number(infoSbIds[0]) : undefined) ??
        pickHydratedStoryboardById(hydrated.storyboard, infoSbIds[0])?.id ??
        undefined;

      // Always load package for literary VD/dialogue — rule flag must not hide design material
      const trackRowForPkg = await u.db("o_videoTrack").where({ id: trackId }).select("scriptId").first();
      const scriptId = bodyScriptId ?? trackRowForPkg?.scriptId;
      let pkg = scriptId ? await loadEpisodePackage(u.db, projectId, scriptId) : null;

      // Orphan track + no info storyboard → cannot invent design; tell user to refresh (not「缺画面」)
      if (!trackBind && !storyboardId) {
        await patchVideoTrackReason(u.db, trackId, {
          state: "生成失败",
          message: "VP-TRACK-UNBOUND:本轨未绑定分镜",
          code: "VP-TRACK-UNBOUND",
        });
        return res.status(400).send(
          error("本轨未绑定分镜（多为旧轨道残留），请刷新工作台后对已绑定分镜的轨道重试", {
            code: "VP-TRACK-UNBOUND",
            primaryNextStep: "refresh_workbench",
            reverseTrigger: "video_prompt_stub",
            reasons: ["track_unbound_orphan"],
          }),
        );
      }

      const artStyle = projectData?.artStyle || "无";
      const visualManual = u.getArtPrompt(artStyle, "art_skills", "art_storyboard_video");

      const codeFromRemark = (remark?: string | null) => {
        if (!remark) return undefined;
        const m = remark.match(/(?:assetCode|charCode):([A-Z]+-[A-Z0-9]+)/i);
        return m ? normalizeAssetCode(m[1]) ?? m[1].toUpperCase() : undefined;
      };

      // Package shot for THIS storyboard only
      let shotMeta =
        storyboardId != null ? pkg?.shots?.find((s) => s.storyboardId === storyboardId) : undefined;
      // Fallback: match by track panel index when storyboardId link missing on package
      if (!shotMeta && trackBind?.row?.index != null && pkg?.shots?.length) {
        const idx = Number(trackBind.row.index);
        shotMeta =
          pkg.shots.find((s) => Number((s as { shotIndex?: number }).shotIndex) === idx) ??
          pkg.shots.find((s) => Number((s as { index?: number }).index) === idx);
      }

      // Resolve 本镜 index — keep 0 (falsy) valid; never default to 1 for all tracks
      const idxCandidates = [
        (shotMeta as { shotIndex?: number } | undefined)?.shotIndex,
        (shotMeta as { index?: number } | undefined)?.index,
        trackBind?.row?.index,
      ];
      let shotIndexNum: number | undefined;
      for (const c of idxCandidates) {
        if (c != null && Number.isFinite(Number(c))) {
          shotIndexNum = Number(c);
          break;
        }
      }
      if ((shotIndexNum == null || !Number.isFinite(shotIndexNum)) && storyboardId != null) {
        try {
          const sbIdx = await u.db("o_storyboard").where({ id: storyboardId }).select("index").first();
          if (sbIdx?.index != null && Number.isFinite(Number(sbIdx.index))) {
            shotIndexNum = Number(sbIdx.index);
          }
        } catch {
          /* optional */
        }
      }

      const hydratedBound = (hydrated.assets ?? []).map(
        (a: { id: number; code?: string; name?: string; filePath?: string | null; remark?: string }) => {
          let code = a.code;
          if (!code && a.remark) code = codeFromRemark(a.remark);
          return { assetId: a.id, code, name: a.name, filePath: a.filePath };
        },
      );

      const {
        identity: resolvedId,
        gate: identityGate,
        missingQueue,
      } = await gateIdentityForShot({
        db: u.db,
        projectId,
        storyboardId,
        shot: shotMeta,
        extraPrompt:
          String(trackBind?.row?.prompt ?? trackBind?.row?.videoDesc ?? "").trim() ||
          hydrated.storyboard?.find((s) => Number(s.id) === Number(storyboardId))?.prompt,
        boundAssets: hydratedBound,
        failClosedBound: true,
      });
      const { charCodes, sceneCode, propCodes, boundAssets } = resolvedId;

      const { loadProjectBlueprint } = await import("@/ruleEngine/storage/episodePackageStore");
      const bp = (await loadProjectBlueprint(u.db, projectId)) ?? {};
      const g4 =
        (bp.globalAnchors as { G4_anchorProps?: { name?: string; code?: string }[] } | undefined)?.G4_anchorProps ??
        (bp.planData as { globalAnchors?: { G4_anchorProps?: { name?: string; code?: string }[] } } | undefined)
          ?.globalAnchors?.G4_anchorProps;
      const anchorHint = g4?.length
        ? g4
            .slice(0, 3)
            .map((p) => p.name || p.code)
            .filter(Boolean)
            .join("/")
        : null;

      // Only本镜 narrative.debutBeat — never package debutIntroPack (禁镜1文学灌镜2)
      const debutBeat = shotMeta?.narrative?.debutBeat ?? undefined;
      const endHook = shotMeta?.narrative?.endHook ?? undefined;

      const identity = buildIdentitySlots({
        charCodes: charCodes.length ? charCodes : undefined,
        sceneCode,
        propCodes: propCodes.length ? propCodes : undefined,
        associateCodes: [
          ...charCodes,
          ...(sceneCode ? [sceneCode] : []),
          ...propCodes,
        ],
      });

      const designFields = extractDesignFields(
        buildExtractContext({
          modality: "video",
          mode,
          episodeShot: shotMeta ?? undefined,
          storyboard:
            (storyboardId != null
              ? hydrated.storyboard?.find((s) => Number(s.id) === Number(storyboardId))
              : undefined) ?? trackBind?.row ?? undefined,
          charCodes,
          debutBeat: debutBeat ?? null,
          endHook: endHook ?? null,
          anchorHint,
        }),
      );

      const { mergeWorkbenchCompileSources, hydrateShotCompileContextSync, isTrueDesignGap } = await import(
        "@/ruleEngine/compilers/hydrateShotCompileContext"
      );
      // This track's storyboard only — never storyboard[0] from another track
      const sbThis =
        pickHydratedStoryboardById(hydrated.storyboard, storyboardId) ??
        (trackBind?.row
          ? {
              id: trackBind.storyboardId,
              videoDesc: trackBind.row.videoDesc,
              prompt: trackBind.row.prompt,
              duration: trackBind.row.duration,
              audioPrompt: trackBind.row.audioPrompt,
              fxPrompt: trackBind.row.fxPrompt,
            }
          : null);
      // Package literary VD wins over storyboard motion-template videoDesc
      const trackLiteraryVd = preferLiteraryVisualDesc(
        (shotMeta as { visualDescription?: string } | undefined)?.visualDescription,
        bestLiteraryDescFromPanels(trackBind?.panels) || String(sbThis?.videoDesc ?? "").trim(),
      );
      const mergedSources = mergeWorkbenchCompileSources({
        designShot: shotMeta
          ? ({
              ...shotMeta,
              shotIndex: shotIndexNum,
              visualDescription:
                (shotMeta as { visualDescription?: string }).visualDescription ||
                trackLiteraryVd ||
                undefined,
              duration:
                (shotMeta as { duration?: number }).duration ??
                (sbThis?.duration != null ? Number(sbThis.duration) : undefined),
              generation: {
                ...((shotMeta as { generation?: object }).generation ?? {}),
                audioPrompt:
                  (shotMeta as { generation?: { audioPrompt?: string } }).generation?.audioPrompt ??
                  sbThis?.audioPrompt ??
                  undefined,
                fxPrompt:
                  (shotMeta as { generation?: { fxPrompt?: string } }).generation?.fxPrompt ??
                  sbThis?.fxPrompt ??
                  undefined,
              },
            } as never)
          : trackLiteraryVd
            ? ({
                shotIndex: shotIndexNum,
                visualDescription: trackLiteraryVd,
                duration: sbThis?.duration != null ? Number(sbThis.duration) : undefined,
                generation: {
                  audioPrompt: sbThis?.audioPrompt,
                  fxPrompt: sbThis?.fxPrompt,
                },
              } as never)
            : null,
        shotMeta: {
          ...(shotMeta as Record<string, unknown> | undefined),
          shotIndex: shotIndexNum,
          visualDescription:
            (shotMeta as { visualDescription?: string } | undefined)?.visualDescription ||
            trackLiteraryVd ||
            undefined,
          videoDesc: trackLiteraryVd || sbThis?.videoDesc,
          duration:
            (shotMeta as { duration?: number } | undefined)?.duration ??
            (sbThis?.duration != null ? Number(sbThis.duration) : undefined),
          audioPrompt: sbThis?.audioPrompt,
          fxPrompt: sbThis?.fxPrompt,
        },
        storyboard: sbThis
          ? {
              videoDesc: trackLiteraryVd || sbThis.videoDesc,
              prompt: sbThis.prompt,
              duration: sbThis.duration,
              shotSize: (sbThis as { shotSize?: string }).shotSize,
              visualDescription: trackLiteraryVd || (sbThis as { visualDescription?: string }).visualDescription,
              narrative: (sbThis as { narrative?: Record<string, unknown> }).narrative,
              dialogue: (sbThis as { dialogue?: { lines?: { speaker?: string; text?: string }[] } }).dialogue,
              audioPrompt: sbThis.audioPrompt,
              fxPrompt: sbThis.fxPrompt,
            }
          : null,
      });

      // Prefer package dialogue; if empty keep merged
      const dialFromPkg = (shotMeta as { narrative?: { dialogue?: { lines?: unknown } } } | undefined)?.narrative
        ?.dialogue?.lines;

      const result = await compileOrGenerate({
        modality: "video",
        mode,
        modelName: modelData,
        projectVideoRatio: projectData?.videoRatio ?? hydrated.videoRatio,
        slots: hydrated.slots,
        // Pass ONLY this shot's storyboard to compile — avoid [0] bleed
        storyboard: sbThis ? [sbThis as never] : hydrated.storyboard?.filter((s) => Number(s.id) === Number(storyboardId)),
        assets: hydrated.assets,
        pkg,
        storyboardId,
        modelPromptRoot: u.getPath(["modelPrompt"]),
        boundModelPromptPath: modelPromptData?.path ?? null,
        artStyleManual: visualManual,
        preferCompile: true,
        charCodes,
        sceneCode,
        propCodes,
        designFields,
        designShot: mergedSources.designShot,
        shotIndex: shotIndexNum ?? null,
        dialogueLines: undefined,
        invokeLlm: undefined,
      });
      void dialFromPkg;

      // Sidecar inside spine with full merged bag — heal-first, never BLOCK when material exists
      try {
        const workRow = await u.db("o_agentWorkData").where({ projectId, key: "scriptAgent" }).first();
        if (workRow?.data && shotIndexNum != null) {
          const { compileVideoPromptSpine } = await import("@/ruleEngine/compilers/compileVideoPromptSpine");
          const agentPlan = JSON.parse(String(workRow.data)) as Record<string, unknown>;
          const ctx = hydrateShotCompileContextSync({
            designShot: mergedSources.designShot,
            shotMeta: mergedSources.shotMeta,
            seedPrompt: result.prompt,
            shotIndex: shotIndexNum,
            vendorId: "agnesai",
          });
          const spine = compileVideoPromptSpine({
            ctx,
            agentPlan,
            forceRebuild: ctx.canAuthorFromDesign,
            includeSidecar: true,
            modeId: mode,
            vendorId: "agnesai",
          });
          if (spine.prompt && (spine.ready || ctx.canAuthorFromDesign)) {
            result.prompt = spine.prompt;
          }
          if (spine.durationSec) {
            (result as { generationWriteback?: { durationSec?: number } }).generationWriteback = {
              ...result.generationWriteback,
              durationSec: spine.durationSec,
            };
          }
          // Hard BLOCK only on true design gap
          if (!spine.ready && isTrueDesignGap(ctx)) {
            await patchVideoTrackReason(u.db, trackId, {
              state: "生成失败",
              message: "VP-THIN-SHELL:真缺画面描写与对白",
              code: "VP-THIN-SHELL",
            });
            return res.status(400).send(
              error("本镜缺少画面描写与对白，无法编译视频词；请补设计后重编译", {
                code: "VP-THIN-SHELL",
                primaryNextStep: "chat_repair",
                reverseTrigger: "video_prompt_stub",
                reasons: ["true_design_gap", ...spine.readyReasons],
              }),
            );
          }
        }
      } catch {
        /* sidecar/spine best-effort */
      }

      const { finalizeFiveSectionPrompt } = await import("@/ruleEngine/compilers/finalizeFiveSectionPrompt");
      const { flattenDialogueText } = await import("@/ruleEngine/design/dialogueCoverage");
      const { literaryDialogueTexts } = await import("@/ruleEngine/compilers/videoDesignContract");
      const { hasOnCameraDialogue } = await import("@/ruleEngine/design/onCameraDialogue");
      const { resolveLipSyncPolicyFromShot } = await import("@/ruleEngine/quality/resolveLipSyncPolicy");
      const { resolveLipDuration } = await import("@/ruleEngine/compilers/promptIR");
      const { resolveRequiredDuration } = await import("@/ruleEngine/compilers/resolveRequiredDuration");
      const dialLinesRaw =
        shotMeta?.narrative?.dialogue?.lines ??
        (mergedSources.shotMeta.narrative as { dialogue?: { lines?: unknown } } | undefined)?.dialogue?.lines;
      const dialLines = literaryDialogueTexts(dialLinesRaw);
      const onCamDialogue = hasOnCameraDialogue(dialLinesRaw);
      const lipShot = {
        ...(shotMeta as object),
        duration:
          (shotMeta as { duration?: number } | undefined)?.duration ??
          (mergedSources.shotMeta.duration as number | undefined),
        narrative: {
          ...((shotMeta as { narrative?: object } | undefined)?.narrative ?? {}),
          dialogue: { lines: dialLines.map((t) => ({ text: t })) },
        },
        visualDescription:
          (shotMeta as { visualDescription?: string } | undefined)?.visualDescription ||
          String(mergedSources.shotMeta.visualDescription ?? ""),
      };
      const lip = resolveLipDuration(lipShot as never);
      const reqDur = resolveRequiredDuration(lipShot as never, { vendorId: "agnesai", pillarsDurationV2: true });
      const bridge = bridgeShotToVendor({
        designFields: {
          ...designFields,
          duration: reqDur.required || designFields.duration,
        },
        request: { mode, duration: reqDur.required || undefined },
        lipMin: lip?.lipMin ?? reqDur.lipMin,
      });
      const hardened = applyTextHardening(result.prompt, bridge.textHardening);
      // let: adaptBurnFromDesign may later stamp author duration (const → Assignment to constant → INFRA)
      let durationSec =
        Math.max(
          bridge.params.duration,
          lip?.durationSec ?? 0,
          reqDur.required || 0,
          result.generationWriteback?.durationSec ?? 0,
        ) || bridge.params.duration;
      result.prompt = finalizeFiveSectionPrompt({
        prompt: hardened,
        dialogueLines: dialLines,
        durationSec,
        preferStaticOnDialogue: dialLines.length > 0,
      }).prompt;
      {
        const { resolveLipDurationSingleSource } = await import("@/ruleEngine/quality/resolveLipDuration");
        const lipPol = resolveLipSyncPolicyFromShot(shotMeta as Record<string, unknown> | undefined);
        const ss = resolveLipDurationSingleSource({
          prompt: result.prompt,
          lipSyncPolicy: (() => {
            let pol = lipPol;
            if (onCamDialogue && /^(none|silent)$/i.test(pol)) {
              try {
                const { softHealNoLipDialogueOnShots, DEFAULT_ONCAM_LIP_POLICY } =
                  require("@/ruleEngine/quality/resolveLipSyncPolicy") as typeof import("@/ruleEngine/quality/resolveLipSyncPolicy");
                if (shotMeta) softHealNoLipDialogueOnShots([shotMeta as Record<string, unknown>]);
                pol = DEFAULT_ONCAM_LIP_POLICY;
              } catch {
                const { DEFAULT_ONCAM_LIP_POLICY } =
                  require("@/ruleEngine/quality/resolveLipSyncPolicy") as typeof import("@/ruleEngine/quality/resolveLipSyncPolicy");
                pol = DEFAULT_ONCAM_LIP_POLICY;
              }
            }
            return pol;
          })(),
          hasDialogue: onCamDialogue,
          durationSec,
          hardBlockNoLipOnDialogue: false,
          refuseExplicitSilent: false,
        });
        if (ss.blocked) {
          await patchVideoTrackReason(u.db, trackId, {
            state: "生成失败",
            message: ss.blockMessage ?? "NO-LIP-DIALOGUE",
            code: ss.blockCode ?? "NO-LIP-DIALOGUE",
          });
          return res.status(400).send(
            error(ss.blockMessage || "no lip on dialogue", {
              code: ss.blockCode ?? "NO-LIP-DIALOGUE",
              primaryNextStep: "chat_repair",
              reverseTrigger: "no_lip_dialogue",
            }),
          );
        }
        result.prompt = ss.prompt;
      }
      {
        const { injectMirrorAntiWarp } = await import("@/ruleEngine/qc/mirrorAntiWarp");
        const vd = String((shotMeta as { visualDescription?: string })?.visualDescription ?? "");
        result.prompt = injectMirrorAntiWarp(result.prompt, vd).prompt;
      }
      // emotionHold / reaction readable when duration raised
      try {
        const req = resolveRequiredDuration(lipShot as never, { pillarsDurationV2: true, vendorId: "agnesai" });
        if (req.emotionFloor > 0 && req.required > (Number((lipShot as { duration?: number }).duration) || 0)) {
          if (!/emotionHold|反应停顿|hold\s*\d/i.test(result.prompt)) {
            result.prompt = `${result.prompt.trim()}\n[Camera] emotionHold ${req.emotionFloor}s (required ${req.required}s)`;
          }
        }
      } catch {
        /* optional */
      }

      // Quality decision → silent soft patches → re-decide (HealRegistry SSOT)
      const { decideVideoQuality, serializeQualityDecision } = await import(
        "@/ruleEngine/compilers/qualityDecision"
      );
      const { applySilentSoftPatches } = await import("@/ruleEngine/heal/applySilentSoftPatches");
      const { scrubVideoPromptForBurn } = await import("@/ruleEngine/compilers/videoDesignContract");
      const { softHealVideoHomologyOnShots } = await import("@/ruleEngine/heal/videoHomologyHeal");
      const scrubPreQd = scrubVideoPromptForBurn({
        prompt: result.prompt,
        vendorId: "agnesai",
        dialogueLines: dialLines,
      });
      if (scrubPreQd.block) {
        await patchVideoTrackReason(u.db, trackId, {
          state: "需完善",
          message: scrubPreQd.block.message,
          code: scrubPreQd.block.id,
          nextStep: "chat_repair",
        });
        return res.status(400).send(
          error(scrubPreQd.block.message, {
            code: scrubPreQd.block.id,
            primaryNextStep: "chat_repair",
            ctaLabel: "确认运镜调解",
            reverseTrigger: "vid_cam_mediate",
          }),
        );
      }
      result.prompt = scrubPreQd.prompt;
      const trackRow = await u.db("o_videoTrack").where({ id: trackId }).select("scriptId").first();
      const resolvedScriptId = Number(bodyScriptId ?? trackRow?.scriptId ?? pkg?.scriptId ?? 0) || 0;
      const fxGradeStr = String(
        (shotMeta as { fxFeasibility?: string })?.fxFeasibility ??
          (shotMeta as { generation?: { fxFeasibility?: string } })?.generation?.fxFeasibility ??
          "",
      );
      let workingShot = shotMeta as Record<string, unknown> | null | undefined;
      if (workingShot) {
        const hom = softHealVideoHomologyOnShots({ shots: [workingShot], vendorId: "agnesai" });
        if (hom.changed && hom.shots[0]) {
          workingShot = hom.shots[0];
          try {
            if (pkg?.shots?.length && storyboardId != null) {
              const ix = pkg.shots.findIndex((s) => s.storyboardId === storyboardId);
              if (ix >= 0) {
                pkg.shots[ix] = hom.shots[0] as never;
                const { saveEpisodePackage } = await import("@/ruleEngine/storage/episodePackageStore");
                await saveEpisodePackage(u.db, pkg);
              }
            }
          } catch {
            /* best-effort persist */
          }
        }
      }
      let workingPrompt = result.prompt;
      // Viral sidecar already in spine (before assert) — do NOT append again here
      let qd = decideVideoQuality({
        videoPrompt: workingPrompt,
        shot: workingShot as never,
        vendorId: "agnesai",
        fxGrade: fxGradeStr,
      });
      // Design/import lip stamp: workbench is not the split station — force burn block + CTA
      {
        const meta = (pkg as { meta?: { lipConfirmRequired?: boolean; importOkNotExitPass?: boolean } } | null)?.meta;
        const shotStale = String((workingShot as { promptState?: string } | null | undefined)?.promptState ?? "") === "stale";
        if (meta?.lipConfirmRequired || meta?.importOkNotExitPass || shotStale) {
          if (qd.burnAllowed || qd.decision === "auto") {
            qd = {
              ...qd,
              decision: "split_shot",
              burnAllowed: false,
              nextStep: "split_shot",
              reasons: [
                ...qd.reasons,
                ...(meta?.lipConfirmRequired ? ["lipConfirmRequired"] : []),
                ...(meta?.importOkNotExitPass ? ["importOkNotExitPass"] : []),
                ...(shotStale ? ["promptState_stale"] : []),
              ],
              splitHint: qd.splitHint ?? "reaction_shot",
            };
          }
          if (qd.envelope) {
            qd.envelope = {
              ...qd.envelope,
              userMessage:
                "设计/导入拆镜未闭合（lipConfirm 或 prompt 已 stale），请回 SB Confirm 智能拆或重导后再烧；本台不执行拆镜。",
              primaryNextStep: "split_shot",
            };
          }
        }
      }
      const heal = await applySilentSoftPatches({
        db: u.db,
        projectId,
        scriptId: resolvedScriptId || undefined,
        storyboardId: storyboardId ?? shotMeta?.storyboardId,
        vendorId: "agnesai",
        shot: workingShot,
        prompt: workingPrompt,
        decision: qd,
      });
      if (heal.healed) {
        if (heal.prompt) workingPrompt = heal.prompt;
        if (heal.shot) workingShot = heal.shot as Record<string, unknown>;
        result.prompt = workingPrompt;
        qd = decideVideoQuality({
          videoPrompt: workingPrompt,
          shot: workingShot as never,
          vendorId: "agnesai",
          fxGrade: fxGradeStr,
        });
      }
      // Never persist splitHint on burn/prompt block — false-green.
      const autoHealed = heal.autoHealed;
      const healedDuration = heal.duration;

      // LANG / CAM quality gate before persisting prompt
      try {
        const { qualityGate } = await import("@/ruleEngine/qualityGate");
        const { buildBurnGateEnvelope } = await import("@/ruleEngine/compilers/burnGateEnvelope");
        const dial = flattenDialogueText(shotMeta?.narrative?.dialogue?.lines);
        const qGateShotIndex = shotIndexNum ?? 0;
        const qg = qualityGate(
          {
            bundleType: "script",
            script: "",
            preDesignPack: {
              scriptPlan: "",
              shots: [
                {
                  shotIndex: qGateShotIndex,
                  narrative: { dialogue: shotMeta?.narrative?.dialogue, transitionType: shotMeta?.narrative?.transitionType },
                  videoPrompt: result.prompt,
                  generation: { videoPrompt: result.prompt },
                },
              ],
            },
          } as never,
          {
            stage: "promptGen",
            promptOverride: { videoPrompt: result.prompt, dialogueLines: dial, shotIndex: qGateShotIndex },
          },
        );
        if (qg.blocked) {
          const envelope = buildBurnGateEnvelope(qg.blocks);
          await patchVideoTrackReason(u.db, trackId, {
            state: "生成失败",
            message: envelope.userMessage || qg.blocks.map((b) => `${b.id}:${b.message}`).join("; "),
            code: envelope.nextStep ?? "QUALITY_GATE",
            nextStep: envelope.nextStep,
            primaryNextStep: envelope.primaryNextStep,
          });
          return res.status(400).send(
            error(envelope.userMessage || `提示词质量门禁未通过: ${qg.blocks.map((b) => b.message).join("; ")}`, {
              qualityGate: qg,
              blocks: qg.blocks,
              qualityDecision: serializeQualityDecision(qd),
              rePushPlan: envelope.rePushPlan,
              repairHints: envelope.repairHints,
              nextStep: envelope.nextStep,
              primaryNextStep: envelope.primaryNextStep,
              userMessage: envelope.userMessage,
              ctaLabel: envelope.ctaLabel,
            }),
          );
        }
      } catch {
        /* best-effort */
      }

      // singleImage: storyboard-linked stills count as identity refs even when info[] omitted assets
      const effectiveRefCount = Math.max(info.length, boundAssets.filter((b) => b.filePath).length > 0 ? 1 : 0);
      const pre = preflightGenerationMedia({
        rules: {
          modeId: result.modeId,
          templatePath: result.templatePath,
          mediaContract: result.mediaContract,
          reverseTrigger: "prompt_gen_media_missing",
        } as never,
        referenceCount: effectiveRefCount,
        hasStoryboardContext: (hydrated.storyboard?.length ?? 0) > 0,
        hasAssetContext: (hydrated.assets?.length ?? 0) > 0 || boundAssets.some((b) => Boolean(b.filePath)),
      });

      if (!pre.ok && result.mediaContract.minRefs > 0 && effectiveRefCount < result.mediaContract.minRefs) {
        const feedback = await classifyGenerationFailure({
          modality: "video",
          shotId: String(trackId),
          error: pre.message ?? pre.code ?? "media missing",
        });
        const rePushPlan = buildRePushPlan([pre.reverseTrigger ?? "prompt_gen_media_missing"]);
        await patchVideoTrackReason(u.db, trackId, {
          state: "生成失败",
          message: pre.message ?? pre.code,
          code: pre.code ?? "PROMPT_GEN_MEDIA_MISSING",
        });
        return res.status(400).send(error(pre.message ?? pre.code ?? "PROMPT_GEN_MEDIA_MISSING", { feedback, rePushPlan, code: pre.code }));
      }

      if (!identityGate.ok) {
        await patchVideoTrackReason(u.db, trackId, {
          state: "生成失败",
          message: `IDENTITY_IMAGE_GAP:${identityGate.gaps.map((g) => `${g.code}:${g.reason}`).join(",")}`,
          code: "IDENTITY_IMAGE_GAP",
        });
        return res.status(400).send(
          error("身份静照缺失，提示词未就绪", {
            identityGate,
            missingAssetImageQueue: missingQueue,
            redLights: identityGate.gaps.map((g) => ({
              code: g.reason.toUpperCase(),
              level: "BLOCK" as const,
              message: `${g.code}:${g.reason}`,
            })),
          }),
        );
      }

      // Scrub + heal-first persist: thin shells NEVER persist; force track literary spine
      {
        const { sanitizeVideoPrompt } = await import("@/ruleEngine/compilers/sanitizeVideoPrompt");
        const { assertVideoPromptReady, visualLiteraryBody } = await import(
          "@/ruleEngine/compilers/assertVideoPromptReady"
        );
        const { compileVideoPromptSpine } = await import("@/ruleEngine/compilers/compileVideoPromptSpine");
        const scrubbed = sanitizeVideoPrompt({
          prompt: result.prompt,
          dialogueLines: dialLines,
          durationSec,
          preferStaticOnDialogue: dialLines.length > 0,
        });
        result.prompt = scrubbed.prompt;
        const trackVd =
          preferLiteraryVisualDesc(
            String(mergedSources.shotMeta.visualDescription ?? "").trim(),
            bestLiteraryDescFromPanels(trackBind?.panels),
          ) || String(mergedSources.shotMeta.visualDescription ?? "").trim();
        const ctx = hydrateShotCompileContextSync({
          designShot: mergedSources.designShot ?? (trackVd
            ? ({
                shotIndex: shotIndexNum,
                visualDescription: trackVd,
                duration: durationSec,
                narrative: { dialogue: { lines: dialLines.map((t) => ({ text: t })) } },
              } as never)
            : null),
          shotMeta: {
            ...mergedSources.shotMeta,
            visualDescription: trackVd || mergedSources.shotMeta.visualDescription,
            narrative: {
              ...((mergedSources.shotMeta.narrative as object) ?? {}),
              dialogue: {
                lines: dialLines.map((t) => ({ text: t })),
              },
            },
          },
          seedPrompt: result.prompt,
          shotIndex: shotIndexNum ?? null,
          trackId,
          storyboardId: storyboardId ?? null,
          vendorId: "agnesai",
        });
        let ready = assertVideoPromptReady(result.prompt, ctx);
        const missingFive = !/\[Motion\]/i.test(result.prompt) || !/\[Camera\]/i.test(result.prompt);
        const visualThin = (visualLiteraryBody(result.prompt).match(/[\u4e00-\u9fff]/g) ?? []).length < 8;
        if ((!ready.ok || missingFive || visualThin) && (ctx.canAuthorFromDesign || trackVd || dialLines.length)) {
          const spine = compileVideoPromptSpine({
            ctx: {
              ...ctx,
              visualDescription: ctx.visualDescription || trackVd,
              dialogueLines: ctx.dialogueLines.length ? ctx.dialogueLines : dialLines,
              canAuthorFromDesign: true,
              durationSec: Math.max(ctx.durationSec, durationSec),
            },
            forceRebuild: true,
            includeSidecar: false,
            modeId: mode,
            vendorId: "agnesai",
          });
          if (spine.prompt) result.prompt = spine.prompt;
          if (spine.durationSec) {
            (result as { generationWriteback?: { durationSec?: number } }).generationWriteback = {
              ...result.generationWriteback,
              durationSec: spine.durationSec,
            };
          }
          ready = assertVideoPromptReady(result.prompt, {
            ...ctx,
            durationSec: spine.durationSec || ctx.durationSec,
            visualDescription: ctx.visualDescription || trackVd,
            dialogueLines: ctx.dialogueLines.length ? ctx.dialogueLines : dialLines,
          });
        }
        const stillThin =
          !ready.ok ||
          !/\[Motion\]/i.test(result.prompt) ||
          !/\[Camera\]/i.test(result.prompt) ||
          (visualLiteraryBody(result.prompt).match(/[\u4e00-\u9fff]/g) ?? []).length < 8;
        if (stillThin && isTrueDesignGap(ctx) && !trackVd && !dialLines.length) {
          await patchVideoTrackReason(u.db, trackId, {
            state: "生成失败",
            message: "VP-THIN-SHELL:真缺画面描写与对白",
            code: "VP-THIN-SHELL",
          });
          return res.status(400).send(
            error("本镜缺少画面描写与对白，无法编译视频词；请补设计后重编译", {
              code: "VP-THIN-SHELL",
              primaryNextStep: "chat_repair",
              reverseTrigger: "video_prompt_stub",
              reasons: ["true_design_gap", ...ready.reasons],
            }),
          );
        }
        if (stillThin) {
          // Material claimed but still shell — refuse lock-face-only / Audio-first scraps
          await patchVideoTrackReason(u.db, trackId, {
            state: "生成失败",
            message: `VP-THIN-SHELL:治愈后仍无文学五段 reasons=${ready.reasons.join(",")}`,
            code: "VP-THIN-SHELL",
            reasons: ready.reasons,
          });
          return res.status(400).send(
            error("视频词仍为锁脸/无对白空壳，已拒绝落库；请确认本镜画面描写已写入分镜后重编译", {
              code: "VP-THIN-SHELL",
              primaryNextStep: "chat_repair",
              reverseTrigger: "video_prompt_stub",
              reasons: ready.reasons,
              trackLiteraryVd: trackVd?.slice(0, 80),
              dialCount: dialLines.length,
            }),
          );
        }
      }

      // Burn SSOT — same kernel as generateVideo adaptBurnFromDesign
      let burnAdaptFidelity: Awaited<ReturnType<typeof import("@/ruleEngine/compilers/adaptBurnFromDesign").adaptBurnFromDesign>>["fidelity"];
      {
        const { adaptBurnFromDesign } = await import("@/ruleEngine/compilers/adaptBurnFromDesign");
        const burnAdapt = adaptBurnFromDesign({
          shotMeta: (workingShot ?? shotMeta ?? {}) as Record<string, unknown>,
          trackPrompt: result.prompt,
          vendorId: "agnesai",
          trackId,
          storyboardId: storyboardId ?? undefined,
          modeId: mode,
        });
        result.prompt = burnAdapt.prompt;
        burnAdaptFidelity = burnAdapt.fidelity;
        if (burnAdapt.durationSec > 0) durationSec = burnAdapt.durationSec;
        if (burnAdapt.fidelity && !burnAdapt.fidelity.pass) {
          qd = {
            ...qd,
            burnAllowed: false,
            decision: "chat_repair",
            nextStep: "chat_repair",
            reasons: [
              ...(qd.reasons ?? []),
              ...burnAdapt.fidelity.items.filter((i) => !i.pass).map((i) => `fidelity:${i.id}`),
            ],
            envelope: {
              ...(qd.envelope ?? {
                userMessage: "",
                primaryNextStep: "chat_repair" as const,
                ctaLabel: "确认视频设计修复",
              }),
              userMessage:
                burnAdapt.fidelity.virdFindings?.map((f) => f.message).join("；") ||
                qd.envelope?.userMessage ||
                "设计意图未命中，须修复后重编译",
              primaryNextStep: "chat_repair",
              ctaLabel: "确认视频设计修复",
            },
          };
        }
      }

      const promptHash = require("crypto")
        .createHash("sha1")
        .update(result.prompt)
        .digest("hex")
        .slice(0, 12);
      const fidelityExtraReason = burnAdaptFidelity
        ? {
            designIntentFidelity: burnAdaptFidelity,
            virdFindings: burnAdaptFidelity.virdFindings,
            promptHash,
            burnDurationSec: durationSec,
          }
        : { promptHash, burnDurationSec: durationSec };

      if (qd.burnAllowed) {
        try {
          const { persistVideoTrackPromptWithDesignHash } = await import(
            "@/ruleEngine/qc/persistVideoTrackPromptHash"
          );
          await persistVideoTrackPromptWithDesignHash(u.db, {
            trackId,
            prompt: result.prompt,
            state: "已完成",
            shot: {
              ...(workingShot as object),
              visualDescription:
                (workingShot as { visualDescription?: string })?.visualDescription ??
                mergedSources.shotMeta.visualDescription,
              narrative: {
                ...(((workingShot as { narrative?: object })?.narrative as object) ?? {}),
                dialogue: {
                  lines: dialLines.map((t) => ({ text: t })),
                },
              },
              duration: durationSec,
            } as Record<string, unknown>,
            extraReason: fidelityExtraReason,
          });
        } catch {
          await u.db("o_videoTrack").where({ id: trackId }).update({
            state: "已完成",
            prompt: result.prompt,
          });
        }
      } else {
        // Keep prior designContentHash — !burnAllowed must not blind M7 stale gate
        await patchVideoTrackReason(u.db, trackId, {
          state: "需完善",
          prompt: result.prompt,
          burnAllowed: false,
          decision: qd.decision,
          nextStep: qd.nextStep,
          reasons: qd.reasons,
          ctaLabel: qd.envelope?.ctaLabel ?? "完善后重编译",
          userMessage: qd.envelope?.userMessage ?? "提示词已落库但不可烧片",
          ...fidelityExtraReason,
        });
      }
      const qdSerialized = serializeQualityDecision(qd, {
        autoHealed,
        duration: healedDuration,
      });
      const chatRepairText = !qd.burnAllowed
        ? [
            "【闭环修复清单 — 质量决策挡烧】",
            qd.envelope?.userMessage || `decision=${qd.decision} nextStep=${qd.nextStep}`,
            `reasons: ${(qd.reasons ?? []).join("; ")}`,
            qd.envelope?.suggestedValue != null ? `suggestedValue: ${qd.envelope.suggestedValue}` : "",
            qd.splitHint ? `splitHint 建议: ${qd.splitHint}` : "",
            "",
            ...(qd.envelope?.repairHints ?? []).map((h) => `[${h.id}] ${h.chatTemplate ?? ""}`).filter(Boolean),
            "",
            "提示词已落库供对照（轨道状态=需完善，非已完成）；请按清单改 SB/W3 后重导再烧。",
          ]
            .filter((l) => l !== undefined && l !== "")
            .join("\n")
        : undefined;
      return res.status(200).send(
        success({
          prompt: result.prompt,
          identity,
          designFields,
          bridging: bridge.bridging,
          textHardening: bridge.textHardening,
          identityGate,
          qualityDecision: qdSerialized,
          burnAllowed: qd.burnAllowed,
          designIntentFidelity: burnAdaptFidelity,
          virdFindings: burnAdaptFidelity?.virdFindings,
          nextStep: qd.nextStep,
          splitHint: qd.splitHint,
          ...(autoHealed?.length ? { autoHealed } : {}),
          ...(healedDuration != null ? { duration: healedDuration } : {}),
          ...(chatRepairText ? { chatRepairText } : {}),
          redLights: [
            ...(!sceneCode ? [{ code: "MISSING_SCENE", level: "BLOCK" as const, message: "缺 SCENE/--sref" }] : []),
            ...(!qd.burnAllowed
              ? [
                  {
                    code: String(qd.decision).toUpperCase(),
                    level: "BLOCK" as const,
                    message:
                      (qdSerialized.userMessage as string) ||
                      qd.reasons.join("; ") ||
                      "质量决策挡烧",
                  },
                ]
              : []),
            ...identityGate.gaps.map((g) => ({
              code: g.reason.toUpperCase(),
              level: "BLOCK" as const,
              message: `${g.code}:${g.reason}`,
            })),
          ],
        }),
      );
    } catch (e) {
      const errMsg = u.error(e).message;
      const feedback = await classifyGenerationFailure({ modality: "video", shotId: String(trackId), error: errMsg });
      const trigger = feedback.ruleId || "vendor_passthrough";
      const rePushPlan = buildRePushPlan([trigger].filter(Boolean));
      const isRuntime =
        /is not a function|TypeError|Cannot read propert/i.test(errMsg) ||
        feedback.category === "runtime_type_error" ||
        trigger === "runtime_type_error";
      const userMessage = isRuntime
        ? "生成提示词时发生结构异常（非台词保真问题）。请重试；若仍失败请检查分镜台词是否为结构化 lines。"
        : feedback.upstreamPatches?.[0]?.suggestion || errMsg;
      await patchVideoTrackReason(u.db, trackId, {
        state: "生成失败",
        message: errMsg,
        code: isRuntime ? "RUNTIME_TYPE_ERROR" : feedback.ruleId || "VENDOR_PASSTHROUGH",
      });
      return res.status(400).send(
        error(userMessage, {
          feedback,
          rePushPlan,
          userMessage,
          nextStep: isRuntime ? "retry_shot" : undefined,
        }),
      );
    }
  },
);
