/**
 * Episode-level still readiness — contact/anchor shots must be hq or human-pass before batch burn.
 */
export type EpisodeStillRow = {
  storyboardId?: number;
  stillQuality?: string | null;
  visualPassAt?: string | null;
  visualDescription?: string | null;
  reason?: unknown;
};

export function auditEpisodeStillReadiness(rows: EpisodeStillRow[]): {
  ok: boolean;
  blockers: Array<{ storyboardId?: number; code: string; message: string }>;
} {
  const blockers: Array<{ storyboardId?: number; code: string; message: string }> = [];
  let contactPolicy: typeof import("../compilers/contactEventPolicy") | null = null;
  try {
    contactPolicy = require("../compilers/contactEventPolicy") as typeof import("../compilers/contactEventPolicy");
  } catch {
    contactPolicy = null;
  }
  for (const r of rows) {
    const vd = String(r.visualDescription ?? "");
    const isContact = contactPolicy?.isContactEventVd(vd) ?? /休书|纸角|划过|贴合/.test(vd);
    if (!isContact) continue;
    const sq = String(r.stillQuality ?? "").trim();
    const humanOk = Boolean(r.visualPassAt);
    if (sq !== "hq_ok" && !humanOk) {
      blockers.push({
        storyboardId: r.storyboardId,
        code: "EPISODE-STILL-WEAK",
        message: `接触镜 ${r.storyboardId ?? "?"} 静照未 hq/人审，整轨禁批量烧片`,
      });
    }
  }
  return { ok: blockers.length === 0, blockers };
}
