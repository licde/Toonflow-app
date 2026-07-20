/**
 * yarn test:bundle-integrity-19fce1
 * Asserts deepseek-20260715-19fce1 integrity gaps + cref parse + collectReferencedCodes.
 */
import fs from "fs";
import path from "path";
import { auditBundleIntegrity } from "../src/ruleEngine/bundle/bundleIntegrityAudit";
import { collectReferencedCodes } from "../src/ruleEngine/bundle/assetClosureGate";
import { parsePromptRefs } from "../src/ruleEngine/compilers/vendorPromptAdapter";
import { adaptPromptForMode } from "../src/ruleEngine/compilers/adaptPromptForMode";
import { runUnifiedClosure } from "../src/ruleEngine/design/unifiedDryRun";
import { buildRePushPlan } from "../src/ruleEngine/design/reverseRouteEngine";
import { writeContinuityFromEpisode } from "../src/ruleEngine/bundle/continuityWriteback";
import type { ScriptBundle } from "../src/ruleEngine/bundle/types";

const root = process.cwd();
const fixturePath = path.join(root, "data/fixtures/golden/deepseek-20260715-19fce1.json");
const expectPath = path.join(root, "data/fixtures/golden/deepseek-20260715-19fce1.expect.json");

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failed++;
    console.error("FAIL:", msg);
  } else console.log("OK:", msg);
}

async function main() {
  const bundle = JSON.parse(fs.readFileSync(fixturePath, "utf-8")) as ScriptBundle;
  const expect = JSON.parse(fs.readFileSync(expectPath, "utf-8"));

  const shots = bundle.preDesignPack?.shots ?? [];
  assert(shots.length === expect.shotCount, `shots ${shots.length} === ${expect.shotCount}`);

  const refs = collectReferencedCodes(bundle);
  assert(refs.includes("CHAR-005"), `referenced includes CHAR-005: ${refs.join(",")}`);

  const gaps = auditBundleIntegrity(bundle);
  const ids = new Set(gaps.map((g) => g.id));
  for (const id of expect.expectAfterImport.integrityIdsMustInclude) {
    assert(ids.has(id), `integrity has ${id}`);
  }

  const comma = parsePromptRefs("x --cref CHAR-001,CHAR-005 --ar 9:16");
  assert(
    expect.expectAfterImport.commaCrefParse.every((c: string) => comma.crefs.includes(c)),
    `comma crefs ${JSON.stringify(comma.crefs)}`,
  );

  const audioCount = shots.filter((s) => (s.generation as { audioPrompt?: string })?.audioPrompt?.trim()).length;
  assert(audioCount === 13, `audioPrompt non-empty ${audioCount}`);

  const unified = runUnifiedClosure(bundle, { tier: "T3" });
  assert(unified.gc.length > 0, `GC always-on length=${unified.gc.length}`);

  const plan = buildRePushPlan(["missing_reference_upload", "content_policy", "img_cref_missing"]);
  assert(plan.some((p) => p.reverseTarget === "INFRA"), "oss → INFRA");
  assert(plan.some((p) => p.trigger === "img_cref_missing" || p.reverseTarget === "EN"), "cref reverse");

  const adapted = await adaptPromptForMode({
    modality: "video",
    fromMode: "text",
    toMode: "singleImage",
    prompt: "旧提示词",
  });
  assert(adapted.modeId === "singleImage", `adapt mode ${adapted.modeId}`);
  assert(
    adapted.prompt.includes("motion-from-frame") && !adapted.prompt.includes("[mode="),
    `adapt dialect ${adapted.prompt}`,
  );

  const wb = await writeContinuityFromEpisode({} as never, 1, bundle);
  assert(wb.written && Boolean(wb.recapHint), `continuity writeback ${JSON.stringify(wb)}`);

  if (failed) {
    console.error(`bundle-integrity-19fce1: ${failed} failed`);
    process.exit(1);
  }
  console.log("bundle-integrity-19fce1: all passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
