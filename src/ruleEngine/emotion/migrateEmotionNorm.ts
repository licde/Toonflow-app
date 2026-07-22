/**
 * E4: migrate emotionNorm fields only when normVersion schema rises.
 * Profile switch is NOT a migration.
 */
import {
  currentNormVersion,
  getEmotionNormFromPlan,
  loadEmotionDrivenDesign,
  type EmotionNormState,
} from "./emotionNorm";

function semverParts(v: string): number[] {
  return String(v || "0.0.0")
    .split(".")
    .map((x) => Number.parseInt(x, 10) || 0);
}

export function isNormVersionBehind(current: string, target: string): boolean {
  const a = semverParts(current);
  const b = semverParts(target);
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) < (b[i] ?? 0)) return true;
    if ((a[i] ?? 0) > (b[i] ?? 0)) return false;
  }
  return false;
}

/**
 * Fill missing emotionNorm fields; preserve activeProfileId.
 * Returns whether migration ran.
 */
export function migrateEmotionNormIfNeeded(plan: Record<string, unknown>): {
  migrated: boolean;
  emotionNorm: EmotionNormState;
} {
  const target = currentNormVersion();
  const prev = getEmotionNormFromPlan(plan);
  if (!isNormVersionBehind(prev.normVersion, target) && prev.activeProfileId) {
    // Ensure shape exists on planData
    if (!plan.planData || typeof plan.planData !== "object") plan.planData = {};
    const pd = plan.planData as Record<string, unknown>;
    if (!pd.emotionNorm) {
      pd.emotionNorm = prev;
      plan._emotionNorm = prev;
      return { migrated: true, emotionNorm: prev };
    }
    return { migrated: false, emotionNorm: prev };
  }

  const design = loadEmotionDrivenDesign();
  const next: EmotionNormState = {
    activeProfileId: prev.activeProfileId || design.defaultProfileId || "generic",
    normVersion: target,
    structureStale: prev.structureStale,
    updatedAt: Date.now(),
  };
  if (!plan.planData || typeof plan.planData !== "object") plan.planData = {};
  (plan.planData as Record<string, unknown>).emotionNorm = next;
  plan._emotionNorm = next;
  return { migrated: true, emotionNorm: next };
}
