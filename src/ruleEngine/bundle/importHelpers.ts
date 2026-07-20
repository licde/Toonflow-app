import type { Knex } from "knex";
import type { BundleMeta, ImportMode, MergeReport, MergeStrategy, ScriptBundle } from "./types";

export type UpsertAction = "create" | "update" | "match";

export interface UpsertScriptResult {
  scriptId: number;
  action: UpsertAction;
  matchedBy?: "targetScriptId" | "meta.scriptId" | "episodeKey" | "episodeName";
}

export async function upsertScriptWithMode(
  db: Knex,
  projectId: number,
  script: string,
  meta: BundleMeta,
  opts: { targetScriptId?: number; importMode?: ImportMode },
): Promise<UpsertScriptResult> {
  const importMode = opts.importMode ?? "upsert";
  const metaScriptId = meta.scriptId && meta.scriptId > 0 ? meta.scriptId : undefined;
  const effectiveTarget = opts.targetScriptId ?? metaScriptId;

  if (importMode === "update" && !effectiveTarget && !meta.episodeKey && !meta.episodeName) {
    throw new Error("importMode=update 需要 targetScriptId、meta.scriptId 或 episodeKey 匹配已有集");
  }

  if (effectiveTarget) {
    const row = await db("o_script").where({ id: effectiveTarget, projectId }).first();
    if (!row) {
      if (importMode === "update") throw new Error(`目标剧本不存在: scriptId=${effectiveTarget}`);
    } else {
      await db("o_script")
        .where({ id: effectiveTarget, projectId })
        .update({ content: script, name: meta.episodeName ?? meta.episodeKey ?? row.name });
      return { scriptId: effectiveTarget, action: "update", matchedBy: opts.targetScriptId ? "targetScriptId" : "meta.scriptId" };
    }
  }

  if (importMode === "create") {
    const name = meta.episodeName || meta.episodeKey || `第${meta.episodeIndex ?? 1}集`;
    const [scriptId] = await db("o_script").insert({
      projectId,
      name,
      content: script,
      createTime: Date.now(),
    });
    return { scriptId, action: "create" };
  }

  if (meta.episodeKey || meta.episodeName) {
    const scripts = await db("o_script").where({ projectId }).select("id", "name");
    const key = meta.episodeKey;
    const name = meta.episodeName;
    const match = scripts.find((s) => s.name === key || s.name === name);
    if (match) {
      await db("o_script").where("id", match.id).update({ content: script });
      return {
        scriptId: match.id!,
        action: importMode === "upsert" ? "match" : "update",
        matchedBy: match.name === key ? "episodeKey" : "episodeName",
      };
    }
    if (importMode === "update") {
      throw new Error(`importMode=update 未找到 episodeKey/name 匹配的剧本`);
    }
  }

  const name = meta.episodeName || meta.episodeKey || `第${meta.episodeIndex ?? 1}集`;
  const [scriptId] = await db("o_script").insert({
    projectId,
    name,
    content: script,
    createTime: Date.now(),
  });
  return { scriptId, action: "create" };
}

export async function predictScriptUpsert(
  db: Knex,
  projectId: number,
  meta: BundleMeta,
  opts: { targetScriptId?: number; importMode?: ImportMode },
): Promise<{ scriptId: number | null; action: UpsertAction; wouldCreate: boolean }> {
  const importMode = opts.importMode ?? "upsert";
  const metaScriptId = meta.scriptId && meta.scriptId > 0 ? meta.scriptId : undefined;
  const effectiveTarget = opts.targetScriptId ?? metaScriptId;

  if (effectiveTarget) {
    const row = await db("o_script").where({ id: effectiveTarget, projectId }).first();
    if (row) return { scriptId: effectiveTarget, action: "update", wouldCreate: false };
    if (importMode === "update") return { scriptId: null, action: "update", wouldCreate: false };
  }

  if (importMode === "create") return { scriptId: null, action: "create", wouldCreate: true };

  if (meta.episodeKey || meta.episodeName) {
    const scripts = await db("o_script").where({ projectId }).select("id", "name");
    const match = scripts.find((s) => s.name === meta.episodeKey || s.name === meta.episodeName);
    if (match) return { scriptId: match.id!, action: "match", wouldCreate: false };
    if (importMode === "update") return { scriptId: null, action: "update", wouldCreate: false };
  }

  return { scriptId: null, action: "create", wouldCreate: true };
}

export function mergePlanDataFields(existing: Record<string, unknown>, incoming: Record<string, unknown>): Record<string, unknown> {
  const merged = { ...existing };
  for (const [k, v] of Object.entries(incoming)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "object" && !Array.isArray(v) && v !== null && typeof merged[k] === "object" && merged[k] !== null && !Array.isArray(merged[k])) {
      merged[k] = { ...(merged[k] as Record<string, unknown>), ...(v as Record<string, unknown>) };
    } else {
      merged[k] = v;
    }
  }
  return merged;
}

export function resolveImportMergeStrategy(opts: {
  importMode?: ImportMode;
  mergeStrategy?: MergeStrategy;
}): MergeStrategy {
  if (opts.mergeStrategy) return opts.mergeStrategy;
  // update/upsert keep generated storyboard images by default; create may replaceAll
  if (opts.importMode === "create") return "replaceAll";
  return "preserveMedia";
}

export function buildMergeReport(parts: {
  action: UpsertAction;
  scriptId: number;
  storyboardReplaced?: boolean;
  storyboardCount?: number;
  blueprintMerged?: boolean;
  assetsSeeded?: number;
  importMode?: ImportMode;
  mergeStrategy?: MergeStrategy;
  mediaPreservedCount?: number;
  assetClosure?: MergeReport["assetClosure"];
  assetDiagnostics?: MergeReport["assetDiagnostics"];
}): MergeReport {
  return {
    action: parts.action,
    scriptId: parts.scriptId,
    storyboardReplaced: parts.storyboardReplaced ?? false,
    storyboardCount: parts.storyboardCount ?? 0,
    blueprintMerged: parts.blueprintMerged ?? false,
    assetsSeeded: parts.assetsSeeded ?? 0,
    importMode: parts.importMode,
    mergeStrategy: parts.mergeStrategy,
    mediaPreservedCount: parts.mediaPreservedCount ?? 0,
    assetClosure: parts.assetClosure,
    assetDiagnostics: parts.assetDiagnostics,
  };
}

export function isT3Bundle(bundle: ScriptBundle): boolean {
  return Boolean(
    bundle.preDesignPack?.shots?.length ||
      bundle.modalityPromptAudit ||
      bundle.characterDesign ||
      bundle.preDesignPack?.shots?.some((s) => s.generation?.imagePrompt),
  );
}

export function buildImportPathGuard(bundle: ScriptBundle | null, opts: { viaEnterProduction?: boolean }): {
  recommended: "importScript" | "enterProduction";
  severity: "INFO" | "WARN";
  message: string;
} | undefined {
  if (!opts.viaEnterProduction) return undefined;
  if (bundle && isT3Bundle(bundle)) {
    return {
      recommended: "importScript",
      severity: "WARN",
      message: "T3 完整 bundle 请使用 POST /api/ruleEngine/importScript；enterProduction 仅更新剧本文本，不携带 preDesignPack/generation",
    };
  }
  return {
    recommended: "importScript",
    severity: "INFO",
    message: "若 Chat 已导出含 preDesignPack 的 bundle，请使用 importScript 以写入分镜四槽提示词",
  };
}
