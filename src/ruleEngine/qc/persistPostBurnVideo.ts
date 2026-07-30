/**
 * Persist post-burn QC onto o_video — single/batch homology.
 * Pass → 生成成功; fail → 质检未过 + flattened errorReason for FE poll/VIRD.
 */
import type { Knex } from "knex";
import { isQcSoftDeliver } from "./qcSoftDeliver";

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
  const softDeliver = isQcSoftDeliver({
    videoPass: post.videoPass,
    primaryNextStep: step,
    failDims: post.failDims as Array<{ id?: string }> | undefined,
  });
  const delivered = post.videoPass || softDeliver;
  return {
    state: delivered ? "生成成功" : "质检未过",
    errorReason: JSON.stringify({
      code: post.videoPass ? undefined : "QC-SVQ",
      qcWeak: softDeliver || undefined,
      videoPass: post.videoPass,
      primaryNextStep: step,
      userMessage: post.userMessage,
      ctaLabel:
        step === "human_review"
          ? "SVQ 未测维 · 人审"
          : step === "chat_repair"
            ? "诊断视频 IRD"
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
