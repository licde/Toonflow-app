import type { StructuredEpisode, StructuredShot } from "../structuredScript/types";
import { isMemoryPointShot, parseShotNumbersFromNotes } from "../structuredScript/utils";

/** directorNotes + keyPrompts + 记忆点升档 */
export function matchCreativeIntent(
  shot: StructuredShot,
  episode?: StructuredEpisode,
): { imageOverride?: string; videoOverride?: string; tier: "T1" | "T2" | "T3" } {
  let tier: "T1" | "T2" | "T3" = "T2";
  const directorMap = episode?.directorNotes ? parseShotNumbersFromNotes(episode.directorNotes) : new Map();
  const memory = episode?.productLayer ? isMemoryPointShot(shot.镜号, episode.productLayer as Record<string, unknown>) : false;

  if (memory || directorMap.has(shot.镜号) || (shot.emotionIntensity ?? 0) >= 4) {
    tier = "T3";
  } else if (shot.type === "PURE-SCENE" || shot.type === "PURE-PROP") {
    tier = "T1";
  }

  let imageOverride: string | undefined;
  let videoOverride: string | undefined;
  const sceneKey = shot.sceneName?.split("_")[0]?.toLowerCase();
  for (const kp of episode?.keyPrompts ?? []) {
    if (kp.scene && sceneKey && kp.scene.toLowerCase().includes(sceneKey.slice(0, 4))) {
      imageOverride = kp.imagePrompt;
      videoOverride = kp.videoPrompt;
      break;
    }
  }

  return { imageOverride, videoOverride, tier };
}
