/**
 * yarn test:import-asset-quality
 * Static normalize asserts: rewritten SCENE lock, no Chinese-only keys, props, speakers.
 * (DB integration covered separately when RUNTIME matrix available.)
 */
import {
  normalizePreDesignPack,
  rewriteSceneColorLock,
  allocateSceneCodes,
} from "@/ruleEngine/bundle/normalizePreDesignPack";
import {
  shouldRefreshDescribe,
  computeDerivativeSkipReason,
} from "@/ruleEngine/bundle/assetSeedFromBundle";
import { buildCodeAliasMap, resolveAliasedCode } from "@/ruleEngine/codes/assetCodeAlias";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";
import fs from "fs";
import path from "path";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const map = allocateSceneCodes(["沈家祠堂", "卧房"]);
const rewritten = rewriteSceneColorLock({ 沈家祠堂: "暖光3000K", 卧房: "冷光" }, map);
ok("lock keyed by SCENE-001", Boolean(rewritten["SCENE-001"]));
ok("lock has Chinese name", rewritten["SCENE-001"]?.name === "沈家祠堂");
ok("no Chinese keys in rewritten", !Object.keys(rewritten).some((k) => /[\u4e00-\u9fff]/.test(k)));

const bundle = {
  preDesignPack: {
    scriptPlan: "x",
    shots: [
      {
        shotIndex: 1,
        sceneName: "沈家祠堂",
        charCodes: ["CHAR-X"],
        narrative: { dialogue: { lines: [{ speaker: "冬青", text: "是" }] } },
        generation: { imagePrompt: "x --cref CHAR-X" },
      },
    ],
  },
  visualLockTable: { sceneColorLock: { 沈家祠堂: "暖光" } },
  characterDesign: { assets: [{ code: "CHAR-X", name: "萧玄恒", L0: { visual: "男主" } }] },
  planData: {
    globalAnchors: { G4_anchorProps: [{ code: "PROP_TMS", name: "天命书" }, { code: "PROP-DANFANG", name: "丹方" }] },
  },
  debutIntroPack: { props: [{ code: "PROP_TMS", name: "天命书" }] },
} as unknown as ScriptBundle;

const { shots, speakerOrphans, rewrittenSceneLock } = normalizePreDesignPack(bundle);
ok("sceneCode on shot", (shots[0] as { sceneCode?: string }).sceneCode === "SCENE-001");
ok("bundle lock rewritten", Boolean((bundle.visualLockTable as { sceneColorLock: object }).sceneColorLock["SCENE-001"]));
ok("PROP-TMS in anchorProps", Boolean((bundle.visualLockTable as { anchorProps: object }).anchorProps?.["PROP-TMS"]));
ok("PROP-DANFANG in anchorProps", Boolean((bundle.visualLockTable as { anchorProps: object }).anchorProps?.["PROP-DANFANG"]));
ok(
  "speaker 冬青 orphan or CD stub",
  speakerOrphans.some((s) => s.name === "冬青") ||
    Boolean(
      ((bundle.characterDesign as { assets?: { name?: string; L0?: { stub?: boolean } }[] })?.assets ?? []).some(
        (a) => a.name === "冬青" && a.L0?.stub,
      ),
    ),
);
ok("sref present", /--sref\s+SCENE-001/.test(shots[0]?.generation?.imagePrompt ?? ""));
ok("rewrittenSceneLock names", rewrittenSceneLock["SCENE-001"]?.name === "沈家祠堂");

ok("shouldRefreshDescribe SCENE-001", shouldRefreshDescribe("SCENE-001", "SCENE-001"));
ok("shouldRefreshDescribe empty", shouldRefreshDescribe("", "SCENE-001"));
ok("shouldRefreshDescribe keep Chinese", !shouldRefreshDescribe("沈家祠堂", "SCENE-001"));

const arcOnly = computeDerivativeSkipReason([
  { code: "CHAR-A", name: "甲", L6: { arcVisual: "低头→抬头" } },
]);
ok("arcVisual_only skip reason", arcOnly === "arcVisual_only_no_stateVariants");

const digitBundle = {
  characterDesign: {
    assets: [
      { code: "CHAR-SHENQINGCI", name: "沈清瓷" },
      { code: "CHAR-SHENMU", name: "沈母周氏" },
    ],
  },
  preDesignPack: {
    shots: [{ shotIndex: 1, charCodes: ["CHAR-001"], generation: { imagePrompt: "x --cref CHAR-001" } }],
  },
} as unknown as ScriptBundle;
const alias = buildCodeAliasMap(digitBundle);
ok("alias CHAR-001→slug", resolveAliasedCode("CHAR-001", alias) === "CHAR-SHENQINGCI");
ok("alias CHAR-002→沈母", resolveAliasedCode("CHAR-002", alias) === "CHAR-SHENMU");

const goldenPath = path.join(process.cwd(), "data/fixtures/golden/deepseek-20260716-43ce74.json");
if (fs.existsSync(goldenPath)) {
  const golden = JSON.parse(fs.readFileSync(goldenPath, "utf-8")) as ScriptBundle;
  const gAssets =
    (golden.characterDesign as { assets?: { L6?: { arcVisual?: string; stateVariants?: unknown } }[] })?.assets ?? [];
  const skip = computeDerivativeSkipReason(gAssets as Parameters<typeof computeDerivativeSkipReason>[0]);
  ok("43ce74 derivatives=0 skip", skip === "arcVisual_only_no_stateVariants" || skip === "no_L6_stateVariants");
  ok("43ce74 no stateVariants", !gAssets.some((a) => {
    const sv = a.L6?.stateVariants;
    return Array.isArray(sv) ? sv.length > 0 : Boolean(sv && Object.keys(sv as object).length);
  }));
}

if (failed) process.exit(1);
console.log("\n=== test:import-asset-quality OK ===");
