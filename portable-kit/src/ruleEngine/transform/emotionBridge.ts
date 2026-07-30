import type { EpisodeShot } from "../types";

const EMOTION_SHOT_MAP: Record<number, string> = {
  1: "wide shot",
  2: "wide shot",
  3: "medium shot",
  4: "medium shot",
  5: "close-up",
  6: "close-up",
  7: "extreme close-up",
  8: "extreme close-up",
  9: "extreme close-up",
  10: "extreme close-up",
};

const EMOTION_LIGHT_MAP: Record<number, string> = {
  1: "soft light 4000K",
  2: "soft light 4200K",
  3: "4500K",
  4: "4500K",
  5: "hard light",
  6: "high contrast",
  7: "high contrast dark",
  8: "dramatic rim light",
  9: "dramatic rim light",
  10: "extreme contrast",
};

export function transformEmotionToShotSize(emotion?: number): string {
  const e = Math.min(10, Math.max(1, emotion ?? 4));
  return EMOTION_SHOT_MAP[e] ?? "medium shot";
}

export function transformEmotionToLight(emotion?: number): string {
  const e = Math.min(10, Math.max(1, emotion ?? 4));
  return EMOTION_LIGHT_MAP[e] ?? "4500K";
}

export function enrichShotNarrative(shot: EpisodeShot): EpisodeShot {
  const emotion = shot.narrative.emotionIntensity ?? 4;
  return {
    ...shot,
    narrative: {
      ...shot.narrative,
      shotSize: shot.narrative.shotSize ?? transformEmotionToShotSize(emotion),
      colorTone: shot.narrative.colorTone ?? transformEmotionToLight(emotion),
      performance: shot.narrative.performance ?? {
        bodyWeight: "neutral",
        gaze: "forward",
        breath: "steady",
        microExpression: { flush: false, eyes: "open", pupil: "normal", mouthDetail: "closed" },
      },
      sound: shot.narrative.sound ?? { dialogue: Boolean(shot.narrative.lines), bgm: "none" },
    },
  };
}

export function transformShots(shots: EpisodeShot[]): EpisodeShot[] {
  return shots.map(enrichShotNarrative);
}
