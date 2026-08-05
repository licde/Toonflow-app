/**
 * Golden: beat isolate oral-CU + honest plate claim + bend refs contract.
 * yarn test:g-beat-isolate-true-plates
 */
import {
  stripHostileCheekLegislation,
  isOffBeatOralCuClause,
  assertEgressObeysPrimarySeal,
} from "../src/ruleEngine/compilers/stillSealGate";
import { softenContinuityForFirstFrame } from "../src/ruleEngine/compilers/stillFirstFrameLiterarySsot";
import { resolveLiteraryStillPrompt } from "../src/ruleEngine/compilers/literaryStillSsot";
import { resolveStillRefsContract } from "../src/ruleEngine/compilers/stillRefsContract";
import { stillQualityUserMessage } from "../src/ruleEngine/quality/practiceCompleteness";
import { sealPrimaryIntentCarriers } from "../src/ruleEngine/compilers/primaryIntentSeal";
import { deriveDesignIntentProfile } from "../src/ruleEngine/compilers/designIntentProfile";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error("FAIL", name, detail ?? "");
    process.exit(1);
  }
  console.log("ok", name);
}

const SHOT2_CU =
  "特写。沈清漪紧咬下唇，唇瓣渗出血珠，眼神隐忍，面颊浅痕未消。";
const SHOT3_VD =
  "中景。沈清漪弯腰捡起休书，指尖捏紧纸张边缘，指节泛白，面颊浅痕清晰。";
const SHOT2_IMAGE =
  "古言写实，特写女子紧咬下唇渗血珠，眼神隐忍，面颊浅红印痕，烛火暖光";

const profile = deriveDesignIntentProfile({
  visualDescription: SHOT3_VD,
  imagePrompt: SHOT3_VD,
});
const seal = sealPrimaryIntentCarriers({ profile, literaryHash: "t" });
ok("seal.bend", seal.poseOccupancy === "bend_pickup" || profile.poseOccupancy === "bend_pickup");

// 1. Off-beat oral clause detection — 浅痕 no longer exempts blood
ok("oral.clause_shot2", isOffBeatOralCuClause(SHOT2_CU, SHOT3_VD) === true);
ok(
  "oral.clause_shallow_only",
  isOffBeatOralCuClause("面颊浅痕清晰", SHOT3_VD) === false,
);

// 2. stripHostile removes shot2 sentence even with 浅痕
{
  const mixed = `${SHOT3_VD}。${SHOT2_CU}。占位：弯腰捡拾。`;
  const out = stripHostileCheekLegislation(mixed, seal, {
    currentVisualDescription: SHOT3_VD,
  });
  ok("strip.no_咬唇", !/紧咬下唇|渗出血珠|眼神隐忍/.test(out.prompt), out.prompt);
  ok("strip.keeps_bend", /弯腰|捡起|休书/.test(out.prompt), out.prompt);
  ok("strip.keeps_浅痕", /浅痕/.test(out.prompt), out.prompt);
  ok("strip.did_strip", out.stripped.some((s) => /oral_cu|blood/.test(s)), JSON.stringify(out.stripped));
}

// 3. continuity path
{
  const soft = softenContinuityForFirstFrame({
    continuity: `continues from ${SHOT2_CU}`,
    visualDescription: SHOT3_VD,
    maxChars: 80,
  });
  ok(
    "cont.no_oral",
    !soft.text || !/紧咬下唇|渗出血珠|特写/.test(soft.text),
    String(soft.text),
  );
  ok("cont.stripped", soft.strippedContamination === true || !soft.text);
}

// 4. compiled imagePrompt scrubbed when VD is bend
{
  const lit = resolveLiteraryStillPrompt({
    visualDescription: SHOT3_VD,
    compiledImagePrompt: SHOT2_IMAGE,
  });
  ok("lit.no_oral_primary", !/紧咬下唇|渗血珠|渗出血珠/.test(lit.literary), lit.literary);
  ok("lit.has_bend", /弯腰|捡起|休书/.test(lit.literary), lit.literary);
}

// 5. assertEgress full path
{
  const eg = assertEgressObeysPrimarySeal({
    prompt: `古言写实。${SHOT2_CU}。${SHOT3_VD}`,
    seal,
    ensureBendLead: true,
  });
  ok("egress.no_oral", !/紧咬下唇|渗出血珠|眼神隐忍/.test(eg.prompt), eg.prompt);
  ok("egress.bend", /弯腰|捡拾|捡起/.test(eg.prompt), eg.prompt);
}

// 6. Honest plate claim + pose gate
{
  const fake = stillQualityUserMessage({
    sampleMustFulfilled: false,
    literaryEffectsQualified: false,
    missingEffects: ["action.bend_pickup"],
    platesSwapped: false,
  });
  ok("ux.no_已强制换板", !/已按参考契约强制换板|已换板重出/.test(fake), fake);
  ok("ux.须换板", /须换板/.test(fake), fake);

  const swappedNoPose = stillQualityUserMessage({
    sampleMustFulfilled: false,
    literaryEffectsQualified: false,
    missingEffects: ["action.bend_pickup"],
    platesSwapped: true,
    poseEvidenceOk: false,
  });
  ok("ux.已换板_姿态未过", /姿态未过|须复验/.test(swappedNoPose), swappedNoPose);
  ok("ux.禁假已换板重出", !/已按参考契约换板重出/.test(swappedNoPose), swappedNoPose);

  const real = stillQualityUserMessage({
    sampleMustFulfilled: false,
    literaryEffectsQualified: false,
    missingEffects: ["action.bend_pickup"],
    platesSwapped: true,
    poseEvidenceOk: true,
  });
  ok("ux.已换板", /已按参考契约换板重出/.test(real), real);
}

// 7. Refs contract bend — T2I-first drops SCENE softEnv
{
  const c = resolveStillRefsContract({
    visualDescription: SHOT3_VD,
    poseOccupancy: "bend_pickup",
    primaryObjective: "action_primary",
  });
  ok("refs.drop_soft", c.dropFullSoftEnv === true, c.reason);
  ok("refs.force_prop", c.forcePropOccupancySynth === false);
  ok("refs.t2i_first", /t2i_first_drop_scene/.test(c.reason), c.reason);
  ok("refs.face_lock", c.identityReplaceStandingSheet === true && c.identityPreferActionBody === false);
  ok("refs.drop_hint", c.repairDeltaHints.includes("drop_softEnv"), c.repairDeltaHints.join(","));
}

console.log("ALL PASS test-g-beat-isolate-true-plates");
