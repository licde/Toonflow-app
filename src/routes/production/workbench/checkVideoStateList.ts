import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { classifyGenerationFailure } from "@/ruleEngine/bundle/generationFailureHelper";
import { probeOssVideoPath } from "@/ruleEngine/detection/mediaProbeFeedback";

const router = express.Router();

function parseVideoFailure(errorReason: string | null | undefined) {
  if (!errorReason) return undefined;
  try {
    const parsed = JSON.parse(errorReason);
    if (parsed?.feedback) return parsed;
  } catch {
    /* plain text */
  }
  return undefined;
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
      .whereIn("state", ["生成成功", "生成失败"])
      .select("id", "state", "errorReason", "filePath", "videoTrackId");
    res.status(200).send(
      success(
        await Promise.all(
          videoList.map(async (s) => {
            const base = {
              ...s,
              src: s.filePath ? await u.oss.getFileUrl(s.filePath) : "",
            };
            if (s.state === "生成失败" && s.errorReason) {
              let payload = parseVideoFailure(s.errorReason);
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
              return { ...base, ...payload, notify: true };
            }
            if (s.state === "生成成功" && s.filePath) {
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
