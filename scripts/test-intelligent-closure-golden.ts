/** yarn test:intelligent-closure-golden — IC-01~06 */
import fs from "fs";
import path from "path";
import { runIntelligentClosureDryRun } from "@/ruleEngine/bundle/intelligentClosureDryRun";
import { runUnifiedClosure } from "@/ruleEngine/design/unifiedDryRun";
import { scriptBundleSchema, stripCommentFields } from "@/ruleEngine/bundle/schema";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";

let failed = 0;

const w93 = scriptBundleSchema.parse(
  stripCommentFields(JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/fixtures/golden/w93-unconfirmed-block.json"), "utf-8"))),
) as ScriptBundle;
const ic = runIntelligentClosureDryRun(w93);
const ic02 = ic.find((c) => c.id === "IC-02");
console.log(`${ic02 && !ic02.passed ? "✓" : "✗"} IC-02 W93 unconfirmed BLOCK`);
if (!ic02 || ic02.passed) failed++;

const v2 = scriptBundleSchema.parse(
  stripCommentFields(JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/fixtures/script-bundle-template-v2.json"), "utf-8"))),
) as ScriptBundle;
const icOk = runIntelligentClosureDryRun(v2);
console.log(`${icOk.filter((c) => c.severity === "BLOCK" && !c.passed).length === 0 ? "✓" : "✗"} IC v2 positive`);
if (icOk.filter((c) => c.severity === "BLOCK" && !c.passed).length > 0) failed++;

const unified = runUnifiedClosure(w93, { tier: "T1" });
console.log(`${unified.ic.some((c) => c.id === "IC-02" && !c.passed) ? "✓" : "✗"} unified IC merge`);
if (!unified.ic.some((c) => c.id === "IC-02" && !c.passed)) failed++;

const hints = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/fixtures/repair_hint_catalog.json"), "utf-8"));
console.log(`${(hints.hints?.length ?? 0) >= 3 ? "✓" : "✗"} repair_hint_catalog`);
if ((hints.hints?.length ?? 0) < 3) failed++;

process.exit(failed ? 1 : 0);
