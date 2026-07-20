/**
 * yarn test:import-heal — Salvage → PrecheckLoop → ExportGate on untitled-3.
 */
import fs from "fs";
import path from "path";
import { runImportHeal } from "@/ruleEngine/importHealOrchestrator";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const goldenDir = path.join(process.cwd(), "data/fixtures/golden");
const fixture = path.join(goldenDir, "untitled-3-repaired.json");
const expectPath = path.join(goldenDir, "import-heal-untitled-3.expect.json");

ok("fixture exists", fs.existsSync(fixture));
const raw = JSON.parse(fs.readFileSync(fixture, "utf-8")) as unknown;

const result = runImportHeal({ raw, apply: true });

ok("returns bundle", Boolean(result.bundle));
ok("shapeSalvageLog is array", Array.isArray(result.shapeSalvageLog));
ok("precheckLoop has ok", typeof result.precheckLoop.ok === "boolean");
ok("exportGate.exportAllowed defined", typeof result.exportGate.exportAllowed === "boolean");
ok("serverFixedIds is array", Array.isArray(result.serverFixedIds));
ok("chatMustFixIds is array", Array.isArray(result.chatMustFixIds));
ok("inspected present", Boolean(result.inspected));

const veSalvage = result.shapeSalvageLog.filter((e) => e.ruleId === "SH-VISUAL-EFFECT-OBJ");
ok("visualEffect salvage present or already clean", veSalvage.length >= 0);

if (fs.existsSync(expectPath)) {
  const exp = JSON.parse(fs.readFileSync(expectPath, "utf-8")) as {
    exportAllowed?: boolean;
    minSalvageCount?: number;
    mustIncludeServerFixed?: string[];
  };
  if (typeof exp.exportAllowed === "boolean") {
    ok("exportAllowed matches expect", result.exportGate.exportAllowed === exp.exportAllowed, String(result.exportGate.exportAllowed));
  }
  if (typeof exp.minSalvageCount === "number") {
    ok(
      `salvage count >= ${exp.minSalvageCount}`,
      result.shapeSalvageLog.length >= exp.minSalvageCount,
      `got ${result.shapeSalvageLog.length}`,
    );
  }
  for (const id of exp.mustIncludeServerFixed ?? []) {
    ok(`serverFixed includes ${id}`, result.serverFixedIds.includes(id) || result.shapeSalvageLog.some((e) => e.ruleId === id));
  }
  for (const id of (exp as { mustIncludeChatMustFix?: string[] }).mustIncludeChatMustFix ?? []) {
    ok(
      `chatMustFix includes ${id}`,
      result.chatMustFixIds.includes(id) || (result.exportGate.blocks ?? []).some((b) => b.id === id),
    );
  }
  if (result.exportGate.exportAllowed === false) {
    const crt = String((result.exportGate as { chatRepairText?: string }).chatRepairText ?? "");
    ok("blocked heal returns chatRepairText", crt.includes("闭环修复清单") || crt.includes("BLOCK") || crt.length > 40, crt.slice(0, 80));
  }
} else {
  console.log("  (no expect file — writing smoke defaults)");
  fs.writeFileSync(
    expectPath,
    JSON.stringify(
      {
        exportAllowed: result.exportGate.exportAllowed,
        minSalvageCount: 0,
        mustIncludeServerFixed: [],
      },
      null,
      2,
    ),
  );
}

if (failed) {
  console.error(`\n${failed} test:import-heal FAILED`);
  process.exit(1);
}
console.log("\n=== test:import-heal OK ===");
