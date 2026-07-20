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
import { isRuleEngineEnabled } from "@/ruleEngine/featureFlag";
import { loadEpisodePackage } from "@/ruleEngine/storage/episodePackageStore";
import { normalizeAssetCode } from "@/ruleEngine/codes/assetCodeContract";

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
      const storyboardId = hydrated.storyboard?.[0]?.id;

      let pkg = null;
      const ruleOn = await isRuleEngineEnabled(u.db, projectId);
      if (ruleOn) {
        const track = await u.db("o_videoTrack").where({ id: trackId }).select("scriptId").first();
        const scriptId = bodyScriptId ?? track?.scriptId;
        if (scriptId) pkg = await loadEpisodePackage(u.db, projectId, scriptId);
      }

      const artStyle = projectData?.artStyle || "无";
      const visualManual = u.getArtPrompt(artStyle, "art_skills", "art_storyboard_video");

      const codeFromRemark = (remark?: string | null) => {
        if (!remark) return undefined;
        const m = remark.match(/(?:assetCode|charCode):([A-Z]+-[A-Z0-9]+)/i);
        return m ? normalizeAssetCode(m[1]) ?? m[1].toUpperCase() : undefined;
      };

      const shotMeta =
        storyboardId != null ? pkg?.shots?.find((s) => s.storyboardId === storyboardId) : undefined;

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
        extraPrompt: hydrated.storyboard?.[0]?.prompt,
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

      const debutBeat =
        shotMeta?.narrative?.debutBeat ??
        (bp.debutIntroPack as { items?: { copyHint?: string }[] } | undefined)?.items?.[0]?.copyHint ??
        (pkg as { debutIntroPack?: { items?: { copyHint?: string }[] } } | null)?.debutIntroPack?.items?.[0]
          ?.copyHint ??
        undefined;
      const endHook =
        shotMeta?.narrative?.endHook ??
        (pkg as { designBrief?: { B5?: { type?: string; desc?: string }[] } } | null)?.designBrief?.B5?.find(
          (b) => /钩子|hook/i.test(String(b.type ?? "")),
        )?.desc ??
        undefined;

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
          storyboard: hydrated.storyboard?.[0],
          charCodes,
          debutBeat: debutBeat ?? null,
          endHook: endHook ?? null,
          anchorHint,
        }),
      );

      const result = await compileOrGenerate({
        modality: "video",
        mode,
        modelName: modelData,
        projectVideoRatio: projectData?.videoRatio ?? hydrated.videoRatio,
        slots: hydrated.slots,
        storyboard: hydrated.storyboard,
        assets: hydrated.assets,
        pkg,
        storyboardId,
        modelPromptRoot: u.getPath(["modelPrompt"]),
        boundModelPromptPath: modelPromptData?.path ?? null,
        artStyleManual: visualManual,
        preferCompile: Boolean(pkg && storyboardId),
        charCodes,
        sceneCode,
        propCodes,
        designFields,
        invokeLlm: async ({ system, user, assistant }) => {
          const { text } = await u.Ai.Text("universalAi").invoke({
            system,
            messages: [
              ...(assistant ? [{ role: "assistant" as const, content: assistant }] : []),
              { role: "user" as const, content: user },
            ],
          });
          return text;
        },
      });

      const { finalizeFiveSectionPrompt } = await import("@/ruleEngine/compilers/finalizeFiveSectionPrompt");
      const { flattenDialogueText } = await import("@/ruleEngine/design/dialogueCoverage");
      const { resolveLipDuration } = await import("@/ruleEngine/compilers/promptIR");
      const dialLines = flattenDialogueText(shotMeta?.narrative?.dialogue?.lines)
        .split(/\n+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const lip = shotMeta ? resolveLipDuration(shotMeta as never) : null;
      const bridge = bridgeShotToVendor({
        designFields,
        request: { mode },
        lipMin: lip?.lipMin,
      });
      const hardened = applyTextHardening(result.prompt, bridge.textHardening);
      const durationSec = Math.max(bridge.params.duration, lip?.durationSec ?? 0) || bridge.params.duration;
      result.prompt = finalizeFiveSectionPrompt({
        prompt: hardened,
        dialogueLines: dialLines,
        durationSec,
        preferStaticOnDialogue: dialLines.length > 0,
      }).prompt;

      // Quality decision → silent soft patches → re-decide (HealRegistry SSOT)
      const { decideVideoQuality, persistSplitHintSuggestion, serializeQualityDecision } = await import(
        "@/ruleEngine/compilers/qualityDecision"
      );
      const { applySilentSoftPatches } = await import("@/ruleEngine/heal/applySilentSoftPatches");
      const trackRow = await u.db("o_videoTrack").where({ id: trackId }).select("scriptId").first();
      const resolvedScriptId = Number(bodyScriptId ?? trackRow?.scriptId ?? pkg?.scriptId ?? 0) || 0;
      const fxGradeStr = String(
        (shotMeta as { fxFeasibility?: string })?.fxFeasibility ??
          (shotMeta as { generation?: { fxFeasibility?: string } })?.generation?.fxFeasibility ??
          "",
      );
      let workingShot = shotMeta as Record<string, unknown> | null | undefined;
      let workingPrompt = result.prompt;
      let qd = decideVideoQuality({
        videoPrompt: workingPrompt,
        shot: workingShot as never,
        vendorId: "agnesai",
        fxGrade: fxGradeStr,
      });
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
      if (qd.splitHint && !qd.burnAllowed && resolvedScriptId) {
        await persistSplitHintSuggestion({
          db: u.db,
          projectId,
          scriptId: resolvedScriptId,
          storyboardId: storyboardId ?? shotMeta?.storyboardId,
          splitHint: qd.splitHint,
        }).catch(() => false);
      }
      const autoHealed = heal.autoHealed;
      const healedDuration = heal.duration;

      // LANG / CAM quality gate before persisting prompt
      try {
        const { qualityGate } = await import("@/ruleEngine/qualityGate");
        const { buildBurnGateEnvelope } = await import("@/ruleEngine/compilers/burnGateEnvelope");
        const dial = flattenDialogueText(shotMeta?.narrative?.dialogue?.lines);
        const qg = qualityGate(
          {
            bundleType: "script",
            script: "",
            preDesignPack: {
              scriptPlan: "",
              shots: [
                {
                  shotIndex: 1,
                  narrative: { dialogue: shotMeta?.narrative?.dialogue, transitionType: shotMeta?.narrative?.transitionType },
                  videoPrompt: result.prompt,
                  generation: { videoPrompt: result.prompt },
                },
              ],
            },
          } as never,
          {
            stage: "promptGen",
            promptOverride: { videoPrompt: result.prompt, dialogueLines: dial, shotIndex: 1 },
          },
        );
        if (qg.blocked) {
          const envelope = buildBurnGateEnvelope(qg.blocks);
          await u.db("o_videoTrack").where({ id: trackId }).update({
            state: "生成失败",
            reason: envelope.userMessage || qg.blocks.map((b) => `${b.id}:${b.message}`).join("; "),
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
        await u.db("o_videoTrack").where({ id: trackId }).update({ state: "生成失败", reason: pre.message ?? pre.code });
        return res.status(400).send(error(pre.message ?? pre.code ?? "PROMPT_GEN_MEDIA_MISSING", { feedback, rePushPlan, code: pre.code }));
      }

      if (!identityGate.ok) {
        await u.db("o_videoTrack").where({ id: trackId }).update({
          state: "生成失败",
          reason: `IDENTITY_IMAGE_GAP:${identityGate.gaps.map((g) => `${g.code}:${g.reason}`).join(",")}`,
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

      await u.db("o_videoTrack").where({ id: trackId }).update({ state: "已完成", prompt: result.prompt });
      const qdSerialized = serializeQualityDecision(qd, {
        autoHealed,
        duration: healedDuration,
      });
      const chatRepairText = !qd.burnAllowed
        ? [
            "【闭环修复清单 — 质量决策挡烧】",
            qd.envelope.userMessage || `decision=${qd.decision} nextStep=${qd.nextStep}`,
            `reasons: ${qd.reasons.join("; ")}`,
            qd.envelope.suggestedValue != null ? `suggestedValue: ${qd.envelope.suggestedValue}` : "",
            qd.splitHint ? `splitHint 建议: ${qd.splitHint}` : "",
            "",
            ...(qd.envelope?.repairHints ?? []).map((h) => `[${h.id}] ${h.chatTemplate ?? ""}`).filter(Boolean),
            "",
            "提示词已落库供对照；请按清单改 SB/W3 后重导再烧。",
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
      const rePushPlan = buildRePushPlan([feedback.ruleId || "vendor_passthrough"].filter(Boolean));
      await u.db("o_videoTrack").where({ id: trackId }).update({ state: "生成失败", reason: errMsg });
      return res.status(400).send(error(errMsg, { feedback, rePushPlan }));
    }
  },
);
