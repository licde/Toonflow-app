/**
 * Design re-entry: if visualDescription became multi-beat again, re-expand.
 */
import { expandStillOneBeat } from "./expandStillOneBeat";
import { shouldWarnOneBeat } from "../compilers/stillIdentitySsot";
import { cascadeForwardStale } from "../quality/forwardStaleCascade";

export function reenterStillOneBeatOnShots(
  shots: Record<string, unknown>[],
  opts?: { meta?: Record<string, unknown> | null },
): {
  shots: Record<string, unknown>[];
  reexpanded: number;
  staleCascade?: { markedStale: number; clearedVideoPass: number };
} {
  const need = shots.some((s) => {
    if (s.visBeatOverride) return false;
    return shouldWarnOneBeat(String(s.visualDescription ?? ""));
  });
  if (!need) return { shots, reexpanded: 0 };

  // Drop prior still-onebeat children of parents that are multi-beat again is handled by expand
  // skipping only _stillBeatSplitId without re-checking parent — force clear refuse flags
  const cleaned = shots.map((s) => {
    if (s.stillOneBeatRefuse) {
      const { stillOneBeatRefuse: _, stillOneBeatConfidence: __, ...rest } = s as Record<string, unknown> & {
        stillOneBeatRefuse?: boolean;
        stillOneBeatConfidence?: number;
      };
      return rest;
    }
    return s;
  });

  const exp = expandStillOneBeat(cleaned, { maxExpand: 40 });
  if (!exp.expandedCount) return { shots: exp.shots, reexpanded: 0 };

  const casc = cascadeForwardStale({
    shots: exp.shots,
    forwardStages: ["SB", "MD-IMG", "EN", ...(opts?.meta ? [] : [])],
  });
  return {
    shots: exp.shots,
    reexpanded: exp.expandedCount,
    staleCascade: { markedStale: casc.markedStale, clearedVideoPass: casc.clearedVideoPass },
  };
}
