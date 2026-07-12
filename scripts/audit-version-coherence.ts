/**
 * Version coherence — manifest, registry, fixtures, multi_end
 * yarn audit:version-coherence
 */
import fs from "fs";
import path from "path";

const EXPECT = "2.0.1";

function readVer(file: string, key = "version"): string | undefined {
  if (!fs.existsSync(file)) return undefined;
  return JSON.parse(fs.readFileSync(file, "utf-8"))[key];
}

function main() {
  const root = process.cwd();
  const checks: [string, string | undefined][] = [
    ["rule-packs/manifest", readVer(path.join(root, "data/rule-packs/manifest.json"))],
    ["unified_closure_matrix", readVer(path.join(root, "data/fixtures/unified_closure_matrix.json"))],
    ["multi_end_closure_matrix", readVer(path.join(root, "data/fixtures/multi_end_closure_matrix.json"))],
    ["production_closure_checklist", readVer(path.join(root, "data/fixtures/production_closure_checklist.json"))],
  ];
  let failed = 0;
  for (const [name, v] of checks) {
    const ok = v === EXPECT;
    console.log(`${ok ? "✓" : "✗"} ${name}: ${v ?? "missing"}`);
    if (!ok) failed++;
  }
  if (failed) process.exit(1);
  console.log("\n=== version coherence OK ===");
}

main();
