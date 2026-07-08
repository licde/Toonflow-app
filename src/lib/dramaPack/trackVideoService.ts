/**
 * 视频工作台单一真源服务：轨道上下文、参考条带落库、多 route 提示词缓存。
 */

import crypto from "crypto";
import u from "@/utils";
import { loadProjectPackContext } from "./loadProjectPackContext";
import { formatAssetPayloadForAi, formatAssetsXmlForAi } from "./assetPayloadForAi";
import {
  buildRefSlots,
  buildRefSlotsXml,
  enrichMediasWithResolved,
  loadTrackRefSlots,
  type RefMediaInput,
  type RefSlot,
} from "./refSlotBuilder";
import {
  buildDialogueXml,
  buildStoryboardXml,
  invokeVideoPromptGeneration,
  resolveVideoPromptRoute,
} from "./videoPromptUtils";
import { buildPromptSourceTag, parsePromptSourceTag } from "./videoWorkbenchGuard";
import { matchTrackVideoPrompt } from "./promptComposer";

export type RoutePreset = {
  routeKey: string;
  mode: string;
};

export type TrackPromptCache = {
  prompt: string;
  promptSource: string;
  generatedAt: number;
  inputHash: string;
};

export type TrackPlan = {
  mediasHash: string;
  inputHash: string;
  activeRoute?: string;
  prompts: Record<string, TrackPromptCache>;
};

export type VideoWorkbenchState = {
  defaultRoute: string;
  routes: string[];
  presetStatus: "pending" | "running" | "done" | "failed";
  presetMessage?: string;
  trackPlans: Record<string, TrackPlan>;
};

export type EpisodePlanSummary = {
  directorNotes?: string;
  emotionBeats?: string;
  scriptPlan?: string;
  keyPrompts?: Array<{ scene?: string; videoPrompt?: string }>;
};

export type TrackContext = {
  trackId: number;
  projectId: number;
  scriptId: number;
  prompt: string;
  promptSource: string;
  medias: RefMediaInput[];
  refSlots: RefSlot[];
  currentRoute: ReturnType<typeof resolveVideoPromptRoute>;
  activeRouteKey: string;
  promptPresets: Record<string, { ready: boolean; generatedAt?: number }>;
  promptStale: boolean;
  inputHash: string;
  episodePlan?: EpisodePlanSummary;
};

function md5(data: string): string {
  return crypto.createHash("md5").update(data).digest("hex");
}

function canonicalMediasForHash(medias: RefMediaInput[]): string {
  const items = enrichMediasWithResolved(medias).map((m) => ({
    id: m.id,
    sources: m.sources,
    src: m.resolvedSrc,
    fileType: m.fileType ?? "image",
  }));
  return JSON.stringify(items);
}

export function hashMedias(medias: RefMediaInput[]): string {
  return md5(canonicalMediasForHash(medias));
}

export async function loadEpisodePlan(scriptId: number, projectId: number): Promise<EpisodePlanSummary | undefined> {
  const row = await u.db("o_agentWorkData").where({ projectId, episodesId: scriptId, key: "productionAgent" }).first();
  if (!row?.data) return undefined;
  try {
    const data = JSON.parse(row.data);
    return {
      directorNotes: data.directorNotes,
      emotionBeats: data.emotionBeats,
      scriptPlan: data.scriptPlan,
      keyPrompts: data.keyPrompts,
    };
  } catch {
    return undefined;
  }
}

export async function loadVideoWorkbench(scriptId: number, projectId: number): Promise<VideoWorkbenchState> {
  const row = await u.db("o_agentWorkData").where({ projectId, episodesId: scriptId, key: "productionAgent" }).first();
  if (!row?.data) {
    return { defaultRoute: "", routes: [], presetStatus: "pending", trackPlans: {} };
  }
  try {
    const data = JSON.parse(row.data);
    const wb = data.videoWorkbench as VideoWorkbenchState | undefined;
    if (!wb) return { defaultRoute: "", routes: [], presetStatus: "pending", trackPlans: {} };
    return {
      defaultRoute: wb.defaultRoute ?? "",
      routes: wb.routes ?? [],
      presetStatus: wb.presetStatus ?? "pending",
      presetMessage: wb.presetMessage,
      trackPlans: wb.trackPlans ?? {},
    };
  } catch {
    return { defaultRoute: "", routes: [], presetStatus: "pending", trackPlans: {} };
  }
}

export async function saveVideoWorkbench(scriptId: number, projectId: number, patch: Partial<VideoWorkbenchState>): Promise<void> {
  const row = await u.db("o_agentWorkData").where({ projectId, episodesId: scriptId, key: "productionAgent" }).first();
  if (!row?.data) return;
  const data = JSON.parse(row.data);
  const prev = (data.videoWorkbench ?? {}) as VideoWorkbenchState;
  data.videoWorkbench = { ...prev, ...patch, trackPlans: { ...prev.trackPlans, ...(patch.trackPlans ?? {}) } };
  await u.db("o_agentWorkData").where("id", row.id).update({ data: JSON.stringify(data), updateTime: Date.now() });
}

export async function getProjectVideoConfig(projectId: number): Promise<{
  videoModel: string;
  mode: string;
  artStyle: string;
  vendorId: string;
  modelData: string;
}> {
  const project = await u.db("o_project").where("id", projectId).select("videoModel", "mode", "artStyle").first();
  const videoModel = project?.videoModel || "";
  const [vendorId, modelData = ""] = videoModel.split(/:(.+)/);
  let mode = "";
  try {
    mode = JSON.parse(project?.mode ?? "");
  } catch {
    mode = project?.mode ?? "";
  }
  return {
    videoModel,
    mode: String(mode),
    artStyle: project?.artStyle || "无",
    vendorId,
    modelData,
  };
}

/** 按项目模型推导预设 route 列表（1~2 条主链路） */
export async function getProjectSupportedRoutes(projectId: number): Promise<RoutePreset[]> {
  const { modelData, mode } = await getProjectVideoConfig(projectId);
  const current = resolveVideoPromptRoute(modelData, mode);
  const routes: RoutePreset[] = [{ routeKey: current.modeLabel, mode: String(mode) }];

  const modelLower = modelData.toLowerCase();
  if (modelLower.includes("wan")) {
    const singleRoute = resolveVideoPromptRoute(modelData, "singleImage");
    if (!routes.some((r) => r.routeKey === singleRoute.modeLabel)) {
      routes.unshift({ routeKey: singleRoute.modeLabel, mode: "singleImage" });
    }
    const textRoute = resolveVideoPromptRoute(modelData, "text");
    if (!routes.some((r) => r.routeKey === textRoute.modeLabel)) {
      routes.push({ routeKey: textRoute.modeLabel, mode: "text" });
    }
  } else if (mode !== "text") {
    const textRoute = resolveVideoPromptRoute(modelData, "text");
    if (!routes.some((r) => r.routeKey === textRoute.modeLabel)) {
      routes.push({ routeKey: textRoute.modeLabel, mode: "text" });
    }
  }
  return routes;
}

type EpisodeMediaMaps = {
  storyboardTrackRecord: Record<number, RefMediaInput[]>;
  otherDataMap: Record<number, RefMediaInput[]>;
  audioReferenceCount: number;
};

async function buildEpisodeMediaMaps(projectId: number, scriptId: number): Promise<EpisodeMediaMaps> {
  const projectData = await u.db("o_project").where("id", projectId).select("mode").first();
  let videoMode: unknown = "";
  try {
    videoMode = JSON.parse(projectData?.mode ?? "");
  } catch {
    videoMode = projectData?.mode ?? "";
  }
  const isRef = Array.isArray(videoMode);
  const audioReferenceCount = (() => {
    if (!Array.isArray(videoMode)) return 0;
    const item = (videoMode as string[]).find((v) => v.toLowerCase().startsWith("audioreference:"));
    if (!item) return 0;
    const num = parseInt(item.split(":")[1], 10);
    return isNaN(num) ? 0 : num;
  })();

  const storyboardList = await u.db("o_storyboard").where({ scriptId, projectId }).orderBy("index", "asc");
  const storyboardTrackRecord: Record<number, RefMediaInput[]> = {};
  const otherDataMap: Record<number, RefMediaInput[]> = {};

  for (const i of storyboardList) {
    const filePath = i.filePath ? String(i.filePath) : "";
    const entry: RefMediaInput = {
      src: filePath,
      fileType: "image",
      sources: "storyboard",
      id: i.id,
      index: i.index,
    };
    if (storyboardTrackRecord[i.trackId!]) storyboardTrackRecord[i.trackId!].push(entry);
    else storyboardTrackRecord[i.trackId!] = [entry];
  }

  if (isRef) {
    const storyIds = storyboardList.map((s) => s.id!);
    const assetDatas = await u
      .db("o_assets2Storyboard")
      .leftJoin("o_assets", "o_assets2Storyboard.assetId", "o_assets.id")
      .leftJoin("o_image", "o_image.id", "o_assets.imageId")
      .whereIn("o_assets2Storyboard.storyboardId", storyIds)
      .select("o_assets.*", "o_image.filePath", "o_assets2Storyboard.storyboardId");

    const queryAudioIds = [...assetDatas.map((i) => i.id!), ...assetDatas.map((i) => i.assetsId!)].filter(Boolean);
    const assets2AudioData = await u
      .db("o_assetsRole2Audio")
      .leftJoin("o_assets", "o_assets.assetsId", "o_assetsRole2Audio.assetsAudioId")
      .leftJoin("o_image", "o_image.id", "o_assets.imageId")
      .whereIn("o_assetsRole2Audio.assetsRoleId", queryAudioIds)
      .select("o_assets.id", "o_assets.name", "o_assetsRole2Audio.assetsRoleId", "o_assets.describe", "o_assets.type", "o_assets.prompt", "o_image.filePath");

    const audioRecord: Record<string, RefMediaInput[]> = {};
    for (const i of assets2AudioData) {
      if (!audioRecord[i.assetsRoleId]) audioRecord[i.assetsRoleId] = [];
      audioRecord[i.assetsRoleId].push({
        id: i.id,
        name: i.name,
        describe: i.describe,
        type: i.type,
        fileType: "audio",
        sources: "assets",
        prompt: i.prompt,
        src: i.filePath ? String(i.filePath) : "",
      });
    }

    for (const i of assetDatas) {
      const item: RefMediaInput = {
        id: i.id,
        name: i.name,
        describe: i.describe,
        type: i.type,
        remark: i.remark,
        fileType: "image",
        sources: "assets",
        src: i.filePath ? String(i.filePath) : "",
      };
      const sid = i.storyboardId as number;
      if (!otherDataMap[sid]) otherDataMap[sid] = [];
      otherDataMap[sid].push(item);
      if (audioRecord[i.id]) otherDataMap[sid].push(...audioRecord[i.id]);
      if (audioRecord[i.assetsId]) otherDataMap[sid].push(...audioRecord[i.assetsId]);
    }
  }

  for (const trackId of Object.keys(storyboardTrackRecord)) {
    for (const entry of storyboardTrackRecord[Number(trackId)]) {
      const assets = otherDataMap[entry.id as number] ?? [];
      const fallbacks = assets.filter((a) => a.src && a.fileType === "image").map((a) => String(a.src));
      if (fallbacks.length) {
        (entry as RefMediaInput & { fallbackAssetSrc?: string }).fallbackAssetSrc = fallbacks[0];
      }
    }
  }

  return { storyboardTrackRecord, otherDataMap, audioReferenceCount };
}

/** 与 getGenerateData 同算法的默认参考条带（存库用 filePath，不含 OSS URL） */
export async function buildDefaultMedias(trackId: number): Promise<RefMediaInput[]> {
  const track = await u.db("o_videoTrack").where("id", trackId).select("projectId", "scriptId").first();
  if (!track?.projectId || !track?.scriptId) return [];

  const { storyboardTrackRecord, otherDataMap, audioReferenceCount } = await buildEpisodeMediaMaps(track.projectId, track.scriptId);
  const storyboardMedias = storyboardTrackRecord[trackId] ?? [];
  const assetMedias = storyboardMedias.flatMap((s) => otherDataMap[s.id as number] ?? []);

  const seenAssetIds = new Set<number>();
  const uniqueAssets = assetMedias.filter((a) => {
    if (a.id == null || seenAssetIds.has(a.id)) return false;
    seenAssetIds.add(a.id);
    return true;
  });

  const audioCountMap: Record<string, number> = {};
  const filteredAssets = uniqueAssets.filter((a) => {
    if (a.fileType !== "audio" || audioReferenceCount === 0) return true;
    const key = String(a.id);
    audioCountMap[key] = (audioCountMap[key] ?? 0) + 1;
    const totalAudio = Object.values(audioCountMap).reduce((s, n) => s + n, 0);
    return totalAudio <= audioReferenceCount;
  });

  const hasImageAssetData = filteredAssets.filter((i) => i.src);
  const notHasImageAssetData = filteredAssets.filter((i) => !i.src);
  return [...hasImageAssetData, ...storyboardMedias, ...notHasImageAssetData];
}

export async function autoPersistTrackMedias(trackId: number): Promise<RefMediaInput[]> {
  const track = await u.db("o_videoTrack").where("id", trackId).select("medias").first();
  let existing: RefMediaInput[] = [];
  if (track?.medias) {
    try {
      const parsed = JSON.parse(track.medias as string);
      if (Array.isArray(parsed) && parsed.length) existing = parsed;
    } catch {
      /* use default */
    }
  }
  if (existing.length) return existing;

  const defaultMedias = await buildDefaultMedias(trackId);
  if (defaultMedias.length) {
    await u.db("o_videoTrack").where("id", trackId).update({ medias: JSON.stringify(defaultMedias) });
  }
  return defaultMedias;
}

async function buildStoryboardPayload(trackId: number) {
  const boards = await u
    .db("o_storyboard")
    .where({ trackId })
    .orderBy("index", "asc")
    .select("id", "index", "videoDesc", "videoPrompt", "duration", "prompt", "track", "shouldGenerateImage", "shotMeta");

  return Promise.all(
    boards.map(async (b) => {
      const rows = await u.db("o_assets2Storyboard").where("storyboardId", b.id).pluck("assetId");
      return { ...b, associateAssetsIds: rows as number[] };
    }),
  );
}

function buildEpisodeDirectorBlock(plan?: EpisodePlanSummary): string {
  if (!plan) return "";
  const parts: string[] = [];
  if (plan.directorNotes?.trim()) parts.push(`[DirectorNotes]\n${plan.directorNotes.trim()}`);
  if (plan.emotionBeats?.trim()) parts.push(`[EmotionBeats]\n${plan.emotionBeats.trim()}`);
  if (plan.scriptPlan?.trim()) parts.push(`[ScriptPlan]\n${plan.scriptPlan.trim()}`);
  return parts.join("\n\n");
}

function buildKeyPromptsBlock(
  trackKey: string,
  boards: Array<{ videoDesc?: string | null; prompt?: string | null }>,
  plan?: EpisodePlanSummary,
): string {
  const shots = boards.map((b) => ({ videoDesc: b.videoDesc ?? "", imagePrompt: b.prompt ?? "", videoPrompt: "" }));
  const matched = matchTrackVideoPrompt(trackKey, shots as Parameters<typeof matchTrackVideoPrompt>[1], plan?.keyPrompts ?? []);
  if (!matched) return "";
  return `[KeyPrompt]\n${matched}`;
}

export async function computeInputHash(trackId: number, routeKey: string, mode: string): Promise<string> {
  const medias = await autoPersistTrackMedias(trackId);
  const boards = await buildStoryboardPayload(trackId);
  const boardSig = boards.map((b) => `${b.id}:${b.videoDesc ?? ""}:${b.videoPrompt ?? ""}`).join("|");
  return md5(`${routeKey}|${mode}|${hashMedias(medias)}|${boardSig}`);
}

export async function generateTrackPrompt(
  trackId: number,
  opts: { projectId: number; model: string; mode: string; routeKey?: string; respectImport?: boolean },
): Promise<{ prompt: string; promptSource: string; skipped: boolean; inputHash: string }> {
  const track = await u.db("o_videoTrack").where("id", trackId).select("prompt", "promptSource", "scriptId").first();
  if (!track) throw new Error(`track ${trackId} 不存在`);

  const [, modelData = ""] = opts.model.split(/:(.+)/);
  const route = opts.routeKey
    ? { modeLabel: opts.routeKey, ...resolveVideoPromptRoute(modelData, opts.mode) }
    : resolveVideoPromptRoute(modelData, opts.mode);
  const routeKey = opts.routeKey ?? route.modeLabel;

  if (opts.respectImport && track.promptSource === "import" && track.prompt?.trim()) {
    const inputHash = await computeInputHash(trackId, routeKey, opts.mode);
    return { prompt: track.prompt, promptSource: track.promptSource, skipped: true, inputHash };
  }

  await autoPersistTrackMedias(trackId);
  const boards = await buildStoryboardPayload(trackId);
  if (!boards.length) throw new Error(`track ${trackId} 无分镜`);

  const boardIds = boards.map((b) => b.id!);
  const linkedAssets = await u
    .db("o_assets2Storyboard")
    .leftJoin("o_assets", "o_assets2Storyboard.assetId", "o_assets.id")
    .whereIn("o_assets2Storyboard.storyboardId", boardIds)
    .select("o_assets.id", "o_assets.type", "o_assets.name", "o_assets.describe", "o_assets.prompt", "o_assets.remark");

  const packCtx = await loadProjectPackContext(opts.projectId);
  const assetXml = formatAssetsXmlForAi(linkedAssets.map((a) => formatAssetPayloadForAi(a, packCtx.extensions)));
  const storyboardXml = buildStoryboardXml(
    boards.map((b) => ({
      index: b.index,
      videoDesc: b.videoDesc,
      videoPrompt: b.videoPrompt,
      prompt: b.prompt,
      track: b.track,
      duration: b.duration,
      associateAssetsIds: b.associateAssetsIds,
      shouldGenerateImage: b.shouldGenerateImage,
    })),
  );
  const dialogueBlock = buildDialogueXml(boards);
  const refSlots = await loadTrackRefSlots(trackId);
  const refSlotsBlock = refSlots.length ? buildRefSlotsXml(refSlots) : "";

  const episodePlan = await loadEpisodePlan(track.scriptId!, opts.projectId);
  const trackKey = boards[0]?.track ?? String(trackId);
  const episodeDirectorBlock = buildEpisodeDirectorBlock(episodePlan);
  const keyPromptsBlock = buildKeyPromptsBlock(trackKey, boards, episodePlan);

  const [vendorId] = opts.model.split(/:(.+)/);
  const { artStyle } = await getProjectVideoConfig(opts.projectId);

  const sanitized = await invokeVideoPromptGeneration({
    vendorId,
    modelData,
    mode: opts.mode,
    artStyle,
    assetsBlock: assetXml,
    storyboardXml,
    dialogueBlock,
    refSlotsBlock,
    episodeDirectorBlock,
    keyPromptsBlock,
  });

  const promptSource = buildPromptSourceTag(opts.model, opts.mode, sanitized, refSlots.length);
  const inputHash = await computeInputHash(trackId, routeKey, opts.mode);

  return { prompt: sanitized, promptSource, skipped: false, inputHash };
}

export async function activateRoutePrompt(trackId: number, routeKey: string, scriptId: number, projectId: number): Promise<boolean> {
  const wb = await loadVideoWorkbench(scriptId, projectId);
  const plan = wb.trackPlans[String(trackId)];
  const cached = plan?.prompts[routeKey];
  if (!cached?.prompt) return false;

  await u.db("o_videoTrack").where("id", trackId).update({
    prompt: cached.prompt,
    promptSource: cached.promptSource,
    state: "已完成",
  });

  if (plan) {
    plan.activeRoute = routeKey;
    await saveVideoWorkbench(scriptId, projectId, { trackPlans: { [String(trackId)]: plan } });
  }
  return true;
}

export async function resolveTrackContext(trackId: number): Promise<TrackContext | null> {
  const track = await u.db("o_videoTrack").where("id", trackId).first();
  if (!track?.id || !track.projectId || !track.scriptId) return null;

  const medias = await autoPersistTrackMedias(trackId);
  const refSlots = buildRefSlots(enrichMediasWithResolved(medias));
  const { videoModel, mode, modelData } = await getProjectVideoConfig(track.projectId);
  const currentRoute = resolveVideoPromptRoute(modelData, mode);
  const wb = await loadVideoWorkbench(track.scriptId, track.projectId);
  const trackPlan = wb.trackPlans[String(trackId)];
  const activeRouteKey = trackPlan?.activeRoute || wb.defaultRoute || currentRoute.modeLabel;
  const inputHash = await computeInputHash(trackId, activeRouteKey, mode);

  const promptMeta = parsePromptSourceTag(track.promptSource ?? "");
  const savedRefs = Number(promptMeta.refs || 0);
  const promptStale = Boolean(
    track.prompt &&
      ((promptMeta.mode && promptMeta.mode !== String(mode)) ||
        (promptMeta.route && promptMeta.route !== currentRoute.modeLabel) ||
        (savedRefs && savedRefs !== refSlots.length) ||
        (trackPlan?.inputHash && trackPlan.inputHash !== inputHash)),
  );

  const promptPresets: TrackContext["promptPresets"] = {};
  for (const routeKey of wb.routes.length ? wb.routes : [currentRoute.modeLabel]) {
    const cached = trackPlan?.prompts[routeKey];
    promptPresets[routeKey] = { ready: Boolean(cached?.prompt), generatedAt: cached?.generatedAt };
  }

  const episodePlan = await loadEpisodePlan(track.scriptId, track.projectId);

  return {
    trackId,
    projectId: track.projectId,
    scriptId: track.scriptId,
    prompt: track.prompt || "",
    promptSource: track.promptSource || "",
    medias,
    refSlots,
    currentRoute,
    activeRouteKey,
    promptPresets,
    promptStale,
    inputHash,
    episodePlan,
  };
}

export type PresetEpisodeResult = {
  success: boolean;
  message: string;
  trackCount: number;
  promptCount: number;
  skippedCount: number;
};

export async function presetEpisodeVideo(opts: {
  projectId: number;
  scriptId: number;
  routes?: RoutePreset[];
  respectImport?: boolean;
}): Promise<PresetEpisodeResult> {
  const { projectId, scriptId, respectImport = true } = opts;
  const { videoModel, mode } = await getProjectVideoConfig(projectId);
  const supportedRoutes = opts.routes ?? (await getProjectSupportedRoutes(projectId));
  const defaultRoute = supportedRoutes[0]?.routeKey ?? resolveVideoPromptRoute(videoModel.split(/:(.+)/)[1] ?? "", mode).modeLabel;

  await saveVideoWorkbench(scriptId, projectId, {
    presetStatus: "running",
    defaultRoute,
    routes: supportedRoutes.map((r) => r.routeKey),
  });

  try {
    const tracks = await u.db("o_videoTrack").where({ projectId, scriptId }).orderBy("index", "asc").select("id");
    let promptCount = 0;
    let skippedCount = 0;

    const trackPlans: Record<string, TrackPlan> = {};

    for (const t of tracks) {
      const trackId = t.id!;
      await autoPersistTrackMedias(trackId);
      const medias = await buildDefaultMedias(trackId);
      const mediasHash = hashMedias(medias);
      const plan: TrackPlan = { mediasHash, inputHash: "", prompts: {}, activeRoute: defaultRoute };
      trackPlans[String(trackId)] = plan;

      for (const route of supportedRoutes) {
        try {
          const result = await generateTrackPrompt(trackId, {
            projectId,
            model: videoModel,
            mode: route.mode,
            routeKey: route.routeKey,
            respectImport,
          });
          if (result.skipped) {
            skippedCount++;
            plan.prompts[route.routeKey] = {
              prompt: result.prompt,
              promptSource: result.promptSource,
              generatedAt: Date.now(),
              inputHash: result.inputHash,
            };
          } else {
            plan.prompts[route.routeKey] = {
              prompt: result.prompt,
              promptSource: buildPromptSourceTag(videoModel, route.mode, result.prompt, (await loadTrackRefSlots(trackId)).length),
              generatedAt: Date.now(),
              inputHash: result.inputHash,
            };
            promptCount++;
          }
        } catch (e) {
          console.warn(`[trackVideoService] preset track ${trackId} route ${route.routeKey} failed:`, u.error(e).message);
        }
      }

      plan.inputHash = (await computeInputHash(trackId, defaultRoute, mode)) ?? "";
      const defaultCached = plan.prompts[defaultRoute];
      if (defaultCached) {
        await u.db("o_videoTrack").where("id", trackId).update({
          prompt: defaultCached.prompt,
          promptSource: defaultCached.promptSource,
          state: "已完成",
        });
      }
    }

    await saveVideoWorkbench(scriptId, projectId, {
      presetStatus: "done",
      defaultRoute,
      routes: supportedRoutes.map((r) => r.routeKey),
      trackPlans,
      presetMessage: `已预设 ${tracks.length} 轨、${promptCount} 条提示词`,
    });

    return {
      success: true,
      message: `单集预设完成：${tracks.length} 轨，生成 ${promptCount} 条，跳过 ${skippedCount} 条`,
      trackCount: tracks.length,
      promptCount,
      skippedCount,
    };
  } catch (e) {
    const msg = u.error(e).message;
    await saveVideoWorkbench(scriptId, projectId, {
      presetStatus: "failed",
      presetMessage: msg,
    });
    throw e;
  }
}

/** 若各轨已有提示词则跳过预设，避免工作台长期卡在 running/pending */
export async function reconcileEpisodePresetStatus(projectId: number, scriptId: number): Promise<VideoWorkbenchState> {
  const wb = await loadVideoWorkbench(scriptId, projectId);
  if (wb.presetStatus === "done") return wb;

  const tracks = await u.db("o_videoTrack").where({ projectId, scriptId }).select("prompt");
  if (tracks.length && tracks.every((t) => String(t.prompt || "").trim())) {
    await saveVideoWorkbench(scriptId, projectId, {
      presetStatus: "done",
      presetMessage: "各轨已有提示词，跳过单集预设",
    });
    return { ...wb, presetStatus: "done", presetMessage: "各轨已有提示词，跳过单集预设" };
  }
  return wb;
}

export async function switchTrackRoute(trackId: number, routeKey: string): Promise<{ ok: boolean; prompt?: string; message: string }> {
  const track = await u.db("o_videoTrack").where("id", trackId).select("scriptId", "projectId").first();
  if (!track?.scriptId || !track?.projectId) return { ok: false, message: "轨道不存在" };

  const activated = await activateRoutePrompt(trackId, routeKey, track.scriptId, track.projectId);
  if (activated) {
    const row = await u.db("o_videoTrack").where("id", trackId).select("prompt").first();
    return { ok: true, prompt: row?.prompt, message: "已切换至缓存提示词" };
  }
  return { ok: false, message: "该模态暂无缓存提示词，请先生成" };
}
