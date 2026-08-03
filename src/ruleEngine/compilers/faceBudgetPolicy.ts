/**
 * Face budget / shootable conflict — action bow/kneel + speak on wide shot.
 */
import { shotSizeWiderThanNear, loadCinematicShotGrammar } from "./cinematicShotGrammar";

export type FaceBudgetResult = {
  ok: boolean;
  unreachable: boolean;
  primaryAction: "none" | "confirm_split" | "regen_storyboard_hq";
  splitHint?: string;
  reason?: string;
  faceBudget: "must" | "optional" | "none";
};

export function assessFaceBudget(input: {
  visualDescription?: string | null;
  shotSize?: string | null;
  hasDialogue?: boolean;
  lipSyncPolicy?: string | null;
  realizationOccupancy?: string | null;
  intentOccupancy?: string | null;
  videoIntentClass?: string | null;
}): FaceBudgetResult {
  const vd = String(input.visualDescription ?? "");
  const hasDial = input.hasDialogue === true;
  const lipNative = /dialogue_native|native/i.test(String(input.lipSyncPolicy ?? ""));
  const speak =
    hasDial &&
    (input.videoIntentClass === "speak_lip" || lipNative || /dialogue_native/i.test(String(input.lipSyncPolicy ?? "")));
  const bowLike =
    /弯腰|俯身|低头|跪持|跪坐|捡起|捡拾/.test(vd) ||
    input.intentOccupancy === "bend_pickup" ||
    input.realizationOccupancy === "kneel_hold" ||
    input.realizationOccupancy === "bend_pickup";
  const wide = shotSizeWiderThanNear(input.shotSize);
  const faceBudget =
    speak || input.videoIntentClass === "speak_lip"
      ? ("must" as const)
      : ("optional" as const);

  if (!speak) {
    return { ok: true, unreachable: false, primaryAction: "none", faceBudget };
  }

  // Dialogue + bow/kneel + wide → cannot deliver face-readable infection in one plate
  if (speak && bowLike && wide) {
    const conflict = loadCinematicShotGrammar().conflict?.actionBowPlusSpeak;
    return {
      ok: false,
      unreachable: true,
      primaryAction: "confirm_split",
      splitHint: conflict?.splitHint ?? "action_then_dialogue_mcu",
      reason: "face_budget_unreachable:action_bow_plus_speak_wide",
      faceBudget,
    };
  }

  // Dialogue + bow on any size without face-up still → still regen preferred when not splitting
  if (speak && bowLike && !wide) {
    return {
      ok: false,
      unreachable: false,
      primaryAction: "regen_storyboard_hq",
      reason: "face_unreadability_risk:bow_speak_near",
      faceBudget,
    };
  }

  return { ok: true, unreachable: false, primaryAction: "none", faceBudget };
}

/** Still meta face readability gate for dialogue shots. */
export function assertFaceReadableHandoff(input: {
  hasDialogue?: boolean;
  stillMeta?: Record<string, unknown> | null;
  visualDescription?: string | null;
  shotSize?: string | null;
}): {
  ok: boolean;
  severity: "ok" | "WARN" | "BLOCK";
  code?: "REALIZATION-FACE-READABILITY";
  message?: string;
  primaryNextStep?: "regen_storyboard_hq" | "split_shot" | "burn";
} {
  if (!input.hasDialogue) return { ok: true, severity: "ok" };
  const meta = input.stillMeta ?? {};
  const vd = String(input.visualDescription ?? "");
  const bow =
    /弯腰|俯身|低头|跪/.test(vd) ||
    meta.realizationOccupancy === "kneel_hold" ||
    meta.intentOccupancy === "bend_pickup";
  const faceOk =
    meta.faceReadable === true ||
    meta.faceReadable === "ok" ||
    (Array.isArray(meta.i2vCriticalFacts) &&
      (meta.i2vCriticalFacts as string[]).some((f) => /面容可读|抬视线|半身/.test(String(f))));
  const wide = shotSizeWiderThanNear(input.shotSize ?? String(meta.shotSize ?? ""));

  if (bow && !faceOk) {
    return {
      ok: true,
      severity: "WARN",
      code: "REALIZATION-FACE-READABILITY",
      message: wide
        ? "对白镜脸不可读：低头动作板+过宽景别；建议拆镜或重出近景抬脸静照"
        : "对白镜脸不可读风险：低头板须抬视线/半身近景；可重出 HQ 静照",
      primaryNextStep: wide ? "split_shot" : "regen_storyboard_hq",
    };
  }
  return { ok: true, severity: "ok" };
}
