import type { EpisodeShot } from "./types";
import { calcMinDurationSec, countDialogueChars, measureDialogue, suggestShotDuration } from "./dialogueMetrics";
import { flattenDialogueText } from "./design/dialogueCoverage";

/** @deprecated use dialogueMetrics.calcMinDurationSec — kept for existing imports */
export function calcDurationFromDialogue(lines: string, speechSpeed = 4): number {
  return calcMinDurationSec(countDialogueChars(lines), speechSpeed);
}

export function dialogueTextFromShot(s: EpisodeShot): string {
  const raw = s.narrative.dialogue?.lines ?? s.narrative.lines ?? "";
  return flattenDialogueText(raw);
}

/** Raise shot duration to dialogue minimum (PR-09); no-op when no dialogue. */
export function applyDurationCalculator(shots: EpisodeShot[], speechSpeed = 4): EpisodeShot[] {
  return shots.map((s) => {
    const text = dialogueTextFromShot(s);
    if (!text.trim()) return s;
    const metrics = measureDialogue({ text, speechSpeed });
    const duration = suggestShotDuration(s.narrative.duration ?? 0, metrics);
    if (duration === s.narrative.duration) return s;
    return { ...s, narrative: { ...s.narrative, duration } };
  });
}

export { measureDialogue, suggestShotDuration, calcMinDurationSec };
