/**
 * yarn test:identity-asset-gate
 * Unit: stub_quality / no_image / filePath completion without live DB images.
 */
import { buildMissingAssetImageQueue, type IdentityImageGap } from "@/ruleEngine/compilers/identityAssetGate";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const gaps: IdentityImageGap[] = [
  { code: "CHAR-1", kind: "CHAR", reason: "no_image" },
  { code: "SCENE-001", kind: "SCENE", reason: "stub_quality" },
  { code: "SCENE-?", kind: "SCENE", reason: "missing_scene" },
  { code: "CHAR-001", kind: "CHAR", reason: "no_asset" },
];
const q = buildMissingAssetImageQueue(gaps);
ok("queue includes no_image", q.some((x) => x.code === "CHAR-1"));
ok("queue includes stub_quality", q.some((x) => x.code === "SCENE-001"));
ok("queue excludes SCENE-?", !q.some((x) => x.code === "SCENE-?"));
ok("no_image → generate_still", q.find((x) => x.code === "CHAR-1")?.action === "generate_still");
ok("no_asset → seed_asset", q.find((x) => x.code === "CHAR-001")?.action === "seed_asset");

import { pickBetterRow } from "@/ruleEngine/compilers/identityAssetGate";
ok(
  "pickBetterRow prefers hasImage",
  pickBetterRow({ id: 2, hasImage: false, stubQuality: false }, { id: 1, hasImage: true, stubQuality: false }).id === 1,
);
ok(
  "pickBetterRow prefers non-stub when both no image",
  pickBetterRow({ id: 1, hasImage: false, stubQuality: true }, { id: 2, hasImage: false, stubQuality: false }).id === 2,
);

if (failed) process.exit(1);
console.log("\n=== test:identity-asset-gate OK ===");
