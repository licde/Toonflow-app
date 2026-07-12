#!/usr/bin/env tsx
/**
 * Zero-Knex bundle closure inspector
 * yarn inspect:bundle [path-to-bundle.json] [--tier T1|T2|T3] [--gen-error "..."]
 */
import fs from "fs";
import path from "path";
import { inspectBundle } from "@/ruleEngine/portable/inspectBundle";

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  let file = path.join(process.cwd(), "data/fixtures/script-bundle-template-v2.json");
  let tier: "T1" | "T2" | "T3" | undefined;
  let genError: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--tier" && args[i + 1]) tier = args[++i] as "T1" | "T2" | "T3";
    else if (args[i] === "--gen-error" && args[i + 1]) genError = args[++i];
    else if (!args[i].startsWith("-")) file = path.resolve(args[i]);
  }
  return { file, tier, genError };
}

function main() {
  const { file, tier, genError } = parseArgs(process.argv);
  if (!fs.existsSync(file)) {
    console.error(`File not found: ${file}`);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(file, "utf-8"));
  const result = inspectBundle(raw, { tier, genError });
  console.log(JSON.stringify(result, null, 2));
  if (result.blocked) process.exit(2);
}

main();
