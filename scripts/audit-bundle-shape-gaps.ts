/**
 * Static audit: schema export-path risks vs Shape Registry coverage.
 * yarn audit:bundle-shape-gaps
 */
import fs from "fs";
import path from "path";
import { SHAPE_REGISTRY, getRegisteredShapeIds } from "@/ruleEngine/bundle/shapeRegistry";

/** Known export-path numeric fields that must have registry coerce or nullish/preprocess. */
const ACCEPTED_NUMERIC_PATHS = new Set([
  "shotIndex",
  "duration",
  "emotion",
  "emotionIntensity",
  "payoffEp",
  "beats",
  "episodeIndex",
  "projectId",
  "scriptId",
  "novelId",
]);

/** Union fields with object branch containing strict numbers — must have salvage registry. */
const ACCEPTED_UNION_SALVAGE = new Set(["B5", "infoLinkageChain"]);

function main() {
  const schemaPath = path.join(process.cwd(), "src/ruleEngine/bundle/schema.ts");
  const src = fs.readFileSync(schemaPath, "utf-8");
  const registered = new Set(getRegisteredShapeIds());
  const gaps: string[] = [];

  const contractPath = path.join(process.cwd(), "data/fixtures/export_shape_contract.json");
  const contract = JSON.parse(fs.readFileSync(contractPath, "utf-8")) as {
    fields?: { path: string; salvageRuleId: string }[];
  };

  for (const field of contract.fields ?? []) {
    if (!registered.has(field.salvageRuleId)) {
      gaps.push(`export_shape_contract ${field.path} references missing registry ${field.salvageRuleId}`);
    }
  }

  const shotStringRules = ["SH-VISUAL-EFFECT-OBJ", "SH-AUDIO-CUE-OBJ"];
  for (const id of shotStringRules) {
    if (!registered.has(id)) gaps.push(`missing required SB shot string registry: ${id}`);
  }

  const numOptional = [...src.matchAll(/(\w+):\s*z\.number\(\)\.optional\(\)/g)];
  const unregisteredNums = numOptional
    .map((m) => m[1]!)
    .filter((field) => !ACCEPTED_NUMERIC_PATHS.has(field));
  if (unregisteredNums.length > 0) {
    console.log(`INFO: z.number().optional fields (review if export-facing): ${unregisteredNums.join(", ")}`);
  }

  const strOptional = [...src.matchAll(/(\w+):\s*z\.string\(\)\.optional\(\)/g)];
  const nullishCount = (src.match(/nullishStr\(\)/g) ?? []).length;
  if (strOptional.length > nullishCount + 80) {
    gaps.push(`many z.string().optional (${strOptional.length}) vs nullishStr (${nullishCount}) — review export paths`);
  }

  for (const unionField of ACCEPTED_UNION_SALVAGE) {
    if (!registered.has("SH-B5-PAYOFF")) {
      gaps.push(`union field ${unionField} missing SH-B5-PAYOFF registry`);
    }
  }

  const requiredRegistry = [
    "SH-NULL",
    "SH-B5-PAYOFF",
    "SH-B12-BEATS",
    "SH-B4-NUM",
    "SH-GEN-NULL",
    "SH-META-NUM",
    "SH-VISUAL-EFFECT-OBJ",
    "SH-AUDIO-CUE-OBJ",
  ];
  for (const id of requiredRegistry) {
    if (!registered.has(id)) gaps.push(`missing required registry entry: ${id}`);
  }

  console.log("Shape Registry entries:", SHAPE_REGISTRY.length);
  for (const e of SHAPE_REGISTRY) {
    console.log(`  ${e.id}: ${e.description}`);
  }

  if (gaps.length) {
    console.error("\naudit:bundle-shape-gaps FAIL:");
    for (const g of gaps) gaps.length && console.error(" -", g);
    process.exit(1);
  }
  console.log("\naudit:bundle-shape-gaps PASS");
}

main();
