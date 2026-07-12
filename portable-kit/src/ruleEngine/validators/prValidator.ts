import type { ScriptBundle } from "../bundle/types";

type Shot = Record<string, unknown>;

export function runPrValidator(bundle: ScriptBundle): { items: { ruleId: string; severity: string; message: string }[] } {
  const items: { ruleId: string; severity: string; message: string }[] = [];
  const shots = (bundle.preDesignPack?.shots ?? []) as Shot[];

  for (const shot of shots) {
    const emotion = Number(shot.emotion ?? (shot.narrative as { emotionIntensity?: number })?.emotionIntensity ?? 0);
    const dur = Number(shot.duration ?? 0);
    if (emotion >= 8 && dur > 0 && dur < 2) {
      items.push({ ruleId: "PR-14", severity: "BLOCK", message: "高强度情绪镜时长过短" });
    }
    const lines = (shot.narrative as { dialogue?: { lines?: unknown[] } })?.dialogue?.lines ?? [];
    if (lines.length && !shot.charCodes && !(shot.narrative as { type?: string })?.type?.includes("CHAR")) {
      items.push({ ruleId: "PR-04", severity: "BLOCK", message: "台词镜无人物" });
    }
  }

  return { items };
}
