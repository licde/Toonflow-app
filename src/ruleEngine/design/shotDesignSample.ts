/**
 * Shot design sample SSOT — unique drive source for still closed loop.
 * Must/Should atoms from visualDescription + shotDesign + spatialRelation.
 * generation.imagePrompt must NOT reverse-cover these atoms.
 */
export type SampleAtomBar = "must" | "should" | "detail";

export type SampleAtom = {
  id: string;
  bar: SampleAtomBar;
  /** Human-readable stem for egress / repair */
  text: string;
  sourcePath: string;
};

export type ShotDesignSample = {
  must: SampleAtom[];
  should: SampleAtom[];
  detail: SampleAtom[];
  shotSize: string | null;
  bgBlur: boolean | null;
  colorTemp: string | null;
  lipSyncPolicy: string | null;
  poseOccupancy: string | null;
  primaryObjective: string | null;
  /** Current-shot VD only — never neighbor lexicon */
  visualDescription: string;
  sources: string[];
};

function shotDesignOf(shot: Record<string, unknown> | null | undefined) {
  return shot?.shotDesign as
    | {
        composition?: { foreground?: string; background?: string };
        performance?: { microExpression?: { eyes?: string; mouthDetail?: string } };
        cameraAnchor?: { shotSize?: string; bgBlur?: boolean; colorTemp?: string };
        lipSyncPolicy?: string;
      }
    | undefined;
}

function inferPoseOccupancy(vd: string, spatial?: string | null): string | null {
  const blob = `${vd}\n${spatial ?? ""}`;
  if (/弯腰|捡起|捡拾|俯身/.test(blob)) return "bend_pickup";
  if (/跪|捧持|胸前/.test(blob)) return "kneel_hold";
  if (/伏案|伏桌|靠案/.test(blob)) return "desk_lean";
  return null;
}

function inferPrimaryObjective(vd: string, occ: string | null, shotSize: string | null): string {
  if (occ === "bend_pickup" || /弯腰|捡起|捡拾/.test(vd)) return "action_primary";
  if (/划过|触肤|贴颊|接触/.test(vd)) return "contact_geom";
  if (/题名|字形|可读/.test(vd) && /特写|近景|CU/.test(`${vd}${shotSize ?? ""}`)) return "prop_readable";
  return "identity_first";
}

/**
 * Extract Must/Should atoms from one shot JSON.
 * Neighbor VDs must NOT be passed in — current shot only.
 */
export function extractShotDesignSample(
  shot: Record<string, unknown> | null | undefined,
): ShotDesignSample {
  const sources: string[] = ["shotDesignSample.extract"];
  const vd = String(shot?.visualDescription ?? "").trim();
  const sd = shotDesignOf(shot);
  const narr = shot?.narrative as
    | { spatialRelation?: string; shotSize?: string; colorTemp?: string }
    | undefined;
  const spatial = String(narr?.spatialRelation ?? (shot as { spatialRelation?: string })?.spatialRelation ?? "");
  const shotSize = String(
    sd?.cameraAnchor?.shotSize ?? shot?.shotSize ?? narr?.shotSize ?? "",
  ).trim() || null;
  const bgBlur =
    typeof sd?.cameraAnchor?.bgBlur === "boolean" ? sd.cameraAnchor.bgBlur : null;
  const colorTemp = String(
    sd?.cameraAnchor?.colorTemp ?? (shot as { colorTemp?: string })?.colorTemp ?? narr?.colorTemp ?? "",
  ).trim() || null;
  const lipSyncPolicy = String(sd?.lipSyncPolicy ?? "").trim() || null;
  const fg = String(sd?.composition?.foreground ?? "").trim();
  const bg = String(sd?.composition?.background ?? "").trim();
  const eyes = String(sd?.performance?.microExpression?.eyes ?? "").trim();
  let mouth = String(sd?.performance?.microExpression?.mouthDetail ?? "").trim();
  // XOR: dialogue_native wins over closed-mouth must
  if (lipSyncPolicy === "dialogue_native" && /neutral_closed|闭口|抿嘴/.test(mouth)) {
    mouth = "";
    sources.push("shotDesignSample.xor_lipSync_over_closed_mouth");
  }

  const poseOccupancy = inferPoseOccupancy(vd, spatial);
  const primaryObjective = inferPrimaryObjective(vd, poseOccupancy, shotSize);

  const must: SampleAtom[] = [];
  const should: SampleAtom[] = [];
  const detail: SampleAtom[] = [];

  if (shotSize) {
    must.push({
      id: `camera.${shotSize}`,
      bar: "must",
      text: `景别：${shotSize}`,
      sourcePath: "shotDesign.cameraAnchor.shotSize|shot.shotSize",
    });
  }
  if (poseOccupancy === "bend_pickup" || /弯腰|捡起|捡拾|俯身/.test(vd)) {
    // Intent atom retained; realization may degrade — does not block trunk burn Must
    should.push({
      id: "action.bend_pickup",
      bar: "should",
      text: "占位：弯腰捡拾，躯干前倾（意图；实现可降级）",
      sourcePath: "visualDescription|narrative.spatialRelation",
    });
    sources.push("shotDesignSample.action_bend_intent_should");
  }
  if (fg) {
    must.push({
      id: "fg.composition",
      bar: "must",
      text: `前景：${fg}`,
      sourcePath: "shotDesign.composition.foreground",
    });
  } else if (/休书|婚书|信笺|纸/.test(vd)) {
    const phase = String((shot as { narrative?: { stillPhase?: string } })?.narrative?.stillPhase ?? "");
    const approaching =
      phase === "approaching" ||
      phase === "mid_contact" ||
      (/弯腰|俯身|捡/.test(vd) && phase !== "held");
    must.push({
      id: "fg.prop_hand",
      bar: "must",
      text: approaching ? "主手伸向/刚触纸入画" : "主手持/触纸入画",
      sourcePath: "visualDescription",
    });
  }
  // Scene-first: hall + shallow DOF is Must; skirt/hem fragment is Should (enhancement).
  // Pure fragment-only shots (no bgBlur / no scene cue) keep fragment as Must.
  const fragBg = Boolean(bg && /裙摆|衣角|碎片/.test(bg));
  const sceneCue =
    bgBlur === true ||
    /殿|厅|堂|厢|室|SCENE|场景|烛火|暖光|浅景深/.test(`${bg} ${vd} ${colorTemp ?? ""}`) ||
    Boolean(shot?.sceneName) ||
    Boolean((shot as { sceneCode?: string })?.sceneCode);
  if (sceneCue || bgBlur === true) {
    const noDof = bgBlur === false;
    must.push({
      id: "bg.scene_soft",
      bar: "must",
      text: noDof
        ? "背景：主场景环境轮廓可辨，禁止浅景深抢戏，禁止灰棚白棚"
        : "背景：主场景浅景深虚化，禁止灰棚白棚",
      sourcePath: "shotDesign.cameraAnchor.bgBlur|composition.background|scene",
    });
    sources.push(noDof ? "shotDesignSample.bg_scene_env_must" : "shotDesignSample.bg_scene_soft_must");
  } else if (bg && !fragBg) {
    must.push({
      id: "bg.composition",
      bar: "must",
      text: `背景：${bg}`,
      sourcePath: "shotDesign.composition.background",
    });
  }
  if (fragBg) {
    if (sceneCue || bgBlur === true) {
      should.push({
        id: "bg.fragment",
        bar: "should",
        text: `加强：${bg}浅景深可辨，禁止次角完整正脸抢戏`,
        sourcePath: "shotDesign.composition.background",
      });
      sources.push("shotDesignSample.bg_fragment_should");
    } else {
      must.push({
        id: "bg.fragment",
        bar: "must",
        text: `背景仅${bg}浅景深，禁止次角完整正脸抢戏`,
        sourcePath: "shotDesign.composition.background",
      });
    }
  }
  if (/指节|捏紧|指尖/.test(vd)) {
    const phase = String((shot as { narrative?: { stillPhase?: string } })?.narrative?.stillPhase ?? "");
    const approaching = phase === "approaching" || phase === "mid_contact" || (/弯腰|俯身|捡/.test(vd) && phase !== "held");
    if (!approaching) {
      should.push({
        id: "grip.knuckles_pale",
        bar: "should",
        text: "握持：指尖捏紧，指节泛白",
        sourcePath: "visualDescription",
      });
    } else {
      sources.push("shotDesignSample.grip_skip_approaching");
    }
  }
  if (eyes) {
    should.push({
      id: "perf.eyes",
      bar: "should",
      text: `眼神：${eyes}`,
      sourcePath: "shotDesign.performance.microExpression.eyes",
    });
  }
  if (mouth) {
    should.push({
      id: "perf.mouth",
      bar: "should",
      text: `嘴型：${mouth}`,
      sourcePath: "shotDesign.performance.microExpression.mouthDetail",
    });
  }
  if (colorTemp) {
    should.push({
      id: "atmosphere.color_temp",
      bar: "should",
      text: `色温：${colorTemp}`,
      sourcePath: "shotDesign.cameraAnchor.colorTemp",
    });
  }
  if (/浅痕|伤痕|颊/.test(vd) && !/弯腰|捡起/.test(vd)) {
    detail.push({
      id: "detail.wound_shallow",
      bar: "detail",
      text: "面颊浅痕",
      sourcePath: "visualDescription",
    });
  }

  sources.push(`shotDesignSample.must:${must.map((m) => m.id).join(",")}`);
  return {
    must,
    should,
    detail,
    shotSize,
    bgBlur,
    colorTemp,
    lipSyncPolicy,
    poseOccupancy,
    primaryObjective,
    visualDescription: vd,
    sources,
  };
}

/** Must stems that must survive Seedream compress. */
export function sampleMustSurviveStems(sample: ShotDesignSample): string[] {
  return sample.must.map((m) => m.text).filter(Boolean);
}

/**
 * True when sample demands fragment over full SCENE softEnv.
 * Scene-first: only when fragment is Must AND no scene_soft Must (no hall available).
 */
export function sampleWantsFragmentOverSoftEnv(sample: ShotDesignSample): boolean {
  const fragMust = sample.must.some((m) => m.id === "bg.fragment");
  const sceneMust = sample.must.some((m) => m.id === "bg.scene_soft" || m.id === "bg.composition");
  if (sceneMust) return false;
  return fragMust;
}
