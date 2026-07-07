import u from "@/utils";
import { DramaPack, DramaPackSchema } from "./schema";
import { validateDramaPack, ValidationIssue } from "./validate";
import { importDramaPack, type ImportOptions } from "./importDramaPack";
import { parsePackExtensions } from "./packExtensionsResolver";
import {
  computePackContentHash,
  computePackDomainHashes,
  computeVersionTrackingHash,
  diffDomainHashes,
  domainsNeedingStoryboardRecompose,
  detectStaleFacePrompt,
  type PackDomainHashes,
} from "./packDerivation";
import { findUnmappedSpecBlocks } from "./packFieldRegistry";
import { resolveArtStyleProfile, shouldApplySpecBlock } from "./artStyleProfiles";
import { resolveProjectId, buildProjectNotFoundMessage } from "./resolveProjectId";
import { lookupLockDescription } from "./characterAssetUtils";
import { recomposeProjectPrompts, type RecomposeResult } from "./recomposeDramaPack";
import { expandProjectVideoTracks, type ExpandVideoTracksResult } from "./expandVideoTrackPrompts";
import { extractShotMeta } from "./productionRuleEngine";
import { normalizeDramaPack } from "./normalizeDramaPack";

export type SyncOptions = {
  projectId: number;
  skipValidation?: boolean;
  forceRecompose?: boolean;
  soft?: boolean;
  /** 默认 true：import 后用 videoDesc AI 扩写 track.prompt */
  expandVideoPrompts?: boolean;
  preserveStoryboardImages?: boolean;
  replaceStoryboards?: boolean;
  pruneStoryboards?: boolean;
  /** 仅创建 storyboard 实际用到的 T1 服化资产 */
  t1StagesFromStoryboard?: boolean;
};

export type SyncResult = {
  success: boolean;
  message: string;
  packContentHash: string;
  changedDomains: string[];
  staleReports: Array<{ storyboardIndex: number; domain: string; missingKeywords: string[] }>;
  coverageReport?: Record<string, string>;
  importResult?: Awaited<ReturnType<typeof importDramaPack>>;
  recomposeResult?: RecomposeResult;
  videoExpandResult?: ExpandVideoTracksResult;
  issues: ValidationIssue[];
};

export async function syncDramaPack(packInput: unknown, options: SyncOptions): Promise<SyncResult> {
  const validation = validateDramaPack(packInput, { includePack: true });
  if (!options.skipValidation && !validation.valid) {
    return {
      success: false,
      message: "sync 校验未通过",
      packContentHash: "",
      changedDomains: [],
      staleReports: [],
      issues: validation.issues,
    };
  }

  const resolved = await resolveProjectId(options.projectId);
  if (!resolved) {
    const hint = await buildProjectNotFoundMessage(options.projectId);
    return {
      success: false,
      message: hint,
      packContentHash: "",
      changedDomains: [],
      staleReports: [],
      issues: [{ level: "error", code: "PROJECT_NOT_FOUND", message: hint }],
    };
  }
  const projectId = resolved.projectId;

  const pack = validation.pack ?? (DramaPackSchema.parse(normalizeDramaPack(packInput)) as DramaPack);
  const extensions = parsePackExtensions(packInput);
  const newHash = computePackContentHash(pack, extensions);
  const newDomains = computePackDomainHashes(pack, extensions);

  const agentRow = await u.db("o_agentWorkData").where({ projectId, key: "scriptAgent" }).first();
  const agentData = agentRow?.data ? JSON.parse(agentRow.data) : {};
  const prevDomains = agentData.packDomainHashes as PackDomainHashes | undefined;
  const prevVersionHash = agentData.versionTrackingHash as string | undefined;
  const newVersionHash = computeVersionTrackingHash(packInput);
  const changedDomains = diffDomainHashes(prevDomains, newDomains);
  const versionChanged = prevVersionHash !== newVersionHash && newVersionHash !== "";

  const importResult = await importDramaPack(packInput, {
    projectId,
    mergePlanOnly: false,
    soft: options.soft ?? validation.issues.some((i) => i.code === "UNKNOWN_ASSET_CODE"),
    skipValidation: true,
    reconcileAssets: true,
    packContentHash: newHash,
    packDomainHashes: newDomains,
    preserveStoryboardImages: options.preserveStoryboardImages ?? true,
    replaceStoryboards: options.replaceStoryboards ?? false,
    pruneStoryboards: options.pruneStoryboards ?? false,
    t1StagesFromStoryboard: options.t1StagesFromStoryboard ?? false,
  } satisfies ImportOptions);

  // 写入 versionTrackingHash
  if (importResult.success && newVersionHash) {
    const row = await u.db("o_agentWorkData").where({ projectId, key: "scriptAgent" }).first();
    if (row?.data) {
      const data = JSON.parse(row.data);
      data.versionTrackingHash = newVersionHash;
      await u.db("o_agentWorkData").where({ id: row.id }).update({ data: JSON.stringify(data), updateTime: Date.now() });
    }
  }

  const needStoryboardRecompose =
    options.forceRecompose ||
    !prevDomains ||
    versionChanged ||
    domainsNeedingStoryboardRecompose(changedDomains);

  let recomposeResult;
  if (importResult.success && needStoryboardRecompose) {
    recomposeResult = await recomposeProjectPrompts({
      projectId,
      mode: "merge",
      storyboards: true,
      assets:
        options.forceRecompose ||
        changedDomains.includes("faceAnchor") ||
        changedDomains.includes("stageWardrobe") ||
        changedDomains.includes("productionColor") ||
        !prevDomains,
    });
  } else if (importResult.success) {
    recomposeResult = await recomposeProjectPrompts({
      projectId,
      mode: "merge",
      storyboards: false,
      assets: true,
    });
  }

  let videoExpandResult: ExpandVideoTracksResult | undefined;
  const shouldExpandVideo = options.expandVideoPrompts !== false;
  if (importResult.success && shouldExpandVideo) {
    videoExpandResult = await expandProjectVideoTracks({ projectId, respectImport: false });
  }

  const staleReports: SyncResult["staleReports"] = [];
  const scripts = await u.db("o_script").where("projectId", projectId).select("id");
  for (const script of scripts) {
    const boards = await u
      .db("o_storyboard")
      .where({ projectId, scriptId: script.id })
      .orderBy("index", "asc")
      .select("prompt", "promptSource", "index", "shotMeta");
    for (const row of boards) {
      if (row.promptSource === "manual" || row.promptSource === "ai") continue;
      let meta: ReturnType<typeof extractShotMeta> = {};
      try {
        meta = row.shotMeta ? JSON.parse(row.shotMeta) : {};
      } catch {
        /* ignore */
      }
      const charCode = meta.assetCodes?.find((c: string) => c.startsWith("CHAR-"));
      if (!charCode || !extensions.characterAssets?.[charCode]) continue;
      const lockDesc = lookupLockDescription(extensions.characterAssets[charCode] as Record<string, unknown>);
      const stale = detectStaleFacePrompt(row.prompt || "", lockDesc, row.index ?? 0);
      if (stale) staleReports.push({ storyboardIndex: stale.storyboardIndex, domain: stale.domain, missingKeywords: stale.missingKeywords });
    }
  }

  const coverageReport = buildCoverageReport(pack, pack.meta.artStyleHint);

  if (!importResult.success) {
    return {
      success: false,
      message: importResult.message || "sync 导入失败",
      packContentHash: newHash,
      changedDomains,
      staleReports: [],
      coverageReport,
      importResult,
      issues: validation.issues,
    };
  }

  const resolveNote =
    resolved.resolvedFrom === "script"
      ? `（scriptId=${resolved.inputId}→projectId=${projectId}）`
      : "";

  return {
    success: true,
    message: `sync 完成${resolveNote} hash=${newHash.slice(0, 8)}… 变更域: ${changedDomains.join(", ") || "无"}${versionChanged ? " versionTracking变更" : ""} stale=${staleReports.length}`,
    packContentHash: newHash,
    changedDomains,
    staleReports,
    coverageReport,
    importResult,
    recomposeResult,
    videoExpandResult,
    issues: validation.issues,
  };
}

export function buildCoverageReport(pack: DramaPack, artStyleHint?: string): Record<string, string> {
  const spec = pack.productionSpec ?? {};
  const appliedInEngine = [
    "colorToneMapping",
    "transitionRules",
    "dialogueActionSync",
    "constraints",
    "imagePromptRules",
    "soundDesign",
    "systemUIAppearance",
    "cameraAnchor",
    "emotionPerformanceMapping",
    "performanceBaseline",
    "sceneColorLock",
    "sceneDesign",
    "propDesign",
    "bgmRules",
    "subtitleRules",
    "platformAdaption",
    "imagePromptTemplates",
  ];
  const validateOnly = [
    "outputFormatRules",
    "editingRules",
    "validation",
    "sceneGenerationRules",
    "episodeOpenRules",
    "emotionCurveDimensions",
    "characterAssetRules",
  ];
  const partialApplied = ["shotTypeRules", "productLayer", "costTiers", "aiFailover"];
  const archived: Record<string, string> = {
    versionTracking: "archived",
    "交付物清单": "archived",
    "交付报告": "archived",
    "narrative.analysis": "archived",
    continuityLock: "archived",
    productLayer: "partial",
  };
  const profile = resolveArtStyleProfile(artStyleHint);
  const profileSkipped: Record<string, string> = {};
  if (!shouldApplySpecBlock(profile, "characterAssetRules") && spec.characterAssetRules) {
    profileSkipped.characterAssetRules = "profile-skipped";
  }

  const report: Record<string, string> = { ...archived, ...profileSkipped };
  const hasEpisodeProductLayer = pack.episodes.some(
    (ep) => (ep as Record<string, unknown>).productLayer != null,
  );
  if (hasEpisodeProductLayer) {
    report.productLayer = "partial";
  }
  for (const k of appliedInEngine) {
    report[k] = spec[k as keyof typeof spec] != null ? "applied" : "missing";
  }
  for (const k of partialApplied) {
    if (k === "productLayer" && hasEpisodeProductLayer) continue;
    report[k] = spec[k as keyof typeof spec] != null ? "partial" : "missing";
  }
  for (const k of validateOnly) {
    report[k] = spec[k as keyof typeof spec] != null ? "validate-only" : "missing";
  }
  for (const block of findUnmappedSpecBlocks(pack)) {
    report[block] = "archived-unmapped";
  }
  return report;
}
