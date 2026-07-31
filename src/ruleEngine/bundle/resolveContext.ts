import type { Knex } from "knex";
import type { ResolvedContext, ScriptBundle, ScriptBundleAnchors, ScriptBundleContinuity } from "./types";
import { loadProjectBlueprint } from "../storage/episodePackageStore";

const PLAN_DEFAULTS: Record<string, string> = {
  preCheck: "",
  adaptationMatrix: "",
  storyCore: "",
  postCheck: "",
  reinforcement: "",
  globalAnchors: "",
  storySkeleton: "",
  adaptationStrategy: "",
  script: "",
};

export async function loadPlanData(db: Knex, projectId: number): Promise<Record<string, string>> {
  const row = await db("o_agentWorkData").where({ projectId, key: "scriptAgent" }).first();
  if (!row?.data) return { ...PLAN_DEFAULTS };
  try {
    const parsed = JSON.parse(row.data as string);
    return { ...PLAN_DEFAULTS, ...parsed };
  } catch {
    return { ...PLAN_DEFAULTS };
  }
}

async function findScriptByEpisodeKey(db: Knex, projectId: number, episodeKey: string) {
  const scripts = await db("o_script").where({ projectId }).select("id", "name", "content", "createTime");
  const keyNum = episodeKey.match(/(\d+)/)?.[1];
  return scripts.find((s) => s.name === episodeKey || (keyNum && s.name?.includes(keyNum))) ?? null;
}

async function findPrevScript(
  db: Knex,
  projectId: number,
  episodeIndex?: number,
  prevEpisodeKey?: string | null,
): Promise<{ id: number; content: string; name: string } | null> {
  if (prevEpisodeKey) {
    const byKey = await findScriptByEpisodeKey(db, projectId, prevEpisodeKey);
    if (byKey) return byKey;
  }
  if (episodeIndex && episodeIndex > 1) {
    const scripts = await db("o_script").where({ projectId }).orderBy("createTime", "asc").select("id", "name", "content");
    const idx = episodeIndex - 2;
    if (scripts[idx]) return scripts[idx];
    if (scripts.length) return scripts[scripts.length - 1];
  }
  return null;
}

function tailSummary(text: string, maxLen = 500): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return t.slice(-maxLen);
}

export async function resolveContext(
  db: Knex,
  projectId: number,
  scriptId: number,
  script: string,
  opts?: {
    episodeKey?: string;
    episodeIndex?: number;
    prevEpisodeKey?: string | null;
    continuity?: ScriptBundleContinuity;
    anchors?: ScriptBundleAnchors;
  },
): Promise<ResolvedContext> {
  const warnings: string[] = [];
  const planData = await loadPlanData(db, projectId);
  const blueprint = await loadProjectBlueprint(db, projectId);
  const globalAnchors = (blueprint?.globalAnchors as Record<string, unknown>) ?? (blueprint as Record<string, unknown> | null);

  const assets = await db("o_assets")
    .where({ projectId })
    .whereNull("assetsId")
    .select("id", "name", "type");

  const prev = await findPrevScript(db, projectId, opts?.episodeIndex, opts?.prevEpisodeKey);
  let prevEpisodeSummary = opts?.continuity?.prevEpisodeSummary;
  if (!prevEpisodeSummary && prev?.content) {
    prevEpisodeSummary = tailSummary(prev.content);
  } else if (!prevEpisodeSummary && (opts?.episodeIndex ?? 1) > 1) {
    warnings.push("未找到上一集剧本，continuity.prevEpisodeSummary 为空");
  }

  const continuity: ScriptBundleContinuity = {
    ...opts?.continuity,
    prevEpisodeSummary,
    characterState: opts?.continuity?.characterState ?? {},
    unresolvedHooks: opts?.continuity?.unresolvedHooks ?? [],
    recapHint: opts?.continuity?.recapHint ?? "",
  };

  return {
    projectId,
    scriptId,
    episodeKey: opts?.episodeKey,
    episodeIndex: opts?.episodeIndex,
    script,
    prevScript: prev?.content,
    prevEpisodeSummary,
    planData,
    globalAnchors,
    assets: assets.map((a) => ({ id: a.id!, name: a.name ?? "", type: a.type ?? "" })),
    continuity,
    anchors: opts?.anchors,
    warnings,
  };
}

export async function resolveContextFromScriptBundle(db: Knex, projectId: number, scriptId: number, bundle: ScriptBundle): Promise<ResolvedContext> {
  // V5-09: hydrate seriesContinuity from blueprint writeback before merge
  try {
    const { loadProjectBlueprint } = require("../storage/episodePackageStore") as typeof import("../storage/episodePackageStore");
    const { hydrateSeriesContinuityFromBlueprint } =
      require("./continuityWriteback") as typeof import("./continuityWriteback");
    const bp = (await loadProjectBlueprint(db, projectId)) ?? {};
    const planView = bundle as unknown as Record<string, unknown>;
    hydrateSeriesContinuityFromBlueprint(planView, bp as Record<string, unknown>, bundle.meta?.episodeKey);
  } catch {
    /* optional */
  }

  const seriesCont =
    (bundle as ScriptBundle & { seriesContinuity?: Record<string, unknown> }).seriesContinuity ??
    ((bundle.planData as { narrativeBrief?: { seriesContinuity?: Record<string, unknown> } } | undefined)?.narrativeBrief
      ?.seriesContinuity as Record<string, unknown> | undefined);
  const mergedContinuity: ScriptBundleContinuity = {
    ...(typeof bundle.continuity === "object" && bundle.continuity ? bundle.continuity : {}),
  };
  if (seriesCont) {
    if (typeof seriesCont.prevEpisodeSummary === "string") mergedContinuity.prevEpisodeSummary = seriesCont.prevEpisodeSummary;
    if (typeof seriesCont.recapHint === "string") mergedContinuity.recapHint = seriesCont.recapHint;
    if (seriesCont.characterState && typeof seriesCont.characterState === "object") {
      const cs: Record<string, string> = {};
      for (const [k, v] of Object.entries(seriesCont.characterState as Record<string, unknown>)) {
        if (v != null) cs[k] = String(v);
      }
      mergedContinuity.characterState = cs;
    }
    if (Array.isArray(seriesCont.unresolvedHooks)) {
      mergedContinuity.unresolvedHooks = seriesCont.unresolvedHooks.map(String);
    }
  }
  const ctx = await resolveContext(db, projectId, scriptId, bundle.script, {
    episodeKey: bundle.meta.episodeKey,
    episodeIndex: bundle.meta.episodeIndex,
    prevEpisodeKey: bundle.meta.prevEpisodeKey,
    continuity: mergedContinuity,
    anchors: bundle.anchors,
  });
  return { ...ctx, designBrief: bundle.designBrief, seriesContinuity: seriesCont };
}
