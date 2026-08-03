/**
 * Still refs contract — generic plate/slot rules by primaryObjective + poseOccupancy.
 * Bend is one occupancy row, not the product goal. Whole-shot design intent drives slots.
 */
import { isNoComfyNoKeyDoctrine } from "../quality/literaryPrimaryEffects";

export type StillRefsContract = {
  /** Drop full-hall SCENE softEnv (fragment / atmosphere only) */
  dropFullSoftEnv: boolean;
  /** Refuse warehouse skipSynth unless occupancy-keyed plate matches */
  forcePropOccupancySynth: boolean;
  /** Occupancy key passed into synthesizePropSoftPlate / ladder */
  propPoseOccupancy: string | null;
  /** Prefer non-face sheet cell / skip top face-band on identity */
  identityPreferActionBody: boolean;
  /**
   * bend: replace standing four-view body with REAL face crop identity
   * (SVG silhouette destroys IP → modern sticker collapse).
   */
  identityReplaceStandingSheet: boolean;
  /** Allow atmosphere softEnv after full SCENE drop */
  allowAtmosphereSoftEnv: boolean;
  /** Default repair delta hints when primary effects miss */
  repairDeltaHints: string[];
  reason: string;
  primaryObjective: string;
  poseOccupancy: string;
};

function inferObjective(input: {
  primaryObjective?: string | null;
  objectiveClass?: string | null;
  visualDescription?: string | null;
  poseOccupancy?: string | null;
}): string {
  const sealed = String(input.primaryObjective || input.objectiveClass || "").trim();
  if (sealed) return sealed;
  const vd = String(input.visualDescription ?? "");
  const occ = String(input.poseOccupancy ?? "");
  if (occ === "bend_pickup" || /弯腰|捡起|捡拾|俯身/.test(vd)) return "action_primary";
  if (/划过|触肤|贴颊|接触/.test(vd)) return "contact_geom";
  if (/题名|字形|可读|休书|婚书/.test(vd) && /特写|近景/.test(vd)) return "prop_readable";
  return "identity_first";
}

function inferOccupancy(input: {
  poseOccupancy?: string | null;
  visualDescription?: string | null;
  primaryObjective?: string;
}): string {
  const occ = String(input.poseOccupancy ?? "").trim();
  if (occ) return occ;
  const vd = String(input.visualDescription ?? "");
  if (/弯腰|捡起|捡拾|俯身/.test(vd)) return "bend_pickup";
  if (/跪|捧持|胸前/.test(vd)) return "kneel_hold";
  if (/伏案|伏桌|靠案/.test(vd)) return "desk_lean";
  if (input.primaryObjective === "action_primary") return "bend_pickup";
  return "other";
}

/**
 * Resolve vendor ref-slot contract for this shot's sealed design intent.
 * Table is objective×occupancy — no role-name / shot-name hardcoding.
 */
export function resolveStillRefsContract(input: {
  primaryObjective?: string | null;
  objectiveClass?: string | null;
  poseOccupancy?: string | null;
  visualDescription?: string | null;
  /** Prefer atoms from shot JSON sample when present */
  shotDesignSample?: {
    primaryObjective?: string | null;
    poseOccupancy?: string | null;
    must?: Array<{ id: string }>;
  } | null;
}): StillRefsContract {
  // SingleShotClosed: oral beats never force prop occupancy synth
  try {
    const { isOralMicroNotActionPrimary } =
      require("./singleShotClosedCompose") as typeof import("./singleShotClosedCompose");
    if (isOralMicroNotActionPrimary(input.visualDescription)) {
      return {
        dropFullSoftEnv: false,
        forcePropOccupancySynth: false,
        propPoseOccupancy: null,
        identityPreferActionBody: false,
        identityReplaceStandingSheet: false,
        allowAtmosphereSoftEnv: true,
        repairDeltaHints: ["seed", "egress_hash", "drop_propSoft"],
        reason: "refs_contract:oral_ecu_mouth:no_prop_synth",
        primaryObjective: "identity_first",
        poseOccupancy: "other",
      };
    }
  } catch {
    /* optional */
  }
  // Sample SSOT wins when provided
  if (input.shotDesignSample) {
    input = {
      ...input,
      primaryObjective: input.shotDesignSample.primaryObjective || input.primaryObjective,
      poseOccupancy: input.shotDesignSample.poseOccupancy || input.poseOccupancy,
    };
    if (input.shotDesignSample.must?.some((m) => m.id === "bg.fragment")) {
      // force fragment path via visualDescription cue
      input = {
        ...input,
        visualDescription: `${input.visualDescription ?? ""} 裙摆碎片`,
      };
    }
  }
  const primaryObjective = inferObjective(input);
  const poseOccupancy = inferOccupancy({
    poseOccupancy: input.poseOccupancy,
    visualDescription: input.visualDescription,
    primaryObjective,
  });
  const vd = String(input.visualDescription ?? "");
  const fragmentWanted = /裙摆|衣角|碎片|虚化浅景深/.test(vd);
  let fragmentOverFull = true;
  try {
    fragmentOverFull = isNoComfyNoKeyDoctrine().fragmentOverFullSoftEnv;
  } catch {
    /* keep */
  }

  // --- Row: action_primary / bend_pickup occupancy ---
  // Scene-first: keep full SCENE softEnv (hall + DOF). Skirt is Should/ZH — do not drop hall.
  // Asset-first: do NOT force synth over warehouse paper; ladder decides hold-card → synth.
  if (primaryObjective === "action_primary" || poseOccupancy === "bend_pickup") {
    const dropSoft =
      fragmentOverFull &&
      Boolean(input.shotDesignSample?.must?.some((m) => m.id === "bg.fragment")) &&
      !input.shotDesignSample?.must?.some((m) => m.id === "bg.scene_soft");
    return {
      dropFullSoftEnv: dropSoft,
      forcePropOccupancySynth: false,
      propPoseOccupancy: poseOccupancy === "bend_pickup" ? "bend_pickup" : poseOccupancy || "bend_pickup",
      identityPreferActionBody: false,
      identityReplaceStandingSheet: true,
      allowAtmosphereSoftEnv: true,
      repairDeltaHints: dropSoft
        ? ["propSoft_resynth_if_no_asset", "drop_softEnv", "identity_bend_sil", "seed"]
        : ["propSoft_resynth_if_no_asset", "identity_bend_sil", "seed"],
      reason: dropSoft
        ? `refs_contract:action_primary/${poseOccupancy}:frag_no_scene_asset_first`
        : `refs_contract:action_primary/${poseOccupancy}:keep_scene_asset_first`,
      primaryObjective: "action_primary",
      poseOccupancy,
    };
  }

  // --- Row: contact_geom (cheek / touch) — softEnv may stay; prop cheek geometry ---
  if (primaryObjective === "contact_geom") {
    return {
      dropFullSoftEnv: false,
      forcePropOccupancySynth: true,
      propPoseOccupancy: poseOccupancy !== "other" ? poseOccupancy : null,
      identityPreferActionBody: false,
      identityReplaceStandingSheet: false,
      allowAtmosphereSoftEnv: true,
      repairDeltaHints: ["propSoft_resynth", "seed"],
      reason: `refs_contract:contact_geom/${poseOccupancy}`,
      primaryObjective: "contact_geom",
      poseOccupancy,
    };
  }

  // --- Row: prop_readable ---
  if (primaryObjective === "prop_readable") {
    return {
      dropFullSoftEnv: fragmentWanted && fragmentOverFull,
      forcePropOccupancySynth: true,
      propPoseOccupancy: poseOccupancy !== "other" ? poseOccupancy : null,
      identityPreferActionBody: false,
      identityReplaceStandingSheet: false,
      allowAtmosphereSoftEnv: true,
      repairDeltaHints: ["propSoft_resynth", "seed"],
      reason: `refs_contract:prop_readable/${poseOccupancy}`,
      primaryObjective: "prop_readable",
      poseOccupancy,
    };
  }

  // --- Row: bg fragment demand without action ---
  if (fragmentWanted && fragmentOverFull) {
    return {
      dropFullSoftEnv: true,
      forcePropOccupancySynth: false,
      propPoseOccupancy: null,
      identityPreferActionBody: false,
      identityReplaceStandingSheet: false,
      allowAtmosphereSoftEnv: true,
      repairDeltaHints: ["drop_softEnv", "fragment_sil", "seed"],
      reason: `refs_contract:bg_fragment/${poseOccupancy}`,
      primaryObjective,
      poseOccupancy,
    };
  }

  // --- Default: identity / scene_keep ---
  return {
    dropFullSoftEnv: false,
    forcePropOccupancySynth: false,
    propPoseOccupancy: null,
    identityPreferActionBody: false,
    identityReplaceStandingSheet: false,
    allowAtmosphereSoftEnv: true,
    repairDeltaHints: ["seed", "egress_hash"],
    reason: `refs_contract:default/${primaryObjective}/${poseOccupancy}`,
    primaryObjective,
    poseOccupancy,
  };
}

/** True when contract demands hostile full SCENE softEnv must not hang. */
export function contractDropsFullSoftEnv(c: StillRefsContract): boolean {
  return c.dropFullSoftEnv === true;
}
