/**
 * humanRepairFeedback — normalize successful human interventions for future replay.
 */
export function buildHumanRepairFeedback(input: {
  storyboardId?: number | null;
  changedFields?: string[] | null;
  reason?: string | null;
}): { learningKey: string; changedFields: string[]; reason?: string } {
  return {
    learningKey: `sb:${Number(input.storyboardId ?? 0) || "unknown"}`,
    changedFields: [...new Set((input.changedFields ?? []).map((s) => String(s).trim()).filter(Boolean))],
    reason: String(input.reason ?? "").trim() || undefined,
  };
}
