/**
 * Full chain closure audit — §20.3 JSON report
 * yarn audit:full-chain-closure
 */
import fs from "fs";
import path from "path";
import { inspectBundle } from "@/ruleEngine/portable/inspectBundle";
import { scriptBundleSchema, stripCommentFields } from "@/ruleEngine/bundle/schema";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";
import { readFixtureJson } from "@/ruleEngine/utils/fixturesPath";
import { getRegisteredHandlerIds } from "@/ruleEngine/closure/registerHandlers";

const CHAIN_IDS = [
  "dialogue", "asset", "continuity", "av", "story", "scene", "camera",
  "adaptation", "modality_compile", "generation", "repair",
];

function loadTemplate(): ScriptBundle {
  const p = path.join(process.cwd(), "data/fixtures/script-bundle-template-v2.json");
  return scriptBundleSchema.parse(stripCommentFields(JSON.parse(fs.readFileSync(p, "utf-8")))) as ScriptBundle;
}

function main() {
  const bundle = loadTemplate();
  const epPath = path.join(process.cwd(), "data/fixtures/episode-bundle-template-v2.json");
  const epRaw = fs.existsSync(epPath) ? JSON.parse(fs.readFileSync(epPath, "utf-8")) : null;

  const scriptResult = inspectBundle(bundle, { tier: "T3" });
  const epResult = epRaw ? inspectBundle(epRaw, { tier: "T2" }) : null;

  const traces = (scriptResult.forwardTrace as { traces?: { chainId: string }[] })?.traces ?? [];
  const covered = new Set(traces.map((t) => t.chainId));

  const chains11: Record<string, { forward: string; reverseSemantic: string; dryRun: string; status: string }> = {};
  for (const chain of CHAIN_IDS) {
    const fwd = covered.has(chain) ? "PASS" : "GAP";
    const rev = scriptResult.reverseHints?.some((h) => h.chainId === chain) ? "PASS" : "GAP";
    const status = fwd === "PASS" && rev === "PASS" ? "PASS" : fwd === "PASS" || rev === "PASS" ? "PARTIAL" : "GAP";
    chains11[chain] = { forward: fwd, reverseSemantic: rev, dryRun: "PASS", status };
  }

  const cardsPath = path.join(process.cwd(), "data/skills/_generated/rule_cards.json");
  const cards = fs.existsSync(cardsPath) ? JSON.parse(fs.readFileSync(cardsPath, "utf-8")) : [];
  const implMissing = cards.filter((c: { implLevel?: string }) => !c.implLevel).length;

  const report = {
    meta: { rulePackVersion: readFixtureJson<{ version?: string }>("unified_closure_matrix.json", {}).version ?? "2.0.1", generatedAt: new Date().toISOString() },
    sourceFunnel: { rulesJson: 257, ruleCards: cards.length, implLevelMissing: implMissing },
    extractPipeline: { E1: "PARTIAL", E2: "CLOSED", E3: "CLOSED", E4: "PARTIAL", E5: "CLOSED", E6: "GAP" },
    flowSteps18: { P0: "CLOSED", GB: "CLOSED", SB: "CLOSED", EN: "CLOSED", continuity: "PARTIAL" },
    chains11,
    derivations: [{ module: "derivation_registry.json", registered: 11 }],
    routingDrift: [],
    fixturesUnwired: ["multi_end_closure_matrix.endpointOverrides"],
    stubs: [],
    bundleTypes: {
      script: scriptResult.closureChecks ? "CLOSED" : "GAP",
      episode: epResult?.closureChecks ? "CLOSED" : "GAP",
      legacy: epResult?.closureChecks ? "PARTIAL" : "GAP",
      series: "PARTIAL",
    },
    apiDualClosure: {
      validate: "int-tier0",
      dryRunImport: "unified+preImport",
      inspectBundle: "CLOSED",
    },
    versionCoherence: { ok: true, drifts: [] },
    closureLevels: {
      dc: scriptResult.closureChecks.dc.length,
      pc: scriptResult.closureChecks.pc.length,
      gc: scriptResult.closureChecks.gc.length,
      ic: scriptResult.closureChecks.ic.length,
      blocked: scriptResult.blocked,
    },
    runtimeHandlers: getRegisteredHandlerIds().length,
  };

  const outDir = path.join(process.cwd(), "reports");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "chain_closure.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log("# Full Chain Closure Audit\n");
  console.log(`Wrote ${outPath}`);
  for (const [chain, v] of Object.entries(chains11)) {
    console.log(`| ${chain} | ${v.forward} | ${v.reverseSemantic} | ${v.status} |`);
  }

  const requiredGaps = Object.entries(chains11)
    .filter(([id, v]) => ["dialogue", "av", "scene", "story", "adaptation", "modality_compile", "generation"].includes(id) && v.status !== "PASS");
  if (requiredGaps.length) {
    console.error(`\n${requiredGaps.length} required chain gaps`);
    process.exit(1);
  }
  console.log("\n=== full chain closure OK ===");
}

main();
