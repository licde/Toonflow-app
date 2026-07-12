/**
 * stage_graph.yaml ↔ extract stages sync
 * yarn audit:stage-graph-sync
 */
import fs from "fs";
import path from "path";

function loadYamlStages(): string[] {
  const p = path.join(process.cwd(), "data/rule-packs/stage_graph.yaml");
  const yaml = fs.readFileSync(p, "utf-8");
  return yaml.split("\n").map((l) => l.match(/^\s+- id:\s*(\S+)/)?.[1]).filter(Boolean) as string[];
}

function main() {
  const unified = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/fixtures/rule_flow_unified.json"), "utf-8"));
  const yamlIds = new Set(loadYamlStages());
  const jsonIds = new Set((unified.stages ?? []).map((s: { stageId: string }) => s.stageId).filter((id: string) => id !== "validate"));

  let missing = 0;
  for (const id of yamlIds) {
    if (!jsonIds.has(id)) {
      console.log(`YAML stage ${id} missing in rule_flow_unified`);
      missing++;
    }
  }
  if (missing) process.exit(1);
  console.log("=== stage graph sync OK ===");
}

main();
