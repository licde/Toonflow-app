/**
 * yarn test:asset-seed-cardinality — stub speakers marked batchExclude; name dedup helper.
 */
import { ensureCdSpeakerStubs } from "@/ruleEngine/bundle/normalizePreDesignPack";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const bundle = {
  bundleType: "script",
  characterDesign: {
    assets: [{ code: "CHAR-SHEN", name: "沈清辞", L0: { visual: "黑发白衣少女" } }],
  },
  preDesignPack: {
    shots: [
      {
        shotIndex: 1,
        narrative: {
          dialogue: {
            lines: [
              { speaker: "沈清辞", text: "你好" },
              { speaker: "冬青", text: "嗯" },
              { speaker: "冬 青", text: "重复名变体不在此测" },
            ],
          },
        },
      },
    ],
  },
  designBrief: { B6: { characters: ["沈清辞", "冬青"] } },
} as unknown as ScriptBundle;

const added = ensureCdSpeakerStubs(bundle);
ok("stub added for 冬青", added.includes("冬青"));
ok("did not re-stub 沈清辞", !added.includes("沈清辞"));

const assets = (bundle.characterDesign as { assets: { name?: string; L0?: { stub?: boolean } }[] }).assets;
const dong = assets.find((a) => a.name === "冬青");
ok("冬青 has L0.stub", dong?.L0?.stub === true);
ok("沈清辞 unchanged visual", assets.some((a) => a.name === "沈清辞" && !(a.L0 as { stub?: boolean })?.stub));

const again = ensureCdSpeakerStubs(bundle);
ok("idempotent stubs", again.length === 0);

if (failed) {
  console.error(`\n${failed} FAILED`);
  process.exit(1);
}
console.log("\n=== test:asset-seed-cardinality OK ===");
