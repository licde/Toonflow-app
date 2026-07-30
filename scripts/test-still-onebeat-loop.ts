/**
 * Must: still one-beat loop — 簪刺金样拆镜、exit BLOCK/auto、烧片禁绕开、中文壳、幂等。
 * yarn test:still-onebeat-loop
 */
import { readFileSync } from "fs";
import { join } from "path";
import { planStillOneBeatSplit, expandStillOneBeat } from "../src/ruleEngine/design/expandStillOneBeat";
import { buildStillOneBeatSplitPlan } from "../src/ruleEngine/compilers/splitPlanStub";
import { applySplitPlanToBundle } from "../src/ruleEngine/heal/proposeConfirm";
import { runDesignExitGate } from "../src/ruleEngine/design/designExitGate";
import { shouldWarnOneBeat } from "../src/ruleEngine/compilers/stillIdentitySsot";
import { decideVideoQuality } from "../src/ruleEngine/compilers/qualityDecision";
import { finalizeFiveSectionPrompt } from "../src/ruleEngine/compilers/finalizeFiveSectionPrompt";
import { runShotExpanders } from "../src/ruleEngine/design/expanderRegistry";
import { peelOsFromVisual } from "../src/ruleEngine/design/expandStillOneBeat";
import { rebindMediaSlotsByClientId } from "../src/ruleEngine/quality/forwardStaleCascade";
import { executeRePushPlan } from "../src/ruleEngine/design/rePushRunner";
import type { ScriptBundle } from "../src/ruleEngine/bundle/types";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error(`✗ ${name}`, detail ?? "");
    process.exitCode = 1;
    throw new Error(name);
  }
  console.log(`✓ ${name}`);
}

const goldenPath = join(__dirname, "../data/fixtures/golden/still-onebeat-zan-ci.json");
const golden = JSON.parse(readFileSync(goldenPath, "utf8")) as {
  badVisualDescription: string;
  goodShots: { visualDescription: string }[];
  chatContractTemplate: string;
};

ok("golden bad is multi-beat", shouldWarnOneBeat(golden.badVisualDescription));
ok("golden good shots are one-beat", golden.goodShots.every((s) => !shouldWarnOneBeat(s.visualDescription)));

const planned = planStillOneBeatSplit(golden.badVisualDescription);
ok("zan-ci plan 3 children", planned.children.length === 3 && !planned.refuse, JSON.stringify(planned.children.map((c) => c.role)));
ok("zan-ci confidence 1", planned.confidence === 1);

const expanded = expandStillOneBeat([
  {
    shotIndex: 1,
    clientId: "s1",
    visualDescription: golden.badVisualDescription,
    shotSize: "大特写",
  },
]);
ok("expandStillOneBeat → 3", expanded.expandedCount === 1 && expanded.shots.length === 3);
ok(
  "children one-beat",
  expanded.shots.every((s) => !shouldWarnOneBeat(String(s.visualDescription ?? ""))),
);

const splitPlan = buildStillOneBeatSplitPlan({
  shotIndex: 1,
  visualDescription: golden.badVisualDescription,
});
ok("splitPlan/2 auto_apply", Boolean(splitPlan && splitPlan.schemaVersion === "splitPlan/2" && splitPlan.writeMode === "auto_apply"));
const applied = applySplitPlanToBundle(
  {
    preDesignPack: {
      shots: [{ shotIndex: 1, visualDescription: golden.badVisualDescription, filePath: "/oss/dirty.jpg" }],
    },
  } as ScriptBundle,
  splitPlan!,
);
ok("apply clears filePath", applied.bundle.preDesignPack!.shots!.every((s) => !(s as { filePath?: string }).filePath));
ok("apply 3 shots", (applied.bundle.preDesignPack!.shots ?? []).length === 3);
ok("undoToken present", Boolean(applied.undoToken));

// exit: dirty → auto split → ok
const dirtyPlan = {
  planData: {
    preDesignPack: {
      shots: [{ shotIndex: 1, clientId: "c1", visualDescription: golden.badVisualDescription }],
    },
  },
};
const exit1 = runDesignExitGate("SB", dirtyPlan, { chatStrict: false, forceExpand: true });
ok("exit auto splitApplied", Boolean(exit1.splitApplied), exit1.warnings.join("|"));
ok(
  "exit after split no ONEBEAT fail",
  !exit1.failedIds.includes("DEX-STILL-ONEBEAT"),
  exit1.failedIds.join(","),
);

// chatStrict: no auto → BLOCK
const exitStrict = runDesignExitGate(
  "SB",
  {
    planData: {
      preDesignPack: {
        shots: [{ shotIndex: 1, visualDescription: golden.badVisualDescription }],
      },
    },
  },
  { chatStrict: true },
);
ok("chatStrict ONEBEAT BLOCK", exitStrict.failedIds.includes("DEX-STILL-ONEBEAT") && !exitStrict.splitApplied);

// burn forbidden
const qd = decideVideoQuality({
  shot: { visualDescription: golden.badVisualDescription, shotIndex: 1 },
  vendorId: null,
});
ok("burnAllowed false on multi-beat", qd.burnAllowed === false && qd.reasons?.includes("still_onebeat"));

// import-path expander (same kernel as prepareBundleForInspect)
const importExp = runShotExpanders(
  [{ shotIndex: 1, visualDescription: golden.badVisualDescription }],
  { meta: { pillarsVisBeatV2: "enforce" }, applyStillOneBeat: true, applyClusters: true },
);
ok(
  "import expand ≥3",
  importExp.shots.length >= 3 && importExp.log.some((l) => l.expanderId === "still_onebeat" && l.expanded),
);

// L-t05: peel OS from visual
const peeled = peelOsFromVisual(golden.badVisualDescription);
ok("peel OS line", peeled.osLines.some((l) => /谢家主|姑娘/.test(l)));
ok("peel removes 画外音 from visual", !/画外音/.test(peeled.visual));

// L-t14: kneel-sword genre
const kneelPath = join(__dirname, "../data/fixtures/golden/still-onebeat-kneel-sword.json");
const kneel = JSON.parse(readFileSync(kneelPath, "utf8")) as { badVisualDescription: string };
const kneelPlan = planStillOneBeatSplit(kneel.badVisualDescription);
ok("kneel-sword 2 children", kneelPlan.children.length === 2 && !kneelPlan.refuse);

// L-t04: mediaSlots rebind by clientId
const rebound = rebindMediaSlotsByClientId(
  [{ shotIndex: 1, role: "still" }],
  [
    { shotIndex: 1, clientId: "a-ob-insert-0" },
    { shotIndex: 2, clientId: "a-ob-reaction-1" },
  ],
);
ok("slot rebound clientId", rebound?.[0]?.clientId === "a-ob-insert-0");

// L-t06: rePush SB migrate hook
const rp = executeRePushPlan(
  [
    {
      id: "t1",
      trigger: "still_firstframe_dirty",
      reverseTarget: "SB",
      forwardRerun: ["SB", "MD-IMG"],
      preserveFields: [],
      reason: "test",
      status: "pending",
    },
  ],
  {
    ctx: {
      shots: [{ shotIndex: 1, clientId: "k1", visualDescription: kneel.badVisualDescription }],
      meta: { pillarsStillOneBeatMigrate: true },
    },
  },
);
ok("rePush migrated", (rp.shots?.length ?? 0) >= 2);

// zh shell
const fin = finalizeFiveSectionPrompt({
  prompt: `[Visual]\nECU, keep face identity, no exaggerated expression rewrite (QF-EXPR-06)\n\n[Motion]\nreadable action beats from seed.\n\n[Narrative]\ncontinuity: continues from foo`,
  durationSec: 2,
});
ok("zh shell strips QF-EXPR", !/QF-EXPR/i.test(fin.prompt));
ok("zh shell 锁定/承接", /锁定脸型|承接/.test(fin.prompt));
ok("chat template mentions 智能拆", /智能拆/.test(golden.chatContractTemplate));

// idempotent: exit twice on already-split
const after = dirtyPlan.planData.preDesignPack.shots;
ok("idempotent shots stable length≥3", Array.isArray(after) && after.length >= 3);
const exit2 = runDesignExitGate("SB", dirtyPlan, { chatStrict: false, forceExpand: true });
ok("second exit no ONEBEAT", !exit2.failedIds.includes("DEX-STILL-ONEBEAT"));

console.log("still-onebeat-loop OK");
