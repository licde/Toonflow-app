/**
 * E2: emotion evidence gate — intensity≥6 needs emotionPhase or avCausality; silent heal first.
 */
import { loadEmotionDrivenDesign, type EmotionPhase } from "./emotionNorm";

export type EmotionEvidenceInput = {
  intensity?: number;
  emotionPhase?: string;
  avCausality?: { visualPeak?: string; audioBeat?: string } | null;
  sceneRef?: number;
};

export type EmotionEvidenceResult = {
  ok: boolean;
  missing: string[];
  canSilentHeal: boolean;
  suggestedPhase?: EmotionPhase;
};

function phaseFromIntensity(intensity: number): EmotionPhase {
  if (intensity >= 8) return "burst";
  if (intensity >= 6) return "signal";
  if (intensity >= 4) return "suppress";
  return "suppress";
}

export function checkEmotionEvidence(input: EmotionEvidenceInput): EmotionEvidenceResult {
  const intensity = Number(input.intensity ?? 0);
  if (intensity < 6) {
    return { ok: true, missing: [], canSilentHeal: false };
  }
  const missing: string[] = [];
  const hasPhase = Boolean(String(input.emotionPhase ?? "").trim());
  const av = input.avCausality;
  const hasAv =
    Boolean(av && (String(av.visualPeak ?? "").trim() || String(av.audioBeat ?? "").trim()));
  if (!hasPhase) missing.push("emotionPhase");
  if (!hasAv) missing.push("avCausality");
  // Pass if either phase OR av evidence exists
  if (hasPhase || hasAv) {
    return { ok: true, missing: [], canSilentHeal: false };
  }
  return {
    ok: false,
    missing,
    canSilentHeal: true,
    suggestedPhase: phaseFromIntensity(intensity),
  };
}

/** Fill emotionPhase without touching dialogue / plot wording. */
export function silentHealEmotionEvidence<T extends Record<string, unknown>>(
  meta: T,
  intensity?: number,
): { meta: T; healed: boolean; detail?: string } {
  const n = Number(intensity ?? (meta.intensity as number) ?? (meta.emotionIntensity as number) ?? 0);
  const check = checkEmotionEvidence({
    intensity: n,
    emotionPhase: meta.emotionPhase as string | undefined,
    avCausality: meta.avCausality as EmotionEvidenceInput["avCausality"],
  });
  if (check.ok || !check.canSilentHeal) {
    return { meta, healed: false };
  }
  const phase = check.suggestedPhase ?? phaseFromIntensity(n);
  const phases = loadEmotionDrivenDesign().emotionPhases;
  const safe = (phases.includes(phase) ? phase : "signal") as EmotionPhase;
  const next = { ...meta, emotionPhase: safe };
  if (!next.avCausality || typeof next.avCausality !== "object") {
    (next as Record<string, unknown>).avCausality = {
      visualPeak: `emotion_${safe}`,
      audioBeat: n >= 8 ? "骤停" : "心跳",
    };
  }
  return { meta: next as T, healed: true, detail: `emotionPhase→${safe}` };
}

export function healSceneMetaEmotionEvidence(
  sceneMeta: Record<string, unknown>[],
): { sceneMeta: Record<string, unknown>[]; healCount: number } {
  let healCount = 0;
  const next = sceneMeta.map((m) => {
    const intensity = Number(m.intensity ?? m.emotionIntensity ?? m.densityScore ?? 0);
    const r = silentHealEmotionEvidence(m, intensity);
    if (r.healed) healCount++;
    return r.meta;
  });
  return { sceneMeta: next, healCount };
}
