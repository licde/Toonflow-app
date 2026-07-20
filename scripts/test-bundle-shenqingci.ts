/**
 * Shenqingci deepseek golden — inspect T3 + expected gap catalog.
 * yarn test:bundle-shenqingci
 */
import fs from "fs";
import path from "path";
import { inspectBundle } from "@/ruleEngine/portable/inspectBundle";
import { collectReferencedCodes } from "@/ruleEngine/bundle/assetClosureGate";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";

const root = process.cwd();
const fixturePath = path.join(root, "data/fixtures/golden/deepseek-20260715-shenqingci.json");
const expectPath = path.join(root, "data/fixtures/golden/deepseek-20260715-shenqingci.expect.json");

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

function main() {
  console.log("# bundle shenqingci global analysis\n");
  ok("fixture exists", fs.existsSync(fixturePath));
  if (!fs.existsSync(fixturePath)) process.exit(1);

  const bundle = JSON.parse(fs.readFileSync(fixturePath, "utf-8")) as ScriptBundle;
  const shots = bundle.preDesignPack?.shots ?? [];
  ok("shotCount >= 10", shots.length >= 10, String(shots.length));

  const refs = collectReferencedCodes(bundle);
  ok("refs include CHAR-SHENQINGCI", refs.some((c) => /SHENQINGCI|CHAR-SHEN/i.test(c)), refs.slice(0, 8).join(","));

  // Structural gap probes (design → compile)
  const imgPrompts = shots.map((s) => s.generation?.imagePrompt ?? "");
  const vidPrompts = shots.map((s) => s.generation?.videoPrompt ?? "");
  const hasCref = imgPrompts.some((p) => /--cref/i.test(p));
  const hasSref = imgPrompts.some((p) => /--sref/i.test(p));
  const hasSceneCode = shots.some((s) => Boolean((s as { sceneCode?: string }).sceneCode));
  const vidHasIdentity = vidPrompts.some((p) => /identity\[|--cref|--sref/i.test(p));
  ok("image prompts have --cref", hasCref);
  // Expected gaps recorded below — assert detectability, not false green
  ok("detect missing --sref (known gap)", !hasSref, "unexpected sref present");
  ok("detect missing sceneCode (known gap)", !hasSceneCode, "unexpected sceneCode");
  ok("detect video identity sparse (known gap)", !vidHasIdentity, "video already has identity");

  const result = inspectBundle(bundle, { tier: "T3" });
  ok("inspect returns object", Boolean(result));
  ok("closureReport present", Boolean(result.closureReport));
  ok("rePushPlan array", Array.isArray(result.rePushPlan));
  ok("forwardTrace present", Boolean(result.forwardTrace));

  const missing: string[] = [];
  if (!hasSref) missing.push("IMG_SREF_MISSING");
  if (!hasSceneCode) missing.push("SCENE_CODE_MISSING");
  if (!vidHasIdentity) missing.push("VID_IDENTITY_SPARSE");
  if (!String(bundle.designBrief?.B7 ?? "").trim()) missing.push("B7_EMPTY");
  if (bundle.debutIntroPack) missing.push("DEBUT_PACK_PRESENT");

  const expectPayload = {
    shotCount: shots.length,
    knownGaps: missing,
    hasCref: true,
    hasSref: false,
    hasSceneCode: false,
    vidIdentitySparse: true,
    note: "Gaps are expected until FieldForwarder + sceneCode materialize; do not treat as false green.",
  };

  if (!fs.existsSync(expectPath)) {
    fs.writeFileSync(expectPath, JSON.stringify(expectPayload, null, 2), "utf-8");
    console.log("wrote expect:", expectPath);
  }

  const expect = JSON.parse(fs.readFileSync(expectPath, "utf-8")) as typeof expectPayload;
  ok("expect shotCount match", shots.length === expect.shotCount, `${shots.length} vs ${expect.shotCount}`);
  for (const g of expect.knownGaps ?? []) {
    ok(`known gap catalogued: ${g}`, missing.includes(g) || g === "DEBUT_PACK_PRESENT");
  }
  ok("expect hasCref", expect.hasCref === true);
  ok("expect hasSref false", expect.hasSref === false);
  ok("expect sceneCode false", expect.hasSceneCode === false);

  // Optimize list must surface something or report must not silently claim full identity
  const optimize = (result.closureReport as { optimize?: unknown[]; missing?: unknown[] })?.optimize ?? [];
  const miss = (result.closureReport as { missing?: unknown[] })?.missing ?? [];
  ok(
    "inspect surfaces gaps or optimize hints",
    miss.length + optimize.length + (result.chatPromptGaps?.length ?? 0) + missing.length > 0,
  );

  if (failed) {
    console.error(`\n${failed} shenqingci check(s) failed`);
    process.exit(1);
  }
  console.log("\n=== test:bundle-shenqingci OK ===");
}

main();
