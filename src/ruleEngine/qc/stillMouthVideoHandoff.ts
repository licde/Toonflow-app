/**
 * Still mouth intent ↔ video lip-sync handoff gate.
 */
export function assertStillMouthVideoHandoff(input: {
  stillPrompt?: string | null;
  videoPrompt?: string | null;
  stillMouthDetail?: string | null;
}): {
  ok: boolean;
  severity: "ok" | "WARN" | "soft_patch";
  message?: string;
  strengthen?: Record<string, string>;
} {
  const still = `${input.stillPrompt ?? ""} ${input.stillMouthDetail ?? ""}`;
  const video = String(input.videoPrompt ?? "");
  const closedStill =
    /neutral_closed|闭口|抿嘴|紧闭|mouth\s*closed/i.test(still) &&
    !/开口|张嘴|speaking|口型/i.test(still);
  const strongLip =
    /lip[- ]?sync|对口型|口型同步|mouth\s*movement\s*for\s*dialogue/i.test(video);

  if (closedStill && strongLip) {
    return {
      ok: false,
      severity: "WARN",
      message: "静照为闭口意图但视频强口型，请声明静照口型或软修视频口型强度",
      strengthen: { lipSyncPolicy: "subtle", mouth: "allow_parted_for_dialogue" },
    };
  }
  return { ok: true, severity: "ok" };
}
