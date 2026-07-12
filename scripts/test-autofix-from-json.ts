/**
 * Verify fix_templates from autoFixLibrary drive applyAutoFix
 * yarn test:autofix-from-json
 */
import fs from "fs";
import path from "path";
import { applyAutoFix, getLoadedFixTemplateCount, routeFeedback } from "@/ruleEngine/validators/autoFix";

function main() {
  const templatesPath = path.join(process.cwd(), "data/skills/_generated/fix_templates.json");
  if (!fs.existsSync(templatesPath)) {
    console.error("Missing fix_templates.json — run yarn extract:rule-checklists");
    process.exit(1);
  }
  const templates = JSON.parse(fs.readFileSync(templatesPath, "utf-8")) as { ruleId: string; description?: string }[];
  if (templates.length < 20) {
    console.error(`Expected ≥20 fix_templates from autoFixLibrary, got ${templates.length}`);
    process.exit(1);
  }
  console.log(`✓ fix_templates count ${templates.length}`);

  const loaded = getLoadedFixTemplateCount();
  if (loaded < 20) {
    console.error(`loadFixTemplates returned ${loaded}`);
    process.exit(1);
  }
  console.log(`✓ loaded ${loaded} templates into AUTO_FIX/FEEDBACK_ROUTING`);

  const v25 = applyAutoFix([
    {
      ruleId: "V25",
      severity: "BLOCK",
      tier: 0,
      message: "microExpression missing",
      fieldPath: "microExpression",
      rollbackLayer: "SB",
      autoFix: { confidence: 0.9, patch: { hint: "add microExpression" } },
    },
  ]);
  if (!v25.applied.includes("V25")) {
    console.error("V25 autoFix not applied");
    process.exit(1);
  }
  console.log("✓ V25 from library applies via generic handler");

  if (routeFeedback("dialogue_hash_mismatch") !== "SB") {
    console.error("routeFeedback dialogue_hash_mismatch drift");
    process.exit(1);
  }
  console.log("✓ routeFeedback dialogue_hash_mismatch → SB");

  console.log("\n=== autofix-from-json OK ===");
}

main();
