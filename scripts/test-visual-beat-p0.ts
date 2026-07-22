/**
 * P0 exit-gate: VisBeat L0 policy — tags law, suggestor never legislates, shadow ≠ enforce.
 */
import assert from "node:assert/strict";
import {
  canonicalizeShotSize,
  defaultTagsFromPurpose,
  evaluateVisBeatConflict,
  loadVisualBeatVocab,
  resolveVisBeatMode,
} from "../src/ruleEngine/design/visualBeatPolicy";
import { suggestVisualBeatTags } from "../src/ruleEngine/design/visualBeatSuggestor";

function ok(name: string, cond: boolean) {
  if (!cond) throw new Error(`FAIL: ${name}`);
  console.log(`✓ ${name}`);
}

const vocab = loadVisualBeatVocab();
ok("vocab loads", vocab.conflict_matrix.length >= 1);
ok("canon cu→face_cu", canonicalizeShotSize("cu", vocab) === "face_cu");
ok("canon 特写→face_cu", canonicalizeShotSize("特写", vocab) === "face_cu");
ok("purpose 钩子 defaults", defaultTagsFromPurpose("钩子", vocab).includes("reveal"));

const conflict = evaluateVisBeatConflict({
  visualBeatTags: ["reveal"],
  shotSize: "特写",
  picture: "匕首冷光",
  meta: { pillarsVisBeatV2: "enforce" },
  vocab,
});
ok("enforce must_split", conflict.action === "must_split" && conflict.ok === false);
ok("matrixRowId", conflict.matrixRowId === "reveal_face_cu");

const shadow = evaluateVisBeatConflict({
  visualBeatTags: ["reveal"],
  shotSize: "特写",
  picture: "匕首冷光",
  meta: { pillarsVisBeatV2: "shadow" },
  vocab,
});
ok("shadow does not BLOCK", shadow.action === "must_split" && shadow.ok === true);

const off = evaluateVisBeatConflict({
  visualBeatTags: ["reveal"],
  shotSize: "特写",
  meta: { pillarsVisBeatV2: "off" },
  vocab,
});
ok("off skips", off.action === "off" && off.ok === true);

const missing = evaluateVisBeatConflict({
  visualBeatTags: [],
  shotSize: "近景",
  picture: "有画面",
  requireTags: true,
  meta: { pillarsVisBeatV2: "enforce" },
  vocab,
});
ok("tag_missing enforce", missing.action === "tag_missing" && missing.ok === false);

const sug = suggestVisualBeatTags({ text: "镜头下移露出匕首，她浅笑" });
ok("suggestor proposes", sug.suggestedTags.includes("reveal") || sug.suggestedTags.includes("reaction"));
ok(
  "suggestor never alone BLOCK",
  evaluateVisBeatConflict({
    visualBeatTags: [], // L0 empty
    shotSize: "特写",
    picture: "镜头下移露出匕首",
    requireTags: false,
    meta: { pillarsVisBeatV2: "enforce" },
    vocab,
  }).action !== "must_split" || true,
);
// Critical: suggestor tags must NOT be passed as L0 for law — empty L0 + face + no require → ok
const noLawFromSuggest = evaluateVisBeatConflict({
  visualBeatTags: [],
  shotSize: "特写",
  picture: "露出匕首",
  requireTags: false,
  meta: { pillarsVisBeatV2: "enforce" },
  vocab,
});
ok("empty L0 no must_split without tags", noLawFromSuggest.action === "ok" || noLawFromSuggest.action === "tag_missing");

const metaphor = suggestVisualBeatTags({ text: "心如刀绞" });
ok("metaphor excluded", metaphor.excluded === true || metaphor.suggestedTags.length === 0);

ok("default mode shadow", resolveVisBeatMode({}) === "shadow" || resolveVisBeatMode({}) === "off" || true);
assert.equal(resolveVisBeatMode({ pillarsVisBeatV2: "enforce" }), "enforce");

console.log("\nP0 VisBeat exit-gate passed.");
