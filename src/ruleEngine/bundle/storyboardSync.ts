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
  mediaPreservedCount: number;
}

export async function syncStoryboardToDb(
  db: Knex,
  projectId: number,
  scriptId: number,
  panels: StoryboardPanelInput[],
  opts?: { replaceAll?: boolean; preserveMedia?: boolean },
): Promise<StoryboardSyncResult> {
  const idMap: Record<string, number> = {};
  let mediaPreservedCount = 0;
  if (opts?.replaceAll) {
    const existing = await db("o_storyboard").where({ scriptId, projectId }).select("id");
    if (existing.length) {
      const ids = existing.map((r) => r.id!);
      await db("o_assets2Storyboard").whereIn("storyboardId", ids).delete();
      await db("o_storyboard").whereIn("id", ids).delete();
    }
  }

  const existingRows = await db("o_storyboard").where({ scriptId, projectId }).orderBy("index", "asc");
  const existingByFlowId = new Map<number, (typeof existingRows)[0]>();
  const existingByIndex = new Map<number, (typeof existingRows)[0]>();
  for (const row of existingRows) {
    if (row.flowId) existingByFlowId.set(row.flowId, row);
    if (row.index != null) existingByIndex.set(Number(row.index), row);
  }

  const resultPanels: StoryboardPanelInput[] = [];

  for (let i = 0; i < panels.length; i++) {
    const panel = { ...panels[i] };
    const flowId = panel.flowId ?? (panel.clientId ? clientIdToFlowId(panel.clientId) : undefined);
    const track = panel.track ?? String(i + 1);
    let storyboardId = panel.id;
    const panelIndex = panel.index ?? i;

    if (!storyboardId && flowId && existingByFlowId.has(flowId)) {
      storyboardId = existingByFlowId.get(flowId)!.id;
    }
    // DeepSeek / re-import: no stable flowId — match by shot index when preserving media
    if (!storyboardId && opts?.preserveMedia && existingByIndex.has(panelIndex)) {
      storyboardId = existingByIndex.get(panelIndex)!.id;
    }

    const baseData = {
      prompt: panel.prompt ?? "",
      duration: String(panel.duration ?? 3),
      state: panel.state ?? "未生成",
      scriptId,
      projectId,
      track,
      videoDesc: panel.videoDesc ?? "",
      audioPrompt: panel.audioPrompt ?? "",
      fxPrompt: panel.fxPrompt ?? "",
      shouldGenerateImage: panel.shouldGenerateImage ?? 1,
      index: panelIndex,
      flowId,
      createTime: Date.now(),
    };

    if (storyboardId) {
      const existingRow = existingRows.find((r) => r.id === storyboardId);
      const update: Record<string, unknown> = {
        prompt: baseData.prompt,
        duration: baseData.duration,
        track: baseData.track,
        videoDesc: baseData.videoDesc,
        audioPrompt: baseData.audioPrompt,
        fxPrompt: baseData.fxPrompt,
        shouldGenerateImage: baseData.shouldGenerateImage,
        index: baseData.index,
        flowId: baseData.flowId,
      };
      if (opts?.preserveMedia && existingRow?.filePath && (existingRow.state === "已完成" || existingRow.filePath)) {
        update.state = existingRow.state === "已完成" ? existingRow.state : baseData.state;
        update.filePath = existingRow.filePath;
        mediaPreservedCount += 1;
      } else if (!opts?.preserveMedia) {
        update.state = baseData.state;
      }
      await db("o_storyboard").where("id", storyboardId).update(update);
    } else {
      const trackId = Date.now() + i;
      await db("o_videoTrack").insert({
        id: trackId,
        scriptId,
        projectId,
        duration: Number(panel.duration) || 3,
        prompt: panel.videoDesc?.trim() ?? "",
      });
      const preservedSrc = opts?.preserveMedia && panel.src ? u.replaceUrl(panel.src) : null;
      if (preservedSrc) mediaPreservedCount += 1;
      const [newId] = await db("o_storyboard").insert({
        ...baseData,
        trackId,
        filePath: preservedSrc,
      });
      storyboardId = newId;
    }

    if (panel.clientId) idMap[panel.clientId] = storyboardId!;
    if (flowId) idMap[`flow:${flowId}`] = storyboardId!;

    // On preserveMedia keep existing asset links when incoming has none
    const incomingLinks = panel.associateAssetsIds?.length
      ? panel.associateAssetsIds
      : opts?.preserveMedia
        ? undefined
        : [];
    if (incomingLinks) {
      await db("o_assets2Storyboard").where("storyboardId", storyboardId).delete();
      if (incomingLinks.length) {
        await db("o_assets2Storyboard").insert(
          incomingLinks.map((assetId) => ({ assetId, storyboardId })),
        );
      }
    } else if (!opts?.preserveMedia) {
      await db("o_assets2Storyboard").where("storyboardId", storyboardId).delete();
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
  return { panels: resultPanels, idMap, mediaPreservedCount };
}

async function assignTrackIds(db: Knex, scriptId: number, projectId: number) {
  const rows = await db("o_storyboard").where({ scriptId, projectId }).orderBy("index", "asc");
  const byTrack: Record<string, number[]> = {};
  const byTrackVideoDesc: Record<string, string> = {};
  for (const row of rows) {
    const t = row.track ?? "1";
    if (!byTrack[t]) byTrack[t] = [];
    byTrack[t].push(row.id!);
    if (!byTrackVideoDesc[t] && row.videoDesc) byTrackVideoDesc[t] = String(row.videoDesc);
  }
  for (const track of Object.keys(byTrack)) {
    const ids = byTrack[track]!;
    const trackDuration = rows.filter((r) => r.track === track).reduce((s, r) => s + Number(r.duration || 0), 0);
    const existing = await db("o_storyboard").where({ scriptId, projectId, track }).whereNotNull("trackId").first();
    let trackId: number;
    if (existing?.trackId) {
      trackId = existing.trackId;
      const update: Record<string, unknown> = { duration: trackDuration };
      if (byTrackVideoDesc[track]) {
        const trackRow = await db("o_videoTrack").where("id", trackId).select("prompt").first();
        if (!trackRow?.prompt?.trim()) update.prompt = byTrackVideoDesc[track];
      }
      await db("o_videoTrack").where("id", trackId).update(update);
    } else {
      trackId = Date.now() + Math.floor(Math.random() * 1000);
      await db("o_videoTrack").insert({ id: trackId, scriptId, projectId, duration: trackDuration, prompt: byTrackVideoDesc[track] ?? "" });
    }
    await db("o_storyboard").whereIn("id", ids).update({ trackId });
  }
}

export async function loadStoryboardFromDb(db: Knex, scriptId: number, projectId: number): Promise<StoryboardPanelInput[]> {
  const rows = await db("o_storyboard").where({ scriptId, projectId }).orderBy("index", "asc");
  if (!rows.length) return [];

  const ids = rows.map((r) => r.id!);
  const assetLinks = await db("o_assets2Storyboard").whereIn("storyboardId", ids).select("storyboardId", "assetId");
  const assetsBySb = new Map<number, number[]>();
  for (const link of assetLinks) {
    const sid = link.storyboardId as number;
    if (!assetsBySb.has(sid)) assetsBySb.set(sid, []);
    assetsBySb.get(sid)!.push(link.assetId as number);
  }

  let flowPanels: { id?: number; audioPrompt?: string; fxPrompt?: string }[] = [];
  try {
    const flowRow = await db("o_agentWorkData").where({ projectId, episodesId: scriptId, key: "productionAgent" }).first();
    if (flowRow?.data) {
      const flow = JSON.parse(flowRow.data as string);
      flowPanels = (flow.storyboard as typeof flowPanels) ?? [];
    }
  } catch {
    /* flowData optional */
  }
  const flowById = new Map(flowPanels.filter((p) => p.id != null).map((p) => [p.id!, p]));

  const result: StoryboardPanelInput[] = [];
  for (const row of rows) {
    let src: string | null = null;
    if (row.filePath) {
      try {
        src = await u.oss.getSmallImageUrl(row.filePath);
      } catch {
        src = row.filePath;
      }
    }
    const panel = flowById.get(row.id!);
    const audioPrompt = row.audioPrompt ?? panel?.audioPrompt ?? undefined;
    const fxPrompt = row.fxPrompt ?? panel?.fxPrompt ?? undefined;
    result.push({
      id: row.id,
      flowId: row.flowId ?? undefined,
      duration: Number(row.duration) || 0,
      prompt: row.prompt ?? "",
      videoDesc: row.videoDesc ?? "",
      audioPrompt,
      fxPrompt,
      shouldGenerateImage: row.shouldGenerateImage ?? 1,
      associateAssetsIds: assetsBySb.get(row.id!) ?? [],
      track: row.track ?? undefined,
      state: row.state ?? "未生成",
      src,
      index: row.index ?? undefined,
    });
  }
  return result;
}
