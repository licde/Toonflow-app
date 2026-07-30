/**
 * N1/N3: narrative beat phases + packaging dedicated shot markers.
 */
import { loadEmotionDrivenDesign, type EmotionPhase } from "../emotion/emotionNorm";

const PHASE_ORDER: EmotionPhase[] = ["suppress", "signal", "burst", "release", "hook"];

export function ensureNarrativeBeats(
  sceneMeta: Record<string, unknown>[],
): { sceneMeta: Record<string, unknown>[]; assigned: number } {
  const phases = (loadEmotionDrivenDesign().emotionPhases as EmotionPhase[]) ?? PHASE_ORDER;
  let assigned = 0;
  const next = sceneMeta.map((m, i) => {
    if (String(m.emotionPhase ?? "").trim()) return m;
    const phase = phases[Math.min(i, phases.length - 1)] ?? "signal";
    assigned++;
    return { ...m, emotionPhase: phase };
  });
  return { sceneMeta: next, assigned };
}

/** Mark packaging roles on sceneMeta / shots without rewriting literary text. */
export function packagingDedicatedShots(
  shots: Record<string, unknown>[],
  opts?: { ensureDebut?: boolean; ensureHook?: boolean },
): { shots: Record<string, unknown>[]; marked: string[] } {
  const marked: string[] = [];
  if (!shots.length) return { shots, marked };
  const out = shots.map((s) => ({ ...s }));
  if (opts?.ensureDebut !== false) {
    const first = out[0];
    if (!first.packagingRole) {
      first.packagingRole = "debut";
      marked.push("debut");
    }
  }
  if (opts?.ensureHook !== false) {
    const last = out[out.length - 1];
    if (!last.packagingRole || last.packagingRole === "debut") {
      if (out.length === 1) {
        last.packagingRole = "debut_hook";
        marked.push("debut_hook");
      } else {
        last.packagingRole = "hook";
        marked.push("hook");
      }
    }
  }
  // optional mid clip marker
  if (out.length >= 3) {
    const mid = out[Math.floor(out.length / 2)];
    if (!mid.packagingRole) {
      mid.packagingRole = "clip";
      marked.push("clip");
    }
  }
  return { shots: out, marked };
}
