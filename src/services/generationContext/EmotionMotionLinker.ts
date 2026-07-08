import type { StructuredShot } from "../structuredScript/types";

/** 情绪 × 性格 × 微表情联动 */
export function linkEmotionMotion(
  shot: StructuredShot,
  spec?: Record<string, unknown>,
  target: "image" | "video" = "image",
): string {
  const parts: string[] = [];
  const mapping = spec?.emotionPerformanceMapping as Record<string, Record<string, string>> | undefined;

  if (shot.colorTone && mapping?.[shot.colorTone]) {
    const m = mapping[shot.colorTone];
    for (const v of Object.values(m)) parts.push(v);
  }

  const intensity = shot.emotionIntensity ?? 1;
  if (intensity >= 4) {
    const perf = shot.performance as Record<string, unknown> | undefined;
    const micro = perf?.microExpression as Record<string, string> | undefined;
    if (micro) parts.push(`microExpression: ${JSON.stringify(micro)}`);
    if (perf?.physiological) parts.push(`physiological: ${perf.physiological}`);
  }

  const trigger = shot["L6-trigger"];
  if (trigger) {
    parts.push(`personality trigger: ${trigger}`);
  }

  const l6 = shot.performance as Record<string, unknown> | undefined;
  if (target === "video" && shot.dialogue?.emotion) {
    parts.push(`dialogue emotion: ${shot.dialogue.emotion}`);
    const sync = spec?.dialogueActionSync as Record<string, { actionLead?: string }> | undefined;
    const dtype = shot.dialogue.type;
    if (dtype && sync?.[dtype]?.actionLead) {
      parts.push(`action lead ${sync[dtype].actionLead}`);
    }
  }

  return parts.filter(Boolean).join(", ");
}
