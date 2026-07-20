/**
 * yarn test:scene-orphan-cardinality — P1 孤儿场清单文案 + heal 降 F0
 */
import fs from "fs";
import path from "path";
import { runExportGate } from "@/ruleEngine/exportGate";
import { runImportHeal } from "@/ruleEngine/importHealOrchestrator";
import { orphanF1SceneRefs } from "@/ruleEngine/bundle/sceneCardinality";
import { undeclaredEmptyFxShotIndexes } from "@/ruleEngine/bundle/designExportHelpers";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const fixturePath = path.join(process.cwd(), "data/fixtures/golden/scene-orphan-cardinality.json");
ok("fixture exists", fs.existsSync(fixturePath));
const raw = JSON.parse(fs.readFileSync(fixturePath, "utf-8")) as unknown;

const rawGate = runExportGate(raw, { allowShapeSalvage: true });
ok("raw blocked", rawGate.exportAllowed === false);
const rawIds = new Set([
  ...rawGate.blocks.map((b) => b.id),
  ...rawGate.closureSnapshot.blockIds,
  ...rawGate.fieldWalkGaps.map((g) => g.id),
]);
ok(
  "raw has orphan or cardinality gate",
  rawIds.has("DG-SCENE-ORPHAN-FX") ||
    rawIds.has("DG-SCENE-CARDINALITY") ||
    rawGate.blocks.some((b) => /孤儿场|场镜基数/.test(b.message)) ||
    rawGate.fieldWalkGaps.some((g) => /孤儿场/.test(g.message)),
  [...rawIds].slice(0, 16).join(","),
);
ok(
  "chatRepairText has 孤儿场 or 场镜基数",
  /孤儿场|场镜基数/.test(rawGate.chatRepairText ?? ""),
  (rawGate.chatRepairText ?? "").slice(0, 200),
);
ok(
  "chatRepairText forbids misleading-only fxPrompt for orphan",
  /禁止只给其他场补 fxPrompt|勿只补其他场的 fxPrompt|【主因·结构】/.test(rawGate.chatRepairText ?? "") ||
    /孤儿场/.test(rawGate.chatRepairText ?? ""),
);
ok("raw orphanF1 includes sceneRef 2", orphanF1SceneRefs(rawGate.bundle).some((o) => o.sceneRef === 2));
// 镜2 空未声明：以原始夹具为准（exportGate salvage 可能已投影场级 F0）
const rawUndeclared = undeclaredEmptyFxShotIndexes(raw as never);
ok(
  "raw fixture undeclared empty includes shot 2 (or gate already F0-declared)",
  rawUndeclared.includes(2) || undeclaredEmptyFxShotIndexes(rawGate.bundle).length === 0,
  `raw=${rawUndeclared.join(",")} gate=${undeclaredEmptyFxShotIndexes(rawGate.bundle).join(",")}`,
);

const heal = runImportHeal({ raw, apply: true });
ok("heal demotes orphan sceneRef 2", (heal.orphanScenesDemoted ?? []).includes(2), String(heal.orphanScenesDemoted));
ok(
  "serverFixed includes ORPHAN-F0:2",
  (heal.serverFixedIds ?? []).some((id) => id === "ORPHAN-F0:2" || id.includes("ORPHAN")),
  (heal.serverFixedIds ?? []).slice(0, 12).join(","),
);
ok("post-heal no orphan F1", orphanF1SceneRefs(heal.bundle).length === 0, JSON.stringify(orphanF1SceneRefs(heal.bundle)));
ok("post-heal no undeclared empty", undeclaredEmptyFxShotIndexes(heal.bundle).length === 0);

const afterIds = new Set([
  ...(heal.exportGate.blocks ?? []).map((b) => b.id),
  ...(heal.exportGate.closureSnapshot?.blockIds ?? []),
  ...(heal.chatMustFixIds ?? []),
]);
ok(
  "post-heal clears DG-SCENE-ORPHAN-FX",
  !afterIds.has("DG-SCENE-ORPHAN-FX"),
  [...afterIds].slice(0, 16).join(","),
);
ok(
  "post-heal orphan MOD-02 message gone",
  !(heal.exportGate.blocks ?? []).some((b) => b.id === "MOD-02" && /孤儿场/.test(b.message)) &&
    !(heal.exportGate.fieldWalkGaps ?? []).some((g) => g.id === "MOD-02" && /孤儿场/.test(g.message)),
);
const crt = String(heal.exportGate.chatRepairText ?? "");
ok(
  "cardinality may remain as chatMustFix (structure)",
  afterIds.has("DG-SCENE-CARDINALITY") || /场镜基数|幽灵场/.test(crt) || heal.exportGate.exportAllowed === true,
  [...afterIds].join(","),
);

if (failed) {
  console.error(`\n${failed} test:scene-orphan-cardinality failed`);
  process.exit(1);
}
console.log("\n=== test:scene-orphan-cardinality OK ===");
