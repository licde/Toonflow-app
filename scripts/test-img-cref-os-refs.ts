/**
 * Goldens: IMG-CREF OS speaker + role-ref credit + SCENE≠cref warn closed loop.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeDialogueSpeaker, normalizeDialogueSpeakers } from "../src/ruleEngine/compilers/normalizeDialogueSpeaker";
import { assertStillIdentityCoverage } from "../src/ruleEngine/compilers/stillIdentityCoverage";
import { assertStillIdentityPreflight } from "../src/ruleEngine/compilers/stillIdentityPreflight";
import { mergeCharacterHints } from "../src/ruleEngine/compilers/hydrateComposeStillContext";
import {
  formatUnresolvedAssetRefWarning,
  formatMissingAssetRowWarning,
} from "../src/ruleEngine/compilers/refWarnMessage";
import { relocateSceneCrefsInTokenTail } from "../src/ruleEngine/compilers/composeStillPrompt";

function ok(name: string, cond: boolean) {
  if (!cond) throw new Error(`FAIL: ${name}`);
  console.log(`✓ ${name}`);
}

// --- speaker normalize ---
ok("strip （OS）", normalizeDialogueSpeaker("沈清漪（OS）").name === "沈清漪");
ok("strip (OS) isOs", normalizeDialogueSpeaker("沈清漪(OS)").isOs === true);
ok("旁白 alone empty", normalizeDialogueSpeaker("旁白").name === "");
ok("list unique bare", normalizeDialogueSpeakers(["沈清漪（OS）", "沈清漪", "沈母"]).join(",") === "沈清漪,沈母");

// --- OS merge into imaged lead ---
const osMerge = assertStillIdentityPreflight({
  characters: [{ code: "CHAR-SHENQINGYI", name: "沈清漪", hasImage: true, kind: "character" }],
  dialogueSpeakers: ["沈清漪（OS）"],
  description: "沈清漪画外独白",
  enforce: true,
});
ok("OS speaker does not invent second face", osMerge.ok === true);

const merged = mergeCharacterHints([{ name: "沈清漪", hasImage: true, kind: "character", code: "CHAR-A" }], {
  dialogueSpeakers: ["沈清漪（OS）"],
});
ok(
  "mergeCharacterHints OS not second",
  merged.filter((c) => c.kind !== "scene").length === 1 && merged[0]?.hasImage === true,
);

type MatrixCase = {
  id: string;
  expect: "pass" | "block";
  code?: string;
  characters: Array<{ code?: string; name?: string; hasImage?: boolean; kind?: "character" | "scene" }>;
  dialogueSpeakers?: string[];
  referenceUrls?: string[];
  promptCrefCodes?: string[];
  description?: string;
};

const matrix = JSON.parse(
  readFileSync(join(process.cwd(), "data/fixtures/still_identity_gate_matrix.json"), "utf8"),
) as {
  cases: MatrixCase[];
  warnCases: Array<{
    id: string;
    code: string;
    source: "cref" | "sref";
    mustInclude: string;
    mustNotInclude: string;
  }>;
};

for (const c of matrix.cases) {
  const r = assertStillIdentityPreflight({
    characters: c.characters,
    dialogueSpeakers: c.dialogueSpeakers,
    referenceUrls: c.referenceUrls,
    promptCrefCodes: c.promptCrefCodes,
    description: c.description,
    enforce: true,
  });
  if (c.expect === "pass") {
    ok(`matrix ${c.id} pass`, r.ok === true);
  } else {
    ok(`matrix ${c.id} block`, r.ok === false && (c.code ? r.code === c.code : true));
  }
}

for (const w of matrix.warnCases) {
  const msg = formatUnresolvedAssetRefWarning(w.code, w.source);
  ok(`warn ${w.id} include`, msg.includes(w.mustInclude));
  ok(`warn ${w.id} exclude`, !msg.includes(w.mustNotInclude));
}

ok("backend SCENE row warn", formatMissingAssetRowWarning("SCENE-001") === "未找到场景资产 SCENE-001");
ok("backend CHAR row warn", formatMissingAssetRowWarning("CHAR-001") === "未找到资产 CHAR-001");

const sceneOnly = assertStillIdentityCoverage({
  characters: [
    { name: "A", hasImage: false },
    { name: "B", hasImage: false },
  ],
  dialogueSpeakers: ["A", "B"],
  referenceUrls: ["https://x/scene/1.png"],
  enforce: true,
});
ok("scene URL never credits dual", sceneOnly.ok === false);

const t = relocateSceneCrefsInTokenTail("--cref CHAR-A SCENE-001 --ar 9:16");
const crefBlock = t.match(/--cref\s+((?!--sref)[^\n]+?)(?=\s+--(?:sref|ar)\b|$)/i)?.[1] ?? "";
ok(
  "SCENE moved to sref",
  /--sref\s+SCENE-001/i.test(t) && crefBlock.includes("CHAR-A") && !/\bSCENE-001\b/.test(crefBlock),
);

assert.ok(true);
console.log("\nAll img-cref-os-refs checks passed.");
