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
  code?: "STILL-CONTACT-HANDOFF";
  reverseTrigger?: "still_prop_missing" | "still_video_contact_handoff";
  primaryNextStep?: "regen_storyboard_hq" | "confirm_enhance";
  missingSlots?: string[];
} {
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
  return { ok: true, severity: "ok" };
}
