/**
 * Feature flags for realization adapt + episode AV orchestrator rollout.
 * Set REALIZATION_ADAPT_ENABLE=0 or EPISODE_AV_ENHANCE_ENABLE=0 to disable.
 */
export function isRealizationAdaptEnabled(): boolean {
  const v = String(process.env.REALIZATION_ADAPT_ENABLE ?? "1").trim();
  return v !== "0" && v.toLowerCase() !== "false";
}

export function isEpisodeAvEnhanceEnabled(): boolean {
  const v = String(process.env.EPISODE_AV_ENHANCE_ENABLE ?? "1").trim();
  return v !== "0" && v.toLowerCase() !== "false";
}

/** Batch preflight wall-clock budget (ms) before degrading to per-shot adapt only. */
export function episodePreflightBudgetMs(): number {
  const n = Number(process.env.EPISODE_AV_PREFLIGHT_BUDGET_MS ?? 8000);
  return Number.isFinite(n) && n > 0 ? n : 8000;
}
