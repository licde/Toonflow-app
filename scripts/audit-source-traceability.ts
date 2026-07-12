/**
 * Source traceability CSV — rule_cards + ClosureRegistry handlers
 * yarn audit:source-traceability
 */
import fs from "fs";
import path from "path";
import { getRegisteredHandlerIds } from "@/ruleEngine/closure/ClosureRegistry";
import { ensureClosureRegistry } from "@/ruleEngine/closure/registerHandlers";

interface RuleCard {
  ruleId: string;
  layer: string;
  stage: string;
  implLevel: string;
  severity: string;
}

function main() {
  ensureClosureRegistry();
  const cardsPath = path.join(process.cwd(), "data/skills/_generated/rule_cards.json");
  if (!fs.existsSync(cardsPath)) {
    console.error("Missing rule_cards.json — run yarn extract:rule-checklists");
    process.exit(1);
  }
  const cards: RuleCard[] = JSON.parse(fs.readFileSync(cardsPath, "utf-8"));
  const handlers = new Set(getRegisteredHandlerIds());
  const missingImpl = cards.filter((c) => !c.implLevel);

  const rows = ["ruleId,layer,stage,implLevel,severity,runtimeHandler,checklistId"];
  for (const c of cards) {
    const handler = [...handlers].find((h) => h.includes(c.ruleId)) ?? "";
    rows.push([c.ruleId, c.layer, c.stage, c.implLevel, c.severity, handler, ""].join(","));
  }

  const out = path.join(process.cwd(), "data/fixtures/source_traceability.csv");
  fs.writeFileSync(out, rows.join("\n"));
  console.log(`Wrote ${cards.length} rows → ${out}`);

  if (missingImpl.length) {
    console.error(`${missingImpl.length} rules missing implLevel`);
    process.exit(1);
  }
}

main();
