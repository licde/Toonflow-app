/**
 * Bidirectional semantic audit — reverseTarget vs unified_closure_matrix
 * yarn audit:bidirectional-semantic
 */
import fs from "fs";
import path from "path";
import { inspectBundle } from "@/ruleEngine/portable/inspectBundle";
import { scriptBundleSchema, stripCommentFields } from "@/ruleEngine/bundle/schema";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";

function main() {
  const p = path.join(process.cwd(), "data/fixtures/script-bundle-template-v2.json");
  const bundle = scriptBundleSchema.parse(stripCommentFields(JSON.parse(fs.readFileSync(p, "utf-8")))) as ScriptBundle;
  const matrix = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/fixtures/unified_closure_matrix.json"), "utf-8"));
  const result = inspectBundle(bundle, { tier: "T3" });

  let failed = 0;
  for (const hint of result.reverseHints ?? []) {
    const expected = matrix.chains?.[hint.chainId]?.rePushTarget;
    if (!expected) continue;
    const ok = hint.reverseTarget === expected;
    console.log(`${ok ? "✓" : "✗"} ${hint.chainId}: ${hint.reverseTarget} (expected ${expected})`);
    if (!ok) failed++;
  }

  if (failed) {
    console.error(`\n${failed} semantic mismatches`);
    process.exit(1);
  }
  console.log("\n=== bidirectional semantic OK ===");
}

main();
