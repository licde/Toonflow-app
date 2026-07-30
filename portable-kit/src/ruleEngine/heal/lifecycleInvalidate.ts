/**
 * Mirror lifecycle invalidation edges (M2).
 * Upstream change dirties downstream stages; returns single primary nextStep.
 */
import type { BurnNextStep } from "../compilers/burnGateEnvelope";
import { invalidateStillQuality, type StillQualityMeta } from "../compilers/stillQuality";

export type LifecycleEvent =
  | "asset_look_changed"
  | "shot_visual_changed"
  | "shot_dialogue_changed"
  | "shot_duration_changed"
  | "prompt_rewritten"
  | "still_regenerated"
  | "video_burned";

export interface InvalidateResult {
  stillMeta?: StillQualityMeta;
  dirty: Array<"still" | "prompt" | "video" | "qc">;
  primaryNextStep: BurnNextStep;
}

export function applyLifecycleInvalidation(
  event: LifecycleEvent,
  currentStill?: Partial<StillQualityMeta> | null,
): InvalidateResult {
  switch (event) {
    case "asset_look_changed":
    case "shot_visual_changed":
      return {
        stillMeta: invalidateStillQuality(currentStill),
        dirty: ["still", "prompt", "video", "qc"],
        primaryNextStep: "regen_storyboard_hq",
      };
    case "shot_dialogue_changed":
    case "shot_duration_changed":
      return {
        dirty: ["prompt", "video", "qc"],
        primaryNextStep: "soft_patch",
      };
    case "prompt_rewritten":
      return { dirty: ["video", "qc"], primaryNextStep: "retry_shot" };
    case "still_regenerated":
      return {
        stillMeta: {
          ...(currentStill as StillQualityMeta),
          stillQuality: currentStill?.stillQuality ?? "hq_ok",
          videoStale: true,
          stillQualityAt: new Date().toISOString(),
        },
        dirty: ["video", "qc"],
        primaryNextStep: "burn",
      };
    case "video_burned":
      return {
        stillMeta: currentStill
          ? {
              ...(currentStill as StillQualityMeta),
              videoStale: false,
              videoPass: true,
              videoPassAt: new Date().toISOString(),
            }
          : undefined,
        dirty: ["qc"],
        primaryNextStep: "burn",
      };
    default:
      return { dirty: [], primaryNextStep: "chat_repair" };
  }
}
