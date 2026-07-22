/**
 * Golden: lip multi-line / vendor split loop + still recipe refine hygiene.
 * yarn test:lip-split-loop
 */
import { detectLipSplitPressure, healLipMultiLineWithB, readCanonicalSplitHint, classifyLipForChatRepair } from "../src/ruleEngine/design/lipSplit";
import { resolveRequiredDuration } from "../src/ruleEngine/compilers/resolveRequiredDuration";
import { decideVideoQuality } from "../src/ruleEngine/compilers/qualityDecision";
import { runSplitOrchestrator } from "../src/ruleEngine/design/splitOrchestrator";
import { stripStaleBindingFromPrevious } from "../src/ruleEngine/compilers/composeStillPrompt";
import { dedupeRecipeLayerPrefixes, healStillRecipePolicy } from "../src/ruleEngine/compilers/stillRecipePolicy";
import { stripWhoVerbGlue } from "../src/ruleEngine/compilers/extractDescPredicates";
import { normalizeCrefEgress } from "../src/ruleEngine/compilers/stillEgressNormalize";
import { checkFxGrade } from "../src/ruleEngine/validators/langAudFxCam";
import { buildAggregatedChatRepairText } from "../src/ruleEngine/exportGate";
import { readFileSync } from "fs";

function ok(name: string, cond: boolean) {
  if (!cond) {
    console.error(`✗ ${name}`);
    process.exitCode = 1;
    throw new Error(name);
  }
  console.log(`✓ ${name}`);
}

const multiShot = {
  shotIndex: 1,
  duration: 4,
  narrative: {
    dialogue: {
      lines: [
        { lineId: "L-a", speaker: "沈清漪", text: "包扎好伤口后指尖拂过梳妆台。" },
        { lineId: "L-b", speaker: "侍女", text: "姑娘！谢家主来了！" },
      ],
    },
  },
};

const pressure = detectLipSplitPressure(multiShot);
ok("multi_line needsSplit pressure", pressure.needsSplit === true && pressure.mustConfirm);
ok("no reactionAction as hint", readCanonicalSplitHint({
  narrative: { dialogue: { lines: [{ text: "x", reactionAction: "铜镜映出她眼底决绝的光" }] } },
}) === undefined);

const req = resolveRequiredDuration(multiShot);
ok("resolveRequiredDuration no reactionAction fallback", !req.splitHint || /^[a-z_]+$/i.test(req.splitHint));

const qd = decideVideoQuality({ shot: multiShot as never, vendorId: "agnesai", fxGrade: "F0" });
ok("burn L3 multi_line reason", qd.reasons.includes("multi_line_one_shot"));
ok("burn no shotWithSplitHint invent", !qd.shotWithSplitHint);
ok("splitHint is enum", Boolean(qd.splitHint && /^[a-z][a-z0-9_]*$/i.test(qd.splitHint)));

const healed = healLipMultiLineWithB({ shots: [multiShot] });
ok("lip B expanded or split shots", healed.shots.length >= 2 || healed.expandedCount > 0);
const remain = healed.shots.filter((s) => detectLipSplitPressure(s).needsSplit).length;
ok("after B fewer multi_line shots", remain < 1 || healed.shots.every((s) => {
  const lines = (s.narrative as { dialogue?: { lines?: unknown[] } })?.dialogue?.lines ?? [];
  return lines.length <= 1;
}));

const orch = runSplitOrchestrator({
  planData: {
    dialoguePlan: {
      lines: [
        { lineId: "L-a", speaker: "沈清漪", text: "包扎好伤口后指尖拂过梳妆台。" },
        { lineId: "L-b", speaker: "侍女", text: "姑娘！谢家主来了！" },
      ],
    },
  },
  shots: [multiShot],
  applyVisBeatExpanders: false,
});
ok("orchestrator has lip or clause log", orch.log.some((l) => /lip_multi|mirror|clause/.test(l.step)));
ok("orchestrator returns dcFails", Array.isArray(orch.dcFails));

ok(
  "chatRepair must for multi",
  classifyLipForChatRepair({ shots: [multiShot], blockHasLip01: true }) === "must",
);

const fx3 = checkFxGrade({ fxFeasibility: "F3", fxPrompt: "火花四溅金属碰撞", shotIndex: 1 });
ok("F3 export BLOCK 需拆镜", Boolean(fx3 && fx3.severity === "BLOCK"));

// still hygiene
const stacked =
  "沈清漪包扎伤口。背景弱化：浅景深、环境虚化。景别：中景。必须出现：沈清漪。背景弱化：浅景深、环境虚化。景别：特写。必须出现：沈清漪勾。";
const stripped = stripStaleBindingFromPrevious(stacked);
ok("strip removes recipe layers", !/背景弱化|景别：|必须出现/.test(stripped));
const deduped = dedupeRecipeLayerPrefixes(stacked);
ok("dedupe keeps one 景别", (deduped.prompt.match(/景别：/g) ?? []).length <= 1);
ok("dedupe keeps one 背景弱化", (deduped.prompt.match(/背景弱化/g) ?? []).length <= 1);
const healedStill = healStillRecipePolicy(stacked);
ok("heal still dedupes", (healedStill.prompt.match(/景别：/g) ?? []).length <= 1);
ok("勾 glue stripped", stripWhoVerbGlue("沈清漪勾") === "沈清漪");
ok("勾起 glue stripped", stripWhoVerbGlue("沈清漪勾起") === "沈清漪");
const sref = normalizeCrefEgress("face --sref SCENE-001，。背景弱化");
ok("sref chinese comma cleaned", /--sref SCENE-001\b/.test(sref) && !/--sref SCENE-001，/.test(sref));

// VisBeat: DEX-VIS-SPLIT must not be autoAdapt「可不手改」
const matrix = JSON.parse(
  readFileSync("data/fixtures/semantic_gate_dual_track_matrix.json", "utf8"),
) as { autoAdaptBlockIds?: string[]; mustEditBlockIds?: string[] };
ok("DEX-VIS-SPLIT not in autoAdapt", !(matrix.autoAdaptBlockIds ?? []).includes("DEX-VIS-SPLIT"));
ok("DEX-VIS-SPLIT in mustEdit", (matrix.mustEditBlockIds ?? []).includes("DEX-VIS-SPLIT"));
const visRepair = buildAggregatedChatRepairText(
  [],
  ["DEX-VIS-SPLIT"],
  undefined,
  [{ id: "DEX-VIS-SPLIT", message: "tags×景别冲突须拆镜" }],
);
ok("VisBeat chatRepair 须手改 Confirm", /须手改 Confirm|须手改/.test(visRepair));

if (process.exitCode) {
  console.error("\n=== test:lip-split-loop FAIL ===");
  process.exit(1);
}
console.log("\n=== test:lip-split-loop OK ===");
