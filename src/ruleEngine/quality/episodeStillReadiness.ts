/**
 * Episode still readiness — weak contact shots enter heal queue; do not brick whole-batch burn.
 */
export type EpisodeStillRow = {
  storyboardId?: number;
  stillQuality?: string | null;
  visualPassAt?: string | null;
  visualDescription?: string | null;
  reason?: unknown;
  deliveryTier?: string | null;
};

export type EpisodeStillAudit = {
  /** True when at least one shot is burn-eligible (or no contact shots). */
  ok: boolean;
  /** Whole-batch brick disabled — use healQueue + burnableIds instead. */
  blockers: Array<{ storyboardId?: number; code: string; message: string }>;
  healQueue: Array<{ storyboardId?: number; code: string; message: string }>;
  burnableIds: number[];
  skipIds: number[];
};

export function auditEpisodeStillReadiness(rows: EpisodeStillRow[]): EpisodeStillAudit {
  const blockers: EpisodeStillAudit["blockers"] = [];
  const healQueue: EpisodeStillAudit["healQueue"] = [];
  const burnableIds: number[] = [];
  const skipIds: number[] = [];
  let contactPolicy: typeof import("../compilers/contactEventPolicy") | null = null;
  try {
    contactPolicy = require("../compilers/contactEventPolicy") as typeof import("../compilers/contactEventPolicy");
  } catch {
    contactPolicy = null;
  }

  for (const r of rows) {
    const id = Number(r.storyboardId);
    const vd = String(r.visualDescription ?? "");
    const isContact = contactPolicy?.isContactEventVd(vd) ?? /休书|纸角|划过|贴合/.test(vd);
    const sq = String(r.stillQuality ?? "").trim();
    const humanOk = Boolean(r.visualPassAt);
    const burnOk = sq === "hq_ok" || humanOk || r.deliveryTier === "burn";

    if (!isContact) {
      if (Number.isFinite(id) && (burnOk || sq === "hq_ok" || !sq || sq === "missing")) {
        // Non-contact: allow burn when hq or missing-not-contact
        if (burnOk) burnableIds.push(id);
        else if (sq && sq !== "hq_ok") {
          skipIds.push(id);
          healQueue.push({
            storyboardId: r.storyboardId,
            code: "EPISODE-STILL-HEAL",
            message: `镜 ${r.storyboardId ?? "?"} 静照未 hq，跳过本镜烧片并入修复队列`,
          });
        } else if (Number.isFinite(id)) {
          burnableIds.push(id);
        }
      }
      continue;
    }

    if (burnOk) {
      if (Number.isFinite(id)) burnableIds.push(id);
      continue;
    }

    // Contact weak: queue heal — do NOT push global EPISODE-STILL-WEAK blocker
    if (Number.isFinite(id)) skipIds.push(id);
    healQueue.push({
      storyboardId: r.storyboardId,
      code: "EPISODE-STILL-HEAL",
      message: `接触镜 ${r.storyboardId ?? "?"} 静照未 hq/人审，已入分镜修复队列（不砖整集）`,
    });
  }

  // ok if we can burn something, or there is nothing to burn
  const ok = healQueue.length === 0 || burnableIds.length > 0 || rows.length === 0;
  return { ok, blockers, healQueue, burnableIds, skipIds };
}