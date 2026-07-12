/**
 * 规则应用五维审计矩阵 + ClosureRegistry handler 交叉
 * yarn audit:rule-application
 */
import fs from "fs";
import path from "path";
import { ensureClosureRegistry, getRegisteredHandlerIds } from "@/ruleEngine/closure/registerHandlers";

const genDir = path.join(process.cwd(), "data", "skills", "_generated");
const outPath = path.join(process.cwd(), "data", "fixtures", "rule_application_matrix.json");

interface RuleCard {
  ruleId: string;
  layer: string;
  stage: string;
  implLevel: string;
  severity: string;
}

function main() {
  ensureClosureRegistry();
  const handlers = new Set(getRegisteredHandlerIds());
  const cardsPath = path.join(genDir, "rule_cards.json");
  if (!fs.existsSync(cardsPath)) {
    console.error("请先运行 yarn extract:rule-checklists");
    process.exit(1);
  }
  const cards: RuleCard[] = JSON.parse(fs.readFileSync(cardsPath, "utf-8"));
  const matrix = cards.map((c) => ({
    ruleId: c.ruleId,
    layer: c.layer,
    stage: c.stage,
    implLevel: c.implLevel,
    runtimeHandler: [...handlers].find((h) => h.includes(c.ruleId)) ?? null,
    dimensions: {
      spec: c.implLevel !== "guideline",
      link: ["B", "H"].includes(c.layer) || c.ruleId.startsWith("R"),
      sd: c.severity === "BLOCK",
      sf: c.severity === "BLOCK",
      trace: true,
    },
    browserTrack: ["P", "G", "W", "B"].includes(c.layer) ? "EXT L2" : "T2/T3",
    internalTrack: ["V", "H", "Y"].includes(c.layer) ? "INT validate" : "planned",
    wave: c.layer === "V" ? "INT-1" : "P0",
  }));
  fs.writeFileSync(outPath, JSON.stringify({ version: "2.0.1", rules: matrix }, null, 2));
  console.log(`Wrote ${matrix.length} rules (${matrix.filter((m) => m.runtimeHandler).length} with runtime handlers)`);
}

main();
