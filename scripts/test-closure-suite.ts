/**
 * T0 / Phase E closure gate — aggregate critical tests
 * yarn test:closure-suite
 */
import { spawnSync } from "child_process";

const cmds = [
  "lint",
  "test:asset-code-contract",
  "test:e2e-production-loop",
  "build:integrate",
  "test:bundle-integrity-19fce1",
  "test:bundle-shape-pipeline",
  "test:bundle-import-smoke",
  "audit:bundle-shape-gaps",
  "audit:export-shape-contract",
  "audit:routing-drift",
  "test:design-closure-golden",
  "test:dc16-cast",
  "test:design-export-gate",
  "test:precheck-loop",
  "test:quality-gate",
  "audit:quality-matrix-coverage",
  "test:unified-closure-golden",
  "test:gap-chains",
  "audit:full-chain-closure",
  "audit:detection-coverage",
  "test:reverse-route",
  "test:forward-trace",
  "test:five-kernel-closure",
  "test:five-kernel-full-matrix",
  "test:fe-integration-contract",
  "test:picker-url",
  "test:mode-template-regex",
  "test:modality-slots-enforce",
  "test:repush-stage-jump",
  "test:bundle-shenqingci",
  "test:mode-prompt-goldens",
  "audit:closure-selfdiag",
  "test:import-fidelity-normalize",
  "test:shot-vendor-bridge",
  "test:deepseek-20260716-closure",
  "test:import-asset-quality",
  "test:identity-asset-gate",
  "test:polish-assets-text",
  "test:asset-still-prompt-contract",
  "test:asset-seed-cardinality",
  "test:prompt-touch",
  "test:asset-visual-brief-ep01",
  "test:batch-video-parity",
  "test:agnes-result-url",
  "test:self-heal-orchestrator",
  "test:image-mode-template-wire",
  "test:asset-still-runner",
  "test:still-visual-fidelity",
  "test:still-quality-closed-loop",
  "test:ep01-quality-loop",
  "test:frost-import-hardening",
  "test:still-cheek-contact-chain",
  "test:literary-intent-survive",
  "test:video-quality-chain",
  "test:full-runtime-matrix",
];

let failed = 0;
for (const cmd of cmds) {
  const [script, ...args] = cmd.split(" ");
  const r = spawnSync("yarn", [script, ...args], { stdio: "inherit", shell: true, cwd: process.cwd() });
  if (r.status !== 0) {
    console.error(`\n✗ failed: yarn ${cmd}`);
    failed++;
  } else {
    console.log(`\n✓ yarn ${cmd}`);
  }
}

if (failed) {
  console.error(`\n${failed} closure-suite step(s) failed`);
  process.exit(1);
}
console.log("\n=== test:closure-suite OK ===");
