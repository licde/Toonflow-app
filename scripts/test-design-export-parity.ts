/**
 * yarn test:design-export-parity — P0–P4 Design Gate Miss closed-loop goldens.
 */
import { loadDesignGateMountMatrix, diagnoseNar, diagnoseDc01, findOrphanExportRuleIds, depthMountPolicy } from "../src/ruleEngine/design/gateDiagnose";
import { decideSplitForLine, loadSplitCapability } from "../src/ruleEngine/design/designSplitDecision";
import { runSplitOrchestrator, dryRunSplitOrchestrator } from "../src/ruleEngine/design/splitOrchestrator";
import { runDesignExitGate } from "../src/ruleEngine/design/designExitGate";
import { runExportGate } from "../src/ruleEngine/exportGate";
import { BLOCK_TO_TRIGGER_FOR_TEST } from "../src/ruleEngine/compilers/burnGateEnvelope";
import { buildChatRepairDeeplinks } from "../src/ruleEngine/design/chatRepairDeeplink";
import { shouldEmitRepairHint, guardReverseLoop, runForwardReentryAfterRepair } from "../src/ruleEngine/design/designSplitLifecycle";
import { resetReverseLoopForTests } from "../src/ruleEngine/design/visBeatLifecycle";
import { readFixtureJson } from "../src/ruleEngine/utils/fixturesPath";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

// ——— P0: matrix + decision tree + diagnose SSOT ———
const matrix = loadDesignGateMountMatrix();
ok("P0 mount matrix loads", matrix.rows.length >= 8, `n=${matrix.rows.length}`);
ok("P0 NAR-15 viral BLOCK", matrix.rows.some((r) => r.ruleId === "NAR-15" && r.depth?.viral === "BLOCK"));
ok("P0 light warn policy", depthMountPolicy("light").lightWarnOk === true);
ok("P0 viral hard", depthMountPolicy("viral").hardExit === true);

const cap = loadSplitCapability();
ok("P0 split capability", Boolean(cap.decisionTree?.length));

const punct = decideSplitForLine({
  text: "十天。若拿不到霜兰令，他就会把我送去和亲。",
  functions: ["info"],
});
ok("P0 decision A_clause", punct.action === "A_clause", punct.reason);

const hit = decideSplitForLine({
  text: "短",
  functions: ["emotion_hit"],
  reactionAction: "",
});
ok("P0 emotion_hit require reaction", hit.action === "require_reactionAction");

const planOnly = {
  dialoguePlan: {
    lines: [
      {
        lineId: "L-01",
        speaker: "沈清漪",
        text: "十天。若拿不到霜兰令，他就会把我送去和亲。所以今夜要么他收下我的忠心。",
        functions: ["emotion_hit"],
      },
    ],
  },
};
const shotsMissing = [
  {
    shotIndex: 1,
    visualDescription: "镜",
    narrative: {
      dialogue: {
        lines: [
          {
            lineId: "L-01",
            speaker: "沈清漪",
            text: "十天。若拿不到霜兰令，他就会把我送去和亲。所以今夜要么他收下我的忠心。",
            functions: ["emotion_hit"],
          },
        ],
      },
    },
  },
];
const narPlanShot = diagnoseNar({ planData: planOnly, shots: shotsMissing });
ok("P0 diagnoseNar sees NAR-15", narPlanShot.some((f) => f.id === "NAR-15"));

// ——— P1: orchestrator clears DC-01 after clause split ———
const beforeDc = diagnoseDc01({
  planData: {
    dialoguePlan: {
      lines: [
        { lineId: "L-01a", speaker: "A", text: "一句。", functions: ["info"] },
        { lineId: "L-01b", speaker: "A", text: "两句。", functions: ["info"] },
      ],
    },
  },
  shots: [
    {
      shotIndex: 1,
      narrative: {
        dialogue: {
          lines: [{ lineId: "L-01a", speaker: "A", text: "一句。", functions: ["info"] }],
        },
      },
    },
  ],
});
ok("P1 DC-01 detects missing", beforeDc.length === 1);

const orch = runSplitOrchestrator({
  planData: {
    dialoguePlan: {
      lines: [
        {
          lineId: "L-long",
          speaker: "沈清漪",
          text: "十天。若拿不到霜兰令，他就会把我送去和亲。",
          functions: ["emotion_hit"],
          reactionAction: "听者一怔",
        },
      ],
    },
  },
  shots: [
    {
      shotIndex: 1,
      visualDescription: "近景",
      narrative: {
        shotSize: "中景",
        dialogue: {
          lines: [
            {
              lineId: "L-long",
              speaker: "沈清漪",
              text: "十天。若拿不到霜兰令，他就会把我送去和亲。",
              functions: ["emotion_hit"],
              reactionAction: "听者一怔",
            },
          ],
        },
      },
    },
  ],
  applyVisBeatExpanders: false,
});
const dcAfter = diagnoseDc01({ planData: orch.planData, shots: orch.shots });
ok("P1 post-split DC-01=0", dcAfter.length === 0, JSON.stringify(dcAfter));
ok(
  "P1 emotion_hit NAR-15 clean",
  !orch.narFails.some((f) => f.id === "NAR-15"),
  orch.narFails.map((f) => f.id).join(","),
);

const dry = dryRunSplitOrchestrator({
  planData: orch.planData,
  shots: orch.shots,
});
ok("P1 dryRun exists", dry.predictedShotCount >= 1);

// designExit SB vs export must-subset (NAR family)
const planSb = {
  planData: {
    ...orch.planData,
    meta: { adaptationDepth: "viral" },
    genreTemplate: { packId: "generic", adaptationDepth: "viral" },
    preDesignPack: { shots: orch.shots },
    narrativeSelfcheck: { passed: false },
  },
  characterDesign: {
    assets: [{ code: "CHAR-SHENQINGYI", name: "沈清漪", L0: { identity: "嫡女" } }],
  },
};
const exitSb = runDesignExitGate("SB", planSb);
const exportResult = runExportGate({
  bundleType: "script",
  bundleVersion: "1.0.0",
  rulePackVersion: "2.1.0",
  meta: { episodeKey: "ep-01" },
  script: "沈清漪：十天。",
  planData: planSb.planData,
  characterDesign: planSb.characterDesign,
  preDesignPack: { scriptPlan: "场1", shots: orch.shots },
});
const exitMust = exitSb.failedIds.filter((id) => /^(NAR-|DC-01|DC-16|DEX-SPEAKER|DEX-LIP|DEX-DC-ALIGN)/.test(id));
const exportBlocks = new Set((exportResult.blocks ?? []).map((b) => b.id));
const subset =
  exitMust.every((id) => exportBlocks.has(id) || id === "DEX-LIP-SPLIT" || id === "DEX-DC-ALIGN" || id.startsWith("DEX-"));
ok(
  "P1/P4 designExit must ⊆ export family (or design-only DEX)",
  subset || exitMust.length === 0,
  `exit=${exitMust.join(",")} export=${[...exportBlocks].slice(0, 12).join(",")}`,
);

// ——— P2/P3: reverse triggers + deeplink + loop + reentry ———
ok("P3 burn map NAR-15→nar15_reaction", BLOCK_TO_TRIGGER_FOR_TEST["NAR-15"] === "nar15_reaction");
ok("P3 burn map NAR-14→nar14_split", BLOCK_TO_TRIGGER_FOR_TEST["NAR-14"] === "nar14_split");
ok("P3 burn map DC-16→dc16_cast", BLOCK_TO_TRIGGER_FOR_TEST["DC-16"] === "dc16_cast");

const routes = readFixtureJson<{ routes?: { trigger: string }[] }>("reverse_route_table.json", { routes: [] });
for (const t of ["nar14_split", "nar15_reaction", "dc16_cast", "speaker_bare", "design_split_orchestrator", "self_report_mismatch"]) {
  ok(`P3 reverse_route has ${t}`, (routes.routes ?? []).some((r) => r.trigger === t));
}

const links = buildChatRepairDeeplinks(["NAR-15", "DC-01", "DC-16"]);
ok("P3 deeplinks", links.length >= 2 && links.every((l) => l.deeplink.startsWith("toonflow://stage/")));

ok("P3 silent dual-track no RH", shouldEmitRepairHint("silent", true) === false);
ok("P3 auto healed no RH", shouldEmitRepairHint("auto", true) === false);
ok("P3 must always RH", shouldEmitRepairHint("must", true) === true);

resetReverseLoopForTests();
const g1 = guardReverseLoop("nar15_reaction", "proj-test", 2);
const g2 = guardReverseLoop("nar15_reaction", "proj-test", 2);
const g3 = guardReverseLoop("nar15_reaction", "proj-test", 2);
ok("P3 loop allow then escalate", g1.allow && g2.allow && g3.escalateHuman);

const re = runForwardReentryAfterRepair({
  planData: orch.planData,
  shots: orch.shots.map((s) => ({ ...s, stillQuality: "hq_ok", filePath: "/tmp/x.png", clientId: "c1" })),
  applyClauseSplit: false,
});
ok("P3 forward reentry keeps hq", re.reentry.keepMediaClientIds.includes("c1"));

// orphan CI
const orphans = findOrphanExportRuleIds(["NAR-15", "DC-01", "TOTALLY-FAKE-RULE"]);
ok("P4 orphan finder", orphans.includes("TOTALLY-FAKE-RULE") && !orphans.includes("NAR-15"));

// golden fwd→rev: fail NAR-15 → trigger → reentry cleans when reaction present
const bad = runSplitOrchestrator({
  planData: {
    dialoguePlan: {
      lines: [{ lineId: "L-e", speaker: "A", text: "恨。", functions: ["emotion_hit"] }],
    },
  },
  shots: [
    {
      shotIndex: 1,
      narrative: {
        dialogue: { lines: [{ lineId: "L-e", speaker: "A", text: "恨。", functions: ["emotion_hit"] }] },
      },
    },
  ],
  applyVisBeatExpanders: false,
  applyClauseSplit: false,
});
ok("P4 fwd fail NAR-15", bad.narFails.some((f) => f.id === "NAR-15"));
const fixedLines = {
  dialoguePlan: {
    lines: [
      { lineId: "L-e", speaker: "A", text: "恨。", functions: ["emotion_hit"], reactionAction: "退半步" },
    ],
  },
};
const fixed = runForwardReentryAfterRepair({
  planData: fixedLines,
  shots: [
    {
      shotIndex: 1,
      narrative: {
        dialogue: {
          lines: [
            { lineId: "L-e", speaker: "A", text: "恨。", functions: ["emotion_hit"], reactionAction: "退半步" },
          ],
        },
      },
    },
  ],
  applyClauseSplit: false,
});
ok(
  "P4 rev→fwd NAR-15 cleared",
  !diagnoseNar({ planData: fixed.planData, shots: fixed.shots }).some((f) => f.id === "NAR-15"),
);

if (failed) {
  console.error(`\nFAILED ${failed}`);
  process.exit(1);
}
console.log("\nAll design-export-parity checks passed.");
