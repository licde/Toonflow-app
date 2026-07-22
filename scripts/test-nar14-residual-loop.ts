/**
 * yarn test:nar14-residual-loop — 祭祖残句完整闭环金标
 */
import { expandLinesByClauseSplit, needsNar14Split } from "../src/ruleEngine/nar14ClauseSplit";
import {
  isNar14Residual,
  collectNar14Residuals,
  healNar14ResidualWithB,
  classifyNar14ForChatRepair,
} from "../src/ruleEngine/design/nar14Residual";
import { decideSplitForLine } from "../src/ruleEngine/design/designSplitDecision";
import { runSplitOrchestrator } from "../src/ruleEngine/design/splitOrchestrator";
import { prepareBundleForInspect } from "../src/ruleEngine/bundle/prepareBundleForInspect";
import { runExportGate } from "../src/ruleEngine/exportGate";
import { buildAggregatedChatRepairText } from "../src/ruleEngine/exportGate";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const residualText = "是想与我谈谈谢家下个月祭祖的规程";
const parentText = "谢家主来，是想与我谈谈谢家下个月祭祖的规程。";

ok("residual isNar14Residual", isNar14Residual(residualText));
ok("decide must_redesign_or_B", decideSplitForLine({ text: residualText }).action === "must_redesign_or_B");

const expanded = expandLinesByClauseSplit([
  { lineId: "L-02b", speaker: "沈清漪", text: parentText, functions: ["deliver_info"] },
]);
ok("A splits parent", expanded.lines.length >= 2, `n=${expanded.lines.length}`);
const residuals = collectNar14Residuals(expanded.lines);
ok("A后仍有残句", residuals.length >= 1, residuals.map((r) => r.lineId).join(","));
ok(
  "classify must",
  classifyNar14ForChatRepair({ planLines: expanded.lines, blockHasNar14: true }) === "must",
);

const heal = healNar14ResidualWithB({
  planLines: expanded.lines,
  shots: [
    {
      shotIndex: 1,
      clientId: "s1",
      narrative: {
        dialogue: { lines: expanded.lines },
        emotionIntensity: 5,
      },
    },
  ],
});
ok("B expanded or bound", heal.expandedCount > 0 || heal.bound > 0, `e=${heal.expandedCount} b=${heal.bound}`);
ok(
  "after B residual cleared or hinted",
  heal.remainingResiduals.length === 0 ||
    heal.planLines.every((l) => !needsNar14Split(String(l.text), { splitHint: l.splitHint })),
  JSON.stringify(heal.remainingResiduals),
);

const orch = runSplitOrchestrator({
  planData: { dialoguePlan: { lines: [{ lineId: "L-02b", speaker: "沈清漪", text: parentText }] } },
  shots: [
    {
      shotIndex: 1,
      narrative: {
        dialogue: { lines: [{ lineId: "L-02b", speaker: "沈清漪", text: parentText }] },
      },
    },
  ],
  applyVisBeatExpanders: false,
});
ok(
  "orchestrator clears NAR-14",
  !orch.narFails.some((f) => f.id === "NAR-14"),
  orch.narFails.map((f) => f.message).join(";"),
);

const bundleRaw = {
  bundleType: "script",
  bundleVersion: "1.0.0",
  rulePackVersion: "2.1.0",
  meta: { episodeKey: "ep-01" },
  script: "沈清漪：谢家主来，是想与我谈谈谢家下个月祭祖的规程。",
  planData: {
    dialoguePlan: {
      lines: [{ lineId: "L-02b", speaker: "沈清漪", text: parentText, functions: ["deliver_info"] }],
    },
  },
  characterDesign: {
    assets: [{ code: "CHAR-SHENQINGYI", name: "沈清漪", L0: { identity: "嫡女" } }],
  },
  preDesignPack: {
    scriptPlan: "场1",
    shots: [
      {
        shotIndex: 1,
        visualDescription: "近景",
        visualEffect: "F0",
        duration: 8,
        narrative: {
          type: "CHAR-SCENE",
          sceneName: "祠堂",
          dialogue: {
            lines: [{ lineId: "L-02b", speaker: "沈清漪", text: parentText, functions: ["deliver_info"] }],
          },
        },
      },
    ],
  },
  narrativeSelfcheck: { passed: true, failedIds: [] },
};

const ingest = prepareBundleForInspect(bundleRaw, { ingestHeal: true });
const planAfter =
  ((ingest.bundle.planData as { dialoguePlan?: { lines?: { text?: string; splitHint?: string }[] } })?.dialoguePlan
    ?.lines ?? []) as { text?: string; splitHint?: string }[];
ok(
  "ingest heal residual path ran",
  planAfter.some((l) => l.splitHint === "reaction_shot") ||
    planAfter.every((l) => !needsNar14Split(String(l.text), { splitHint: l.splitHint })),
  JSON.stringify(planAfter.map((l) => ({ t: l.text, h: l.splitHint }))),
);

const gated = runExportGate({
  ...bundleRaw,
  narrativeSelfcheck: { passed: true, failedIds: [] },
  planData: {
    dialoguePlan: {
      lines: [{ lineId: "L-x", speaker: "沈清漪", text: residualText, functions: ["info"] }],
    },
  },
  preDesignPack: {
    scriptPlan: "场1",
    shots: [
      {
        shotIndex: 1,
        visualDescription: "近景",
        visualEffect: "F0",
        duration: 8,
        narrative: {
          type: "CHAR-SCENE",
          sceneName: "祠堂",
          dialogue: {
            lines: [{ lineId: "L-x", speaker: "沈清漪", text: residualText }],
          },
        },
      },
    ],
  },
});
// exportGate uses ingestHeal false — residual stays; chatRepair must classify must
const repair = buildAggregatedChatRepairText(
  [],
  ["NAR-14", "DG-NAR-SELFCHECK"],
  "",
  [{ id: "NAR-14", message: "残句" }],
  {
    planLines: [{ lineId: "L-x", text: residualText }],
    shots: [],
  },
);
ok("chatRepair 残句进须手改", repair.includes("【须手改") && repair.includes("NAR-14"));
ok(
  "selfcheck overwritten on export with NAR",
  Boolean((gated.bundle as { narrativeSelfcheck?: { passed?: boolean; serverOverwritten?: boolean } }).narrativeSelfcheck?.serverOverwritten) ||
    (gated.bundle as { narrativeSelfcheck?: { passed?: boolean } }).narrativeSelfcheck?.passed === false ||
    gated.blocks.some((b) => b.id === "NAR-14" || b.id === "DG-NAR-SELFCHECK"),
  `passed=${(gated.bundle as { narrativeSelfcheck?: { passed?: boolean } }).narrativeSelfcheck?.passed} blocks=${gated.blocks.map((b) => b.id).join(",")}`,
);

if (failed) {
  console.error(`\nFAILED ${failed}`);
  process.exit(1);
}
console.log("\n=== test:nar14-residual-loop OK ===");
