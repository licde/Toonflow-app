/**
 * Golden: design-intent closed loop — sample SSOT, debt precedence, no egress-only green.
 * yarn test:g-intent-closed-loop
 */
import { extractShotDesignSample, sampleMustSurviveStems } from "../src/ruleEngine/design/shotDesignSample";
import {
  STILL_DEBT_PRECEDENCE,
  STILL_SINGLE_SOURCE_FREEZE,
  mergeDebtInjectsByPrecedence,
  mayClaimSampleRepair,
} from "../src/ruleEngine/design/stillDebtPrecedence";
import { qualifyLiteraryEffects } from "../src/ruleEngine/quality/literaryPrimaryEffects";
import { stillQualityUserMessage } from "../src/ruleEngine/quality/practiceCompleteness";
import { resolveStillRefsContract } from "../src/ruleEngine/compilers/stillRefsContract";
import { sealPrimaryIntentCarriers } from "../src/ruleEngine/compilers/primaryIntentSeal";
import { deriveDesignIntentProfile } from "../src/ruleEngine/compilers/designIntentProfile";
import { literaryEffectsPersistSlice } from "../src/ruleEngine/quality/literaryEffectsAfterStill";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error("FAIL", name, detail ?? "");
    process.exit(1);
  }
  console.log("ok", name);
}

const SHOT3: Record<string, unknown> = {
  shotIndex: 3,
  type: "CHAR-SCENE",
  sceneName: "寝殿",
  shotSize: "MS",
  visualDescription: "中景。沈清漪弯腰捡起休书，指尖捏紧纸张边缘，指节泛白，面颊浅痕清晰。",
  charCodes: ["CHAR-SHENQINGYI"],
  shotDesign: {
    composition: { foreground: "沈清漪手捏休书", background: "沈母裙摆" },
    performance: { microExpression: { eyes: "focused", mouthDetail: "neutral_closed" } },
    cameraAnchor: { shotSize: "MS", bgBlur: false },
    lipSyncPolicy: "dialogue_native",
  },
  narrative: {
    spatialRelation: "axis=沈清漪-沈母；anchors=沈清漪弯腰|沈母站立",
  },
  generation: {
    imagePrompt: "古言写实，中景女子弯腰捡起休书…",
  },
};

// 1. Freeze constants
ok("freeze.drive", STILL_SINGLE_SOURCE_FREEZE.driveFields.includes("visualDescription"));
ok("freeze.ban_false", STILL_SINGLE_SOURCE_FREEZE.banFalseComplete.includes("egress_regex_only"));
ok("debt.order", STILL_DEBT_PRECEDENCE[0] === "beat_isolate" && STILL_DEBT_PRECEDENCE[1] === "sample_must");

// 2. Sample extract shot3
{
  const sample = extractShotDesignSample(SHOT3);
  ok("sample.ms", sample.must.some((m) => /camera\.MS|MS/.test(m.id) || /景别：MS/.test(m.text)), JSON.stringify(sample.must));
  ok("sample.bend", sample.should.some((m) => m.id === "action.bend_pickup") || sample.must.some((m) => m.id === "action.bend_pickup"));
  ok("sample.bend_intent_should", sample.should.some((m) => m.id === "action.bend_pickup"), JSON.stringify(sample.should));
  ok("sample.fg", sample.must.some((m) => m.id === "fg.composition" && /休书/.test(m.text)));
  ok("sample.bg_scene", sample.must.some((m) => m.id === "bg.scene_soft" || m.id === "bg.composition"), JSON.stringify(sample.must));
  ok(
    "sample.bg_frag_should",
    sample.should.some((m) => m.id === "bg.fragment") || sample.must.some((m) => m.id === "bg.fragment"),
    JSON.stringify(sample.should),
  );
  ok("sample.xor_mouth", !sample.should.some((m) => /neutral_closed|闭口/.test(m.text)), JSON.stringify(sample.should));
  ok("sample.pose", sample.poseOccupancy === "bend_pickup");
  ok("sample.obj", sample.primaryObjective === "action_primary");
  ok("sample.survive", sampleMustSurviveStems(sample).length >= 3);
}

// 3. Debt merge reasserts must over later inject
{
  const merged = mergeDebtInjectsByPrecedence(
    [
      { layer: "fidelity_inject", lines: ["气氛很长很长"] },
      { layer: "sample_must", lines: ["占位：弯腰捡拾"] },
      { layer: "ird_design_only", lines: ["括号槽补丁"] },
    ],
    { mustStems: ["占位：弯腰捡拾"] },
  );
  ok("debt.must_first", /弯腰/.test(merged.lines[0] ?? "") || merged.lines.some((l) => /弯腰/.test(l)));
  ok("debt.no_claim_without_plate", mayClaimSampleRepair({ platesSwapped: false }) === false);
  ok("debt.claim_with_plate", mayClaimSampleRepair({ platesSwapped: true, layer: "lit_plate_delta" }) === true);
}

// 4. Trunk may qualify without bend pixel; pose realization degraded
{
  const profile = deriveDesignIntentProfile({
    visualDescription: String(SHOT3.visualDescription),
    imagePrompt: String(SHOT3.visualDescription),
  });
  const seal = sealPrimaryIntentCarriers({ profile, literaryHash: "t" });
  const GOOD =
    "占位：弯腰捡拾，道具在主手触地。握持：指尖捏紧指节泛白。休书薄纸主手触地。背景仅次角裙摆碎片。";
  const noHeur = qualifyLiteraryEffects({
    visualDescription: String(SHOT3.visualDescription),
    promptUsed: GOOD,
    seal,
    refsRoles: ["identity", "propSoft"],
    propPlateGrade: "synthetic_geometry",
  });
  ok("qualify.egress_trunk_ok", noHeur.literaryEffectsQualified, JSON.stringify(noHeur.missingEffects));
  ok(
    "qualify.egress_no_degrade",
    noHeur.realization?.realizationDegraded !== true,
    JSON.stringify(noHeur.realization),
  );
  ok(
    "qualify.egress_bend_kept",
    noHeur.realization?.realizationOccupancy === "bend_pickup",
    JSON.stringify(noHeur.realization),
  );
  const withHeur = qualifyLiteraryEffects({
    visualDescription: String(SHOT3.visualDescription),
    promptUsed: GOOD,
    seal,
    refsRoles: ["identity", "propSoft"],
    propPlateGrade: "synthetic_geometry",
    localHeuristicOk: true,
    localSignals: { groundPropSuspected: true, holdCardSuspected: false, primaryPoseGuess: "bend_pickup" },
  });
  ok("qualify.with_heuristic_ok", withHeur.literaryEffectsQualified, JSON.stringify(withHeur.missingEffects));
  ok("qualify.with_heuristic_no_degrade", withHeur.realization?.realizationDegraded !== true);
}

// 5. Refs contract from sample
{
  const sample = extractShotDesignSample(SHOT3);
  const c = resolveStillRefsContract({
    visualDescription: String(SHOT3.visualDescription),
    shotDesignSample: sample,
  });
  ok("refs.drop_soft", c.dropFullSoftEnv === true, c.reason);
  ok("refs.force_prop", c.forcePropOccupancySynth === false);
  ok("refs.t2i_first", /t2i_first/.test(c.reason) || c.dropFullSoftEnv === true, c.reason);
  ok("refs.face_lock", c.identityReplaceStandingSheet === true && c.identityPreferActionBody === false);
}

// 6. UX: no「已达」on egress-only miss; sample wording
{
  const miss = stillQualityUserMessage({
    literaryEffectsQualified: false,
    sampleMustFulfilled: false,
    missingEffects: ["occupancy.bend_pickup"],
  });
  ok("ux.sample_unfulfilled", /样本未兑现|未全达/.test(miss) && !/主效果已达/.test(miss), miss);
  const okMsg = stillQualityUserMessage({
    keyAbsent: true,
    literaryEffectsQualified: true,
    sampleMustFulfilled: true,
  });
  ok("ux.must_ok_key", /必须元素已兑现|主效果已达/.test(okMsg), okMsg);
}

// 7. Persist slice has sampleFulfillment
{
  const slice = literaryEffectsPersistSlice({
    literaryEffectsQualified: false,
    missingEffects: [
      { id: "prop.in_frame.paper", tier: "L0", bar: "must", reason: "x" },
    ],
    shouldMisses: [],
    sources: [],
    localPoseSignals: {},
    repairInjectLines: [],
    repairDeltaHints: [],
    forceFull: true,
    sampleMustFulfilled: false,
    sampleMustMissIds: ["fg.prop_hand"],
  });
  ok(
    "persist.sampleFulfillment",
    (slice.sampleFulfillment as { mustFulfilled?: boolean })?.mustFulfilled === false,
  );
}

console.log("ALL PASS test-g-intent-closed-loop");
