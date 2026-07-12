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
import { detectBundleType, episodeBundleSchema, normalizeLegacyFlowData, scriptBundleSchema, stripCommentFields } from "./schema";
import { resolveContextFromScriptBundle } from "./resolveContext";
import { syncStoryboardToDb, loadStoryboardFromDb } from "./storyboardSync";
import { applyPreDesignPack, hasPreDesignShots } from "./preDesignPackAdapter";
import { episodeToScriptBundle, inferTierFromBundle, runScriptBundleClosure } from "./closureSummary";
import { inspectBundle } from "../portable/inspectBundle";
import type { InspectBundleResult } from "../portable/types";
import { applySmartProposalsToBundle } from "../design/smartProposalApplier";
import type { IntValidationSummary } from "./types";
import { createAutoDesignJob, executeAutoDesignJob, shouldUseLlm } from "./autoDesign";
import { loadProjectBlueprint, saveProjectBlueprint } from "../storage/episodePackageStore";
import { auditChatPromptGaps } from "./chatPromptAudit";
import { loadPlanData } from "./resolveContext";
import { buildZ108 } from "../packager/zPackager";

async function upsertScript(
  db: Knex,
  projectId: number,
  script: string,
  meta: { episodeKey?: string; episodeName?: string; episodeIndex?: number },
  targetScriptId?: number,
): Promise<number> {
  if (targetScriptId) {
    await db("o_script").where({ id: targetScriptId, projectId }).update({ content: script, name: meta.episodeName ?? undefined });
    return targetScriptId;
  }
  if (meta.episodeKey) {
    const scripts = await db("o_script").where({ projectId }).select("id", "name");
    const match = scripts.find((s) => s.name === meta.episodeKey || s.name === meta.episodeName);
    if (match) {
      await db("o_script").where("id", match.id).update({ content: script });
      return match.id!;
    }
  }
  const name = meta.episodeName || meta.episodeKey || `第${meta.episodeIndex ?? 1}集`;
  const [scriptId] = await db("o_script").insert({
    projectId,
    name,
    content: script,
    createTime: Date.now(),
  });
  return scriptId;
}

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
    merged.storyboard = incomingPanels.map((p, i) => {
      const old = existing.storyboard?.[i] as StoryboardPanelInput | undefined;
      if (old && (old as { src?: string; state?: string }).src && (old as { state?: string }).state === "已完成") {
        return { ...p, id: old.id, src: (old as { src?: string }).src, state: (old as { state?: string }).state } as FlowData["storyboard"][0];
      }
      return p as FlowData["storyboard"][0];
    });
  } else {
    merged.storyboard = (incoming.storyboard as FlowData["storyboard"]) ?? existing.storyboard ?? [];
  }
  return merged;
}

async function persistBlueprintFromBundle(db: Knex, projectId: number, bundle: ScriptBundle): Promise<void> {
  const existing = (await loadProjectBlueprint(db, projectId)) ?? {};
  const merged: Record<string, unknown> = { ...existing };

  const ga = bundle.planData?.globalAnchors;
  if (ga && typeof ga === "object") {
    merged.globalAnchors = ga;
  }

  if (bundle.visualLockTable && Object.keys(bundle.visualLockTable).length) {
    Object.assign(merged, bundle.visualLockTable);
  }

  const cd = bundle.characterDesign as { assets?: { code?: string; [key: string]: unknown }[] } | undefined;
  if (cd?.assets?.length) {
    const characterAssets: Record<string, unknown> = { ...((merged.characterAssets as Record<string, unknown>) ?? {}) };
    for (const asset of cd.assets) {
      if (asset.code) characterAssets[asset.code] = asset;
    }
    merged.characterAssets = characterAssets;
  }

  const ap = bundle.assetPipeline as { sceneColorLock?: Record<string, unknown> } | undefined;
  if (ap?.sceneColorLock) {
    merged.sceneColorLock = { ...((merged.sceneColorLock as Record<string, unknown>) ?? {}), ...ap.sceneColorLock };
  }

  if (Object.keys(merged).length) {
    await saveProjectBlueprint(db, projectId, merged);
  }
}

function mergeFlowDataFromBundle(flowData: FlowData, bundle: ScriptBundle): FlowData {
  const fd = bundle.flowData;
  if (!fd) return flowData;
  const merged = { ...flowData };
  if (fd.scriptPlan) merged.scriptPlan = fd.scriptPlan;
  if (fd.storyboardTable) merged.storyboardTable = fd.storyboardTable;
  if (fd.storyboard?.length) {
    merged.storyboard = fd.storyboard as FlowData["storyboard"];
  }
  return merged;
}

export function buildDryRunSummary(
  bundle: ScriptBundle | EpisodeBundle,
  opts: ImportOptions,
  scriptExists: boolean,
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

  return {
    willCreateScript: !scriptExists && opts.importMode !== "update",
    willOverwriteLayers: layers,
    storyboardCount,
    mergeStrategy: opts.mergeStrategy ?? "replaceAll",
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
  };
}

export async function importScriptBundle(db: Knex, raw: unknown, opts: ImportOptions): Promise<ImportResult> {
  const parsed = scriptBundleSchema.parse(stripCommentFields(raw as Record<string, unknown>));
  let bundle = parsed as ScriptBundle;
  const proposals = (bundle as ScriptBundle & { smartDesignProposals?: unknown[] }).smartDesignProposals;
  if (proposals?.length) {
    bundle = applySmartProposalsToBundle(bundle, proposals as Parameters<typeof applySmartProposalsToBundle>[1]);
  }
  const tier = inferTierFromBundle(bundle);
  const chatPromptGaps = auditChatPromptGaps(bundle, tier);
  const preImport: InspectBundleResult = opts.validateOnly
    ? inspectBundle(bundle, { tier })
    : {
        tier,
        blocked: false,
        rulePackVersion: bundle.rulePackVersion ?? "2.0.1",
        closureChecks: { dc: [], pc: [], gc: [], ic: [], blocked: false },
        warnings: chatPromptGaps.map((g) => (g.shotIndex != null ? `[镜${g.shotIndex}] ${g.message}` : g.message)),
        chatPromptGaps,
      };
  const mergeStrategy = opts.mergeStrategy ?? "replaceAll";
  const autoDesign = opts.autoDesign !== false && !hasPreDesignShots(bundle.preDesignPack);

  const scriptId = await upsertScript(db, opts.projectId, bundle.script, bundle.meta, opts.targetScriptId);
  const resolvedContext = await resolveContextFromScriptBundle(db, opts.projectId, scriptId, bundle);

  if (opts.validateOnly) {
    return {
      scriptId,
      idMap: {},
      resolvedContext,
      dryRun: buildDryRunSummary(bundle, opts, Boolean(opts.targetScriptId)),
      preImport,
    };
  }

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

  const preDesign = bundle.preDesignPack && hasPreDesignShots(bundle.preDesignPack);
  if (preDesign && bundle.preDesignPack) {
    const applied = applyPreDesignPack(bundle.preDesignPack);
    flowData = {
      ...flowData,
      scriptPlan: applied.scriptPlan,
      storyboardTable: applied.storyboardTable,
      storyboard: applied.storyboard as FlowData["storyboard"],
    };
    const sync = await syncStoryboardToDb(db, opts.projectId, scriptId, applied.storyboard, { replaceAll: mergeStrategy === "replaceAll" });
    idMap = sync.idMap;
    flowData.storyboard = sync.panels as FlowData["storyboard"];
    flowData = mergeFlowDataFromBundle(flowData, bundle);
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
  } else if (autoDesign) {
    const job = createAutoDesignJob(opts.projectId, scriptId);
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
        const sync = await syncStoryboardToDb(db, opts.projectId, scriptId, output.storyboard, { replaceAll: mergeStrategy === "replaceAll" });
        idMap = sync.idMap;
        flowData.storyboard = sync.panels as FlowData["storyboard"];
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
  } else if (!preDesign) {
    flowData = mergeFlowDataFromBundle(flowData, bundle);
    await saveFlowData(db, opts.projectId, scriptId, flowData);
  }

  await persistBlueprintFromBundle(db, opts.projectId, bundle);

  if (bundle.planData) {
    const planRow = await db("o_agentWorkData").where({ projectId: opts.projectId, key: "scriptAgent" }).first();
    const planPayload = JSON.stringify(bundle.planData);
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
  if (pkgAfter && (opts.validateOnly || opts.includeValidationReport)) {
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

  return {
    scriptId,
    idMap,
    validationReport,
    resolvedContext,
    autoDesignJobId: jobId,
    preImport,
    postImport,
    chatPromptGaps: preImport.chatPromptGaps,
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
    bundle = episodeBundleSchema.parse(stripCommentFields(raw as Record<string, unknown>)) as EpisodeBundle;
  }

  const mergeStrategy = opts.mergeStrategy ?? "replaceAll";
  const scriptId = await upsertScript(
    db,
    opts.projectId,
    bundle.flowData.script,
    bundle.meta,
    opts.targetScriptId ?? (bundle.meta.scriptId && bundle.meta.scriptId > 0 ? bundle.meta.scriptId : undefined),
  );

  if (opts.validateOnly) {
    return {
      scriptId,
      idMap: {},
      dryRun: buildDryRunSummary(bundle, opts, Boolean(opts.targetScriptId)),
    };
  }

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
  const sync = await syncStoryboardToDb(db, opts.projectId, scriptId, (bundle.flowData.storyboard ?? []) as StoryboardPanelInput[], {
    replaceAll: mergeStrategy === "replaceAll",
    preserveMedia: mergeStrategy === "preserveMedia",
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
    Object.assign(pkg, bundle.package, { projectId: opts.projectId, scriptId });
  }
  await saveEpisodePackage(db, pkg);

  if (opts.validateOnly || opts.includeValidationReport) {
    const dry = await dryRun(db, pkg, merged.script);
    return { scriptId, idMap: sync.idMap, validationReport: dry.report };
  }
  return { scriptId, idMap: sync.idMap };
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

  const shots =
    ep.flowData.storyboard?.map((p, i) => {
      const shotPkg = pkg?.shots?.[i];
      const compiled = shotPkg?.generation?.compiled;
      return {
        shotIndex: i + 1,
        duration: p.duration,
        visualDescription: p.prompt,
        generation: {
          imagePrompt: compiled?.image ?? p.prompt,
          videoPrompt: compiled?.video ?? p.videoDesc,
          audioPrompt: compiled?.audio,
        },
      };
    }) ?? [];

  const characterAssets = (blueprint?.characterAssets as Record<string, unknown>) ?? {};
  const characterDesign =
    Object.keys(characterAssets).length > 0
      ? { assets: Object.entries(characterAssets).map(([code, asset]) => ({ code, ...(asset as object) })) }
      : undefined;

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
    visualLockTable: blueprint ?? undefined,
    flowData: ep.flowData,
    Z108: pkg ? buildZ108(pkg) : undefined,
  };
}

export async function importSeriesBundle(db: Knex, raw: unknown, opts: Omit<ImportOptions, "targetScriptId">) {
  const { seriesBundleSchema } = await import("./schema");
  const series = seriesBundleSchema.parse(stripCommentFields(raw as Record<string, unknown>));
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
  const preImport = inspectBundle(raw, {
    tier: (raw as { modalityPromptAudit?: unknown })?.modalityPromptAudit ? "T3" : "T2",
  });
  const kind = detectBundleType(raw);
  let summary: DryRunImportSummary;
  if (kind === "script") {
    const bundle = scriptBundleSchema.parse(stripCommentFields(raw as Record<string, unknown>));
    const exists = opts.targetScriptId
      ? Boolean(await db("o_script").where({ id: opts.targetScriptId, projectId: opts.projectId }).first())
      : false;
    summary = buildDryRunSummary(bundle as ScriptBundle, { ...opts, validateOnly: true }, exists);
  } else {
    const bundle = kind === "legacy" ? normalizeLegacyFlowData(raw as Record<string, unknown>) : { flowData: (raw as EpisodeBundle).flowData, meta: {} };
    const exists = Boolean(opts.targetScriptId);
    summary = buildDryRunSummary({ flowData: bundle.flowData, meta: bundle.meta } as EpisodeBundle, { ...opts, validateOnly: true }, exists);
  }
  return { ...summary, preImport, endpoint: "int" as const };
}
