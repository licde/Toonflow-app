/**
 * yarn test:g-realization-adapt
 * Realization adapt pack — bend/kneel/stand paths + spine + pose gate + episode orchestrator.
 */
import assert from "node:assert/strict";
import { buildRealizationAdaptPack, motionContradictsRealization } from "../src/ruleEngine/compilers/realizationAdapt";
import { compileVideoPromptSpine } from "../src/ruleEngine/compilers/compileVideoPromptSpine";
import { hydrateShotCompileContextSync } from "../src/ruleEngine/compilers/hydrateShotCompileContext";
import { assertStillVideoPoseHandoff } from "../src/ruleEngine/qc/stillVideoPoseHandoff";
import { runEpisodeAvEnhanceOrchestrator } from "../src/ruleEngine/quality/episodeAvEnhanceOrchestrator";
import { mayApplyRealizationAdapt, POLICY_PRECEDENCE } from "../src/ruleEngine/compilers/policyPrecedence";
import { isRealizationAdaptEnabled, isEpisodeAvEnhanceEnabled } from "../src/ruleEngine/compilers/realizationAdaptFlags";
import {
  SHOT3_INTENT_GOLDEN,
  SHOT3_DEGRADED_STILL_META,
  SHOT3_DEGRADED_EXPECTED,
  REALIZATION_REGRESSION_MATRIX,
} from "../data/fixtures/video_shot3_intent_golden";

function ok(name: string, cond: boolean) {
  assert.equal(cond, true, name);
  console.log("ok:", name);
}

// --- policy precedence
ok("precedence order", POLICY_PRECEDENCE[0] === "trunk_hard_debt");
ok("trunk blocks adapt", !mayApplyRealizationAdapt({ trunkBlockers: ["prop_missing"] }));
ok("adapt allowed when clear", mayApplyRealizationAdapt({ trunkBlockers: [] }));

// --- feature flags default on
ok("realizationAdapt enabled by default", isRealizationAdaptEnabled());
ok("episodeAvEnhance enabled by default", isEpisodeAvEnhanceEnabled());

// --- bend path A (no degrade)
{
  const pack = buildRealizationAdaptPack({
    visualDescription: SHOT3_INTENT_GOLDEN.visualDescription,
    durationSec: 3,
    dialoguePresent: true,
    intentOccupancy: "bend_pickup",
    realizationOccupancy: "bend_pickup",
    realizationDegraded: false,
  });
  ok("path A not adapted", pack.adapted === false);
  ok("path A has bend phases", /弯腰/.test(pack.motionBody));
}

// --- kneel path B (degraded)
{
  const pack = buildRealizationAdaptPack({
    visualDescription: SHOT3_INTENT_GOLDEN.visualDescription,
    durationSec: 3,
    dialoguePresent: true,
    intentOccupancy: "bend_pickup",
    realizationOccupancy: "kneel_hold",
    realizationDegraded: true,
  });
  ok("path B adapted", pack.adapted === true);
  ok("path B no bend motion", !/弯腰俯身|弯腰捡拾/.test(pack.motionBody));
  ok("path B has kneel", /跪持/.test(pack.motionBody));
  ok("path B has pinch", /捏紧|指节/.test(pack.motionBody));
  ok("path B footnote", Boolean(pack.narrativeFootnote?.includes("弯腰")));
  ok("path B plate first hint", pack.motionStartHint.includes("静帧"));
}

// --- stand path
{
  const pack = buildRealizationAdaptPack({
    visualDescription: SHOT3_INTENT_GOLDEN.visualDescription,
    durationSec: 3,
    intentOccupancy: "bend_pickup",
    realizationOccupancy: "stand_hold",
    realizationDegraded: true,
  });
  ok("stand path adapted", pack.adapted === true);
  ok("stand no bend", !/弯腰俯身/.test(pack.motionBody));
  ok("stand has 站姿", /站姿/.test(pack.motionBody));
}

// --- spine integration path B
{
  const shot = structuredClone(SHOT3_INTENT_GOLDEN) as never;
  const meta = {
    ...SHOT3_DEGRADED_STILL_META,
    realizationAdaptPack: buildRealizationAdaptPack({
      visualDescription: SHOT3_INTENT_GOLDEN.visualDescription,
      durationSec: 3,
      dialoguePresent: true,
      ...SHOT3_DEGRADED_STILL_META,
    }),
  };
  const ctx = hydrateShotCompileContextSync({
    designShot: shot,
    shotMeta: { ...shot, ...meta } as never,
    seedPrompt: "",
    vendorId: "agnesai",
  });
  const spine = compileVideoPromptSpine({ ctx, forceRebuild: true, vendorId: "agnesai" });
  const motion = spine.prompt.match(/\[Motion\]([\s\S]*?)(?=\[Camera\]|$)/i)?.[1] ?? "";
  ok("spine degraded no bend verb", SHOT3_DEGRADED_EXPECTED.noBendMotion ? !/弯腰俯身/.test(motion) : true);
  ok("spine degraded kneel", /跪持/.test(motion));
  ok("spine narrative footnote", spine.prompt.includes(SHOT3_DEGRADED_EXPECTED.narrativeFootnote.slice(0, 6)));
  ok("spine still has dialogue", spine.prompt.includes("这休书"));
}

// --- pose gate REALIZATION-MOTION-MISMATCH
{
  const mismatch = assertStillVideoPoseHandoff({
    visualDescription: SHOT3_INTENT_GOLDEN.visualDescription,
    stillMeta: SHOT3_DEGRADED_STILL_META,
    videoPrompt: "[Motion]\n0s-3s: 弯腰俯身\n[Camera]\n中景",
  });
  ok("pose gate warns mismatch", mismatch.code === "REALIZATION-MOTION-MISMATCH");
  ok("pose gate severity WARN", mismatch.severity === "WARN");
}

// --- motionContradictsRealization
ok(
  "contradiction detect",
  motionContradictsRealization({
    motionBlob: "0s-1s: 弯腰俯身",
    realizationOccupancy: "kneel_hold",
    realizationDegraded: true,
  }),
);

// --- episode orchestrator
{
  const ep = runEpisodeAvEnhanceOrchestrator({
    shots: REALIZATION_REGRESSION_MATRIX.map((row, i) => ({
      shotIndex: i + 1,
      sceneCode: "scene1",
      shotMeta: {
        intentOccupancy: row.intent,
        realizationOccupancy: row.real,
        realizationDegraded: row.degraded,
        visualDescription: "中景。沈清漪弯腰捡起休书，指尖捏紧。",
        emotionIntensity: row.id === "weak_light" ? 5 : 6,
      },
      durationSec: 3,
      dialoguePresent: row.hasDialogue,
    })),
  });
  ok("episode orchestrator runs", ep.shots.length === REALIZATION_REGRESSION_MATRIX.length);
  ok("episode metrics total", ep.metrics.totalShots === REALIZATION_REGRESSION_MATRIX.length);
  ok("episode has adapt hits", ep.metrics.adaptHitCount >= 1);
}

console.log("\nAll realization-adapt tests passed.");
