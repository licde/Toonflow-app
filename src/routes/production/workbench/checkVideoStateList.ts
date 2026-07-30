import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { classifyGenerationFailure } from "@/ruleEngine/bundle/generationFailureHelper";
import { probeOssVideoPath } from "@/ruleEngine/detection/mediaProbeFeedback";
import {
  flattenQcDebtForFe,
  isSoftDeliveredVideoRow,
  mapVideoStateForFe,
  parseVideoErrorReason,
} from "@/ruleEngine/qc/qcSoftDeliver";

const router = express.Router();

function parseVideoFailure(errorReason: string | null | undefined) {
  return parseVideoErrorReason(errorReason) ?? undefined;
}

function flattenPostBurnPayload(parsed: Record<string, unknown> | undefined) {
  if (!parsed) return undefined;
  const pb = parsed.postBurn as Record<string, unknown> | undefined;
  if (!pb) return parsed;
  return {
    ...parsed,
    ...pb,
    message: pb.userMessage || parsed.message,
    userMessage: pb.userMessage || parsed.userMessage,
    primaryNextStep: pb.primaryNextStep || parsed.primaryNextStep,
    ctaLabel:
      parsed.ctaLabel ||
      (pb.primaryNextStep === "human_review" ? "SVQ 未测维 · 人审" : undefined),
    findings: pb.findings || parsed.findings,
    unknownDims: pb.unknownDims ?? parsed.unknownDims,
    failDims: pb.failDims ?? parsed.failDims,
    skippedDims: pb.skippedDims ?? parsed.skippedDims,
    scorecard: pb.scorecard ?? parsed.scorecard,
    designIntentFidelity: parsed.designIntentFidelity,
    svqHonesty: pb.svqHonesty ?? parsed.svqHonesty,
  };
}

function trackFidelityFromReason(reason: unknown): Record<string, unknown> {
  const parsed = parseVideoErrorReason(typeof reason === "string" ? reason : null);
  if (!parsed) return {};
  const out: Record<string, unknown> = {};
  if (parsed.designIntentFidelity) out.designIntentFidelity = parsed.designIntentFidelity;
  if (parsed.virdFindings) out.virdFindings = parsed.virdFindings;
  if (parsed.burnDurationSec != null) out.burnDurationSec = parsed.burnDurationSec;
  if (parsed.promptHash) out.promptHash = parsed.promptHash;
  return out;
}

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
    videoIds: z.array(z.number()),
  }),
  async (req, res) => {
    const { videoIds } = req.body;
    const videoList = await u
      .db("o_video")
      .whereIn("id", videoIds)
      .whereIn("state", ["生成成功", "已完成", "生成失败", "质检未过"])
      .select("id", "state", "errorReason", "filePath", "videoTrackId");
    const trackIds = [...new Set(videoList.map((v) => v.videoTrackId).filter(Boolean))] as number[];
    const trackRows =
      trackIds.length > 0
        ? await u.db("o_videoTrack").whereIn("id", trackIds).select("id", "reason", "duration")
        : [];
    const trackById = new Map(trackRows.map((t) => [Number(t.id), t]));
    res.status(200).send(
      success(
        await Promise.all(
          videoList.map(async (s) => {
            const parsed0 = parseVideoErrorReason(s.errorReason);
            const { reconcileLegacyContactQc } = await import("@/ruleEngine/qc/qcSoftDeliver");
            const parsed = reconcileLegacyContactQc(parsed0);
            const softDeliver = isSoftDeliveredVideoRow({
              ...s,
              errorReason: parsed ? JSON.stringify(parsed) : s.errorReason,
            });
            const failedQc = s.state === "质检未过" && !softDeliver;
            const trackMeta = trackFidelityFromReason(trackById.get(Number(s.videoTrackId))?.reason);
            const base = {
              ...s,
              // Normalize DB → FE timeline states (soft QC debt still playable — weak图同源)
              state: mapVideoStateForFe(s),
              src: s.filePath ? await u.oss.getFileUrl(s.filePath) : "",
              ...(softDeliver ? flattenQcDebtForFe(parsed) : {}),
              ...trackMeta,
            };
            if ((s.state === "生成失败" || failedQc) && s.errorReason) {
              let payload = flattenPostBurnPayload(parseVideoFailure(s.errorReason) as Record<string, unknown> | undefined);
              if (!payload) {
                const track = await u.db("o_videoTrack").where("id", s.videoTrackId).select("prompt").first();
                const feedback = await classifyGenerationFailure({
                  modality: "video",
                  shotId: String(s.videoTrackId ?? s.id),
                  error: s.errorReason,
                  prompt: track?.prompt ?? undefined,
                });
                payload = { message: s.errorReason, feedback, suggestedPrompt: feedback.suggestedPrompt };
              }
              return { ...base, ...payload, notify: true, qcFail: failedQc };
            }
            if (s.state === "生成成功" || s.state === "已完成") {
              if (!s.filePath) return base;
              const mediaProbe = await probeOssVideoPath(s.filePath);
              const muteFail = mediaProbe && mediaProbe.gc07Pass === false;
              const durationFail = mediaProbe && mediaProbe.gc06Pass === false;
              let healHint: Record<string, unknown> | undefined;
              if (muteFail || durationFail) {
                const trigger = muteFail ? "media_probe_mute" : "duration_clamp";
                const { buildRePushPlan } = await import("@/ruleEngine/design/reverseRouteEngine");
                const { runSelfHeal } = await import("@/ruleEngine/design/selfHealOrchestrator");
                const rePushPlan = buildRePushPlan([trigger]);
                const heal = await runSelfHeal({
                  projectId: req.body.projectId,
                  scriptId: req.body.scriptId,
                  shotId: s.videoTrackId,
                  errorText: mediaProbe?.message ?? trigger,
                  category: "media_probe",
                  dryRun: true,
                  issues: muteFail
                    ? [{ ruleId: "media_probe_mute", autoFix: { confidence: 0.95, patch: { generate_audio: true } } }]
                    : undefined,
                });
                healHint = { trigger, rePushPlan, heal, autoApplicable: heal.autoApplicable };
              }
              return {
                ...base,
                mediaProbe,
                notify: mediaProbe && (!mediaProbe.gc06Pass || !mediaProbe.gc07Pass),
                feedback: mediaProbe?.message
                  ? {
                      category: muteFail ? "native_audio_mismatch" : "media_probe",
                      ruleId: muteFail ? "media_probe_mute" : "duration_clamp",
                      suggestedPrompt: undefined,
                      message: mediaProbe.message,
                    }
                  : undefined,
                healHint,
              };
            }
            return base;
          }),
        ),
      ),
    );
  },
);
