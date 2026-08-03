/**
 * DesignIntentProfile — generic literary design-intent SSOT (no shot-name hardcoding).
 * Positive leads vs debtHints; pose_occupancy XOR; grip_locus; doctrine JSON consumed.
 */
import { matchContactEventVd } from "./contactEventPolicy";
import { extractDescPredicates } from "./extractDescPredicates";
import { resolveBgFragment, type BgFragmentKind } from "./stillFirstFrameLiterarySsot";
import { resolveGlyphTextFromVd, getPropFormDoctrine } from "./propFormDoctrine";

export type DesignIntentClass =
  | "action_grip"
  | "doc_readable"
  | "contact_geom"
  | "bg_fragment"
  | "prop_cu"
  | "hand_cu"
  | "seating_power"
  | "atmosphere_keep"
  | "perf_micro"
  | "empty_os"
  | "pose_occupancy"
  | "grip_locus"
  | "seating_xor_pickup"
  | "contact_xor_pickup";

export type PlateMode = "readable_doc" | "cheek_sweep" | "object_inset" | "fragment_sil" | "none";

export type GlyphPolicy = "must_first" | "should_second" | "omit";

export type PoseOccupancy = "bend_pickup" | "kneel_hold" | "desk_lean" | "stand_hold" | "other";

export type GripLocusAtom = "lead_hand" | "knuckles_pale" | "prop_in_hand";

export type DesignIntentProfile = {
  classes: DesignIntentClass[];
  plateMode: PlateMode;
  glyphPolicy: GlyphPolicy;
  glyphText: string;
  propClassId: string | null;
  propSurface: string | null;
  fragment: BgFragmentKind;
  secondaryBudget: "none" | "hands_only" | "skirt_blur" | "upper_body" | "ensemble";
  atmosphere?: string;
  primaryObjective: "contact_geom" | "prop_readable" | "action_primary" | "identity_first" | "scene_keep" | "empty_scene";
  poseOccupancy: PoseOccupancy;
  gripLocus: GripLocusAtom[];
  seatingXorPickup: boolean;
  /** bend_pickup wins over contact_geom elevation (parallel seatingXorPickup) */
  contactXorPickup: boolean;
  /** Structured DOF — not Chinese-only sprinkle */
  dofBudget: "shallow" | "medium" | "none";
  /** Positive prop scale lead from formPositive.size */
  formScale?: string;
  reasons: string[];
};

export type DesignIntentDoctrine = {
  classes: string[];
  conflictPriority: string[];
  poseOccupancy?: string[];
  gripLocusAtoms?: string[];
  refSlotOrder?: string[];
  plateLadder?: string[];
  egressNegBudget?: number;
  forbidInLead?: boolean;
  ctaPersona?: { forbidPhrases?: string[]; preferPersona?: string[]; forbidProgrammingRed?: boolean };
};

/** Load doctrine fixture — runtime SSOT for budget / CTA / conflict notes. */
export function loadDesignIntentDoctrine(): DesignIntentDoctrine {
  try {
    const { readFixtureJson } = require("../utils/fixturesPath") as typeof import("../utils/fixturesPath");
    return readFixtureJson<DesignIntentDoctrine>("design_intent_doctrine.json", {
      classes: [],
      conflictPriority: [],
      egressNegBudget: 4,
      forbidInLead: true,
    });
  } catch {
    return { classes: [], conflictPriority: [], egressNegBudget: 4, forbidInLead: true };
  }
}

export function getEgressNegBudget(): number {
  const n = Number(loadDesignIntentDoctrine().egressNegBudget ?? 4);
  return Math.max(2, Math.min(8, n));
}

/** Occupancy-keyed negative carve-outs that must not lose the global budget race. */
export function getEgressNegCarveOut(poseOccupancy?: string | null): string[] {
  const doc = loadDesignIntentDoctrine() as DesignIntentDoctrine & {
    egressNegCarveOut?: Record<string, string[]>;
  };
  const occ = String(poseOccupancy ?? "").trim();
  if (occ && doc.egressNegCarveOut?.[occ]?.length) return [...doc.egressNegCarveOut[occ]!];
  if (occ === "bend_pickup") return ["手持卡片挡脸", "跪坐替代弯腰", "蹲身替代弯腰", "灰棚白棚", "胸前展示卡"];
  return [];
}

/** Doctrine-driven ref slot order (softEnv-first when scene Must). */
export function getDoctrineRefSlotOrder(): string[] {
  const order = loadDesignIntentDoctrine().refSlotOrder;
  return order?.length ? order : ["softEnv", "identity", "propSoft"];
}

/** Identity-first order for shots without softEnv continuity must. */
export function getDoctrineRefSlotOrderIdentityFirst(): string[] {
  return ["identity", "propSoft", "softEnv"];
}

/** Doctrine CTA persona for FE/BE parity (forbid programming-red phrases). */
export function resolveDoctrineCtaPersona(fallback: string): string {
  const cta = loadDesignIntentDoctrine().ctaPersona;
  if (!cta) return fallback;
  const prefer = cta.preferPersona ?? [];
  const hit = prefer.find((p) => p === fallback || fallback.includes(p.slice(0, 4)));
  if (hit) return hit;
  for (const bad of cta.forbidPhrases ?? []) {
    if (fallback.includes(bad)) {
      return prefer[0] ?? "重出动作主导静帧";
    }
  }
  return fallback;
}

const PAPER_HOLD = /捡|捏|持|递|撕|展开|翻开|攥|握/;
const ACTION_GRIP = /弯腰|捡起|捡|捏紧|指节|俯身|持|递/;
const BEND_PICKUP = /弯腰|捡起|俯身捡|蹲身捡|捡纸|捡起.*纸/;
const KNEEL = /跪坐|跪地|跪姿|屈膝跪/;
const DESK_LEAN = /伏案|靠桌|倚案|伏在桌/;
const STAND_HOLD = /立持|站立持|持.*立于/;
const HAND_CU = /手特写|手指特写|手部特写|特写[^。]{0,6}手/;
const PROP_CU = /道具特写|特写[^。]{0,8}(?:纸|书|帕|剑|扳指)/;
const EMPTY_OS = /空镜|仅环境|（\s*OS\s*）|\bOS\b|画外/;
const KNUCKLES = /指节|捏紧|指尖发白|指节泛白/;
const LEAD_HAND = /主手|右手|左手|指尖捏|手捏|手持/;

export function resolvePoseOccupancy(vd: string): PoseOccupancy {
  try {
    const { isOralMicroNotActionPrimary } =
      require("./singleShotClosedCompose") as typeof import("./singleShotClosedCompose");
    if (isOralMicroNotActionPrimary(vd)) return "other";
  } catch {
    if (/咬唇|紧咬|渗血|lip_bite/.test(vd) && !/弯腰|捡起|俯身/.test(vd)) return "other";
  }
  if (BEND_PICKUP.test(vd)) return "bend_pickup";
  if (DESK_LEAN.test(vd)) return "desk_lean";
  if (KNEEL.test(vd) && !BEND_PICKUP.test(vd)) return "kneel_hold";
  if (STAND_HOLD.test(vd) || (/立于|站立/.test(vd) && PAPER_HOLD.test(vd))) return "stand_hold";
  if (ACTION_GRIP.test(vd)) return "bend_pickup";
  return "other";
}

export function resolveGripLocus(vd: string): GripLocusAtom[] {
  const atoms: GripLocusAtom[] = [];
  if (LEAD_HAND.test(vd) || PAPER_HOLD.test(vd)) atoms.push("lead_hand");
  if (KNUCKLES.test(vd)) atoms.push("knuckles_pale");
  if (/纸在|持纸|捏.*纸|手中.*纸|道具在手|入画于主手/.test(vd) || PAPER_HOLD.test(vd)) {
    atoms.push("prop_in_hand");
  }
  return [...new Set(atoms)];
}

/**
 * Conflict priority from doctrine notes + hardcoded branches:
 * contact_geom > glyph; pose_occupancy primary 1; asset > synth; etc.
 */
export function deriveDesignIntentProfile(input: {
  visualDescription?: string | null;
  imagePrompt?: string | null;
  shotSize?: string | null;
  background?: string | null;
  spatialRelation?: string | null;
  foreground?: string | null;
  microExpression?: string | null;
  characterNames?: string[] | null;
  /** Optional cameraAnchor.bgBlur from shotDesign */
  bgBlur?: boolean | null;
}): DesignIntentProfile {
  const doctrine = loadDesignIntentDoctrine();
  const vd = String(input.visualDescription ?? "");
  const blob = [vd, input.imagePrompt, input.background, input.foreground, input.spatialRelation]
    .map((s) => String(s ?? ""))
    .join("\n");
  const reasons: string[] = [];
  const classes: DesignIntentClass[] = [];

  // L0 literary union for occupancy/modality (imagePrompt atoms must not be VD-only)
  let litBlob = blob;
  try {
    const { literaryL0Blob } = require("./literaryStillSsot") as typeof import("./literaryStillSsot");
    litBlob = literaryL0Blob({
      visualDescription: vd,
      compiledImagePrompt: input.imagePrompt,
      background: input.background,
    });
  } catch {
    litBlob = blob;
  }

  let contact = null as ReturnType<typeof matchContactEventVd> | null;
  try {
    contact = matchContactEventVd(litBlob);
  } catch {
    contact = null;
  }
  const isContact = Boolean(contact?.isContactEvent);

  const pack = extractDescPredicates({
    description: litBlob,
    characterNames: input.characterNames,
  });
  const paperPred = pack.predicates.find((p) => p.classId === "paper_doc" || /休书|婚书|信笺|信纸|纸/.test(p.prop ?? ""));
  const frag = resolveBgFragment({
    visualDescription: vd,
    background: input.background,
    imagePrompt: input.imagePrompt,
    spatialRelation: input.spatialRelation,
  });

  const poseOccupancy = resolvePoseOccupancy(litBlob);
  let gripLocus = resolveGripLocus(litBlob);

  if (EMPTY_OS.test(litBlob) && pack.predicates.length === 0) {
    classes.push("empty_os");
    reasons.push("empty_os");
  }
  if (pack.hasSeatingOrKneel) {
    classes.push("seating_power");
    reasons.push("seating_power");
  }
  if (isContact) {
    classes.push("contact_geom");
    reasons.push("contact_geom");
  }
  if (ACTION_GRIP.test(litBlob)) {
    classes.push("action_grip");
    reasons.push(isContact ? "action_grip_under_contact" : "action_grip");
  }
  if (paperPred || (/休书|婚书|信笺|信纸/.test(blob) && PAPER_HOLD.test(blob))) {
    classes.push("doc_readable");
    reasons.push("doc_readable");
  }
  if (frag.stripFullSecondary) {
    classes.push("bg_fragment");
    reasons.push(`bg_fragment:${frag.kind}`);
  }
  if (HAND_CU.test(blob) || (/特写|ecu|\bcu\b/i.test(String(input.shotSize ?? "")) && /手|指/.test(litBlob))) {
    classes.push("hand_cu");
    reasons.push("hand_cu");
  }
  if (PROP_CU.test(blob)) {
    classes.push("prop_cu");
    reasons.push("prop_cu");
  }
  const atm = /烛火|烛光|月光|暖光|冷光|夜色|灯火/.exec(litBlob)?.[0];
  if (atm) {
    classes.push("atmosphere_keep");
    reasons.push(`atmosphere:${atm}`);
  }
  if (String(input.microExpression ?? "").trim()) {
    classes.push("perf_micro");
    reasons.push("perf_micro");
  }

  // Occupancy + grip as first-class
  if (poseOccupancy !== "other" || classes.includes("action_grip")) {
    classes.push("pose_occupancy");
    reasons.push(`pose_occupancy:${poseOccupancy}`);
  }
  if (gripLocus.length) {
    classes.push("grip_locus");
    reasons.push(`grip_locus:${gripLocus.join("+")}`);
  }

  // seating XOR pickup: literary pickup must not let seating legislate kneel as primary
  let seatingXorPickup = false;
  if (
    (poseOccupancy === "bend_pickup" || BEND_PICKUP.test(litBlob)) &&
    (classes.includes("seating_power") || KNEEL.test(litBlob))
  ) {
    seatingXorPickup = true;
    classes.push("seating_xor_pickup");
    reasons.push("seating_xor_pickup");
    // Drop seating as competing primary when doctrine says occupancy wins
    if (doctrine.conflictPriority.some((c) => /pose_occupancy/.test(c))) {
      const idx = classes.indexOf("seating_power");
      if (idx >= 0) classes.splice(idx, 1);
    }
  }

  // contact XOR pickup: bend_pickup must not elevate to cheek contact_geom
  let contactXorPickup = false;
  const bendWins = poseOccupancy === "bend_pickup" || BEND_PICKUP.test(litBlob);
  if (bendWins && classes.includes("contact_geom")) {
    contactXorPickup = true;
    classes.push("contact_xor_pickup");
    reasons.push("contact_xor_pickup");
    // Drop contact_geom as competing primary — keep as debtHints via egress split
    const idx = classes.indexOf("contact_geom");
    if (idx >= 0) classes.splice(idx, 1);
  }

  const propClassId =
    contact?.propClassId ||
    paperPred?.classId ||
    (classes.includes("doc_readable") ? "paper_doc" : null);
  const propSurface =
    paperPred?.prop ||
    (propClassId === "paper_doc"
      ? resolveGlyphTextFromVd({ visualDescription: vd, propClassId }) || null
      : null);
  const glyphText =
    resolveGlyphTextFromVd({
      visualDescription: vd,
      propClassId,
      propAlias: propSurface,
      propCanonical: contact?.propCanonical,
    }) ||
    propSurface ||
    "";

  let plateMode: PlateMode = "none";
  let glyphPolicy: GlyphPolicy = "omit";
  // Occupancy-first: never cheek_sweep when bend_pickup wins (even if contact verbs linger in blob)
  if (bendWins || poseOccupancy === "bend_pickup") {
    plateMode = propClassId && propClassId !== "paper_doc" ? "object_inset" : "readable_doc";
    glyphPolicy = classes.includes("doc_readable") ? "should_second" : "omit";
  } else if (classes.includes("contact_geom")) {
    plateMode = "cheek_sweep";
    glyphPolicy = classes.includes("doc_readable") ? "should_second" : "omit";
  } else if (classes.includes("action_grip")) {
    plateMode = propClassId && propClassId !== "paper_doc" ? "object_inset" : "readable_doc";
    glyphPolicy = classes.includes("doc_readable") ? "should_second" : "omit";
  } else if (classes.includes("doc_readable")) {
    plateMode = propClassId && propClassId !== "paper_doc" ? "object_inset" : "readable_doc";
    glyphPolicy = "must_first";
  } else if (classes.includes("prop_cu") || classes.includes("hand_cu")) {
    plateMode = "object_inset";
    glyphPolicy = getPropFormDoctrine(propClassId)?.glyphRequired ? "should_second" : "omit";
  } else if (classes.includes("bg_fragment")) {
    plateMode = "fragment_sil";
  }

  let secondaryBudget: DesignIntentProfile["secondaryBudget"] = "none";
  if (classes.includes("bg_fragment")) secondaryBudget = "skirt_blur";
  else if (classes.includes("contact_geom") || classes.includes("hand_cu")) secondaryBudget = "hands_only";
  else if (bendWins) secondaryBudget = classes.includes("bg_fragment") ? "skirt_blur" : "none";

  let primaryObjective: DesignIntentProfile["primaryObjective"] = "identity_first";
  if (bendWins || poseOccupancy === "bend_pickup" || classes.includes("action_grip")) {
    primaryObjective = "action_primary";
  } else if (classes.includes("contact_geom")) primaryObjective = "contact_geom";
  else if (classes.includes("doc_readable") || classes.includes("prop_cu")) primaryObjective = "prop_readable";
  else if (classes.includes("empty_os")) primaryObjective = "empty_scene";
  else if (classes.includes("seating_power")) primaryObjective = "identity_first";

  // Ensure knuckles when bend pickup + paper (visual detail L1)
  if (
    (poseOccupancy === "bend_pickup" || bendWins) &&
    classes.includes("doc_readable") &&
    !gripLocus.includes("knuckles_pale") &&
    /指节|捏紧|指尖/.test(litBlob)
  ) {
    gripLocus.push("knuckles_pale");
  }
  if ((poseOccupancy === "bend_pickup" || bendWins) && !gripLocus.includes("prop_in_hand") && classes.includes("doc_readable")) {
    gripLocus.push("prop_in_hand");
    if (!gripLocus.includes("lead_hand")) gripLocus.push("lead_hand");
  }

  // DOF budget: fragment / atmosphere / explicit bgBlur → shallow
  let dofBudget: DesignIntentProfile["dofBudget"] = "none";
  if (
    input.bgBlur === true ||
    classes.includes("bg_fragment") ||
    /浅景深|虚化|bokeh/i.test(blob)
  ) {
    dofBudget = "shallow";
    reasons.push("dof:shallow");
  } else if (classes.includes("atmosphere_keep") || /烛火|殿内|室内/.test(vd)) {
    dofBudget = "medium";
    reasons.push("dof:medium");
  }

  // Prop scale from formPositive.size (positive carrier)
  let formScale: string | undefined;
  if (propClassId) {
    const doctrineForm = getPropFormDoctrine(propClassId);
    if (doctrineForm?.formPositive?.size) {
      formScale = doctrineForm.formPositive.size;
      reasons.push(`formScale:${propClassId}`);
    }
  }

  return {
    classes: [...new Set(classes)],
    plateMode,
    glyphPolicy,
    glyphText,
    propClassId,
    propSurface,
    fragment: frag.kind,
    secondaryBudget,
    atmosphere: atm,
    primaryObjective,
    poseOccupancy,
    gripLocus,
    seatingXorPickup,
    contactXorPickup,
    dofBudget,
    formScale,
    reasons,
  };
}

export type DesignIntentEgressSplit = {
  positiveLeads: string[];
  debtHints: string[];
};

/** Positive vendor leads vs debtHints (untilClear/heuristic only). Ordered L0→L3. */
export function designIntentEgressSplit(profile: DesignIntentProfile): DesignIntentEgressSplit {
  const positiveLeads: string[] = [];
  const debtHints: string[] = [];

  // L0 — occupancy / grip
  if (profile.poseOccupancy === "bend_pickup" || profile.classes.includes("action_grip")) {
    positiveLeads.push("占位：弯腰捡拾，躯干前倾，纸在主手");
    debtHints.push("禁止伏案靠桌代替捡起");
    debtHints.push("禁止以跪坐持书替代弯腰捡拾");
  } else if (profile.poseOccupancy === "kneel_hold") {
    positiveLeads.push("占位：跪坐持物，躯干稳定");
  } else if (profile.poseOccupancy === "desk_lean") {
    positiveLeads.push("占位：伏案靠桌（文学声明）");
  } else if (profile.poseOccupancy === "stand_hold") {
    positiveLeads.push("占位：站立持物");
  }

  if (profile.gripLocus.includes("lead_hand")) {
    positiveLeads.push("握持：道具在主手入画");
  }
  if (profile.gripLocus.includes("knuckles_pale")) {
    positiveLeads.push("握持：指尖捏紧指节泛白");
  }
  if (profile.gripLocus.includes("prop_in_hand")) {
    positiveLeads.push("握持：物在手中同框");
  }

  // L1 — glyph / prop readable (after occupancy)
  if (profile.glyphPolicy === "must_first" && profile.glyphText) {
    positiveLeads.push(`纸面可见「${profile.glyphText}」墨迹，薄笺展开可读`);
    debtHints.push("禁止空白糊纸");
    debtHints.push("禁止举卡挡脸");
  } else if (profile.glyphPolicy === "should_second" && profile.glyphText) {
    positiveLeads.push(`纸面可有「${profile.glyphText}」墨迹更佳（拾取几何优先，非举卡展示）`);
  }

  // L2 — fragment
  if (profile.classes.includes("bg_fragment")) {
    positiveLeads.push("背景仅次角裙摆/衣角等碎片虚化浅景深");
    debtHints.push("禁止次角完整正脸或持道具抢戏");
  }
  // L3 — DOF / form / atmosphere
  if (profile.dofBudget === "shallow") {
    positiveLeads.push("景深：浅景深，背景虚化，主体锐利");
  } else if (profile.dofBudget === "medium") {
    positiveLeads.push("景深：中景深，环境可辨不抢戏");
  }
  if (profile.formScale) {
    positiveLeads.push(`物尺度：${profile.formScale}，相对手掌/身比例入画`);
  }
  if (profile.atmosphere) {
    positiveLeads.push(`气氛保留：${profile.atmosphere}`);
  }
  if (profile.seatingXorPickup) {
    debtHints.push("捡拾占位优先于跪坐立法");
  }
  if (profile.contactXorPickup) {
    debtHints.push("弯腰捡拾占位优先于颊触几何升格");
    debtHints.push("禁止以颊触划过替代触地捡拾");
  }

  // Visual detail additive guarantees when bend_pickup sealed path
  if (profile.poseOccupancy === "bend_pickup" || profile.classes.includes("action_grip")) {
    if (!positiveLeads.some((l) => /弯腰|捡拾|占位/.test(l))) {
      positiveLeads.unshift("占位：弯腰捡拾，躯干前倾，纸在主手触地");
    } else if (!positiveLeads.some((l) => /触地/.test(l))) {
      positiveLeads.push("握持：纸在主手触地捡拾，非胸前展示");
    }
    if (!positiveLeads.some((l) => /指节|捏紧/.test(l))) {
      positiveLeads.push("握持：指尖捏紧指节泛白");
    }
    if (profile.formScale && !positiveLeads.some((l) => /物尺度/.test(l))) {
      positiveLeads.push(`物尺度：${profile.formScale}，相对手掌/身比例入画`);
    }
    if (profile.classes.includes("bg_fragment") && !positiveLeads.some((l) => /裙摆|碎片/.test(l))) {
      positiveLeads.push("背景仅次角裙摆/衣角等碎片虚化浅景深");
    }
    if (profile.atmosphere && !positiveLeads.some((l) => /气氛保留/.test(l))) {
      positiveLeads.push(`气氛保留：${profile.atmosphere}`);
    }
    if (profile.dofBudget === "shallow" && !positiveLeads.some((l) => /景深：/.test(l))) {
      positiveLeads.push("景深：浅景深，背景虚化，主体锐利");
    }
  }

  try {
    const { sealPrimaryIntentCarriers, orderEgressLeadsByPriority } =
      require("./primaryIntentSeal") as typeof import("./primaryIntentSeal");
    const seal = sealPrimaryIntentCarriers({ profile });
    return {
      positiveLeads: orderEgressLeadsByPriority(positiveLeads, seal),
      debtHints,
    };
  } catch {
    return { positiveLeads, debtHints };
  }
}

/** @deprecated use designIntentEgressSplit().positiveLeads */
export function designIntentEgressLeads(profile: DesignIntentProfile): string[] {
  return designIntentEgressSplit(profile).positiveLeads;
}

export function designIntentDebtHints(profile: DesignIntentProfile): string[] {
  return designIntentEgressSplit(profile).debtHints;
}

export function profileNeedsPropPlate(profile: DesignIntentProfile): boolean {
  return (
    profile.plateMode === "readable_doc" ||
    profile.plateMode === "cheek_sweep" ||
    profile.plateMode === "object_inset" ||
    profile.classes.includes("doc_readable") ||
    profile.classes.includes("action_grip") ||
    profile.classes.includes("contact_geom") ||
    profile.classes.includes("prop_cu")
  );
}

/** Fragment soft plate for bg_fragment (skirt/sil) — hang without stealing primary prop. */
export function profileNeedsFragmentPlate(profile: DesignIntentProfile): boolean {
  return profile.plateMode === "fragment_sil" || profile.classes.includes("bg_fragment");
}
