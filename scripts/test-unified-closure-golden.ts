/**
 * G86-G115 unified closure golden
 * yarn test:unified-closure-golden
 */
import fs from "fs";
import path from "path";
import { buildForwardTrace } from "@/ruleEngine/design/forwardTrace";
import { bidirectionalCoverageOk, buildReverseHints } from "@/ruleEngine/design/bidirectionalTrace";
import { runUnifiedClosure } from "@/ruleEngine/design/unifiedDryRun";
import { runDesignClosureDryRun, designClosureBlocked } from "@/ruleEngine/bundle/designClosureDryRun";
import { runGenerationClosureDryRun } from "@/ruleEngine/bundle/generationClosureDryRun";
import { validateModalityDesignLinkage } from "@/ruleEngine/design/modalityDesignLinkage";
import { buildRePushPlan } from "@/ruleEngine/design/reverseRouteEngine";
import { hasUnconfirmedProposals } from "@/ruleEngine/design/smartProposalMerger";
import { scriptBundleSchema, stripCommentFields } from "@/ruleEngine/bundle/schema";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";
import { getRulePackVersion } from "@/ruleEngine/ruleRegistry";

function loadGolden(name: string): ScriptBundle {
  const p = path.join(process.cwd(), "data/fixtures/golden", name);
  return scriptBundleSchema.parse(stripCommentFields(JSON.parse(fs.readFileSync(p, "utf-8")))) as ScriptBundle;
}

async function main() {
  let failed = 0;
  const v2Path = path.join(process.cwd(), "data/fixtures/script-bundle-template-v2.json");
  const bundle = scriptBundleSchema.parse(stripCommentFields(JSON.parse(fs.readFileSync(v2Path, "utf-8")))) as ScriptBundle;
  const enriched = { ...bundle, forwardTrace: buildForwardTrace(bundle, "T1") as unknown as Record<string, unknown> };

  const ft = buildForwardTrace(bundle, "T1");
  console.log(`${ft.traces.length >= 5 ? "✓" : "✗"} G86 forwardTrace ≥5`);
  if (ft.traces.length < 5) failed++;

  const unified = runUnifiedClosure(enriched, { tier: "T1" });
  console.log(`${!unified.blocked ? "✓" : "✗"} G100 unified T1 not blocked`);
  if (unified.blocked) failed++;

  const rp = getRulePackVersion();
  console.log(`${rp === "2.0.1" ? "✓" : "✗"} G109 rulePack ${rp}`);
  if (rp !== "2.0.1") failed++;

  const rePush = buildRePushPlan(["dialogue_hash_mismatch"], ["script"]);
  console.log(`${rePush[0]?.preserveFields?.includes("script") ? "✓" : "✗"} G93 rePush preserveFields`);
  if (!rePush[0]?.preserveFields?.includes("script")) failed++;

  const hints = buildReverseHints(enriched, "T1");
  console.log(`${hints.length >= ft.traces.length ? "✓" : "✗"} G94 bidirectional reverseHints`);
  if (hints.length < ft.traces.length) failed++;

  const unconfirmed = hasUnconfirmedProposals([{ ruleId: "W93", trigger: "t", proposal: "p", targetStage: "W3", status: "pending_user_confirm" }]);
  console.log(`${unconfirmed ? "✓" : "✗"} G102 W93 unconfirmed blocks`);
  if (!unconfirmed) failed++;

  const matrix = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/fixtures/unified_closure_matrix.json"), "utf-8"));
  console.log(`${Object.keys(matrix.dimensions ?? {}).length >= 7 ? "✓" : "✗"} G99 unified matrix dimensions`);
  if (Object.keys(matrix.dimensions ?? {}).length < 7) failed++;

  const gc = runGenerationClosureDryRun({ error: "首位帧缺失请修 MD-VID", sfRound: 3, hasRePush: true });
  console.log(`${gc.every((c) => c.passed) ? "✓" : "✗"} G98 GC first-frame→MD`);
  if (!gc.every((c) => c.passed)) failed++;

  const modalityBad = {
    ...bundle,
    modalityPromptAudit: { items: [{ modality: "IMG", severity: "BLOCK" }] },
  } as ScriptBundle;
  const link = validateModalityDesignLinkage(modalityBad);
  console.log(`${!link.passed ? "✓" : "✗"} G97 modality linkage AUD missing`);
  if (link.passed) failed++;

  const goldens: [string, boolean][] = [
    ["dialogue-break-block.json", true],
    ["scene-break-block.json", true],
    ["story-marker-missing-block.json", true],
    ["w93-unconfirmed-block.json", true],
  ];
  for (const [file, expectBlock] of goldens) {
    const bad = loadGolden(file);
    const blocked = file.includes("w93")
      ? runUnifiedClosure(bad, { tier: "T1" }).blocked
      : designClosureBlocked(runDesignClosureDryRun(bad));
    console.log(`${blocked === expectBlock ? "✓" : "✗"} golden ${file}`);
    if (blocked !== expectBlock) failed++;
  }

  console.log(`${bidirectionalCoverageOk(enriched) ? "✓" : "✗"} IC-05 bidirectional coverage`);
  if (!bidirectionalCoverageOk(enriched)) failed++;

  if (failed) {
    console.error(`\n${failed} unified closure tests failed`);
    process.exit(1);
  }
  console.log("\n=== unified closure golden OK ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
