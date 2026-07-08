import type { StructuredShot } from "../structuredScript/types";
import { isMemoryPointShot } from "../structuredScript/utils";
import type { ModelCapabilities } from "./types";
import { getModelCapabilities } from "./ModelCapabilityRegistry";

export interface RouteDecision {
  imageModel: string;
  videoModel: string;
  tier: "T1" | "T2" | "T3";
  resolution: string;
}

/** 按镜 type/dialogue/记忆点 路由模型 */
export function routeModels(
  shot: StructuredShot,
  projectModels: { imageModel: string; videoModel: string },
  opts?: { productLayer?: Record<string, unknown> },
): RouteDecision {
  const caps = getModelCapabilities(projectModels.imageModel, projectModels.videoModel);
  const vendor = caps.vendorId;
  const memory = opts?.productLayer ? isMemoryPointShot(shot.镜号, opts.productLayer) : false;
  const hasDialogue = !!(shot.dialogue?.text || shot.voiceover);
  const enhanced = memory || shot.personalitySwitch?.enabled || (shot.emotionIntensity ?? 0) >= 4;

  let tier: "T1" | "T2" | "T3" = "T2";
  if (shot.type === "PURE-SCENE" || shot.type === "PURE-PROP") tier = "T1";
  else if (enhanced) tier = "T3";

  const resolution = tier === "T3" ? "1080p" : tier === "T1" ? "720p" : "720p";

  return {
    imageModel: `${vendor}:${caps.imageModel}`,
    videoModel: `${vendor}:${caps.videoModel}`,
    tier,
    resolution,
  };
}

export function shouldUseStructuredDefault(projectModels: { imageModel?: string; videoModel?: string }): boolean {
  return !projectModels.videoModel || projectModels.videoModel.startsWith("agnesai:");
}
