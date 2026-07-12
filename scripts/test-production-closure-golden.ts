/**
 * G72–G85 · 制作实现闭环 golden + 四模态 PC-09~14
 * yarn test:production-closure-golden
 */
import fs from "fs";
import path from "path";
import { productionClosureBlocked, runProductionClosureDryRun } from "@/ruleEngine/bundle/productionClosureDryRun";
import { scriptBundleSchema, stripCommentFields } from "@/ruleEngine/bundle/schema";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";
import { buildModalityPromptAudit } from "@/ruleEngine/modalityOrchestrator";

const GOLDEN = [
  { file: "identity-mismatch-block.json", expectBlock: true, label: "identity G65/PC-14", pc: "PC-14" },
  { file: "fx-f5-block.json", expectBlock: true, label: "fx F5 G57/PC-02", pc: "PC-02" },
  { file: "narrative-broken-block.json", expectBlock: true, label: "graph G60/PC-04", pc: "PC-04" },
  { file: "debut-missing-warn.json", expectBlock: true, label: "PR-16 G72", pc: "PC-05" },
  { file: "vid-first-frame-block.json", expectBlock: true, label: "VID 首帧 G78/PC-09", pc: "PC-09" },
  { file: "img-cref-block.json", expectBlock: true, label: "IMG cref G79/PC-11", pc: "PC-11" },
  { file: "aud-voice-block.json", expectBlock: true, label: "AUD voice G80/PC-10", pc: "PC-10" },
];

async function main() {
  const dir = path.join(process.cwd(), "data/fixtures/golden");
  let failed = 0;

  for (const g of GOLDEN) {
    const raw = JSON.parse(fs.readFileSync(path.join(dir, g.file), "utf-8"));
    const bundle = scriptBundleSchema.parse(stripCommentFields(raw)) as ScriptBundle;
    const checks = runProductionClosureDryRun(bundle);
    const blocked = productionClosureBlocked(checks);
    const pcFail = g.pc ? checks.find((c) => c.id === g.pc && !c.passed) : undefined;
    const ok = blocked === g.expectBlock && (!g.pc || !!pcFail);
    console.log(`${ok ? "✓" : "✗"} ${g.label} (${g.file}): blocked=${blocked}`);
    if (!ok) {
      failed++;
      console.log("  checks:", checks.filter((c) => !c.passed).map((c) => `${c.id}:${c.message}`).join("; "));
    }
  }

  const passPath = path.join(process.cwd(), "data/fixtures/script-bundle-template-v2.json");
  const passRaw = JSON.parse(fs.readFileSync(passPath, "utf-8"));
  const passBundle = scriptBundleSchema.parse(stripCommentFields(passRaw)) as ScriptBundle;
  const passChecks = runProductionClosureDryRun(passBundle);
  const passBlocked = productionClosureBlocked(passChecks);
  console.log(`${!passBlocked ? "✓" : "✗"} v2 template 正例: blocked=${passBlocked}`);
  if (passBlocked) failed++;

  const matrixPath = path.join(process.cwd(), "data/fixtures/modality_touch_matrix.json");
  const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf-8"));
  const modalities = Object.keys(matrix.modalities ?? {});
  const g82 = modalities.length === 4 && modalities.every((m) => matrix.modalities[m].rePushTargets);
  console.log(`${g82 ? "✓" : "✗"} G82 modality_touch_matrix 四模态 rePushTarget`);
  if (!g82) failed++;

  const audit = buildModalityPromptAudit([
    {
      shotIndex: 1,
      generation: { compiled: { image: "img", video: "vid", audio: "aud" } },
      narrative: { dialogue: { lines: [{ speaker: "a", text: "b" }] } },
    } as never,
  ]);
  const g85 = audit.rulePackVersion === "2.0.1" && Array.isArray(audit.perShot) && audit.perShot[0]?.IMG === "PASS";
  console.log(`${g85 ? "✓" : "✗"} G85 modalityPromptAudit roundtrip 同构`);
  if (!g85) failed++;

  if (failed) {
    console.error(`\n${failed} golden/验收用例失败`);
    process.exit(1);
  }
  console.log("\n=== production closure golden OK (G72–G85) ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
