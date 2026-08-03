/**
 * episodeContinuityContract — lightweight cross-shot continuity checks.
 */
import { auditAxis180Pair } from "../design/screenSideAxis";

export function auditEpisodeContinuity(input: {
  previousShot?: Record<string, unknown> | null;
  currentShot?: Record<string, unknown> | null;
}): { ok: boolean; findings: string[] } {
  const findings: string[] = [];
  const prev = input.previousShot ?? {};
  const cur = input.currentShot ?? {};
  if (prev && cur) {
    const prevScene = String((prev as { sceneCode?: string }).sceneCode ?? "");
    const curScene = String((cur as { sceneCode?: string }).sceneCode ?? "");
    if (prevScene && curScene && prevScene !== curScene) findings.push("scene_shift");
    const prevProp = String((prev as { contactStartState?: string }).contactStartState ?? "");
    const curProp = String((cur as { contactStartState?: string }).contactStartState ?? "");
    if (prevProp && curProp && prevProp === "at_locus" && curProp === "entering") findings.push("contact_backslide");
    const prevReal = String((prev as { realizationOccupancy?: string }).realizationOccupancy ?? "");
    const curReal = String((cur as { realizationOccupancy?: string }).realizationOccupancy ?? "");
    if (prevReal === "held_mid" && curReal === "entering") findings.push("realization_backslide");
    const prevEmo = Number((prev as { emotionIntensity?: number }).emotionIntensity ?? NaN);
    const curEmo = Number((cur as { emotionIntensity?: number }).emotionIntensity ?? NaN);
    if (Number.isFinite(prevEmo) && Number.isFinite(curEmo) && curEmo - prevEmo >= 4) {
      findings.push("emotion_cliff");
    }
    // Wave-4: 180 axis same-side on reverse pair
    const axis = auditAxis180Pair(prev, cur);
    if (!axis.ok && axis.finding) findings.push(axis.finding);
  }
  return { ok: findings.length === 0, findings };
}
