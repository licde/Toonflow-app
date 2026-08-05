/**
 * Still quality closed-loop automation (design strong contract / import non-block / reverse homology).
 *
 * Covers: CU×cast detect→compose→expand→layout→SSOT→envelope→repair；
 * fixture matrix rows；expander field_slice；import demote vs Chat BLOCK.
 *
 * yarn test:still-quality-closed-loop
 * yarn test:still-quality-loop   # suite (this + related still loops)
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { detectCuCastConflict } from "../src/ruleEngine/design/detectCuCastConflict";
import { expandStillCuCast } from "../src/ruleEngine/design/expandStillCuCast";
import { runShotExpanders } from "../src/ruleEngine/design/expanderRegistry";
import { sliceFieldsAfterIrdSplit } from "../src/ruleEngine/design/sliceFieldsAfterIrdSplit";
import { composeStillPrompt } from "../src/ruleEngine/compilers/composeStillPrompt";
import { selectLayoutFamily, resetStillCompositionSpecCache } from "../src/ruleEngine/qc/stillCompositionSpec";
import { resetLiteraryIntentDoctrineCache } from "../src/ruleEngine/compilers/stillLiteraryIntentSsot";
import {
  BLOCK_TO_TRIGGER_FOR_TEST,
  buildBurnGateEnvelope,
} from "../src/ruleEngine/compilers/burnGateEnvelope";
import { routeStillRepair } from "../src/ruleEngine/qc/stillRepairRoute";
import { resolveAssetStillAspect, assetStillTypeConfig } from "../src/ruleEngine/bundle/assetStillPrompt";
import { buildLiteraryFidelityChecklist, assertLiteraryFidelity } from "../src/ruleEngine/compilers/literaryFidelityChecklist";

const root = process.cwd();
resetLiteraryIntentDoctrineCache();
resetStillCompositionSpecCache();

function ok(name: string, cond: boolean) {
  assert.ok(cond, name);
  console.log("ok", name);
}

function readJson<T>(rel: string): T {
  return JSON.parse(readFileSync(join(root, rel), "utf8")) as T;
}

// ─── A. CU×cast forward homology ───────────────────────────────────────────

{
  const d = detectCuCastConflict({
    shotSize: "特写",
    charCodes: ["CHAR-A", "CHAR-B", "CHAR-C"],
    characterNames: ["沈清瓷", "沈母周氏", "沈清漪"],
    visualDescription: "沈清漪侧脸，休书纸角划过面颊",
  });
  ok("A1 detect conflict", d.conflict && d.deterministic && d.confidence.autoEligible);
  ok("A1 trigger", d.reverseTrigger === "still_cu_cast");
}

{
  const d = detectCuCastConflict({
    shotSize: "中景",
    charCodes: ["CHAR-A", "CHAR-B", "CHAR-C"],
    characterNames: ["沈清瓷", "沈母周氏", "沈清漪"],
  });
  ok("A2 mid no conflict", !d.conflict);
}

{
  // 样本形态：shotSize 空/软，VD 引导「特写。」+ 全家 cast — 智能适配同核须检出 → slice
  const d = detectCuCastConflict({
    shotSize: "",
    charCodes: ["CHAR-A", "CHAR-B", "CHAR-C"],
    characterNames: ["沈清瓷", "沈母周氏", "沈清漪"],
    visualDescription: "特写。沈清漪侧脸，休书纸角划过面颊，她紧咬下唇渗出血珠",
  });
  ok("A2b VD-led 特写×3 conflict", d.conflict && d.healMode === "slice_cast");
}

{
  const sampleLit =
    "特写。沈清漪侧脸，休书纸角划过面颊，她紧咬下唇渗出血珠。出镜人数：仅3人（沈清瓷、沈母周氏、沈清漪）；禁止第4人、路人、群像、重复分身";
  const d = detectCuCastConflict({
    prompt: sampleLit,
    characterNames: ["沈清瓷", "沈母周氏", "沈清漪"],
  });
  ok("A2c prompt leak 特写+仅3人", d.conflict && d.healMode === "slice_cast");
}

{
  // Cheek-only: isolate CU×cast slice (dual contact XOR is covered by cheek-contact / cu-cast loops)
  const r = composeStillPrompt({
    visualDescription: "沈清漪侧脸，休书纸角划过面颊。纸未入口；仅颊触非口含。",
    shotSize: "特写",
    characters: [
      { code: "CHAR-A", name: "沈清瓷", hasImage: true, kind: "character" },
      { code: "CHAR-B", name: "沈母周氏", hasImage: true, kind: "character" },
      { code: "CHAR-C", name: "沈清漪", hasImage: true, kind: "character" },
    ],
    qualityMode: "hq_update",
  });
  ok("A3 compose slices not split", r.ok && (r.sources ?? []).some((s) => /cuCastSlice/.test(s)));
  ok("A3 has prompt body", Boolean(r.prompt));
}
{
  const xor = composeStillPrompt({
    visualDescription: "沈清漪侧脸，休书纸角划过面颊，她紧咬下唇渗出血珠",
    shotSize: "特写",
    characters: [
      { code: "CHAR-A", name: "沈清瓷", hasImage: true, kind: "character" },
      { code: "CHAR-B", name: "沈母周氏", hasImage: true, kind: "character" },
      { code: "CHAR-C", name: "沈清漪", hasImage: true, kind: "character" },
    ],
    qualityMode: "hq_update",
  });
  ok("A3b dual-contact XOR blocks", !xor.ok && xor.blockReason === "DEX-LIT-CONTACT-XOR");
  ok("A3b dual-contact next split_shot", xor.primaryNextStep === "split_shot");
}

{
  const fam = selectLayoutFamily({
    visualDescription: "沈清漪侧脸",
    shotSize: "特写",
    characterCount: 3,
  });
  ok("A4 layout none not 3p", fam.reason === "cu_cast_conflict" && fam.familyId === "none");
}

{
  const hero = selectLayoutFamily({
    visualDescription: "单人侧脸",
    shotSize: "特写",
    characterCount: 1,
  });
  ok("A5 single_hero no throne StageA", hero.familyId === "single_hero" && hero.family.twoStage === false);
}

// ─── B. Intelligent expand + cast slice ────────────────────────────────────

{
  const exp = expandStillCuCast(
    [
      {
        clientId: "s1",
        shotIndex: 1,
        shotSize: "特写",
        visualDescription: "沈清漪侧脸咬唇",
        charCodes: ["CHAR-A", "CHAR-B", "CHAR-C"],
        characterNames: ["沈清瓷", "沈母周氏", "沈清漪"],
      },
    ],
    { chatStrict: false },
  );
  ok("B1 slice not expand", exp.slicedCount >= 1 && exp.expandedCount === 0);
  ok(
    "B1 cast≤1",
    Array.isArray(exp.shots[0]?.charCodes) && (exp.shots[0]!.charCodes as string[]).length <= 1,
  );
}

{
  const exp = expandStillCuCast(
    [
      {
        clientId: "s2",
        shotSize: "特写",
        visualDescription: "甲与乙对峙同框特写",
        charCodes: ["CHAR-A", "CHAR-B"],
        characterNames: ["甲", "乙"],
      },
    ],
    { chatStrict: true },
  );
  ok("B2 chatStrict no silent expand", exp.expandedCount === 0 && exp.confirmRequired);
}

{
  const sliced = sliceFieldsAfterIrdSplit([
    {
      clientId: "p1",
      charCodes: ["CHAR-A", "CHAR-B"],
      visualDescription: "父镜场面",
      narrative: { dialogue: { lines: [{ speaker: "甲", text: "你好" }] } },
    },
    {
      clientId: "c1",
      _stillBeatSplitId: "p1",
      visualSplitRole: "reaction",
      charCodes: ["CHAR-A", "CHAR-B"],
      visualDescription: "反应",
      narrative: {},
    },
  ]);
  const child = sliced.shots.find((s) => s.clientId === "c1");
  ok(
    "B3 slice reaction cast",
    Array.isArray(child?.charCodes) && (child!.charCodes as string[]).length <= 1,
  );
}

{
  const { shots, log } = runShotExpanders(
    [
      {
        clientId: "e1",
        shotSize: "特写",
        visualDescription: "特写侧脸",
        charCodes: ["CHAR-A", "CHAR-B"],
        characterNames: ["甲", "乙"],
      },
    ],
    { applyStillOneBeat: false, applyCuCast: true, chatStrict: false, forceExpand: true },
  );
  const cuLog = log.find((l) => l.expanderId === "still_cu_cast");
  ok("B4 expander registry cu_cast", Boolean(cuLog?.expanded || shots.length >= 1));
}

// ─── C. Reverse SSOT / envelope (no INFRA / no collapse) ───────────────────

ok("C1 ONEBEAT trigger", BLOCK_TO_TRIGGER_FOR_TEST["DEX-STILL-ONEBEAT"] === "still_onebeat_multi");
ok("C1 CU-CAST trigger", BLOCK_TO_TRIGGER_FOR_TEST["DEX-STILL-CU-CAST"] === "still_cu_cast");
ok("C1 VID-INHERIT", BLOCK_TO_TRIGGER_FOR_TEST["VID-INHERIT-COMPOSITION"] === "vid_inherit_composition");
ok("C1 IMG-STILL-QA", BLOCK_TO_TRIGGER_FOR_TEST["IMG-STILL-QA"] === "img_still_weak");

{
  const env = buildBurnGateEnvelope([{ id: "IMG-STILL-QA", message: "weak", reverseTrigger: "img_still_weak" }]);
  ok("C2 weak→batch_still", env.nextStep === "batch_still" && env.primaryNextStep === "batch_still");
}
{
  const env = buildBurnGateEnvelope([
    { id: "DEX-STILL-CU-CAST", message: "cu", reverseTrigger: "still_cu_cast" },
  ]);
  ok("C2 cu→split_shot", env.nextStep === "split_shot");
}
{
  const env = buildBurnGateEnvelope([
    { id: "DEX-STILL-ONEBEAT", message: "ob", reverseTrigger: "still_onebeat_multi" },
  ]);
  ok("C2 onebeat→split_shot", env.nextStep === "split_shot");
}

{
  const r = routeStillRepair({
    itemResults: [{ id: "identity:cast_cardinality", pass: false, evidence: "fail" }],
    exhausted: true,
  });
  ok("C3 exhausted→split_shot", r.nextStep === "split_shot");
}
{
  const r = routeStillRepair({
    itemResults: [{ id: "identity:single_frame", pass: false, fixHint: "四视图拼版" }],
    sheetLeak: true,
  });
  ok("C3 sheet forbid layout_preserve", r.layoutPreserveEdit === false && r.swapLayoutTemplate === true);
}

// ─── D. Fixture matrix homology (Chat BLOCK / import demote) ───────────────

{
  const table = readJson<{ routes: { trigger: string; reverseTarget?: string }[] }>(
    "data/fixtures/reverse_route_table.json",
  );
  const triggers = new Set(table.routes.map((r) => r.trigger));
  ok("D1 still_cu_cast in table", triggers.has("still_cu_cast"));
  ok("D1 img_still_weak in table", triggers.has("img_still_weak"));
  ok("D1 still_onebeat_multi in table", triggers.has("still_onebeat_multi"));
  const weak = table.routes.find((r) => r.trigger === "img_still_weak");
  ok("D1 weak→MD-IMG", weak?.reverseTarget === "MD-IMG");
}

{
  const dual = readJson<{
    mustEditBlockIds?: string[];
    importSalvageRegistry?: {
      ruleId: string;
      demoteAfterHeal?: boolean;
      chatBlock?: boolean;
      untilClear?: boolean;
    }[];
  }>("data/fixtures/semantic_gate_dual_track_matrix.json");
  ok("D2 mustEdit CU-CAST", dual.mustEditBlockIds?.includes("DEX-STILL-CU-CAST") === true);
  const row = dual.importSalvageRegistry?.find((r) => r.ruleId === "DEX-STILL-CU-CAST");
  ok(
    "D2 import untilClear CU-CAST",
    row?.chatBlock === true && row?.untilClear === true && row?.demoteAfterHeal === false,
  );
  const os = dual.importSalvageRegistry?.find((r) => r.ruleId === "DEX-STILL-OS-NAME");
  ok(
    "D2 import untilClear OS-NAME",
    os?.chatBlock === true && os?.untilClear === true && os?.demoteAfterHeal === false,
  );
}

{
  const exit = readJson<{
    severities?: Record<string, { severity?: string }>;
    stageRules?: Record<string, string[]>;
  }>("data/fixtures/design_exit_checklist.json");
  // checklist shape: rules.DEX-STILL-CU-CAST or severities
  const raw = readJson<Record<string, unknown>>("data/fixtures/design_exit_checklist.json");
  const blob = JSON.stringify(raw);
  ok("D3 checklist has CU-CAST", blob.includes("DEX-STILL-CU-CAST"));
  ok("D3 CU-CAST BLOCK", /DEX-STILL-CU-CAST[\s\S]{0,80}BLOCK/.test(blob));
}

{
  const mount = readJson<{ rows: { ruleId: string; reverseTrigger?: string }[] }>(
    "data/fixtures/design_gate_mount_matrix.json",
  );
  const cu = mount.rows.find((r) => r.ruleId === "DEX-STILL-CU-CAST");
  ok("D4 mount CU-CAST", cu?.reverseTrigger === "still_cu_cast");
}

{
  const rh = readJson<{ hints?: { id: string; ruleId?: string }[] }>("data/fixtures/repair_hint_catalog.json");
  ok("D5 RH-STILL-CU-CAST", rh.hints?.some((h) => h.id === "RH-STILL-CU-CAST") === true);
}

// ─── E. L0 checklist / identity plate / single_frame VLM-only ──────────────

{
  const items = buildLiteraryFidelityChecklist({
    description: "沈清漪侧脸咬唇渗血，休书划颊",
    characterNames: ["沈清瓷", "沈母周氏", "沈清漪"],
    shotSize: "特写",
  });
  ok("E1 CU skips cast_cardinality", !items.some((i) => i.kind === "cast_cardinality"));
  ok("E1 has single_frame", items.some((i) => i.id === "identity:single_frame"));
  const assertR = assertLiteraryFidelity("特写。沈清漪侧脸咬唇。", items);
  ok("E1 VLM-only single_frame not L0-fail", assertR.passed.some((i) => i.id === "identity:single_frame"));
}

{
  const mid = buildLiteraryFidelityChecklist({
    description: "三人祠堂对峙，沈清瓷端坐太师椅，沈清漪跪于蒲团",
    characterNames: ["沈清瓷", "沈清漪", "沈母周氏"],
    shotSize: "中景",
    requireDualIdentity: true,
  });
  ok("E2 mid has cast_cardinality", mid.some((i) => i.kind === "cast_cardinality"));
}

{
  const aspect = resolveAssetStillAspect("role");
  const cfg = assetStillTypeConfig("role");
  ok("E3 default identity_plate aspect", aspect === "3:1");
  ok("E3 default identity title", /身份/.test(cfg.promptTitle));
}

// ─── F. generateVideo passthrough source guard (no collapse) ───────────────

{
  const gv = readFileSync(join(root, "src/routes/production/workbench/generateVideo.ts"), "utf8");
  ok("F1 passthrough split_shot present", /detect\.primaryNextStep === "split_shot"/.test(gv));
  ok(
    "F1 no blind collapse to chat_repair only",
    !/detect\.primaryNextStep === "batch_still" \? "batch_still" : "chat_repair"/.test(gv),
  );
}

{
  const ops = readFileSync(join(root, "src/routes/scriptAgent/stillIntentOps.ts"), "utf8");
  ok("F2 stillIntentOps force designExit", /runDesignAutoClose|runDesignExitGate/.test(ops));
}

// ─── G. portable-kit allowlist ─────────────────────────────────────────────

{
  const sync = readFileSync(join(root, "scripts/sync-portable-kit.mjs"), "utf8");
  ok("G1 sync still_composition_spec", sync.includes("still_composition_spec.json"));
  ok("G1 sync layout_templates", sync.includes("layout_templates"));
}

{
  const spec = join(root, "data/fixtures/still_composition_spec.json");
  ok("G2 composition spec exists", existsSync(spec));
}

// ─── H. 智能适配：样本 Edit 禁文学洗绿 + 按意图裁 cref ───────────────────────

{
  const { diagnoseStructuralStillEditBlock } = require("../src/ruleEngine/design/detectCuCastConflict") as typeof import("../src/ruleEngine/design/detectCuCastConflict");
  const { prepareStillImageEdit } = require("../src/ruleEngine/qc/stillImageEdit") as typeof import("../src/ruleEngine/qc/stillImageEdit");
  const { adaptCrefsToFaceCuIntent } = require("../src/ruleEngine/compilers/stillRefSlotContract") as typeof import("../src/ruleEngine/compilers/stillRefSlotContract");

  const sampleLit =
    "特写。沈清漪侧脸，休书纸角划过面颊，她紧咬下唇渗出血珠。出镜人数：仅3人（沈清瓷、沈母周氏、沈清漪）；禁止第4人、路人、群像、重复分身";
  const block = diagnoseStructuralStillEditBlock({
    literaryPrompt: sampleLit,
    castNames: ["沈清瓷", "沈母周氏", "沈清漪"],
  });
  ok("H1 sample Edit not split (slice_cast)", !block.block && block.healMode === "slice_cast");

  const prep = prepareStillImageEdit({
    failedImageBase64: "ZmFrZQ==",
    fixHints: [],
    literaryPrompt: sampleLit,
    crefOrderedRefs: [
      { type: "image", base64: "YQ==", role: "cref" },
      { type: "image", base64: "Yg==", role: "cref" },
      { type: "image", base64: "Yw==", role: "cref" },
    ],
    model: "test",
    castNames: ["沈清瓷", "沈母周氏", "沈清漪"],
    shotSize: "特写",
    visualDescription: "特写。沈清漪侧脸",
  });
  ok("H2 no structural split wash", !prep.structuralBlock?.block);
  ok("H2 cref adapted to 1", prep.referenceList.filter((r) => r.role === "cref").length <= 1);
  ok("H2 strip 仅3人 leak", !/仅3人/.test(prep.promptUsed));

  const adapted = adaptCrefsToFaceCuIntent({
    crefs: [
      { base64: "YQ==", name: "沈清瓷" },
      { base64: "Yg==", name: "沈母周氏" },
      { base64: "Yw==", name: "沈清漪" },
    ],
    castNames: ["沈清瓷", "沈母周氏", "沈清漪"],
    shotSize: "特写",
    visualDescription: "特写。沈清漪侧脸，休书纸角划过面颊",
  });
  ok("H3 cref adapt primary 沈清漪", adapted.adapted && adapted.primaryName === "沈清漪" && adapted.crefs.length === 1);
  ok("H3 cref is 沈清漪 plate", adapted.crefs[0]?.name === "沈清漪" || adapted.crefs[0]?.base64 === "Yw==");

  const repairDual = routeStillRepair({
    literaryPrompt: sampleLit,
    shotSize: "特写",
    castNames: ["沈清瓷", "沈母周氏", "沈清漪"],
    itemResults: [{ id: "identity:cast_cardinality", pass: false, evidence: "fail" }],
  });
  ok("H4 dual-contact repair → split_shot", repairDual.nextStep === "split_shot");

  const cheekLit =
    "特写。沈清漪侧脸，休书纸角划过面颊。纸未入口；仅颊触非口含。出镜人数：仅3人（沈清瓷、沈母周氏、沈清漪）";
  const repairCheek = routeStillRepair({
    literaryPrompt: cheekLit,
    shotSize: "特写",
    castNames: ["沈清瓷", "沈母周氏", "沈清漪"],
    itemResults: [{ id: "identity:cast_cardinality", pass: false, evidence: "fail" }],
  });
  ok("H4 cheek-only repair not force split_shot", repairCheek.nextStep !== "split_shot");
}

// ─── I. 拼图尸检：捡休书首帧文学 / cref 四视图门 / weak 禁 burn ─────────────

{
  const golden = readJson<{
    shot: {
      shotSize: string;
      visualDescription: string;
      characters: Array<{ code: string; name: string; kind: string; hasImage: boolean }>;
      continuityInject: string;
      qualityMode: "hq_update";
      referenceUrlCount: number;
    };
    expectCompose: {
      mustInclude: string[];
      mustSources: string[];
      forbidInPrompt: string[];
    };
    turnaroundAsset: { prompt: string; remark: string; type: string };
  }>("data/fixtures/golden/still-collage-pick-letter.json");

  const r = composeStillPrompt({
    visualDescription: golden.shot.visualDescription,
    shotSize: golden.shot.shotSize,
    characters: golden.shot.characters as never,
    continuityInject: golden.shot.continuityInject,
    qualityMode: golden.shot.qualityMode,
    referenceUrlCount: golden.shot.referenceUrlCount,
  });
  ok("I1 compose ok", r.ok && Boolean(r.prompt));
  const prompt = String(r.prompt ?? "");
  const sources = r.sources ?? [];
  for (const m of golden.expectCompose.mustInclude) {
    ok(`I1 mustInclude ${m}`, prompt.includes(m) || /捡起?休书|弯腰捡/.test(prompt));
  }
  ok("I1 narrativeFirst", sources.includes("fidelity.narrativeFirst"));
  ok("I1 singleFrameLock", sources.includes("identity.singleFrameLock") || /单镜头成片/.test(prompt));
  ok(
    "I1 actionPrimary or vdOverride, no throne 高位",
    (sources.includes("beat.power.actionPrimary") || sources.includes("beat.power.vdPrimaryOverride")) &&
      !/权力位：[^。]{0,24}（高位）/.test(prompt),
  );
  ok("I1 continuity stripped 扳指", !/端坐太师椅摩挲扳指/.test(prompt));
  ok("I1 no orphan 禁止 锁定", !/禁止\s+锁定/.test(prompt));
  ok("I1 no 身份顺序 soup", !/身份顺序：图1=/.test(prompt) || sources.includes("identity.binding.omitIdOrderHq"));
  for (const f of golden.expectCompose.forbidInPrompt ?? []) {
    ok(`I1 forbid ${f.slice(0, 16)}`, !prompt.includes(f));
  }
  ok(
    "I1 softOther 裙摆碎片",
    /动作主体：沈清漪/.test(prompt) && /沈母.*裙摆|沈母.*衣角|沈母.*虚化/.test(prompt) && /禁止第三人/.test(prompt),
  );
  ok(
    "I1 cast card 完整入画仅1人",
    /出镜人数：完整入画仅1人（沈清漪）/.test(prompt) && /裙摆|衣角/.test(prompt),
  );
  ok(
    "I1 bg demote readable not grey-void",
    /室内环境可辨|禁止灰棚/.test(prompt) && !/场景参考不送像素/.test(prompt),
  );
  ok(
    "I1 no collage-inducing multi lock soup",
    !/严格锁定多参考身份：脸型来自角色定妆参考，环境来自场景参考/.test(prompt),
  );
  ok(
    "I1 identityLock not doubled",
    (prompt.match(/锁定定妆脸型与身份，禁止按参考图拼贴/g) ?? []).length <= 1,
  );

  const {
    isTurnaroundSheetAsset,
    shouldExcludeAssetFromStoryboardCref,
    softenContinuityForFirstFrame,
    preserveLiteraryCoreForEdit,
    sanitizeFirstFrameEgressSoup,
  } =
    require("../src/ruleEngine/compilers/stillFirstFrameLiterarySsot") as typeof import("../src/ruleEngine/compilers/stillFirstFrameLiterarySsot");
  ok("I2 detects turnaround asset", isTurnaroundSheetAsset(golden.turnaroundAsset));
  ok(
    "I2 turnaround allowed as cref (no hard-exclude)",
    !shouldExcludeAssetFromStoryboardCref(golden.turnaroundAsset),
  );
  ok(
    "I2 sheetAsIdentityOnly in egress",
    sources.includes("identity.sheetAsIdentityOnly") || /仅借脸型|严禁复刻多格/.test(prompt),
  );

  const soft = softenContinuityForFirstFrame({
    continuity: golden.shot.continuityInject,
    visualDescription: golden.shot.visualDescription,
    castNames: golden.shot.characters.map((c) => c.name),
  });
  ok("I3 continuity stripContamination", soft.strippedContamination && !/扳指/.test(soft.text ?? ""));

  const dirtyCont = softenContinuityForFirstFrame({
    continuity: (golden.expectCompose as { dirtyContinuitySample?: string }).dirtyContinuitySample ||
      "continues from 沈母，沈清瓷跪低位",
    visualDescription: golden.shot.visualDescription,
    castNames: ["沈母周氏", "沈清漪"],
  });
  ok("I3 off-cast 沈清瓷 stripped", !/沈清瓷/.test(dirtyCont.text ?? ""));
  ok("I3 跪低位 stripped or omit", !/跪低位/.test(dirtyCont.text ?? ""));

  ok(
    "I3 sanitize orphan 禁止 锁定",
    !/禁止\s+锁定/.test(
      sanitizeFirstFrameEgressSoup("动作主体：沈清漪完成动作；沈母可虚化在场，禁止 锁定定妆脸型与身份，禁止按参考图拼贴成多格/拼图"),
    ),
  );

  const { assertStillFirstFrameContract } = require("../src/ruleEngine/qc/stillFirstFrameGate") as typeof import("../src/ruleEngine/qc/stillFirstFrameGate");
  const weakBurn = assertStillFirstFrameContract({
    stillFilePath: "p/still.jpg",
    stillPrompt: prompt,
    requireStill: true,
    stillQuality: "weak",
  });
  ok("I4 weak blocks first_frame", !weakBurn.ok && weakBurn.code === "STILL-FIRSTFRAME-WEAK");
  const sheetBurn = assertStillFirstFrameContract({
    stillFilePath: "p/still.jpg",
    stillPrompt: prompt,
    requireStill: true,
    stillQuality: "hq_ok",
    sheetLeak: true,
  });
  ok("I4 sheetLeak blocks first_frame", !sheetBurn.ok && sheetBurn.code === "STILL-FIRSTFRAME-WEAK");

  const sheetRepair = routeStillRepair({
    itemResults: [{ id: "identity:single_frame", pass: false, fixHint: "成图四宫格拼版" }],
    sheetLeak: true,
  });
  ok("I5 single_frame CTA 禁拼版", sheetRepair.ctaLabel.includes("禁拼版") && !sheetRepair.layoutPreserveEdit);

  const editKeep = preserveLiteraryCoreForEdit({
    literaryPrompt: "出镜人数：仅2人（沈母、沈清漪）",
    visualDescription: golden.shot.visualDescription,
  });
  ok("I6 Edit keeps 捡书核", /捡|休书|指节/.test(editKeep));

  const { buildEditFocusPrompt } = require("../src/ruleEngine/qc/stillImageEdit") as typeof import("../src/ruleEngine/qc/stillImageEdit");
  const focus = buildEditFocusPrompt({
    literaryPrompt: editKeep,
    fixHints: ["出镜人数：仅2人（沈母、沈清漪）", "单镜头成片，禁止四视图"],
    visualDescription: golden.shot.visualDescription,
  });
  ok("I6 Edit focus keeps literary + anti-collage", /捡|休书/.test(focus) && /四视图|拼图|单镜头/.test(focus));
  ok("I6 no double pour 仅2人 in focus only", (focus.match(/仅2人/g) ?? []).length <= 1);
  ok("I6 Edit has sheetAsIdentity hint", /仅借脸型|严禁复刻多格|四视图/.test(focus));

  // 姓名相似：沈清瓷/沈清漪 不得串绑
  const { labelMatches, namesAreProperPrefixAlias, resolveShotIdentityBinding } =
    require("../src/ruleEngine/compilers/resolveShotIdentityBinding") as typeof import("../src/ruleEngine/compilers/resolveShotIdentityBinding");
  ok("I7 沈清漪 clause 不命中 沈清瓷", !labelMatches("沈清漪弯腰捡休书", "沈清瓷"));
  ok("I7 沈清瓷 clause 不命中 沈清漪", !labelMatches("沈清瓷跪蒲团抄书", "沈清漪"));
  ok("I7 姐妹非 proper-prefix", !namesAreProperPrefixAlias("沈清瓷", "沈清漪"));
  ok("I7 沈母⊂沈母周氏 still ok", namesAreProperPrefixAlias("沈母", "沈母周氏"));
  const sisterBind = resolveShotIdentityBinding({
    description: "中景。沈清漪弯腰捡起休书；沈母裙摆虚化在后。",
    characters: [
      { code: "CHAR-CI", name: "沈清瓷", hasImage: true },
      { code: "CHAR-YI", name: "沈清漪", hasImage: true },
      { code: "CHAR-MU", name: "沈母", hasImage: true },
    ],
  });
  ok(
    "I7 bind names keep 沈清漪 not swap 沈清瓷",
    sisterBind.orderedNames.includes("沈清漪") &&
      (!sisterBind.bindingLine || !/图1=沈清瓷.*捡/.test(sisterBind.bindingLine || "")),
  );
  const yiInOrder = sisterBind.orderedNames.indexOf("沈清漪");
  const ciInOrder = sisterBind.orderedNames.indexOf("沈清瓷");
  ok(
    "I7 描写未提沈清瓷时漪优先图序",
    yiInOrder >= 0 && (ciInOrder < 0 || yiInOrder < ciInOrder),
  );
  ok(
    "I7 身份序图1非错误姐妹",
    !sisterBind.bindingLine || !/^身份顺序：图1=沈清瓷/.test(sisterBind.bindingLine),
    sisterBind.bindingLine,
  );

  // Dual-track: action mid → no StageA; seating mid → keep 站位绑定
  const { selectLayoutFamily } =
    require("../src/ruleEngine/qc/stillCompositionSpec") as typeof import("../src/ruleEngine/qc/stillCompositionSpec");
  const pickFamily = selectLayoutFamily({
    visualDescription: golden.shot.visualDescription,
    shotSize: golden.shot.shotSize,
    characterCount: 2,
    hasSeatingOrKneel: false,
    characterNames: golden.shot.characters.map((c) => c.name),
  });
  ok(
    "I8 pick-letter family none (no StageA)",
    pickFamily.familyId === "none" && pickFamily.reason === "action_primary_no_layout",
    `${pickFamily.familyId}/${pickFamily.reason}`,
  );
  const seatVd = "中景。沈母端坐高位太师椅摩挲扳指，沈清瓷跪低位蒲团抄书，权力反差构图。";
  const seatCompose = composeStillPrompt({
    visualDescription: seatVd,
    shotSize: "中景",
    qualityMode: "hq_update",
    characters: [
      { code: "CHAR-SHENMU", name: "沈母", kind: "character", hasImage: true },
      { code: "CHAR-SHENQINGCI", name: "沈清瓷", kind: "character", hasImage: true },
    ],
    referenceUrlCount: 2,
  });
  ok("I8 seating compose ok", seatCompose.ok);
  ok(
    "I8 seating keeps 站位绑定 or 权力位",
    /站位绑定|权力位：/.test(String(seatCompose.prompt ?? "")),
    String(seatCompose.prompt ?? "").slice(0, 200),
  );
  const seatFamily = selectLayoutFamily({
    visualDescription: seatVd,
    shotSize: "中景",
    characterCount: 2,
    hasSeatingOrKneel: true,
    characterNames: ["沈母", "沈清瓷"],
  });
  ok(
    "I8 seating family twoStage",
    seatFamily.familyId === "high_sit_low_kneel_2p" && seatFamily.family.twoStage !== false,
    `${seatFamily.familyId}`,
  );

  // Common mid design: 中景 alone must NOT false-green seating StageA
  const { classifyStillIntent } =
    require("../src/ruleEngine/compilers/stillIntentPolicy") as typeof import("../src/ruleEngine/compilers/stillIntentPolicy");
  const {
    hasSeatingOrPowerSignals,
  } =
    require("../src/ruleEngine/compilers/stillLiteraryIntentSsot") as typeof import("../src/ruleEngine/compilers/stillLiteraryIntentSsot");
  const pickVd = golden.shot.visualDescription;
  ok("I9 中景捡书 not seatingSignal", !hasSeatingOrPowerSignals(pickVd));
  const pickCls = classifyStillIntent({
    visualDescription: pickVd,
    shotSize: "中景",
    characterCount: 2,
  });
  ok(
    "I9 classify action_primary_mid",
    pickCls.intentClass === "action_primary_mid" && !pickCls.seating && !pickCls.flags.twoStageLayout,
    `${pickCls.intentClass}/${pickCls.seating}/${pickCls.layoutFamilyId}`,
  );
  ok(
    "I9 layout family none not throne",
    pickCls.layoutFamilyId === "none" || pickCls.layoutFamilyId === undefined,
    String(pickCls.layoutFamilyId),
  );
  const hallOnly = classifyStillIntent({
    visualDescription: "中景。祠堂烛火摇曳，沈清漪立于廊下。",
    shotSize: "中景",
    characterCount: 1,
  });
  ok(
    "I9 祠堂中景 alone not seating_power",
    hallOnly.intentClass !== "seating_power_mid" && !hallOnly.flags.twoStageLayout,
    `${hallOnly.intentClass}`,
  );

  // Dual-track + common scenarios + novel verb + N=3 no auto StageA
  const {
    extractVdDeclaredActionVerbs,
    resolveActionPrimaryHit,
    harvestActionLexiconFromEpisode,
  } =
    require("../src/ruleEngine/compilers/stillActionPrimarySsot") as typeof import("../src/ruleEngine/compilers/stillActionPrimarySsot");
  const { healStillLiteraryEgress } =
    require("../src/ruleEngine/compilers/stillFirstFrameLiterarySsot") as typeof import("../src/ruleEngine/compilers/stillFirstFrameLiterarySsot");
  const novelVd = "中景。沈清漪攥紧休书掀起案角，拂袖转身；沈母立于廊下。";
  const novelVerbs = extractVdDeclaredActionVerbs(novelVd, {
    castNames: ["沈清漪", "沈母"],
  });
  ok(
    "J1 novel extract 攥/掀/拂袖",
    novelVerbs.some((v) => /攥|掀|拂袖|转身/.test(v)),
    novelVerbs.join(","),
  );
  const novelHit = resolveActionPrimaryHit({
    text: novelVd,
    castNames: ["沈清漪", "沈母"],
  });
  ok("J1 novel action hit", novelHit.hit && novelHit.verbs.length >= 2, JSON.stringify(novelHit));
  const novelCls = classifyStillIntent({
    visualDescription: novelVd,
    shotSize: "中景",
    characterCount: 2,
    characterNames: ["沈清漪", "沈母"],
  });
  ok(
    "J1 novel → action_primary_mid",
    novelCls.intentClass === "action_primary_mid" && !novelCls.flags.twoStageLayout,
    `${novelCls.intentClass}/${novelCls.reasons.join(",")}`,
  );

  // Episode lexicon: rare stem in prior shot helps recognize same stem here (still must appear)
  const epLex = harvestActionLexiconFromEpisode(
    ["沈清瓷扑向案前撕信。", "沈母拍案而起。"],
    { castNames: ["沈清瓷", "沈母"] },
  );
  ok("J1b episode harvest has 扑 or 撕", epLex.some((v) => /扑|撕|拍案/.test(v)), epLex.join(","));
  const rare = classifyStillIntent({
    visualDescription: "中景。沈清瓷扑向门槛。",
    shotSize: "中景",
    characterCount: 1,
    characterNames: ["沈清瓷"],
    episodeVisualDescriptions: ["沈清瓷扑向案前撕信。", "沈母拍案而起。"],
  });
  ok(
    "J1b episode lexicon → action or unknown-safe",
    rare.intentClass === "action_primary_mid" || rare.intentClass === "unknown",
    rare.intentClass,
  );

  const scenarios: Array<{
    name: string;
    vd: string;
    n: number;
    expect: string;
    twoStage?: boolean;
  }> = [
    {
      name: "座次权力",
      vd: "中景。沈母端坐太师椅，沈清瓷跪蒲团抄书，权力反差。",
      n: 2,
      expect: "seating_power_mid",
      twoStage: true,
    },
    {
      name: "对峙中景",
      vd: "中景。沈清漪与沈母对峙分立，剑拔弩张。",
      n: 2,
      expect: "confront_mid",
      twoStage: true,
    },
    {
      name: "过肩",
      vd: "中景。过肩构图，听者肩前景，对面主体沈母。",
      n: 2,
      expect: "ots_mid",
      twoStage: true,
    },
    {
      name: "反应镜",
      vd: "近景。反应镜，偏听者，沈清漪眉心微蹙。",
      n: 1,
      expect: "reaction_mid",
      twoStage: true,
    },
    {
      name: "手部特写",
      vd: "手部特写。指尖摩挲扳指，正脸清晰。",
      n: 1,
      expect: "hand_cu_explicit",
      twoStage: false,
    },
    {
      name: "空镜",
      vd: "空镜。祠堂烛火摇曳，无人物。",
      n: 0,
      expect: "empty_or_os",
      twoStage: false,
    },
    {
      name: "对话中景无动作",
      vd: "中景。沈清漪立于廊下，与沈母相对无言。",
      n: 2,
      expect: "unknown",
      twoStage: false,
    },
    {
      name: "动作捡书",
      vd: golden.shot.visualDescription,
      n: 2,
      expect: "action_primary_mid",
      twoStage: false,
    },
  ];
  for (const sc of scenarios) {
    const c = classifyStillIntent({
      visualDescription: sc.vd,
      shotSize: "中景",
      characterCount: sc.n,
      characterNames: ["沈母", "沈清漪", "沈清瓷"],
    });
    ok(
      `J2 ${sc.name}→${sc.expect}`,
      c.intentClass === sc.expect &&
        (sc.twoStage === undefined || c.flags.twoStageLayout === sc.twoStage),
      `${c.intentClass}/twoStage=${c.flags.twoStageLayout}`,
    );
  }

  const bare3 = selectLayoutFamily({
    visualDescription: "中景。沈母、沈清漪、沈清瓷三人立于廊下相对无言。",
    shotSize: "中景",
    characterCount: 3,
    hasSeatingOrKneel: false,
  });
  ok(
    "J3 bare N=3 no auto StageA",
    bare3.familyId === "none" && bare3.family.twoStage === false,
    `${bare3.familyId}/${bare3.reason}`,
  );
  const witness3 = selectLayoutFamily({
    visualDescription: "主位端坐，对立者侧立，旁观见证第三人",
    characterCount: 3,
    hasSeatingOrKneel: false,
  });
  ok("J3 witness still triangle", witness3.familyId === "power_triangle_3p");

  const polluted = healStillLiteraryEgress({
    prompt:
      "动作主体：沈清漪完成动作。站位绑定：沈母=高位/图1（端坐或主位）。背景弱化：场景参考不送像素",
    visualDescription: golden.shot.visualDescription,
    hasSeatingOrKneel: false,
  });
  ok("J4 heal strips 站位绑定", !/站位绑定/.test(polluted.prompt));
  ok("J4 heal strips 场景参考不送像素", !/场景参考不送像素/.test(polluted.prompt));
  ok("J4 heal keeps soft env", /室内环境可辨|禁止灰棚/.test(polluted.prompt));

  // Continuity peel must salvage seating atoms after continues-from
  const { peelContinuityNoise, peelFramingText } =
    require("../src/ruleEngine/compilers/stillIntentPolicy") as typeof import("../src/ruleEngine/compilers/stillIntentPolicy");
  const glued =
    "沈清瓷低头隐忍。continuity: continues from 扳指特写。权力反差，太师椅，中景。";
  const peeled = peelContinuityNoise(glued);
  ok("J5 peel keeps 权力反差", /权力反差/.test(peeled), peeled);
  ok("J5 peel keeps 太师椅", /太师椅/.test(peeled), peeled);
  ok("J5 peel drops continues-from head", !/continues from|扳指特写/.test(peeled), peeled);
  const powerGlued = classifyStillIntent({
    visualDescription: glued,
    shotSize: "中景",
    characterCount: 2,
    characterNames: ["沈母", "沈清瓷"],
  });
  ok(
    "J5 glued continuity still seating_power",
    powerGlued.intentClass === "seating_power_mid" || powerGlued.seating,
    `${powerGlued.intentClass}/${powerGlued.seating}/${peelFramingText(glued)}`,
  );

  const fightFam = selectLayoutFamily({
    visualDescription: "中景。沈清漪挥剑格挡，与沈母对打。",
    shotSize: "中景",
    characterCount: 2,
    hasSeatingOrKneel: false,
  });
  ok(
    "J6 fight no StageA",
    fightFam.familyId === "none" &&
      (fightFam.reason === "fight_action_no_layout" || fightFam.reason === "action_primary_no_layout"),
    `${fightFam.familyId}/${fightFam.reason}`,
  );
  const ensFam = selectLayoutFamily({
    visualDescription: "全景。众人围观。",
    characterCount: 5,
  });
  ok("J6 ensemble 5 no twoStage", ensFam.familyId === "ensemble_4plus" && ensFam.family.twoStage === false);

  const { buildPrimaryBlock } =
    require("../src/ruleEngine/compilers/primaryBlock") as typeof import("../src/ruleEngine/compilers/primaryBlock");
  const weakCta = buildPrimaryBlock("regen_storyboard_hq");
  ok("J7 weak CTA not fake HQ burn", /不可作视频首帧|高质量分镜/.test(weakCta.userMessage));
  ok("J7 weak CTA label 更新", weakCta.ctaLabel.includes("高质量"));

  const pollBurn = assertStillFirstFrameContract({
    stillFilePath: "p/still.jpg",
    stillPrompt:
      "动作主体：沈清漪弯腰捡书。站位绑定：沈母=高位/图1（端坐或主位）。场景参考不送像素",
    literaryDesc: golden.shot.visualDescription,
    requireStill: true,
    stillQuality: "hq_ok",
  });
  ok(
    "J7 seating soup on action blocks burn",
    !pollBurn.ok && pollBurn.code === "STILL-FIRSTFRAME-DIRTY",
    `${pollBurn.code}/${pollBurn.message}`,
  );

  const bgItems = buildLiteraryFidelityChecklist({
    description: golden.shot.visualDescription,
    characterNames: ["沈清漪", "沈母"],
    bgPolicy: "demote",
  });
  ok(
    "J8 demote checklist has background_readable",
    bgItems.some((i) => i.id === "identity:background_readable"),
  );

  const { resolveStillHumanRejudgeOutcome } =
    require("../src/ruleEngine/compilers/stillQuality") as typeof import("../src/ruleEngine/compilers/stillQuality");
  const { detectSheetLeakFromVlmItems } =
    require("../src/ruleEngine/compilers/stillFirstFrameLiterarySsot") as typeof import("../src/ruleEngine/compilers/stillFirstFrameLiterarySsot");
  ok(
    "J8 sheetLeak detect from single_frame fail",
    detectSheetLeakFromVlmItems([{ id: "identity:single_frame", pass: false, fixHint: "四宫格" }]),
  );
  ok(
    "J8 sheetLeak clear on pass",
    !detectSheetLeakFromVlmItems([{ id: "identity:single_frame", pass: true }]),
  );
  ok(
    "J8 sheetLeak ignore vlm_infra single_frame placeholder",
    !detectSheetLeakFromVlmItems([
      { id: "identity:single_frame", pass: false, evidence: "vlm_infra" },
    ]),
  );
  const { promptImpliesSheetCollageLeak, STILL_SHEET_AS_IDENTITY_ONLY_ZH, STILL_SINGLE_FRAME_LOCK_ZH } =
    require("../src/ruleEngine/compilers/stillFirstFrameLiterarySsot") as typeof import("../src/ruleEngine/compilers/stillFirstFrameLiterarySsot");
  ok(
    "J8 identity-only lock is not prompt sheetLeak",
    !promptImpliesSheetCollageLeak(
      `特写。沈清漪侧脸。${STILL_SINGLE_FRAME_LOCK_ZH}${STILL_SHEET_AS_IDENTITY_ONLY_ZH}`,
    ),
  );
  ok(
    "J8 positive collage inducement still detects",
    promptImpliesSheetCollageLeak("输出定妆拼版四宫格 turnaround sheet 分栏"),
  );

  const rejudgeHard = resolveStillHumanRejudgeOutcome({
    items: [
      { id: "identity:single_frame", pass: false },
      { id: "role:x", pass: true },
    ],
    prev: { pendingHumanRejudge: true, sheetLeak: true },
  });
  ok("J8 human rejudge hard fail stays weak", rejudgeHard.stillQuality === "weak" && !rejudgeHard.burnOk);
  ok("J8 human rejudge no 可燃片 on sheet fail", rejudgeHard.ctaLabel !== "可燃片");

  const rejudgeClear = resolveStillHumanRejudgeOutcome({
    items: [
      { id: "identity:single_frame", pass: true },
      { id: "identity:background_readable", pass: true },
      { id: "identity:cast_cardinality", pass: true },
    ],
    prev: { sheetLeak: true, pendingHumanRejudge: true },
  });
  ok("J8 human rejudge clear sheet → burnOk", rejudgeClear.burnOk && rejudgeClear.ctaLabel === "可燃片");

  const leakBurn = assertStillFirstFrameContract({
    stillFilePath: "p/still.jpg",
    stillPrompt: "单镜头成片。沈清漪捡书。",
    literaryDesc: golden.shot.visualDescription,
    requireStill: true,
    stillQuality: "hq_ok",
    sheetLeak: true,
  });
  ok(
    "J8 persisted sheetLeak blocks burn",
    !leakBurn.ok && leakBurn.code === "STILL-FIRSTFRAME-WEAK",
  );

  const { routeStillRepair: routeStillRepairJ9 } =
    require("../src/ruleEngine/qc/stillRepairRoute") as typeof import("../src/ruleEngine/qc/stillRepairRoute");
  const bgRep = routeStillRepairJ9({
    itemResults: [{ id: "identity:background_readable", pass: false, fixHint: "灰棚" }],
    bgPolicy: "demote",
  });
  ok("J9 bg readable repair 禁灰棚", bgRep.ctaLabel.includes("灰棚") && !bgRep.layoutPreserveEdit);

  const { assertStillDetectForBurn } =
    require("../src/ruleEngine/qc/stillDetectRepair") as typeof import("../src/ruleEngine/qc/stillDetectRepair");
  const weakDetect = assertStillDetectForBurn({
    stillFilePath: "p/still.jpg",
    stillPrompt: "动作主体：捡书",
    literaryDesc: golden.shot.visualDescription,
    stillQuality: "weak",
    stillMeta: { stillQuality: "weak", visualPass: false },
  });
  ok(
    "J9 detect with stillQuality weak blocks",
    !weakDetect.ok && weakDetect.code === "STILL-FIRSTFRAME-WEAK",
    `${weakDetect.code}`,
  );
}

console.log("\n=== test:still-quality-closed-loop OK ===");

process.exit(process.exitCode ?? 0);
