/**
 * yarn audit:quality-matrix-coverage
 * Fails if matrix stages are not referenced by known mount points (static check),
 * or softPatch matrix rows lack PrecheckLoop adapters.
 */
import fs from "fs";
import path from "path";
import { loadQualityMatrix } from "@/ruleEngine/qualityGate";
import { missingSoftPatchAdapters, ensureDefaultAdapters, listAdapters } from "@/ruleEngine/precheckLoop/adapters";

const ROOT = process.cwd();
const mounts: Record<string, string[]> = {
  export: ["src/ruleEngine/portable/inspectBundle.ts"],
  preflight: ["src/ruleEngine/detection/preflightProduction.ts"],
  promptGen: ["src/routes/production/workbench/generateVideoPrompt.ts"],
  burn: ["src/routes/production/workbench/generateVideo.ts", "src/ruleEngine/compilers/preflightVendorGates.ts"],
};

let failed = 0;
const matrix = loadQualityMatrix();
const stages = new Set(matrix.flatMap((e) => e.stages));

for (const stage of stages) {
  if (stage === "design" || stage === "post") {
    console.log(`· stage ${stage} optional (no hard mount required)`);
    continue;
  }
  const files = mounts[stage];
  if (!files?.length) {
    console.error(`✗ stage ${stage} has no declared mount files`);
    failed++;
    continue;
  }
  for (const f of files) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) {
      console.error(`✗ missing mount file for ${stage}: ${f}`);
      failed++;
      continue;
    }
    const text = fs.readFileSync(p, "utf-8");
    const ok =
      text.includes("qualityGate") ||
      text.includes("preflightVendorGates") ||
      text.includes("runLangAudFxCamGates");
    if (!ok) {
      console.error(`✗ ${f} does not reference qualityGate/vendorGates for stage=${stage}`);
      failed++;
    } else {
      console.log(`✓ ${stage} ← ${f}`);
    }
  }
}

ensureDefaultAdapters();
const missing = missingSoftPatchAdapters();
if (missing.length) {
  console.error(`✗ softPatch matrix entries without PrecheckLoop adapter: ${missing.join(", ")}`);
  failed++;
} else {
  console.log(`✓ softPatch adapters covered (${listAdapters().map((a) => a.id).join(", ")})`);
}

console.log(`matrix entries: ${matrix.length}`);
process.exit(failed ? 1 : 0);
