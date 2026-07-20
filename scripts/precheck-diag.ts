/**
 * yarn precheck:diag -- --fixture dialogue-break-block.json
 * yarn precheck:diag -- --fixture golden/precheck-loop-dc01-heal.json --apply
 */
import fs from "fs";
import path from "path";
import { runPrecheckLoop, createInMemoryPatchApplier } from "@/ruleEngine/precheckLoop";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const has = (name: string) => process.argv.includes(name);
const fixtureArg = arg("--fixture") ?? "golden/dialogue-break-block.json";
const apply = has("--apply");
const check = arg("--check") ?? "DC-01";

const p = path.isAbsolute(fixtureArg)
  ? fixtureArg
  : path.join(process.cwd(), "data/fixtures", fixtureArg);

if (!fs.existsSync(p)) {
  console.error(`fixture not found: ${p}`);
  process.exit(2);
}

const raw = JSON.parse(fs.readFileSync(p, "utf-8"));
const bundle = (raw.bundle ?? raw) as ScriptBundle;

const result = runPrecheckLoop(
  { bundle, checks: [check], apply },
  { applier: createInMemoryPatchApplier() },
);

console.log(
  JSON.stringify(
    {
      ok: result.ok,
      exhausted: result.exhausted,
      round: result.round,
      decision: result.decision,
      repairHint: result.repairHint,
      applied: result.applied,
      findings: result.findings.map((f) => ({
        id: f.id,
        passed: f.passed,
        severity: f.severity,
        message: f.message,
        fingerprint: f.fingerprint,
        evidence: f.evidence,
      })),
      patches: result.patches,
    },
    null,
    2,
  ),
);

process.exit(result.ok ? 0 : 1);
