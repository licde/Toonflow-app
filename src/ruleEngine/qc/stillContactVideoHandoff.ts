/**
 * Still prop-in-frame ↔ video contact-event handoff gate (pre-burn).
 * Blocks occupancy debt and realization-degraded bend I2V inherit.
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
  propMissing?: boolean;
  stillQuality?: string | null;
}): {
  ok: boolean;
  severity: "ok" | "WARN" | "BLOCK";
  message?: string;
  code?: "STILL-CONTACT-HANDOFF" | "STILL-WEAK-HANDOFF" | "STILL-OCCUPANCY-HANDOFF";
  reverseTrigger?:
    | "still_prop_missing"
    | "still_video_contact_handoff"
    | "still_weak_or_contam"
    | "still_occupancy_miss";
  primaryNextStep?: "regen_storyboard_hq" | "confirm_enhance";
  missingSlots?: string[];
} {
  const meta = input.stillMeta ?? {};
  const sq = String(input.stillQuality ?? meta.stillQuality ?? "");
  const delivery = String(meta.deliveryTier ?? "");
  const contamClass = String(meta.contaminationClass ?? "").trim();
  const contam =
    meta.offBeatContamination === true ||
    meta.beatIsolationFailed === true ||
    (contamClass.length > 0 && contamClass !== "none") ||
    (Array.isArray(meta.composeSources) &&
      (meta.composeSources as string[]).some((s) =>
        /previous\.dropped_off_beat|contamination|contact_zombie|locus_mangled|plate_geometry/i.test(
          String(s),
        ),
      ));
  // Literary primary effects unqualified → block green inherit (even if Key-absent unmeasured)
  if (meta.literaryEffectsQualified === false) {
    const miss = Array.isArray(meta.missingEffects)
      ? (meta.missingEffects as Array<string | { id?: string }>)
          .map((m) => (typeof m === "string" ? m : String(m?.id ?? "")))
          .filter(Boolean)
          .slice(0, 4)
      : [];
    return {
      ok: false,
      severity: "BLOCK",
      code: "STILL-OCCUPANCY-HANDOFF",
      reverseTrigger: "still_occupancy_miss",
      primaryNextStep: "regen_storyboard_hq",
      missingSlots: miss.length ? miss : ["literary_effects"],
      message: miss.length
        ? `静帧文学主效果未达（${miss.join("、")}），禁止视频绿继承；请继续生成智能修`
        : "静帧文学主效果未达，禁止视频绿继承；请继续生成智能修",
    };
  }
  const weakMarked =
    delivery === "draft" ||
    sq === "weak" ||
    sq === "draft" ||
    (Boolean(sq) &&
      sq !== "hq_ok" &&
      meta.visualPass === false &&
      meta.humanOk !== true &&
      meta.literaryEffectsQualified !== true);
  if (contam || weakMarked) {
    return {
      ok: false,
      severity: "BLOCK",
      code: "STILL-WEAK-HANDOFF",
      reverseTrigger: "still_weak_or_contam",
      primaryNextStep: "regen_storyboard_hq",
      missingSlots: contam
        ? (["beatIsolation", contamClass && contamClass !== "none" ? contamClass : "contamination"].filter(
            Boolean,
          ) as string[])
        : ["visualPass"],
      message: contam
        ? `静帧存在跨镜污染/弱文学标记${contamClass && contamClass !== "none" ? `（${contamClass}）` : ""}，禁止视频绿继承；请 full 重出本拍可拍首帧`
        : "静帧未 hq_ok/visualPass（draft≠hq_ok），禁止视频绿继承",
    };
  }

  const vd = String(input.visualDescription ?? "").trim();
  const still = `${input.stillPrompt ?? ""} ${JSON.stringify(meta)}`;

  // Realization ladder: degraded occupancy must not green-inherit bend I2V
  const seal = meta.primaryIntentSeal as
    | {
        poseOccupancy?: string;
        realizationOccupancy?: string;
        realizationDegraded?: boolean;
        intentOccupancy?: string;
      }
    | undefined;
  const realizationOcc = String(
    meta.realizationOccupancy ?? seal?.realizationOccupancy ?? "",
  );
  const intentBend =
    /弯腰|捡起|俯身捡|捡纸/.test(vd) ||
    seal?.poseOccupancy === "bend_pickup" ||
    seal?.intentOccupancy === "bend_pickup" ||
    meta.poseOccupancy === "bend_pickup";
  const realizationDegraded =
    meta.realizationDegraded === true ||
    seal?.realizationDegraded === true ||
    (intentBend && realizationOcc.length > 0 && realizationOcc !== "bend_pickup");
  if (intentBend && realizationDegraded) {
    return {
      ok: false,
      severity: "BLOCK",
      code: "STILL-OCCUPANCY-HANDOFF",
      reverseTrigger: "still_occupancy_miss",
      primaryNextStep: "regen_storyboard_hq",
      missingSlots: ["realizationOccupancy", "i2v.motion_from_still"],
      message: `实现占用已降级（${realizationOcc || "non_bend"}），禁止视频绿继承弯腰捡拾动作；可 draft 或重拍姿态`,
    };
  }

  // Occupancy debt — applies to action_primary / bend_pickup even without contact event
  const wantsBend = /弯腰|捡起|俯身捡|捡纸/.test(vd);
  const dip = meta.designIntentProfile as { poseOccupancy?: string } | undefined;
  const poseEv = String(
    (meta.poseEvidence as { primaryPose?: string } | undefined)?.primaryPose ??
      meta.poseOccupancy ??
      dip?.poseOccupancy ??
      "",
  );
  const occupancyBad =
    wantsBend &&
    meta.realizationDegraded !== true &&
    (meta.debtKind === "action_misfire" ||
      poseEv === "lean_table" ||
      poseEv === "upright_desk" ||
      poseEv === "desk_lean" ||
      poseEv === "kneel_hold" ||
      (Array.isArray(meta.missingSlots) &&
        (meta.missingSlots as string[]).some((s) => /occupancy|action_misfire|pickup/i.test(String(s)))));
  if (occupancyBad) {
    return {
      ok: false,
      severity: "BLOCK",
      code: "STILL-OCCUPANCY-HANDOFF",
      reverseTrigger: "still_occupancy_miss",
      primaryNextStep: "regen_storyboard_hq",
      missingSlots: ["poseOccupancy", "action_grip"],
      message: "动作占位债未清（弯腰捡≠桌靠/跪坐）；禁止视频绿继承，请重出占位正确的静照",
    };
  }

  if (!isContactEventVd(vd)) {
    return { ok: true, severity: "ok" };
  }
  const match = matchContactEventVd(vd);
  const metaPropMissing =
    input.propMissing === true ||
    input.stillMeta?.propMissing === true ||
    input.stillMeta?.propInFrame === false ||
    String(input.stillQuality ?? "") === "prop_missing";

  const hasProp = textHasPropInFrame(still, match) && !woundVisibleIsNotProp(still);
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

  const poseClass = String(meta.poseClass ?? meta.contactPoseClass ?? "");
  const glyphDebt =
    meta.debtKind === "glyph_miss" ||
    meta.debtKind === "prop_plate" ||
    (Array.isArray(meta.missingSlots) &&
      (meta.missingSlots as string[]).some((s) => /glyph|prop_form|propSoft|paper_doc/i.test(String(s))));
  const heldCard =
    poseClass === "held_card" ||
    Boolean(meta.poseHandoffBlocked) ||
    meta.propPlateGrade === "synthetic_geometry" ||
    glyphDebt ||
    (/手持卡片|挡脸举物|胸前展示/.test(still) && !/禁止手持卡片/.test(still));
  if (heldCard) {
    return {
      ok: false,
      severity: "BLOCK",
      code: "STILL-CONTACT-HANDOFF",
      reverseTrigger: "still_video_contact_handoff",
      primaryNextStep: "regen_storyboard_hq",
      missingSlots: glyphDebt
        ? ["contactGeom", "propPoseLocus", "glyph"]
        : ["contactGeom", "propPoseLocus"],
      message: glyphDebt
        ? "接触/文书债未清（字迹或道具板）；禁止视频绿继承，请重出含可读表面的静照"
        : "接触首帧姿态疑似手持展示卡/合成几何板，不可作颊触划过运动起点；请用 Seedream HQ 重出可拍静照",
    };
  }

  return { ok: true, severity: "ok" };
}
