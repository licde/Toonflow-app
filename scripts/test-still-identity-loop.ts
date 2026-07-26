/**
 * Golden: still identity SSOT — casting authority, multiFace predicate, egress, reverse SB fork.
 * yarn test:still-identity-loop
 */
import { readFileSync } from "fs";
import {
  canEmitMultiFace,
  detectPhantomDualFace,
  stripToCastingName,
  toBareCastingName,
  shouldWarnOneBeat,
  trimToOneBeat,
  hasDesignFiller,
  hasOsInNameDisplay,
  stripIdentityNoiseFromBody,
  dedupeNarrativeClauses,
} from "../src/ruleEngine/compilers/stillIdentitySsot";
import { composeStillPrompt, stripStaleBindingFromPrevious } from "../src/ruleEngine/compilers/composeStillPrompt";
import { healStillRecipePolicy } from "../src/ruleEngine/compilers/stillRecipePolicy";
import { assertStillFirstFrameContract, hashLiteraryDesc } from "../src/ruleEngine/qc/stillFirstFrameGate";
import { markStillStaleOnDescChange } from "../src/ruleEngine/compilers/stillQuality";
import { buildAggregatedChatRepairText } from "../src/ruleEngine/exportGate";
import { BLOCK_TO_TRIGGER_FOR_TEST } from "../src/ruleEngine/compilers/burnGateEnvelope";
import { stripWhoVerbGlue } from "../src/ruleEngine/compilers/extractDescPredicates";
import { normalizeCharacterDesignOsNames } from "../src/ruleEngine/bundle/normalizePreDesignPack";
import type { ScriptBundle } from "../src/ruleEngine/bundle/types";

function ok(name: string, cond: boolean) {
  if (!cond) {
    console.error(`✗ ${name}`);
    process.exitCode = 1;
    throw new Error(name);
  }
  console.log(`✓ ${name}`);
}

// Sample isomorphic dirty prompt
const dirtySample =
  "中景。沈清漪刺入后咬帕，包扎伤口，露出匕首勾起浅笑,。沈清漪（OS）对白瞬间神态。" +
  "沈清漪与沈清漪（OS）与沈清漪包不同脸，年龄与身份可辨。" +
  "face identity from character refs; environment from scene refs. --cref CHAR-SHENQINGYI";

ok("toBare strips OS", toBareCastingName("沈清漪（OS）") === "沈清漪");
ok("stripToCasting 包", stripToCastingName("沈清漪包", ["沈清漪"]) === "沈清漪");
ok("stripWhoVerbGlue 包 casting", stripWhoVerbGlue("沈清漪包", ["沈清漪"]) === "沈清漪");
ok("canEmitMultiFace single CHAR false", !canEmitMultiFace({ charCodes: ["CHAR-A"], names: ["沈清漪"], crefCharCount: 1 }));
ok("canEmitMultiFace dual true", canEmitMultiFace({ charCodes: ["CHAR-A", "CHAR-B"], names: ["甲", "乙"], crefCharCount: 2 }));
ok("detectPhantomDualFace sample", detectPhantomDualFace(dirtySample));
ok("hasOsInNameDisplay", hasOsInNameDisplay("沈清漪（OS）对白瞬间神态"));
ok("hasDesignFiller", hasDesignFiller(dirtySample));
ok("shouldWarnOneBeat multi", shouldWarnOneBeat(dirtySample));
const trimmed = trimToOneBeat(dirtySample);
ok("trimToOneBeat shorter", trimmed.trimmed && trimmed.text.length < dirtySample.length);

const stripped = stripIdentityNoiseFromBody(dirtySample);
ok("egress strips 不同脸", !/不同脸/.test(stripped));
ok("egress strips filler", !/对白瞬间/.test(stripped));
ok("egress strips EN contract", !/face identity from character refs/i.test(stripped));
ok("dedupe narrative", dedupeNarrativeClauses("咬帕。咬帕。") === "咬帕。");

const healed = healStillRecipePolicy(dirtySample);
ok("heal removes phantom dual", !detectPhantomDualFace(healed.prompt) || !/不同脸/.test(healed.prompt));
ok("heal removes ,。", !/,\s*。/.test(healed.prompt));

// Design strong contract: multi-beat VD must reverse to split_shot (no silent trim green)
const composedDirty = composeStillPrompt({
  visualDescription: dirtySample,
  characters: [{ code: "CHAR-SHENQINGYI", name: "沈清漪", hasImage: true, kind: "character" }],
  qualityMode: "hq_update",
  referenceUrlCount: 1,
});
ok(
  "compose multi-beat → split_shot block",
  !composedDirty.ok &&
    composedDirty.blockReason === "DEX-STILL-ONEBEAT" &&
    composedDirty.primaryNextStep === "split_shot",
);

const composed = composeStillPrompt({
  visualDescription: "中景。沈清漪侧脸，簪尖刺入指腹。",
  characters: [{ code: "CHAR-SHENQINGYI", name: "沈清漪", hasImage: true, kind: "character" }],
  qualityMode: "hq_update",
  referenceUrlCount: 1,
});
ok("compose ok one-beat", composed.ok);
ok("compose no multiFace for single", !/不同脸/.test(composed.prompt) && !composed.sources.includes("refs.multiFace"));
ok("compose oneBeat body", /刺入|侧脸/.test(composed.visualBody || composed.prompt));

const refineBody = stripStaleBindingFromPrevious(dirtySample);
ok("refine strip identity noise", !/不同脸|对白瞬间|face identity/i.test(refineBody));

const ff = assertStillFirstFrameContract({ stillPrompt: dirtySample, stillFilePath: "/x.png", requireStill: true });
ok("firstframe BLOCK dirty", !ff.ok && ff.code === "STILL-FIRSTFRAME-DIRTY");
ok("firstframe primary chat_repair not regen-only", ff.primaryNextStep === "chat_repair");
ok("firstframe reverse trigger", ff.reverseTrigger === "still_firstframe_dirty");

const h1 = hashLiteraryDesc("甲刺入。");
const h2 = hashLiteraryDesc("甲咬帕。");
ok("desc hash differs", h1 !== h2);
const stale = markStillStaleOnDescChange({ literaryDescHash: h1, stillQuality: "hq_ok", visualPass: true }, "甲咬帕。");
ok("stale on desc change", Boolean(stale && stale.promptState === "stale" && stale.stillQuality === "weak"));

const routes = JSON.parse(readFileSync("data/fixtures/reverse_route_table.json", "utf8")) as {
  routes?: { trigger?: string; reverseTarget?: string }[];
};
const row = (routes.routes ?? []).find((r) => r.trigger === "still_firstframe_dirty");
ok("reverse primary SB", row?.reverseTarget === "SB");
ok("envelope maps FIRSTFRAME", BLOCK_TO_TRIGGER_FOR_TEST["STILL-FIRSTFRAME-DIRTY"] === "still_firstframe_dirty");

const catalog = JSON.parse(readFileSync("data/fixtures/repair_hint_catalog.json", "utf8")) as {
  hints?: { id?: string }[];
};
ok("RH-STILL-FIRSTFRAME exists", (catalog.hints ?? []).some((h) => h.id === "RH-STILL-FIRSTFRAME"));

const chat = buildAggregatedChatRepairText([], [], undefined, [], {
  warnIds: ["DEX-STILL-ONEBEAT", "DEX-STILL-OS-NAME"],
  warnRows: [{ id: "DEX-STILL-ONEBEAT", message: "多拍" }],
});
ok("chatRepair still identity section", /静帧 Identity|still_firstframe_dirty|DEX-STILL/.test(chat));

const bundle = {
  characterDesign: { assets: [{ code: "CHAR-A", name: "沈清漪（OS）" }] },
  visualLockTable: { characterAssets: [{ code: "CHAR-A", name: "沈清漪（OS）" }] },
} as ScriptBundle;
const n = normalizeCharacterDesignOsNames(bundle);
ok("import CD OS strip", n >= 1 && (bundle.characterDesign as { assets: { name: string }[] }).assets[0].name === "沈清漪");

const bundleVlt = {
  characterDesign: { assets: [{ code: "CHAR-A", name: "沈清漪（OS）" }] },
  visualLockTable: {
    characterAssets: { "CHAR-A": "沈清漪（OS）", "CHAR-B": "谢玄辞" },
  },
} as ScriptBundle;
const nVlt = normalizeCharacterDesignOsNames(bundleVlt);
ok(
  "import VLT Record OS strip (not iterable crash)",
  nVlt >= 1 &&
    (bundleVlt.visualLockTable as { characterAssets: Record<string, string> }).characterAssets["CHAR-A"] ===
      "沈清漪",
);

// designExit: multi-beat → auto split or BLOCK; OS/FILLER still WARN
const { runDesignExitGate } = require("../src/ruleEngine/design/designExitGate") as typeof import("../src/ruleEngine/design/designExitGate");
const exitStrict = runDesignExitGate(
  "SB",
  {
    preDesignPack: {
      shots: [
        {
          shotIndex: 1,
          visualDescription:
            "刺入。咬帕。包扎。露出。勾起浅笑。对白瞬间神态。沈清漪（OS）。",
        },
      ],
    },
  },
  { chatStrict: true },
);
ok(
  "designExit DEX-STILL ONEBEAT BLOCK under chatStrict",
  exitStrict.failedIds.includes("DEX-STILL-ONEBEAT") &&
    exitStrict.warnings.some((w) => /DEX-STILL-OS-NAME|STILL_OS_NAME/.test(w)) &&
    exitStrict.warnings.some((w) => /DEX-STILL-FILLER|STILL_FILLER/.test(w)),
);
const exitAuto = runDesignExitGate("SB", {
  preDesignPack: {
    shots: [
      {
        shotIndex: 1,
        visualDescription:
          "刺入。咬帕。包扎。露出。勾起浅笑。对白瞬间神态。沈清漪（OS）。",
      },
    ],
  },
});
ok(
  "designExit auto expands or keeps OS/FILLER warnings",
  Boolean(exitAuto.splitApplied) ||
    exitAuto.warnings.some((w) => /DEX-STILL-OS-NAME|STILL_OS_NAME|DEX-STILL-FILLER|STILL_FILLER/.test(w)),
);

if (process.exitCode) {
  console.error("\n=== test:still-identity-loop FAIL ===");
  process.exit(1);
}
console.log("\n=== test:still-identity-loop OK ===");
