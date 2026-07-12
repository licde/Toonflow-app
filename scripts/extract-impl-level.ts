/**
 * Populate rule-packs domain JSON with implLevel from rule_cards
 * yarn extract:impl-level
 */
import fs from "fs";
import path from "path";

interface RuleCard {
  ruleId: string;
  layer: string;
  implLevel: string;
}

const IMPL_MAP: Record<string, string> = {
  guideline: "L0",
  checklist: "L1",
  runtime: "L2",
  proven: "L3",
};

function main() {
  const cardsPath = path.join(process.cwd(), "data/skills/_generated/rule_cards.json");
  const manifestPath = path.join(process.cwd(), "data/rule-packs/manifest.json");
  if (!fs.existsSync(cardsPath)) {
    console.error("Missing rule_cards.json");
    process.exit(1);
  }
  const cards: RuleCard[] = JSON.parse(fs.readFileSync(cardsPath, "utf-8"));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

  const byLayer: Record<string, RuleCard[]> = {};
  for (const c of cards) {
    if (!byLayer[c.layer]) byLayer[c.layer] = [];
    byLayer[c.layer].push(c);
  }

  for (const [domain, spec] of Object.entries(manifest.sections) as [string, { file: string; layers: string[] }][]) {
    const rules = spec.layers.flatMap((l) => byLayer[l] ?? []).slice(0, 500).map((c) => ({
      ruleId: c.ruleId,
      implLevel: IMPL_MAP[c.implLevel] ?? manifest.defaultImplLevel ?? "L1",
      layer: c.layer,
    }));
    const out = { domain, version: manifest.version, rules };
    fs.writeFileSync(path.join(process.cwd(), "data/rule-packs", spec.file), JSON.stringify(out, null, 2));
    console.log(`Wrote ${spec.file}: ${rules.length} rules`);
  }
  manifest.implLevelStats = { totalCards: cards.length, domains: Object.keys(manifest.sections).length };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

main();
