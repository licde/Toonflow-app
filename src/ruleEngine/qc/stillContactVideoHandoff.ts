/**
 * Still prop-in-frame ↔ video contact-event handoff gate (pre-burn).
 * Symmetric to stillMouthVideoHandoff: contactEvent VD ∧ no prop in still → BLOCK.
 * wound/scar alone never counts as prop.
 */
import {
  isContactEventVd,
  matchContactEventVd,
  textHasPropInFrame,
  woundVisibleIsNotProp,
} from "../compilers/contactEventPolicy";

export function assertStillContactVideoHandoff(input: {
  visualDescription?: string | null;
  stillPrompt?: string | null;
  stillMeta?: Record<string, unknown> | null;
  /** HQ / fidelity marked prop missing */
  propMissing?: boolean;
  stillQuality?: string | null;
}): {
  ok: boolean;
  severity: "ok" | "WARN" | "BLOCK";
  message?: string;
  code?: "STILL-CONTACT-HANDOFF" | "STILL-WEAK-HANDOFF";
  reverseTrigger?: "still_prop_missing" | "still_video_contact_handoff" | "still_weak_or_contam";
  primaryNextStep?: "regen_storyboard_hq" | "confirm_enhance";
  missingSlots?: string[];
} {
  const meta = input.stillMeta ?? {};
  const sq = String(input.stillQuality ?? meta.stillQuality ?? "");
  const delivery = String(meta.deliveryTier ?? "");
  const contam =
    meta.offBeatContamination === true ||
    meta.beatIsolationFailed === true ||
    (Array.isArray(meta.composeSources) &&
      (meta.composeSources as string[]).some((s) => /previous\.dropped_off_beat|contamination/i.test(String(s))));
  const weakMarked =
    delivery === "draft" ||
    sq === "weak" ||
    sq === "draft" ||
    (Boolean(sq) && sq !== "hq_ok" && meta.visualPass === false && meta.humanOk !== true);
  if (contam || weakMarked) {
    return {
      ok: false,
      severity: "BLOCK",
      code: "STILL-WEAK-HANDOFF",
      reverseTrigger: "still_weak_or_contam",
      primaryNextStep: "regen_storyboard_hq",
      missingSlots: contam ? ["beatIsolation"] : ["visualPass"],
      message: contam
        ? "静帧存在跨镜污染/弱文学标记，禁止视频绿继承；请 full 重出本拍可拍首帧"
        : "静帧未 hq_ok/visualPass（draft≠hq_ok），禁止视频绿继承",
    };
  }

  const vd = String(input.visualDescription ?? "").trim();
  if (!isContactEventVd(vd)) {
    return { ok: true, severity: "ok" };
  }
  const match = matchContactEventVd(vd);
  const still = `${input.stillPrompt ?? ""} ${JSON.stringify(input.stillMeta ?? {})}`;
  const metaPropMissing =
    input.propMissing === true ||
    input.stillMeta?.propMissing === true ||
    input.stillMeta?.propInFrame === false ||
    String(input.stillQuality ?? "") === "prop_missing";

  const hasProp = textHasPropInFrame(still, match) && !woundVisibleIsNotProp(still);
  // Still prompt that only has scar/wound while VD needs prop
  const scarOnly =
    woundVisibleIsNotProp(still) ||
    (/浅痕|渗血|血珠/.test(still) && !textHasPropInFrame(still, match));

  if (metaPropMissing || !hasProp || scarOnly) {
    const prop = match.propCanonical || match.propAlias || "道具";
    return {
      ok: false,
      severity: "BLOCK",
      code: "STILL-CONTACT-HANDOFF",
      reverseTrigger: "still_prop_missing",
      primaryNextStep: "regen_storyboard_hq",
      missingSlots: ["propInFrame", "contactGeom"],
      message: `接触事件镜须重出含「${prop}」接触的静照（propInFrame+contactGeom）；禁止仅浅痕无道具，禁止只改视频词`,
    };
  }

  // held_card / degrade / synth: still may name prop but pose is not cheek-sweep — block I2V
  const poseClass = String(meta.poseClass ?? meta.contactPoseClass ?? "");
  const heldCard =
    poseClass === "held_card" ||
    Boolean(meta.poseHandoffBlocked) ||
    meta.propPlateGrade === "synthetic_geometry" ||
    (/手持卡片|挡脸举物|胸前展示/.test(still) && !/禁止手持卡片/.test(still));
  if (heldCard) {
    return {
      ok: false,
      severity: "BLOCK",
      code: "STILL-CONTACT-HANDOFF",
      reverseTrigger: "still_video_contact_handoff",
      primaryNextStep: "regen_storyboard_hq",
      missingSlots: ["contactGeom", "propPoseLocus"],
      message:
        "接触首帧姿态疑似手持展示卡/合成几何板，不可作颊触划过运动起点；请用 Seedream HQ 重出可拍静照（Comfy 可选加速，非门禁）",
    };
  }

  return { ok: true, severity: "ok" };
}
