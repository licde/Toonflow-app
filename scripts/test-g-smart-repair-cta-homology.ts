/**
 * Smoke: storyboard MD normalize + one-panel-one-track keys + burn CTA homology + honest BLOCK.
 * Run: npx tsx scripts/test-g-smart-repair-cta-homology.ts
 */
import assert from "node:assert/strict";
import { normalizeStoryboardTableMd } from "../src/ruleEngine/parsers/normalizeStoryboardTableMd";
import { parseStoryboardTable } from "../src/ruleEngine/parsers/storyboardTableParser";
import { buildPrimaryBlock } from "../src/ruleEngine/compilers/primaryBlock";
import { auditCastCoverage } from "../src/ruleEngine/bundle/designExportHelpers";
import type { ScriptBundle } from "../src/ruleEngine/bundle/types";

function ok(name: string, cond: boolean) {
  assert.equal(cond, true, name);
  console.log("ok:", name);
}

// --- table MD glued rows ---
const glued =
  "| 镜 | 类型 | 场景 | 画面描写 | 景别 | 表演 | 台词 | 时长 |\n" +
  "| --- | --- | --- | --- | --- | --- | --- | --- |\n" +
  "| 1 | CHAR-SCENE | 殿 | 沈清漪持休书 | 中景 | 冷 | 沈清漪：休书在此 | 3s || 2 | CHAR-SCENE | 殿 | 沈母侧目 | 近景 | 怒 | 沈母：放肆 | 2s |";

const healed = normalizeStoryboardTableMd(glued);
ok("normalize inserts newline before shot 2", /\|\s*3s\s*\|\n\|\s*2\s*\|/.test(healed) || healed.split("\n").length >= 4);
const shots = parseStoryboardTable(healed);
ok("parse yields 2 shots", shots.length === 2);
ok("shot indexes 0 and 1 (0-based)", shots[0]!.index === 0 && shots[1]!.index === 1);

// --- CTA homology ---
ok("soft_patch CTA = 智能修复", buildPrimaryBlock("soft_patch").ctaLabel === "智能修复");
ok("regen_storyboard_hq CTA = 智能修复", buildPrimaryBlock("regen_storyboard_hq").ctaLabel === "智能修复");
ok("chat_repair CTA = 智能修复", buildPrimaryBlock("chat_repair").ctaLabel === "智能修复");

// --- DC-16 warehouse homology ---
const bundle = {
  characterDesign: {
    assets: [
      {
        code: "CHAR-SHENQINGYI",
        name: "沈清漪",
        L0: { stub: true },
        warehouseHasImage: true,
      },
    ],
  },
  preDesignPack: {
    shots: [
      {
        shotIndex: 1,
        narrative: { dialogue: { lines: [{ speaker: "沈清漪", text: "休书在此" }] } },
      },
    ],
  },
  designBrief: { B6: { characters: ["沈清漪"] } },
} as unknown as ScriptBundle;

const cast = auditCastCoverage(bundle);
ok("warehouse plate clears DC-16 stub false positive", cast.block === false);

// missing CHAR code + warehouse plate → hydrate would seed; audit with warehouseHasImage
const bundleMissingCode = {
  characterDesign: { assets: [] },
  preDesignPack: {
    shots: [
      {
        shotIndex: 1,
        narrative: {
          assetCodes: ["CHAR-SHENQINGYI"],
          dialogue: { lines: [{ speaker: "沈清漪", text: "休书" }] },
        },
      },
    ],
  },
  designBrief: { B6: { characters: ["沈清漪"] } },
} as unknown as ScriptBundle;
// Simulate post-hydrate stamp
(bundleMissingCode.characterDesign as { assets: unknown[] }).assets = [
  {
    code: "CHAR-SHENQINGYI",
    name: "沈清漪",
    L0: { identity: "定妆已入库", fromWarehouse: true, stub: false },
    warehouseHasImage: true,
  },
];
ok("post-hydrate CHAR code clears DC-16", auditCastCoverage(bundleMissingCode).block === false);

// --- track key uniqueness heuristic (mirror assignTrackIds) ---
const panels = [
  { id: 1, index: 1, track: null as string | null },
  { id: 2, index: 2, track: "1" as string | null },
];
const used = new Set<string>();
const keys: string[] = [];
for (const p of panels) {
  let k = String(p.track ?? "").trim();
  if (!k || k === "1" || used.has(k)) {
    k = String(p.index ?? p.id);
    if (used.has(k)) k = `${k}-${p.id}`;
  }
  used.add(k);
  keys.push(k);
}
ok("two panels get distinct track keys", keys[0] !== keys[1]);

// --- burn ↔ smart-repair CTA homology (LANG / face / split / cam / realization) ---
import {
  burnNextStepForSmartRepairTrigger,
  routeSmartRepair,
} from "../src/ruleEngine/quality/smartRepairActuators";

const homologyPairs: Array<[string, string]> = [
  ["LANG-01", "chat_repair"],
  ["lang_vid_mismatch", "chat_repair"],
  ["face_budget_unreachable", "split_shot"],
  ["dialogue_shot_too_wide", "split_shot"],
  ["vis_multi_beat", "split_shot"],
  ["REALIZATION-FACE-READABILITY", "regen_storyboard_hq"],
  ["face_unreadability", "regen_storyboard_hq"],
  ["REALIZATION-MOTION-MISMATCH", "soft_patch"],
  ["cam_speak", "soft_patch"],
];
for (const [trigger, next] of homologyPairs) {
  ok(`burnNextStep(${trigger})=${next}`, burnNextStepForSmartRepairTrigger(trigger) === next);
  const route = routeSmartRepair(trigger);
  ok(`routeSmartRepair(${trigger}) exists`, Boolean(route));
  const primary = buildPrimaryBlock(next as Parameters<typeof buildPrimaryBlock>[0]);
  ok(`primaryBlock(${next}) CTA 智能修复`, primary.ctaLabel === "智能修复");
}

// face budget + compileDialogue ZH shell
import { assessFaceBudget } from "../src/ruleEngine/compilers/faceBudgetPolicy";
import { compileDialogue, compileVoice } from "../src/ruleEngine/compilers/contentFieldCompiler";
import { checkLangVid01 } from "../src/ruleEngine/validators/langAudFxCam";

const unreachable = assessFaceBudget({
  visualDescription: "沈清漪弯腰捡起休书",
  shotSize: "中景",
  hasDialogue: true,
  lipSyncPolicy: "dialogue_native",
  videoIntentClass: "speak_lip",
});
ok("face budget unreachable on MS bow+speak", unreachable.unreachable === true);
ok("face budget CTA confirm_split", unreachable.primaryAction === "confirm_split");

const dialZh = compileDialogue("休书在此", "沈清漪");
ok("compileDialogue ZH shell", /沈清漪：/.test(dialZh) && !/says/i.test(dialZh));
ok("compileVoice ZH", compileVoice("冷冽", true).startsWith("声线："));
const lang = checkLangVid01({
  dialogueLines: "沈清漪：休书在此",
  videoPrompt: `[Audio]\n沈清漪 says "休书在此" (dialogue)\n[Motion]\n站立`,
  shotIndex: 1,
});
ok("LANG-01 BLOCKS says wrapper even with CJK", lang?.severity === "BLOCK");

console.log("PASS test-g-smart-repair-cta-homology");
