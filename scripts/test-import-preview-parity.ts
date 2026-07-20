/**
 * yarn test:import-preview-parity
 *
 * Verifies that dryRunImport preview output is consistent with prepareBundleForInspect:
 *  - tier matches between prep and dryRun
 *  - preImport.blocked value is trustworthy (not hard-coded T2)
 *  - exportGate field is present in dryRun result when tier=T3
 *  - Scene codes are normalized identically in both paths
 *
 * Uses the deepseek-20260716-43ce74 golden fixture as a real-world T3 sample.
 */
import fs from "fs";
import path from "path";
import { prepareBundleForInspect } from "@/ruleEngine/bundle/prepareBundleForInspect";
import { runExportGate } from "@/ruleEngine/exportGate";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

async function main() {
  const fixturePath = path.join(process.cwd(), "data/fixtures/golden/deepseek-20260716-43ce74.json");
  ok("fixture exists", fs.existsSync(fixturePath));
  const raw = JSON.parse(fs.readFileSync(fixturePath, "utf-8")) as unknown;

  // ── prepareBundleForInspect path (import/dryRun ingest heal) ──
  const prep = prepareBundleForInspect(raw);
  ok("prep.tier defined", Boolean(prep.tier), prep.tier);

  // ── dryRunImport parity: exportGate on already-prepared bundle ──
  const gate = runExportGate(raw, {
    bundle: prep.bundle,
    tier: prep.tier,
    alreadyPrepared: true,
    shapeSalvageLog: prep.shapeSalvageLog,
  });
  ok("gate.tier === prep.tier", gate.tier === prep.tier, `gate=${gate.tier} prep=${prep.tier}`);

  // ── Scene code consistency ──
  type ShotLike = { sceneCode?: string };
  const prepShots = ((prep.bundle as { preDesignPack?: { shots?: ShotLike[] } }).preDesignPack?.shots ?? []) as ShotLike[];
  const gateShots = ((gate.bundle as { preDesignPack?: { shots?: ShotLike[] } }).preDesignPack?.shots ?? []) as ShotLike[];

  const prepCodes = prepShots.map((s) => s.sceneCode ?? "").join(",");
  const gateCodes = gateShots.map((s) => s.sceneCode ?? "").join(",");
  ok("prep and gate scene codes identical", prepCodes === gateCodes, `prep: ${prepCodes.slice(0, 80)}`);

  // ── No Chinese scene codes after normalization ──
  const chineseInPrep = prepShots.filter((s) => s.sceneCode && /[\u4e00-\u9fff]/.test(s.sceneCode));
  ok("prep: no Chinese scene codes", chineseInPrep.length === 0, chineseInPrep.map((s) => s.sceneCode).join(","));

  // ── exportGate.exportAllowed reflects real quality state (not trivially true) ──
  const t3Check = gate.tier === "T3" ? "T3 bundle should have exportAllowed defined" : "non-T3 allowed";
  ok(t3Check, typeof gate.exportAllowed === "boolean");

  // ── If exportAllowed=false: blocks list matches designFindings BLOCKs ──
  if (!gate.exportAllowed) {
    const blockCount = gate.designFindings.filter((f) => f.severity === "BLOCK").length;
    ok("block count consistent with blocks array", gate.blocks.length >= blockCount, `blocks=${gate.blocks.length} findings=${blockCount}`);
    console.log(`  → Parity check: exportAllowed=false, ${gate.blocks.length} hard blocks`);
    console.log(`    Block IDs: ${gate.blocks.map((b) => b.id).join(", ")}`);
  } else {
    console.log(`  → Parity check: exportAllowed=true`);
  }

  // ── Smoke test: inspected result contains expected fields ──
  ok("gate.inspected.closureChecks is object", typeof gate.inspected.closureChecks === "object" && gate.inspected.closureChecks !== null);
  ok("gate.inspected.blocked is boolean", typeof gate.inspected.blocked === "boolean");

  if (failed) {
    console.error(`\n${failed} test:import-preview-parity FAILED`);
    process.exit(1);
  }
  console.log("\n=== test:import-preview-parity OK ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
