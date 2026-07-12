import type { Knex } from "knex";
import type { FlowData } from "@/agents/productionAgent/tools";
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
import { productionClosureBlocked, runProductionClosureDryRun } from "./productionClosureDryRun";
import { designClosureBlocked } from "./designClosureDryRun";
import { enrichBundleForwardTrace } from "../design/forwardTrace";
import { buildReverseHints } from "../design/bidirectionalTrace";
import { runUnifiedClosure } from "../design/unifiedDryRun";
import { createAutoDesignJob, executeAutoDesignJob, shouldUseLlm } from "./autoDesign";

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
  } else if ("flowData" in bundle) {
    if (bundle.flowData.scriptPlan) layers.push("scriptPlan");
    if (bundle.flowData.storyboardTable) layers.push("storyboardTable");
    if (bundle.flowData.storyboard?.length) layers.push("storyboard");
    storyboardCount = bundle.flowData.storyboard?.length ?? 0;
  }

  const warnings: string[] = [];
  let productionClosureChecks;
  let designClosureChecks;
  let intelligentClosureChecks;
  let closureChecks;
  let forwardTrace;
  let reverseHints;
  if ("bundleType" in bundle && bundle.bundleType === "script") {
    const sb = bundle as ScriptBundle;
    const tier = sb.modalityPromptAudit ? "T3" : "T1";
    const enriched = enrichBundleForwardTrace(sb, tier as "T1" | "T3");
    const unified = runUnifiedClosure(enriched, { tier: tier as "T1" | "T3" });
    closureChecks = unified;
    designClosureChecks = unified.dc;
    productionClosureChecks = unified.pc.length ? unified.pc : runProductionClosureDryRun(sb);
    intelligentClosureChecks = unified.ic;
    forwardTrace = enriched.forwardTrace;
    reverseHints = buildReverseHints(enriched, tier as "T1" | "T3");
    if (unified.blocked || designClosureBlocked(unified.dc) || productionClosureBlocked(productionClosureChecks)) {
      warnings.push("unified_closure_checklist 存在 BLOCK 项");
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
    closureChecks,
    forwardTrace,
    reverseHints,
  };
}

export async function importScriptBundle(db: Knex, raw: unknown, opts: ImportOptions): Promise<ImportResult> {
  const parsed = scriptBundleSchema.parse(stripCommentFields(raw as Record<string, unknown>));
  const bundle = parsed as ScriptBundle;
  const mergeStrategy = opts.mergeStrategy ?? "replaceAll";
  const autoDesign = opts.autoDesign !== false;

  const scriptId = await upsertScript(db, opts.projectId, bundle.script, bundle.meta, opts.targetScriptId);
  const resolvedContext = await resolveContextFromScriptBundle(db, opts.projectId, scriptId, bundle);

  if (opts.validateOnly) {
    return {
      scriptId,
      idMap: {},
      resolvedContext,
      dryRun: buildDryRunSummary(bundle, opts, Boolean(opts.targetScriptId)),
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
    await saveFlowData(db, opts.projectId, scriptId, flowData);
  }

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

  const pkg = await loadEpisodePackage(db, opts.projectId, scriptId);
  let validationReport;
  if (pkg) {
    const dry = await dryRun(db, pkg, bundle.script);
    validationReport = dry.report;
  }

  return { scriptId, idMap, validationReport, resolvedContext, autoDesignJobId: jobId };
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

  const dry = await dryRun(db, pkg, merged.script);
  return { scriptId, idMap: sync.idMap, validationReport: dry.report };
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

export async function importSeriesBundle(db: Knex, raw: unknown, opts: Omit<ImportOptions, "targetScriptId">) {
  const { seriesBundleSchema } = await import("./schema");
  const series = seriesBundleSchema.parse(stripCommentFields(raw as Record<string, unknown>));
  const results: ImportResult[] = [];
  for (const ep of series.episodes) {
    const r = await importEpisodeBundle(db, ep, { ...opts, importMode: opts.importMode ?? "upsert" });
    results.push(r);
  }
  return results;
}

export async function dryRunImport(db: Knex, raw: unknown, opts: ImportOptions): Promise<DryRunImportSummary> {
  const kind = detectBundleType(raw);
  if (kind === "script") {
    const bundle = scriptBundleSchema.parse(stripCommentFields(raw as Record<string, unknown>));
    const exists = opts.targetScriptId
      ? Boolean(await db("o_script").where({ id: opts.targetScriptId, projectId: opts.projectId }).first())
      : false;
    return buildDryRunSummary(bundle as ScriptBundle, { ...opts, validateOnly: true }, exists);
  }
  const bundle = kind === "legacy" ? normalizeLegacyFlowData(raw as Record<string, unknown>) : { flowData: (raw as EpisodeBundle).flowData, meta: {} };
  const exists = Boolean(opts.targetScriptId);
  return buildDryRunSummary({ flowData: bundle.flowData, meta: bundle.meta } as EpisodeBundle, { ...opts, validateOnly: true }, exists);
}
