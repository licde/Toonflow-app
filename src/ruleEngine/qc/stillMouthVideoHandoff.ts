/**
 * Still mouth intent ↔ video lip-sync handoff gate (pre-burn).
 * soft_patch may strengthen once; caller must re-assert — silent soft must not fake-pass.
 */
export function assertStillMouthVideoHandoff(input: {
  stillPrompt?: string | null;
  videoPrompt?: string | null;
  stillMouthDetail?: string | null;
  lipSyncPolicy?: string | null;
  hasDialogue?: boolean;
  /** After one strengthen pass — escalate to hard block if still conflicting */
  afterStrengthen?: boolean;
}): {
  ok: boolean;
  severity: "ok" | "WARN" | "soft_patch" | "BLOCK";
  message?: string;
  strengthen?: Record<string, string>;
  code?: "STILL-MOUTH-HANDOFF";
  reverseTrigger?: "still_mouth_handoff";
} {
  const still = `${input.stillPrompt ?? ""} ${input.stillMouthDetail ?? ""}`;
  const video = String(input.videoPrompt ?? "");
  const policy = String(input.lipSyncPolicy ?? "").toLowerCase();
  const closedStill =
    /neutral_closed|闭口|抿嘴|紧闭|mouth\s*closed/i.test(still) &&
    !/开口|张嘴|speaking|口型|咬|刺|allow_parted/i.test(still);
  const strongLip =
    (/lip[- ]?sync|对口型|口型同步|mouth\s*movement\s*for\s*dialogue|natural mouth/i.test(video) &&
      !/subtle\s*lip/i.test(video) &&
      !/allow_parted/i.test(video)) ||
    (/dialogue_native|natural/.test(policy) && !/subtle/.test(policy));

  if (closedStill && strongLip && input.hasDialogue !== false) {
    if (input.afterStrengthen) {
      return {
        ok: false,
        severity: "BLOCK",
        code: "STILL-MOUTH-HANDOFF",
        reverseTrigger: "still_mouth_handoff",
        message:
          "静照闭口∩视频强口型：须重出开口静照（MD-IMG）并同步 EN lipSyncPolicy；禁止只 soft_patch 视频",
      };
    }
    return {
      ok: false,
      severity: "soft_patch",
      code: "STILL-MOUTH-HANDOFF",
      reverseTrigger: "still_mouth_handoff",
      message: "静照为闭口意图但视频强口型：先尝试 soft 降口型；仍冲突则重出静照",
      strengthen: { lipSyncPolicy: "subtle", mouth: "allow_parted_for_dialogue" },
    };
  }
  return { ok: true, severity: "ok" };
}
