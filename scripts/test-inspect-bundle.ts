/**
 * Verify inspectBundle aligns with unified-closure-golden expectations
 * yarn test:inspect-bundle
 */
import fs from "fs";
import path from "path";
import { inspectBundle } from "@/ruleEngine/portable/inspectBundle";
import { scriptBundleSchema, stripCommentFields } from "@/ruleEngine/bundle/schema";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";
import { getRulePackVersion } from "@/ruleEngine/ruleRegistry";
import { buildForwardTrace } from "@/ruleEngine/design/forwardTrace";
import { bidirectionalCoverageOk } from "@/ruleEngine/design/bidirectionalTrace";

function loadGolden(name: string): ScriptBundle {
  const p = path.join(process.cwd(), "data/fixtures/golden", name);
  return scriptBundleSchema.parse(stripCommentFields(JSON.parse(fs.readFileSync(p, "utf-8")))) as ScriptBundle;
}

async function main() {
  let failed = 0;
  const v2Path = path.join(process.cwd(), "data/fixtures/script-bundle-template-v2.json");
  const bundle = scriptBundleSchema.parse(stripCommentFields(JSON.parse(fs.readFileSync(v2Path, "utf-8")))) as ScriptBundle;

  const result = inspectBundle(bundle, { tier: "T3" });
  const chatOk = !(result.chatPromptGaps?.some((g) => g.severity === "BLOCK"));
  console.log(`${chatOk ? "✓" : "✗"} chatPromptGaps T3 no BLOCK`);
  if (!chatOk) failed++;

  const ft = buildForwardTrace(bundle, "T1");
  console.log(`${((result.forwardTrace as { traces?: unknown[] })?.traces?.length ?? 0) >= ft.traces.length ? "✓" : "✗"} forwardTrace count`);
  if (((result.forwardTrace as { traces?: unknown[] })?.traces?.length ?? 0) < ft.traces.length) failed++;

  console.log(`${(result.reverseHints?.length ?? 0) >= ft.traces.length ? "✓" : "✗"} reverseHints coverage`);
  if ((result.reverseHints?.length ?? 0) < ft.traces.length) failed++;

  console.log(`${getRulePackVersion() === result.rulePackVersion ? "✓" : "✗"} rulePackVersion ${result.rulePackVersion}`);
  if (getRulePackVersion() !== result.rulePackVersion) failed++;

  console.log(`${result.rePushPlan?.length ? "✓" : "✗"} rePushPlan present`);
  if (!result.rePushPlan?.length) failed++;

  const enriched = { ...bundle, forwardTrace: result.forwardTrace };
  console.log(`${bidirectionalCoverageOk(enriched) ? "✓" : "✗"} bidirectional coverage via inspectBundle`);
  if (!bidirectionalCoverageOk(enriched)) failed++;

  const gapFields = [
    "adaptationGaps",
    "retentionGaps",
    "narrativeDriveGaps",
    "packagingGaps",
    "generationApplyGaps",
    "designSpecGaps",
    "scriptViralGaps",
    "modalityGaps",
  ] as const;
  for (const field of gapFields) {
    const gaps = result[field as keyof typeof result];
    const ok = Array.isArray(gaps);
    console.log(`${ok ? "✓" : "✗"} ${field} present (${ok ? (gaps as unknown[]).length : 0} items)`);
    if (!ok) failed++;
  }
  console.log(`${result.smartDetection ? "✓" : "✗"} smartDetection present`);
  if (!result.smartDetection) failed++;

  const cr = result.closureReport;
  console.log(`${cr && Array.isArray(cr.missing) && Array.isArray(cr.optimize) ? "✓" : "✗"} closureReport missing/optimize`);
  if (!cr || !Array.isArray(cr.missing) || !Array.isArray(cr.optimize)) failed++;

  const goldens: [string, boolean][] = [
    ["dialogue-break-block.json", true],
    ["w93-unconfirmed-block.json", true],
    ["missing-emotion-target.json", false],
    ["missing-audio-prompt.json", false],
  ];
  for (const [file, expectBlock] of goldens) {
    const bad = loadGolden(file);
    const inspected = inspectBundle(bad, { tier: file.includes("missing-") ? "T3" : "T1" });
    if (file === "missing-emotion-target.json") {
      const hasNar = (inspected.narrativeDriveGaps?.length ?? 0) > 0;
      console.log(`${hasNar ? "✓" : "✗"} golden ${file} narrativeDriveGaps`);
      if (!hasNar) failed++;
      continue;
    }
    if (file === "missing-audio-prompt.json") {
      const hasMod = (inspected.modalityGaps?.length ?? 0) > 0 || (inspected.closureReport?.missing?.some((g) => g.id === "MOD-03") ?? false);
      console.log(`${hasMod ? "✓" : "✗"} golden ${file} MOD/audio gap`);
      if (!hasMod) failed++;
      continue;
    }
    console.log(`${inspected.blocked === expectBlock ? "✓" : "✗"} golden ${file}`);
    if (inspected.blocked !== expectBlock) failed++;
  }

  if (failed) {
    console.error(`\n${failed} inspect-bundle tests failed`);
    process.exit(1);
  }
  console.log("\n=== inspect-bundle OK ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
