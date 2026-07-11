import type { EpisodeShot } from "./types";

export function calcDurationFromDialogue(lines: string, speechSpeed = 4): number {
  const chars = (lines.match(/[\u4e00-\u9fff]/g) || []).length;
  return Math.max(0.3, Math.round((chars / speechSpeed) * 10) / 10);
}

export function applyDurationCalculator(shots: EpisodeShot[], speechSpeed = 4): EpisodeShot[] {
  return shots.map((s) => {
    const lines = s.narrative.dialogue?.lines ?? s.narrative.lines ?? "";
    const fromDialogue = lines ? calcDurationFromDialogue(lines, speechSpeed) : 0;
    const duration = Math.max(s.narrative.duration ?? 0, fromDialogue, 0.3);
    return { ...s, narrative: { ...s.narrative, duration } };
  });
}
