/**
 * Per-atom sample fulfillment — Must atoms judged independently.
 * Egress alone cannot pass action.* / bg.*; holdCard fails bend.
 */
import type { LocalPoseSignals } from "../quality/literaryPrimaryEffects";
import type { SampleAtom, ShotDesignSample } from "./shotDesignSample";

export type SampleAtomJudgment = {
  id: string;
  bar: "must" | "should" | "detail";
  pass: boolean;
  evidence: string;
  repairHint: string[];
};

export type JudgeSampleAtomsResult = {
  atoms: SampleAtomJudgment[];
  mustFulfilled: boolean;
  mustMissIds: string[];
  shouldMissIds: string[];
  sources: string[];
};

export type JudgeSampleAtomsInput = {
  sample: ShotDesignSample;
  promptUsed?: string | null;
  refsRoles?: string[] | null;
  /** propSoft slot has real bytes */
  propSoftPresent?: boolean | null;
  propPlateMissing?: boolean | null;
  /** Intentional drop of full SCENE softEnv */
  droppedSoftEnv?: boolean | null;
  softEnvHung?: boolean | null;
  /** True fragment_sil hung — bg.fragment may pass without SCENE softEnv */
  fragmentPlateHung?: boolean | null;
  localSignals?: LocalPoseSignals | null;
  /** Heuristic ran; bend fail-closed when not true */
  localHeuristicOk?: boolean | null;
};

function roleHas(roles: string[], role: string): boolean {
  return roles.includes(role);
}

function judgeOne(
  atom: SampleAtom,
  input: JudgeSampleAtomsInput,
  roles: string[],
  prompt: string,
): SampleAtomJudgment {
  const sig = input.localSignals ?? {};
  const holdBad =
    (sig.holdCardSuspected === true && sig.groundPropSuspected !== true) ||
    sig.primaryPoseGuess === "kneel_hold" ||
    sig.primaryPoseGuess === "stand_hold" ||
    sig.kneelSquatSuspected === true;
  const bendFailClosed =
    input.localHeuristicOk !== true && sig.groundPropSuspected !== true;

  if (atom.id === "action.bend_pickup" || atom.id.startsWith("action.")) {
    const egressOk = /弯腰|捡拾|捡起|俯身|占位：/.test(prompt);
    // Egress alone NEVER passes action atoms
    if (holdBad) {
      return {
        id: atom.id,
        bar: atom.bar,
        pass: false,
        evidence:
          sig.kneelSquatSuspected === true || sig.primaryPoseGuess === "kneel_hold"
            ? "kneel_squat_ne_bend"
            : "hold_card_ne_bend",
        repairHint: ["propSoft_resynth", "identity_bend_sil", "preferActionBody", "seed", "anti_kneel"],
      };
    }
    if (bendFailClosed) {
      return {
        id: atom.id,
        bar: atom.bar,
        pass: false,
        evidence: "heuristic_failclosed_bend",
        repairHint: ["propSoft_resynth", "identity_bend_sil", "preferActionBody", "seed"],
      };
    }
    if (sig.uprightTorsoSuspected === true && sig.groundPropSuspected !== true) {
      return {
        id: atom.id,
        bar: atom.bar,
        pass: false,
        evidence: "upright_ne_bend",
        repairHint: ["propSoft_resynth", "identity_bend_sil", "preferActionBody", "seed"],
      };
    }
    const poseOk =
      sig.primaryPoseGuess === "bend_pickup" &&
      sig.kneelSquatSuspected !== true &&
      !holdBad;
    if (!poseOk) {
      return {
        id: atom.id,
        bar: atom.bar,
        pass: false,
        evidence: egressOk ? "egress_only_no_pose_evidence" : "pose_and_egress_missing",
        repairHint: ["propSoft_resynth", "identity_bend_sil", "preferActionBody", "seed", "anti_kneel"],
      };
    }
    return {
      id: atom.id,
      bar: atom.bar,
      pass: true,
      evidence: "pose_ground_ok",
      repairHint: [],
    };
  }

  if (atom.id.startsWith("camera.")) {
    const size = atom.id.replace(/^camera\./, "");
    const msOk =
      /中景|MS|半身/.test(prompt) ||
      size === "MS" ||
      /景别：MS|shotSize.*MS/i.test(prompt);
    const faceCuOnly = /脸部特写|脸CU|纯脸|face.?CU/i.test(prompt) && !/中景|半身|弯腰/.test(prompt);
    if (faceCuOnly) {
      return {
        id: atom.id,
        bar: atom.bar,
        pass: false,
        evidence: "face_cu_dominates",
        repairHint: ["preferActionBody", "seed"],
      };
    }
    // Camera is legislation+compose; pass when size stem present or not contradicted
    if (size === "MS" && !msOk && /特写|CU|近景/.test(prompt) && !/中景/.test(prompt)) {
      return {
        id: atom.id,
        bar: atom.bar,
        pass: false,
        evidence: "shot_size_mismatch",
        repairHint: ["preferActionBody", "seed"],
      };
    }
    return {
      id: atom.id,
      bar: atom.bar,
      pass: true,
      evidence: msOk ? "camera_ms_ok" : "camera_no_contradiction",
      repairHint: [],
    };
  }

  if (atom.id.startsWith("fg.") || atom.id.includes("prop")) {
    const propSoft =
      input.propSoftPresent === true ||
      (roleHas(roles, "propSoft") && input.propPlateMissing !== true);
    const inText = /休书|婚书|信笺|纸|薄纸|主手/.test(prompt) || /休书|纸/.test(atom.text);
    if (input.propPlateMissing === true && !propSoft) {
      return {
        id: atom.id,
        bar: atom.bar,
        pass: false,
        evidence: "propSoft_slot_missing",
        repairHint: ["propSoft_resynth"],
      };
    }
    if (!inText && !propSoft) {
      return {
        id: atom.id,
        bar: atom.bar,
        pass: false,
        evidence: "prop_not_in_frame",
        repairHint: ["propSoft_resynth"],
      };
    }
    return {
      id: atom.id,
      bar: atom.bar,
      pass: true,
      evidence: propSoft ? "propSoft_present" : "prop_in_egress",
      repairHint: [],
    };
  }

  if (atom.id === "bg.scene_soft" || atom.id === "bg.composition") {
    const softHung =
      roleHas(roles, "softEnv") || input.softEnvHung === true;
    const grayOnly =
      sig.grayStudioSuspected === true ||
      (/灰棚|白棚|纯色摄影棚/.test(prompt) && !/禁止灰棚/.test(prompt));
    const voidScene =
      sig.voidBgSuspected === true || sig.sceneIllegibleSuspected === true;
    if (sig.modernAttireSuspected === true) {
      return {
        id: atom.id,
        bar: atom.bar,
        pass: false,
        evidence: "modern_attire_blocks_scene_trunk",
        repairHint: ["identity_bend_sil", "seed"],
      };
    }
    // softEnv role missing = debt (挂板≠像素；egress ZH alone never greens Must)
    if (!softHung) {
      return {
        id: atom.id,
        bar: atom.bar,
        pass: false,
        evidence: input.droppedSoftEnv === true ? "scene_soft_dropped" : "softEnv_role_missing",
        repairHint: ["keep_softEnv", "seed"],
      };
    }
    // softEnv hung but output void/illegible / gray → Must fail
    if (voidScene) {
      return {
        id: atom.id,
        bar: atom.bar,
        pass: false,
        evidence: sig.voidBgSuspected ? "void_bg_despite_softEnv" : "scene_illegible_despite_softEnv",
        repairHint: ["keep_softEnv", "seed", "propSoft_resynth"],
      };
    }
    if (grayOnly) {
      return {
        id: atom.id,
        bar: atom.bar,
        pass: false,
        evidence: "gray_studio_despite_softEnv",
        repairHint: ["keep_softEnv", "seed"],
      };
    }
    return {
      id: atom.id,
      bar: atom.bar,
      pass: true,
      evidence: "softEnv_hung_scene_ok",
      repairHint: [],
    };
  }

  if (atom.id === "bg.fragment" || (atom.id.startsWith("bg.") && atom.id !== "bg.scene_soft")) {
    // Should enhancement: skirt ZH or fragment plate — never veto Must via softEnv hung
    const fragOk =
      /裙摆|衣角|碎片|浅景深/.test(prompt) ||
      /裙摆|碎片/.test(atom.text) ||
      input.fragmentPlateHung === true;
    if (atom.bar === "should") {
      return {
        id: atom.id,
        bar: atom.bar,
        pass: fragOk,
        evidence: fragOk ? "fragment_should_ok" : "fragment_should_miss",
        repairHint: fragOk ? [] : ["egress_hash"],
      };
    }
    // Must fragment only when no scene path (rare)
    const softGone =
      input.droppedSoftEnv === true ||
      input.softEnvHung === false ||
      !roleHas(roles, "softEnv") ||
      input.fragmentPlateHung === true;
    if (!fragOk && !softGone) {
      return {
        id: atom.id,
        bar: atom.bar,
        pass: false,
        evidence: "bg_fragment_missing",
        repairHint: ["fragment_sil", "seed"],
      };
    }
    return {
      id: atom.id,
      bar: atom.bar,
      pass: true,
      evidence: input.fragmentPlateHung
        ? "fragment_plate_hung_ok"
        : softGone
          ? "softEnv_dropped_fragment_ok"
          : "bg_fragment_egress",
      repairHint: [],
    };
  }

  // Default: should/detail — text presence
  const textHit = atom.text.slice(0, 4) && prompt.includes(atom.text.slice(0, Math.min(4, atom.text.length)));
  return {
    id: atom.id,
    bar: atom.bar,
    pass: atom.bar !== "must" || Boolean(textHit) || prompt.length > 0,
    evidence: textHit ? "text_hit" : "default_pass_non_blocking",
    repairHint: atom.bar === "should" ? ["egress_hash"] : [],
  };
}

/**
 * Judge each sample atom independently. Must fulfilled iff every must pass.
 */
export function judgeSampleAtoms(input: JudgeSampleAtomsInput): JudgeSampleAtomsResult {
  const roles = (input.refsRoles ?? []).map(String);
  const prompt = String(input.promptUsed ?? "");
  const sources: string[] = ["judgeSampleAtoms"];
  const atoms: SampleAtomJudgment[] = [];

  for (const atom of input.sample.must) {
    atoms.push(judgeOne(atom, input, roles, prompt));
  }
  for (const atom of input.sample.should) {
    const j = judgeOne(atom, input, roles, prompt);
    // Should never blocks; record miss for repair targets
    if (!j.pass) {
      atoms.push({ ...j, pass: false });
    } else {
      atoms.push(j);
    }
  }

  const mustAtoms = atoms.filter((a) => a.bar === "must");
  const mustMissIds = mustAtoms.filter((a) => !a.pass).map((a) => a.id);
  const shouldMissIds = atoms.filter((a) => a.bar === "should" && !a.pass).map((a) => a.id);
  const mustFulfilled = mustMissIds.length === 0 && mustAtoms.length > 0
    ? true
    : mustAtoms.length === 0
      ? true
      : false;

  if (mustMissIds.length) sources.push(`judge.must_miss:${mustMissIds.join(",")}`);
  if (shouldMissIds.length) sources.push(`judge.should_miss:${shouldMissIds.join(",")}`);
  if (mustFulfilled) sources.push("judge.must_fulfilled");

  return {
    atoms,
    mustFulfilled: mustAtoms.length === 0 ? true : mustMissIds.length === 0,
    mustMissIds,
    shouldMissIds,
    sources,
  };
}

/** Map sample atom miss → repair delta hints (per-atom repair map). */
export function repairHintsForSampleMisses(missIds: string[]): {
  injectLines: string[];
  deltaHints: string[];
  forceFull: boolean;
} {
  const injectLines: string[] = [];
  const deltaHints: string[] = [];
  let forceFull = false;
  for (const id of missIds) {
    if (id === "action.bend_pickup" || id.startsWith("action.")) {
      injectLines.push("占位：站姿弯腰捡拾，躯干前倾，纸在主手触地；禁止蹲跪盘坐、禁止胸前捧持展示");
      deltaHints.push("propSoft_resynth", "identity_bend_sil", "preferActionBody", "anti_kneel", "seed");
      forceFull = true;
    } else if (id.startsWith("fg.") || id.includes("prop")) {
      injectLines.push("本镜休书薄纸须清晰入画于主手触地，题名可辨");
      deltaHints.push("propSoft_resynth");
      forceFull = true;
    } else if (id === "bg.scene_soft" || id === "bg.composition") {
      injectLines.push("背景：主场景浅景深虚化，禁止灰棚白棚");
      deltaHints.push("keep_softEnv", "seed");
      forceFull = true;
    } else if (id === "bg.fragment" || id.startsWith("bg.")) {
      // Should enhancement — do not drop SCENE
      injectLines.push("裙摆/衣角浅景深虚化可辨（加强项），禁止次角完整正脸抢戏");
      deltaHints.push("egress_hash");
    } else if (id.startsWith("camera.")) {
      injectLines.push("景别中景半身动作体，禁止脸部特写独占");
      deltaHints.push("preferActionBody", "seed");
      forceFull = true;
    }
  }
  return {
    injectLines: [...new Set(injectLines)].slice(0, 6),
    deltaHints: [...new Set(deltaHints)],
    forceFull,
  };
}

/** Convert sample miss ids to LiteraryEffectMiss-shaped objects for applyLiteraryRepairDeltas. */
export function sampleMissesAsLiteraryMisses(
  missIds: string[],
): Array<{ id: string; tier: "L0" | "L1" | "L2"; bar: "must" | "should"; reason: string }> {
  return missIds.map((id) => {
    if (id === "action.bend_pickup" || id.startsWith("action.")) {
      return {
        id: "occupancy.bend_pickup",
        tier: "L0" as const,
        bar: "should" as const,
        reason: `sample:${id}`,
      };
    }
    if (id.startsWith("fg.") || id.includes("prop")) {
      return { id: "prop.in_frame.paper", tier: "L0" as const, bar: "must" as const, reason: `sample:${id}` };
    }
    if (id === "bg.scene_soft" || id === "bg.composition") {
      return { id: "bg.no_gray_studio", tier: "L0" as const, bar: "must" as const, reason: `sample:${id}` };
    }
    if (id === "bg.fragment" || id.startsWith("bg.")) {
      return { id: "bg.fragment.skirt", tier: "L2" as const, bar: "should" as const, reason: `sample:${id}` };
    }
    if (id.startsWith("camera.")) {
      return { id: "occupancy.bend_pickup", tier: "L0" as const, bar: "should" as const, reason: `sample:${id}` };
    }
    return { id: "prop.in_frame.paper", tier: "L0" as const, bar: "must" as const, reason: `sample:${id}` };
  });
}
