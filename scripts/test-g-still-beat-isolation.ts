/**
 * Golden: still beat isolation / MS faceCu / prop surface / skirt / action lead.
 * yarn test:g-still-beat-isolation
 */
import { resolveStillBgPolicy } from "../src/ruleEngine/compilers/stillBgPolicy";
import { extractDescPredicates } from "../src/ruleEngine/compilers/extractDescPredicates";
import {
  composeStillPrompt,
  literaryComposeHash,
  buildStillPreviousIngress,
  type ComposeStillContext,
} from "../src/ruleEngine/compilers/composeStillPrompt";
import {
  previousBodyHasOffBeatContamination,
  resolveBgFragment,
  preserveLiteraryCoreForEdit,
} from "../src/ruleEngine/compilers/stillFirstFrameLiterarySsot";
import { deriveShotModalityIntent } from "../src/ruleEngine/compilers/shotModalityIntent";
import { selectStillActuatorProfile, compressStillEgressForSeedream } from "../src/ruleEngine/compilers/stillActuatorProfile";
import { judgeStillHeuristicNoVlm } from "../src/ruleEngine/quality/heuristicStillJudge";
import { assertStillContactVideoHandoff } from "../src/ruleEngine/qc/stillContactVideoHandoff";
import { deriveFailureCluster } from "../src/ruleEngine/quality/failureClusterLibrary";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error("FAIL", name, detail ?? "");
    process.exit(1);
  }
  console.log("ok", name);
}

const VD =
  "中景。沈清漪弯腰捡起休书，指尖捏紧纸张边缘，指节泛白，面颊浅痕清晰。";
const IMAGE =
  "古言写实，中景女子弯腰捡起休书，指尖捏紧纸张指节泛白，面颊浅痕，沈母裙摆虚化背景，暖光烛火";
const PREV_LIP =
  "特写沈清漪紧咬下唇渗血，lip_bite_blood，前景：沈清漪唇部，休书纸角划过面颊";

// 1. MS + 面颊浅痕 ≠ faceCuDropScene
{
  const bg = resolveStillBgPolicy({
    description: VD,
    shotSize: "MS",
    characterNames: ["沈清漪"],
    hasSceneLink: true,
  });
  ok("ms_no_faceCu", bg.reason !== "faceCuDropScene", bg.reason);
}

// 2. previous 咬唇 + 本拍捡书 → contamination
ok(
  "off_beat_contam",
  previousBodyHasOffBeatContamination(PREV_LIP, VD),
  "expected off-beat",
);

// 3. hardConstraint 休书 not 捡纸角
{
  const pack = extractDescPredicates({ description: VD, characterNames: ["沈清漪"] });
  const hard = String(pack.hardConstraintLine ?? "");
  ok("surface_休书", /休书/.test(hard) || pack.predicates.some((p) => p.prop === "休书"), hard);
  ok("no_must_捡纸角", !/必须捡纸角/.test(hard), hard);
}

// 4. bg 裙摆 → guidance
{
  const frag = resolveBgFragment({
    visualDescription: VD,
    background: "沈母裙摆",
    imagePrompt: IMAGE,
  });
  ok("skirt_fragment", frag.stripFullSecondary && Boolean(frag.guidance), String(frag.kind));
  ok("skirt_ban_face", /禁止次角完整正脸|持纸抢戏|持书/.test(String(frag.guidance)), frag.guidance ?? "");
}

// 5. compose: drop previous + action lead + no faceCu look
{
  const ctx: ComposeStillContext = {
    visualDescription: VD,
    compiledImagePrompt: IMAGE,
    shotSize: "MS",
    background: "沈母裙摆",
    microExpression: "focused; lip_bite_blood",
    previousVisualBody: PREV_LIP,
    characters: [{ name: "沈清漪", code: "CHAR-LEAD", hasImage: true, tier: "lead", kind: "character" }],
    qualityMode: "hq_update",
  };
  const r = composeStillPrompt(ctx, { mode: "refine" });
  const prompt = r.prompt || "";
  const sources = r.sources || [];
  ok("drop_previous", sources.includes("previous.dropped_off_beat") || !sources.includes("previous.composed"), sources.join(","));
  ok("action_lead", sources.includes("action.primary.lead") || /动作主导|弯腰|捡起|捏紧/.test(prompt.slice(0, 200)), prompt.slice(0, 160));
  ok("no_faceCu_look", !sources.includes("look.anchor.faceCu"), sources.join(","));
  ok("no_lip_in_egress", !/lip_bite|紧咬下唇|渗血/.test(prompt), prompt.slice(0, 200));
  ok("has_休书", /休书/.test(prompt), "missing 休书");
}

// 6. modality action_primary + Seedream preferComfy false
{
  const mod = deriveShotModalityIntent({
    visualDescription: VD,
    shotSize: "MS",
    characterNames: ["沈清漪"],
    hasSceneLink: true,
  });
  ok("objective_action_primary", mod.primaryVisualObjective === "action_primary", mod.primaryVisualObjective);
  const act = selectStillActuatorProfile({
    objectiveClass: mod.primaryVisualObjective,
    softEnvContinuity: mod.softEnvContinuity,
    keepSoftEnvRef: mod.keepSoftEnvRef,
  });
  ok("seedream_default", act.preferComfy === false && act.actuatorId === "seedream_multiref", act.reason);
  const compressed = compressStillEgressForSeedream({
    prompt: `${IMAGE}。禁止次角完整正脸`,
    objectiveClass: "action_primary",
  });
  ok("seedream_action_lead", /动作主导|弯腰|捡/.test(compressed.prompt), compressed.prompt.slice(0, 120));
}

// 7. literary hash drift → forceFull
{
  const h1 = literaryComposeHash({ visualDescription: VD, compiledImagePrompt: IMAGE });
  const h2 = literaryComposeHash({ visualDescription: VD + "x", compiledImagePrompt: IMAGE });
  ok("hash_diff", h1 !== h2, `${h1} vs ${h2}`);
  const ing = buildStillPreviousIngress({
    requestPrompt: PREV_LIP,
    storedPrompt: PREV_LIP,
    literaryHash: h2,
    visualDescription: VD,
    loadPrevious: true,
    reason: JSON.stringify({
      literaryHash: h1,
      promptUsed: PREV_LIP,
      clientId: "a",
      promptState: "composed",
    }),
    currentClientId: "b",
  });
  ok("ingress_force_full", ing.forceFull && !ing.previousVisualBody, `mode=${ing.effectiveMode}`);
}

// 8. Edit preserve strips lip when VD is pickup
{
  const edited = preserveLiteraryCoreForEdit({ literaryPrompt: PREV_LIP, visualDescription: VD });
  ok("edit_strip_lip", !/紧咬下唇|lip_bite|渗血/.test(edited) || /弯腰|捡/.test(edited), edited.slice(0, 160));
}

// 9. heuristic no-key honest
{
  const j = judgeStillHeuristicNoVlm({
    visualDescription: VD,
    promptUsed: "伏案靠桌",
    propPlateGrade: "missing",
    vlmKeyPresent: false,
    signals: { uprightAtTableSuspected: true, dualFaceSuspected: true },
  });
  ok("heuristic_no_visualPass", j.visualPassClaim === false, "");
  ok("heuristic_action_or_prop", j.atomMisses.length > 0, j.atomMisses.join(","));
}

// 10. video weak handoff
{
  const h = assertStillContactVideoHandoff({
    visualDescription: VD,
    stillQuality: "weak",
    stillMeta: { visualPass: false, deliveryTier: "draft" },
  });
  ok("video_block_weak", h.ok === false && h.code === "STILL-WEAK-HANDOFF", h.message);
}

// 11. failure cluster action_misfire
{
  const c = deriveFailureCluster({
    visualDescription: VD,
    criticalMisses: ["action_misfire"],
    objectiveClass: "action_primary",
  });
  ok("cluster_action", c?.kind === "action_misfire", c?.kind);
}

// 12. softEnv restore must NOT re-inject cheek/contact zombie into bend beat
{
  const ctx = {
    visualDescription: VD,
    compiledImagePrompt: IMAGE,
    shotSize: "MS",
    background: "殿内烛火浅景深",
    microExpression: "focused",
    previousVisualBody: PREV_LIP + "；休书纸角划过面颊贴合",
    characters: [{ name: "沈清漪", code: "CHAR-LEAD", hasImage: true, tier: "lead", kind: "character" }],
    qualityMode: "hq_update",
    shotDesignSample: {
      must: [
        { id: "bg.scene_soft", bar: "must", text: "背景：主场景浅景深虚化，禁止灰棚白棚", sourcePath: "test" },
        { id: "prop.in_frame.paper", bar: "must", text: "休书入画", sourcePath: "test" },
      ],
      should: [],
      detail: [],
      sources: ["test.softEnv_restore"],
      poseOccupancy: "bend_pickup",
      primaryObjective: "action_primary",
      visualDescription: VD,
    },
  } as ComposeStillContext;
  const r = composeStillPrompt(ctx, { mode: "refine" });
  const prompt = r.prompt || "";
  ok("softEnv_seal_keep", r.keepSoftEnvRef === true && r.softEnvContinuity === "must", `${r.keepSoftEnvRef}/${r.softEnvContinuity}`);
  ok(
    "softEnv_restore_no_cheek_zombie",
    !/划过面颊|颊触|贴颊|纸角划过/.test(prompt) || /禁止.*颊|弯腰捡拾占位优先/.test(prompt),
    prompt.slice(0, 220),
  );
  ok("softEnv_restore_has_bend", /弯腰|捡起|休书/.test(prompt), prompt.slice(0, 160));
  ok("softEnv_restore_no_lip_zombie", !/lip_bite|紧咬下唇|渗血/.test(prompt), prompt.slice(0, 160));
  const act = selectStillActuatorProfile({
    objectiveClass: "action_primary",
    softEnvContinuity: "must",
    keepSoftEnvRef: true,
  });
  ok("softEnv_restore_no_comfy", act.preferComfy === false, act.reason);
}

// ─── SingleShotClosedCompose (shot2 lip-CU must not legislate shot3 bend/paper) ───
{
  const {
    assertSingleShotClosedInputs,
    stripForeignBeatAtomsFromEgress,
    previousBodyHasBidirectionalOffBeatContamination,
    filterInjectToDeclaredAtoms,
    isOralMicroNotActionPrimary,
  } = require("../src/ruleEngine/compilers/singleShotClosedCompose") as typeof import("../src/ruleEngine/compilers/singleShotClosedCompose");

  const SHOT2_VD =
    "特写。沈清漪紧咬下唇渗出血珠，眼神发狠，面颊浅痕。";
  const SHOT2_IMAGE =
    "古言写实，唇部特写紧咬下唇渗血，暖光；背景：沈母站立裙摆虚化（方位hint非第二主体）";
  const DIRTY_EGRESS =
    "镜头3：中景沈清漪弯腰捡起休书，指尖捏紧纸张边缘；紧咬下唇渗血";

  ok("shot2_oral_micro", isOralMicroNotActionPrimary(SHOT2_VD), SHOT2_VD);

  const bidir = previousBodyHasBidirectionalOffBeatContamination(
    "中景弯腰捡起休书指节泛白",
    SHOT2_VD,
  );
  ok("shot2_bidir_offbeat", bidir === true, "mouth-CU must drop bend previous");

  const stripped = stripForeignBeatAtomsFromEgress(DIRTY_EGRESS, SHOT2_VD);
  ok("shot2_strip_休书", !/休书|弯腰|捡起/.test(stripped.text), stripped.text.slice(0, 120));
  ok("shot2_strip_keep_lip", /咬|唇|渗血/.test(stripped.text) || stripped.stripped.includes("action_paper"), stripped.text);

  const inj = filterInjectToDeclaredAtoms(
    ["弯腰捡起休书占位", "唇部渗血强化", "镜头3补休书"],
    SHOT2_VD,
  );
  ok("shot2_inject_filter", inj.length === 1 && /唇|渗血/.test(inj[0]!), inj.join("|"));

  const bindFail = assertSingleShotClosedInputs({
    storyboardId: 99,
    bindOk: false,
    bindCode: "BIND_SHOT_MISMATCH",
    boundShotIndex: 2,
    visualDescription: SHOT2_VD,
    purpose: "generate",
  });
  ok("bind_mismatch_hard", bindFail.ok === false && bindFail.closedCompose === false, bindFail.code);

  const closedOk = assertSingleShotClosedInputs({
    storyboardId: 99,
    bindOk: true,
    boundShotIndex: 2,
    visualDescription: SHOT2_VD,
    purpose: "generate",
  });
  ok("closed_ok_shot2", closedOk.ok === true && closedOk.closedCompose === true, "");

  const ctx2: ComposeStillContext = {
    visualDescription: SHOT2_VD,
    compiledImagePrompt: SHOT2_IMAGE,
    shotSize: "CU",
    background: "沈母裙摆虚化",
    microExpression: "咬唇",
    previousVisualBody: "中景弯腰捡起休书，指尖捏紧纸张",
    characters: [{ name: "沈清漪", code: "CHAR-LEAD", hasImage: true, tier: "lead", kind: "character" }],
    qualityMode: "hq_update",
    bgBlur: true,
  } as ComposeStillContext;
  const r2 = composeStillPrompt(ctx2, { mode: "refine" });
  const p2 = r2.prompt || "";
  const p2Positive = p2.replace(/禁止[^。；;\n]{0,48}/g, "");
  ok("shot2_compose_no_休书", !/休书|弯腰捡|捡起休书/.test(p2Positive), p2Positive.slice(0, 200));
  ok("shot2_compose_has_lip", /咬|唇|渗血/.test(p2) || /咬唇|lip/.test(SHOT2_VD), p2.slice(0, 160));
  ok("shot2_compose_ecu_neg", /禁止半身|禁止手持纸|口鼻/.test(p2), p2.slice(-120));

  const bgCu = resolveStillBgPolicy({
    description: SHOT2_VD,
    shotSize: "CU",
    characterNames: ["沈清漪"],
    hasSceneLink: true,
    bgBlur: true,
  });
  ok("shot2_cu_bgBlur_soft", bgCu.excludeScene === true && /bgBlur|faceCu/.test(bgCu.reason), bgCu.reason);

  const handoffClosed = assertStillContactVideoHandoff({
    visualDescription: SHOT2_VD,
    stillQuality: "hq_ok",
    stillMeta: { visualPass: true, deliveryTier: "hq", closedCompose: false },
  });
  ok(
    "video_block_closedCompose_false",
    handoffClosed.ok === false,
    handoffClosed.code || handoffClosed.message,
  );

  // Fail-closed / framing / imagePrompt intersect / continuity / propSoft / recipe / QC
  const {
    isClosedComposeTrue,
    resolveFramingMode,
    intersectImagePromptWithVd,
    gateHealInjectLines,
    ECU_MOUTH_HQ_RECIPE,
  } = require("../src/ruleEngine/compilers/singleShotClosedCompose") as typeof import("../src/ruleEngine/compilers/singleShotClosedCompose");
  ok("fail_closed_undef", isClosedComposeTrue(undefined) === false, "");
  ok("fail_closed_true", isClosedComposeTrue(true) === true, "");
  ok("framing_lips_ecu", resolveFramingMode({ visualDescription: SHOT2_VD, shotSize: "CU", foreground: "沈清漪唇部", mouthDetail: "lip_bite_blood" }) === "lips_ecu", "");

  const dirtyAdopt = intersectImagePromptWithVd(
    "中景弯腰捡起休书指节泛白，紧咬下唇",
    SHOT2_VD,
  );
  ok("imagePrompt_intersect_no_休书", !/休书|弯腰/.test(dirtyAdopt.text), dirtyAdopt.text);

  const contOpen = assertSingleShotClosedInputs({
    storyboardId: 99,
    bindOk: true,
    visualDescription: SHOT2_VD,
    continuityInject: "邻镜捡书连续",
    purpose: "generate",
  });
  ok("continuity_unsealed_not_closed", contOpen.closedCompose === false && contOpen.reasons.includes("continuity_inject_unsealed"), contOpen.reasons.join(","));

  const dirtyImgAssert = assertSingleShotClosedInputs({
    storyboardId: 99,
    bindOk: true,
    visualDescription: SHOT2_VD,
    compiledImagePrompt: "弯腰捡起休书中景",
    purpose: "generate",
  });
  ok("dirty_imagePrompt_opens", dirtyImgAssert.closedCompose === false, dirtyImgAssert.reasons.join(","));

  const heal = gateHealInjectLines(["弯腰捡起休书", "唇部渗血强化"], SHOT2_VD);
  ok("heal_gate_reject_paper", heal.kept.length === 1 && heal.rejected.length >= 1, heal.kept.join("|"));

  const { resolvePropSoftCodes } = require("../src/ruleEngine/compilers/eventPlateReadiness") as typeof import("../src/ruleEngine/compilers/eventPlateReadiness");
  ok("propSoft_oral_empty", resolvePropSoftCodes({ visualDescription: SHOT2_VD }).length === 0, "");

  const { resolveStillRefsContract } = require("../src/ruleEngine/compilers/stillRefsContract") as typeof import("../src/ruleEngine/compilers/stillRefsContract");
  const refsC = resolveStillRefsContract({ visualDescription: SHOT2_VD });
  ok("refs_oral_no_force_synth", refsC.forcePropOccupancySynth === false, refsC.reason);

  const { resolveStillRecipeAdapt, ECU_MOUTH_HQ_RECIPE: adaptEcu } = require("../src/ruleEngine/compilers/stillShotRecipeAdapt") as typeof import("../src/ruleEngine/compilers/stillShotRecipeAdapt");
  const adapt = resolveStillRecipeAdapt({ visualDescription: SHOT2_VD, shotSize: "CU" });
  ok("recipe_ecu_mouth", adapt.mode === "ecu_mouth", adapt.mode);
  ok("ecu_mouth_hq_defined", Boolean(adaptEcu || ECU_MOUTH_HQ_RECIPE), "");

  const { qualifyLiteraryEffects } = require("../src/ruleEngine/quality/literaryPrimaryEffects") as typeof import("../src/ruleEngine/quality/literaryPrimaryEffects");
  const q = qualifyLiteraryEffects({
    visualDescription: SHOT2_VD,
    promptUsed: "特写咬唇；手持休书半身入画",
    refsRoles: ["identity", "propSoft"],
  });
  ok("qc_forbidden_paper_on_oral", q.literaryEffectsQualified === false, q.missingEffects.map((m) => m.reason).join(","));

  const { literaryFillsForCluster } = require("../src/ruleEngine/quality/failureClusterLibrary") as typeof import("../src/ruleEngine/quality/failureClusterLibrary");
  const fills = literaryFillsForCluster({ kind: "missing_prop", visualDescription: SHOT2_VD });
  ok("repair_fill_no_休书", !/休书|薄纸片/.test(fills.join("")), fills.join("|"));

  const { selectStillActuatorProfile } = require("../src/ruleEngine/compilers/stillActuatorProfile") as typeof import("../src/ruleEngine/compilers/stillActuatorProfile");
  const actOral = selectStillActuatorProfile({
    objectiveClass: "contact_geom",
    softEnvContinuity: "must",
    keepSoftEnvRef: true,
    visualDescription: SHOT2_VD,
  });
  ok("oral_never_comfy_contact", actOral.preferComfy === false, actOral.reason);
}

console.log("test-g-still-beat-isolation: all passed");
