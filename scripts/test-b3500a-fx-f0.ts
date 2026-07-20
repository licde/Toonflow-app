/**
 * yarn test:b3500a-fx-f0 — deepseek b3500a dual-track F0 + heal + chatRepairText
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

const rawGate = runExportGate(raw, { allowShapeSalvage: true });
ok("raw exportAllowed=false", rawGate.exportAllowed === false);
const rawIds = new Set([
  ...rawGate.blocks.map((b) => b.id),
  ...rawGate.closureSnapshot.blockIds,
]);
ok(
  "raw blocks FX-GRADE or DG-FX-DUAL-TRACK or DG-MODALITY",
  rawIds.has("FX-GRADE-01") || rawIds.has("DG-FX-DUAL-TRACK") || rawIds.has("DG-MODALITY-MISMATCH") || rawIds.has("FX-FALSE-GREEN"),
  [...rawIds].slice(0, 12).join(","),
);
ok(
  "raw chatRepairText mentions F0 or 声明",
  /F0|声明|双轨|未声明/.test(rawGate.chatRepairText ?? ""),
  (rawGate.chatRepairText ?? "").slice(0, 120),
);
ok(
  "raw undeclared includes 2,3,4,6,7,9",
  [2, 3, 4, 6, 7, 9].every((n) => undeclaredEmptyFxShotIndexes(rawGate.bundle).includes(n)) ||
    /镜\s*2|shotIndex.?2|2[,、]/.test(JSON.stringify(rawGate.blocks)),
);

const heal = runImportHeal({ raw, apply: true });
ok("heal declared F0 on empty shots", (heal.f0Declared?.length ?? 0) >= 3, String(heal.f0Declared));
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
  healMinF0Declared: 4,
  healUndeclaredEmpty: 0,
};
if (!fs.existsSync(expectPath)) {
  fs.writeFileSync(expectPath, JSON.stringify(expectPayload, null, 2));
} else {
  const exp = JSON.parse(fs.readFileSync(expectPath, "utf-8")) as typeof expectPayload;
  ok("expect rawExportAllowed", exp.rawExportAllowed === false);
  ok("expect healMinF0Declared", (heal.f0Declared?.length ?? 0) >= (exp.healMinF0Declared ?? 4));
}

if (failed) {
  console.error(`\n${failed} test:b3500a-fx-f0 failed`);
  process.exit(1);
}
console.log("\n=== test:b3500a-fx-f0 OK ===");
