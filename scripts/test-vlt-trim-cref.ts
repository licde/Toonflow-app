/**
 * Goldens: VLT dual-shape name trim + scene-not-as-character cref gate.
 */
import assert from "node:assert/strict";
import { collectCdCharacterNames } from "../src/ruleEngine/bundle/designExportHelpers";
import { buildNameToSlug } from "../src/ruleEngine/codes/assetCodeAlias";
import {
  assetDisplayName,
  normalizeCharacterAssetsNameMap,
  normalizeVisualLockTableOnBundle,
} from "../src/ruleEngine/bundle/assetLabel";
import { assertStillIdentityPreflight } from "../src/ruleEngine/compilers/stillIdentityPreflight";
import { looksLikeSceneName, mergeCharacterHints } from "../src/ruleEngine/compilers/hydrateComposeStillContext";
import { assertStillIdentityCoverage } from "../src/ruleEngine/compilers/stillIdentityCoverage";

function ok(name: string, cond: boolean) {
  if (!cond) throw new Error(`FAIL: ${name}`);
  console.log(`✓ ${name}`);
}

// --- assetDisplayName ---
ok("string name", assetDisplayName("温瓷") === "温瓷");
ok("object L0 identity", assetDisplayName({ L0: { identity: "实习生", gender: "女" } }) === "实习生");
ok("object name field", assetDisplayName({ name: "兰辞", L0: {} }) === "兰辞");
ok("null safe", assetDisplayName(null) === "");

const dualMap = normalizeCharacterAssetsNameMap({
  "CHAR-001": { L0: { identity: "温氏制药实习生", gender: "女" } },
  "CHAR-002": "兰辞",
});
ok("normalize map object", dualMap["CHAR-001"] === "温氏制药实习生");
ok("normalize map string", dualMap["CHAR-002"] === "兰辞");

// --- collectCdCharacterNames must not throw on Untitled-3 shape ---
const untitledLike = {
  characterDesign: {
    assets: [
      { code: "CHAR-001", name: "温瓷", L0: { identity: "实习生" } },
      { code: "CHAR-002", name: "兰辞", L0: { identity: "CEO" } },
    ],
  },
  visualLockTable: {
    characterAssets: {
      "CHAR-001": { L0: { identity: "温氏制药实习生", gender: "女" } },
      "CHAR-002": { L0: { identity: "兰氏集团CEO", gender: "男" } },
    },
  },
  preDesignPack: { shots: [] },
  planData: {},
  script: "x",
  meta: { episodeKey: "ep-01" },
};

let threw = false;
try {
  const names = collectCdCharacterNames(untitledLike as never);
  ok("collect names has 温瓷", names.has("温瓷"));
  ok("collect names has CHAR-001", names.has("CHAR-001"));
  ok("collect names has identity from VLT", names.has("温氏制药实习生"));
} catch (e) {
  threw = true;
  console.error(e);
}
ok("collectCdCharacterNames no throw", !threw);

threw = false;
try {
  const slug = buildNameToSlug(untitledLike as never);
  ok("buildNameToSlug has 温瓷", slug["温瓷"] === "CHAR-001" || Boolean(slug["温氏制药实习生"]));
} catch (e) {
  threw = true;
  console.error(e);
}
ok("buildNameToSlug no throw", !threw);

const bundleCopy = structuredClone(untitledLike) as typeof untitledLike & {
  visualLockTable: Record<string, unknown>;
};
normalizeVisualLockTableOnBundle(bundleCopy);
ok(
  "normalize on bundle stringifies",
  typeof (bundleCopy.visualLockTable.characterAssets as Record<string, string>)["CHAR-001"] === "string",
);

// prepare path: mutate in place like prepareBundleForInspect does after parse
const forPrep = structuredClone(untitledLike) as typeof untitledLike & {
  visualLockTable: Record<string, unknown>;
  characterDesign: { assets: { code?: string; name?: unknown }[] };
};
normalizeVisualLockTableOnBundle(forPrep);
ok(
  "inspect-normalize leaves string assets",
  typeof (forPrep.visualLockTable.characterAssets as Record<string, string>)["CHAR-002"] === "string",
);
ok(
  "collect after normalize still ok",
  collectCdCharacterNames(forPrep as never).has("温瓷"),
);

// --- scene name must not enter IMG-CREF-CHAR ---
ok("looksLikeSceneName 沈府正厅", looksLikeSceneName("沈府正厅"));
ok("not scene 沈清瓷", !looksLikeSceneName("沈清瓷"));

const merged = mergeCharacterHints(
  [
    { name: "沈清瓷", hasImage: true, kind: "character", code: "CHAR-001" },
    { name: "沈府正厅", hasImage: false, kind: "character" },
  ],
  { visualDescription: "沈府正厅内双人对坐", dialogueSpeakers: [] },
);
ok(
  "merge drops scene-like from chars",
  !merged.some((c) => c.kind !== "scene" && (c.name === "沈府正厅" || looksLikeSceneName(c.name))),
);

const pre = assertStillIdentityPreflight({
  characters: [
    { name: "沈清瓷", hasImage: true, kind: "character", code: "CHAR-001" },
    { name: "沈府正厅", hasImage: false, kind: "character" },
  ],
  description: "双人高坐低跪于沈府正厅",
  enforce: true,
});
ok("preflight ok when only scene missing look", pre.ok === true || !(pre.missing ?? []).includes("沈府正厅"));
ok(
  "preflight missing never 沈府正厅",
  !(pre.missing ?? []).some((m) => String(m).includes("沈府正厅")),
);

const cov = assertStillIdentityCoverage({
  characters: [
    { name: "沈清瓷", hasImage: true },
    { name: "沈府正厅", hasImage: false },
  ],
  dialogueSpeakers: [],
  enforce: true,
});
ok("coverage ignores scene name", cov.ok || !(cov.missing ?? []).some((m) => m.name === "沈府正厅"));

// true dual missing still fails
const fail = assertStillIdentityPreflight({
  characters: [
    { name: "沈清瓷", hasImage: false, kind: "character" },
    { name: "沈清辞", hasImage: false, kind: "character" },
  ],
  description: "双人高坐低跪对峙",
  enforce: true,
});
ok("true dual missing still blocked", fail.ok === false);

console.log("\nvlt-trim-cref OK");
