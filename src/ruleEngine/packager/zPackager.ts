import type { EpisodePackage, EpisodeShot } from "../types";

export function buildZ107(pkg: EpisodePackage) {
  return { episodeId: pkg.scriptId, shots: pkg.shots.length, meta: pkg.scriptMeta };
}

export function buildZ108(pkg: EpisodePackage) {
  return {
    scriptId: pkg.scriptId,
    prompts: pkg.shots.map((s: EpisodeShot) => ({
      shotId: s.id,
      image: s.generation.compiled?.image,
      video: s.generation.compiled?.video,
      audio: s.generation.compiled?.audio,
    })),
  };
}

export function buildZ109(pkg: EpisodePackage) {
  return {
    tracks: {
      video: pkg.shots.map((s: EpisodeShot, i: number) => ({ shotId: s.id, index: i, duration: s.narrative.duration })),
      audio: pkg.shots.map((s: EpisodeShot) => ({ shotId: s.id, sfx: s.narrative.sound?.sfx, bgm: s.narrative.sound?.bgm })),
      subtitle: pkg.shots
        .filter((s: EpisodeShot) => s.narrative.dialogue?.lines)
        .map((s: EpisodeShot) => ({ shotId: s.id, text: s.narrative.dialogue?.lines, type: s.narrative.dialogue?.type })),
    },
  };
}

export function buildZ110(pkg: EpisodePackage) {
  return { preview: buildZ109(pkg), exportReady: false, note: "PostProd P2" };
}

export function exportPackage(pkg: EpisodePackage) {
  return { Z107: buildZ107(pkg), Z108: buildZ108(pkg), Z109: buildZ109(pkg), Z110: buildZ110(pkg) };
}
