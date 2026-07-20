/**
 * yarn test:chat-shape-export-gate — raw object visualEffect must BLOCK Chat export;
 * import path with allowShapeSalvage must not be blocked by DG-CHAT-SHAPE-VE.
 */
import fs from "fs";
import path from "path";
import { runExportGate } from "@/ruleEngine/exportGate";
import { prepareBundleForInspect } from "@/ruleEngine/bundle/prepareBundleForInspect";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const fixture = path.join(process.cwd(), "data/fixtures/golden/untitled-3-repaired.json");
ok("fixture exists", fs.existsSync(fixture));
const raw = JSON.parse(fs.readFileSync(fixture, "utf-8")) as unknown;

const chatGate = runExportGate(raw);
ok("chat exportBlocked", chatGate.exportAllowed === false, `allowed=${chatGate.exportAllowed}`);
ok(
  "DG-CHAT-SHAPE-VE present",
  chatGate.blocks.some((b) => b.id === "DG-CHAT-SHAPE-VE"),
  chatGate.blocks.map((b) => b.id).join(","),
);
ok("RH-MOD-01 in repairHints", (chatGate.repairHints ?? []).some((h) => h.id === "RH-MOD-01"));

const prep = prepareBundleForInspect(raw, { ingestHeal: true });
const importGate = runExportGate(raw, {
  bundle: prep.bundle,
  tier: prep.tier,
  alreadyPrepared: true,
  shapeSalvageLog: prep.shapeSalvageLog,
  allowShapeSalvage: true,
});
ok("import allowShapeSalvage not blocked by DG-CHAT-SHAPE-VE", !importGate.blocks.some((b) => b.id === "DG-CHAT-SHAPE-VE"));
ok(
  "salvage ran",
  (prep.shapeSalvageLog ?? []).some((e) => e.ruleId === "SH-VISUAL-EFFECT-OBJ"),
  JSON.stringify(prep.shapeSalvageLog?.slice(0, 3)),
);

if (failed) {
  console.error(`\n${failed} FAILED`);
  process.exit(1);
}
console.log("\n=== test:chat-shape-export-gate OK ===");
