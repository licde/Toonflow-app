/**
 * yarn test:untitled-3-closure
 *
 * Golden: untitled-3-repaired.json must pass shape salvage → schema → normalize → exportGate.
 */
import fs from "fs";
import path from "path";
import assert from "assert";
import { prepareBundleWithLog, scriptBundleSchema } from "@/ruleEngine/bundle/schema";
import { prepareBundleForInspect } from "@/ruleEngine/bundle/prepareBundleForInspect";
import { runExportGate } from "@/ruleEngine/exportGate";
import { auditShapeResidualGaps } from "@/ruleEngine/bundle/shapeResidualAudit";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

function main() {
  const goldenDir = path.join(process.cwd(), "data/fixtures/golden");
  const fixturePath = path.join(goldenDir, "untitled-3-repaired.json");
  const expectPath = path.join(goldenDir, "untitled-3-repaired.expect.json");

  ok("fixture exists", fs.existsSync(fixturePath));
  ok("expect exists", fs.existsSync(expectPath));

  const raw = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
  const expect = JSON.parse(fs.readFileSync(expectPath, "utf-8"));

  const prep = prepareBundleWithLog(raw);
  const veSalvage = prep.shapeSalvageLog.filter((e) => e.ruleId === "SH-VISUAL-EFFECT-OBJ");
  ok(`SH-VISUAL-EFFECT-OBJ >= ${expect.minVisualEffectSalvageCount}`, veSalvage.length >= expect.minVisualEffectSalvageCount, String(veSalvage.length));

  const zod = scriptBundleSchema.safeParse(prep.bundle);
  ok("schema parse after salvage", zod.success, zod.success ? "" : JSON.stringify(zod.error.issues.slice(0, 3)));

  const shot0 = (prep.bundle.preDesignPack as { shots: { visualEffect?: string; fxLevel?: string }[] }).shots[0]!;
  ok("visualEffect is string after salvage", typeof shot0.visualEffect === "string");
  ok("fxLevel set from object salvage", shot0.fxLevel === "F1");

  const residual = auditShapeResidualGaps(prep.bundle as unknown as ScriptBundle);
  ok("no SHAPE-RESIDUAL-SHOT after salvage", !residual.some((g) => g.id === "SHAPE-RESIDUAL-SHOT"));

  const inspected = prepareBundleForInspect(raw);
  ok("prepareBundleForInspect tier", inspected.tier === expect.tier, inspected.tier);

  const gate = runExportGate(raw, {
    bundle: inspected.bundle,
    tier: inspected.tier,
    alreadyPrepared: true,
    shapeSalvageLog: inspected.shapeSalvageLog,
    allowShapeSalvage: true,
  });
  ok("exportAllowed (import path)", gate.exportAllowed === expect.exportAllowed, String(gate.exportAllowed));
  ok("shapeSalvageLog on exportGate", (gate.shapeSalvageLog?.length ?? 0) >= expect.minVisualEffectSalvageCount);

  if (expect.importOkNotExitPass === true) {
    const meta =
      ((inspected.bundle as { planData?: { meta?: { importOkNotExitPass?: boolean } }; meta?: { importOkNotExitPass?: boolean } })
        .planData?.meta ??
        (inspected.bundle as { meta?: { importOkNotExitPass?: boolean } }).meta ??
        {}) as { importOkNotExitPass?: boolean };
    const warnImport = gate.warns.some((w) => w.id === "IMPORT_OK_NOT_EXIT");
    ok(
      "importOkNotExitPass (F9 soft≠ExitPass)",
      Boolean(meta.importOkNotExitPass) || warnImport || gate.exportAllowed === false,
      `meta=${Boolean(meta.importOkNotExitPass)};warn=${warnImport}`,
    );
  }

  const chatGate = runExportGate(raw);
  ok("chat export blocks object visualEffect", chatGate.exportAllowed === false);
  ok("chat has DG-CHAT-SHAPE-VE", chatGate.blocks.some((b) => b.id === "DG-CHAT-SHAPE-VE"));

  const blockIds = [...new Set(gate.blocks.map((b) => b.id))];
  for (const id of expect.mustNotBlockIds as string[]) {
    ok(`must not block ${id}`, !blockIds.includes(id), blockIds.join(","));
  }

  if (failed) {
    console.error(`\ntest:untitled-3-closure FAIL (${failed})`);
    process.exit(1);
  }
  console.log("\ntest:untitled-3-closure PASS");
}

main();
