/**
 * P5 VisBeat enhancements + forward↔reverse golden.
 * Pattern suggestor only (CI deterministic — no LLM).
 */
import assert from "node:assert/strict";
import {
  evaluateVisBeatConflict,
  migratePackVisualBeatTags,
  visBeatExplainTriple,
  loadVisualBeatVocab,
} from "../src/ruleEngine/design/visualBeatPolicy";
import { expandVisualBeats } from "../src/ruleEngine/design/expandVisualBeats";
import { runShotExpanders } from "../src/ruleEngine/design/expanderRegistry";
import {
  applyMediaPreserveOnSplit,
  checkReverseLoop,
  planForwardReentry,
  planUndoVisualSplit,
  resetReverseLoopForTests,
} from "../src/ruleEngine/design/visBeatLifecycle";
import {
  auditCrossSceneArc,
  exemplarSuggestTags,
  proposeMinShotPlan,
  visBeatSloSnapshot,
} from "../src/ruleEngine/design/visBeatEnhance";
import { proposePromoteDiff, scaffoldPromoteGolden } from "../src/ruleEngine/design/visBeatPromote";
import { decideVideoQuality } from "../src/ruleEngine/compilers/qualityDecision";
import { buildAggregatedChatRepairText } from "../src/ruleEngine/exportGate";
import { shortContinuityAfterSplit } from "../src/ruleEngine/design/visBeatLedgerRebind";

function ok(name: string, cond: boolean) {
  if (!cond) throw new Error(`FAIL: ${name}`);
  console.log(`✓ ${name}`);
}

process.env.PILLARS_VIS_BEAT_V2 = undefined; // CI: no LLM; pattern only

const vocab = loadVisualBeatVocab();
ok("mutex groups", (vocab.tagMutexGroups?.length ?? 0) >= 1);

const mutex = evaluateVisBeatConflict({
  visualBeatTags: ["establish", "face_cu"],
  shotSize: "中景",
  picture: "大厅",
  requireTags: true,
  meta: { pillarsVisBeatV2: "enforce" },
});
ok("tag mutex inconsistent", mutex.action === "tag_inconsistent");

const seating = evaluateVisBeatConflict({
  visualBeatTags: ["reveal"],
  shotSize: "特写",
  picture: "座次",
  seatingHard: true,
  meta: { pillarsVisBeatV2: "enforce" },
});
ok("seatingHard skips", seating.matrixRowId === "compat.seating");

const mig = migratePackVisualBeatTags(
  [{ suggestedVisualBeatTags: ["reveal"], visualDescription: "刃" }],
  { confirmSuggested: false },
);
ok("migrate needs confirm", mig.needsConfirm === 1);

const triple = visBeatExplainTriple(
  evaluateVisBeatConflict({
    visualBeatTags: ["reveal"],
    shotSize: "特写",
    picture: "匕首",
    meta: { pillarsVisBeatV2: "enforce" },
  }),
);
ok("explain triple has tags enum", triple.chatLine.includes("reveal"));

const parent = {
  clientId: "fwd1",
  visualBeatTags: ["reveal"],
  shotSize: "特写",
  visualDescription: "露出匕首",
  filePath: "/p.png",
  stillQuality: "hq_ok",
  peakId: "peak-1",
  narrative: { shotSize: "特写", dialogue: { lines: [{ text: "嗯" }] } },
};
const fail = evaluateVisBeatConflict({ ...parent, meta: { pillarsVisBeatV2: "enforce" } });
ok("fwd fail must_split", fail.action === "must_split");

const expanded = expandVisualBeats([parent], { meta: { pillarsVisBeatV2: "enforce" } });
ok("rev expand", expanded.expandedCount === 1);
const withMedia = applyMediaPreserveOnSplit(expanded.shots, parent);
ok(
  "media on reaction",
  withMedia.some((s) => s.visualSplitRole === "reaction" && s.filePath === "/p.png"),
);

const reg = runShotExpanders([parent], { meta: { pillarsVisBeatV2: "enforce" } });
ok("ledger rebound", reg.log.some((l) => l.expanderId === "ledger_rebind") || reg.shots.some((s) => s.peakId === "peak-1"));

const afterFix = reg.shots.map((s) => ({
  ...s,
  visualBeatTags: s.visualSplitRole === "insert" ? ["prop_insert", "reveal"] : ["reaction", "face_cu"],
}));
const reOk = afterFix.every(
  (s) =>
    evaluateVisBeatConflict({
      visualBeatTags: s.visualBeatTags,
      shotSize: s.shotSize as string,
      picture: "x",
      meta: { pillarsVisBeatV2: "enforce" },
    }).action !== "must_split",
);
ok("fwd-rev-fwd green", reOk);

const reentry = planForwardReentry([
  { clientId: "c1", stillQuality: "hq_ok", filePath: "/x" },
  { clientId: "c2" },
]);
ok("reentry keep", reentry.keepMediaClientIds.includes("c1"));

const undone = planUndoVisualSplit(expanded.shots, "fwd1");
ok("undo split", undone.restored);

ok("continuity short", shortContinuityAfterSplit("近景", "特写").includes("续势"));
ok("exemplar", exemplarSuggestTags("露出匕首").suggestedTags.length > 0);
ok("arc", auditCrossSceneArc([{ visualBeatTags: ["reveal"] }]).includes("VIS-ARC-NO-PAYOFF"));
ok("slo", typeof visBeatSloSnapshot({ taggedShotCount: 1, totalShots: 1 }).tagCoverage === "number");
ok("min shot propose", proposeMinShotPlan(3, 1).note.includes("propose_only"));

const promo = proposePromoteDiff({
  id: "t1",
  tag: "reveal",
  pattern: "冷光",
  hits: 10,
  falsePositives: 0,
  status: "candidate",
});
ok("promote diff", promo.ok && promo.diff.includes("冷光"));
const goldenPath = scaffoldPromoteGolden({
  id: "t1",
  tag: "reveal",
  pattern: "冷光",
  hits: 10,
  falsePositives: 0,
  status: "candidate",
});
ok("promote scaffold", goldenPath.includes("visbeat-promote-t1"));

resetReverseLoopForTests();
checkReverseLoop("visual_multi_beat", "p5");
checkReverseLoop("visual_multi_beat", "p5");
checkReverseLoop("visual_multi_beat", "p5");
ok("loop guard", checkReverseLoop("visual_multi_beat", "p5").allow === false);

const qd = decideVideoQuality({
  shot: { burnParentForbidden: true, shotIndex: 9 } as never,
  visBeatMeta: { pillarsVisBeatV2: "enforce" },
});
ok("parent burn forbidden", qd.burnAllowed === false);

const rh = buildAggregatedChatRepairText([], ["DEX-VIS-SPLIT"], undefined, [
  { id: "DEX-VIS-SPLIT", message: "须拆镜" },
]);
ok("chat RH enum tags", rh.includes("reveal") && rh.includes("VisBeat"));

assert.ok(true);
console.log("\nVisBeat P5 + fwd-rev passed.");
