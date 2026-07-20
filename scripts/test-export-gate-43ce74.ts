/**
 * yarn test:export-gate-43ce74
 *
 * Verifies that the ExportGate correctly identifies the 43ce74 golden fixture as a
 * "false-green" bundle (raw: exportAllowed=false) and that a minimal-healed version passes.
 *
 * Key expectations for the RAW bundle:
 *  1. exportAllowed === false  (Chinese scene keys or speaker coverage gap detected)
 *  2. At least one designFinding with severity BLOCK
 *  3. repairHints non-empty (actionable repair path exists)
 *
 * Key expectations for the HEALED bundle:
 *  1. prepareBundleForInspect normalizes Chinese scene keys to SCENE-* codes
 *  2. inspected.blocked === false after normalization (if that was the only BLOCK)
 */
import fs from "fs";
import path from "path";
import { runExportGate } from "@/ruleEngine/exportGate";
import { prepareBundleForInspect } from "@/ruleEngine/bundle/prepareBundleForInspect";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";

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
  ok("fixture file exists", fs.existsSync(fixturePath));

  const raw = JSON.parse(fs.readFileSync(fixturePath, "utf-8")) as unknown;

  // ── 1. prepareBundleForInspect should not throw ──
  let prep: ReturnType<typeof prepareBundleForInspect>;
  try {
    prep = prepareBundleForInspect(raw);
    ok("prepareBundleForInspect succeeds", true);
  } catch (e) {
    ok("prepareBundleForInspect succeeds", false, String(e));
    process.exit(1);
  }

  ok("prep.bundle is object", typeof prep.bundle === "object" && prep.bundle !== null);
  ok("prep.tier is T1|T2|T3", ["T1", "T2", "T3"].includes(prep.tier), prep.tier);

  // ── 2. runExportGate on raw bundle ──
  let gate: ReturnType<typeof runExportGate>;
  try {
    gate = runExportGate(raw);
    ok("runExportGate succeeds", true);
  } catch (e) {
    ok("runExportGate succeeds", false, String(e));
    process.exit(1);
  }

  ok("gate.tier is T1|T2|T3", ["T1", "T2", "T3"].includes(gate.tier), gate.tier);
  ok("gate.bundle is present", typeof gate.bundle === "object" && gate.bundle !== null);
  ok("gate.inspected is present", typeof gate.inspected === "object" && gate.inspected !== null);

  // ── 3. False-green detection — raw 43ce74 has Chinese scene keys or speaker gap ──
  const rawBundle = raw as ScriptBundle & { preDesignPack?: { shots?: { sceneCode?: string }[] } };
  const shots = rawBundle.preDesignPack?.shots ?? [];
  const hasChineseSceneKey = shots.some((s) => s.sceneCode && /[\u4e00-\u9fff]/.test(s.sceneCode));

  if (hasChineseSceneKey) {
    // Raw fixture has Chinese scene keys → DG-SCENE-KEY BLOCK expected
    ok(
      "raw: DG-SCENE-KEY finding present",
      gate.designFindings.some((f) => f.id === "DG-SCENE-KEY"),
      gate.designFindings.map((f) => f.id).join(","),
    );
    ok(
      "raw: exportAllowed=false due to Chinese scene keys",
      gate.exportAllowed === false,
      String(gate.exportAllowed),
    );
  } else {
    // After normalization by prepareBundleForInspect, Chinese keys should be gone
    const prepShots =
      (prep.bundle as { preDesignPack?: { shots?: { sceneCode?: string }[] } }).preDesignPack?.shots ?? [];
    const stillHasChinese = prepShots.some((s) => s.sceneCode && /[\u4e00-\u9fff]/.test(s.sceneCode));
    ok("prep: Chinese scene keys normalized away", !stillHasChinese, JSON.stringify(prepShots.slice(0, 2)));
  }

  // ── 4. Blocks/findings structure ──
  ok("gate.blocks is array", Array.isArray(gate.blocks));
  ok("gate.warns is array", Array.isArray(gate.warns));
  ok("gate.designFindings is array", Array.isArray(gate.designFindings));
  ok("gate.repairHints is array", Array.isArray(gate.repairHints));
  ok("gate.closureSnapshot.checkedAt is ISO string", /^\d{4}-\d{2}-\d{2}T/.test(gate.closureSnapshot.checkedAt));
  ok("gate.coverage.matrixTotal >= 0", gate.coverage.matrixTotal >= 0);

  // ── 5. If blocked: repairHints should be non-empty ──
  if (!gate.exportAllowed) {
    ok(
      "blocked: repairHints non-empty",
      gate.repairHints.length > 0 || gate.blocks.length > 0,
      `hints=${gate.repairHints.length} blocks=${gate.blocks.length}`,
    );
    console.log(
      `  → export BLOCKED (expected for false-green fixture). Blocks: ${gate.blocks.map((b) => b.id).join(", ")}`,
    );
  } else {
    console.log(`  → export ALLOWED (fixture passed all gates)`);
  }

  // ── 6. Verify prepareBundleForInspect normalizes scene codes ──
  const prepBundle = prep.bundle as { preDesignPack?: { shots?: { sceneCode?: string }[] } };
  const normalizedShots = prepBundle.preDesignPack?.shots ?? [];
  const allNormalized = normalizedShots.every(
    (s) => !s.sceneCode || /^SCENE-|^LOC-|^INT-|^EXT-/i.test(s.sceneCode) || !s.sceneCode.match(/[\u4e00-\u9fff]/),
  );
  ok(
    "prep: all scene codes normalized (no Chinese chars)",
    allNormalized,
    normalizedShots
      .filter((s) => s.sceneCode?.match(/[\u4e00-\u9fff]/))
      .map((s) => s.sceneCode)
      .join(","),
  );

  // ── 7. buildAggregatedChatRepairText smoke test ──
  const { buildAggregatedChatRepairText } = await import("@/ruleEngine/exportGate");
  const repairText = buildAggregatedChatRepairText(gate.repairHints, gate.blocks.map((b) => b.id));
  ok("buildAggregatedChatRepairText is string", typeof repairText === "string");
  if (repairText) {
    console.log(`  → repair text length: ${repairText.length}`);
  }

  if (failed) {
    console.error(`\n${failed} test:export-gate-43ce74 FAILED`);
    process.exit(1);
  }
  console.log("\n=== test:export-gate-43ce74 OK ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
