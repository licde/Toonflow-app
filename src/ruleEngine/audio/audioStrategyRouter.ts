import type { EpisodeShot } from "../types";

export type AudioPath = "dialogue-native" | "tts-dubbing" | "sfx-native" | "post-bgm";

export function routeAudioStrategy(
  shot: EpisodeShot,
  opts: { ttsDubbing: boolean; vendorSupportsNative: boolean },
): { path: AudioPath; generateAudio: boolean } {
  const lines = shot.narrative.dialogue?.lines ?? shot.narrative.lines ?? "";
  const sfx = shot.narrative.sound?.sfx;
  if (lines && opts.vendorSupportsNative) return { path: "dialogue-native", generateAudio: true };
  if (lines && opts.ttsDubbing) return { path: "tts-dubbing", generateAudio: true };
  if (sfx) return { path: "sfx-native", generateAudio: true };
  if (shot.narrative.sound?.bgm && shot.narrative.sound.bgm !== "none") return { path: "post-bgm", generateAudio: false };
  return { path: "post-bgm", generateAudio: false };
}
