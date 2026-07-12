/**
 * Layer coverage report — rule_cards by layer and implLevel
 * yarn audit:layer-coverage
 */
import fs from "fs";
import path from "path";

interface RuleCard {
  ruleId: string;
  layer: string;
  implLevel: string;
}

function main() {
  const cardsPath = path.join(process.cwd(), "data/skills/_generated/rule_cards.json");
  if (!fs.existsSync(cardsPath)) {
    console.error("Missing rule_cards.json");
    process.exit(1);
  }
  const cards: RuleCard[] = JSON.parse(fs.readFileSync(cardsPath, "utf-8"));
  const byLayer = new Map<string, Map<string, number>>();

  for (const c of cards) {
    if (!byLayer.has(c.layer)) byLayer.set(c.layer, new Map());
    const m = byLayer.get(c.layer)!;
    m.set(c.implLevel, (m.get(c.implLevel) ?? 0) + 1);
  }

  console.log("# Layer Coverage Report\n");
  console.log("| Layer | L0/guideline | L1/checklist | L2/runtime | L3/proven | Total |");
  console.log("|-------|--------------|--------------|------------|-----------|-------|");
  for (const [layer, levels] of [...byLayer.entries()].sort()) {
    const total = [...levels.values()].reduce((a, b) => a + b, 0);
    console.log(`| ${layer} | ${levels.get("guideline") ?? 0} | ${levels.get("checklist") ?? 0} | ${levels.get("runtime") ?? 0} | ${levels.get("proven") ?? 0} | ${total} |`);
  }
  console.log(`\nTotal rules: ${cards.length}`);
}

main();
