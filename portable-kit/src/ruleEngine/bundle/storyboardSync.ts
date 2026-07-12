import type { Knex } from "knex";
import u from "@/utils";
import type { StoryboardPanelInput } from "./types";

function clientIdToFlowId(clientId: string): number {
  let hash = 0;
  for (let i = 0; i < clientId.length; i++) {
    hash = (hash << 5) - hash + clientId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || Date.now();
}

export interface StoryboardSyncResult {
  panels: StoryboardPanelInput[];
  idMap: Record<string, number>;
}

export async function syncStoryboardToDb(
  db: Knex,
  projectId: number,
  scriptId: number,
  panels: StoryboardPanelInput[],
  opts?: { replaceAll?: boolean; preserveMedia?: boolean },
): Promise<StoryboardSyncResult> {
  const idMap: Record<string, number> = {};
  if (opts?.replaceAll) {
    const existing = await db("o_storyboard").where({ scriptId, projectId }).select("id");
    if (existing.length) {
      const ids = existing.map((r) => r.id!);
      await db("o_assets2Storyboard").whereIn("storyboardId", ids).delete();
      await db("o_storyboard").whereIn("id", ids).delete();
    }
  }

  const existingRows = await db("o_storyboard").where({ scriptId, projectId });
  const existingByFlowId = new Map<number, (typeof existingRows)[0]>();
  for (const row of existingRows) {
    if (row.flowId) existingByFlowId.set(row.flowId, row);
  }

  const resultPanels: StoryboardPanelInput[] = [];

  for (let i = 0; i < panels.length; i++) {
    const panel = { ...panels[i] };
    const flowId = panel.flowId ?? (panel.clientId ? clientIdToFlowId(panel.clientId) : undefined);
    const track = panel.track ?? String(i + 1);
    let storyboardId = panel.id;

    if (!storyboardId && flowId && existingByFlowId.has(flowId)) {
      storyboardId = existingByFlowId.get(flowId)!.id;
    }

    const baseData = {
      prompt: panel.prompt ?? "",
      duration: String(panel.duration ?? 3),
      state: panel.state ?? "未生成",
      scriptId,
      projectId,
      track,
      videoDesc: panel.videoDesc ?? "",
      shouldGenerateImage: panel.shouldGenerateImage ?? 1,
      index: panel.index ?? i,
      flowId,
      createTime: Date.now(),
    };

    if (storyboardId) {
      const update: Record<string, unknown> = {
        prompt: baseData.prompt,
        duration: baseData.duration,
        track: baseData.track,
        videoDesc: baseData.videoDesc,
        shouldGenerateImage: baseData.shouldGenerateImage,
        index: baseData.index,
        flowId: baseData.flowId,
      };
      if (!opts?.preserveMedia) {
        update.state = baseData.state;
      }
      await db("o_storyboard").where("id", storyboardId).update(update);
    } else {
      const trackId = Date.now() + i;
      await db("o_videoTrack").insert({ id: trackId, scriptId, projectId, duration: Number(panel.duration) || 3 });
      const [newId] = await db("o_storyboard").insert({
        ...baseData,
        trackId,
        filePath: opts?.preserveMedia && panel.src ? u.replaceUrl(panel.src) : null,
      });
      storyboardId = newId;
    }

    if (panel.clientId) idMap[panel.clientId] = storyboardId!;
    if (flowId) idMap[`flow:${flowId}`] = storyboardId!;

    await db("o_assets2Storyboard").where("storyboardId", storyboardId).delete();
    if (panel.associateAssetsIds?.length) {
      await db("o_assets2Storyboard").insert(
        panel.associateAssetsIds.map((assetId) => ({ assetId, storyboardId })),
      );
    }

    resultPanels.push({
      ...panel,
      id: storyboardId,
      flowId,
      track,
      index: baseData.index as number,
    });
  }

  await assignTrackIds(db, scriptId, projectId);
  return { panels: resultPanels, idMap };
}

async function assignTrackIds(db: Knex, scriptId: number, projectId: number) {
  const rows = await db("o_storyboard").where({ scriptId, projectId }).orderBy("index", "asc");
  const byTrack: Record<string, number[]> = {};
  for (const row of rows) {
    const t = row.track ?? "1";
    if (!byTrack[t]) byTrack[t] = [];
    byTrack[t].push(row.id!);
  }
  for (const track of Object.keys(byTrack)) {
    const ids = byTrack[track]!;
    const trackDuration = rows.filter((r) => r.track === track).reduce((s, r) => s + Number(r.duration || 0), 0);
    const existing = await db("o_storyboard").where({ scriptId, track }).whereNotNull("trackId").first();
    let trackId: number;
    if (existing?.trackId) {
      trackId = existing.trackId;
      await db("o_videoTrack").where("id", trackId).update({ duration: trackDuration });
    } else {
      trackId = Date.now() + Math.floor(Math.random() * 1000);
      await db("o_videoTrack").insert({ id: trackId, scriptId, projectId, duration: trackDuration });
    }
    await db("o_storyboard").whereIn("id", ids).update({ trackId });
  }
}

export async function loadStoryboardFromDb(db: Knex, scriptId: number, projectId: number): Promise<StoryboardPanelInput[]> {
  const rows = await db("o_storyboard").where({ scriptId, projectId }).orderBy("index", "asc");
  const result: StoryboardPanelInput[] = [];
  for (const row of rows) {
    const associateAssetsIds = await db("o_assets2Storyboard").where("storyboardId", row.id).pluck("assetId");
    let src: string | null = null;
    if (row.filePath) {
      try {
        src = await u.oss.getSmallImageUrl(row.filePath);
      } catch {
        src = row.filePath;
      }
    }
    result.push({
      id: row.id,
      flowId: row.flowId ?? undefined,
      duration: Number(row.duration) || 0,
      prompt: row.prompt ?? "",
      videoDesc: row.videoDesc ?? "",
      shouldGenerateImage: row.shouldGenerateImage ?? 1,
      associateAssetsIds,
      track: row.track ?? undefined,
      state: row.state ?? "未生成",
      src,
      index: row.index ?? undefined,
    });
  }
  return result;
}
