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

  const ep1Empty: ScriptBundle = { ...base, continuity: undefined };
  const withPrev: ScriptBundle = {
    ...base,
    continuity: { prevEpisodeSummary: "上集：主角发现线索", characterState: { hero: "警觉" } },
  };

  const rEmpty = inspectBundle(ep1Empty, { tier: "T1" });
  const rRecap = inspectBundle(base, { tier: "T1" });
  const rPrev = inspectBundle(withPrev, { tier: "T1" });

  const emptyTrace = (rEmpty.forwardTrace as { traces?: { chainId: string }[] })?.traces?.some((t) => t.chainId === "continuity");
  const recapTrace = (rRecap.forwardTrace as { traces?: { chainId: string }[] })?.traces?.some((t) => t.chainId === "continuity");
  const prevTrace = (rPrev.forwardTrace as { traces?: { chainId: string }[] })?.traces?.some((t) => t.chainId === "continuity");

  console.log(`${!emptyTrace ? "✓" : "✗"} ep1 empty continuity no trace`);
  console.log(`${recapTrace ? "✓" : "✗"} ep1 recapHint has continuity trace`);
  console.log(`${prevTrace ? "✓" : "✗"} ep2 prevEpisodeSummary has continuity trace`);
  if (emptyTrace || !recapTrace || !prevTrace) process.exit(1);
  console.log("\n=== series continuity OK ===");
}

main();
