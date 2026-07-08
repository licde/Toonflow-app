import u from "@/utils";
import { DramaPack, DramaPackSchema, parseLockCode } from "./schema";
import { normalizeDramaPack } from "./normalizeDramaPack";
import { validateDramaPack, ValidationIssue, extractPackExtensions } from "./validate";
import {
  buildCodeIndexFromPack,
  composePackAssets,
  composeStoryboardShot,
  matchTrackVideoPrompt,
  ComposedShot,
  suggestImageQuality,
  parsePackExtensions,
} from "./promptComposer";
import { extractShotMeta } from "./productionRuleEngine";
import { reconcileOrphanAssets } from "./assetReconcile";
import { resolveProjectId, buildProjectNotFoundMessage } from "./resolveProjectId";
import { autoPersistTrackMedias } from "./trackVideoService";
import type { PackDomainHashes } from "./packDerivation";
import { isEmotionStageName } from "./tieredAssetPolicy";
import {
  collectUsedT1LockCodesFromPack,
  filterComposedAssetsByUsedT1,
} from "./assetLockCodeUtils";

export type ImportOptions = {
  projectId: number;
  /** @deprecated 使用 mergePlanOnly；false=替换同集分镜 */
  merge?: boolean;
  /** 仅合并 scriptAgent 策划数据，不导入分镜 */
  mergePlanOnly?: boolean;
  skipValidation?: boolean;
  /** 未知 assetCode 降级为 warning */
  soft?: boolean;
  reconcileAssets?: boolean;
  packContentHash?: string;
  packDomainHashes?: PackDomainHashes;
  /** 默认 true：按 index 保留已生成分镜图 */
  preserveStoryboardImages?: boolean;
  /** 全量删除重建分镜（丢失已生成图） */
  replaceStoryboards?: boolean;
  /** 删除 pack 中不存在的多余分镜 */
  pruneStoryboards?: boolean;
  /** 仅创建本集 storyboard 实际用到的 T1 服化资产 */
  t1StagesFromStoryboard?: boolean;
};

export type ImportResult = {
  success: boolean;
  scriptIds: number[];
  assetCodeMap: Record<string, number>;
  storyboardCount: number;
  issues: ValidationIssue[];
  message: string;
  suggestedImageQuality?: string;
  reconciledAssets?: number;
};

async function upsertScriptAgentPlan(
  projectId: number,
  pack: DramaPack,
  merge: boolean,
  packInput?: unknown,
  extra?: { packContentHash?: string; packDomainHashes?: PackDomainHashes },
) {
  const row = await u.db("o_agentWorkData").where({ projectId, key: "scriptAgent" }).first();
  const existing = row?.data ? JSON.parse(row.data) : {};
  const packExtensions = packInput ? extractPackExtensions(packInput) : {};
  const rawInput = packInput as Record<string, unknown> | undefined;
  const characterAssets = rawInput?.characterAssets;
  const continuityTracking = rawInput?.continuityTracking;

  const planData = merge
    ? {
        ...existing,
        storySkeleton: pack.plan.storySkeleton || existing.storySkeleton || "",
        adaptationStrategy: pack.plan.adaptationStrategy || existing.adaptationStrategy || "",
        stylePosition: pack.plan.stylePosition || existing.stylePosition || "",
        adaptationMatrix: pack.plan.adaptationMatrix || existing.adaptationMatrix || "",
        characterBible: pack.plan.characterBible || existing.characterBible || "",
        dialogueStyleAnchor: pack.plan.dialogueStyleAnchor || existing.dialogueStyleAnchor || "",
        visualLockGlobal: pack.plan.visualLock?.globalStyle
          ? JSON.stringify(pack.plan.visualLock.globalStyle)
          : existing.visualLockGlobal || "",
        productionSpec: pack.productionSpec ? JSON.stringify(pack.productionSpec) : existing.productionSpec || "",
        artStyleHint: pack.meta.artStyleHint || existing.artStyleHint || "",
        visualLock: pack.plan.visualLock ? JSON.stringify(pack.plan.visualLock) : existing.visualLock || "",
        packExtensions: { ...(existing.packExtensions ?? {}), ...packExtensions },
        characterAssets: characterAssets ?? existing.characterAssets,
        continuityTracking: continuityTracking ?? existing.continuityTracking,
        packContentHash: extra?.packContentHash ?? existing.packContentHash,
        packDomainHashes: extra?.packDomainHashes ?? existing.packDomainHashes,
        versionTracking: rawInput?.versionTracking ?? existing.versionTracking,
        deliveryReport: rawInput?.["交付报告"] ?? existing.deliveryReport,
      }
    : {
        storySkeleton: pack.plan.storySkeleton || "",
        adaptationStrategy: pack.plan.adaptationStrategy || "",
        stylePosition: pack.plan.stylePosition || "",
        adaptationMatrix: pack.plan.adaptationMatrix || "",
        characterBible: pack.plan.characterBible || "",
        dialogueStyleAnchor: pack.plan.dialogueStyleAnchor || "",
        visualLockGlobal: pack.plan.visualLock?.globalStyle ? JSON.stringify(pack.plan.visualLock.globalStyle) : "",
        productionSpec: pack.productionSpec ? JSON.stringify(pack.productionSpec) : "",
        artStyleHint: pack.meta.artStyleHint || "",
        visualLock: pack.plan.visualLock ? JSON.stringify(pack.plan.visualLock) : "",
        packExtensions,
        characterAssets,
        continuityTracking,
        packContentHash: extra?.packContentHash,
        packDomainHashes: extra?.packDomainHashes,
        versionTracking: rawInput?.versionTracking,
        deliveryReport: rawInput?.["交付报告"],
      };

  if (row) {
    await u.db("o_agentWorkData").where({ id: row.id }).update({ data: JSON.stringify(planData), updateTime: Date.now() });
  } else {
    await u.db("o_agentWorkData").insert({
      id: Date.now(),
      projectId,
      key: "scriptAgent",
      data: JSON.stringify(planData),
      createTime: Date.now(),
      updateTime: Date.now(),
    });
  }
}

async function upsertVisualLockAssets(
  projectId: number,
  pack: DramaPack,
  artStyle: string,
  packInput?: unknown,
  t1StagesFromStoryboard = false,
): Promise<Record<string, number>> {
  const codeMap: Record<string, number> = {};
  const existing = await u.db("o_assets").where({ projectId }).select("id", "remark", "promptSource");
  for (const a of existing) {
    const code = parseLockCode(a.remark);
    if (code) codeMap[code] = a.id!;
  }

  const extensions = parsePackExtensions(packInput ?? pack);
  let composed = await composePackAssets(pack, artStyle, extensions);
  if (t1StagesFromStoryboard) {
    const usedT1 = collectUsedT1LockCodesFromPack(pack);
    composed = filterComposedAssetsByUsedT1(composed, usedT1);
  }
  for (const asset of composed) {
    if (asset.code.includes(":")) {
      const stageName = asset.code.split(":")[1];
      if (isEmotionStageName(stageName)) continue;
    }

    const updatePayload = {
      name: asset.name,
      type: asset.type,
      describe: asset.describe,
      prompt: asset.prompt,
      remark: asset.remark,
      promptSource: asset.promptSource,
      promptState: "已完成",
    };

    if (codeMap[asset.code]) {
      const row = existing.find((e) => e.id === codeMap[asset.code]);
      if (row?.promptSource === "manual") continue;
      await u.db("o_assets").where("id", codeMap[asset.code]).update(updatePayload);
      continue;
    }

    const id = Date.now() * 1000 + Math.floor(Math.random() * 999);
    await u.db("o_assets").insert({ id, projectId, ...updatePayload });
    codeMap[asset.code] = id;
  }
  return codeMap;
}

function resolveAssetIds(codes: string[], codeMap: Record<string, number>): number[] {
  const refOrder = ["CHAR-LZH", "CHAR-XC"];
  const sorted = [...codes].sort((a, b) => {
    const baseA = a.split(":")[0];
    const baseB = b.split(":")[0];
    const ia = refOrder.indexOf(baseA);
    const ib = refOrder.indexOf(baseB);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return 0;
  });
  const ids: number[] = [];
  for (const code of sorted) {
    if (codeMap[code]) ids.push(codeMap[code]);
  }
  return [...new Set(ids)];
}

/** 批量导入时生成全局唯一 ID（避免 o_storyboard.id UNIQUE 冲突） */
function batchUniqueIds(count: number, slot = 1): number[] {
  const base = Date.now() * 1000 + slot * 100000;
  return Array.from({ length: count }, (_, i) => base + i);
}

async function replaceEpisodeStoryboards(scriptId: number): Promise<void> {
  const oldBoards = await u.db("o_storyboard").where("scriptId", scriptId).select("id");
  if (oldBoards.length) {
    const oldIds = oldBoards.map((b) => b.id);
    await u.db("o_image").whereIn("storyboardId", oldIds as number[]).delete();
    await u.db("o_assets2Storyboard").whereIn("storyboardId", oldIds).delete();
    await u.db("o_storyboard").where("scriptId", scriptId).delete();
    await u.db("o_videoTrack").where("scriptId", scriptId).delete();
  }
}

type StoryboardUpsertOptions = {
  replaceStoryboards?: boolean;
  preserveStoryboardImages?: boolean;
  pruneStoryboards?: boolean;
};

async function prepareEpisodeStoryboards(scriptId: number, options: StoryboardUpsertOptions): Promise<Map<number, { id: number; filePath?: string; imageId?: number; state?: string }>> {
  const preserve = options.preserveStoryboardImages !== false && !options.replaceStoryboards;
  const existingByIndex = new Map<number, { id: number; filePath?: string; imageId?: number; state?: string }>();

  if (options.replaceStoryboards) {
    await replaceEpisodeStoryboards(scriptId);
    return existingByIndex;
  }

  if (!preserve) {
    await replaceEpisodeStoryboards(scriptId);
    return existingByIndex;
  }

  const rows = await u.db("o_storyboard").where({ scriptId }).select("id", "index", "filePath", "imageId", "state");
  for (const row of rows) {
    existingByIndex.set(row.index ?? 0, {
      id: row.id!,
      filePath: row.filePath ?? undefined,
      imageId: row.imageId ?? undefined,
      state: row.state ?? undefined,
    });
  }
  return existingByIndex;
}

async function upsertEpisode(
  projectId: number,
  episode: DramaPack["episodes"][0],
  pack: DramaPack,
  codeMap: Record<string, number>,
  artStyle: string,
  packInput?: unknown,
  soft = false,
  sbOptions: StoryboardUpsertOptions = {},
): Promise<{ scriptId: number; storyboardCount: number }> {
  let scriptRow = await u.db("o_script").where({ projectId, name: episode.name }).first();
  if (scriptRow) {
    await u.db("o_script").where("id", scriptRow.id).update({ content: episode.script });
  } else {
    const scriptId = Date.now() * 1000 + Math.floor(Math.random() * 999);
    await u.db("o_script").insert({ id: scriptId, projectId, name: episode.name, content: episode.script, createTime: Date.now() });
    scriptRow = { id: scriptId };
  }
  const scriptId = scriptRow.id!;

  const existingByIndex = await prepareEpisodeStoryboards(scriptId, sbOptions);
  const preserve = sbOptions.preserveStoryboardImages !== false && !sbOptions.replaceStoryboards;

  const codeIndex = buildCodeIndexFromPack(pack);
  const extensions = parsePackExtensions(packInput ?? pack);

  const allAssociateCodes = new Set<string>();
  const composedShots: ComposedShot[] = [];
  let prevIntensity: number | undefined;
  for (let i = 0; i < episode.storyboard.length; i++) {
    const composed = await composeStoryboardShot(
      episode.storyboard[i],
      pack,
      artStyle,
      codeIndex,
      i,
      prevIntensity,
      extensions,
    );
    composedShots.push(composed);
    composed.associateCodes.forEach((c) => allAssociateCodes.add(c));
    prevIntensity = episode.storyboard[i].emotionIntensity;
  }

  const assetIds = resolveAssetIds([...allAssociateCodes], codeMap);
  if (assetIds.length) {
    const linked = await u.db("o_scriptAssets").where("scriptId", scriptId).pluck("assetId");
    const toLink = assetIds.filter((id) => !linked.includes(id));
    if (toLink.length) await u.db("o_scriptAssets").insert(toLink.map((assetId) => ({ scriptId, assetId })));
  }

  const trackGroups: Record<string, { ids: number[]; duration: number; shots: ComposedShot[] }> = {};
  const flowStoryboard: unknown[] = [];
  let storyboardCount = 0;

  const shotIds = batchUniqueIds(episode.storyboard.length, 1);
  const estimatedTracks = new Set(composedShots.map((s) => s.track)).size || 1;
  const trackIdBase = batchUniqueIds(estimatedTracks, 2)[0];

  if (preserve && sbOptions.pruneStoryboards) {
    const toPrune = await u
      .db("o_storyboard")
      .where({ scriptId })
      .where("index", ">=", episode.storyboard.length)
      .select("id");
    if (toPrune.length) {
      await u.db("o_assets2Storyboard").whereIn("storyboardId", toPrune.map((b) => b.id)).delete();
      await u.db("o_storyboard").whereIn("id", toPrune.map((b) => b.id)).delete();
    }
  }

  for (let i = 0; i < episode.storyboard.length; i++) {
    const shot = episode.storyboard[i];
    const composed = composedShots[i];
    const preserved = existingByIndex.get(i);
    const sbId = preserved?.id ?? shotIds[i];

    const shotMeta = extractShotMeta(shot);
    if (composed.postProductionHints) {
      shotMeta.postProductionHints = composed.postProductionHints;
    }

    const sbPayload = {
      prompt: composed.imagePrompt,
      videoDesc: composed.videoDesc,
      videoPrompt: composed.videoPrompt || "",
      duration: String(composed.duration),
      track: composed.track,
      shouldGenerateImage: composed.shouldGenerateImage,
      promptSource: composed.promptSource,
      shotMeta: JSON.stringify(shotMeta),
      index: i,
    };

    if (preserved) {
      await u.db("o_storyboard").where("id", sbId).update(sbPayload);
    } else {
      await u.db("o_storyboard").insert({
        id: sbId,
        projectId,
        scriptId,
        ...sbPayload,
        state: "未生成",
        createTime: Date.now(),
      });
    }
    storyboardCount++;

    await u.db("o_assets2Storyboard").where("storyboardId", sbId).delete();
    const associateIds = resolveAssetIds(composed.associateCodes, codeMap);
    if (associateIds.length) {
      await u.db("o_assets2Storyboard").insert(associateIds.map((assetId) => ({ storyboardId: sbId, assetId })));
    } else if (soft) {
      /* soft */
    }

    if (!trackGroups[composed.track]) trackGroups[composed.track] = { ids: [], duration: 0, shots: [] };
    trackGroups[composed.track].ids.push(sbId);
    trackGroups[composed.track].duration += composed.duration;
    trackGroups[composed.track].shots.push(composed);

    flowStoryboard.push({
      id: sbId,
      duration: composed.duration,
      prompt: composed.imagePrompt,
      videoDesc: composed.videoDesc,
      videoPrompt: composed.videoPrompt,
      associateAssetsIds: associateIds,
      src: preserved?.filePath ?? null,
      index: i,
      shouldGenerateImage: composed.shouldGenerateImage,
      promptSource: composed.promptSource,
      shotMeta,
    });
  }

  if (!preserve || sbOptions.replaceStoryboards) {
    await u.db("o_videoTrack").where("scriptId", scriptId).delete();
  }

  const existingTracks = preserve
    ? await u.db("o_videoTrack").where({ scriptId }).orderBy("index", "asc").select("id", "prompt", "promptSource")
    : [];
  const trackNameToId = new Map<string, number>();
  let trackIdx = 0;
  for (const trackKey of Object.keys(trackGroups)) {
    const group = trackGroups[trackKey];
    const trackVideoPrompt = matchTrackVideoPrompt(trackKey, group.shots, episode.keyPrompts);
    let trackId: number;
    if (preserve && existingTracks[trackIdx]) {
      trackId = existingTracks[trackIdx].id!;
      await u.db("o_videoTrack").where("id", trackId).update({
        duration: group.duration,
        prompt: trackVideoPrompt || existingTracks[trackIdx].prompt,
        promptSource: trackVideoPrompt ? "import" : existingTracks[trackIdx].promptSource,
        state: trackVideoPrompt || existingTracks[trackIdx].prompt ? "已完成" : "未生成",
        index: trackIdx,
      });
    } else {
      trackId = trackIdBase + trackIdx;
      await u.db("o_videoTrack").insert({
        id: trackId,
        scriptId,
        projectId,
        duration: group.duration,
        prompt: trackVideoPrompt,
        promptSource: trackVideoPrompt ? "import" : "",
        state: trackVideoPrompt ? "已完成" : "未生成",
        index: trackIdx,
      });
    }
    trackNameToId.set(trackKey, trackId);
    await u.db("o_storyboard").whereIn("id", group.ids).update({ trackId });
    trackIdx++;
  }

  for (const trackId of trackNameToId.values()) {
    await autoPersistTrackMedias(trackId);
  }

  const flowData = {
    script: episode.script,
    scriptPlan: [episode.emotionBeats, episode.directorNotes].filter(Boolean).join("\n\n---\n\n"),
    assets: [],
    storyboardTable: episode.storyboard
      .map((s, idx) => `| ${idx + 1} | ${s.time || ""} | ${s.shotType || ""} | ${s.content || ""} | ${s.sound || ""} | ${s.dialogue || ""} | ${s.visualId || ""} |`)
      .join("\n"),
    storyboard: flowStoryboard,
    emotionBeats: episode.emotionBeats,
    dialogueValidation: episode.dialogueValidation,
    directorNotes: episode.directorNotes,
    rhythmReview: episode.rhythmReview,
    sensoryReview: episode.sensoryReview,
    keyPrompts: episode.keyPrompts,
    continuityLock: pack.productionSpec?.continuityLock ?? null,
    continuityTracking: extensions.continuityTracking ?? null,
  };

  const prodRow = await u.db("o_agentWorkData").where({ projectId, episodesId: scriptId, key: "productionAgent" }).first();
  if (prodRow) {
    await u.db("o_agentWorkData").where("id", prodRow.id).update({ data: JSON.stringify(flowData), updateTime: Date.now() });
  } else {
    await u.db("o_agentWorkData").insert({
      id: Date.now() + Math.floor(Math.random() * 10000),
      projectId,
      episodesId: scriptId,
      key: "productionAgent",
      data: JSON.stringify(flowData),
      createTime: Date.now(),
      updateTime: Date.now(),
    });
  }

  const validSbIds = await u.db("o_storyboard").where({ scriptId }).pluck("id");
  if (validSbIds.length) {
    await u.db("o_image").whereNotNull("storyboardId").whereNotIn("storyboardId", validSbIds as number[]).delete();
  } else {
    await u.db("o_image").where("storyboardId", ">", 0).delete();
  }

  return { scriptId, storyboardCount };
}

export async function importDramaPack(packInput: unknown, options: ImportOptions): Promise<ImportResult> {
  const validation = validateDramaPack(packInput, { includePack: true });
  let issues = [...validation.issues];

  if (options.soft) {
    issues = issues.map((i) =>
      i.code === "UNKNOWN_ASSET_CODE" ? { ...i, level: "warning" as const, message: `[soft] ${i.message}` } : i,
    );
  }

  const hasErrors = issues.some((i) => i.level === "error");
  if (!options.skipValidation && !validation.valid && hasErrors) {
    return {
      success: false,
      scriptIds: [],
      assetCodeMap: {},
      storyboardCount: 0,
      issues,
      message: "导入包校验未通过",
    };
  }

  const pack = validation.pack ?? (DramaPackSchema.parse(normalizeDramaPack(packInput)) as DramaPack);
  const { projectId: inputProjectId, mergePlanOnly = false, merge = false } = options;
  const planMerge = mergePlanOnly || merge;

  const resolved = await resolveProjectId(inputProjectId);
  if (!resolved) {
    const hint = await buildProjectNotFoundMessage(inputProjectId);
    return {
      success: false,
      scriptIds: [],
      assetCodeMap: {},
      storyboardCount: 0,
      issues: [{ level: "error", code: "PROJECT_NOT_FOUND", message: hint }],
      message: hint,
    };
  }

  const projectId = resolved.projectId;
  const resolveIssues: ValidationIssue[] = [];
  if (resolved.resolvedFrom === "script") {
    resolveIssues.push({
      level: "info",
      code: "RESOLVED_SCRIPT_TO_PROJECT",
      message: `输入 scriptId=${resolved.inputId}（${resolved.scriptName}）→ 使用 projectId=${projectId}`,
    });
  }

  const project = await u.db("o_project").where("id", projectId).first();
  if (!project) {
    const hint = await buildProjectNotFoundMessage(inputProjectId);
    return {
      success: false,
      scriptIds: [],
      assetCodeMap: {},
      storyboardCount: 0,
      issues: [{ level: "error", code: "PROJECT_NOT_FOUND", message: hint }],
      message: hint,
    };
  }

  const artStyle = project.artStyle || pack.meta.artStyleHint || "";

  await upsertScriptAgentPlan(projectId, pack, planMerge, packInput, {
    packContentHash: options.packContentHash,
    packDomainHashes: options.packDomainHashes,
  });
  const assetCodeMap = await upsertVisualLockAssets(
    projectId,
    pack,
    artStyle,
    packInput,
    options.t1StagesFromStoryboard ?? false,
  );

  let reconciledAssets = 0;
  if (options.reconcileAssets) {
    reconciledAssets = await reconcileOrphanAssets(projectId, pack, packInput);
  }

  const scriptIds: number[] = [];
  let storyboardCount = 0;

  if (!mergePlanOnly) {
    for (const episode of pack.episodes) {
      const r = await upsertEpisode(projectId, episode, pack, assetCodeMap, artStyle, packInput, options.soft, {
        preserveStoryboardImages: options.preserveStoryboardImages,
        replaceStoryboards: options.replaceStoryboards,
        pruneStoryboards: options.pruneStoryboards,
      });
      scriptIds.push(r.scriptId);
      storyboardCount += r.storyboardCount;
    }
  }

  const suggestedImageQuality = suggestImageQuality(pack.productionSpec);

  return {
    success: true,
    scriptIds,
    assetCodeMap,
    storyboardCount,
    issues: [...resolveIssues, ...issues.filter((i) => i.level === "warning" || i.level === "info")],
    suggestedImageQuality,
    reconciledAssets,
    message: mergePlanOnly
      ? `已合并策划数据与 ${Object.keys(assetCodeMap).length} 个资产（未替换分镜）`
      : `成功导入 ${pack.episodes.length} 集、${Object.keys(assetCodeMap).length} 个资产、${storyboardCount} 条分镜（建议画质 ${suggestedImageQuality}）`,
  };
}
