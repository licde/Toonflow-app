/**
 * yarn test:b3500a-fx-f0 — deepseek b3500a dual-track F0 + heal + chatRepairText
 *
 * Contract:
 * - Fixture / Chat(export, no salvage): undeclared empty-FX must BLOCK (FX-GRADE / DG-FX-DUAL-TRACK)
 * - Import(allowShapeSalvage): soft-declare F0 → undeclared cleared; WARN FX-F0-IMPORT (≠ Design ExitPass)
 * - Heal: declare F0 without inventing fxPrompt prose
 */
import fs from "fs";
import path from "path";
import { runExportGate } from "@/ruleEngine/exportGate";
import { runImportHeal } from "@/ruleEngine/importHealOrchestrator";
import { undeclaredEmptyFxShotIndexes } from "@/ruleEngine/bundle/designExportHelpers";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const goldenDir = path.join(process.cwd(), "data/fixtures/golden");
const fixturePath = path.join(goldenDir, "deepseek-20260718-b3500a.json");
const expectPath = path.join(goldenDir, "deepseek-20260718-b3500a.expect.json");

ok("fixture exists", fs.existsSync(fixturePath));
const raw = JSON.parse(fs.readFileSync(fixturePath, "utf-8")) as unknown;

const fixtureUndeclared = undeclaredEmptyFxShotIndexes(raw as never);
ok(
  "fixture undeclared includes 2,3,4,6,7,9",
  [2, 3, 4, 6, 7, 9].every((n) => fixtureUndeclared.includes(n)),
  JSON.stringify(fixtureUndeclared),
);

// Chat / Design Exit: no import soft-heal — must BLOCK on undeclared FX
const chatGate = runExportGate(raw, { allowShapeSalvage: false });
ok("chat exportAllowed=false", chatGate.exportAllowed === false);
const chatIds = new Set([
  ...chatGate.blocks.map((b) => b.id),
  ...chatGate.closureSnapshot.blockIds,
]);
ok(
  "chat blocks FX-GRADE or DG-FX-DUAL-TRACK or DG-MODALITY",
  chatIds.has("FX-GRADE-01") ||
    chatIds.has("DG-FX-DUAL-TRACK") ||
    chatIds.has("DG-MODALITY-MISMATCH") ||
    chatIds.has("FX-FALSE-GREEN"),
  [...chatIds].slice(0, 12).join(","),
);
ok(
  "chat undeclared nonempty",
  undeclaredEmptyFxShotIndexes(chatGate.bundle).length > 0,
  JSON.stringify(undeclaredEmptyFxShotIndexes(chatGate.bundle)),
);
ok(
  "chat chatRepairText mentions F0 or 声明 or FX",
  /F0|声明|双轨|未声明|FX|特效/.test(chatGate.chatRepairText ?? ""),
  (chatGate.chatRepairText ?? "").slice(0, 120),
);

// Import soft track: salvage may declare F0 (WARN ≠ ExitPass)
const importGate = runExportGate(JSON.parse(JSON.stringify(raw)), { allowShapeSalvage: true });
ok("import salvage exportAllowed=false (other debt remains)", importGate.exportAllowed === false);
ok(
  "import salvage clears undeclared via F0 heal",
  undeclaredEmptyFxShotIndexes(importGate.bundle).length === 0,
);
ok(
  "import surfaces FX-F0-IMPORT warn (soft, not ExitPass)",
  importGate.warns.some((w) => w.id === "FX-F0-IMPORT") ||
    (importGate.shapeSalvageLog ?? []).some((e) => /FX-F0|SH-FX-F0/.test(String(e.ruleId ?? ""))),
  importGate.warns
    .filter((w) => /F0|FX/.test(w.id))
    .map((w) => w.id)
    .slice(0, 5)
    .join(","),
);

const heal = runImportHeal({ raw, apply: true });
ok("heal declared F0 on empty shots", (heal.f0Declared?.length ?? 0) >= 2, String(heal.f0Declared));
const auditItems =
  (heal.bundle as { fxFeasibilityAudit?: { items?: { shotIndex?: number; level?: string }[] } }).fxFeasibilityAudit
    ?.items ?? [];
const f0Items = auditItems.filter((it) => String(it.level).toUpperCase() === "F0");
ok("fxFeasibilityAudit has F0 items", f0Items.length >= 3, `got ${f0Items.length}`);
ok("no undeclared empty after heal", undeclaredEmptyFxShotIndexes(heal.bundle).length === 0);

const f1Shots = (heal.bundle.preDesignPack?.shots ?? []).filter((s) => {
  const fx = String((s.generation as { fxPrompt?: string } | undefined)?.fxPrompt ?? "").trim();
  const ve = String((s as { visualEffect?: string }).visualEffect ?? "").trim();
  return (fx && !/^F[0-5]$/i.test(fx)) || Boolean(ve && !/^F0/i.test(ve));
});
ok(
  "F1 material shots keep prose fxPrompt",
  f1Shots.every((s) => {
    const fx = String((s.generation as { fxPrompt?: string } | undefined)?.fxPrompt ?? "").trim();
    return fx.length >= 4 && !/^F[0-5]$/i.test(fx);
  }),
);
ok(
  "heal does not invent fxPrompt on F0 shots",
  (heal.bundle.preDesignPack?.shots ?? [])
    .filter((s) => String((s as { fxFeasibility?: string }).fxFeasibility ?? "").toUpperCase() === "F0")
    .every((s) => {
      const fx = String((s.generation as { fxPrompt?: string } | undefined)?.fxPrompt ?? "").trim();
      return !fx;
    }),
);

const expectPayload = {
  rawExportAllowed: false,
  mustBlockIdsAny: ["FX-GRADE-01", "DG-FX-DUAL-TRACK", "DG-MODALITY-MISMATCH", "FX-FALSE-GREEN"],
  healMinF0Declared: 2,
  healUndeclaredEmpty: 0,
  note: "b3500a: Chat BLOCKs undeclared FX; import salvage soft-declares F0 (WARN); heal F0 count may shift after lip-split/autoClose",
};
if (!fs.existsSync(expectPath)) {
  fs.writeFileSync(expectPath, JSON.stringify(expectPayload, null, 2));
} else {
  const exp = JSON.parse(fs.readFileSync(expectPath, "utf-8")) as typeof expectPayload;
  ok("expect rawExportAllowed", exp.rawExportAllowed === false);
  ok("expect healMinF0Declared", (heal.f0Declared?.length ?? 0) >= (exp.healMinF0Declared ?? 2));
}

if (failed) {
  console.error(`\n${failed} test:b3500a-fx-f0 failed`);
  process.exit(1);
}
console.log("\n=== test:b3500a-fx-f0 OK ===");
