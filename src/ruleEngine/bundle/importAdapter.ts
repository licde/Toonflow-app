import type { Knex } from "knex";
import type { FlowData } from "./flowDataTypes";
import { dryRun, syncFromFlowData } from "../facade";
import { saveEpisodePackage, loadEpisodePackage } from "../storage/episodePackageStore";
import { stableHash } from "../utils/hash";
import type {
  DryRunImportSummary,
  EpisodeBundle,
  ImportOptions,
  ImportResult,
  MergeStrategy,
  ScriptBundle,
  StoryboardPanelInput,
} from "./types";
import { detectBundleType, episodeBundleSchema, normalizeLegacyFlowData, prepareBundleWithLog, scriptBundleSchema, seriesBundleSchema } from "./schema";
import { auditShapeResidualGaps } from "./shapeResidualAudit";
import type { ShapeSalvageEntry } from "./shapeSalvageTypes";
import { resolveContextFromScriptBundle } from "./resolveContext";
import { syncStoryboardToDb, loadStoryboardFromDb } from "./storyboardSync";
import { applyPreDesignPack, hasPreDesignShots } from "./preDesignPackAdapter";
import { normalizePreDesignPack, applyNormalizedShotsToBundle } from "./normalizePreDesignPack";
import { hydratePackageFromPreDesign } from "./hydratePackageFromPreDesign";
import { episodeToScriptBundle, inferTierFromBundle, runScriptBundleClosure } from "./closureSummary";
import { inspectBundle } from "../portable/inspectBundle";
import type { InspectBundleResult } from "../portable/types";
import { applySmartProposalsToBundle } from "../design/smartProposalApplier";
import type { IntValidationSummary } from "./types";
import { createAndPersistAutoDesignJob, executeAutoDesignJob, shouldUseLlm } from "./autoDesign";
import { loadProjectBlueprint, saveProjectBlueprint } from "../storage/episodePackageStore";
import { auditChatPromptGaps } from "./chatPromptAudit";
import { loadPlanData } from "./resolveContext";
import { buildZ108 } from "../packager/zPackager";
import {
  upsertScriptWithMode,
  predictScriptUpsert,
  mergePlanDataFields,
  buildMergeReport,
  buildImportPathGuard,
  isT3Bundle,
  resolveImportMergeStrategy,
} from "./importHelpers";
import {
  seedAssetsFromBundle,
  linkPanelsToAssets,
  linkSeededAssetsToScript,
  purgeOrphanStubScenes,
} from "./assetSeedFromBundle";
import { auditRuleConsistency } from "./ruleConsistencyAudit";
import { ensureAssetClosure, mergeClosureIdsIntoSeed } from "./assetClosureGate";
import { auditBundleIntegrity } from "./bundleIntegrityAudit";
import { auditAssetDesignCoverage } from "./assetVisualBrief";
import { writeContinuityFromEpisode } from "./continuityWriteback";
import { normalizeAssetCode } from "../codes/assetCodeContract";
import { getBundleAlias } from "../codes/assetCodeAlias";
import { withImportLock, ImportLockError } from "./importMutex";
import { materializePackaging } from "./packagingMaterialize";
import { assertNonEmptyEpisode } from "./emptyEpisodeGate";
import { runDesignPhaseGates } from "./designPhaseGates";
import { prepareBundleForInspect } from "./prepareBundleForInspect";
import { ExportGateBlockError, runExportGate, buildAggregatedChatRepairText } from "../exportGate";

async function loadOrCreateFlowDataRow(db: Knex, projectId: number, scriptId: number) {
  return db("o_agentWorkData").where({ projectId: String(projectId), episodesId: String(scriptId), key: "productionAgent" }).first();
}

async function saveFlowData(db: Knex, projectId: number, scriptId: number, flowData: FlowData) {
  const row = await loadOrCreateFlowDataRow(db, projectId, scriptId);
  const payload = JSON.stringify(flowData);
  if (!row) {
    await db("o_agentWorkData").insert({
      projectId,
      episodesId: scriptId,
      key: "productionAgent",
      data: payload,
      createTime: Date.now(),
    });
  } else {
    await db("o_agentWorkData").where({ id: row.id }).update({ data: payload, updateTime: Date.now() });
  }
}

async function mergeFlowData(
  existing: Partial<FlowData>,
  incoming: Partial<FlowData>,
  strategy: MergeStrategy,
): Promise<FlowData> {
  if (strategy === "replaceAll") {
    return {
      script: incoming.script ?? existing.script ?? "",
      scriptPlan: incoming.scriptPlan ?? "",
      storyboardTable: incoming.storyboardTable ?? "",
      assets: incoming.assets ?? existing.assets ?? [],
      storyboard: (incoming.storyboard as FlowData["storyboard"]) ?? [],
      workbench: incoming.workbench ?? existing.workbench ?? { videoList: [] },
    };
  }
  if (strategy === "mergeLayers") {
    const incomingPanels = (incoming.storyboard ?? []) as StoryboardPanelInput[];
    const existingPanels = (existing.storyboard ?? []) as StoryboardPanelInput[];
    const byFlowId = new Map<number, StoryboardPanelInput>();
    const byClientId = new Map<string, StoryboardPanelInput>();
    for (const old of existingPanels) {
      if (old.flowId) byFlowId.set(old.flowId, old);
      if (old.clientId) byClientId.set(old.clientId, old);
    }
    const mergedPanels =
      incomingPanels.length > 0
        ? incomingPanels.map((p, i) => {
            const old =
              (p.flowId && byFlowId.get(p.flowId)) ||
              (p.clientId && byClientId.get(p.clientId)) ||
              existingPanels[i];
            return old ? { ...old, ...p, id: old.id, flowId: old.flowId ?? p.flowId } : p;
          })
        : existingPanels;
    return {
      script: incoming.script ?? existing.script ?? "",
      scriptPlan: incoming.scriptPlan || existing.scriptPlan || "",
      storyboardTable: incoming.storyboardTable || existing.storyboardTable || "",
      assets: incoming.assets?.length ? incoming.assets : (existing.assets ?? []),
      storyboard: mergedPanels as FlowData["storyboard"],
      workbench: incoming.workbench ?? existing.workbench ?? { videoList: [] },
    };
  }
  const merged: FlowData = {
    script: incoming.script ?? existing.script ?? "",
    scriptPlan: incoming.scriptPlan ?? existing.scriptPlan ?? "",
    storyboardTable: incoming.storyboardTable ?? existing.storyboardTable ?? "",
    assets: incoming.assets?.length ? incoming.assets : (existing.assets ?? []),
    storyboard: [],
    workbench: incoming.workbench ?? existing.workbench ?? { videoList: [] },
  };
  if (strategy === "preserveMedia" && existing.storyboard?.length) {
    const incomingPanels = (incoming.storyboard ?? []) as StoryboardPanelInput[];
    const byFlowId = new Map<number, StoryboardPanelInput>();
    const byClientId = new Map<string, StoryboardPanelInput>();
    for (const old of existing.storyboard as StoryboardPanelInput[]) {
      if (old.flowId) byFlowId.set(old.flowId, old);
      if (old.clientId) byClientId.set(old.clientId, old);
    }
    merged.storyboard = incomingPanels.map((p, i) => {
      const old =
        (p.flowId && byFlowId.get(p.flowId)) ||
        (p.clientId && byClientId.get(p.clientId)) ||
        (existing.storyboard?.[i] as StoryboardPanelInput | undefined);
      if (old && ((old as { src?: string }).src || (old as { filePath?: string }).filePath) && (old as { state?: string }).state === "已完成") {
        return {
          ...p,
          id: old.id,
          src: (old as { src?: string }).src,
          filePath: (old as { filePath?: string }).filePath,
          state: (old as { state?: string }).state,
        } as FlowData["storyboard"][0];
      }
      return p as FlowData["storyboard"][0];
    });
  } else {
    merged.storyboard = (incoming.storyboard as FlowData["storyboard"]) ?? existing.storyboard ?? [];
  }
  return merged;
}

async function persistBlueprintFromBundle(db: Knex, projectId: number, bundle: ScriptBundle): Promise<boolean> {
  const existing = (await loadProjectBlueprint(db, projectId)) ?? {};
  const merged: Record<string, unknown> = { ...existing };

  const ga = bundle.planData?.globalAnchors;
  if (ga && typeof ga === "object") {
    merged.globalAnchors = ga;
  }

  if (bundle.designBrief && Object.keys(bundle.designBrief).length) {
    merged.designBrief = bundle.designBrief;
  }

  if (bundle.planData && typeof bundle.planData === "object") {
    merged.planData = {
      ...((merged.planData as object) ?? {}),
      ...(bundle.planData as object),
    };
  }

  if (bundle.preDesignPack && hasPreDesignShots(bundle.preDesignPack)) {
    merged.preDesignPack = bundle.preDesignPack;
  }

  if (bundle.narrativeCausalityGraph) {
    merged.narrativeCausalityGraph = bundle.narrativeCausalityGraph;
  }

  if (bundle.fxFeasibilityAudit) {
    merged.fxFeasibilityAudit = bundle.fxFeasibilityAudit;
  }

  if (bundle.debutIntroPack) {
    merged.debutIntroPack = bundle.debutIntroPack;
  }

  const vlt = bundle.visualLockTable;
  if (vlt && Object.keys(vlt).length) {
    const lockOnly = { ...vlt };
    delete lockOnly.globalAnchors;
    delete lockOnly.characterAssets;
    delete lockOnly.sceneColorLock;
    delete lockOnly.designBrief;
    if (Object.keys(lockOnly).length) Object.assign(merged, lockOnly);
    if (vlt.characterAssets) {
      merged.characterAssets = {
        ...((merged.characterAssets as Record<string, unknown>) ?? {}),
        ...(vlt.characterAssets as Record<string, unknown>),
      };
    }
    if (vlt.sceneColorLock) {
      merged.sceneColorLock = {
        ...((merged.sceneColorLock as Record<string, unknown>) ?? {}),
        ...(vlt.sceneColorLock as Record<string, unknown>),
      };
    }
  }

  const cd = bundle.characterDesign as { assets?: { code?: string; [key: string]: unknown }[] } | undefined;
  if (cd?.assets?.length) {
    const characterAssets: Record<string, unknown> = { ...((merged.characterAssets as Record<string, unknown>) ?? {}) };
    for (const asset of cd.assets) {
      if (asset.code) characterAssets[asset.code] = asset;
    }
    merged.characterAssets = characterAssets;
    merged.characterDesign = cd; // keep full CD for heal/alias SSOT
  }
  if (bundle.visualLockTable) {
    merged.visualLockTable = {
      ...((merged.visualLockTable as object) ?? {}),
      ...(bundle.visualLockTable as object),
    };
  }

  const ap = bundle.assetPipeline as { sceneColorLock?: Record<string, unknown> } | undefined;
  if (ap?.sceneColorLock) {
    merged.sceneColorLock = { ...((merged.sceneColorLock as Record<string, unknown>) ?? {}), ...ap.sceneColorLock };
  }

  if (Object.keys(merged).length) {
    await saveProjectBlueprint(db, projectId, merged);
    return true;
  }
  return false;
}

function mergeFlowDataFromBundle(flowData: FlowData, bundle: ScriptBundle, opts?: { skipStoryboard?: boolean }): FlowData {
  const fd = bundle.flowData;
  if (!fd) return flowData;
  const merged = { ...flowData };
  if (fd.scriptPlan) merged.scriptPlan = fd.scriptPlan;
  if (fd.storyboardTable) merged.storyboardTable = fd.storyboardTable;
  if (!opts?.skipStoryboard && fd.storyboard?.length && !flowData.storyboard?.length) {
    merged.storyboard = fd.storyboard as FlowData["storyboard"];
  }
  return merged;
}

export function buildDryRunSummary(
  bundle: ScriptBundle | EpisodeBundle,
  opts: ImportOptions,
  scriptExists: boolean,
  shapeExtras?: { shapeSalvageLog?: ShapeSalvageEntry[] },
): DryRunImportSummary {
  const layers: string[] = ["script"];
  let storyboardCount = 0;
  let skipAutoDesignSb = false;

  if ("preDesignPack" in bundle && bundle.preDesignPack && hasPreDesignShots(bundle.preDesignPack)) {
    layers.push("scriptPlan", "storyboardTable", "storyboard");
    storyboardCount = bundle.preDesignPack.shots.length;
    skipAutoDesignSb = true;
  } else if ("flowData" in bundle && bundle.flowData) {
    const fd = bundle.flowData;
    if (fd.scriptPlan) layers.push("scriptPlan");
    if (fd.storyboardTable) layers.push("storyboardTable");
    if (fd.storyboard?.length) layers.push("storyboard");
    storyboardCount = fd.storyboard?.length ?? 0;
  }

  const warnings: string[] = [];
  let productionClosureChecks;
  let designClosureChecks;
  let intelligentClosureChecks;
  let closureChecks;
  let forwardTrace;
  let reverseHints;
  let repairHints;
  let generationClosureChecks;

  const rawForInspect =
    "bundleType" in bundle && bundle.bundleType === "script"
      ? bundle
      : "flowData" in bundle
        ? { flowData: bundle.flowData, meta: bundle.meta, bundleVersion: (bundle as EpisodeBundle).bundleVersion, rulePackVersion: (bundle as EpisodeBundle).rulePackVersion }
        : bundle;

  try {
    const inspected = inspectBundle(rawForInspect, {
      tier: "bundleType" in bundle && bundle.bundleType === "script" ? inferTierFromBundle(bundle as ScriptBundle) : "T2",
    });
    closureChecks = inspected.closureChecks;
    designClosureChecks = inspected.closureChecks.dc;
    productionClosureChecks = inspected.closureChecks.pc;
    intelligentClosureChecks = inspected.closureChecks.ic;
    generationClosureChecks = inspected.closureChecks.gc;
    forwardTrace = inspected.forwardTrace;
    reverseHints = inspected.reverseHints;
    repairHints = inspected.repairHints;
    warnings.push(...inspected.warnings);
  } catch {
    if ("bundleType" in bundle && bundle.bundleType === "script") {
      const closure = runScriptBundleClosure(bundle as ScriptBundle, { tier: inferTierFromBundle(bundle as ScriptBundle) });
      closureChecks = closure.closureChecks;
      designClosureChecks = closure.designClosureChecks;
      productionClosureChecks = closure.productionClosureChecks;
      intelligentClosureChecks = closure.intelligentClosureChecks;
      forwardTrace = closure.forwardTrace;
      reverseHints = closure.reverseHints;
      warnings.push(...closure.warnings);
    } else if ("flowData" in bundle) {
      const sb = episodeToScriptBundle(bundle as EpisodeBundle);
      const closure = runScriptBundleClosure(sb, { tier: "T2" });
      closureChecks = closure.closureChecks;
      designClosureChecks = closure.designClosureChecks;
      productionClosureChecks = closure.productionClosureChecks;
      intelligentClosureChecks = closure.intelligentClosureChecks;
      forwardTrace = closure.forwardTrace;
      reverseHints = closure.reverseHints;
      warnings.push(...closure.warnings);
    }
  }

  const shapeResidualGaps =
    "bundleType" in bundle && bundle.bundleType === "script" ? auditShapeResidualGaps(bundle as ScriptBundle) : [];
  for (const g of shapeResidualGaps) warnings.push(g.message);

  return {
    willCreateScript: !scriptExists && opts.importMode !== "update",
    willOverwriteLayers: layers,
    storyboardCount,
    mergeStrategy: resolveImportMergeStrategy({
      importMode: opts.importMode,
      mergeStrategy: opts.mergeStrategy,
    }),
    warnings,
    skipAutoDesignSb,
    productionClosureChecks,
    designClosureChecks,
    intelligentClosureChecks,
    generationClosureChecks,
    closureChecks,
    forwardTrace,
    reverseHints,
    repairHints,
    shapeSalvageLog: shapeExtras?.shapeSalvageLog,
    shapeResidualGaps,
  };
}

export async function importScriptBundle(db: Knex, raw: unknown, opts: ImportOptions): Promise<ImportResult> {
  const owner = `import-${opts.projectId}-${Date.now()}`;
  try {
    return await withImportLock(opts.projectId, owner, () => importScriptBundleLocked(db, raw, opts));
  } catch (e) {
    if (e instanceof ImportLockError) throw e;
    throw e;
  }
}

async function importScriptBundleLocked(db: Knex, raw: unknown, opts: ImportOptions): Promise<ImportResult> {
  const prep = prepareBundleForInspect(raw);
  let bundle = prep.bundle;
  const shapeSalvageLog = prep.shapeSalvageLog;
  const tier = prep.tier;
  const exportGate = runExportGate(raw, { bundle: prep.bundle, tier, alreadyPrepared: true, shapeSalvageLog: prep.shapeSalvageLog, allowShapeSalvage: true });
  const designGates = {
    ok: !exportGate.designFindings.some((f) => f.severity === "BLOCK"),
    findings: exportGate.designFindings,
  };
  const emptyEp = assertNonEmptyEpisode({
    preDesignShotCount: (bundle.preDesignPack?.shots as unknown[] | undefined)?.length ?? 0,
  });
  const importMode = opts.importMode ?? "upsert";
  const mergeStrategy = resolveImportMergeStrategy({ importMode, mergeStrategy: opts.mergeStrategy });
  const autoDesign = opts.autoDesign !== false && !hasPreDesignShots(bundle.preDesignPack);

  const preImportFull = exportGate.inspected;
  const chatPromptGaps = auditChatPromptGaps(bundle, tier, { nonBlocking: true });
  const shapeResidualGaps = auditShapeResidualGaps(bundle);
  const preImport: InspectBundleResult = {
    ...preImportFull,
    blocked: !exportGate.exportAllowed || !designGates.ok || (!emptyEp.ok && hasPreDesignShots(bundle.preDesignPack) === false && Boolean(bundle.preDesignPack)),
    chatPromptGaps,
    warnings: [
      ...(preImportFull.warnings ?? []),
      ...chatPromptGaps.map((g) => (g.shotIndex != null ? `[镜${g.shotIndex}] ${g.message}` : g.message)),
      ...shapeResidualGaps.map((g) => g.message),
      ...designGates.findings.map((f) => `[${f.severity}] ${f.id}: ${f.message}`),
      ...(!emptyEp.ok ? [emptyEp.message ?? "EMPTY_EPISODE"] : []),
    ],
  };

  if (!opts.validateOnly && opts.blockOnQualityGate !== false && tier === "T3" && !exportGate.exportAllowed) {
    throw new ExportGateBlockError(exportGate);
  }

  if (opts.validateOnly) {
    const predicted = await predictScriptUpsert(db, opts.projectId, bundle.meta, {
      targetScriptId: opts.targetScriptId,
      importMode,
    });
    const ruleConsistencyGaps = auditRuleConsistency(bundle, {});
    return {
      scriptId: predicted.scriptId ?? 0,
      idMap: {},
      resolvedContext: await resolveContextFromScriptBundle(db, opts.projectId, predicted.scriptId ?? 0, bundle).catch(() => undefined),
      dryRun: buildDryRunSummary(bundle, opts, !predicted.wouldCreate, { shapeSalvageLog }),
      preImport: {
        ...preImport,
        warnings: [...(preImport.warnings ?? []), ...ruleConsistencyGaps.map((g) => g.message)],
      },
      mergeReport: buildMergeReport({
        action: predicted.action,
        scriptId: predicted.scriptId ?? 0,
        importMode,
        mergeStrategy,
      }),
      ruleConsistencyGaps,
      shapeSalvageLog,
      shapeResidualGaps,
      pathGuard: isT3Bundle(bundle)
        ? { recommended: "importScript", severity: "INFO", message: "T3 bundle 请使用 importScript 落库" }
        : buildImportPathGuard(bundle, { viaEnterProduction: false }),
    };
  }

  const upsert = await upsertScriptWithMode(db, opts.projectId, bundle.script, bundle.meta, {
    targetScriptId: opts.targetScriptId,
    importMode,
  });
  const scriptId = upsert.scriptId;
  await db("o_script").where({ id: scriptId, projectId: opts.projectId }).update({ extractState: 1, errorReason: null });
  const resolvedContext = await resolveContextFromScriptBundle(db, opts.projectId, scriptId, bundle);

  const speakerOrphans = prep.speakerOrphans;

  if (mergeStrategy === "replaceAll") {
    const keep = new Set(
      Object.keys(
        (bundle.visualLockTable as { sceneColorLock?: Record<string, unknown> } | undefined)?.sceneColorLock ?? {},
      ),
    );
    await purgeOrphanStubScenes(db, opts.projectId, keep);
  }

  const assetSeed = await seedAssetsFromBundle(db, opts.projectId, bundle);
  const assetClosure = await ensureAssetClosure(db, opts.projectId, bundle, assetSeed.codeToId, {
    seedStubs: true,
    blockOnMissing: true,
  });
  assetSeed.allAssetIds = mergeClosureIdsIntoSeed(assetSeed.codeToId, assetSeed.allAssetIds);
  if (assetClosure.stillMissing.length) {
    throw new Error(
      JSON.stringify({
        code: "ASSET_CLOSURE_BLOCK",
        message: `资产闭环缺失: ${assetClosure.stillMissing.join(",")}`,
        details: assetClosure.stillMissing.map((code) => ({
          code,
          repairHintId: "RH-QP-11",
          hint: "请为角色/场景补全资产引用与 cref 绑定",
        })),
      }),
    );
  }
  if (assetClosure.stubCount > 0) {
    throw new Error(`ASSET_STUB_QUALITY_BLOCK: ${assetClosure.stubCount} stub-quality assets`);
  }

  // Main CHAR (CD) + SCENE (lock) must be in codeToId after hydrate
  const missingMainCodes: string[] = [];
  const cdAssets =
    (bundle.characterDesign as { assets?: { code?: string }[] } | undefined)?.assets ?? [];
  for (const a of cdAssets) {
    const c = a.code ? normalizeAssetCode(a.code) ?? a.code : undefined;
    if (c && !assetSeed.codeToId[c]) missingMainCodes.push(c);
  }
  for (const sc of Object.keys(
    (bundle.visualLockTable as { sceneColorLock?: Record<string, unknown> } | undefined)?.sceneColorLock ?? {},
  )) {
    const c = normalizeAssetCode(sc) ?? sc;
    if (c && !assetSeed.codeToId[c]) missingMainCodes.push(c);
  }
  if (missingMainCodes.length) {
    throw new Error(`ASSET_MAIN_LINK_BLOCK: ${missingMainCodes.join(",")}`);
  }

  const linkResult = await linkSeededAssetsToScript(db, scriptId, assetSeed, {
    replaceAll: mergeStrategy === "replaceAll",
    pruneStale: importMode === "update" || importMode === "upsert",
  });

  const assetDiagnostics = {
    seeded: assetSeed.seeded,
    linked: linkResult.linked,
    pruned: linkResult.pruned,
    speakerSeeded: assetSeed.speakerSeeded,
    duplicateSuspects: speakerOrphans.map((s) => `${s.name}:${s.code}`),
  };

  const b6CoverageWarns = auditAssetDesignCoverage(bundle as Parameters<typeof auditAssetDesignCoverage>[0]);

  const assetQuality = {
    stubCount: assetClosure.stubCount,
    sceneSeeded: assetSeed.sceneSeeded,
    propSeeded: assetSeed.propSeeded,
    speakerSeeded: assetSeed.speakerSeeded,
    weakPromptCount: assetSeed.weakPromptCount,
    derivativeCount: assetSeed.derivatives,
    derivativeSkipReason: assetSeed.derivativeSkipReason,
    audioGap: true, // import does not create audio assets; bind-audio is a separate step
    orphansLinked: assetClosure.orphansLinked.length,
    orphansSeeded: assetClosure.orphansSeeded.length,
    missingMainCodes,
    speakerWarns: [
      ...(assetSeed.speakerWarns ?? speakerOrphans.map((s) => `speaker_orphan:${s.name}:${s.code}`)),
      ...b6CoverageWarns,
    ],
    b6CoverageWarns,
    ok: assetClosure.stubCount === 0 && assetClosure.stillMissing.length === 0 && missingMainCodes.length === 0,
  };
  const ruleConsistencyGaps = auditRuleConsistency(bundle, assetSeed.codeToId);
  const integrityGaps = auditBundleIntegrity(bundle);

  let flowData: FlowData = {
    script: bundle.script,
    scriptPlan: "",
    storyboardTable: "",
    assets: [],
    storyboard: [],
    workbench: { videoList: [] },
  };

  let idMap: Record<string, number> = {};
  let jobId: string | undefined;
  let storyboardReplaced = false;
  let storyboardCount = 0;
  let mediaPreservedCount = 0;

  const syncOpts = {
    replaceAll: mergeStrategy === "replaceAll",
    preserveMedia: mergeStrategy === "preserveMedia" || mergeStrategy === "mergeLayers",
  };

  const preDesign = bundle.preDesignPack && hasPreDesignShots(bundle.preDesignPack);
  if (preDesign && bundle.preDesignPack) {
    const applied = applyPreDesignPack(bundle.preDesignPack, {
      enrichFromDesign: true,
      visualLockTable: bundle.visualLockTable as Record<string, unknown> | undefined,
      codeToAssetId: assetSeed.codeToId,
    });
    const linkedPanels = linkPanelsToAssets(
      applied.storyboard,
      bundle.preDesignPack.shots,
      assetSeed.codeToId,
      assetSeed.nameToId,
      getBundleAlias(bundle),
    );
    let panelsToSync = linkedPanels;
    if (mergeStrategy === "mergeLayers" || mergeStrategy === "preserveMedia") {
      const existingRow = await loadOrCreateFlowDataRow(db, opts.projectId, scriptId);
      let existingFlow: Partial<FlowData> = {};
      if (existingRow?.data) {
        try {
          existingFlow = JSON.parse(existingRow.data as string);
        } catch {
          existingFlow = {};
        }
      }
      const merged = await mergeFlowData(existingFlow, { storyboard: linkedPanels }, mergeStrategy);
      panelsToSync = merged.storyboard as StoryboardPanelInput[];
    }
    flowData = {
      ...flowData,
      scriptPlan: applied.scriptPlan,
      storyboardTable: applied.storyboardTable,
      storyboard: panelsToSync as FlowData["storyboard"],
    };
    storyboardReplaced = mergeStrategy === "replaceAll";
    storyboardCount = panelsToSync.length;
    const sync = await syncStoryboardToDb(db, opts.projectId, scriptId, panelsToSync, syncOpts);
    idMap = sync.idMap;
    mediaPreservedCount += sync.mediaPreservedCount ?? 0;
    flowData.storyboard = sync.panels as FlowData["storyboard"];
    flowData = mergeFlowDataFromBundle(flowData, bundle, { skipStoryboard: true });
    await saveFlowData(db, opts.projectId, scriptId, flowData);
    const pkg = await syncFromFlowData(db, {
      projectId: opts.projectId,
      scriptId,
      script: flowData.script,
      scriptPlan: flowData.scriptPlan,
      storyboardTable: flowData.storyboardTable,
      storyboard: flowData.storyboard,
    });
    const hydrated = hydratePackageFromPreDesign(pkg, bundle.preDesignPack!.shots, {
      sceneColorLock: (bundle.visualLockTable as { sceneColorLock?: Record<string, { colorTemp?: string; name?: string }> } | undefined)
        ?.sceneColorLock,
      fxByShotIndex: (() => {
        const out: Record<number, string> = {};
        const rows =
          (bundle.fxFeasibilityAudit as { shots?: { shotIndex?: number; level?: string }[] } | undefined)?.shots ?? [];
        for (const r of rows) {
          if (r.shotIndex != null && r.level) out[r.shotIndex] = String(r.level).toUpperCase();
        }
        return out;
      })(),
      debutBeat: (bundle.debutIntroPack as { items?: { copyHint?: string }[] } | undefined)?.items?.[0]?.copyHint,
      endHook: (bundle.planData as { endCard?: { hook?: string } } | undefined)?.endCard?.hook,
    });
    await saveEpisodePackage(db, hydrated);
  } else if (autoDesign) {
    const job = await createAndPersistAutoDesignJob(db, opts.projectId, scriptId);
    jobId = job.id;
    const useLlm = await shouldUseLlm(db, opts.projectId);

    await executeAutoDesignJob(
      db,
      job.id,
      { script: bundle.script, context: resolvedContext },
      async (output) => {
        flowData = {
          ...flowData,
          scriptPlan: output.scriptPlan,
          storyboardTable: output.storyboardTable,
          storyboard: output.storyboard as FlowData["storyboard"],
        };
        storyboardReplaced = mergeStrategy === "replaceAll";
        storyboardCount = output.storyboard.length;
        const sync = await syncStoryboardToDb(db, opts.projectId, scriptId, output.storyboard, syncOpts);
        idMap = sync.idMap;
        mediaPreservedCount += sync.mediaPreservedCount ?? 0;
        flowData.storyboard = sync.panels as FlowData["storyboard"];
        flowData = mergeFlowDataFromBundle(flowData, bundle, { skipStoryboard: true });
        await saveFlowData(db, opts.projectId, scriptId, flowData);
        const pkg = await syncFromFlowData(db, {
          projectId: opts.projectId,
          scriptId,
          script: flowData.script,
          scriptPlan: flowData.scriptPlan,
          storyboardTable: flowData.storyboardTable,
          storyboard: flowData.storyboard,
        });
        await saveEpisodePackage(db, pkg);
      },
      useLlm,
    );
  } else {
    const existingRow = await loadOrCreateFlowDataRow(db, opts.projectId, scriptId);
    let existingFlow: Partial<FlowData> = {};
    if (existingRow?.data) {
      try {
        existingFlow = JSON.parse(existingRow.data as string);
      } catch {
        existingFlow = {};
      }
    }
    const incomingPanels = (bundle.flowData?.storyboard ?? []) as StoryboardPanelInput[];
    if (incomingPanels.length) {
      const merged = await mergeFlowData(existingFlow, bundle.flowData as Partial<FlowData>, mergeStrategy);
      storyboardCount = incomingPanels.length;
      storyboardReplaced = mergeStrategy === "replaceAll";
      const sync = await syncStoryboardToDb(db, opts.projectId, scriptId, merged.storyboard as StoryboardPanelInput[], syncOpts);
      idMap = sync.idMap;
      mediaPreservedCount += sync.mediaPreservedCount ?? 0;
      flowData = { ...merged, storyboard: sync.panels as FlowData["storyboard"] };
    } else {
      flowData = mergeFlowDataFromBundle(flowData, bundle);
    }
    await saveFlowData(db, opts.projectId, scriptId, flowData);
    if (flowData.storyboard?.length) {
      const pkg = await syncFromFlowData(db, {
        projectId: opts.projectId,
        scriptId,
        script: flowData.script,
        scriptPlan: flowData.scriptPlan,
        storyboardTable: flowData.storyboardTable,
        storyboard: flowData.storyboard,
      });
      await saveEpisodePackage(db, pkg);
    }
  }

  const blueprintMerged = await persistBlueprintFromBundle(db, opts.projectId, bundle);

  if (bundle.planData) {
    const planRow = await db("o_agentWorkData").where({ projectId: opts.projectId, key: "scriptAgent" }).first();
    let existingPlan: Record<string, unknown> = {};
    if (planRow?.data) {
      try {
        existingPlan = JSON.parse(planRow.data as string);
      } catch {
        existingPlan = {};
      }
    }
    const mergedPlan = mergePlanDataFields(existingPlan, bundle.planData);
    const planPayload = JSON.stringify(mergedPlan);
    if (planRow) {
      await db("o_agentWorkData").where({ id: planRow.id }).update({ data: planPayload, updateTime: Date.now() });
    } else {
      await db("o_agentWorkData").insert({
        projectId: opts.projectId,
        key: "scriptAgent",
        data: planPayload,
        createTime: Date.now(),
      });
    }
  }

  const pkgAfter = await loadEpisodePackage(db, opts.projectId, scriptId);
  let validationReport;
  let postImport: IntValidationSummary | undefined;
  if (pkgAfter && opts.includeValidationReport) {
    const dry = await dryRun(db, pkgAfter, bundle.script);
    validationReport = dry.report;
    postImport = {
      passed: dry.report.passed,
      tier0Coverage: {
        executed: dry.report.ruleCoverage?.hit ?? dry.report.issues?.length ?? 0,
        registered: dry.report.ruleCoverage?.total ?? 257,
        triggered: dry.report.issues?.length ?? 0,
      },
      issues: dry.report.issues ?? [],
    };
  }

  const mergeReport = buildMergeReport({
    action: upsert.action,
    scriptId,
    storyboardReplaced,
    storyboardCount,
    blueprintMerged,
    assetsSeeded: assetSeed.seeded + assetSeed.derivatives + assetClosure.orphansSeeded.length,
    importMode,
    mergeStrategy,
    mediaPreservedCount,
    assetClosure: {
      ok: assetClosure.ok,
      orphansSeeded: assetClosure.orphansSeeded,
      stillMissing: assetClosure.stillMissing,
      shotCount: assetClosure.shotCount,
      referenced: assetClosure.referenced,
    },
    assetDiagnostics,
  });

  const pathGuard = isT3Bundle(bundle)
    ? { recommended: "importScript" as const, severity: "INFO" as const, message: "T3 bundle 已通过 importScript 写入分镜四槽与 blueprint" }
    : buildImportPathGuard(bundle, { viaEnterProduction: false });

  if (ruleConsistencyGaps.length) {
    preImport.warnings = [...(preImport.warnings ?? []), ...ruleConsistencyGaps.map((g) => g.message)];
  }
  if (integrityGaps.length) {
    preImport.warnings = [...(preImport.warnings ?? []), ...integrityGaps.map((g) => `[${g.id}] ${g.message}`)];
  }

  try {
    const wb = await writeContinuityFromEpisode(db, opts.projectId, bundle);
    if (wb.written) {
      const bp = (await loadProjectBlueprint(db, opts.projectId)) ?? {};
      bp.continuityWriteback = {
        ...(typeof bp.continuityWriteback === "object" && bp.continuityWriteback ? bp.continuityWriteback : {}),
        [String(scriptId)]: {
          recapHint: wb.recapHint,
          prevEpisodeSummary: wb.prevEpisodeSummary,
          nextEpisodeKey: wb.targetKey,
        },
      };
      await saveProjectBlueprint(db, opts.projectId, bp);
    }
  } catch {
    /* writeback best-effort */
  }

  return {
    scriptId,
    idMap,
    validationReport,
    resolvedContext,
    autoDesignJobId: jobId,
    preImport,
    postImport,
    chatPromptGaps,
    mergeReport,
    ruleConsistencyGaps,
    integrityGaps,
    pathGuard,
    shapeSalvageLog,
    shapeResidualGaps,
    assetQuality,
  };
}

export async function importEpisodeBundle(db: Knex, raw: unknown, opts: ImportOptions): Promise<ImportResult> {
  let bundle: EpisodeBundle;
  const kind = detectBundleType(raw);
  if (kind === "legacy") {
    const { flowData, meta } = normalizeLegacyFlowData(raw as Record<string, unknown>);
    bundle = episodeBundleSchema.parse({
      bundleVersion: "1.0.0",
      meta,
      flowData,
    }) as EpisodeBundle;
  } else {
    bundle = episodeBundleSchema.parse(prepareBundleWithLog(raw).bundle) as EpisodeBundle;
  }

  const importMode = opts.importMode ?? "upsert";
  const mergeStrategy = resolveImportMergeStrategy({ importMode, mergeStrategy: opts.mergeStrategy });

  if (opts.validateOnly) {
    const predicted = await predictScriptUpsert(db, opts.projectId, bundle.meta, {
      targetScriptId: opts.targetScriptId ?? (bundle.meta.scriptId && bundle.meta.scriptId > 0 ? bundle.meta.scriptId : undefined),
      importMode,
    });
    const preImport = inspectBundle(bundle, { tier: "T2" });
    preImport.blocked = false;
    return {
      scriptId: predicted.scriptId ?? 0,
      idMap: {},
      dryRun: buildDryRunSummary(bundle, opts, !predicted.wouldCreate),
      preImport,
      mergeReport: buildMergeReport({
        action: predicted.action,
        scriptId: predicted.scriptId ?? 0,
        importMode,
        mergeStrategy,
      }),
    };
  }

  const upsert = await upsertScriptWithMode(db, opts.projectId, bundle.flowData.script, bundle.meta, {
    targetScriptId: opts.targetScriptId ?? (bundle.meta.scriptId && bundle.meta.scriptId > 0 ? bundle.meta.scriptId : undefined),
    importMode,
  });
  const scriptId = upsert.scriptId;

  const existingRow = await loadOrCreateFlowDataRow(db, opts.projectId, scriptId);
  let existingFlow: Partial<FlowData> = {};
  if (existingRow?.data) {
    try {
      existingFlow = JSON.parse(existingRow.data as string);
    } catch {
      existingFlow = {};
    }
  }

  const merged = await mergeFlowData(existingFlow, bundle.flowData as Partial<FlowData>, mergeStrategy);
  const sync = await syncStoryboardToDb(db, opts.projectId, scriptId, merged.storyboard as StoryboardPanelInput[], {
    replaceAll: mergeStrategy === "replaceAll",
    preserveMedia: mergeStrategy === "preserveMedia" || mergeStrategy === "mergeLayers",
  });
  merged.storyboard = sync.panels as FlowData["storyboard"];

  await saveFlowData(db, opts.projectId, scriptId, merged);

  const pkg = await syncFromFlowData(db, {
    projectId: opts.projectId,
    scriptId,
    script: merged.script,
    scriptPlan: merged.scriptPlan,
    storyboardTable: merged.storyboardTable,
    storyboard: merged.storyboard,
  });
  if (bundle.package) {
    const { shots: _omit, ...pkgRest } = bundle.package as { shots?: unknown };
    Object.assign(pkg, pkgRest, { projectId: opts.projectId, scriptId });
  }
  await saveEpisodePackage(db, pkg);

  let validationReport;
  if (opts.includeValidationReport) {
    const dry = await dryRun(db, pkg, merged.script);
    validationReport = dry.report;
    return {
      scriptId,
      idMap: sync.idMap,
      validationReport,
      mergeReport: buildMergeReport({
        action: upsert.action,
        scriptId,
        storyboardCount: merged.storyboard?.length ?? 0,
        storyboardReplaced: mergeStrategy === "replaceAll",
        blueprintMerged: false,
        importMode,
        mergeStrategy,
        mediaPreservedCount: sync.mediaPreservedCount ?? 0,
      }),
    };
  }
  return {
    scriptId,
    idMap: sync.idMap,
    mergeReport: buildMergeReport({
      action: upsert.action,
      scriptId,
      storyboardCount: merged.storyboard?.length ?? 0,
      storyboardReplaced: mergeStrategy === "replaceAll",
      blueprintMerged: false,
      importMode,
      mergeStrategy,
      mediaPreservedCount: sync.mediaPreservedCount ?? 0,
    }),
  };
}

export async function exportScriptBundle(db: Knex, projectId: number, scriptId: number) {
  const scriptRow = await db("o_script").where({ id: scriptId, projectId }).first();
  if (!scriptRow) throw new Error("剧本不存在");
  const meta = await db("o_script").where({ projectId }).orderBy("createTime", "asc").select("id", "name");
  const episodeIndex = meta.findIndex((s) => s.id === scriptId) + 1;
  const ctx = await resolveContextFromScriptBundle(db, projectId, scriptId, {
    bundleType: "script",
    meta: { episodeKey: scriptRow.name ?? `ep-${episodeIndex}`, episodeName: scriptRow.name ?? `第${episodeIndex}集`, episodeIndex },
    script: scriptRow.content ?? "",
  });
  return {
    bundleVersion: "browser-chat-optimized",
    rulePackVersion: "2.0.1",
    bundleType: "script" as const,
    meta: {
      episodeKey: scriptRow.name,
      episodeName: scriptRow.name,
      episodeIndex,
      projectId,
      scriptId,
      bundleHash: stableHash({ scriptId, content: scriptRow.content }),
    },
    script: scriptRow.content ?? "",
    continuity: ctx.continuity,
    anchors: ctx.anchors,
  };
}

export async function exportEpisodeBundle(db: Knex, projectId: number, scriptId: number) {
  const scriptRow = await db("o_script").where({ id: scriptId, projectId }).first();
  if (!scriptRow) throw new Error("剧本不存在");
  const row = await loadOrCreateFlowDataRow(db, projectId, scriptId);
  let flowData: FlowData = {
    script: scriptRow.content ?? "",
    scriptPlan: "",
    storyboardTable: "",
    assets: [],
    storyboard: [],
    workbench: { videoList: [] },
  };
  if (row?.data) {
    try {
      flowData = { ...flowData, ...JSON.parse(row.data as string) };
    } catch {
      /* keep defaults */
    }
  }
  flowData.storyboard = (await loadStoryboardFromDb(db, scriptId, projectId)) as FlowData["storyboard"];
  flowData.script = scriptRow.content ?? "";
  const pkg = await loadEpisodePackage(db, projectId, scriptId);
  return {
    bundleVersion: "1.0.0",
    meta: {
      episodeKey: scriptRow.name,
      episodeName: scriptRow.name,
      projectId,
      scriptId,
      bundleHash: stableHash(flowData),
    },
    flowData,
    package: pkg ?? undefined,
  };
}

export async function exportFullBundle(db: Knex, projectId: number, scriptId: number) {
  const base = await exportScriptBundle(db, projectId, scriptId);
  const ep = await exportEpisodeBundle(db, projectId, scriptId);
  const planRaw = await loadPlanData(db, projectId);
  const blueprint = await loadProjectBlueprint(db, projectId);
  const pkg = await loadEpisodePackage(db, projectId, scriptId);

  let planData: Record<string, unknown> = {};
  try {
    for (const [k, v] of Object.entries(planRaw)) {
      if (v && typeof v === "string" && (v.startsWith("{") || v.startsWith("["))) {
        planData[k] = JSON.parse(v);
      } else if (v) {
        planData[k] = v;
      }
    }
  } catch {
    planData = { ...planRaw };
  }

  const adaptStructured = (planRaw as Record<string, unknown>)._adaptationMatrixStructured
    ?? (planRaw as Record<string, unknown>).adaptationMatrixStructured;
  if (adaptStructured) {
    planData.adaptationMatrixStructured = typeof adaptStructured === "string" ? JSON.parse(adaptStructured) : adaptStructured;
  }
  const adaptProfile = (planRaw as Record<string, unknown>)._adaptationProfile ?? planData.adaptationProfile;
  if (adaptProfile) {
    planData.adaptationProfile = typeof adaptProfile === "string" ? JSON.parse(adaptProfile as string) : adaptProfile;
  }
  const nb = planData.narrativeBrief ?? (planRaw as Record<string, unknown>).narrativeBrief;
  if (nb) planData.narrativeBrief = typeof nb === "string" ? JSON.parse(nb as string) : nb;

  const shots =
    ep.flowData.storyboard?.map((p, i) => {
      const shotPkg = pkg?.shots?.[i];
      const compiled = shotPkg?.generation?.compiled;
      const gen = shotPkg?.generation;
      return {
        shotIndex: i + 1,
        duration: p.duration,
        visualDescription: p.prompt,
        generation: {
          imagePrompt: compiled?.image ?? gen?.imagePrompt ?? p.prompt,
          videoPrompt: compiled?.video ?? gen?.videoPrompt ?? p.videoDesc,
          audioPrompt: gen?.audioPrompt ?? (p as { audioPrompt?: string }).audioPrompt ?? compiled?.audio,
          fxPrompt: gen?.fxPrompt ?? (p as { fxPrompt?: string }).fxPrompt,
        },
      };
    }) ?? [];

  const characterAssets = (blueprint?.characterAssets as Record<string, unknown>) ?? {};
  const characterDesign =
    Object.keys(characterAssets).length > 0
      ? { assets: Object.entries(characterAssets).map(([code, asset]) => ({ code, ...(asset as object) })) }
      : undefined;

  const hasShots = Boolean(shots.length);
  const hasPlan = Boolean(planData && Object.keys(planData).length);
  const hasFlowSb = Boolean(ep.flowData?.storyboard?.length);
  const fidelityComplete = hasShots && hasPlan && hasFlowSb && Boolean(pkg);
  return {
    ...base,
    planData: Object.keys(planData).length ? planData : undefined,
    designBrief: (blueprint?.designBrief as Record<string, unknown>) ?? undefined,
    preDesignPack: ep.flowData.scriptPlan
      ? { scriptPlan: ep.flowData.scriptPlan, shots }
      : shots.length
        ? { scriptPlan: "", shots }
        : undefined,
    characterDesign,
    visualLockTable: blueprint
      ? {
          globalAnchors: blueprint.globalAnchors,
          characterAssets: blueprint.characterAssets,
          sceneColorLock: blueprint.sceneColorLock,
          designBrief: blueprint.designBrief,
        }
      : undefined,
    flowData: ep.flowData,
    Z108: pkg ? buildZ108(pkg) : undefined,
    /** exportFullBundle is fidelity authority; thin exporters must set lossy:true */
    lossy: !fidelityComplete,
    exportKind: "full" as const,
  };
}

export async function importSeriesBundle(db: Knex, raw: unknown, opts: Omit<ImportOptions, "targetScriptId">) {
  const series = seriesBundleSchema.parse(prepareBundleWithLog(raw).bundle);
  const results: ImportResult[] = [];
  let prevSummary: string | undefined;
  for (const ep of series.episodes) {
    const cont = (ep as { flowData?: { continuity?: { prevEpisodeSummary?: string } } }).flowData?.continuity?.prevEpisodeSummary;
    if (prevSummary && cont && cont !== prevSummary) {
      console.warn(`Series continuity drift at episode after: ${prevSummary.slice(0, 20)}...`);
    }
    const r = await importEpisodeBundle(db, ep, { ...opts, importMode: opts.importMode ?? "upsert" });
    results.push(r);
    prevSummary = cont ?? prevSummary;
  }
  return results;
}

export async function dryRunImport(db: Knex, raw: unknown, opts: ImportOptions): Promise<DryRunImportSummary> {
  const prep = prepareBundleForInspect(raw);
  const bundleObj = prep.bundle;
  const kind = detectBundleType(bundleObj);
  const tier = kind === "script" ? prep.tier : bundleObj.modalityPromptAudit ? "T3" : "T2";
  const exportGate = runExportGate(raw, { bundle: prep.bundle, tier, alreadyPrepared: true, shapeSalvageLog: prep.shapeSalvageLog, allowShapeSalvage: true });
  const preImport = exportGate.inspected;

  let summary: DryRunImportSummary;
  const meta =
    kind === "script"
      ? prep.bundle.meta
      : ((bundleObj as unknown as EpisodeBundle).meta ?? {});
  const predicted = await predictScriptUpsert(db, opts.projectId, meta, {
    targetScriptId: opts.targetScriptId,
    importMode: opts.importMode ?? "upsert",
  });

  if (kind === "script") {
    summary = buildDryRunSummary(prep.bundle, { ...opts, validateOnly: true }, !predicted.wouldCreate, {
      shapeSalvageLog: prep.shapeSalvageLog,
    });
  } else {
    const bundle = kind === "legacy" ? normalizeLegacyFlowData(bundleObj) : { flowData: (bundleObj as unknown as EpisodeBundle).flowData, meta: {} };
    summary = buildDryRunSummary({ flowData: bundle.flowData, meta: bundle.meta } as EpisodeBundle, { ...opts, validateOnly: true }, !predicted.wouldCreate, {
      shapeSalvageLog: prep.shapeSalvageLog,
    });
  }
  return {
    ...summary,
    preImport,
    tier,
    shapeSalvageLog: prep.shapeSalvageLog,
    exportGate: {
      exportAllowed: exportGate.exportAllowed,
      closureSnapshot: exportGate.closureSnapshot,
      coverage: exportGate.coverage,
      chatRepairText: buildAggregatedChatRepairText(
        exportGate.repairHints,
        exportGate.closureSnapshot.blockIds,
        exportGate.missingFieldSummary,
        exportGate.blocks,
      ),
      blocks: exportGate.blocks,
      warns: exportGate.warns,
      repairHints: exportGate.repairHints,
      missingFieldReport: exportGate.missingFieldReport,
      missingFieldSummary: exportGate.missingFieldSummary,
      shapeSalvageLog: prep.shapeSalvageLog,
      rePushPlan: exportGate.inspected?.rePushPlan ?? [],
    },
    endpoint: "int" as const,
  };
}
