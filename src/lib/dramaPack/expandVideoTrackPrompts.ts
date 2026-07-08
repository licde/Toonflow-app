/**
 * sync / recompose 后：用 o_storyboard.videoDesc 经 AI 扩写 o_videoTrack.prompt
 */

import u from "@/utils";
import { generateTrackPrompt } from "./trackVideoService";

export type ExpandVideoTracksOptions = {
  projectId: number;
  respectImport?: boolean;
  scriptId?: number;
};

export type ExpandVideoTracksResult = {
  success: boolean;
  updatedCount: number;
  skippedCount: number;
  message: string;
  details: string[];
};

async function expandSingleTrack(
  trackId: number,
  projectId: number,
  videoModel: string,
  mode: string,
  respectImport: boolean,
): Promise<{ updated: boolean; skipped: boolean; detail: string }> {
  try {
    const result = await generateTrackPrompt(trackId, { projectId, model: videoModel, mode, respectImport });
    if (result.skipped) {
      return { updated: false, skipped: true, detail: `track ${trackId} 跳过(import)` };
    }
    await u.db("o_videoTrack").where("id", trackId).update({
      prompt: result.prompt,
      promptSource: result.promptSource,
      state: "已完成",
    });
    return { updated: true, skipped: false, detail: `track ${trackId} 已扩写 (${result.prompt.length} chars)` };
  } catch (e) {
    const msg = u.error(e).message;
    await u.db("o_videoTrack").where("id", trackId).update({ state: "生成失败", reason: msg });
    return { updated: false, skipped: false, detail: `track ${trackId} 失败: ${msg}` };
  }
}

export async function expandProjectVideoTracks(options: ExpandVideoTracksOptions): Promise<ExpandVideoTracksResult> {
  const { projectId, respectImport = false, scriptId } = options;
  const project = await u.db("o_project").where("id", projectId).select("videoModel", "mode").first();
  const videoModel = project?.videoModel || "";
  let mode = "";
  try {
    mode = JSON.parse(project?.mode ?? "");
  } catch {
    mode = project?.mode ?? "";
  }

  let trackQuery = u.db("o_videoTrack").where({ projectId }).select("id");
  if (scriptId) trackQuery = trackQuery.andWhere("scriptId", scriptId);
  const tracks = await trackQuery;

  if (!tracks.length) {
    return { success: false, updatedCount: 0, skippedCount: 0, message: "无 videoTrack", details: [] };
  }

  let updatedCount = 0;
  let skippedCount = 0;
  const details: string[] = [];

  for (const t of tracks) {
    const r = await expandSingleTrack(t.id!, projectId, videoModel, String(mode), respectImport);
    if (r.updated) updatedCount++;
    if (r.skipped) skippedCount++;
    details.push(r.detail);
  }

  return {
    success: updatedCount > 0,
    updatedCount,
    skippedCount,
    message: `视频 track 扩写 ${updatedCount} 条，跳过 ${skippedCount} 条`,
    details,
  };
}
