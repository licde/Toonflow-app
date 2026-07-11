import type { ExpandedShotTask, EpisodePackage } from "./types";

export function expandTracksToShots(
  pkg: EpisodePackage,
  tracks: { trackId: number; storyboardId: number; prompt?: string; duration?: number }[],
): ExpandedShotTask[] {
  return tracks.map((t) => {
    const shot = pkg.shots.find((s) => s.storyboardId === t.storyboardId) ?? pkg.shots[t.storyboardId];
    if (!shot) {
      throw new Error(`未找到镜 storyboardId=${t.storyboardId}`);
    }
    const compiled = shot.generation.compiled;
    if (!compiled?.video) throw new Error(`镜 ${shot.id} 未编译 video prompt`);
    return {
      storyboardId: t.storyboardId,
      trackId: t.trackId,
      shot,
      compiled: {
        image: compiled.image,
        video: t.prompt && t.prompt !== compiled.video ? t.prompt : compiled.video,
        audio: compiled.audio,
        hash: compiled.hash,
      },
    };
  });
}
