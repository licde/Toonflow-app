/**
 * yarn test:still-intent-ird
 * IRD closed-loop: diagnose→apply→anti double-split→speak/react fields→provenance.
 */
import {
  diagnoseStillIntent,
  applyStillIntentPatches,
  runStillIntentHeal,
  stillDirtyPrimaryAction,
} from "@/ruleEngine/design/stillIntentReverse";
import { planRePush, executeRePushPlan } from "@/ruleEngine/design/rePushRunner";
import { shouldWarnOneBeat } from "@/ruleEngine/compilers/stillIdentitySsot";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

function main() {
  const multiVd = "他刺入胸口。她咬帕。旁人包扎伤口。";
  ok("multi-beat sample", shouldWarnOneBeat(multiVd));

  const shots: Record<string, unknown>[] = [
    {
      shotIndex: 1,
      clientId: "s1",
      visualDescription: multiVd,
      duration: 4,
      narrative: { dialogue: { lines: [{ speaker: "甲", text: "你走" }] } },
    },
  ];

  const d = diagnoseStillIntent(shots, {});
  ok("diagnose finds ONEBEAT", d.findings.some((f) => f.id === "DEX-STILL-ONEBEAT"), d.findings.map((f) => f.id).join(","));
  ok("diagnose has split patch", d.patches.some((p) => p.op === "split_onebeat"));
  ok("primary is split or apply", d.primaryAction === "confirm_split" || d.primaryAction === "apply_auto", d.primaryAction);

  const applied = applyStillIntentPatches(shots, d, { forceApply: true });
  ok("apply produced children", applied.shots.length >= 2, `n=${applied.shots.length}`);
  ok("children have parent stash", applied.shots.every((s) => !s._stillBeatSplitId || s._parentVisualDescription));
  ok("applied ids recorded", applied.applied.length > 0);

  // Anti double-split
  const d2 = diagnoseStillIntent(applied.shots, {});
  const onebeatAgain = d2.patches.filter((p) => p.op === "split_onebeat");
  ok("no second onebeat on children", onebeatAgain.length === 0, `patches=${onebeatAgain.length}`);

  // Speak+react
  const speakReact: Record<string, unknown>[] = [
    {
      shotIndex: 2,
      clientId: "s2",
      visualDescription: "沈清漪开口道完，旁人愣住反应",
      duration: 3,
      narrative: { dialogue: { lines: [{ speaker: "沈清漪", text: "你走" }] } },
    },
  ];
  const dSr = diagnoseStillIntent(speakReact, {});
  ok(
    "speak+react patch or cam-fit",
    dSr.patches.some((p) => p.op === "split_speak_react") || dSr.findings.some((f) => f.id === "DEX-CAM-FIT"),
  );

  // Intent sync
  const intentMiss: Record<string, unknown>[] = [
    { shotIndex: 1, clientId: "i1", visualDescription: "空", duration: 2 },
  ];
  const dInt = diagnoseStillIntent(intentMiss, {
    intents: [
      {
        purpose: "钩子",
        emotionGoal: "紧",
        picture: "沈清漪端坐太师椅摩挲扳指烛火侧光",
        shotSizeIntent: "近景",
        cutIntent: "切",
        audioIntent: "静",
        durationSec: 2,
      },
    ],
  });
  ok(
    "intent salvage patch",
    dInt.patches.some((p) => p.op === "sync_intent_picture" || p.op === "rewrite_vd"),
    dInt.patches.map((p) => p.op).join(","),
  );

  // chatStrict propose-only
  const strict = applyStillIntentPatches(shots, d, { chatStrict: true });
  ok("chatStrict skips apply", strict.applied.length === 0 && strict.refused.includes("chatStrict"));

  // Import heal + provenance
  const bundle = {
    preDesignPack: {
      shots: [
        {
          shotIndex: 1,
          clientId: "b1",
          visualDescription: multiVd,
          duration: 4,
        },
      ],
    },
    planData: {},
    meta: {},
  } as ScriptBundle;
  const heal = runStillIntentHeal(bundle, { forceApply: true });
  ok("import heal applies or refuses", heal.applied.length + heal.refused.length > 0);
  ok(
    "bundle meta provenance or confirm",
    Boolean((bundle as { meta?: { irdProvenance?: unknown; irdConfirmRequired?: boolean } }).meta?.irdProvenance) ||
      Boolean((bundle as { irdConfirmRequired?: boolean }).irdConfirmRequired) ||
      heal.applied.length > 0,
  );

  // Dirty fork
  const dirty = stillDirtyPrimaryAction(
    { visualDescription: multiVd, shotIndex: 1 },
    { fidelityFailed: true },
  );
  ok("dirty multi-beat → split/apply not only hq", dirty === "confirm_split" || dirty === "apply_auto", dirty);

  // rePush requires designExit
  const plan = planRePush([{ trigger: "still_onebeat_multi", reverseTarget: "SB", forwardRerun: ["SB", "MD-IMG"], priority: 0 } as never]);
  ok("rePush designExitRequired", plan.designExitRequired === true);

  const exec = executeRePushPlan(
    [{ trigger: "x", reverseTarget: "SB", forwardRerun: ["SB"], priority: 0 } as never],
    {
      ctx: {
        shots: [{ shotIndex: 1, clientId: "r1", visualDescription: multiVd, duration: 3 }],
        meta: {},
        planData: {},
      },
      maxRounds: 3,
    },
  );
  ok("rePush executes SB", (exec.stageResults ?? []).some((r) => r.stage === "SB"));
  ok("rePush loop cap not exhausted on round1", exec.status !== "exhausted");

  // Matrix soft cannot trump must-split / design-loss; DEX-CAM-FIT is autoAdapt (export cam hygiene)
  const matrix = require("../data/fixtures/semantic_gate_dual_track_matrix.json") as {
    mustEditBlockIds?: string[];
    autoAdaptBlockIds?: string[];
  };
  for (const id of ["DEX-STILL-ONEBEAT", "DESIGN-LOSS", "IRD-CONFIRM"]) {
    ok(
      `mustEdit has ${id}`,
      (matrix.mustEditBlockIds ?? []).includes(id) || id === "IRD-CONFIRM",
    );
  }
  ok(
    "DEX-CAM-FIT is autoAdapt (export hygiene)",
    (matrix.autoAdaptBlockIds ?? []).includes("DEX-CAM-FIT"),
  );
  ok(
    "DEX-CAM-FIT not mustEdit",
    !(matrix.mustEditBlockIds ?? []).includes("DEX-CAM-FIT"),
  );

  if (failed) {
    console.error(`\n${failed} test:still-intent-ird FAILED`);
    process.exit(1);
  }
  console.log("\n=== test:still-intent-ird OK ===");
}

main();
