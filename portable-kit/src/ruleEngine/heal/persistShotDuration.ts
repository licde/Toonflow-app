/**
 * Dual-write shot duration: episode package + o_storyboard (when present).
 */
import type { Knex } from "knex";
import { loadEpisodePackage, saveEpisodePackage } from "../storage/episodePackageStore";
import type { PreDesignShot } from "../bundle/types";

export function mutateShotDuration(
  shot: PreDesignShot | Record<string, unknown>,
  duration: number,
): PreDesignShot | Record<string, unknown> {
  const d = Math.max(1, Math.min(30, Math.ceil(Number(duration))));
  const s = shot as PreDesignShot & { duration?: number; narrative?: { duration?: number } };
  s.duration = d;
  s.narrative = { ...(s.narrative ?? {}), duration: d } as PreDesignShot["narrative"];
  return s;
}

export async function persistShotDuration(opts: {
  db: Knex;
  projectId: number;
  scriptId: number;
  storyboardId?: number | null;
  duration: number;
  /** In-memory shot to mutate */
  shot?: PreDesignShot | Record<string, unknown> | null;
}): Promise<{ ok: boolean; duration: number }> {
  const d = Math.max(1, Math.min(30, Math.ceil(Number(opts.duration))));
  if (opts.shot) mutateShotDuration(opts.shot, d);

  if (opts.storyboardId != null) {
    await opts.db("o_storyboard").where({ id: opts.storyboardId, projectId: opts.projectId }).update({ duration: d }).catch(() => undefined);
  }

  const pkg = await loadEpisodePackage(opts.db, opts.projectId, opts.scriptId);
  if (pkg?.shots?.length) {
    let idx = -1;
    if (opts.storyboardId != null) {
      idx = pkg.shots.findIndex((s) => s.storyboardId === opts.storyboardId);
    }
    if (idx < 0 && opts.shot) {
      const shotIndex = Number((opts.shot as { shotIndex?: number }).shotIndex ?? 0);
      if (shotIndex > 0) idx = pkg.shots.findIndex((s) => Number((s as { shotIndex?: number }).shotIndex) === shotIndex);
    }
    if (idx >= 0) {
      const target = pkg.shots[idx] as PreDesignShot & { duration?: number; narrative?: { duration?: number } };
      mutateShotDuration(target, d);
      pkg.shots[idx] = target as (typeof pkg.shots)[number];
      await saveEpisodePackage(opts.db, pkg);
      return { ok: true, duration: d };
    }
  }
  return { ok: opts.shot != null, duration: d };
}
