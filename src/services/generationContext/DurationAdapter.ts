import type { StructuredShot } from "../structuredScript/types";
import { clampDurationForModel, parseShotDuration } from "../structuredScript/utils";
import type { ModelCapabilities } from "./types";

export function adaptDuration(
  shot: StructuredShot,
  caps?: Partial<ModelCapabilities>,
): { duration: number; targetDuration: number; speedAdjust: number } {
  const min = caps?.minDuration ?? 1;
  const max = caps?.maxDuration ?? 30;
  const targetDuration = parseShotDuration(shot.time, shot.dialogue);

  let floor = targetDuration;
  if (shot.dialogue?.朗读时长) {
    const read = parseFloat(String(shot.dialogue.朗读时长).replace(/s$/i, ""));
    if (!Number.isNaN(read)) floor = Math.max(floor, read + 0.3);
  }

  const duration = clampDurationForModel(Math.max(floor, min), min, max);
  const speedAdjust = duration > 0 && targetDuration > 0 ? duration / targetDuration : 1;

  return { duration, targetDuration, speedAdjust: speedAdjust < 1 ? 1 / speedAdjust : 1 };
}
