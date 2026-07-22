/**
 * Golden: composition/character-first still closed loop (bgPolicy, layout, edit SSOT, repair, key).
 * yarn tsx scripts/test-still-composition-loop.ts
 */
import { resolveStillBgPolicy } from "../src/ruleEngine/compilers/stillBgPolicy";
import { extractDescPredicates } from "../src/ruleEngine/compilers/extractDescPredicates";
import { composeStillPrompt } from "../src/ruleEngine/compilers/composeStillPrompt";
import { buildLiteraryEditPrompt } from "../src/ruleEngine/compilers/stillEditLiteraryPrompt";
import {
  buildEditFocusPrompt,
  mergeEditReferenceList,
  prepareStillImageEdit,
} from "../src/ruleEngine/qc/stillImageEdit";
import {
  selectLayoutTemplate,
  shouldRunTwoStageLayout,
  loadStillLayoutControlConfig,
  resolveLayoutForShot,
} from "../src/ruleEngine/qc/stillLayoutControl";
import { routeStillRepair } from "../src/ruleEngine/qc/stillRepairRoute";
import { preflightSeatingCref } from "../src/ruleEngine/qc/stillCrefPreflight";
import { buildLiteraryFidelityChecklist } from "../src/ruleEngine/compilers/literaryFidelityChecklist";
import { VLM_API_KEY_MISSING } from "../src/ruleEngine/qc/vlmKeyResolve";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const DESC = "沈母端坐高位太师椅摩挲扳指，沈清瓷跪低位蒲团抄书，权力反差构图，烛火摇曳。";

// --- bgPolicy ---
{
  const drop = resolveStillBgPolicy({
    description: DESC,
    characterNames: ["沈母", "沈清瓷"],
    shotSize: "ms",
  });
  ok("seatingHard → drop", drop.policy === "drop" && drop.excludeScene && drop.omitSrefToken, drop.reason);

  const keep = resolveStillBgPolicy({
    description: "祠堂匾额与廊柱，烛火摇曳。",
    characterNames: [],
    shotSize: "ls",
  });
  ok("establishing → keep", keep.policy === "keep" && !keep.excludeScene, keep.reason);

  const demote = resolveStillBgPolicy({
    description: "沈清瓷立于廊下沉思。",
    characterNames: ["沈清瓷"],
    shotSize: "ms",
  });
  ok("character mid → demote", demote.policy === "demote" && demote.excludeScene, demote.reason);
}

// --- compose omit --sref ---
{
  const composed = composeStillPrompt(
    {
      visualDescription: DESC,
      qualityMode: "hq_update",
      shotSize: "ms",
      sceneCode: "SCENE-CITANG",
      characters: [
        { code: "CHAR-SHENMU", name: "沈母", hasImage: true, kind: "character" },
        { code: "CHAR-SHENQINGCI", name: "沈清瓷", hasImage: true, kind: "character" },
      ],
      rawPrompt: "x --sref SCENE-CITANG --cref CHAR-SHENMU",
    },
    { mode: "full" },
  );
  ok("compose ok", composed.ok, composed.blockReason);
  ok("excludeScene true", composed.excludeScene === true, String(composed.bgPolicy));
  ok("no --sref token", !/--sref\s+SCENE-/i.test(composed.prompt), composed.prompt.slice(-80));
  ok("has --cref", /--cref/i.test(composed.prompt), composed.prompt.slice(-80));
}

// --- layout template select + load ---
{
  const pack = extractDescPredicates({ description: DESC, characterNames: ["沈母", "沈清瓷"] });
  const cfg = loadStillLayoutControlConfig();
  ok("layout cfg enabled", cfg.enabled !== false && cfg.twoStageEnabled !== false);
  ok("twoStage seating hq", shouldRunTwoStageLayout({ qualityMode: "hq_update", seatingHard: true, config: cfg }));
  ok("skip twoStage draft", !shouldRunTwoStageLayout({ qualityMode: "draft", seatingHard: true, config: cfg }));
  const t = selectLayoutTemplate({ pack, characterCount: 2, config: cfg });
  ok("template high_sit_low_kneel_2p", t?.id === "high_sit_low_kneel_2p", t?.id);
}

async function layoutLoad() {
  const pack = extractDescPredicates({ description: DESC, characterNames: ["沈母", "沈清瓷"] });
  const resolved = await resolveLayoutForShot({ pack, characterCount: 2, qualityMode: "hq_update" });
  ok("twoStage resolved", resolved.twoStage === true, resolved.layoutSkipped);
  ok("layout png base64", Boolean(resolved.layoutBase64 && resolved.layoutBase64.length > 100));
  ok("no data url prefix", !String(resolved.layoutBase64).startsWith("data:"));
}

async function main() {
await layoutLoad();

// --- Edit focus SSOT (no double 【Edit焦点】) ---
{
  const lit = buildLiteraryEditPrompt({
    description: DESC,
    fixHints: ["端坐太师椅"],
  });
  ok("literary has no Edit焦点", !lit.includes("【Edit焦点】"), lit.slice(0, 80));
  const focus = buildEditFocusPrompt({ literaryPrompt: lit, fixHints: ["端坐太师椅"] });
  const count = (focus.match(/【Edit焦点】/g) || []).length;
  ok("single Edit焦点", count === 1, `count=${count}`);
  const prep = prepareStillImageEdit({
    failedImageBase64: "AAA",
    fixHints: ["端坐太师椅"],
    literaryPrompt: lit,
    crefOrderedRefs: [
      { type: "image", base64: "CREF1", role: "cref" },
      { type: "image", base64: "CREF2", role: "cref" },
    ],
    model: "agnes:x",
    layoutPreserve: true,
  });
  ok("layout_preserve strategy", prep.strategy === "layout_preserve");
  ok("failed_still first", prep.referenceList[0]?.role === "failed_still");
  ok("max 2 cref after failed", prep.referenceList.filter((r) => r.role === "cref").length <= 2);
  const merged = mergeEditReferenceList({
    crefOrderedRefs: [{ type: "image", base64: "C", role: "cref" }],
    failedImageBase64: "F",
    layoutPreserve: true,
  });
  ok("merge layoutPreserve order", merged[0]?.role === "failed_still" && merged[1]?.role === "cref");
}

// --- checklist skips atmosphere when demote ---
{
  const itemsDrop = buildLiteraryFidelityChecklist({
    description: DESC,
    characterNames: ["沈母", "沈清瓷"],
    bgPolicy: "drop",
  });
  ok(
    "no atmosphere under drop",
    !itemsDrop.some((i) => i.kind === "atmosphere"),
    itemsDrop.map((i) => i.kind).join(","),
  );
  ok("has seating/composition", itemsDrop.some((i) => i.kind === "seating" || i.kind === "composition"));
}

// --- repair route ---
{
  const layoutFail = routeStillRepair({
    itemResults: [{ id: "role:沈母:端坐:太师椅", pass: false, fixHint: "端坐太师椅" }],
    checklist: [{ id: "role:沈母:端坐:太师椅", kind: "seating", mustTokens: [], vlmQuestion: "", healInject: "", strengthenKey: "", strengthenValue: "" }],
  });
  ok("repair → layout", layoutFail.route === "layout" && layoutFail.swapLayoutTemplate);

  const idFail = routeStillRepair({
    itemResults: [{ id: "identity:dual_cref", pass: false }],
    checklist: [{ id: "identity:dual_cref", kind: "identity", mustTokens: [], vlmQuestion: "", healInject: "", strengthenKey: "", strengthenValue: "" }],
  });
  ok("repair → identity layoutPreserve", idFail.route === "identity" && idFail.layoutPreserveEdit);

  const keyFail = routeStillRepair({ vlmError: `${VLM_API_KEY_MISSING}: 缺少API Key` });
  ok("repair → config", keyFail.route === "config" && Boolean(keyFail.settingsDeepLink));
}

// --- cref preflight ---
{
  const miss = preflightSeatingCref({
    seatingHard: true,
    characters: [
      { code: "CHAR-A", name: "沈母", hasImage: false, kind: "character" },
      { code: "CHAR-B", name: "沈清瓷", hasImage: false, kind: "character" },
    ],
  });
  ok("cref gate blocks", Boolean(miss && miss.code === "CREF_MISSING_FOR_SEATING"));

  const okCref = preflightSeatingCref({
    seatingHard: true,
    characters: [
      { code: "CHAR-A", name: "沈母", hasImage: true, kind: "character" },
      { code: "CHAR-B", name: "沈清瓷", hasImage: true, kind: "character" },
    ],
  });
  ok("cref gate pass", okCref === null);
}

if (failed) {
  console.error(`\nFAILED ${failed}`);
  process.exit(1);
}
console.log("\nall still-composition-loop checks passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
