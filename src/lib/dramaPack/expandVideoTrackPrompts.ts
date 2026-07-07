/**
 * sync / recompose 后：用 o_storyboard.videoDesc 经 AI 扩写 o_videoTrack.prompt
 */

import u from "@/utils";
import { parsePackExtensions } from "./promptComposer";
import { formatAssetPayloadForAi, formatAssetsXmlForAi } from "./assetPayloadForAi";
import { buildStoryboardXml, buildDialogueXml, invokeVideoPromptGeneration } from "./videoPromptUtils";
import { buildRefSlotsXml, loadTrackRefSlots } from "./refSlotBuilder";

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
  artStyle: string,
  vendorId: string,
  modelData: string,
  mode: string,
  respectImport: boolean,
): Promise<{ updated: boolean; skipped: boolean; detail: string }> {
  const track = await u.db("o_videoTrack").where("id", trackId).select("id", "prompt", "promptSource", "scriptId").first();
  if (!track) return { updated: false, skipped: false, detail: `track ${trackId} 不存在` };

  if (respectImport && track.promptSource === "import" && track.prompt?.trim()) {
    return { updated: false, skipped: true, detail: `track ${trackId} 跳过(import)` };
  }

  const boards = await u
    .db("o_storyboard")
    .where({ trackId })
    .orderBy("index", "asc")
    .select("id", "index", "videoDesc", "duration", "prompt", "track", "shouldGenerateImage", "shotMeta");

  if (!boards.length) {
    return { updated: false, skipped: false, detail: `track ${trackId} 无分镜` };
  }

  const boardIds = boards.map((b) => b.id!);
  const linkedAssets = await u
    .db("o_assets2Storyboard")
    .leftJoin("o_assets", "o_assets2Storyboard.assetId", "o_assets.id")
    .whereIn("o_assets2Storyboard.storyboardId", boardIds)
    .select("o_assets.id", "o_assets.type", "o_assets.name", "o_assets.describe", "o_assets.prompt", "o_assets.remark");

  const associateByBoard = await Promise.all(
    boards.map(async (b) => {
      const rows = await u.db("o_assets2Storyboard").where("storyboardId", b.id).pluck("assetId");
      return { ...b, associateAssetsIds: rows as number[] };
    }),
  );

  const agentRow = await u.db("o_agentWorkData").where({ projectId, key: "scriptAgent" }).first();
  const agentData = agentRow?.data ? JSON.parse(agentRow.data) : {};
  const extensions = parsePackExtensions(agentData);
  const assetXml = formatAssetsXmlForAi(linkedAssets.map((a) => formatAssetPayloadForAi(a, extensions)));

  const storyboardXml = buildStoryboardXml(
    associateByBoard.map((b) => ({
      videoDesc: b.videoDesc,
      prompt: b.prompt,
      track: b.track,
      duration: b.duration,
      associateAssetsIds: b.associateAssetsIds,
      shouldGenerateImage: b.shouldGenerateImage,
    })),
  );
  const dialogueBlock = buildDialogueXml(associateByBoard);
  const refSlots = await loadTrackRefSlots(trackId);
  const refSlotsBlock = refSlots.length ? buildRefSlotsXml(refSlots) : "";

  try {
    const sanitized = await invokeVideoPromptGeneration({
      vendorId,
      modelData,
      mode,
      artStyle,
      assetsBlock: assetXml,
      storyboardXml,
      dialogueBlock,
      refSlotsBlock,
    });

    if (!sanitized?.trim()) {
      return { updated: false, skipped: false, detail: `track ${trackId} AI 返回空` };
    }

    await u.db("o_videoTrack").where("id", trackId).update({
      prompt: sanitized,
      promptSource: "ai",
      state: "已完成",
    });

    console.log(`[drama-pack] expandVideoTrack trackId=${trackId} len=${sanitized.length} preview=${sanitized.slice(0, 120)}`);
    return { updated: true, skipped: false, detail: `track ${trackId} 已扩写 (${sanitized.length} chars)` };
  } catch (e) {
    const msg = u.error(e).message;
    await u.db("o_videoTrack").where("id", trackId).update({ state: "生成失败", reason: msg });
    return { updated: false, skipped: false, detail: `track ${trackId} 失败: ${msg}` };
  }
}

export async function expandProjectVideoTracks(options: ExpandVideoTracksOptions): Promise<ExpandVideoTracksResult> {
  const { projectId, respectImport = false, scriptId } = options;
  const project = await u.db("o_project").where("id", projectId).select("artStyle", "videoModel", "mode").first();
  const agentRow = await u.db("o_agentWorkData").where({ projectId, key: "scriptAgent" }).first();
  const agentData = agentRow?.data ? JSON.parse(agentRow.data) : {};
  const artStyle = project?.artStyle || agentData.artStyleHint || "";
  const videoModel = project?.videoModel || "";
  const [vendorId, modelData] = videoModel.split(/:(.+)/);
  const mode = project?.mode ?? "";

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
    const r = await expandSingleTrack(t.id!, projectId, artStyle, vendorId, modelData, mode, respectImport);
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
