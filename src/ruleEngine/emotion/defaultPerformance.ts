/**
 * Default microExpression + lipSyncPolicy from emotion intensity (Performance Field pillar).
 * Does not invent when already authored.
 * High-intensity speak is must-edit — never auto-default (see still_video_quality_doctrine).
 * hasDialogue = on-camera only (OS/VO do not force lip).
 */
import { exprHighIntensityThreshold } from "../quality/loadSvqDoctrine";
import { hasOnCameraDialogue } from "../design/onCameraDialogue";

export function defaultPerformanceFromEmotion(input: {
  emotionIntensity?: number | string | null;
  hasDialogue?: boolean;
  existingMicro?: { eyes?: string; mouthDetail?: string } | null;
  existingLipSync?: string | null;
}): {
  microExpression?: { eyes: string; mouthDetail: string };
  lipSyncPolicy?: string;
  applied: boolean;
} {
  if (input.existingMicro?.mouthDetail || input.existingLipSync) {
    return { applied: false };
  }
  const n = Number(input.emotionIntensity);
  const intensity = Number.isFinite(n) ? n : 0;
  const thr = exprHighIntensityThreshold();
  if (input.hasDialogue && intensity >= thr) {
    return { applied: false };
  }
  if (!input.hasDialogue && intensity < 4) {
    return { applied: false };
  }
  const mouthDetail =
    intensity >= 7 ? "parted_tense" : intensity >= 4 ? "slightly_parted" : "neutral_soft";
  const eyes = intensity >= 7 ? "wide_intense" : intensity >= 4 ? "focused" : "soft";
  const lipSyncPolicy = input.hasDialogue
    ? intensity >= 6
      ? "dialogue_native"
      : "subtle_natural"
    : "none";
  return {
    microExpression: { eyes, mouthDetail },
    lipSyncPolicy,
    applied: true,
  };
}

/** Apply defaults onto shotDesign when missing (ingest heal). */
export function ensureShotPerformanceDefaults(shot: {
  narrative?: { dialogue?: { lines?: unknown[] }; emotionIntensity?: number };
  emotionIntensity?: number;
  shotDesign?: {
    performance?: { microExpression?: { eyes?: string; mouthDetail?: string } };
    lipSyncPolicy?: string;
  };
}): boolean {
  const lines = shot.narrative?.dialogue?.lines ?? [];
  const hasDialogue = hasOnCameraDialogue(lines);
  const intensity = shot.emotionIntensity ?? shot.narrative?.emotionIntensity;
  const existingMicro = shot.shotDesign?.performance?.microExpression;
  const existingLip = shot.shotDesign?.lipSyncPolicy;
  const def = defaultPerformanceFromEmotion({
    emotionIntensity: intensity,
    hasDialogue,
    existingMicro,
    existingLipSync: existingLip,
  });
  if (!def.applied) return false;
  shot.shotDesign = shot.shotDesign ?? {};
  if (def.microExpression) {
    shot.shotDesign.performance = {
      ...(shot.shotDesign.performance ?? {}),
      microExpression: def.microExpression,
    };
  }
  if (def.lipSyncPolicy) {
    shot.shotDesign.lipSyncPolicy = def.lipSyncPolicy;
  }
  return true;
}
