/**
 * Persist post-burn QC onto o_video — single/batch homology.
 * Pass → 生成成功; fail → 质检未过 + flattened errorReason for FE poll/VIRD.
 */
import type { Knex } from "knex";
import { isQcSoftDeliver } from "./qcSoftDeliver";
import { buildQualityObservabilityRow } from "../quality/qualityObservability";

export type PostBurnPersistInput = {
  videoPass: boolean;
  videoPassAt?: string;
  audioPass?: boolean;
  audioPassAt?: string;
  findings?: unknown;
  seedStrengthen?: Record<string, string>;
  primaryNextStep?: string;
  userMessage?: string;
  scorecard?: unknown;
  failDims?: unknown;
  unknownDims?: unknown;
  skippedDims?: unknown;
  deeplinks?: unknown;
  svqHonesty?: unknown;
};

export function buildPostBurnVideoUpdate(post: PostBurnPersistInput): { state: string; errorReason: string } {
  const step = post.primaryNextStep;
  const qcWeakFlag = Boolean((post as { qcWeak?: boolean }).qcWeak);
  const effectivePass = post.videoPass && !qcWeakFlag && step !== "human_review";
  const softDeliver = isQcSoftDeliver({
    videoPass: effectivePass,
    primaryNextStep: step,
    failDims: post.failDims as Array<{ id?: string }> | undefined,
  });
  const delivered = effectivePass || softDeliver;
  return {
    state: delivered ? "生成成功" : "质检未过",
    errorReason: JSON.stringify({
      code: effectivePass ? undefined : "QC-SVQ",
      qcWeak: softDeliver || qcWeakFlag || undefined,
      videoPass: effectivePass,
      primaryNextStep: step,
      userMessage: post.userMessage,
      ctaLabel:
        step === "human_review"
          ? "SVQ 未测维 · 人审"
          : step === "chat_repair"
            ? "诊断视频 IRD"
            : qcWeakFlag
              ? "生成成功·未过质检"
              : undefined,
      findings: post.findings,
      unknownDims: post.unknownDims,
      failDims: post.failDims,
      skippedDims: post.skippedDims,
      svqHonesty: post.svqHonesty,
      postBurn: {
        videoPass: post.videoPass,
        audioPass: post.audioPass,
        findings: post.findings,
        seedStrengthen: post.seedStrengthen,
        primaryNextStep: step,
        userMessage: post.userMessage,
        scorecard: post.scorecard,
        failDims: post.failDims,
        unknownDims: post.unknownDims,
        skippedDims: post.skippedDims,
        svqHonesty: post.svqHonesty,
        deeplinks: post.deeplinks,
        observability: buildQualityObservabilityRow({
          stillQuality: (post as { stillQuality?: string }).stillQuality ?? null,
          i2vReady: (post as { i2vReady?: boolean }).i2vReady ?? null,
          autoRepairStage: (post as { autoRepairStage?: string }).autoRepairStage ?? null,
          failureKinds: (post.failDims as Array<{ id?: string }> | undefined)?.map((f) => String(f.id ?? "")),
        }),
      },
    }),
  };
}

/**
 * After post-burn: PASS → lifecycle video_burned (clears videoStale);
 * FAIL → keep videoStale + postBurn nextStep on storyboard.reason.
 */
export async function seedStoryboardAfterPostBurn(
  db: Knex,
  input: { storyboardId?: number | null; post: PostBurnPersistInput },
): Promise<void> {
  const sid = input.storyboardId;
  if (sid == null || !Number.isFinite(Number(sid))) return;
  const post = input.post;
  try {
    if (post.videoPass) {
      const { applyStoryboardLifecycle } = await import("../heal/applyStoryboardLifecycle");
      await applyStoryboardLifecycle(db, { storyboardId: Number(sid), event: "video_burned" });
      return;
    }
    const row = await db("o_storyboard").where({ id: sid }).first();
    const prev = row?.reason ? JSON.parse(String(row.reason)) : {};
    await db("o_storyboard").where({ id: sid }).update({
      reason: JSON.stringify({
        ...prev,
        videoPass: false,
        videoPassAt: undefined,
        audioPass: post.audioPass,
        audioPassAt: post.audioPassAt,
        postBurnStrengthen: post.seedStrengthen ?? {},
        postBurnNextStep: post.primaryNextStep,
        videoStale: true,
        primaryNextStep: post.primaryNextStep,
        userMessage: post.userMessage,
        ctaLabel:
          post.primaryNextStep === "human_review"
            ? "SVQ 未测维 · 人审"
            : post.primaryNextStep === "chat_repair"
              ? "诊断视频 IRD"
              : prev.ctaLabel,
      }),
    });
  } catch {
    /* best-effort lifecycle / fail seed */
  }
}
