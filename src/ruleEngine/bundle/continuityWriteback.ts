/**
 * Continuity writeback after episode MD/GEN: persist recap + seriesContinuity seed for next episode.
 */
import type { Knex } from "knex";
import type { ScriptBundle } from "../bundle/types";

export interface SeriesContinuitySeed {
  prevEpisodeSummary: string;
  recapHint: string;
  carryInfoIds: string[];
  characterState: Record<string, string>;
  unresolvedHooks: string[];
  sourceEpisodeIndex?: number;
  writebackAt: string;
}

export interface ContinuityWritebackResult {
  written: boolean;
  recapHint?: string;
  prevEpisodeSummary?: string;
  targetKey: string;
  seriesContinuitySeed?: SeriesContinuitySeed;
}

function collectCarryIds(bundle: ScriptBundle): string[] {
  const ids = new Set<string>();
  const pd = (bundle.planData ?? {}) as Record<string, unknown>;
  const brief = (pd.narrativeBrief as Record<string, unknown> | undefined) ?? {};
  const sc = brief.seriesContinuity as { carryInfoIds?: string[] } | undefined;
  for (const id of sc?.carryInfoIds ?? []) if (id) ids.add(String(id));
  const ledger = (pd.informationLedger as { infoId?: string }[] | undefined) ?? [];
  for (const row of ledger) {
    if (row?.infoId) ids.add(String(row.infoId));
  }
  const blob = JSON.stringify(pd);
  for (const m of blob.matchAll(/\bINF-[\w-]+\b/gi)) ids.add(m[0]!.toUpperCase());
  const endHook =
    (brief.retentionBeats as { endHook?: string } | undefined)?.endHook ??
    (pd.retentionBeats as { endHook?: string } | undefined)?.endHook ??
    "";
  if (endHook.trim() && !ids.size) ids.add("carry_prev_hook");
  return [...ids];
}

/** Build next-ep seriesContinuity seed from current episode bundle. */
export function buildSeriesContinuitySeed(bundle: ScriptBundle): SeriesContinuitySeed {
  const meta = bundle.meta as { episodeIndex?: number } | undefined;
  const cont = (bundle.continuity ?? {}) as {
    recapHint?: string;
    prevEpisodeSummary?: string;
    characterState?: Record<string, string>;
    unresolvedHooks?: string[];
  };
  const endHook =
    (bundle.planData as { narrativeBrief?: { retentionBeats?: { endHook?: string } } })?.narrativeBrief
      ?.retentionBeats?.endHook ?? "";
  const recapHint = cont.recapHint?.trim() || endHook.trim();
  const prevEpisodeSummary = cont.prevEpisodeSummary?.trim() || recapHint;
  return {
    prevEpisodeSummary,
    recapHint,
    carryInfoIds: collectCarryIds(bundle),
    characterState: cont.characterState ?? {},
    unresolvedHooks: cont.unresolvedHooks ?? (endHook ? [endHook] : []),
    sourceEpisodeIndex: meta?.episodeIndex,
    writebackAt: new Date().toISOString(),
  };
}

/**
 * Hydrate ep≥2 planData.narrativeBrief.seriesContinuity from a prior writeback seed.
 * Idempotent; does not invent literary prose beyond seed fields.
 */
export function hydrateSeriesContinuityFromSeed(
  plan: Record<string, unknown>,
  seed: SeriesContinuitySeed | Record<string, unknown> | undefined,
): boolean {
  if (!seed || typeof seed !== "object") return false;
  const pd = ((plan.planData as Record<string, unknown>) ??= {});
  const brief = ((pd.narrativeBrief as Record<string, unknown>) ??= {});
  const existing = (brief.seriesContinuity as Record<string, unknown> | undefined) ?? {};
  const carry = Array.isArray((seed as SeriesContinuitySeed).carryInfoIds)
    ? (seed as SeriesContinuitySeed).carryInfoIds
    : [];
  const next = {
    ...existing,
    prevEpisodeSummary:
      String(existing.prevEpisodeSummary ?? "").trim() ||
      String((seed as SeriesContinuitySeed).prevEpisodeSummary ?? "").trim(),
    recapHint:
      String(existing.recapHint ?? "").trim() || String((seed as SeriesContinuitySeed).recapHint ?? "").trim(),
    carryInfoIds:
      Array.isArray(existing.carryInfoIds) && (existing.carryInfoIds as unknown[]).length
        ? existing.carryInfoIds
        : carry,
    characterState:
      existing.characterState && typeof existing.characterState === "object"
        ? existing.characterState
        : (seed as SeriesContinuitySeed).characterState ?? {},
    unresolvedHooks:
      Array.isArray(existing.unresolvedHooks) && (existing.unresolvedHooks as unknown[]).length
        ? existing.unresolvedHooks
        : (seed as SeriesContinuitySeed).unresolvedHooks ?? [],
    hydratedFromWriteback: true,
  };
  brief.seriesContinuity = next;
  pd.narrativeBrief = brief;
  plan.planData = pd;
  return Boolean(next.prevEpisodeSummary || (next.carryInfoIds as string[]).length);
}

export async function writeContinuityFromEpisode(
  _db: Knex,
  _projectId: number,
  bundle: ScriptBundle,
): Promise<ContinuityWritebackResult> {
  const meta = bundle.meta as { episodeKey?: string; episodeIndex?: number } | undefined;
  const seed = buildSeriesContinuitySeed(bundle);
  const targetKey = `ep-${String((meta?.episodeIndex ?? 1) + 1).padStart(2, "0")}`;

  (bundle as ScriptBundle & { continuity?: Record<string, unknown> }).continuity = {
    ...(typeof bundle.continuity === "object" && bundle.continuity ? bundle.continuity : {}),
    recapHint: seed.recapHint,
    prevEpisodeSummary: seed.prevEpisodeSummary,
    characterState: seed.characterState,
    unresolvedHooks: seed.unresolvedHooks,
    writebackAt: seed.writebackAt,
    nextEpisodeKey: targetKey,
    seriesContinuitySeed: seed,
  };

  // Also stamp current brief so SH-SERIES-CONT consumers see a record
  try {
    const pd = ((bundle.planData as Record<string, unknown>) ??= {});
    const brief = ((pd.narrativeBrief as Record<string, unknown>) ??= {});
    if (!brief.seriesContinuity || typeof brief.seriesContinuity === "string") {
      brief.seriesContinuity = {
        epSummary: seed.prevEpisodeSummary,
        carryInfoIds: seed.carryInfoIds,
        recapHint: seed.recapHint,
      };
      pd.narrativeBrief = brief;
      bundle.planData = pd as typeof bundle.planData;
    }
  } catch {
    /* optional */
  }

  return {
    written: Boolean(seed.recapHint || seed.prevEpisodeSummary || seed.carryInfoIds.length),
    recapHint: seed.recapHint,
    prevEpisodeSummary: seed.prevEpisodeSummary,
    targetKey,
    seriesContinuitySeed: seed,
  };
}

/**
 * V5-09: Load seriesContinuity seed from blueprint.seriesContinuityByEpisode[epKey]
 * into plan (idempotent hydrate).
 */
export function hydrateSeriesContinuityFromBlueprint(
  plan: Record<string, unknown>,
  blueprint: Record<string, unknown> | null | undefined,
  episodeKey?: string,
): boolean {
  if (!blueprint || typeof blueprint !== "object") return false;
  const byEp = blueprint.seriesContinuityByEpisode as Record<string, SeriesContinuitySeed> | undefined;
  if (!byEp || typeof byEp !== "object") return false;

  const meta = (plan.meta as { episodeKey?: string; episodeIndex?: number } | undefined) ?? {};
  const epIdx = Number(meta.episodeIndex ?? 0);
  const key =
    episodeKey ||
    meta.episodeKey ||
    (epIdx > 0 ? `ep-${String(epIdx).padStart(2, "0")}` : "");
  if (!key || epIdx <= 1) return false;

  const seed = byEp[key];
  if (!seed) {
    // Also try exact prev writeback target pattern
    const alt = byEp[`ep-${String(epIdx).padStart(2, "0")}`];
    if (!alt) return false;
    return hydrateSeriesContinuityFromSeed(plan, alt);
  }
  return hydrateSeriesContinuityFromSeed(plan, seed);
}
