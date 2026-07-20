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

for (const [trigger, target] of [
  ["mode_rules_mismatch", "MD"],
  ["prompt_gen_media_missing", "AS"],
  ["derive_parent_ref_missing", "AS"],
  ["image_mode_ref_mismatch", "EN"],
  ["vendor_passthrough", "INFRA"],
  ["tls_socket", "INFRA"],
  ["missing_scene", "SB"],
] as const) {
  if (resolveReverseTarget(trigger) !== target) {
    console.error(`✗ ${trigger} → ${resolveReverseTarget(trigger)} expect ${target}`);
    failed++;
  } else console.log(`✓ ${trigger} → ${target}`);
}

const missingSceneRoute = routes.routes.find((r: { trigger: string }) => r.trigger === "missing_scene");
if (!missingSceneRoute || missingSceneRoute.reverseTarget !== "SB" || missingSceneRoute.reverseTarget === "INFRA") {
  console.error("✗ reverse_route missing_scene → SB (not INFRA)");
  failed++;
} else if (!Array.isArray(missingSceneRoute.forwardStages) || !missingSceneRoute.forwardStages.includes("BP")) {
  console.error("✗ reverse_route missing_scene forwardStages should include BP");
  failed++;
} else console.log("✓ reverse_route missing_scene → SB/BP");

const tlsRoute = routes.routes.find((r: { trigger: string }) => r.trigger === "tls_socket");
if (!tlsRoute || tlsRoute.reverseTarget !== "INFRA") {
  console.error("✗ reverse_route tls_socket → INFRA");
  failed++;
} else console.log("✓ reverse_route tls_socket");

process.exit(failed ? 1 : 0);
