/**
 * Golden: per-atom sample fulfillment — holdCard fails bend; dual-debt UX; iso deltaHints.
 * yarn test:g-per-atom-pixel-loop
 */
import { extractShotDesignSample } from "../src/ruleEngine/design/shotDesignSample";
import {
  judgeSampleAtoms,
  repairHintsForSampleMisses,
} from "../src/ruleEngine/design/judgeSampleAtoms";
import { literaryEffectsPersistSlice, reassertLiteraryEffectsAfterStill } from "../src/ruleEngine/quality/literaryEffectsAfterStill";
import { stillQualityUserMessage } from "../src/ruleEngine/quality/practiceCompleteness";
import { assertStillGenDeltaOrThrow } from "../src/ruleEngine/quality/isoRegenHardDelta";
import {
  literaryFieldsFromReason,
  resolveStillDebtSemantics,
} from "../docs/toonflow-web/types/stillQuality";

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
};

const sample = extractShotDesignSample(SHOT3);
ok("shot3.trunk_must", sample.must.length >= 3, JSON.stringify(sample.must.map((m) => m.id)));
ok("shot3.has_bend_intent", sample.should.some((m) => m.id === "action.bend_pickup") || sample.must.some((m) => m.id === "action.bend_pickup"));
ok("shot3.bend_should", sample.should.some((m) => m.id === "action.bend_pickup"), JSON.stringify(sample.should.map((m) => m.id)));
ok("shot3.has_bg_scene", sample.must.some((m) => m.id === "bg.scene_soft" || m.id === "bg.composition"));
ok("shot3.frag_should", sample.should.some((m) => m.id === "bg.fragment") || sample.must.some((m) => m.id === "bg.fragment"));
ok("shot3.has_fg", sample.must.some((m) => m.id.startsWith("fg.")));
ok("shot3.has_camera", sample.must.some((m) => m.id.startsWith("camera.")));

const GOOD =
  "占位：弯腰捡拾，道具在主手触地。握持：指尖捏紧指节泛白。休书薄纸主手触地。背景仅次角裙摆碎片。景别：MS。";

// Hold-card: action.bend fails as intent Should; trunk Must can still pass
{
  const j = judgeSampleAtoms({
    sample,
    promptUsed: `${GOOD}背景：主场景浅景深虚化，禁止灰棚白棚。`,
    refsRoles: ["identity", "propSoft", "softEnv"],
    propSoftPresent: true,
    droppedSoftEnv: false,
    softEnvHung: true,
    localHeuristicOk: true,
    localSignals: {
      holdCardSuspected: true,
      groundPropSuspected: false,
      uprightTorsoSuspected: true,
      primaryPoseGuess: "stand_hold",
    },
  });
  ok("holdCard.bend_fail", j.atoms.some((a) => a.id === "action.bend_pickup" && !a.pass), JSON.stringify(j.atoms));
  ok("holdCard.trunk_must_ok", j.mustFulfilled === true, j.mustMissIds.join(","));
  ok("holdCard.should_includes_bend", j.shouldMissIds.includes("action.bend_pickup"), j.shouldMissIds.join(","));
}

// Egress alone cannot pass action atom; trunk scene May still pass
{
  const j = judgeSampleAtoms({
    sample,
    promptUsed: `${GOOD}背景：主场景浅景深虚化，禁止灰棚白棚。`,
    refsRoles: ["identity", "propSoft", "softEnv"],
    propSoftPresent: true,
    droppedSoftEnv: false,
    softEnvHung: true,
    localHeuristicOk: false,
    localSignals: {},
  });
  ok("egress_only.action_fail", j.atoms.some((a) => a.id === "action.bend_pickup" && !a.pass));
  ok(
    "egress_only.bg_scene_ok_or_absent",
    !j.mustMissIds.includes("bg.fragment") ||
      j.atoms.some((a) => a.id === "bg.scene_soft" && a.pass) ||
      !j.atoms.some((a) => a.id === "bg.fragment" && a.bar === "must"),
    j.mustMissIds.join(","),
  );
  ok("egress_only.trunk_ok", j.mustFulfilled === true, j.mustMissIds.join(","));
  ok("egress_only.should_bend", j.shouldMissIds.includes("action.bend_pickup"));
}

// Repair map hints
{
  const hints = repairHintsForSampleMisses(["action.bend_pickup", "bg.fragment"]);
  ok(
    "repair.bend_hints",
    hints.deltaHints.includes("propSoft_resynth") &&
      (hints.deltaHints.includes("identity_bend_sil") || hints.deltaHints.includes("preferActionBody")),
  );
  ok(
    "repair.bg_hints",
    hints.deltaHints.includes("egress_hash") || !hints.deltaHints.includes("drop_softEnv"),
  );
  ok("repair.forceFull", hints.forceFull === true);
  ok("repair.no_drop_soft_default", !hints.deltaHints.includes("drop_softEnv"));
}

// Iso: deltaHints allow spend
{
  const d = assertStillGenDeltaOrThrow({
    prevFingerprint: "aaaaaaaaaaaaaaaaaaaaaaaa",
    nextFingerprint: "aaaaaaaaaaaaaaaaaaaaaaaa",
    deltaHints: ["propSoft_resynth", "drop_softEnv"],
  });
  ok("iso.deltaHints_allow", d.ok === true);
  const blocked = assertStillGenDeltaOrThrow({
    prevFingerprint: "aaaaaaaaaaaaaaaaaaaaaaaa",
    nextFingerprint: "aaaaaaaaaaaaaaaaaaaaaaaa",
  });
  ok("iso.no_delta_block", blocked.ok === false);
}

// Reassert persist atoms
async function testReassert() {
  const lit = await reassertLiteraryEffectsAfterStill({
    visualDescription: String(SHOT3.visualDescription),
    promptUsed: GOOD,
    episodeShot: SHOT3,
    refsRoles: ["identity", "propSoft"],
    propPlateGrade: "synthetic_geometry",
    droppedSoftEnv: true,
    skipLocalHeuristic: true,
  });
  ok("reassert.not_false_green", lit.sampleMustFulfilled === false || lit.literaryEffectsQualified === false);
  const slice = literaryEffectsPersistSlice(lit);
  const sf = slice.sampleFulfillment as { mustFulfilled?: boolean; atoms?: unknown[] };
  ok("persist.atoms", Array.isArray(sf?.atoms));
  ok("persist.must_false", sf?.mustFulfilled === false);
}

void testReassert().then(() => {
  // UX: Must miss not「须补描写」as primary
  {
    const msg = stillQualityUserMessage({
      sampleMustFulfilled: false,
      literaryEffectsQualified: false,
      missingEffects: ["action.bend_pickup"],
    });
    ok("ux.sample_miss", /样本未兑现/.test(msg) && !/须补描写/.test(msg), msg);

    const sem = resolveStillDebtSemantics({
      sampleMustFulfilled: false,
      sampleFulfillment: { mustFulfilled: false, mustMissIds: ["action.bend_pickup"] },
      literaryEffectsQualified: false,
      missingEffects: ["action.bend_pickup"],
    });
    ok("ux.debt_not_描写", !/须补描写/.test(sem.explain) && /未兑现|主效果/.test(sem.explain + sem.ctaLabel), JSON.stringify(sem));
  }

  // droppedSoftEnv: no「补场景软板」
  {
    const sem = resolveStillDebtSemantics({
      sampleMustFulfilled: true,
      literaryEffectsQualified: true,
      softEnvMissingHonest: true,
      droppedSoftEnv: true,
      softEnvContinuity: "none",
    });
    ok("softenv.drop_no_cta", sem.kind !== "soft_env" && !/补场景软板/.test(sem.ctaLabel), JSON.stringify(sem));

    const fields = literaryFieldsFromReason({
      sampleMustFulfilled: false,
      sampleFulfillment: { mustFulfilled: false, mustMissIds: ["action.bend_pickup"], atoms: [] },
      droppedSoftEnv: true,
      softEnvContinuity: "none",
    });
    ok("fe.hydrate_sample", fields.sampleMustFulfilled === false);
    ok("fe.hydrate_drop", fields.droppedSoftEnv === true);
  }

  // Pass path when pose evidence ok + SCENE softEnv hung (scene-first)
  {
    const j = judgeSampleAtoms({
      sample,
      promptUsed: `${GOOD}背景：主场景浅景深虚化，禁止灰棚白棚。`,
      refsRoles: ["identity", "propSoft", "softEnv"],
      propSoftPresent: true,
      droppedSoftEnv: false,
      softEnvHung: true,
      fragmentPlateHung: false,
      localHeuristicOk: true,
      localSignals: {
        holdCardSuspected: false,
        groundPropSuspected: true,
        kneelSquatSuspected: false,
        primaryPoseGuess: "bend_pickup",
      },
    });
    ok("pass.bend", j.atoms.find((a) => a.id === "action.bend_pickup")?.pass === true);
    ok("pass.bg", !j.mustMissIds.some((id) => id.startsWith("bg.")), j.mustMissIds.join(","));
    ok("pass.must", j.mustFulfilled === true, JSON.stringify(j.mustMissIds));
  }

  // Kneel/squat ≠ bend — intent Should miss; trunk Must can pass
  {
    const j = judgeSampleAtoms({
      sample,
      promptUsed: `${GOOD}背景：主场景浅景深虚化，禁止灰棚白棚。`,
      refsRoles: ["identity", "propSoft", "softEnv"],
      propSoftPresent: true,
      droppedSoftEnv: false,
      softEnvHung: true,
      localHeuristicOk: true,
      localSignals: {
        holdCardSuspected: false,
        groundPropSuspected: true,
        kneelSquatSuspected: true,
        primaryPoseGuess: "kneel_hold",
      },
    });
    ok("kneel.bend_fail", j.atoms.find((a) => a.id === "action.bend_pickup")?.pass === false);
    ok("kneel.evidence", j.atoms.some((a) => a.id === "action.bend_pickup" && /kneel/.test(a.evidence)));
    ok("kneel.trunk_ok", j.mustFulfilled === true, j.mustMissIds.join(","));
    ok("kneel.should_bend", j.shouldMissIds.includes("action.bend_pickup"));
  }

  // UX: action miss never「已换板重出」even if platesSwapped
  {
    const msg = stillQualityUserMessage({
      sampleMustFulfilled: false,
      literaryEffectsQualified: false,
      missingEffects: ["action.bend_pickup"],
      platesSwapped: true,
      poseEvidenceOk: false,
    });
    ok("ux.kneel_no_假换板重出", !/已按参考契约换板重出/.test(msg) && /姿态未过|须换板|须复验/.test(msg), msg);
    const deg = stillQualityUserMessage({
      sampleMustFulfilled: true,
      literaryEffectsQualified: true,
      realizationDegraded: true,
    });
    ok("ux.degraded_honest", /实现已降级/.test(deg), deg);
  }

  console.log("ALL PASS test-g-per-atom-pixel-loop");
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
