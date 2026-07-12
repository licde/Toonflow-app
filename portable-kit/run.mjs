#!/usr/bin/env node
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
