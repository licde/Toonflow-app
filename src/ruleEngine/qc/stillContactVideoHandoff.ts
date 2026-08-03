/**
 * Still prop-in-frame ↔ video contact-event handoff gate (pre-burn).
 * Intent-first: pose realizationDegraded / occupancy kneel debt → WARN, never BLOCK burn.
 * True missing prop on cheek-contact events still BLOCKs.
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
  primaryNextStep?: "regen_storyboard_hq" | "confirm_enhance" | "burn";
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
  // Literary primary effects unqualified → WARN absorb (intent-first; not hard block burn)
  if (meta.literaryEffectsQualified === false) {
    const miss = Array.isArray(meta.missingEffects)
      ? (meta.missingEffects as Array<string | { id?: string }>)
          .map((m) => (typeof m === "string" ? m : String(m?.id ?? "")))
          .filter(Boolean)
          .slice(0, 4)
      : [];
    return {
      ok: true,
      severity: "WARN",
      code: "STILL-OCCUPANCY-HANDOFF",
      reverseTrigger: "still_occupancy_miss",
      primaryNextStep: "burn",
      missingSlots: miss.length ? miss : ["literary_effects"],
      message: miss.length
        ? `静帧文学主效果未尽（${miss.join("、")}）·可烧视频（设计意图优先）`
        : "静帧文学主效果未尽·可烧视频（设计意图优先）",
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
      ok: true,
      severity: "WARN",
      code: "STILL-WEAK-HANDOFF",
      reverseTrigger: "still_weak_or_contam",
      primaryNextStep: "burn",
      missingSlots: contam
        ? (["beatIsolation", contamClass && contamClass !== "none" ? contamClass : "contamination"].filter(
            Boolean,
          ) as string[])
        : ["visualPass"],
      message: contam
        ? `静帧污染/弱标记已记账${contamClass && contamClass !== "none" ? `（${contamClass}）` : ""}·可烧视频`
        : "静帧弱/draft 已记账·可烧视频（设计意图优先）",
    };
  }
  if (meta.closedCompose === false) {
    return {
      ok: true,
      severity: "WARN",
      code: "STILL-WEAK-HANDOFF",
      reverseTrigger: "still_weak_or_contam",
      primaryNextStep: "burn",
      missingSlots: ["closedCompose"],
      message: "单镜封闭未尽·可烧视频（设计意图优先）",
    };
  }
  const missingFx = Array.isArray(meta.missingEffects)
    ? (meta.missingEffects as Array<string | { id?: string; reason?: string }>)
    : [];
  const forbiddenPaper = missingFx.some((m) => {
    const reason = typeof m === "string" ? m : String(m?.reason ?? m?.id ?? "");
    return /forbidden_undeclared_paper|framing_too_wide_oral/.test(reason);
  });
  if (forbiddenPaper || String(meta.contaminationClass ?? "") === "undeclared_prop") {
    return {
      ok: true,
      severity: "WARN",
      code: "STILL-WEAK-HANDOFF",
      reverseTrigger: "still_weak_or_contam",
      primaryNextStep: "burn",
      missingSlots: ["forbidden_undeclared_prop"],
      message: "未声明道具/景别债已记账·可烧视频",
    };
  }

  const vd = String(input.visualDescription ?? "").trim();
  const still = `${input.stillPrompt ?? ""} ${JSON.stringify(meta)}`;

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

  // Intent-first: pose degrade is ledger only — never BLOCK burn
  if (intentBend && realizationDegraded) {
    return {
      ok: true,
      severity: "WARN",
      code: "STILL-OCCUPANCY-HANDOFF",
      reverseTrigger: "still_occupancy_miss",
      primaryNextStep: "burn",
      missingSlots: ["realizationOccupancy"],
      message: `姿态债：弯腰→${realizationOcc || "跪持/站持"} · 意图仍弯腰 · 可烧视频`,
    };
  }

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
    (meta.debtKind === "action_misfire" ||
      poseEv === "lean_table" ||
      poseEv === "upright_desk" ||
      poseEv === "desk_lean" ||
      poseEv === "kneel_hold" ||
      (Array.isArray(meta.missingSlots) &&
        (meta.missingSlots as string[]).some((s) => /occupancy|action_misfire|pickup/i.test(String(s)))));
  if (occupancyBad) {
    return {
      ok: true,
      severity: "WARN",
      code: "STILL-OCCUPANCY-HANDOFF",
      reverseTrigger: "still_occupancy_miss",
      primaryNextStep: "burn",
      missingSlots: ["poseOccupancy", "action_grip"],
      message: "动作占位债已记账 · 意图仍弯腰捡拾 · 可烧视频",
    };
  }

  // Ground bend_pickup dominates: do not apply cheek-contact hard gates
  if (intentBend || seal?.poseOccupancy === "bend_pickup") {
    return { ok: true, severity: "ok" };
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
    (/手持卡片|挡脸举物|胸前展示/.test(still) && !/禁止手持卡片/.test(still));
  // synthetic_geometry + glyph OK for readable 休书 — intent-first allow WARN
  if (heldCard && !glyphDebt) {
    return {
      ok: false,
      severity: "BLOCK",
      code: "STILL-CONTACT-HANDOFF",
      reverseTrigger: "still_video_contact_handoff",
      primaryNextStep: "regen_storyboard_hq",
      missingSlots: ["contactGeom", "propPoseLocus"],
      message: "接触首帧姿态疑似手持展示卡，不可作颊触划过运动起点；请重出可拍静照",
    };
  }
  if (glyphDebt || meta.propPlateGrade === "synthetic_geometry") {
    return {
      ok: true,
      severity: "WARN",
      code: "STILL-CONTACT-HANDOFF",
      reverseTrigger: "still_video_contact_handoff",
      primaryNextStep: "burn",
      missingSlots: glyphDebt ? ["glyph"] : ["propPlateGrade"],
      message: "文书/合成板债已记账·题名可辨合法·可烧视频",
    };
  }

  return { ok: true, severity: "ok" };
}
