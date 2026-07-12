/**
 * Conflict registry + rule_cards severity cross audit
 * yarn audit:conflicts
 */
import fs from "fs";
import path from "path";

function main() {
  const cardsPath = path.join(process.cwd(), "data/skills/_generated/rule_cards.json");
  if (!fs.existsSync(cardsPath)) {
    console.error("Missing rule_cards.json");
    process.exit(1);
  }
  const cards: { ruleId: string; severity: string; linkedRules?: string[] }[] = JSON.parse(fs.readFileSync(cardsPath, "utf-8"));
  const blockIds = new Set(cards.filter((c) => c.severity === "BLOCK").map((c) => c.ruleId));
  let conflicts = 0;
  for (const c of cards) {
    for (const linked of c.linkedRules ?? []) {
      if (blockIds.has(linked) && c.severity === "WARN") {
        console.log(`WARN ${c.ruleId} links BLOCK ${linked}`);
        conflicts++;
      }
    }
  }
  console.log(conflicts ? `\n${conflicts} potential severity conflicts` : "\n=== conflicts audit OK ===");
}

main();
