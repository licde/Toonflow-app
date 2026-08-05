/**
 * Golden: literary primary effects qualify loop (no Comfy / no Key).
 * yarn test:g-literary-effects-loop
 */
import {
  loadLiteraryPrimaryEffects,
  qualifyLiteraryEffects,
  repairPlanForMissingEffects,
  isNoComfyNoKeyDoctrine,
} from "../src/ruleEngine/quality/literaryPrimaryEffects";
import {
  literaryEffectsPersistSlice,
  syncStillModalityHints,
} from "../src/ruleEngine/quality/literaryEffectsAfterStill";
import { assessStillVideoReadiness } from "../src/ruleEngine/qc/stillVideoReadiness";
import { assertStillContactVideoHandoff } from "../src/ruleEngine/qc/stillContactVideoHandoff";
import { resolveIdentityCropTopRatio, buildEventRefOrdinalBinding } from "../src/ruleEngine/compilers/eventPlateReadiness";
import { resolveStillBgPolicy } from "../src/ruleEngine/compilers/stillBgPolicy";
import { compressStillEgressForSeedream, protectEgressHeadAfterCompress } from "../src/ruleEngine/compilers/stillActuatorProfile";
import { stillQualityUserMessage } from "../src/ruleEngine/quality/practiceCompleteness";
import { smartRepairFromLiteraryMisses, routeSmartRepair } from "../src/ruleEngine/quality/smartRepairActuators";
import { assertStillGenDeltaOrThrow, applyLiteraryRepairDeltaSalt } from "../src/ruleEngine/quality/isoRegenHardDelta";
import { markVideoStaleOnDesignContentChange } from "../src/ruleEngine/compilers/stillQuality";
import { resolveStillDebtSemantics } from "../docs/toonflow-web/types/stillQuality";
import { sealPrimaryIntentCarriers } from "../src/ruleEngine/compilers/primaryIntentSeal";
import { deriveDesignIntentProfile, loadDesignIntentDoctrine } from "../src/ruleEngine/compilers/designIntentProfile";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error("FAIL", name, detail ?? "");
    process.exit(1);
  }
  console.log("ok", name);
}

const VD =
  "中景。沈清漪弯腰捡起休书，指尖捏紧纸张边缘，指节泛白，面颊浅痕清晰。背景沈母裙摆虚化，暖光烛火。";
const GOOD_EGRESS =
  "占位：弯腰捡拾，道具在主手触地。握持：指尖捏紧指节泛白。休书薄纸主手触地题名可辨。背景仅次角裙摆碎片虚化浅景深。气氛保留：暖光烛火。负向：手持卡片挡脸，跪坐替代弯腰，灰棚白棚，胸前展示卡";
const HOLD_EGRESS =
  "跪坐捧持休书于胸前展示，指节泛白，面颊浅痕。背景完整立像。负向：灰棚";

// 1. Doctrine mount
{
  const doc = loadDesignIntentDoctrine() as { literaryPrimaryEffects?: unknown[]; noComfyNoKey?: unknown; qualifyBar?: string };
  ok("doctrine.literaryPrimaryEffects", (doc.literaryPrimaryEffects?.length ?? 0) >= 8);
  ok("doctrine.qualifyBar", doc.qualifyBar === "L0+L1");
  ok("doctrine.noComfyNoKey", Boolean(doc.noComfyNoKey));
  ok("loadLiteraryPrimaryEffects", loadLiteraryPrimaryEffects().some((e) => e.id === "occupancy.bend_pickup"));
  ok("isNoComfyNoKey", isNoComfyNoKeyDoctrine().localPoseHeuristic === true);
}

const profile = deriveDesignIntentProfile({ visualDescription: VD, imagePrompt: VD });
const seal = sealPrimaryIntentCarriers({ profile, literaryHash: "test" });
ok("seal.bend", seal.poseOccupancy === "bend_pickup" || seal.primaryObjective === "action_primary", JSON.stringify(seal));

// 2. Qualify matrix — good egress + heuristic ok
{
  const q = qualifyLiteraryEffects({
    visualDescription: VD,
    promptUsed: GOOD_EGRESS,
    seal,
    refsRoles: ["identity", "propSoft"],
    propPlateGrade: "synthetic_geometry",
    localHeuristicOk: true,
    localSignals: { groundPropSuspected: true, holdCardSuspected: false, primaryPoseGuess: "bend_pickup" },
  });
  ok("qualify.good", q.literaryEffectsQualified, JSON.stringify(q.missingEffects));
  ok("qualify.good_no_degrade", q.realization?.realizationDegraded !== true, JSON.stringify(q.realization));
}

// 2b. Egress-only / no heuristic → trunk qualifies; bend trusted (no fail-closed degrade)
{
  const q = qualifyLiteraryEffects({
    visualDescription: VD,
    promptUsed: GOOD_EGRESS,
    seal,
    refsRoles: ["identity", "propSoft"],
    propPlateGrade: "synthetic_geometry",
  });
  ok("qualify.egress_trunk_ok", q.literaryEffectsQualified, JSON.stringify(q.missingEffects));
  ok(
    "qualify.egress_pose_trusted",
    q.realization?.realizationDegraded !== true && q.realization?.realizationOccupancy === "bend_pickup",
    JSON.stringify(q.realization),
  );
  ok(
    "qualify.egress_no_occupancy_should_miss",
    !q.shouldMisses.some((m) => m.id === "occupancy.bend_pickup"),
    JSON.stringify(q.shouldMisses),
  );
}

// 3. Hold-card: trunk qualifies + realization degraded (intent debt, not burn block)
{
  const q = qualifyLiteraryEffects({
    visualDescription: VD,
    promptUsed: GOOD_EGRESS,
    seal,
    refsRoles: ["identity", "propSoft"],
    propPlateGrade: "synthetic_geometry",
    localHeuristicOk: true,
    localSignals: { holdCardSuspected: true, groundPropSuspected: false, primaryPoseGuess: "stand_hold" },
  });
  ok("qualify.hold_card_trunk_ok", q.literaryEffectsQualified, JSON.stringify(q.missingEffects));
  ok("qualify.hold_degraded", q.realization?.realizationDegraded === true);
  ok(
    "qualify.hold_should_occupancy",
    q.shouldMisses.some((m) => m.id === "occupancy.bend_pickup" || m.id === "prop.locus.ground_or_lead_hand"),
    JSON.stringify(q.shouldMisses),
  );
}

// 3b. Gray studio / modern attire block trunk
{
  const gray = qualifyLiteraryEffects({
    visualDescription: VD,
    promptUsed: GOOD_EGRESS,
    seal,
    refsRoles: ["identity", "propSoft"],
    propPlateGrade: "synthetic_geometry",
    localHeuristicOk: true,
    localSignals: {
      groundPropSuspected: true,
      primaryPoseGuess: "bend_pickup",
      grayStudioSuspected: true,
    },
  });
  ok("qualify.gray_block", !gray.literaryEffectsQualified);
  ok(
    "qualify.gray_miss",
    gray.missingEffects.some((m) => m.id === "bg.no_gray_studio"),
    JSON.stringify(gray.missingEffects),
  );
  const modern = qualifyLiteraryEffects({
    visualDescription: VD,
    promptUsed: GOOD_EGRESS,
    seal,
    refsRoles: ["identity", "propSoft"],
    propPlateGrade: "synthetic_geometry",
    localHeuristicOk: true,
    localSignals: {
      groundPropSuspected: true,
      primaryPoseGuess: "bend_pickup",
      modernAttireSuspected: true,
    },
  });
  ok("qualify.modern_block", !modern.literaryEffectsQualified);
  ok(
    "qualify.modern_miss",
    modern.missingEffects.some((m) => m.id === "identity.no_modern_attire"),
    JSON.stringify(modern.missingEffects),
  );
  const voidBg = qualifyLiteraryEffects({
    visualDescription: VD,
    promptUsed: GOOD_EGRESS,
    seal,
    refsRoles: ["identity", "propSoft", "softEnv"],
    propPlateGrade: "synthetic_geometry",
    softEnvHung: true,
    localHeuristicOk: true,
    localSignals: {
      groundPropSuspected: true,
      primaryPoseGuess: "bend_pickup",
      voidBgSuspected: true,
      sceneIllegibleSuspected: true,
    },
  });
  ok("qualify.void_bg_block", !voidBg.literaryEffectsQualified);
  ok(
    "qualify.void_bg_miss",
    voidBg.missingEffects.some((m) => m.id === "bg.no_gray_studio"),
    JSON.stringify(voidBg.missingEffects),
  );
  const lightGray = qualifyLiteraryEffects({
    visualDescription: VD,
    promptUsed: GOOD_EGRESS,
    seal,
    refsRoles: ["identity", "propSoft", "softEnv"],
    propPlateGrade: "synthetic_geometry",
    softEnvHung: true,
    localHeuristicOk: true,
    localSignals: {
      groundPropSuspected: true,
      primaryPoseGuess: "bend_pickup",
      grayStudioSuspected: true,
    },
  });
  ok("qualify.light_gray_block", !lightGray.literaryEffectsQualified);
  ok(
    "qualify.light_gray_miss",
    lightGray.missingEffects.some((m) => m.id === "bg.no_gray_studio"),
    JSON.stringify(lightGray.missingEffects),
  );
  const uxScene = stillQualityUserMessage({
    literaryEffectsQualified: false,
    sampleMustFulfilled: false,
    missingEffects: ["bg.no_gray_studio"],
  });
  ok("ux.scene_unproven", /场景像素未证实|软环境已挂/.test(uxScene), uxScene);
}

// 4. Bad egress missing propSoft when plate missing
{
  const thin = "占位：弯腰捡拾。休书入画。背景裙摆。";
  const q = qualifyLiteraryEffects({
    visualDescription: VD,
    promptUsed: thin,
    seal,
    refsRoles: ["identity"],
    propPlateMissing: true,
  });
  ok("qualify.thin_fail", !q.literaryEffectsQualified);
  ok("qualify.has_must", q.missingEffects.every((m) => m.bar === "must"));
}

// 5. Unmeasured hygiene — fidelity pass:true with unmeasured evidence must not block i2v via pixel fail alone
{
  const r = assessStillVideoReadiness({
    stillQuality: "weak",
    visualPass: false,
    literaryEffectsQualified: true,
    fidelityItems: [
      { id: "contact_geom", pass: true, evidence: "vlm_infra_unmeasured" },
      { id: "prop_readable", pass: true, evidence: "vlm_infra_unmeasured" },
    ],
    promptUsed: GOOD_EGRESS,
    visualDescription: VD,
    stillMeta: { literaryEffectsQualified: true, deliveryTier: "preview", contaminationClass: "none" },
  });
  ok("i2v.lit_qualified_no_key", r.stillPass === true || r.i2vReady === true || !r.criticalMisses.includes("contact_geom"), r.reason);
}

// 6. Unqualified blocks i2v
{
  const r = assessStillVideoReadiness({
    stillQuality: "hq_ok",
    visualPass: true,
    literaryEffectsQualified: false,
    promptUsed: HOLD_EGRESS,
    visualDescription: VD,
    stillMeta: {
      literaryEffectsQualified: false,
      missingEffects: [{ id: "occupancy.bend_pickup" }],
      deliveryTier: "draft",
    },
  });
  ok("i2v.unqualified_soft_ready", r.i2vReady === true, r.reason);
  ok("i2v.unqualified_miss", r.criticalMisses.some((m) => /literary|occupancy/.test(m)), r.criticalMisses.join(","));
  ok(
    "i2v.atom_soft_not_hard",
    (r.softMisses ?? []).length > 0 && !(r.hardMisses ?? []).includes("literary_effects_unqualified"),
    JSON.stringify({ soft: r.softMisses, hard: r.hardMisses }),
  );
}

// 7. Handoff WARN-absorbs literary fail (intent-first; may still burn)
{
  const h = assertStillContactVideoHandoff({
    visualDescription: VD,
    stillPrompt: HOLD_EGRESS,
    stillQuality: "weak",
    stillMeta: {
      literaryEffectsQualified: false,
      missingEffects: [{ id: "prop.in_frame.paper" }],
      visualPass: false,
    },
  });
  ok("handoff.lit_warn_allows_burn", h.ok === true && h.severity === "WARN", JSON.stringify(h));
  ok("handoff.lit_msg", /可烧视频|文学主效果/.test(String(h.message ?? "")), h.message);
}

// 7b. Handoff blocks bend I2V when realization degraded (even if trunk lit ok)
{
  const h = assertStillContactVideoHandoff({
    visualDescription: VD,
    stillPrompt: GOOD_EGRESS,
    stillQuality: "hq_ok",
    stillMeta: {
      literaryEffectsQualified: true,
      visualPass: true,
      deliveryTier: "hq",
      realizationDegraded: true,
      realizationOccupancy: "stand_hold",
      primaryIntentSeal: {
        poseOccupancy: "bend_pickup",
        realizationOccupancy: "stand_hold",
        realizationDegraded: true,
      },
    },
  });
  ok("handoff.degraded_warn_allows_burn", h.ok === true && h.severity === "WARN", JSON.stringify(h));
  ok("handoff.degraded_msg", /姿态债|可烧视频/.test(String(h.message ?? "")), h.message);
  ok("handoff.no_bend_green_ban", !/禁止.*弯腰绿继承|禁止视频绿继承弯腰/.test(String(h.message ?? "")), h.message);
}

// 8. Persist slice round-trip shape
{
  const q = qualifyLiteraryEffects({
    visualDescription: VD,
    promptUsed: HOLD_EGRESS,
    seal,
    refsRoles: ["identity"],
    propPlateMissing: true,
    localSignals: { holdCardSuspected: true },
  });
  const plan = repairPlanForMissingEffects(q.missingEffects);
  const modality = syncStillModalityHints({
    seal,
    visualDescription: VD,
    literaryEffectsQualified: false,
  });
  const slice = literaryEffectsPersistSlice({
    ...q,
    localPoseSignals: { holdCardSuspected: true },
    repairInjectLines: plan.injectLines,
    repairDeltaHints: plan.deltaHints,
    forceFull: plan.forceFull,
    ...modality,
  });
  ok("persist.qualified_false", slice.literaryEffectsQualified === false);
  ok("persist.missing", Array.isArray(slice.missingEffects) && (slice.missingEffects as unknown[]).length > 0);
  ok("persist.motion", String(slice.videoMotionStartHint ?? "").includes("弯腰"));
  ok("persist.no_bend_green_ban", !/禁止弯腰绿继承/.test(String(slice.videoMotionStartHint ?? "")));
  ok("repair.delta", plan.deltaHints.length > 0 && plan.forceFull === true);
}

// 9. Crop: bend face-lock ≤0.4; contact/costume keeps ≥0.72
{
  ok(
    "crop.bend_face_lock",
    resolveIdentityCropTopRatio({
      objectiveClass: "action_primary",
      poseOccupancy: "bend_pickup",
      identityReplaceStandingSheet: true,
    }) <= 0.4,
  );
  ok(
    "crop.bend_default_face",
    resolveIdentityCropTopRatio({ objectiveClass: "action_primary", poseOccupancy: "bend_pickup" }) <= 0.4,
  );
  ok(
    "crop.contact_upper",
    resolveIdentityCropTopRatio({ objectiveClass: "contact_geom", poseOccupancy: null }) >= 0.72,
  );
  ok(
    "crop.face_only",
    resolveIdentityCropTopRatio({ objectiveClass: "identity", poseOccupancy: null }) <= 0.55,
  );
}

// 10. Ordinal binding ground vs cheek
{
  const bend = buildEventRefOrdinalBinding({
    roles: ["identity", "propSoft"],
    propRequired: true,
    poseOccupancy: "bend_pickup",
  });
  ok("bind.ground", /触地/.test(bend) && !/颊廓/.test(bend), bend);
  const cheek = buildEventRefOrdinalBinding({
    roles: ["identity", "propSoft"],
    propRequired: true,
    thinSheets: true,
    plateMode: "cheek_sweep",
  });
  ok("bind.cheek", /颊/.test(cheek) || /触肤/.test(cheek), cheek);
}

// 11. Bend T2I-first: drop softEnv even when SCENE linked
{
  const bg = resolveStillBgPolicy({
    description: VD,
    shotSize: "MS",
    hasSceneLink: true,
  });
  ok("fragment.drop_softEnv_bend", bg.keepSoftEnvRef === false && bg.omitSrefToken === true, JSON.stringify(bg));
}

// 12. Compress knuckles survive + scene-first when softEnv hung
{
  const long = `${"气氛。".repeat(80)}${GOOD_EGRESS}`;
  const c = compressStillEgressForSeedream({
    prompt: long,
    objectiveClass: "action_primary",
    poseOccupancy: "bend_pickup",
    primaryIntentSeal: { poseOccupancy: "bend_pickup" },
    maxChars: 400,
    keepSoftEnvRef: true,
  });
  ok("compress.knuckles_or_bend", /弯腰|占位|指节|触地/.test(c.prompt), c.prompt.slice(0, 120));
  ok("compress.scene_first_no_skirt_only", !/背景仅裙摆碎片虚化/.test(c.prompt), c.prompt.slice(0, 160));
  ok("compress.scene_first_hall", /主场景|禁止灰棚/.test(c.prompt), c.prompt.slice(0, 160));
  const skirtOnly = compressStillEgressForSeedream({
    prompt: "占位：弯腰捡拾。休书入画。",
    objectiveClass: "action_primary",
    poseOccupancy: "bend_pickup",
    keepSoftEnvRef: false,
    softEnvHung: false,
    maxChars: 400,
  });
  ok(
    "compress.fragment_path_skirt",
    /背景仅裙摆碎片虚化/.test(skirtOnly.prompt),
    skirtOnly.prompt.slice(0, 120),
  );
  const protectedHead = protectEgressHeadAfterCompress("背景很远很远。" + "x".repeat(500), 200, {
    bend: true,
    occupancyLead: "占位：弯腰捡拾，道具在主手。",
  });
  ok("compress.head", /占位：|弯腰/.test(protectedHead.slice(0, 40)), protectedHead.slice(0, 60));
  const squatScrub = protectEgressHeadAfterCompress(
    "中景。沈清漪蹲身拾起休书，指尖捏紧。负向：灰棚",
    400,
    { bend: true },
  );
  ok("compress.scrub_squat_to_bend", /弯腰拾起/.test(squatScrub) && !/蹲身拾起/.test(squatScrub), squatScrub.slice(0, 80));
  ok("compress.ground_paper_survive", /休书薄纸|近地触地|主手触地/.test(squatScrub), squatScrub.slice(0, 120));
  const seedSquat = compressStillEgressForSeedream({
    prompt: "中景。蹲身捡起休书。握持：指尖捏紧。",
    objectiveClass: "action_primary",
    poseOccupancy: "bend_pickup",
    primaryIntentSeal: { poseOccupancy: "bend_pickup" },
    maxChars: 400,
  });
  ok(
    "compress.seedream_no_squat",
    /弯腰/.test(seedSquat.prompt) && !/蹲身捡起/.test(seedSquat.prompt),
    seedSquat.prompt.slice(0, 100),
  );
}

// 13. Smart repair routes + delta salt
{
  const sr = smartRepairFromLiteraryMisses(["occupancy.bend_pickup", "prop.in_frame.paper"]);
  ok("repair.routes", sr.routes.length >= 1 && sr.injectLines.length >= 1);
  ok("repair.route_trigger", Boolean(routeSmartRepair("occupancy.bend_pickup")));
  const fp = applyLiteraryRepairDeltaSalt("abc", sr.deltaHints);
  ok("repair.delta_salt", fp !== "abc");
  const deltaOk = assertStillGenDeltaOrThrow({
    prevFingerprint: "same",
    nextFingerprint: "same",
    deltaHints: ["seed"],
  });
  ok("repair.delta_allows", deltaOk.ok === true);
}

// 14. Hash drift keeps videoStale
{
  const drift = markVideoStaleOnDesignContentChange(
    { designContentHash: "aaa", stillQuality: "hq_ok", videoStale: false },
    "bbb",
  );
  ok("hash.drift_stale", drift?.videoStale === true);
}

// 15. UX primary = missing effects (not 仅结构通过)
{
  const msg = stillQualityUserMessage({
    keyAbsent: true,
    literaryEffectsQualified: false,
    missingEffects: ["prop.in_frame.paper", "bg.no_gray_studio"],
  });
  ok(
    "ux.missing_primary",
    /设计意图|缺主效果|样本未兑现|场景像素未证实|软环境已挂/.test(msg) && !/仅结构通过/.test(msg),
    msg,
  );
  ok("ux.bend_plate_note", /参考契约|换板|触地板|举卡|整殿|非法绿|场景/.test(msg), msg);
  const keyOnly = stillQualityUserMessage({ keyAbsent: true });
  ok("ux.key_unmeasured_note", /未测/.test(keyOnly) && !/必须装/.test(keyOnly), keyOnly);
  const litOkKey = stillQualityUserMessage({
    keyAbsent: true,
    literaryEffectsQualified: true,
    sampleMustFulfilled: true,
    weak: true,
  });
  ok("ux.intent_ok_key_absent", /必须元素已兑现|主效果已达/.test(litOkKey) && !/结构可试拍/.test(litOkKey), litOkKey);
  const deg = stillQualityUserMessage({
    literaryEffectsQualified: true,
    sampleMustFulfilled: true,
    realizationDegraded: true,
    realizationNote: "实现已降级：弯腰→站姿持纸；设计意图仍为弯腰捡拾",
  });
  ok("ux.realization_degraded", (/实现已降级|姿态债/.test(deg) && !/样本未兑现/.test(deg)), deg);
}

// 16. FE debt semantics
{
  const sem = resolveStillDebtSemantics({
    literaryEffectsQualified: false,
    missingEffects: [{ id: "prop.in_frame.paper" }],
    debtKind: "prop_plate",
  });
  ok("fe.lit_slot", sem.kind === "lit_slot" && /重出|智能修|道具/.test(`${sem.ctaLabel}${sem.explain}`));
}

// 17. Contact CU counterexample — cheek softEnv not forced for bend
{
  const qContact = qualifyLiteraryEffects({
    visualDescription: "特写。休书纸角划过面颊。",
    promptUsed: "接触几何：纸角划过颊侧触肤。",
    refsRoles: ["identity", "propSoft"],
    propPlateGrade: "fe",
  });
  ok("contact.cu_not_bend_must", !qContact.missingEffects.some((m) => m.id === "occupancy.bend_pickup"));
}

// 18. Close-loop: heuristic fail without counter-evidence → still trust bend (no fail-closed degrade)
{
  const q = qualifyLiteraryEffects({
    visualDescription: VD,
    promptUsed: GOOD_EGRESS,
    seal,
    refsRoles: ["identity", "propSoft"],
    propPlateGrade: "synthetic_geometry",
    localHeuristicOk: false,
  });
  ok("qualify.heuristic_trunk_ok", q.literaryEffectsQualified, JSON.stringify(q.missingEffects));
  ok(
    "qualify.heuristic_fail_no_degrade",
    q.realization?.realizationDegraded !== true && q.realization?.realizationOccupancy === "bend_pickup",
    JSON.stringify(q.realization),
  );
  ok(
    "qualify.heuristic_fail_no_occupancy_should",
    !q.shouldMisses.some((m) => m.id === "occupancy.bend_pickup"),
    JSON.stringify(q.shouldMisses),
  );
}

// 19. Close-loop: bend propForm inject has no cheek poseFact
{
  const { buildPropFormInjectFromVd, buildPropFormInject } = require(
    "../src/ruleEngine/compilers/propFormDoctrine",
  ) as typeof import("../src/ruleEngine/compilers/propFormDoctrine");
  const inj = buildPropFormInjectFromVd(VD);
  ok("propForm.no_cheek_under_bend", !/须与面颊真实贴合/.test(String(inj.poseFact ?? "")), inj.poseFact);
  ok("propForm.ground_under_bend", /触地|捡拾/.test(String(inj.poseFact ?? "")), inj.poseFact);
  const cheekOnly = buildPropFormInject({
    visualDescription: "特写。休书纸角划过面颊。",
    propClassId: "paper_doc",
    locus: "面颊",
  });
  ok("propForm.cheek_when_not_bend", /面颊|颊触/.test(String(cheekOnly.poseFact ?? "")), cheekOnly.poseFact);
}

// 20. Close-loop: stripHostileCheek removes cheek after seal
{
  const { stripHostileCheekLegislation } = require("../src/ruleEngine/compilers/stillSealGate");
  const hostile = `${GOOD_EGRESS}。休书须与面颊真实贴合/划过（颊触）。`;
  const out = stripHostileCheekLegislation(hostile, seal);
  ok("strip.cheek", !/须与面颊真实贴合/.test(out.prompt), out.prompt.slice(0, 120));
  ok("strip.keeps_bend", /弯腰|占位|触地/.test(out.prompt), out.prompt.slice(0, 80));
}

// 21. Close-loop: propSoft present honesty + delta applies
{
  const { propSoftSlotActuallyPresent } = require(
    "../src/ruleEngine/quality/applyLiteraryRepairDeltas",
  );
  ok(
    "propSoft.absent_without_bytes",
    propSoftSlotActuallyPresent({ refsRoles: ["identity", "propSoft"], referenceList: [{ base64: "" }, { base64: "" }] }) ===
      false,
  );
  ok(
    "propSoft.present_with_bytes",
    propSoftSlotActuallyPresent({
      refsRoles: ["identity", "propSoft"],
      referenceList: [{ base64: "aaa" }, { base64: "b".repeat(800) }],
    }) === true,
  );
}

// 22–25. Bend refs contract (async: ladder / softEnv / synth / delta swap)
void (async () => {
  const { remarkMatchesBendOccupancy, resolvePropPlateLadder } = require(
    "../src/ruleEngine/compilers/propPlateLadder",
  ) as typeof import("../src/ruleEngine/compilers/propPlateLadder");
  ok(
    "ladder.remark_hold_card_rejects",
    remarkMatchesBendOccupancy("assetCode:PROP-SYNTH-PAPERDOC|plateMode:readable_doc", "readable_doc") === false,
  );
  ok(
    "ladder.remark_bend_ok",
    remarkMatchesBendOccupancy("assetCode:PROP-SYNTH-PAPERDOC-bend_pickup|poseOccupancy:bend_pickup", "object_inset") ===
      true,
  );
  const ladder = await resolvePropPlateLadder({ poseOccupancy: "bend_pickup", propClassId: "paper_doc" });
  ok("ladder.bend_no_db_force_synth", ladder.skipSynth === false, JSON.stringify(ladder));

  const bgBend = resolveStillBgPolicy({
    description: VD,
    shotSize: "MS",
    hasSceneLink: true,
  });
  ok(
    "bend.softEnv_dropped",
    bgBend.keepSoftEnvRef === false && bgBend.omitSrefToken === true,
    JSON.stringify({ reason: bgBend.reason, keep: bgBend.keepSoftEnvRef, omit: bgBend.omitSrefToken }),
  );
  ok(
    "bend.softEnv_reason",
    /t2i_first|bend_action/.test(String(bgBend.reason)),
    bgBend.reason,
  );

  const { synthesizePropSoftPlate } = require(
    "../src/ruleEngine/compilers/eventPlateReadiness",
  ) as typeof import("../src/ruleEngine/compilers/eventPlateReadiness");
  const bendPlate = await synthesizePropSoftPlate({
    propClassId: "paper_doc",
    canonical: "休书",
    glyphText: "休书",
    plateMode: "readable_doc",
    poseOccupancy: "bend_pickup",
  });
  const holdPlate = await synthesizePropSoftPlate({
    propClassId: "paper_doc",
    canonical: "休书",
    glyphText: "休书",
    plateMode: "readable_doc",
    poseOccupancy: "other",
  });
  ok("synth.bend_bytes", Boolean(bendPlate.base64) && bendPlate.base64.length > 80);
  ok(
    "synth.bend_differs_hold_card",
    bendPlate.base64 !== holdPlate.base64,
    "bend ground geometry must differ from centered readable_doc",
  );

  const { applyLiteraryRepairDeltas } = require(
    "../src/ruleEngine/quality/applyLiteraryRepairDeltas",
  ) as typeof import("../src/ruleEngine/quality/applyLiteraryRepairDeltas");
  const delta = await applyLiteraryRepairDeltas({
    missingEffects: [
      { id: "occupancy.bend_pickup", tier: "L0", bar: "must", reason: "test" },
      { id: "prop.locus.ground_or_lead_hand", tier: "L0", bar: "must", reason: "test" },
    ],
    poseOccupancy: "bend_pickup",
    visualDescription: VD,
    referenceList: [
      { type: "image", base64: "id".repeat(40), role: "identity" },
      { type: "image", base64: "holdcard".repeat(20), role: "propSoft" },
      { type: "image", base64: "altar".repeat(30), role: "softEnv" },
    ],
    refsRoles: ["identity", "propSoft", "softEnv"],
  });
  ok("delta.dropped_softEnv", delta.droppedSoftEnv === true);
  ok("delta.no_softEnv_role", !(delta.refsRoles ?? []).includes("softEnv"));
  ok("delta.propSoft_resynth", Boolean(delta.propSoftBase64) && delta.sources.some((s) => /propSoft_resynth/.test(s)));
  ok("delta.plates_swapped", delta.platesSwapped === true && delta.claimPlateRepair === true);
  ok("delta.prop_changed", delta.propSoftBase64 !== "holdcard".repeat(20));

  // 26. Generic refs contract table (bend is one row; contact keeps softEnv)
  const { resolveStillRefsContract } = require(
    "../src/ruleEngine/compilers/stillRefsContract",
  ) as typeof import("../src/ruleEngine/compilers/stillRefsContract");
  const actionC = resolveStillRefsContract({
    primaryObjective: "action_primary",
    poseOccupancy: "bend_pickup",
    visualDescription: VD,
  });
  ok("contract.action_drop_soft", actionC.dropFullSoftEnv === true && actionC.forcePropOccupancySynth === false, actionC.reason);
  ok("contract.action_t2i_first", /t2i_first_drop_scene/.test(actionC.reason), actionC.reason);
  ok("contract.action_face_lock", actionC.identityReplaceStandingSheet === true && actionC.identityPreferActionBody === false);
  const contactC = resolveStillRefsContract({
    primaryObjective: "contact_geom",
    poseOccupancy: "other",
    visualDescription: "特写。休书纸角划过面颊。",
  });
  ok("contract.contact_keep_soft", contactC.dropFullSoftEnv === false, contactC.reason);
  ok("contract.contact_not_face_force", contactC.identityPreferActionBody === false);
  const propC = resolveStillRefsContract({
    primaryObjective: "prop_readable",
    visualDescription: "近景。休书题名可辨。",
  });
  ok("contract.prop_force_synth", propC.forcePropOccupancySynth === true);

  console.log("ALL PASS test-g-literary-effects-loop");
})().catch((e) => {
  console.error("FAIL async bend golden", e);
  process.exit(1);
});
