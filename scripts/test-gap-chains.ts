/**
 * Verify 11-chain forward + reverse coverage on official template (T3)
 * yarn test:gap-chains
 */
import fs from "fs";
import path from "path";
import { inspectBundle } from "@/ruleEngine/portable/inspectBundle";
import { scriptBundleSchema, stripCommentFields } from "@/ruleEngine/bundle/schema";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";

const REQUIRED = [
  "dialogue", "asset", "continuity", "av", "story", "scene", "camera",
  "adaptation", "modality_compile", "generation", "repair",
];

function main() {
  const p = path.join(process.cwd(), "data/fixtures/script-bundle-template-v2.json");
  const bundle = scriptBundleSchema.parse(stripCommentFields(JSON.parse(fs.readFileSync(p, "utf-8")))) as ScriptBundle;
  const result = inspectBundle(bundle, { tier: "T3" });

  const traces = (result.forwardTrace as { traces?: { chainId: string }[] })?.traces ?? [];
  const fwd = new Set(traces.map((t) => t.chainId));
  const rev = new Set((result.reverseHints ?? []).map((h) => h.chainId));

  let failed = 0;
  for (const chain of REQUIRED) {
    const f = fwd.has(chain);
    const r = rev.has(chain);
    if (!f || !r) {
      console.error(`✗ chain ${chain}: forward=${f} reverse=${r}`);
      failed++;
    } else {
      console.log(`✓ chain ${chain}`);
    }
  }

  if (failed) {
    console.error(`\n${failed} chain gaps`);
    process.exit(1);
  }
  console.log("\n=== gap chains OK (11/11) ===");
}

main();
