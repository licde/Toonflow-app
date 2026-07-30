/**
 * L-t18: Migrate stock multi-beat shots in-memory (flag-gated via meta.pillarsStillOneBeatMigrate).
 */
import { expandStillOneBeat } from "./expandStillOneBeat";
import { recomposeChildrenAfterSplit } from "./recomposeAfterSplit";
import { cascadeForwardStale } from "../quality/forwardStaleCascade";
import { shouldWarnOneBeat } from "../compilers/stillIdentitySsot";

export function shouldMigrateMultiBeat(meta?: Record<string, unknown> | null): boolean {
  if (!meta) return false;
  const flag = meta.pillarsStillOneBeatMigrate;
  if (flag === false || flag === "off") return false;
  if (flag === true || flag === "enforce" || flag === "migrate") return true;
  // Default: migrate when VisBeat enforce is on
  return String(meta.pillarsVisBeatV2 ?? "") === "enforce";
}

export function migrateMultiBeatStockShots(
  shots: Record<string, unknown>[],
  opts?: { meta?: Record<string, unknown> | null; maxExpand?: number },
): {
  shots: Record<string, unknown>[];
  migrated: number;
  refused: number;
  log: string[];
} {
  if (!shouldMigrateMultiBeat(opts?.meta)) {
    return { shots, migrated: 0, refused: 0, log: ["migrate_skipped_flag"] };
  }
  const dirty = shots.filter((s) => !s._stillBeatSplitId && shouldWarnOneBeat(String(s.visualDescription ?? "")));
  if (!dirty.length) return { shots, migrated: 0, refused: 0, log: [] };

  const exp = expandStillOneBeat(shots, { maxExpand: opts?.maxExpand ?? 40 });
  const recomposed = recomposeChildrenAfterSplit(exp.shots);
  cascadeForwardStale({ shots: recomposed.shots, forwardStages: ["SB", "MD-IMG", "EN"] });
  return {
    shots: recomposed.shots,
    migrated: exp.expandedCount,
    refused: exp.refused,
    log: [...exp.log, `recompose:${recomposed.recomposed}`],
  };
}
