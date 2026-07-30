/**
 * Continuity writeback after episode MD/GEN: persist recap for next episode resolveContext.
 */
import type { Knex } from "knex";
import type { ScriptBundle } from "../bundle/types";

export interface ContinuityWritebackResult {
  written: boolean;
  recapHint?: string;
  prevEpisodeSummary?: string;
  targetKey: string;
}

export async function writeContinuityFromEpisode(
  _db: Knex,
  _projectId: number,
  bundle: ScriptBundle,
): Promise<ContinuityWritebackResult> {
  const meta = bundle.meta as { episodeKey?: string; episodeIndex?: number } | undefined;
  const cont = (bundle.continuity ?? {}) as {
    recapHint?: string;
    prevEpisodeSummary?: string;
    carryInfoIds?: string[];
  };
  const endHook =
    (bundle.planData as { narrativeBrief?: { retentionBeats?: { endHook?: string } } })?.narrativeBrief?.retentionBeats
      ?.endHook ?? "";
  const recapHint = cont.recapHint?.trim() || endHook;
  const prevEpisodeSummary = cont.prevEpisodeSummary?.trim() || recapHint;
  const targetKey = `ep-${String((meta?.episodeIndex ?? 1) + 1).padStart(2, "0")}`;

  // Persist onto bundle continuity blob (caller saves episode package / blueprint)
  (bundle as ScriptBundle & { continuity?: Record<string, unknown> }).continuity = {
    ...(typeof bundle.continuity === "object" && bundle.continuity ? bundle.continuity : {}),
    recapHint,
    prevEpisodeSummary,
    writebackAt: new Date().toISOString(),
    nextEpisodeKey: targetKey,
  };

  return {
    written: Boolean(recapHint || prevEpisodeSummary),
    recapHint,
    prevEpisodeSummary,
    targetKey,
  };
}
