/**
 * yarn test:asset-still-runner
 */
import { buildMissingAssetImageQueue } from "@/ruleEngine/compilers/identityAssetGate";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const q = buildMissingAssetImageQueue([
  { code: "SCENE-001", kind: "SCENE", reason: "stub_quality" },
  { code: "CHAR-X", kind: "CHAR", reason: "no_image" },
]);
ok("queue length 2", q.length === 2);

const src = require("fs").readFileSync(
  require("path").join(process.cwd(), "src/ruleEngine/design/assetStillRunner.ts"),
  "utf-8",
);
ok("still runner exports runAssetStillQueue", /export async function runAssetStillQueue/.test(src));
ok("orchestrator imports still runner", /assetStillRunner/.test(
  require("fs").readFileSync(require("path").join(process.cwd(), "src/ruleEngine/design/selfHealOrchestrator.ts"), "utf-8"),
));
ok("generateVideo wires heal on fail", /runSelfHeal/.test(
  require("fs").readFileSync(require("path").join(process.cwd(), "src/routes/production/workbench/generateVideo.ts"), "utf-8"),
));

if (failed) process.exit(1);
console.log("\n=== test:asset-still-runner OK ===");
