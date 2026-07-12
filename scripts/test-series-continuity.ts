/**
 * Series continuity audit golden
 * yarn test:series-continuity
 */
import fs from "fs";
import path from "path";
import { inspectBundle } from "@/ruleEngine/portable/inspectBundle";
import { scriptBundleSchema, stripCommentFields } from "@/ruleEngine/bundle/schema";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";

function main() {
  const p = path.join(process.cwd(), "data/fixtures/script-bundle-template-v2.json");
  const base = scriptBundleSchema.parse(stripCommentFields(JSON.parse(fs.readFileSync(p, "utf-8")))) as ScriptBundle;

  const r1 = inspectBundle(base, { tier: "T1" });
  const withCont: ScriptBundle = {
    ...base,
    continuity: { prevEpisodeSummary: "上集：主角发现线索", characterState: { hero: "警觉" } },
  };
  const r2 = inspectBundle(withCont, { tier: "T1" });

  const t1 = (r1.forwardTrace as { traces?: { chainId: string }[] })?.traces?.some((t) => t.chainId === "continuity");
  const t2 = (r2.forwardTrace as { traces?: { chainId: string }[] })?.traces?.some((t) => t.chainId === "continuity");

  console.log(`${!t1 ? "✓" : "✗"} ep1 no continuity trace when empty`);
  console.log(`${t2 ? "✓" : "✗"} ep2 continuity trace when prevEpisodeSummary set`);
  if (t1 || !t2) process.exit(1);
  console.log("\n=== series continuity OK ===");
}

main();
