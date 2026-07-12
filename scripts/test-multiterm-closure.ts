/** yarn test:multiterm-closure */
import fs from "fs";
import path from "path";
import { getRulePackVersion } from "@/ruleEngine/ruleRegistry";

let failed = 0;
const matrix = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/fixtures/multi_end_closure_matrix.json"), "utf-8"));
const rp = getRulePackVersion();

const ext = matrix.ends.find((e: { id: string }) => e.id === "ext");
const int = matrix.ends.find((e: { id: string }) => e.id === "int");
const agent = matrix.ends.find((e: { id: string }) => e.id === "agent");

if (ext?.rulePackVersion !== "2.0.1" || int?.rulePackVersion !== "2.0.1") { console.error("✗ multi_end rulePack"); failed++; }
else console.log("✓ EXT/INT rulePack 2.0.1");

if (rp !== "2.0.1") { console.error("✗ INT registry"); failed++; }
else console.log("✓ ruleRegistry 2.0.1");

if (agent?.orchestration !== "browser_flow_orchestration.md") { console.error("✗ agent orchestration"); failed++; }
else console.log("✓ agent → browser_flow_orchestration");

const schema = matrix.unifiedResponseSchema?.closureChecks;
if (!schema?.dc || !schema?.pc || !schema?.gc || !schema?.ic) { console.error("✗ unifiedResponseSchema"); failed++; }
else console.log("✓ unified dryRun response schema");

process.exit(failed ? 1 : 0);
