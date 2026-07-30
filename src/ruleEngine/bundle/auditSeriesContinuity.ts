/**
 * Cross-episode series continuity audit (ep≥2).
 * Mounted as WARN at design phase / designExit — BLOCK only when causal chain claims carry but none present.
 */
export type SeriesContFinding = {
  id: string;
  severity: "BLOCK" | "WARN";
  message: string;
  field?: string;
};

export function auditSeriesContinuity(input: {
  episodeIndex?: number;
  seriesContinuity?: Record<string, unknown> | string | null;
  continuity?: { prevEpisodeSummary?: string; recapHint?: string } | null;
}): { ok: boolean; findings: SeriesContFinding[] } {
  const ep = Number(input.episodeIndex ?? 1);
  const findings: SeriesContFinding[] = [];
  if (ep <= 1) return { ok: true, findings };

  let sc: Record<string, unknown> = {};
  if (typeof input.seriesContinuity === "string") {
    findings.push({
      id: "SH-SERIES-CONT",
      severity: "WARN",
      message: "seriesContinuity 仍为散文 string — 须 salvage 为 record（ep≥2）",
      field: "planData.narrativeBrief.seriesContinuity",
    });
  } else if (input.seriesContinuity && typeof input.seriesContinuity === "object") {
    sc = input.seriesContinuity;
  }

  const prev =
    String(sc.prevEpisodeSummary ?? sc.ep1Summary ?? sc.epSummary ?? "").trim() ||
    String(input.continuity?.prevEpisodeSummary ?? "").trim();
  const carry = Array.isArray(sc.carryInfoIds) ? (sc.carryInfoIds as unknown[]).map(String).filter(Boolean) : [];

  if (!prev) {
    findings.push({
      id: "SERIES-CONT-PREV",
      severity: "WARN",
      message: `ep${ep} 缺 prevEpisodeSummary/recap — 跨集写回未 hydrate`,
      field: "seriesContinuity.prevEpisodeSummary",
    });
  }
  if (!carry.length) {
    findings.push({
      id: "SERIES-CONT-CARRY",
      severity: "BLOCK",
      message: `ep${ep} 缺 carryInfoIds — 因果承接断链（designExit causal）`,
      field: "seriesContinuity.carryInfoIds",
    });
  }

  return { ok: findings.filter((f) => f.severity === "BLOCK").length === 0, findings };
}
