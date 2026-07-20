#!/usr/bin/env node
/**
 * Sync portable-kit subset for standalone rule closure development.
 * Usage: node scripts/sync-portable-kit.mjs [--tier T1|T3] [--out portable-kit]
 */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const args = process.argv.slice(2);
const tier = args.includes("--tier") ? args[args.indexOf("--tier") + 1] ?? "T1" : "T1";
const outDir = args.includes("--out") ? args[args.indexOf("--out") + 1] : "portable-kit";

const RULE_ENGINE_DIRS = [
  "portable",
  "closure",
  "bundle",
  "design",
  "utils",
  "validators",
  "parsers",
  "compilers",
  "transform",
  "vendor-packs",
];

const RULE_ENGINE_FILES = ["ruleRegistry.ts"];

const EXCLUDE_FILES = new Set([
  "bundle/importAdapter.ts",
  "bundle/autoDesign.ts",
  "facade.ts",
]);

const FIXTURES_ALL = [
  "chain_trigger_map.json",
  "linkage_chains.json",
  "unified_closure_matrix.json",
  "multi_end_closure_matrix.json",
  "design_closure_checklist.json",
  "production_closure_checklist.json",
  "generation_closure_checklist.json",
  "intelligent_closure_checklist.json",
  "reverse_route_table.json",
  "repair_hint_catalog.json",
  "script-bundle-template-v2.json",
  "forward_trace.schema.json",
  "bidirectional_trace.schema.json",
  "golden/dialogue-break-block.json",
  "golden/w93-unconfirmed-block.json",
  "adaptation_matrix_catalog.json",
  "adaptation_profiles.json",
  "narrative_drive_spec.json",
  "viral_video_spec.json",
];

const FIXTURES_T3_EXTRA = [
  "modality_touch_matrix.json",
  "modality_prompt_slots.json",
  "video_audio_policy.json",
  "agnes_vendor_gates.json",
];

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(srcDir, destDir, filter) {
  if (!fs.existsSync(srcDir)) return;
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);
    if (entry.isDirectory()) copyDir(src, dest, filter);
    else if (!filter || filter(src)) copyFile(src, dest);
  }
}

function main() {
  const kitRoot = path.join(ROOT, outDir);
  if (fs.existsSync(kitRoot)) fs.rmSync(kitRoot, { recursive: true, force: true });
  fs.mkdirSync(kitRoot, { recursive: true });

  const reSrc = path.join(ROOT, "src", "ruleEngine");
  const reDest = path.join(kitRoot, "src", "ruleEngine");
  for (const dir of RULE_ENGINE_DIRS) {
    copyDir(path.join(reSrc, dir), path.join(reDest, dir), (f) => {
      const rel = path.relative(reSrc, f).replace(/\\/g, "/");
      return !EXCLUDE_FILES.has(rel);
    });
  }
  for (const file of RULE_ENGINE_FILES) {
    const src = path.join(reSrc, file);
    if (fs.existsSync(src)) copyFile(src, path.join(reDest, file));
  }

  const fixtures = tier === "T3" ? [...FIXTURES_ALL, ...FIXTURES_T3_EXTRA] : FIXTURES_ALL;
  for (const f of fixtures) {
    const src = path.join(ROOT, "data", "fixtures", f);
    if (fs.existsSync(src)) copyFile(src, path.join(kitRoot, "data", "fixtures", f));
  }

  copyFile(path.join(ROOT, "scripts", "inspect-bundle-cli.ts"), path.join(kitRoot, "bin", "inspect.mjs"));
  copyFile(path.join(ROOT, "scripts", "test-inspect-bundle.ts"), path.join(kitRoot, "scripts", "test-inspect-bundle.ts"));

  const runJs = `#!/usr/bin/env node
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.FIXTURES_ROOT = path.join(__dirname, "data", "fixtures");
const golden = process.argv[2] ?? path.join(__dirname, "data/fixtures/script-bundle-template-v2.json");
const r = spawnSync("npx", ["tsx", path.join(__dirname, "scripts/test-inspect-bundle.ts")], {
  stdio: "inherit",
  env: process.env,
  shell: true,
});
process.exit(r.status ?? 1);
`;
  fs.writeFileSync(path.join(kitRoot, "run.mjs"), runJs);

  const manifest = {
    version: "2.0.1",
    tier,
    syncedAt: new Date().toISOString(),
    modules: RULE_ENGINE_DIRS,
    fixtureCount: fixtures.length,
  };
  fs.writeFileSync(path.join(kitRoot, "manifest.json"), JSON.stringify(manifest, null, 2));

  let bytes = 0;
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else bytes += fs.statSync(p).size;
    }
  };
  walk(kitRoot);
  console.log(`Synced portable-kit (${tier}) → ${kitRoot} (~${Math.round(bytes / 1024)}KB)`);
}

main();
