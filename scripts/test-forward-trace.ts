/** yarn test:forward-trace */
import fs from "fs";
import path from "path";
import { buildForwardTrace } from "@/ruleEngine/design/forwardTrace";
import { scriptBundleSchema, stripCommentFields } from "@/ruleEngine/bundle/schema";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";

const v2 = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/fixtures/script-bundle-template-v2.json"), "utf-8"));
const bundle = scriptBundleSchema.parse(stripCommentFields(v2)) as ScriptBundle;
const t1 = buildForwardTrace(bundle, "T1");
const t3 = buildForwardTrace({ ...bundle, modalityPromptAudit: { items: [] } } as ScriptBundle, "T3");

let failed = 0;
if (t1.traces.length < 5) { console.error("✗ T1 traces < 5"); failed++; }
else console.log("✓ G86 T1 traces ≥5");

const mods = new Set(t3.traces.map((t) => t.modality).filter(Boolean));
if (!["IMG", "VID", "AUD", "FX"].every((m) => mods.has(m))) { console.error("✗ G96 T3 modality traces"); failed++; }
else console.log("✓ G96 T3 IMG/VID/AUD/FX traces");

process.exit(failed ? 1 : 0);
