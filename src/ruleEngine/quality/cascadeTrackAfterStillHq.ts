/**
 * Cascade video track state after still hq_ok + visualPass (GAP-STILL-HQ-CASCADE).
 */
import type { Knex } from "knex";

export async function cascadeTrackAfterStillHqOk(opts: {
  db: Knex;
  storyboardId: number;
  stillQuality: string;
  visualPass?: boolean | null;
  litDebt?: boolean;
  /** Contact/geom items not human-cleared → never burnAllowed */
  contactPendingHuman?: boolean;
}): Promise<{ updated: number }> {
  if (opts.stillQuality !== "hq_ok" || opts.visualPass !== true || opts.litDebt) {
    return { updated: 0 };
  }
  if (opts.contactPendingHuman) {
    return { updated: 0 };
  }
  const sb = await opts.db("o_storyboard").where({ id: opts.storyboardId }).select("trackId").first();
  const trackIds = new Set<number>();
  if (sb?.trackId != null) trackIds.add(Number(sb.trackId));
  try {
    const legacy = await opts.db("o_videoTrack").where({ storyboardId: opts.storyboardId }).select("id");
    for (const tr of legacy as { id: number }[]) trackIds.add(Number(tr.id));
  } catch {
    /* column may not exist */
  }
  let updated = 0;
  for (const trackId of trackIds) {
    const tr = await opts.db("o_videoTrack").where({ id: trackId }).select("id", "state", "reason").first();
    if (!tr) continue;
    let prev: Record<string, unknown> = {};
    try {
      prev = tr.reason ? JSON.parse(String(tr.reason)) : {};
    } catch {
      prev = {};
    }
    const nextReason = {
      ...prev,
      burnAllowed: true,
      stillHqCascadeAt: new Date().toISOString(),
      qcWeak: prev.qcWeak === true ? true : undefined,
    };
    const patch: Record<string, unknown> = { reason: JSON.stringify(nextReason) };
    if (String(tr.state ?? "") === "需完善") patch.state = "已完成";
    await opts.db("o_videoTrack").where({ id: trackId }).update(patch);
    updated += 1;
  }
  return { updated };
}
