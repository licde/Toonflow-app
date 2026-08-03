/**
 * Literary primary effects SSOT — L0/L1 must for design-intent qualification.
 * Generic: driven by Seal / VD stems; no role-name hardcoding.
 */
import { loadDesignIntentDoctrine } from "../compilers/designIntentProfile";
import type { PrimaryIntentCarrierSet } from "../compilers/primaryIntentSeal";

export type LiteraryEffectTier = "L0" | "L1" | "L2" | "L3" | "handoff";

export type LiteraryEffectId =
  | "occupancy.bend_pickup"
  | "prop.in_frame.paper"
  | "prop.locus.ground_or_lead_hand"
  | "grip.knuckles_pale"
  | "prop.glyph.should"
  | "bg.fragment.skirt"
  | "bg.no_gray_studio"
  | "identity.no_modern_attire"
  | "atmosphere.warm_light"
  | "secondary.no_full_stand"
  | "detail.wound_shallow"
  | "mouth.neutral_closed"
  | "i2v.motion_from_still";

export type LiteraryEffectDef = {
  id: LiteraryEffectId;
  tier: LiteraryEffectTier;
  /** must = blocks literaryEffectsQualified; should = repair target; detail = never blocks */
  bar: "must" | "should" | "detail";
};

export type LocalPoseSignals = {
  holdCardSuspected?: boolean;
  groundPropSuspected?: boolean;
  uprightTorsoSuspected?: boolean;
  /** Standing bend false positive: crouch/kneel with ground paper */
  kneelSquatSuspected?: boolean;
  primaryPoseGuess?: string;
  grayStudioSuspected?: boolean;
  modernAttireSuspected?: boolean;
  /** Near-black / featureless periphery — hall softEnv not in pixels */
  voidBgSuspected?: boolean;
  sceneIllegibleSuspected?: boolean;
};

export type LiteraryEffectMiss = {
  id: LiteraryEffectId;
  tier: LiteraryEffectTier;
  bar: "must" | "should" | "detail";
  reason: string;
};

export type QualifyLiteraryEffectsResult = {
  literaryEffectsQualified: boolean;
  missingEffects: LiteraryEffectMiss[];
  shouldMisses: LiteraryEffectMiss[];
  debtKind?: string;
  ctaLabel?: string;
  sources: string[];
  /** Realization ladder stamp — pose may degrade without clearing intent */
  realization?: {
    intentOccupancy: string;
    realizationOccupancy: string;
    realizationDegraded: boolean;
    realizationReason: string;
    ladder: string[];
  };
};

const DEFAULT_EFFECTS: LiteraryEffectDef[] = [
  { id: "prop.in_frame.paper", tier: "L0", bar: "must" },
  { id: "bg.no_gray_studio", tier: "L0", bar: "must" },
  { id: "identity.no_modern_attire", tier: "L0", bar: "must" },
  { id: "occupancy.bend_pickup", tier: "L0", bar: "should" },
  { id: "prop.locus.ground_or_lead_hand", tier: "L0", bar: "should" },
  { id: "grip.knuckles_pale", tier: "L1", bar: "should" },
  { id: "prop.glyph.should", tier: "L1", bar: "should" },
  { id: "bg.fragment.skirt", tier: "L2", bar: "should" },
  { id: "atmosphere.warm_light", tier: "L2", bar: "should" },
  { id: "secondary.no_full_stand", tier: "L2", bar: "should" },
  { id: "detail.wound_shallow", tier: "L3", bar: "detail" },
  { id: "mouth.neutral_closed", tier: "handoff", bar: "should" },
  { id: "i2v.motion_from_still", tier: "handoff", bar: "should" },
];

export function loadLiteraryPrimaryEffects(): LiteraryEffectDef[] {
  try {
    const doc = loadDesignIntentDoctrine() as {
      literaryPrimaryEffects?: LiteraryEffectDef[];
    };
    if (doc.literaryPrimaryEffects?.length) return doc.literaryPrimaryEffects;
  } catch {
    /* fallback */
  }
  return DEFAULT_EFFECTS;
}

export function isNoComfyNoKeyDoctrine(): {
  actionPrimarySeedream: boolean;
  propSoftRequired: boolean;
  localPoseHeuristic: boolean;
  fragmentOverFullSoftEnv: boolean;
} {
  try {
    const doc = loadDesignIntentDoctrine() as {
      noComfyNoKey?: {
        actionPrimarySeedream?: boolean;
        propSoftRequired?: boolean;
        localPoseHeuristic?: boolean;
        fragmentOverFullSoftEnv?: boolean;
      };
    };
    const n = doc.noComfyNoKey ?? {};
    return {
      actionPrimarySeedream: n.actionPrimarySeedream !== false,
      propSoftRequired: n.propSoftRequired !== false,
      localPoseHeuristic: n.localPoseHeuristic !== false,
      fragmentOverFullSoftEnv: n.fragmentOverFullSoftEnv === true,
    };
  } catch {
    return {
      actionPrimarySeedream: true,
      propSoftRequired: true,
      localPoseHeuristic: true,
      // Scene-first default: do not drop hall for fragment
      fragmentOverFullSoftEnv: false,
    };
  }
}

function wantsBend(vd: string, seal?: PrimaryIntentCarrierSet | null): boolean {
  return (
    seal?.poseOccupancy === "bend_pickup" ||
    seal?.primaryObjective === "action_primary" ||
    /弯腰|捡起|捡拾|俯身捡/.test(vd)
  );
}

function wantsPaper(vd: string): boolean {
  return /休书|婚书|信笺|信纸|纸角|薄纸|纸张/.test(vd);
}

function wantsKnuckles(vd: string): boolean {
  return /指节|捏紧|指尖/.test(vd);
}

function wantsSkirt(vd: string): boolean {
  return /裙摆|衣角|碎片虚化/.test(vd);
}

function wantsAtm(vd: string): boolean {
  return /烛火|烛光|暖光|月光/.test(vd);
}

const CTA_BY_EFFECT: Partial<Record<LiteraryEffectId, string>> = {
  "occupancy.bend_pickup": "重出动作主导静帧",
  "prop.locus.ground_or_lead_hand": "重出动作主导静帧",
  "prop.in_frame.paper": "挂真道具板后重出",
  "prop.glyph.should": "挂真道具板后重出",
  "grip.knuckles_pale": "重出动作主导静帧",
  "bg.fragment.skirt": "本拍隔离重出",
  "bg.no_gray_studio": "补场景软板后重出",
  "identity.no_modern_attire": "重挂定妆后重出",
};

/**
 * Qualify literary primary effects for no-Comfy / no-Key path.
 * Trunk Must = paper + non-gray + non-modern; pose miss → realizationDegraded (Should), does not block burn.
 */
export function qualifyLiteraryEffects(input: {
  visualDescription?: string | null;
  promptUsed?: string | null;
  seal?: PrimaryIntentCarrierSet | null;
  refsRoles?: string[] | null;
  propPlateGrade?: string | null;
  propPlateMissing?: boolean | null;
  localSignals?: LocalPoseSignals | null;
  videoMotionStartHint?: string | null;
  /** Heuristic ran; used for realization ladder (not trunk fail-closed alone) */
  localHeuristicOk?: boolean | null;
  softEnvHung?: boolean | null;
  droppedSoftEnv?: boolean | null;
  wantsScene?: boolean | null;
}): QualifyLiteraryEffectsResult {
  const vd = String(input.visualDescription ?? "");
  const prompt = String(input.promptUsed ?? "");
  const blob = `${vd}\n${prompt}`;
  const seal = input.seal ?? null;
  const bend = wantsBend(vd, seal);
  const paper = wantsPaper(vd) || seal?.propInHand === true;
  const roles = (input.refsRoles ?? []).map(String);
  const hasPropSoft = roles.includes("propSoft");
  const softEnvHung =
    input.softEnvHung === true || (roles.includes("softEnv") && input.droppedSoftEnv !== true);
  const plateMissing =
    input.propPlateMissing === true ||
    String(input.propPlateGrade ?? "") === "missing";
  const sig = input.localSignals ?? {};
  const holdBad =
    (sig.holdCardSuspected === true && sig.groundPropSuspected !== true) ||
    sig.primaryPoseGuess === "kneel_hold" ||
    sig.primaryPoseGuess === "stand_hold" ||
    sig.kneelSquatSuspected === true;

  const { resolveRealizationState, realizationDegradedUserNote } =
    require("../compilers/realizationLadder") as typeof import("../compilers/realizationLadder");
  const realization = resolveRealizationState({
    intentOccupancy: seal?.poseOccupancy ?? (bend ? "bend_pickup" : null),
    visualDescription: vd,
    localSignals: sig,
    localHeuristicOk: input.localHeuristicOk,
  });

  const defs = loadLiteraryPrimaryEffects();
  const missingEffects: LiteraryEffectMiss[] = [];
  const shouldMisses: LiteraryEffectMiss[] = [];
  const sources: string[] = ["qualify.literaryPrimaryEffects", "qualify.trunk_burn"];

  const push = (id: LiteraryEffectId, reason: string, def: LiteraryEffectDef) => {
    const miss: LiteraryEffectMiss = { id, tier: def.tier, bar: def.bar, reason };
    if (def.bar === "must") missingEffects.push(miss);
    else if (def.bar === "should") shouldMisses.push(miss);
  };

  for (const def of defs) {
    if (def.id === "occupancy.bend_pickup") {
      if (!bend) continue;
      if (realization.realizationOccupancy !== "bend_pickup" || realization.realizationDegraded) {
        push(
          def.id,
          realization.realizationReason || (holdBad ? "local_kneel_ne_bend" : "pose_realization_degraded"),
          def,
        );
      }
      continue;
    }
    if (def.id === "prop.in_frame.paper") {
      if (!paper) continue;
      const inText = /休书|婚书|信笺|纸|薄纸/.test(blob);
      if (!inText || (plateMissing && !hasPropSoft)) {
        push(def.id, !inText ? "prop_not_in_egress" : "propSoft_slot_missing", def);
      }
      continue;
    }
    if (def.id === "bg.no_gray_studio") {
      // Trunk: block on positive gray / void / illegible scene — softEnv hung alone ≠ pixel hall
      const grayPixel = sig.grayStudioSuspected === true;
      const voidPixel =
        sig.voidBgSuspected === true || sig.sceneIllegibleSuspected === true;
      const bansGray = /禁止灰棚|负向[：:].{0,80}(?:灰棚|白棚)/.test(prompt);
      const grayEgress =
        !bansGray && /灰棚|白棚|纯色摄影棚/.test(prompt.split(/负向[：:]/)[0] ?? prompt);
      const droppedBare =
        input.droppedSoftEnv === true &&
        !softEnvHung &&
        !/主场景|浅景深|殿内|烛火|暖光|禁止灰棚/.test(prompt);
      if (grayPixel || voidPixel || grayEgress || droppedBare) {
        push(
          def.id,
          voidPixel
            ? sig.voidBgSuspected
              ? "local_void_bg"
              : "local_scene_illegible"
            : grayPixel
              ? "local_gray_studio"
              : grayEgress
                ? "egress_gray_studio"
                : "softEnv_dropped_bare",
          def,
        );
      }
      continue;
    }
    if (def.id === "identity.no_modern_attire") {
      if (sig.modernAttireSuspected === true) {
        push(def.id, "local_modern_attire", def);
      }
      continue;
    }
    if (def.id === "prop.locus.ground_or_lead_hand") {
      if (!bend && !paper) continue;
      // Stand_hold realization: lead-hand paper OK; ground only required when bend realized
      const standOk =
        realization.realizationOccupancy === "stand_hold" ||
        realization.realizationOccupancy === "kneel_hold";
      const locusOk = standOk
        ? /主手|持纸|薄纸|休书|触地|近地/.test(prompt) || hasPropSoft || sig.groundPropSuspected === true
        : (/触地|主手|近地|捡拾/.test(prompt) && !holdBad) ||
          (sig.groundPropSuspected === true &&
            sig.kneelSquatSuspected !== true &&
            sig.primaryPoseGuess === "bend_pickup");
      if (!locusOk) {
        push(def.id, holdBad ? "hold_card_locus" : "egress_missing_ground_locus", def);
      }
      continue;
    }
    if (def.id === "grip.knuckles_pale") {
      if (!wantsKnuckles(vd) && !(bend && paper)) continue;
      if (!/指节|捏紧|指尖/.test(prompt)) {
        push(def.id, "egress_missing_knuckles", def);
      }
      continue;
    }
    if (def.id === "prop.glyph.should") {
      if (!paper) continue;
      const glyphOk =
        /休书|字形|题名|字迹|可辨/.test(prompt) ||
        hasPropSoft ||
        String(input.propPlateGrade ?? "") === "synthetic_geometry" ||
        String(input.propPlateGrade ?? "") === "asset" ||
        String(input.propPlateGrade ?? "") === "fe";
      // Sticker / chest placard risk → soft miss (conflict yields to period identity)
      if (/胸前标牌|贴纸题名|校服胸牌/.test(prompt)) {
        push(def.id, "glyph_sticker_conflict_yield", def);
        continue;
      }
      if (!glyphOk) {
        push(def.id, "glyph_legislation_missing", def);
      }
      continue;
    }
    if (def.id === "bg.fragment.skirt") {
      if (!wantsSkirt(vd)) continue;
      if (!/裙摆|衣角|碎片|浅景深/.test(prompt)) {
        push(def.id, "egress_missing_skirt_fragment", def);
      }
      continue;
    }
    if (def.id === "atmosphere.warm_light") {
      if (!wantsAtm(vd)) continue;
      if (!/烛|暖光|气氛/.test(prompt)) {
        push(def.id, "egress_missing_atmosphere", def);
      }
      continue;
    }
    if (def.id === "secondary.no_full_stand") {
      if (!wantsSkirt(vd) && !/站立/.test(vd)) continue;
      if (/完整立像|配角站立|次角站立|完整正脸立像/.test(prompt)) {
        push(def.id, "egress_has_secondary_full", def);
      }
      continue;
    }
    if (def.id === "detail.wound_shallow") {
      continue;
    }
    if (def.id === "mouth.neutral_closed") {
      if (/开口对白|张嘴说话|natural mouth/.test(prompt) && /闭口|抿嘴|neutral_closed/.test(vd)) {
        push(def.id, "egress_open_mouth_vs_closed", def);
      }
      continue;
    }
    if (def.id === "i2v.motion_from_still") {
      if (!bend) continue;
      if (realization.realizationOccupancy !== "bend_pickup") {
        push(def.id, "realization_blocks_bend_i2v", def);
        continue;
      }
      const hint = String(input.videoMotionStartHint ?? "");
      if (hint && /举卡|跪坐/.test(hint) && !/禁止/.test(hint)) {
        push(def.id, "motion_hint_hostile", def);
      }
      continue;
    }
  }

  const literaryEffectsQualified = missingEffects.length === 0;
  // SingleShotClosed Forbidden: oral VD + undeclared paper in egress/pixels → never fake-green
  try {
    const { isOralMicroNotActionPrimary, UNDECLARED_PAPER_ATOMS, HALF_BODY_FRAMING } =
      require("../compilers/singleShotClosedCompose") as typeof import("../compilers/singleShotClosedCompose");
    if (isOralMicroNotActionPrimary(vd)) {
      if (UNDECLARED_PAPER_ATOMS.test(prompt) || hasPropSoft) {
        missingEffects.push({
          id: "prop.in_frame.paper" as LiteraryEffectId,
          tier: "L0",
          bar: "must",
          reason: "forbidden_undeclared_paper_on_oral",
        });
        sources.push("qualify.forbidden:undeclared_paper");
      }
      if (HALF_BODY_FRAMING.test(prompt) && !/禁止半身|口鼻区占画幅/.test(prompt)) {
        shouldMisses.push({
          id: "bg.composition" as LiteraryEffectId,
          tier: "L1",
          bar: "should",
          reason: "framing_too_wide_oral_ecu",
        });
        sources.push("qualify.forbidden:framing_wide");
      }
    }
  } catch {
    /* optional */
  }
  const qualifiedAfterForbidden = missingEffects.length === 0;
  void literaryEffectsQualified;
  const primaryMiss = missingEffects[0];
  const debtKind = primaryMiss
    ? /identity|modern/.test(primaryMiss.id)
      ? "identity_plate"
      : /bg\.no_gray|softEnv/.test(primaryMiss.id)
        ? "contamination"
        : /prop|glyph/.test(primaryMiss.id)
          ? "prop_plate"
          : "action_misfire"
    : realization.realizationDegraded
      ? "realization_degraded"
      : undefined;
  const ctaLabel = primaryMiss
    ? CTA_BY_EFFECT[primaryMiss.id] ?? "继续生成修复"
    : realization.realizationDegraded
      ? realizationDegradedUserNote(realization) || "实现已降级·可烧主干"
      : undefined;

  if (!qualifiedAfterForbidden) sources.push(`qualify.miss:${missingEffects.map((m) => m.id).join(",")}`);
  if (shouldMisses.length) sources.push(`qualify.should:${shouldMisses.map((m) => m.id).join(",")}`);
  if (realization.realizationDegraded) {
    sources.push(`qualify.realization_degraded:${realization.realizationOccupancy}`);
  }

  return {
    literaryEffectsQualified: qualifiedAfterForbidden,
    missingEffects,
    shouldMisses,
    debtKind,
    ctaLabel,
    sources,
    realization: {
      intentOccupancy: realization.intentOccupancy,
      realizationOccupancy: realization.realizationOccupancy,
      realizationDegraded: realization.realizationDegraded,
      realizationReason: realization.realizationReason,
      ladder: realization.ladder,
    },
  };
}

/**
 * Repair ladder: identity/殿/纸 → details → pose realization try.
 * Never identity SCENE collage; IRD lengthening is not primary.
 */
export function repairPlanForMissingEffects(misses: LiteraryEffectMiss[]): {
  injectLines: string[];
  forceFull: boolean;
  deltaHints: string[];
  triggers: string[];
} {
  const order: LiteraryEffectId[] = [
    "identity.no_modern_attire",
    "bg.no_gray_studio",
    "prop.in_frame.paper",
    "prop.glyph.should",
    "grip.knuckles_pale",
    "bg.fragment.skirt",
    "atmosphere.warm_light",
    "secondary.no_full_stand",
    "prop.locus.ground_or_lead_hand",
    "occupancy.bend_pickup",
    "i2v.motion_from_still",
    "mouth.neutral_closed",
    "detail.wound_shallow",
  ];
  const byId = new Map(misses.map((m) => [m.id, m]));
  const sorted = [
    ...order.filter((id) => byId.has(id)).map((id) => byId.get(id)!),
    ...misses.filter((m) => !order.includes(m.id)),
  ];
  const injectLines: string[] = [];
  const deltaHints: string[] = [];
  const triggers: string[] = [];
  let forceFull = false;
  for (const m of sorted) {
    triggers.push(m.id);
    if (m.id === "identity.no_modern_attire") {
      injectLines.push("身份：古装定妆真脸，禁止现代西装校服");
      forceFull = true;
      deltaHints.push("identity_bend_sil", "seed");
    } else if (m.id === "bg.no_gray_studio") {
      injectLines.push("背景：主场景浅景深虚化，禁止灰棚白棚");
      forceFull = true;
      deltaHints.push("keep_softEnv", "seed");
    } else if (m.id === "prop.in_frame.paper" || m.id === "prop.glyph.should") {
      injectLines.push("本镜休书薄纸须清晰入画于主手，纸面墨迹优先，禁止胸前标牌贴纸");
      forceFull = true;
      deltaHints.push("propSoft_resynth");
    } else if (m.id === "occupancy.bend_pickup" || m.id === "prop.locus.ground_or_lead_hand") {
      // Pose last — try bend; fail path stamps realizationDegraded elsewhere
      injectLines.push("占位：站姿弯腰捡拾，躯干前倾，纸在主手触地；禁止胸前捧持展示；无纸直立假绿");
      forceFull = true;
      deltaHints.push("propSoft_resynth", "identity_bend_sil", "preferActionBody", "seed");
    } else if (m.id === "grip.knuckles_pale") {
      injectLines.push("握持：指尖捏紧纸缘，指节泛白");
      deltaHints.push("egress_hash");
    } else if (m.id === "bg.fragment.skirt") {
      injectLines.push("裙摆/衣角浅景深虚化可辨（加强项），禁止次角完整正脸抢戏");
      deltaHints.push("egress_hash");
    } else if (m.id === "atmosphere.warm_light") {
      injectLines.push("气氛保留：暖光烛火可辨");
      deltaHints.push("egress_hash");
    } else if (m.id === "secondary.no_full_stand") {
      injectLines.push("禁止配角完整正脸立像抢戏");
      deltaHints.push("egress_hash");
    }
  }
  return {
    injectLines: [...new Set(injectLines)].slice(0, 6),
    forceFull,
    deltaHints: [...new Set(deltaHints)],
    triggers: [...new Set(triggers)],
  };
}
