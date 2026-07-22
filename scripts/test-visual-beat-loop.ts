/**
 * VisBeat OS closed-loop goldens: P0 policy + P1 expand + override + scorecard + reverse + P5 stubs.
 * CI: pattern suggestor only (no LLM).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  canonicalizeShotSize,
  evaluateVisBeatConflict,
  loadVisualBeatVocab,
  migrateShotVisualBeatTags,
  resolveVisBeatMode,
} from "../src/ruleEngine/design/visualBeatPolicy";
import { suggestVisualBeatTags } from "../src/ruleEngine/design/visualBeatSuggestor";
import { expandVisualBeats } from "../src/ruleEngine/design/expandVisualBeats";
import { runShotExpanders, auditRhythmBudget } from "../src/ruleEngine/design/expanderRegistry";
import {
  checkReverseLoop,
  planForwardReentry,
  resetReverseLoopForTests,
  setVisBeatOverrideOnShot,
} from "../src/ruleEngine/design/visBeatLifecycle";
import {
  auditCrossSceneArc,
  buildVisBeatDryRunPanel,
  exemplarSuggestTags,
  proposeMinShotPlan,
  visBeatSloSnapshot,
} from "../src/ruleEngine/design/visBeatEnhance";
import { scoreAdaptationDesign } from "../src/ruleEngine/design/adaptScorecard";
import { scoreShortVideo } from "../src/ruleEngine/qc/shortVideoQuality";
import { BLOCK_TO_TRIGGER_FOR_TEST } from "../src/ruleEngine/compilers/burnGateEnvelope";
import { decideVideoQuality } from "../src/ruleEngine/compilers/qualityDecision";

function ok(name: string, cond: boolean) {
  if (!cond) throw new Error(`FAIL: ${name}`);
  console.log(`✓ ${name}`);
}

// —— P0 ——
const vocab = loadVisualBeatVocab();
ok("vocab", vocab.conflict_matrix.length >= 1);
ok("canon", canonicalizeShotSize("cu", vocab) === "face_cu");
ok("shadow soft", evaluateVisBeatConflict({
  visualBeatTags: ["reveal"],
  shotSize: "特写",
  picture: "匕首",
  meta: { pillarsVisBeatV2: "shadow" },
}).ok === true);
ok("enforce hard", evaluateVisBeatConflict({
  visualBeatTags: ["reveal"],
  shotSize: "特写",
  picture: "匕首",
  meta: { pillarsVisBeatV2: "enforce" },
}).ok === false);
const sug = suggestVisualBeatTags({ text: "镜头下移露出匕首，她浅笑" });
ok("suggestor proposes", sug.suggestedTags.length > 0);
ok("suggestor never legislates alone", evaluateVisBeatConflict({
  visualBeatTags: [],
  shotSize: "特写",
  picture: "露出匕首",
  requireTags: false,
  meta: { pillarsVisBeatV2: "enforce" },
}).action !== "must_split");

// —— P1 expand ——
const parent = {
  clientId: "s1",
  shotIndex: 1,
  visualBeatTags: ["reveal", "prop_insert"],
  shotSize: "特写",
  visualDescription: "镜头下移露出匕首冷光",
  duration: 2,
  narrative: {
    shotSize: "特写",
    dialogue: { lines: [{ speaker: "沈清漪", text: "你以为呢" }] },
  },
};
const expanded = expandVisualBeats([parent], { meta: { pillarsVisBeatV2: "enforce" } });
ok("visual expand count", expanded.expandedCount === 1);
ok("visual children ≥2", expanded.shots.length >= 2);
ok("dialogue on reaction only", (() => {
  const insert = expanded.shots.find((s) => s.visualSplitRole === "insert");
  const reaction = expanded.shots.find((s) => s.visualSplitRole === "reaction");
  const iLines = (insert?.narrative as { dialogue?: { lines?: unknown[] } })?.dialogue?.lines ?? [];
  const rLines = (reaction?.narrative as { dialogue?: { lines?: unknown[] } })?.dialogue?.lines ?? [];
  return iLines.length === 0 && rLines.length >= 1;
})());
const again = expandVisualBeats(expanded.shots, { meta: { pillarsVisBeatV2: "enforce" } });
ok("expand idempotent", again.expandedCount === 0 && again.shots.length === expanded.shots.length);

const weaponParent = {
  ...parent,
  clientId: "w1",
  weaponId: "five_cut_reveal",
  visualBeatTags: ["reveal"],
};
const reg = runShotExpanders([weaponParent], { meta: { pillarsVisBeatV2: "enforce" } });
ok(
  "weapon supersedes or expands without double-visual-on-parent",
  reg.log.some((l) => l.expanderId === "weapon") &&
    !reg.shots.some((s) => s.clientId === "w1" && s.visualSplitRole),
);

const capped = expandVisualBeats(
  Array.from({ length: 3 }, (_, i) => ({ ...parent, clientId: `c${i}`, shotIndex: i + 1 })),
  { meta: { pillarsVisBeatV2: "enforce" }, maxExpand: 1 },
);
ok("expand budget cap", capped.expandedCount === 1 && capped.log.includes("expand_budget_cap"));

const rhythm = auditRhythmBudget([
  { shotSize: "特写" },
  { shotSize: "特写" },
  { shotSize: "特写" },
  { shotSize: "特写" },
]);
ok("rhythm streak warn", rhythm.includes("RHYTHM-CU-STREAK"));

// —— P2 override / migrate / forward ——
const over = setVisBeatOverrideOnShot(parent, { reason: "oner_artistic", at: "t0" });
const noExpand = expandVisualBeats([over], { meta: { pillarsVisBeatV2: "enforce" } });
ok("override skips expand", noExpand.expandedCount === 0);
const migrated = migrateShotVisualBeatTags(
  { suggestedVisualBeatTags: ["reveal"], visualDescription: "刃" },
  { confirmSuggested: true },
);
ok("migrate confirm", Array.isArray(migrated.visualBeatTags) && (migrated.visualBeatTags as string[]).includes("reveal"));
const re = planForwardReentry([
  { clientId: "a", stillQuality: "hq_ok", filePath: "/x.png" },
  { clientId: "b" },
]);
ok("forward reentry keep hq", re.keepMediaClientIds.includes("a") && re.staleClientIds.includes("b"));

// —— P3 scorecard ——
const adaptFail = scoreAdaptationDesign({ visBeatOk: false, hasOpeningHook: true, hasPeakLedger: true, hasShotIntent: true });
ok("adapt vis_beat fail dim", adaptFail.failDims.includes("vis_beat"));
const svq = scoreShortVideo({ flags: { visBeatOk: false } });
ok("burn scorecard vis_beat", svq.failDims.some((d) => d.id === "vis_beat"));

const recipe = JSON.parse(readFileSync(join(process.cwd(), "data/fixtures/still_recipe_policy.json"), "utf8"));
ok("recipe has EN sweep", (recipe.egressForbiddenPatterns as { id: string }[]).some((p) => p.id === "en_soft_ref"));
ok("ecu pattern has cu", String(recipe.continuity?.ecuShotSizePattern ?? "").includes("cu"));

// —— P4 reverse / burn ——
ok("burn map DEX-VIS-SPLIT", BLOCK_TO_TRIGGER_FOR_TEST["DEX-VIS-SPLIT"] === "visual_multi_beat");
ok("burn map VIS-MULTI", BLOCK_TO_TRIGGER_FOR_TEST["VIS-MULTI-BEAT"] === "visual_multi_beat");
const qd = decideVideoQuality({
  shot: {
    shotIndex: 1,
    visualBeatTags: ["reveal"],
    shotSize: "特写",
    visualDescription: "露出匕首",
    narrative: { shotSize: "特写", dialogue: { lines: [] } },
  } as never,
  visBeatMeta: { pillarsVisBeatV2: "enforce" },
});
ok("qualityDecision VIS-MULTI", qd.burnAllowed === false && qd.envelope.triggers?.includes("visual_multi_beat"));

resetReverseLoopForTests();
ok("reverse loop allow 1", checkReverseLoop("visual_multi_beat", "k").allow);
checkReverseLoop("visual_multi_beat", "k");
checkReverseLoop("visual_multi_beat", "k");
ok("reverse loop cap", checkReverseLoop("visual_multi_beat", "k").allow === false);

const routes = JSON.parse(readFileSync(join(process.cwd(), "data/fixtures/reverse_route_table.json"), "utf8"));
ok(
  "reverse routes",
  (routes.routes as { trigger: string }[]).some((r) => r.trigger === "visual_multi_beat") &&
    (routes.routes as { trigger: string }[]).some((r) => r.trigger === "visual_tag_missing"),
);

// —— P5 ——
const ex = exemplarSuggestTags("露出匕首浅笑");
ok("exemplar suggest", ex.suggestedTags.includes("reveal") || ex.suggestedTags.includes("reaction"));
ok("arc warn", auditCrossSceneArc([{ visualBeatTags: ["reveal"] }]).includes("VIS-ARC-NO-PAYOFF"));
ok("slo", visBeatSloSnapshot({ taggedShotCount: 8, totalShots: 10 }).ok);
ok("min-shot propose only", proposeMinShotPlan(5, 2).note.includes("propose_only"));
const panel = buildVisBeatDryRunPanel([parent], { pillarsVisBeatV2: "enforce" });
ok("dryRun panel", panel[0]?.action === "must_split");

const golden = JSON.parse(
  readFileSync(join(process.cwd(), "data/fixtures/golden/visbeat-untitled-1-reveal-cu.json"), "utf8"),
);
ok("untitled golden shape", golden.expect?.mustSplit === true && golden.shot?.visualBeatTags?.includes("reveal"));
const gEv = evaluateVisBeatConflict({
  ...golden.shot,
  meta: { pillarsVisBeatV2: "enforce" },
});
ok("untitled golden enforce", gEv.action === "must_split" && gEv.ok === false);

ok("canary soft-fall", resolveVisBeatMode({ pillarsVisBeatV2: "enforce", pillarsVisBeatCanaryPercent: 0, projectId: 1 }) === "shadow");
ok("default mode", resolveVisBeatMode({}) === "shadow" || resolveVisBeatMode({}) === "off");

assert.ok(true);
console.log("\nVisBeat loop (P0–P5) passed.");
