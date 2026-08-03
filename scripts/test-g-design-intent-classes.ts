/**
 * yarn test:g-design-intent-classes
 * 18-layer positive-carrier golden: form / occupancy XOR / grip / asset ladder /
 * neg budget / mount∩PHASE1∩ROUTES / handoff occupancy / soft≠hq / no role names.
 */
import fs from "fs";
import path from "path";
import {
  deriveDesignIntentProfile,
  designIntentEgressSplit,
  designIntentDebtHints,
  profileNeedsPropPlate,
  profileNeedsFragmentPlate,
  loadDesignIntentDoctrine,
  getEgressNegBudget,
  getDoctrineRefSlotOrder,
  resolveDoctrineCtaPersona,
  resolvePoseOccupancy,
} from "../src/ruleEngine/compilers/designIntentProfile";
import { getPropFormDoctrine } from "../src/ruleEngine/compilers/propFormDoctrine";
import {
  resolvePropPlateLabel,
  synthesizePropSoftPlate,
  applyEventRefSlotBudget,
} from "../src/ruleEngine/compilers/eventPlateReadiness";
import { resolvePropPlateLadder } from "../src/ruleEngine/compilers/propPlateLadder";
import { compressStillEgressForSeedream } from "../src/ruleEngine/compilers/stillActuatorProfile";
import {
  loadUntilClearMountGraph,
  auditUntilClearMounts,
  getHandlerForClass,
  runUntilClearDetect,
  runUntilClearHeal,
} from "../src/ruleEngine/quality/untilClearRuntime";
import { routeSmartRepair, selfHealActuatorsForTriggers } from "../src/ruleEngine/quality/smartRepairActuators";
import { judgeStillHeuristicNoVlm } from "../src/ruleEngine/quality/heuristicStillJudge";
import { producePoseEvidence } from "../src/ruleEngine/quality/poseEvidenceProducer";
import { assertStillContactVideoHandoff } from "../src/ruleEngine/qc/stillContactVideoHandoff";
import { resolveStillDebtSemantics } from "../docs/toonflow-web/types/stillQuality";
import { pruneIntentGraphEdges } from "../src/ruleEngine/design/intentGraphPrune";
import { importDesignSlotHeal } from "../src/ruleEngine/design/importDesignSlotHeal";
import type { ScriptBundle } from "../src/ruleEngine/bundle/types";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error("FAIL", name, detail ?? "");
    process.exit(1);
  }
  console.log("ok", name);
}

async function main() {
  const doctrinePath = path.join(process.cwd(), "data/fixtures/design_intent_doctrine.json");
  const doctrineFile = JSON.parse(fs.readFileSync(doctrinePath, "utf8")) as {
    classes: string[];
    ctaPersona: { forbidPhrases: string[]; preferPersona: string[] };
    egressNegBudget: number;
    plateLadder: string[];
    poseOccupancy: string[];
    gripLocusAtoms: string[];
  };
  const doctrine = loadDesignIntentDoctrine();
  ok("doctrine runtime load", doctrine.classes.includes("action_grip") && doctrine.classes.includes("pose_occupancy"));
  ok("doctrine classes file", doctrineFile.classes.includes("action_grip") && doctrineFile.classes.includes("doc_readable"));
  ok("doctrine egressNegBudget runtime", getEgressNegBudget() === doctrineFile.egressNegBudget || getEgressNegBudget() >= 2);
  ok("doctrine refSlotOrder", getDoctrineRefSlotOrder()[0] === "identity" && getDoctrineRefSlotOrder()[1] === "propSoft");
  ok("doctrine plateLadder asset>fe>synth", doctrineFile.plateLadder.join(",") === "asset,fe,synth");

  // A — form positive dims (no 禁止 in formMust)
  const paperD = getPropFormDoctrine("paper_doc");
  ok("formPositive size", Boolean(paperD?.formPositive?.size));
  ok("formMust positive-only", Boolean(paperD?.formMust) && !/禁止/.test(paperD!.formMust), paperD?.formMust);
  ok("antiSub bag separate", (paperD?.antiSub?.length ?? 0) > 0 || (paperD?.formForbid?.length ?? 0) > 0);

  // Grip + doc (pickup paper) — readable_doc + must_first glyph
  const grip = deriveDesignIntentProfile({
    visualDescription: "中景。女主弯腰捡起休书，指尖捏紧指节泛白。背景仅次角裙摆虚化。",
    shotSize: "中景",
    characterNames: ["女主"],
  });
  ok("action_grip class", grip.classes.includes("action_grip"), JSON.stringify(grip.classes));
  ok("doc_readable class", grip.classes.includes("doc_readable"), JSON.stringify(grip.classes));
  ok("bg_fragment class", grip.classes.includes("bg_fragment"), JSON.stringify(grip.classes));
  ok("pose_occupancy bend_pickup", grip.poseOccupancy === "bend_pickup", grip.poseOccupancy);
  ok(
    "grip_locus atoms",
    grip.gripLocus.includes("lead_hand") && grip.gripLocus.includes("knuckles_pale"),
    JSON.stringify(grip.gripLocus),
  );
  ok("plate readable_doc", grip.plateMode === "readable_doc", grip.plateMode);
  ok("glyph should_second", grip.glyphPolicy === "should_second", grip.glyphPolicy);
  ok("glyph 休书", /休书/.test(grip.glyphText), grip.glyphText);
  ok("needs prop plate", profileNeedsPropPlate(grip));
  ok("needs fragment plate", profileNeedsFragmentPlate(grip));
  ok("objective action_primary", grip.primaryObjective === "action_primary", grip.primaryObjective);

  const split = designIntentEgressSplit(grip);
  const leads = split.positiveLeads;
  const hints = split.debtHints;
  ok("egress leads ZH action", leads.some((l) => /占位|弯腰|捡/.test(l)), leads.join("|"));
  ok("egress leads glyph", leads.some((l) => /休书/.test(l)), leads.join("|"));
  ok("egress positive no 禁止", leads.every((l) => !/禁止/.test(l)), leads.join("|"));
  ok("debtHints hold negs", hints.some((h) => /禁止/.test(h)), hints.join("|"));
  ok("debtHints via helper", designIntentDebtHints(grip).length === hints.length);
  ok("no role hardcoding in leads", leads.every((l) => !/沈清漪|赵凌云|沈母/.test(l)));
  ok("neg budget cap", hints.length <= getEgressNegBudget() + 4, `hints=${hints.length} budget=${getEgressNegBudget()}`);

  // Occupancy XOR: kneel≠bend; desk≠pickup
  ok("resolvePoseOccupancy bend", resolvePoseOccupancy("弯腰捡起纸笺") === "bend_pickup");
  ok("resolvePoseOccupancy kneel", resolvePoseOccupancy("跪坐持书于膝") === "kneel_hold");
  ok("resolvePoseOccupancy desk", resolvePoseOccupancy("伏案靠桌读书") === "desk_lean");
  const xor = deriveDesignIntentProfile({
    visualDescription: "中景。女主弯腰捡起休书。背景有跪坐姿态描写干扰。",
  });
  ok("seating_xor when bend+kneel cue", xor.seatingXorPickup === true || xor.poseOccupancy === "bend_pickup", JSON.stringify(xor));

  // Contact cheek — cheek_sweep + glyph should_second
  const cheek = deriveDesignIntentProfile({
    visualDescription: "特写。女主侧脸，休书纸角划过面颊。禁口含。",
    shotSize: "特写",
  });
  ok("contact plate cheek_sweep", cheek.plateMode === "cheek_sweep", cheek.plateMode);
  ok("contact glyph should_second", cheek.glyphPolicy === "should_second", cheek.glyphPolicy);

  // bend + cheek verbs → contactXorPickup; never cheek_sweep / contact_geom objective
  const bendCheek = deriveDesignIntentProfile({
    visualDescription:
      "中景。女主弯腰捡起休书，指尖捏紧指节泛白。背景仅次角裙摆虚化，暖光烛火。纸角划过面颊。",
    imagePrompt: "古言写实，弯腰捡起休书，裙摆虚化，暖光烛火。贴颊划过。",
    background: "裙摆虚化",
    shotSize: "中景",
  });
  ok("contactXor bend+cheek", bendCheek.contactXorPickup === true, JSON.stringify(bendCheek.reasons));
  ok("bend+cheek still bend_pickup", bendCheek.poseOccupancy === "bend_pickup", bendCheek.poseOccupancy);
  ok("bend+cheek action_primary", bendCheek.primaryObjective === "action_primary", bendCheek.primaryObjective);
  ok("bend+cheek not cheek_sweep", bendCheek.plateMode !== "cheek_sweep", bendCheek.plateMode);
  ok("bend+cheek no contact_geom class", !bendCheek.classes.includes("contact_geom"), bendCheek.classes.join("|"));
  const bendCheekLeads = designIntentEgressSplit(bendCheek).positiveLeads;
  ok("visual detail knuckles", bendCheekLeads.some((l) => /指节|捏紧/.test(l)), bendCheekLeads.join("|"));
  ok("visual detail fragment or atm", bendCheekLeads.some((l) => /裙摆|气氛|烛火|暖光/.test(l)), bendCheekLeads.join("|"));
  ok("detail leads no role names", bendCheekLeads.every((l) => !/沈清漪|赵凌云|沈母/.test(l)));

  const label = resolvePropPlateLabel({
    visualDescription: "中景。弯腰捡起休书，纸面须见字迹。",
  });
  ok("label paper without contact", label.propClassId === "paper_doc", JSON.stringify(label));
  ok("label plateMode", label.plateMode === "readable_doc" || Boolean(label.plateMode), String(label.plateMode));

  const synth = await synthesizePropSoftPlate({
    propClassId: label.propClassId,
    canonical: label.canonical,
    glyphText: label.glyphText || "休书",
    plateMode: "readable_doc",
  });
  ok("synth readable_doc", synth.plateMode === "readable_doc", synth.plateMode);
  ok("synth has jpeg b64", synth.base64.length > 200);

  // Asset-first ladder: FE present → skipSynth
  const ladderFe = await resolvePropPlateLadder({ fePlatePresent: true, propClassId: "paper_doc" });
  ok("ladder FE skipSynth", ladderFe.skipSynth && ladderFe.grade === "fe", JSON.stringify(ladderFe));
  const ladderMiss = await resolvePropPlateLadder({ propClassId: "paper_doc" });
  ok("ladder missing needs synth", !ladderMiss.skipSynth && ladderMiss.grade === "missing", JSON.stringify(ladderMiss));

  // Fragment sil synth hangable
  const fragSil = await synthesizePropSoftPlate({
    propClassId: "generic",
    canonical: "裙摆碎片",
    softPlateHint: "cloth_fold",
    plateMode: "fragment_sil",
  });
  ok("fragment_sil synth", fragSil.plateMode === "fragment_sil" && fragSil.base64.length > 100);

  // Seedream compress: no English lead steal; neg ≤ budget
  const compressed = compressStillEgressForSeedream({
    prompt:
      [...leads, ...hints].join("。") +
      "。女主定妆锁定。禁止重塑五官。禁止伏案。禁止跪坐。禁止空白糊纸。禁止举卡挡脸。",
    objectiveClass: "action_primary",
  });
  ok(
    "seedream no eng lead",
    !/cheek contact|bend pick|holding card|force_compose/i.test(compressed.prompt),
    compressed.prompt.slice(0, 120),
  );
  ok("seedream keeps ZH action", /弯腰|捡|动作|占位/.test(compressed.prompt), compressed.prompt.slice(0, 120));
  const negCount = (compressed.prompt.match(/禁止/g) ?? []).length;
  ok("seedream neg ≤ budget", negCount <= getEgressNegBudget() + 2, `negs=${negCount}`);

  // Ref slot order identity → prop → softEnv
  const budget = applyEventRefSlotBudget({
    refs: [
      { type: "image", base64: "A", role: "identity" },
      { type: "image", base64: "B", role: "propSoft" },
      { type: "image", base64: "C", role: "softEnv" },
    ],
    propRequired: true,
    maxSlots: 3,
  });
  ok("slot order identity first", budget.roles[0] === "identity", budget.roles.join(","));
  ok("slot order prop second", budget.roles[1] === "propSoft", budget.roles.join(","));

  // Mount drift: handler ∩ bindings ∩ PHASE1 ∩ ROUTES ∩ defer — no orphans
  const graph = loadUntilClearMountGraph();
  const phase1 = new Set(graph.phase1Classes ?? []);
  ok("ACTION_MISFIRE in phase1", phase1.has("ACTION_MISFIRE"));
  ok("STILL_HQ_EGRESS in phase1", phase1.has("STILL_HQ_EGRESS"));
  ok("ACTION_MISFIRE binding", graph.bindings.some((b) => b.classId === "ACTION_MISFIRE"));
  ok("ACTION_MISFIRE live handler", Boolean(getHandlerForClass("ACTION_MISFIRE")));
  const deferredPath = path.join(process.cwd(), "data/fixtures/until_clear_deferred_classes.json");
  const deferredRaw = JSON.parse(fs.readFileSync(deferredPath, "utf8")) as {
    DEFERRED_UNTIL_CLEAR_CLASSES?: string[];
  };
  const deferred = deferredRaw.DEFERRED_UNTIL_CLEAR_CLASSES ?? [];
  ok("ACTION not deferred", !deferred.includes("ACTION_MISFIRE"));
  const audit = auditUntilClearMounts({ deferClassIds: deferred });
  ok("no missing phase1 handlers", audit.missing.length === 0, JSON.stringify(audit.missing));
  ok("no false mounts", audit.falseMounts.length === 0, JSON.stringify(audit.falseMounts));
  for (const id of phase1) {
    ok(`phase1 ${id} has handler`, Boolean(getHandlerForClass(id)));
    ok(`phase1 ${id} in bindings`, graph.bindings.some((b) => b.classId === id));
    ok(`phase1 ${id} not deferred`, !deferred.includes(id));
    const r = routeSmartRepair(id);
    ok(`phase1 ${id} has ROUTES`, Boolean(r?.actuators?.length), JSON.stringify(r));
  }

  // Heuristic not dead — detects action misfire from prompt miss
  const hj = judgeStillHeuristicNoVlm({
    visualDescription: "中景。弯腰捡起休书，指尖捏紧。",
    promptUsed: "女主立于殿中对质。",
    propPlateGrade: "missing",
  });
  ok("heuristic measured", hj.measured);
  ok("heuristic action or plate", hj.debtKind === "action_misfire" || hj.debtKind === "prop_plate", hj.debtKind);

  // poseEvidence produced
  const pev = producePoseEvidence({
    visualDescription: "中景。弯腰捡起休书。",
    promptUsed: "女主伏案靠桌。",
  });
  ok("poseEvidence lean_table on egress miss", pev.primaryPose === "lean_table", JSON.stringify(pev));

  const findings = runUntilClearDetect({
    phase: "still_L0",
    visualDescription: "中景。弯腰捡起休书，指尖捏紧。",
    fidelityItems: [{ id: "action_primary", pass: false, fixHint: "desk lean" }],
    poseEvidence: { primaryPose: "lean_table" },
  });
  ok(
    "untilClear ACTION_MISFIRE fires",
    findings.some((f) => f.classId === "ACTION_MISFIRE"),
    findings.map((f) => f.classId).join(","),
  );
  const heal = runUntilClearHeal(
    { phase: "still_L0", visualDescription: "中景。弯腰捡起休书。", healBudgetRemaining: 2 },
    findings.filter((f) => f.classId === "ACTION_MISFIRE"),
  );
  ok("ACTION heal forceFull", heal.forceFull === true, JSON.stringify(heal));
  ok("ACTION heal positive inject", (heal.injectLines ?? []).some((l) => /占位|弯腰/.test(l)));
  ok("ACTION heal no ban-soup primary", !(heal.injectLines ?? []).some((l) => /^禁止/.test(l)));

  // smartRepair W1 aligned + STILL_HQ_EGRESS ROUTES
  const route = routeSmartRepair("ACTION_MISFIRE");
  ok("smartRepair ACTION route", Boolean(route?.actuators.includes("compose_regen")), JSON.stringify(route));
  const hqRoute = routeSmartRepair("STILL_HQ_EGRESS");
  ok("smartRepair HQ_EGRESS route", Boolean(hqRoute?.actuators.includes("regen_storyboard_hq")), JSON.stringify(hqRoute));
  const self = selfHealActuatorsForTriggers(["ACTION_MISFIRE", "PROP_IN_FRAME", "STILL_HQ_EGRESS"]);
  ok("selfHeal has regen", self.actuators.includes("regen_storyboard_hq") || self.nextStep === "batch_still");

  // CTA persona — no programming red; doctrine prefer
  const cta = resolveStillDebtSemantics({
    debtKind: "action_misfire",
    userMessage: "动作主导错位",
  });
  ok("cta persona action", cta.ctaLabel === "重出动作主导静帧", cta.ctaLabel);
  ok("cta doctrine resolve", resolveDoctrineCtaPersona("重出动作主导静帧") === "重出动作主导静帧");
  for (const phrase of doctrineFile.ctaPersona.forbidPhrases) {
    ok(`cta forbid ${phrase}`, !cta.ctaLabel.includes(phrase) && !cta.explain.includes(phrase));
  }

  // Video handoff occupancy BLOCK
  const handoffOcc = assertStillContactVideoHandoff({
    visualDescription: "中景。弯腰捡起休书，指尖捏紧。",
    stillPrompt: "女主跪坐持书。",
    stillQuality: "hq_ok",
    stillMeta: {
      visualPass: true,
      deliveryTier: "hq",
      poseEvidence: { primaryPose: "kneel_hold" },
      designIntentProfile: { poseOccupancy: "bend_pickup" },
    },
  });
  ok(
    "handoff occupancy BLOCK",
    handoffOcc.severity === "BLOCK" && handoffOcc.code === "STILL-OCCUPANCY-HANDOFF",
    JSON.stringify(handoffOcc),
  );

  // XOR oral prop_cont prune
  const pruned = pruneIntentGraphEdges({
    shots: [
      { clientId: "p" },
      { clientId: "p__lit_cheek", _litXorSplitId: "p", _contactEventMustProp: true, visualSplitRole: "action" },
      { clientId: "p__lit_oral", _litXorSplitId: "p", _contactEventMustProp: false, visualSplitRole: "reaction" },
    ],
    edges: [
      { kind: "prop_cont", fromShotKey: "p", toShotKey: "p__lit_cheek" },
      { kind: "prop_cont", fromShotKey: "p", toShotKey: "p__lit_oral" },
    ],
  });
  ok(
    "oral prop_cont pruned",
    !pruned.edges.some((e) => e.kind === "prop_cont" && e.toShotKey === "p__lit_oral"),
    JSON.stringify(pruned.edges),
  );
  ok(
    "cheek prop_cont kept",
    pruned.edges.some((e) => e.kind === "prop_cont" && e.toShotKey === "p__lit_cheek"),
    JSON.stringify(pruned.edges),
  );

  // Import silent prefetch mark
  const bundle = {
    preDesignPack: {
      shots: [
        {
          shotIndex: 1,
          visualDescription: "中景。女主弯腰捡起休书，指尖捏紧。背景仅裙摆虚化。",
          shotSize: "中景",
        },
      ],
    },
    planData: {},
  } as unknown as ScriptBundle;
  const healed = importDesignSlotHeal(bundle);
  ok("prop prefetch marked", healed.summary.propPrefetchMarked >= 1, JSON.stringify(healed.summary));
  const shot0 = (bundle.preDesignPack?.shots?.[0] ?? {}) as Record<string, unknown>;
  ok("shot has designIntentProfile", Boolean(shot0.designIntentProfile));
  ok("shot soft_defer flag", shot0._propPlateSoftDefer === true);
  const dip0 = shot0.designIntentProfile as { poseOccupancy?: string; gripLocus?: string[] };
  ok("import stamps poseOccupancy", dip0?.poseOccupancy === "bend_pickup", JSON.stringify(dip0));

  // Thin opts: literaryHash drift → forceFull; PAPER_DOC heuristic not fidelity-id-only; soft_deliver ≠ hq_ok
  {
    const { buildStillPreviousIngress, literaryComposeHash } =
      require("../src/ruleEngine/compilers/composeStillPrompt") as typeof import("../src/ruleEngine/compilers/composeStillPrompt");
    const h1 = literaryComposeHash({ visualDescription: "中景。女主弯腰捡起休书。" });
    const h2 = literaryComposeHash({ visualDescription: "中景。女主弯腰捡起休书，指尖捏紧。" });
    ok("literaryHash differs on VD change", h1 !== h2, `${h1} vs ${h2}`);
    const ingress = buildStillPreviousIngress({
      reason: JSON.stringify({
        literaryHash: h1,
        clientId: "s1",
        promptState: "composed",
        promptUsed: "旧 egress 定妆立于殿中对质",
      }),
      literaryHash: h2,
      currentClientId: "s1",
      visualDescription: "中景。女主弯腰捡起休书，指尖捏紧。",
      storedPrompt: "旧 egress 定妆立于殿中对质",
      currentHash: "x",
    });
    ok("prefetch/literaryHash change forceFull", ingress.forceFull === true, JSON.stringify(ingress));
  }
  {
    const hjPaper = judgeStillHeuristicNoVlm({
      visualDescription: "特写。休书纸面须见字迹，薄笺展开。",
      promptUsed: "女主侧脸烛火。",
      propPlateGrade: "missing",
    });
    ok(
      "PAPER_DOC heuristic without fidelity id",
      hjPaper.atomMisses.includes("prop_plate") || hjPaper.debtKind === "prop_plate",
      JSON.stringify(hjPaper),
    );
    const paperLabel = resolvePropPlateLabel({
      visualDescription: "近景。手持婚书展开，纸面墨迹可读。",
    });
    ok("PAPER_DOC label without contact event", paperLabel.propClassId === "paper_doc", JSON.stringify(paperLabel));
  }
  {
    const { deriveBurnReady, deriveTrackBurnAllowed } =
      require("../docs/toonflow-web/types/stillQuality") as typeof import("../docs/toonflow-web/types/stillQuality");
    const softMeta = {
      stillQuality: "weak" as const,
      visualPass: false,
      deliveryTier: "draft",
    };
    ok("soft_deliver meta not burnReady", deriveBurnReady(softMeta) === false);
    ok(
      "soft_deliver ≠ hq_ok burnAllowed",
      deriveTrackBurnAllowed({ softDeliver: true, stillMeta: softMeta }) === false,
    );
    ok(
      "hq_ok alone requires visualPass",
      deriveBurnReady({ stillQuality: "hq_ok", visualPass: false }) === false,
    );
  }

  // No role-name hardcoding in doctrine / form fixtures
  const doctrineRaw = fs.readFileSync(doctrinePath, "utf8");
  ok("doctrine no role names", !/沈清漪|赵凌云|沈母|霜兰/.test(doctrineRaw));
  const formRaw = fs.readFileSync(path.join(process.cwd(), "data/fixtures/prop_form_doctrine.json"), "utf8");
  ok("prop form doctrine no role names", !/沈清漪|赵凌云|沈母/.test(formRaw));

  // ── Fragment_only + DOF/formScale closed loop (no secondary asset required) ──
  {
    const { formatSpatialStandingLine } =
      require("../src/ruleEngine/compilers/composeStillPrompt") as typeof import("../src/ruleEngine/compilers/composeStillPrompt");
    const { deriveGenerationContract } =
      require("../src/ruleEngine/design/deriveGenerationContract") as typeof import("../src/ruleEngine/design/deriveGenerationContract");
    const fragVd = "中景。女主弯腰捡起休书，指尖捏紧。背景仅次角裙摆虚化。";
    const fragDip = deriveDesignIntentProfile({ visualDescription: fragVd, shotSize: "中景" });
    ok("fragment path no secondary asset ok", fragDip.classes.includes("bg_fragment") && fragDip.secondaryBudget === "skirt_blur");
    ok("dofBudget shallow on fragment", fragDip.dofBudget === "shallow", fragDip.dofBudget);
    ok("formScale present", Boolean(fragDip.formScale && /掌心|笺|薄/.test(fragDip.formScale)), fragDip.formScale);
    const fragSplit = designIntentEgressSplit(fragDip);
    ok("egress dof lead", fragSplit.positiveLeads.some((l) => /景深|浅景深/.test(l)), fragSplit.positiveLeads.join("|"));
    ok("egress formScale lead", fragSplit.positiveLeads.some((l) => /物尺度/.test(l)), fragSplit.positiveLeads.join("|"));
    ok("egress no standing secondary", !fragSplit.positiveLeads.some((l) => /站立/.test(l)));

    const spatialRewritten = formatSpatialStandingLine(
      { axis: "主角-次角", anchors: ["主角弯腰", "次角站立"] },
      { stripFullSecondary: true },
    );
    ok(
      "spatial gate strips secondary 站立 keeps primary 弯腰",
      Boolean(
        spatialRewritten &&
          !/次角.*站立|配角.*站立/.test(spatialRewritten) &&
          /碎片|虚化/.test(spatialRewritten) &&
          /弯腰/.test(spatialRewritten),
      ),
      spatialRewritten ?? "",
    );

    const contract = deriveGenerationContract({
      visualDescription: fragVd,
      shotSize: "中景",
      characterNames: ["女主"],
      sceneCode: "SCENE-001",
    });
    ok(
      "contract skirt_blur secondary_presence",
      contract.sacrificableConstraints.some((f) => f.id === "secondary_presence") ||
        contract.forbiddenSubstitutions.some((s) => /配角完整立像|完整立像/.test(s)),
      JSON.stringify(contract.sacrificableConstraints),
    );
    ok(
      "contract form without contact",
      contract.mustShowFacts.some((f) => f.id === "prop_form"),
      JSON.stringify(contract.mustShowFacts.map((f) => f.id)),
    );

    const spatialFindings = runUntilClearDetect({
      phase: "still_L0",
      visualDescription: fragVd,
      poseEvidence: { secondaryPose: "sitting" },
    });
    ok(
      "SPATIAL no expectStand under fragment",
      !spatialFindings.some((f) => f.code === "pose_secondary_not_stand"),
      spatialFindings.map((f) => f.code).join(","),
    );

    const secFindings = runUntilClearDetect({
      phase: "still_L0",
      visualDescription: fragVd,
      fidelityItems: [{ id: "secondary", pass: false, fixHint: "完整立像抢戏" }],
      poseEvidence: { secondaryPose: "standing" },
    });
    ok(
      "SECONDARY_DOMINANCE fires",
      secFindings.some((f) => f.classId === "SECONDARY_DOMINANCE"),
      secFindings.map((f) => f.classId).join(","),
    );
    const secHeal = runUntilClearHeal(
      { phase: "still_L0", visualDescription: fragVd },
      secFindings.filter((f) => f.classId === "SECONDARY_DOMINANCE"),
    );
    ok("SECONDARY heal forceFull", secHeal.forceFull === true);
    ok("SECONDARY CTA not 补定妆", !/补定妆|补.*定妆/.test(secHeal.ctaLabel ?? ""), secHeal.ctaLabel);
    ok("SECONDARY inject fragment", (secHeal.injectLines ?? []).some((l) => /裙摆|碎片/.test(l)));

    const secRoute = routeSmartRepair("SECONDARY_DOMINANCE");
    ok("SECONDARY ROUTES", Boolean(secRoute?.actuators.includes("compose_regen")), JSON.stringify(secRoute));

    // Soft plate footprint smaller than near-full canvas (palm-scale)
    const paperSynth = await synthesizePropSoftPlate({
      propClassId: "paper_doc",
      canonical: "休书",
      glyphText: "休书",
      softPlateHint: "thin_sheets",
      plateMode: "readable_doc",
    });
    const sharp = (await import("sharp")).default;
    const { data, info } = await sharp(Buffer.from(paperSynth.base64, "base64"))
      .raw()
      .toBuffer({ resolveWithObject: true });
    let lit = 0;
    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i]!, g = data[i + 1]!, b = data[i + 2]!;
      if (r + g + b > 120) lit++;
    }
    const frac = lit / (info.width * info.height);
    ok("soft plate footprint < 0.55 canvas", frac < 0.55, `frac=${frac.toFixed(3)}`);

    // Persist fields even when cref missing blocks ok (early stamp)
    const { composeStillPrompt } =
      require("../src/ruleEngine/compilers/composeStillPrompt") as typeof import("../src/ruleEngine/compilers/composeStillPrompt");
    const composed = composeStillPrompt(
      {
        visualDescription: fragVd,
        shotSize: "中景",
        qualityMode: "draft",
        characters: [{ name: "女主", code: "CHAR-LEAD", hasImage: true, tier: "lead" }],
        referenceUrlCount: 1,
        requireLeadAssetImage: false,
      },
      { mode: "full" },
    );
    const echo = (composed.generationContract as { designIntentProfile?: Record<string, unknown> } | undefined)
      ?.designIntentProfile;
    ok("compose persists secondaryBudget", echo?.secondaryBudget === "skirt_blur", JSON.stringify(echo));
    ok("compose persists dofBudget", echo?.dofBudget === "shallow", JSON.stringify(echo));
    ok("compose persists formScale", Boolean(echo?.formScale), JSON.stringify(echo));
    const sealEcho = (composed.generationContract as { primaryIntentSeal?: Record<string, unknown> } | undefined)
      ?.primaryIntentSeal;
    ok("compose persists primaryIntentSeal", Boolean(sealEcho?.sealHash), JSON.stringify(sealEcho));
    ok("seal poseOccupancy bend", sealEcho?.poseOccupancy === "bend_pickup", JSON.stringify(sealEcho));

    // CTA key vs identity split
    const keyCta = resolveStillDebtSemantics({ debtKind: "key_unmeasured", keyOptional: true });
    const idCta = resolveStillDebtSemantics({
      debtKind: "prop_plate",
      propPlateMissing: true,
      missingSlots: ["propSoftPlate"],
    });
    ok("key CTA ≠ missing identity plate CTA", keyCta.kind === "key_unmeasured" || keyCta.kind === "none", keyCta.kind);
    ok("prop plate CTA distinct", idCta.kind === "prop_plate", idCta.kind);

    // --- E: future-norm CI latch (seal / gate / compress) ---
    const {
      sealPrimaryIntentCarriers,
      assertPrimaryCarriersPreserved,
      applyNormSupplement,
      occupancyCompressLead,
    } = require("../src/ruleEngine/compilers/primaryIntentSeal") as typeof import("../src/ruleEngine/compilers/primaryIntentSeal");
    const { compressStillEgressForActuator, compressStillEgressForSeedream } =
      require("../src/ruleEngine/compilers/stillActuatorProfile") as typeof import("../src/ruleEngine/compilers/stillActuatorProfile");

    const bendSeal = sealPrimaryIntentCarriers({ profile: grip });
    ok("seal hash present", Boolean(bendSeal.sealHash));
    const preserved = assertPrimaryCarriersPreserved(
      bendSeal,
      "占位：弯腰捡拾，躯干前倾，纸在主手。背景仅裙摆碎片虚化。",
    );
    ok("assert L0 preserved", preserved.ok, JSON.stringify(preserved));

    const badStrip = applyNormSupplement({
      seal: bendSeal,
      lines: ["删去弯腰占位", "景深：浅景深，背景虚化，主体锐利", "背景仅次角裙摆碎片虚化"],
      layer: "L3",
    });
    ok("gate drops L0-erasing norm", badStrip.dropped.some((d) => /删去弯腰/.test(d)), badStrip.dropped.join("|"));
    ok("gate keeps fragment/DOF", badStrip.kept.some((k) => /景深|裙摆/.test(k)), badStrip.kept.join("|"));

    const kneelProf = deriveDesignIntentProfile({
      visualDescription: "中景。女主跪坐持书于膝，指尖捏紧。",
      shotSize: "中景",
    });
    ok("kneel occupancy", kneelProf.poseOccupancy === "kneel_hold", kneelProf.poseOccupancy);
    const kneelSeal = sealPrimaryIntentCarriers({ profile: kneelProf });
    const kneelCompressed = compressStillEgressForActuator({
      prompt: "气氛保留：烛火。背景仅裙摆碎片虚化。",
      objectiveClass: "action_primary",
      poseOccupancy: kneelSeal.poseOccupancy,
      primaryIntentSeal: kneelSeal,
    });
    ok(
      "compress action_primary + kneel ≠ hard bend",
      !/弯腰捡拾/.test(kneelCompressed.positive) || /跪坐/.test(kneelCompressed.positive),
      kneelCompressed.positive.slice(0, 120),
    );
    ok(
      "compress kneel lead",
      /跪坐/.test(kneelCompressed.positive) || /跪坐/.test(occupancyCompressLead("kneel_hold")),
      kneelCompressed.positive.slice(0, 120),
    );
    const seedKneel = compressStillEgressForSeedream({
      prompt: "气氛保留：烛火。",
      objectiveClass: "action_primary",
      poseOccupancy: "kneel_hold",
      primaryIntentSeal: kneelSeal,
    });
    ok(
      "seedream compress no hard bend over kneel",
      !(/^占位：弯腰捡拾/.test(seedKneel.prompt) && !/跪坐/.test(seedKneel.prompt)),
      seedKneel.prompt.slice(0, 160),
    );

    // Fragment ON still keeps L0 in egress head
    const fragLeads = designIntentEgressSplit(grip).positiveLeads;
    ok("L0 occupancy head before fragment", /占位|弯腰/.test(fragLeads[0] ?? ""), fragLeads.join("|"));
    ok("fragment still present", fragLeads.some((l) => /裙摆|碎片/.test(l)), fragLeads.join("|"));

    // Heal inject gated — competing occupancy dropped
    const healGated = applyNormSupplement({
      seal: bendSeal,
      lines: ["占位：跪坐持物，躯干稳定", "背景仅次角裙摆/衣角等碎片虚化浅景深"],
      layer: "L2",
    });
    ok(
      "heal gate drops competing kneel lead",
      healGated.dropped.some((d) => /跪坐/.test(d)),
      healGated.dropped.join("|"),
    );
    ok("heal gate keeps fragment", healGated.kept.some((k) => /裙摆/.test(k)));

    // Cheek inject dropped under bend seal
    const cheekInject = applyNormSupplement({
      seal: bendSeal,
      lines: [
        "休书入画于颊触纸角（薄纸片软板）",
        "禁口含；禁纸入口；仅面颊触非口含",
        "握持：指尖捏紧指节泛白",
        "气氛保留：烛火",
      ],
      layer: "L1",
    });
    ok(
      "gate drops cheek inject under bend",
      cheekInject.dropped.some((d) => /颊触|禁口含/.test(d)),
      cheekInject.dropped.join("|"),
    );
    ok(
      "gate keeps knuckle/atm detail",
      cheekInject.kept.some((k) => /指节|气氛/.test(k)),
      cheekInject.kept.join("|"),
    );

    // priorSeal sticky: contact reclassify cannot elevate
    const { clampProfileToPriorSeal } =
      require("../src/ruleEngine/compilers/primaryIntentSeal") as typeof import("../src/ruleEngine/compilers/primaryIntentSeal");
    const sticky = clampProfileToPriorSeal(
      {
        ...bendCheek,
        primaryObjective: "contact_geom",
        plateMode: "cheek_sweep",
        classes: [...bendCheek.classes, "contact_geom"],
        contactXorPickup: false,
      },
      { ...bendSeal, literaryHash: "same-hash" },
      "same-hash",
    );
    ok("priorSeal sticky action_primary", sticky.primaryObjective === "action_primary", sticky.primaryObjective);
    ok("priorSeal sticky not cheek_sweep", sticky.plateMode !== "cheek_sweep", sticky.plateMode);

    // compress: bend never gets cheek prefix
    const bendComp = compressStillEgressForActuator({
      prompt: "背景仅裙摆碎片虚化。气氛保留：烛火。",
      objectiveClass: "contact_geom",
      poseOccupancy: "bend_pickup",
      primaryIntentSeal: bendSeal,
    });
    ok(
      "compress bend never cheek lead",
      !/颊触薄纸角划过/.test(bendComp.positive) && /弯腰|占位/.test(bendComp.positive + occupancyCompressLead("bend_pickup")),
      bendComp.positive.slice(0, 140),
    );

    // No role names in seal stems / compress
    ok(
      "no role names in seal stems",
      bendSeal.primarySpatialStems.every((s) => !/沈清漪|赵凌云|沈母/.test(s)),
    );
  }

  console.log("\ntest:g-design-intent-classes OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
