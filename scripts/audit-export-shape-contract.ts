/**
 * Contract drift: skills must align with export_shape_contract.json (SB string fields, payoffEp).
 * yarn audit:export-shape-contract
 */
import fs from "fs";
import path from "path";
import { getRegisteredShapeIds } from "@/ruleEngine/bundle/shapeRegistry";

const SKILL_ROOT = path.join(process.cwd(), "data/skills/browser_chat");
const FILES = [
  "stages/design_brief.md",
  "stages/linkage_continuity.md",
  "stages/design_av.md",
  "stages/corridor_SB.md",
  "T3_quality_gate.md",
  "design_compliance_gate.md",
];

const BAD_PATTERNS = [
  /每条有 payoffEp 或/i,
  /payoffEp 或.*本集收/i,
  /"payoffEp"\s*:\s*"本集收"/,
];

const SB_STRING_SKILL_CHECKS: { rel: string; mustInclude: string[]; mustNotInclude?: RegExp[] }[] = [
  {
    rel: "stages/design_av.md",
    mustInclude: ["visualEffect", "string", "F1:"],
    mustNotInclude: [/"visualEffect"\s*:\s*\{\s*"level"/],
  },
  {
    rel: "corridor/corridor_SB.md",
    mustInclude: ["audioCue"],
  },
  {
    rel: "T3_quality_gate.md",
    mustInclude: ["EXPORT_SHAPE_RULES", "visualEffect", "string"],
  },
];

function main() {
  let failed = 0;
  const contractPath = path.join(process.cwd(), "data/fixtures/export_shape_contract.json");
  const contract = JSON.parse(fs.readFileSync(contractPath, "utf-8")) as {
    fields?: { salvageRuleId: string }[];
  };
  const registered = new Set(getRegisteredShapeIds());
  for (const f of contract.fields ?? []) {
    if (!registered.has(f.salvageRuleId)) {
      console.error(`CONTRACT: salvageRuleId ${f.salvageRuleId} not in shape registry`);
      failed++;
    }
  }

  for (const rel of FILES) {
    const p = path.join(SKILL_ROOT, rel);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, "utf-8");
    for (const re of BAD_PATTERNS) {
      if (re.test(text)) {
        console.error(`CONTRACT DRIFT: ${rel} matches ${re}`);
        failed++;
      }
    }
    if (!text.includes("payoffLabel") && (text.includes("B5") || text.includes("payoffEp"))) {
      console.warn(`WARN: ${rel} mentions B5/payoffEp but no payoffLabel guidance`);
    }
    if (rel.includes("T3") && !text.includes("EXPORT_SHAPE_RULES") && !text.includes("出口形状族")) {
      console.error(`MISSING: ${rel} lacks export shape rules section`);
      failed++;
    }
  }

  for (const check of SB_STRING_SKILL_CHECKS) {
    const p = path.join(SKILL_ROOT, check.rel);
    if (!fs.existsSync(p)) {
      console.error(`MISSING skill file: ${check.rel}`);
      failed++;
      continue;
    }
    const text = fs.readFileSync(p, "utf-8");
    for (const needle of check.mustInclude) {
      if (!text.includes(needle)) {
        console.error(`CONTRACT: ${check.rel} missing required text: ${needle}`);
        failed++;
      }
    }
    for (const re of check.mustNotInclude ?? []) {
      if (re.test(text)) {
        console.error(`CONTRACT DRIFT: ${check.rel} encourages object visualEffect`);
        failed++;
      }
    }
  }

  if (failed) {
    console.error(`\naudit:export-shape-contract FAIL (${failed})`);
    process.exit(1);
  }
  console.log("audit:export-shape-contract PASS");
}

main();
