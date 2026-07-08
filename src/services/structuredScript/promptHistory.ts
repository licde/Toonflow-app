import u from "@/utils";
import type { StructuredShot } from "./types";

const HISTORY_KEY = "structuredShotHistory";

export interface SyncRevision {
  at: number;
  hashBefore?: string;
  hashAfter: string;
  changedFields: string[];
  prompt?: string;
  videoPrompt?: string;
  impact?: string;
  reason?: string;
}

export interface OverrideRevision {
  at: number;
  field: string;
  before?: string;
  after?: string;
  by?: string;
}

export interface ShotHistoryEntry {
  storyboardId: number;
  shotNo: number;
  shotMetaOriginal?: StructuredShot;
  promptOriginal?: string;
  videoPromptOriginal?: string;
  videoDescOriginal?: string;
  syncRevisions: SyncRevision[];
  overrideRevisions: OverrideRevision[];
}

type HistoryStore = { byStoryboard: Record<string, ShotHistoryEntry> };

async function loadStore(projectId: number, scriptId: number): Promise<HistoryStore> {
  const row = await u.db("o_agentWorkData").where({ projectId, episodesId: scriptId, key: HISTORY_KEY }).first();
  if (!row?.data) return { byStoryboard: {} };
  try {
    const parsed = JSON.parse(row.data) as HistoryStore;
    return parsed.byStoryboard ? parsed : { byStoryboard: {} };
  } catch {
    return { byStoryboard: {} };
  }
}

async function saveStore(projectId: number, scriptId: number, store: HistoryStore) {
  const row = await u.db("o_agentWorkData").where({ projectId, episodesId: scriptId, key: HISTORY_KEY }).first();
  const payload = JSON.stringify(store);
  if (row?.id) {
    await u.db("o_agentWorkData").where("id", row.id).update({ data: payload, updateTime: Date.now() });
  } else {
    await u.db("o_agentWorkData").insert({
      projectId,
      episodesId: scriptId,
      key: HISTORY_KEY,
      data: payload,
      createTime: Date.now(),
      updateTime: Date.now(),
    });
  }
}

export async function initShotHistoryOnImport(opts: {
  projectId: number;
  scriptId: number;
  entries: { storyboardId: number; shot: StructuredShot; prompt: string; videoPrompt: string; videoDesc: string }[];
}) {
  const store = await loadStore(opts.projectId, opts.scriptId);
  for (const e of opts.entries) {
    const key = String(e.storyboardId);
    store.byStoryboard[key] = {
      storyboardId: e.storyboardId,
      shotNo: e.shot.镜号,
      shotMetaOriginal: e.shot,
      promptOriginal: e.prompt,
      videoPromptOriginal: e.videoPrompt,
      videoDescOriginal: e.videoDesc,
      syncRevisions: [],
      overrideRevisions: [],
    };
  }
  await saveStore(opts.projectId, opts.scriptId, store);
}

export async function appendSyncRevision(opts: {
  projectId: number;
  scriptId: number;
  storyboardId: number;
  revision: SyncRevision;
}) {
  const store = await loadStore(opts.projectId, opts.scriptId);
  const key = String(opts.storyboardId);
  if (!store.byStoryboard[key]) {
    store.byStoryboard[key] = {
      storyboardId: opts.storyboardId,
      shotNo: 0,
      syncRevisions: [],
      overrideRevisions: [],
    };
  }
  store.byStoryboard[key].syncRevisions.push(opts.revision);
  await saveStore(opts.projectId, opts.scriptId, store);
}

export async function getShotHistory(projectId: number, scriptId: number, storyboardId: number): Promise<ShotHistoryEntry | null> {
  const store = await loadStore(projectId, scriptId);
  return store.byStoryboard[String(storyboardId)] ?? null;
}

export async function getAllShotHistory(projectId: number, scriptId: number): Promise<Record<string, ShotHistoryEntry>> {
  const store = await loadStore(projectId, scriptId);
  return store.byStoryboard;
}
