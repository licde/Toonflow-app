/**
 * BundleShapePipeline regression: null omit, map normalize, tryFix arrow, idempotent.
 * yarn test:bundle-shape-pipeline
 */
import assert from "assert";
import fs from "fs";
import path from "path";
import {
  prepareBundleRaw,
  prepareBundleWithLog,
  tryFixPasteJson,
  parseBundleJson,
  scriptBundleSchema,
} from "@/ruleEngine/bundle/schema";
import {
  normalizeDeepAdaptation,
  normalizeRenameMap,
  normalizeDeepAdaptationInBundle,
} from "@/ruleEngine/bundle/normalizeDeepAdaptation";
import { auditAdaptationGaps } from "@/ruleEngine/bundle/adaptationAudit";
import { auditShapeResidualGaps } from "@/ruleEngine/bundle/shapeResidualAudit";
import { normalizeStateVariants } from "@/ruleEngine/bundle/normalizeCharacterDesign";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";

function loadTemplate(): Record<string, unknown> {
  const p = path.join(process.cwd(), "data/fixtures/script-bundle-template-v2.json");
  const fallback = path.join(process.cwd(), "data/fixtures/script-bundle-template.json");
  const raw = fs.readFileSync(fs.existsSync(p) ? p : fallback, "utf-8");
  return JSON.parse(raw) as Record<string, unknown>;
}

function main() {
  // --- SH-MAPS / rename ---
  const maps = normalizeRenameMap({
    "温如瓷→沈清瓷": true,
    D01_nameMap: "modernize",
  });
  assert.deepStrictEqual(maps, [{ from: "温如瓷", to: "沈清瓷" }]);

  const mixed = normalizeDeepAdaptation({
    nameMap: [
      { original: "兰芝珩", new: "萧玄珩" },
      "云织雪→顾云筝",
    ],
    relationMap: { 温家: "沈家" },
    substitutions: { "仙都→北域": "" },
    D03_substitutions: "full",
    settingProfile: { era: "架空大邺" },
  });
  assert.deepStrictEqual(mixed.nameMap, [
    { from: "兰芝珩", to: "萧玄珩" },
    { from: "云织雪", to: "顾云筝" },
  ]);
  assert.deepStrictEqual(mixed.relationMap, [{ from: "温家", to: "沈家" }]);
  assert.deepStrictEqual(mixed.substitutions, [{ from: "仙都", to: "北域" }]);
  assert.ok(!("D03_substitutions" in mixed));

  // --- C0 tryFix ---
  const broken = `{
    "nameMap": { "温如瓷→沈清瓷", "兰芝珩→萧玄珩" },
    "relationMap": { "温家→沈家" }
  }`;
  assert.throws(() => JSON.parse(broken));
  const fixed = tryFixPasteJson(broken);
  const parsedMaps = JSON.parse(fixed) as { nameMap: { from: string; to: string }[] };
  assert.strictEqual(parsedMaps.nameMap[0]?.from, "温如瓷");
  assert.strictEqual(parsedMaps.nameMap[0]?.to, "沈清瓷");

  // --- null-shot + prepare + zod ---
  const base = loadTemplate();
  base.bundleType = "script";
  if (!base.script || typeof base.script !== "string") base.script = "测试剧本：你好。";
  const pack = (base.preDesignPack ?? {}) as Record<string, unknown>;
  pack.scriptPlan = typeof pack.scriptPlan === "string" ? pack.scriptPlan : "plan";
  pack.shots = [
    {
      shotIndex: "1",
      duration: "2.5",
      emotion: "4",
      visualDescription: "祠堂罚跪",
      visualEffect: null,
      audioCue: null,
      fxLevel: null,
      generation: {
        imagePrompt: "img",
        videoPrompt: "vid",
        audioPrompt: "aud",
        fxPrompt: "",
      },
    },
  ];
  base.preDesignPack = pack;
  base.planData = {
    ...(typeof base.planData === "object" && base.planData ? (base.planData as object) : {}),
    adaptationMatrixStructured: {
      userConfirmed: true,
      matrix: [
        { dimId: "D01_nameMap", choice: "full_rename" },
        { dimId: "gender", choice: "keep" },
      ],
      deepAdaptation: {
        nameMap: { 温如瓷: "沈清瓷" },
        D01_nameMap: "modernize",
      },
    },
  };
  base.designBrief = {
    ...(typeof base.designBrief === "object" && base.designBrief ? (base.designBrief as object) : {}),
    B16_adaptationDeepRef: {
      nameMap: [{ original: "兰芝珩", new: "萧玄珩" }],
    },
  };

  const once = prepareBundleRaw(base);
  const twice = prepareBundleRaw(structuredClone(once));
  assert.deepStrictEqual(
    (once.planData as { adaptationMatrixStructured: { deepAdaptation: unknown } }).adaptationMatrixStructured.deepAdaptation,
    (twice.planData as { adaptationMatrixStructured: { deepAdaptation: unknown } }).adaptationMatrixStructured.deepAdaptation,
  );

  const shot0 = (once.preDesignPack as { shots: Record<string, unknown>[] }).shots[0]!;
  assert.strictEqual(shot0.shotIndex, 1);
  assert.strictEqual(shot0.duration, 2.5);
  assert.strictEqual(shot0.emotion, 4);
  assert.ok(!("visualEffect" in shot0) || shot0.visualEffect == null || shot0.visualEffect === undefined);

  const zod = scriptBundleSchema.safeParse(once);
  assert.ok(zod.success, zod.success ? "" : JSON.stringify(zod.error.issues.slice(0, 5), null, 2));

  const db = once.designBrief as { B16?: Record<string, string>; B16_adaptationDeepRef?: unknown };
  assert.ok(!db.B16_adaptationDeepRef);
  assert.ok(db.B16 && (db.B16["温如瓷"] === "沈清瓷" || db.B16["兰芝珩"] === "萧玄珩"));

  // residual shape WARN when skip pipeline
  const dirtyBundle = {
    ...base,
    planData: {
      adaptationMatrixStructured: {
        userConfirmed: true,
        matrix: [{ dimId: "D01_nameMap", choice: "full_rename" }],
        deepAdaptation: { nameMap: { 温如瓷: "沈清瓷" } },
      },
    },
  } as unknown as ScriptBundle;
  const gaps = auditAdaptationGaps(dirtyBundle);
  assert.ok(gaps.some((g) => g.id === "ADP-SHAPE-01"));

  // after normalize, shape clean
  const cleaned = structuredClone(dirtyBundle) as unknown as Record<string, unknown>;
  normalizeDeepAdaptationInBundle(cleaned);
  const gaps2 = auditAdaptationGaps(cleaned as unknown as ScriptBundle);
  assert.ok(!gaps2.some((g) => g.id.startsWith("ADP-SHAPE")));

  // string path with tryFix embedded in larger invalid fragment is covered by parseBundleJson unit
  const wrap = `{"bundleType":"script","ok":true,${fixed.slice(1, -1)}}`;
  // maps alone already fixed; ensure parseBundleJson recovers illegal-only maps blob
  const recovered = parseBundleJson(broken);
  assert.ok(Array.isArray((recovered as { nameMap: unknown }).nameMap));

  // --- SH-B5-PAYOFF ---
  const b5Base = loadTemplate();
  b5Base.bundleType = "script";
  b5Base.script = b5Base.script ?? "测试";
  b5Base.designBrief = {
    B5: [
      { type: "伏笔", desc: "a", payoffEp: 13 },
      { type: "钩子", desc: "b", payoffEp: "本集收" },
      { type: "伏笔", desc: "c", payoffEp: "8" },
    ],
  };
  const b5Prep = prepareBundleWithLog(b5Base);
  const b5Items = (b5Prep.bundle.designBrief as { B5: Record<string, unknown>[] }).B5;
  assert.strictEqual(b5Items[1]?.payoffLabel, "本集收");
  assert.ok(!("payoffEp" in (b5Items[1] ?? {})));
  assert.strictEqual(b5Items[2]?.payoffEp, 8);
  assert.ok(b5Prep.shapeSalvageLog.some((e) => e.ruleId === "SH-B5-PAYOFF"));
  assert.ok(scriptBundleSchema.safeParse(b5Prep.bundle).success);
  assert.strictEqual(auditShapeResidualGaps(b5Prep.bundle as unknown as ScriptBundle).length, 0);

  // --- SH-B12-BEATS / SH-B4-NUM ---
  const numBase = loadTemplate();
  numBase.bundleType = "script";
  numBase.script = numBase.script ?? "测试";
  numBase.designBrief = {
    B4: ["3", 7],
    B12: [{ scene: "Sc1", zone: "起", beats: "2" }],
    emotionCurveOutline: ["4", 5],
  };
  const numPrep = prepareBundleWithLog(numBase);
  const numDb = numPrep.bundle.designBrief as { B4: unknown[]; B12: { beats: number }[]; emotionCurveOutline: unknown[] };
  assert.strictEqual(numDb.B4[0], 3);
  assert.strictEqual(numDb.B12[0]?.beats, 2);
  assert.strictEqual(numDb.emotionCurveOutline[0], 4);

  // --- SH-GEN-NULL ---
  const genBase = loadTemplate();
  genBase.bundleType = "script";
  genBase.script = genBase.script ?? "测试";
  genBase.preDesignPack = {
    scriptPlan: "p",
    shots: [{ visualDescription: "x", generation: { imagePrompt: "i", videoPrompt: null, audioPrompt: null, fxPrompt: "" } }],
  };
  const genPrep = prepareBundleWithLog(genBase);
  const gen = (genPrep.bundle.preDesignPack as { shots: { generation: Record<string, unknown> }[] }).shots[0]!.generation;
  assert.ok(!("videoPrompt" in gen));
  assert.ok(!("audioPrompt" in gen));

  // --- SH-L6-VARIANTS ---
  const l6Record = normalizeStateVariants({ 顺从态: "垂眼，双手交握", 觉醒态: "抬眼，语气有重量" });
  assert.strictEqual(l6Record.length, 2);
  assert.strictEqual(l6Record[0]?.name, "顺从态");
  assert.strictEqual(l6Record[0]?.visual, "垂眼，双手交握");
  const l6Base = loadTemplate();
  l6Base.bundleType = "script";
  l6Base.script = l6Base.script ?? "测试";
  l6Base.characterDesign = {
    assets: [
      {
        code: "CHAR-QINGCI",
        name: "沈清瓷",
        L6: { arcVisual: "低垂无声 → 平视前方", stateVariants: { 顺从态: "垂眼", 觉醒态: "抬眼" } },
      },
    ],
  };
  const l6Prep = prepareBundleWithLog(l6Base);
  const l6Sv = (
    (l6Prep.bundle.characterDesign as { assets: { L6: { stateVariants: { name: string; visual: string }[] } }[] }).assets[0]!.L6
      .stateVariants
  );
  assert.ok(Array.isArray(l6Sv));
  assert.strictEqual(l6Sv[0]?.name, "顺从态");
  assert.ok(l6Prep.shapeSalvageLog.some((e) => e.ruleId === "SH-L6-VARIANTS"));

  // --- SH-B20 / SH-B23 ---
  const b20Base = loadTemplate();
  b20Base.bundleType = "script";
  b20Base.script = b20Base.script ?? "测试";
  b20Base.designBrief = {
    B20: [
      { infoId: "INF-01", delivery: "a" },
      { infoId: "INF-02", delivery: "b" },
    ],
    B23: [
      { infoId: "INF-01", scene: "场1", delivery: "x" },
      { infoId: "INF-02", scene: "场2", delivery: "y" },
    ],
  };
  const b20Prep = prepareBundleWithLog(b20Base);
  const b20Db = b20Prep.bundle.designBrief as { B20: unknown[]; B23: Record<string, unknown> };
  assert.ok(b20Db.B20.every((x) => typeof x === "string"));
  assert.deepStrictEqual(b20Db.B20, ["INF-01", "INF-02"]);
  assert.ok(!Array.isArray(b20Db.B23));
  assert.deepStrictEqual(b20Db.B23.retentionInfoDelivery, ["INF-01", "INF-02"]);
  assert.ok(Array.isArray(b20Db.B23.items));
  assert.ok(b20Prep.shapeSalvageLog.some((e) => e.ruleId === "SH-B20"));
  assert.ok(b20Prep.shapeSalvageLog.some((e) => e.ruleId === "SH-B23"));
  assert.ok(scriptBundleSchema.safeParse(b20Prep.bundle).success);
  assert.strictEqual(auditShapeResidualGaps(b20Prep.bundle as unknown as ScriptBundle).length, 0);

  // --- SH-CD-LKEYS ---
  const cdBase = loadTemplate();
  cdBase.bundleType = "script";
  cdBase.script = cdBase.script ?? "测试";
  cdBase.characterDesign = {
    assets: [
      {
        code: "CHAR-X",
        name: "测试",
        L0_identity: "清瘦少女",
        L6_arcVisual: { phase1: "垂眼", phase2: "抬眼" },
      },
    ],
  };
  const cdPrep = prepareBundleWithLog(cdBase);
  const cdAsset = (cdPrep.bundle.characterDesign as { assets: Record<string, unknown>[] }).assets[0]!;
  assert.ok(cdAsset.L0);
  assert.ok(cdAsset.L6 && typeof cdAsset.L6 === "object");
  assert.ok(Array.isArray((cdAsset.L6 as { stateVariants: unknown[] }).stateVariants));
  assert.ok(cdPrep.shapeSalvageLog.some((e) => e.ruleId === "SH-CD-LKEYS"));

  // --- SH-SHOT-SPATIAL ---
  const spBase = loadTemplate();
  spBase.bundleType = "script";
  spBase.script = spBase.script ?? "测试";
  spBase.preDesignPack = {
    scriptPlan: "p",
    episodeBeat: { hook: "x" },
    shots: [{ visualDescription: "v", spatialRelation: "清瓷在左" }],
  };
  const spPrep = prepareBundleWithLog(spBase);
  const spShot = (spPrep.bundle.preDesignPack as { shots: { narrative?: { spatialRelation?: string }; spatialRelation?: string }[] }).shots[0]!;
  assert.strictEqual(spShot.narrative?.spatialRelation, "清瓷在左");
  assert.ok(spPrep.shapeSalvageLog.some((e) => e.ruleId === "SH-SHOT-SPATIAL"));

  // --- SH-VISUAL-EFFECT-OBJ / SH-AUDIO-CUE-OBJ ---
  const fxBase = loadTemplate();
  fxBase.bundleType = "script";
  fxBase.script = fxBase.script ?? "测试";
  fxBase.preDesignPack = {
    scriptPlan: "p",
    shots: [
      {
        visualDescription: "烛火",
        visualEffect: { level: "F1", desc: "烛火摇曳，微光闪烁" },
        audioCue: { beat: "茶盏碎裂", type: "sfx" },
        generation: { imagePrompt: "i", videoPrompt: "v" },
      },
    ],
  };
  const fxPrep = prepareBundleWithLog(fxBase);
  const fxShot = (fxPrep.bundle.preDesignPack as { shots: Record<string, unknown>[] }).shots[0]!;
  assert.strictEqual(typeof fxShot.visualEffect, "string");
  assert.match(String(fxShot.visualEffect), /F1/);
  assert.strictEqual(fxShot.fxLevel, "F1");
  assert.strictEqual(typeof fxShot.audioCue, "string");
  assert.ok(fxPrep.shapeSalvageLog.some((e) => e.ruleId === "SH-VISUAL-EFFECT-OBJ"));
  assert.ok(fxPrep.shapeSalvageLog.some((e) => e.ruleId === "SH-AUDIO-CUE-OBJ"));
  assert.ok(scriptBundleSchema.safeParse(fxPrep.bundle).success);

  // --- deepseek-20260715 whole-fixture smoke ---
  const deepPath = path.join(process.cwd(), "data/fixtures/golden/deepseek-20260715-shape.json");
  if (fs.existsSync(deepPath)) {
    const deepRaw = JSON.parse(fs.readFileSync(deepPath, "utf-8"));
    const deepPrep = prepareBundleWithLog(deepRaw);
    const deepDb = deepPrep.bundle.designBrief as { B20: unknown[]; B23: Record<string, unknown> };
    assert.ok(Array.isArray(deepDb.B20) && deepDb.B20.every((x) => typeof x === "string"), "deepseek B20 string[]");
    assert.ok(deepDb.B23 && !Array.isArray(deepDb.B23) && Array.isArray(deepDb.B23.retentionInfoDelivery), "deepseek B23 record");
    const deepParsed = scriptBundleSchema.safeParse(deepPrep.bundle);
    assert.ok(deepParsed.success, deepParsed.success ? "" : JSON.stringify(deepParsed.error.issues.slice(0, 8)));
    assert.ok(!(auditShapeResidualGaps(deepPrep.bundle as unknown as ScriptBundle).some((g) => g.id.startsWith("SHAPE-RESIDUAL-B2"))));
  }

  // golden ep1 still OK
  const goldPath = path.join(process.cwd(), "data/fixtures/golden/ep1-suiyu-deepseek.json");
  if (fs.existsSync(goldPath)) {
    const goldPrep = prepareBundleWithLog(JSON.parse(fs.readFileSync(goldPath, "utf-8")));
    assert.ok(scriptBundleSchema.safeParse(goldPrep.bundle).success, "ep1 golden zod");
  }

  console.log("test:bundle-shape-pipeline PASS", { wrapLen: wrap.length });
}

main();
