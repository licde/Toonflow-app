/**
 * E2E closure journey — inspect → dryRun summary → applyAutoFix path
 * yarn test:e2e-closure-journey
 */
import fs from "fs";
import path from "path";
import { inspectBundle } from "@/ruleEngine/portable/inspectBundle";
import { buildDryRunSummary } from "@/ruleEngine/bundle/importAdapter";
import { applyFixPlanToBundle } from "@/ruleEngine/design/fixPlanApplicator";
import { scriptBundleSchema, stripCommentFields } from "@/ruleEngine/bundle/schema";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";

async function main() {
  let failed = 0;
  const p = path.join(process.cwd(), "data/fixtures/script-bundle-template-v2.json");
  const bundle = scriptBundleSchema.parse(stripCommentFields(JSON.parse(fs.readFileSync(p, "utf-8")))) as ScriptBundle;

  const inspected = inspectBundle(bundle, { tier: "T1" });
  console.log(`${inspected.closureChecks ? "✓" : "✗"} step1 inspectBundle`);
  if (!inspected.closureChecks) failed++;

  const dry = buildDryRunSummary(bundle, { projectId: 0, validateOnly: true }, false);
  console.log(`${dry.closureChecks ? "✓" : "✗"} step2 buildDryRunSummary`);
  if (!dry.closureChecks) failed++;

  const fix = applyFixPlanToBundle(bundle, [{
    ruleId: "R2",
    tier: 0,
    severity: "BLOCK",
    fieldPath: "script",
    message: "test",
    rollbackLayer: "SB",
    autoFix: { confidence: 0.9, patch: { text: "x" } },
  }]);
  console.log(`${fix.applied.includes("R2") ? "✓" : "✗"} step3 applyFixPlan`);
  if (!fix.applied.includes("R2")) failed++;

  if (failed) {
    console.error(`\n${failed} e2e journey steps failed`);
    process.exit(1);
  }
  console.log("\n=== e2e closure journey OK ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
