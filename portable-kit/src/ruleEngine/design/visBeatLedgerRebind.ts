/**
 * After visual/weapon expand: rebind peak/hook/intent/sceneRef onto children; OS/VO stay on speak.
 */
import { loadVisualBeatVocab } from "./visualBeatPolicy";

export function rebindLedgerAfterExpand(
  shots: Record<string, unknown>[],
  opts?: { literaryMode?: "structure_only" | "slice_description_confirm" },
): { shots: Record<string, unknown>[]; rebound: number } {
  const vocab = loadVisualBeatVocab();
  const osOnly = vocab.compat?.osVoKeepsDialogueOnSpeakOnly !== false;
  let rebound = 0;
  const literaryMode = opts?.literaryMode ?? "structure_only";

  const out = shots.map((s) => {
    const next = { ...s };
    const parentPeak = next.peakId ?? (next.shotDesign as { peakId?: string } | undefined)?.peakId;
    const parentHook = next.hookId ?? (next.shotDesign as { hookId?: string } | undefined)?.hookId;
    const parentScene = next.sceneRef ?? next.sceneName;

    if (next._visualSplitId || next.weaponExpandedId || next.visualSplitRole || next.weaponBeatRole) {
      if (parentPeak && !next.peakId) {
        next.peakId = parentPeak;
        rebound++;
      }
      if (parentHook && !next.hookId) {
        next.hookId = parentHook;
        rebound++;
      }
      if (parentScene && !next.sceneRef) {
        next.sceneRef = parentScene;
        rebound++;
      }
      next.packageVersion = Number(next.packageVersion ?? 0) + 1;
    }

    const tags = (next.visualBeatTags as string[]) ?? [];
    if (osOnly && tags.includes("os_vo") && next.visualSplitRole === "insert") {
      const n = (next.narrative as { dialogue?: { lines?: unknown[] } }) ?? {};
      next.narrative = { ...n, dialogue: { lines: [] } };
      next.beatRole = "action";
    }

    if (literaryMode === "structure_only") {
      // never invent visualDescription slices — keep parent text only on reaction if flagged
      if (next.visualSplitRole === "insert" && next.sliceDescriptionPending) {
        next.visualDescription = next.visualDescription; // unchanged
      }
    }

    return next;
  });

  return { shots: out, rebound };
}

/** Continuity after split: short neighbor cue only; forbid soft-ref phrases. */
export function shortContinuityAfterSplit(prevShotSize?: string, nextShotSize?: string): string {
  if (!prevShotSize || !nextShotSize) return "";
  if (prevShotSize === nextShotSize) return "";
  return `续势：${prevShotSize}→${nextShotSize}`;
}
