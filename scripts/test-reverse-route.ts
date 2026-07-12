/** yarn test:reverse-route */
import fs from "fs";
import path from "path";
import { buildRePushPlan, getRepairPriorityOrder, resolveReverseTarget } from "@/ruleEngine/design/reverseRouteEngine";

let failed = 0;
const matrix = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/fixtures/unified_closure_matrix.json"), "utf-8"));
const routes = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/fixtures/reverse_route_table.json"), "utf-8"));

if (resolveReverseTarget("shot_camera_invalid") !== "EN") { console.error("✗ PR-CAM-01 → EN"); failed++; }
else console.log("✓ PR-CAM-01 reverseTarget EN");

const rp = buildRePushPlan(["dialogue_hash_mismatch"], ["script"]);
if (!rp[0]?.preserveFields?.includes("script")) { console.error("✗ G93 preserveFields"); failed++; }
else console.log("✓ G93 preserveFields");

const order = getRepairPriorityOrder();
if (!order.includes("VID") || order[0] !== matrix.repairPriorityOrder[0]) { console.error("✗ matrix priority"); failed++; }
else console.log("✓ unified matrix repairPriority");

const cam = routes.routes.find((r: { trigger: string }) => r.trigger === "shot_camera_invalid");
if (!cam?.ruleIds?.includes("PR-CAM-01")) { console.error("✗ reverse_route PR-CAM-01"); failed++; }
else console.log("✓ reverse_route PR-CAM-01");

process.exit(failed ? 1 : 0);
