import u from "@/utils";
import { DramaPack, DramaPackStoryboardShot, parseLockCode } from "./schema";
import { buildCodeIndexFromPack, ComposedShot, composePackAssets, parsePackExtensions } from "./promptComposer";
import { visualLockFromProductionSpec } from "./productionSpecAdapter";
import { expandProjectVideoTracks } from "./expandVideoTrackPrompts";
import {
  applyProductionRules,
  extractShotMeta,
  shotMetaToStoryboardShot,
  ComposeMode,
  ShotMeta,
} from "./productionRuleEngine";

export type RecomposeOptions = {
  projectId: number;
  scriptId: number;
  mode?: ComposeMode;
};

export type RecomposeResult = {
  success: boolean;
  updatedCount: number;
  message: string;
  details?: string[];
};

function parseProductionSpec(raw: string | undefined): DramaPack["productionSpec"] | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function buildPackFromContext(
  productionSpec: DramaPack["productionSpec"],
  artStyleHint?: string,
  visualLockJson?: string,
): DramaPack {
  let visualLock = visualLockJson
    ? (JSON.parse(visualLockJson) as DramaPack["plan"]["visualLock"])
    : visualLockFromProductionSpec(productionSpec as Parameters<typeof visualLockFromProductionSpec>[0], { tone: artStyleHint });
  return {
    version: "1.2",
    meta: { title: "", artStyleHint },
    plan: { visualLock },
    productionSpec,
    episodes: [{ name: "", script: "x", storyboard: [] }],
  } as DramaPack;
}

export async function recomposeScriptStoryboards(options: RecomposeOptions): Promise<RecomposeResult> {
  const { projectId, scriptId, mode = "merge" } = options;

  const project = await u.db("o_project").where("id", projectId).first();
  if (!project) {
    return { success: false, updatedCount: 0, message: `项目 ${projectId} 不存在` };
  }

  const agentRow = await u.db("o_agentWorkData").where({ projectId, key: "scriptAgent" }).first();
  const agentData = agentRow?.data ? JSON.parse(agentRow.data) : {};
  const productionSpec = parseProductionSpec(agentData.productionSpec);
  if (!productionSpec) {
    return { success: false, updatedCount: 0, message: "项目未保存 productionSpec，请先导入 drama-pack" };
  }

  const storyboards = await u
    .db("o_storyboard")
    .where({ projectId, scriptId })
    .orderBy("index", "asc")
    .select("id", "index", "duration", "shotMeta", "promptSource");

  if (!storyboards.length) {
    return { success: false, updatedCount: 0, message: "未找到分镜数据" };
  }

  const artStyle = project.artStyle || agentData.artStyleHint || "";
  const extensions = parsePackExtensions(agentData);
  const pack = buildPackFromContext(productionSpec, artStyle, agentData.visualLock);
  const codeIndex = buildCodeIndexFromPack(pack);

  let updatedCount = 0;
  let prevIntensity: number | undefined;

  for (const row of storyboards) {
    let meta: ShotMeta = {};
    if (row.shotMeta) {
      try {
        meta = JSON.parse(row.shotMeta);
      } catch {
        meta = {};
      }
    }

    if (row.promptSource === "manual" || row.promptSource === "ai") {
      if (meta.emotionIntensity != null) prevIntensity = meta.emotionIntensity;
      continue;
    }

    const shot = shotMetaToStoryboardShot(meta, {
      duration: Number(row.duration) || meta.duration || 3,
    });

    const composed = await applyProductionRules(
      shot,
      pack,
      artStyle,
      codeIndex,
      row.index ?? 0,
      mode,
      prevIntensity,
      extensions,
    );
    prevIntensity = shot.emotionIntensity;

    await u.db("o_storyboard").where("id", row.id).update({
      prompt: composed.imagePrompt,
      videoDesc: composed.videoDesc,
      videoPrompt: composed.videoPrompt || "",
      promptSource: row.promptSource === "import" ? "import" : row.promptSource,
      shotMeta: JSON.stringify({
        ...meta,
        postProductionHints: (composed as ComposedShot).postProductionHints ?? meta.postProductionHints,
      }),
    });
    updatedCount++;
  }

  let videoExpandNote = "";
  if (updatedCount > 0) {
    const expand = await expandProjectVideoTracks({ projectId, scriptId, respectImport: false });
    if (expand.updatedCount > 0) {
      videoExpandNote = `；videoTrack 扩写 ${expand.updatedCount} 条`;
    }
  }

  return {
    success: true,
    updatedCount,
    message: `已刷新 ${updatedCount} 条分镜 prompt/videoDesc（mode=${mode}）${videoExpandNote}`,
  };
}

/** 从 visualLock 重刷项目内 lockCode 资产生图提示词（默认跳过 promptSource=manual） */
export async function recomposeProjectAssets(projectId: number, force = false): Promise<RecomposeResult> {
  const project = await u.db("o_project").where("id", projectId).first();
  if (!project) {
    return { success: false, updatedCount: 0, message: `项目 ${projectId} 不存在` };
  }

  const agentRow = await u.db("o_agentWorkData").where({ projectId, key: "scriptAgent" }).first();
  const agentData = agentRow?.data ? JSON.parse(agentRow.data) : {};
  const productionSpec = parseProductionSpec(agentData.productionSpec);
  if (!productionSpec && !agentData.visualLock) {
    return { success: false, updatedCount: 0, message: "项目未保存 productionSpec / visualLock，请先导入 drama-pack" };
  }

  const artStyle = project.artStyle || agentData.artStyleHint || "";
  const extensions = parsePackExtensions(agentData);
  const pack = buildPackFromContext(productionSpec, artStyle, agentData.visualLock);
  const composed = await composePackAssets(pack, artStyle, extensions);
  const codeToId: Record<string, number> = {};
  const existing = await u.db("o_assets").where({ projectId }).select("id", "remark", "promptSource");
  for (const row of existing) {
    const code = parseLockCode(row.remark);
    if (code) codeToId[code] = row.id!;
  }

  let updatedCount = 0;
  for (const asset of composed) {
    const assetId = codeToId[asset.code];
    if (!assetId) continue;
    const row = existing.find((r) => r.id === assetId);
    if (!force && row?.promptSource === "manual") continue;
    if (!force && row?.promptSource === "ai") continue;
    await u.db("o_assets").where("id", assetId).update({
      prompt: asset.prompt,
      describe: asset.describe,
      promptSource: "import",
      promptState: "已完成",
    });
    updatedCount++;
  }

  return {
    success: true,
    updatedCount,
    message: `已刷新 ${updatedCount} 条资产生图 prompt`,
  };
}

/** 重刷项目下所有剧本的分镜生图/视频提示词（从 shotMeta 还原 pack 字段后重合成） */
export async function recomposeProjectStoryboards(projectId: number, mode: ComposeMode = "merge"): Promise<RecomposeResult> {
  const scripts = await u.db("o_script").where({ projectId }).select("id", "name");
  if (!scripts.length) {
    return { success: false, updatedCount: 0, message: "项目下无剧本" };
  }

  const details: string[] = [];
  let updatedCount = 0;
  for (const script of scripts) {
    const result = await recomposeScriptStoryboards({ projectId, scriptId: script.id!, mode });
    if (result.success) {
      updatedCount += result.updatedCount;
      details.push(`${script.name || script.id}: ${result.updatedCount} 镜`);
    } else {
      details.push(`${script.name || script.id}: 跳过（${result.message}）`);
    }
  }

  return {
    success: updatedCount > 0,
    updatedCount,
    message: `已刷新 ${updatedCount} 条分镜 prompt/videoDesc（${scripts.length} 个剧本，mode=${mode}）`,
    details,
  };
}

export type RecomposeProjectOptions = {
  projectId: number;
  mode?: ComposeMode;
  storyboards?: boolean;
  assets?: boolean;
  forceAssets?: boolean;
};

/** 项目级统一清理：分镜 + 可选资产 */
export async function recomposeProjectPrompts(options: RecomposeProjectOptions): Promise<RecomposeResult> {
  const { projectId, mode = "merge", storyboards = true, assets = true, forceAssets = false } = options;
  const parts: string[] = [];
  const details: string[] = [];
  let updatedCount = 0;

  if (storyboards) {
    const sb = await recomposeProjectStoryboards(projectId, mode);
    if (!sb.success && sb.updatedCount === 0) return sb;
    updatedCount += sb.updatedCount;
    parts.push(`分镜 ${sb.updatedCount} 条`);
    if (sb.details?.length) details.push(...sb.details);
  }

  if (assets) {
    const as = await recomposeProjectAssets(projectId, forceAssets);
    if (as.success) {
      updatedCount += as.updatedCount;
      parts.push(`资产 ${as.updatedCount} 条`);
    } else if (!storyboards) {
      return as;
    } else {
      details.push(`资产：${as.message}`);
    }
  }

  return {
    success: updatedCount > 0,
    updatedCount,
    message: `已统一刷新：${parts.join("，")}（mode=${mode}）`,
    details,
  };
}

export async function recomposeShotFromDB(storyboardId: number, mode: ComposeMode = "merge"): Promise<boolean> {
  const row = await u.db("o_storyboard").where("id", storyboardId).first();
  if (!row) return false;

  const project = await u.db("o_project").where("id", row.projectId).first();
  const agentRow = await u.db("o_agentWorkData").where({ projectId: row.projectId, key: "scriptAgent" }).first();
  const agentData = agentRow?.data ? JSON.parse(agentRow.data) : {};
  const productionSpec = parseProductionSpec(agentData.productionSpec);
  if (!productionSpec) return false;

  let meta: ShotMeta = {};
  if (row.shotMeta) {
    try {
      meta = JSON.parse(row.shotMeta);
    } catch {
      meta = {};
    }
  }

  const prevRow = await u
    .db("o_storyboard")
    .where({ scriptId: row.scriptId, projectId: row.projectId })
    .where("index", "<", row.index ?? 0)
    .orderBy("index", "desc")
    .first();

  let prevIntensity: number | undefined;
  if (prevRow?.shotMeta) {
    try {
      prevIntensity = JSON.parse(prevRow.shotMeta).emotionIntensity;
    } catch {
      /* ignore */
    }
  }

  const artStyle = project?.artStyle || agentData.artStyleHint || "";
  const extensions = parsePackExtensions(agentData);
  const pack = buildPackFromContext(productionSpec, artStyle, agentData.visualLock);
  const codeIndex = buildCodeIndexFromPack(pack);
  const shot = shotMetaToStoryboardShot(meta, { duration: Number(row.duration) || 3 });
  const composed = await applyProductionRules(
    shot,
    pack,
    artStyle,
    codeIndex,
    row.index ?? 0,
    mode,
    prevIntensity,
    extensions,
  );

  await u.db("o_storyboard").where("id", storyboardId).update({
    prompt: composed.imagePrompt,
    videoDesc: composed.videoDesc,
    videoPrompt: composed.videoPrompt || "",
  });
  return true;
}

export async function loadProductionSpecForProject(projectId: number): Promise<DramaPack["productionSpec"] | undefined> {
  const agentRow = await u.db("o_agentWorkData").where({ projectId, key: "scriptAgent" }).first();
  if (!agentRow?.data) return undefined;
  const agentData = JSON.parse(agentRow.data);
  return parseProductionSpec(agentData.productionSpec);
}

export function getAiFailoverHintForProject(productionSpec?: DramaPack["productionSpec"]): string {
  const failover = productionSpec?.aiFailover as Record<string, string> | undefined;
  return failover?.Step1 || "";
}
