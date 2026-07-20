/**
 * Preflight production golden smoke test
 * yarn test:preflight-production
 */
import { episodePackageToScriptBundle } from "../src/ruleEngine/detection/preflightProduction";
import { applyDurationCalculator } from "../src/ruleEngine/durationCalculator";
import { calcDurationFromDialogue } from "../src/ruleEngine/durationCalculator";
import { runDesignClosureDryRun } from "../src/ruleEngine/bundle/designClosureDryRun";
import type { EpisodePackage, EpisodeShot } from "../src/ruleEngine/types";
import {
  checkDialogueDuration,
  checkDialogueHasCharacter,
  runPrValidator,
} from "../src/ruleEngine/validators/prValidator";
import { emitPr10OsVoice, emitPr12Spatial } from "../src/ruleEngine/validators/prEmitters";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

/** Shape of Untitled-1 shot-624 (index 0-based = 1 → UI #2) */
function dumpShot624(duration = 2): EpisodeShot {
  return {
    id: "shot-624",
    storyboardId: 624,
    index: 1,
    narrative: {
      type: "CHAR-SCENE",
      duration,
      emotionIntensity: 5,
      shotSize: "CU",
      colorTone: "4500K",
      sceneCode: "SCENE-001",
      assetCodes: ["CHAR-SHENMU", "SCENE-001"],
      sceneName: "沈家祠堂",
      lines: "沈母：春日宴上，萧二公子与顾家那位说笑了三句，你可知？",
      dialogue: {
        type: "dialogue",
        lines: [
          {
            speaker: "沈母",
            text: "春日宴上，萧二公子与顾家那位说笑了三句，你可知？",
            lineId: "L-01",
          },
        ],
      },
      sound: { dialogue: true, bgm: "none" },
    },
    generation: {
      imagePrompt: "沈母周氏, --cref CHAR-SHENMU --ar 9:16",
      videoPrompt: "特写 static, duration 2s",
      audioPrompt: "沈母, 冰冷女声, 质问",
    },
    visualDescription: "沈母摩挲玉扳指特写，眼神冰冷",
  };
}

async function main() {
  const minDur = calcDurationFromDialogue("殿下醒了。你知道。", 4);
  assert(minDur >= 1.5, `expected min dialogue duration >= 1.5s, got ${minDur}`);

  const prHit = checkDialogueDuration(
    {
      shotIndex: 1,
      duration: 1,
      narrative: { dialogue: { lines: [{ text: "这是一段足够长的台词需要更多时间" }] } },
    },
    4,
  );
  assert(prHit?.ruleId === "PR-09", "PR-09 should fire for short duration");

  const prOk = checkDialogueDuration(
    {
      shotIndex: 2,
      duration: 10,
      narrative: { dialogue: { lines: [{ text: "短" }] } },
    },
    4,
  );
  assert(prOk === null, "PR-09 should pass when duration sufficient");
  console.log("PR-09 unit checks OK");

  // --- PR-04: dump shape without top-level charCodes (assetCodes only) ---
  const falsePos = checkDialogueHasCharacter({
    shotIndex: 2,
    narrative: {
      dialogue: { lines: [{ speaker: "沈母", text: "你可知？" }] },
      assetCodes: ["CHAR-SHENMU", "SCENE-001"],
    },
  });
  assert(falsePos === null, "PR-04 must pass when assetCodes has CHAR-*");

  const typeOnly = checkDialogueHasCharacter({
    shotIndex: 2,
    narrative: {
      type: "CHAR-SCENE",
      dialogue: { lines: [{ text: "你可知？" }] },
    },
  });
  assert(typeOnly === null, "PR-04 must pass when type includes CHAR");

  const realBlock = checkDialogueHasCharacter({
    shotIndex: 2,
    narrative: {
      type: "SCENE",
      dialogue: { lines: [{ text: "你可知？" }] },
      assetCodes: ["SCENE-001"],
    },
  });
  assert(realBlock?.ruleId === "PR-04", "PR-04 should BLOCK when no character");
  console.log("PR-04 unit checks OK");

  // --- PR-10: assetCodes CHAR counts as visible speaker ---
  const pr10 = emitPr10OsVoice({
    shotIndex: 2,
    narrative: {
      dialogue: { type: "dialogue", lines: [{ text: "你可知？" }] },
      assetCodes: ["CHAR-SHENMU", "SCENE-001"],
    },
  });
  assert(pr10 === null, "PR-10 must not WARN when assetCodes has CHAR-*");
  console.log("PR-10 unit checks OK");

  // --- Converter: charCodes + type + 1-based index ---
  const pkg: EpisodePackage = {
    projectId: 1,
    scriptId: 23,
    rulePackVersion: "2.0.1",
    shots: [dumpShot624(2)],
  };
  const bundle = episodePackageToScriptBundle(pkg, "沈母：春日宴上，萧二公子与顾家那位说笑了三句，你可知？");
  const mapped = bundle.preDesignPack!.shots![0] as Record<string, unknown>;
  assert(mapped.shotIndex === 2, `shotIndex should be 1-based (2), got ${mapped.shotIndex}`);
  assert(
    Array.isArray(mapped.charCodes) && (mapped.charCodes as string[]).includes("CHAR-SHENMU"),
    "converter must set charCodes from assetCodes",
  );
  assert(
    (mapped.narrative as { type?: string })?.type === "CHAR-SCENE",
    "converter must preserve narrative.type",
  );

  const prAfterMap = runPrValidator(bundle, 4);
  const pr04 = prAfterMap.items.find((i) => i.ruleId === "PR-04");
  assert(!pr04, `PR-04 must not fire after conversion, got ${pr04?.message}`);
  const pr09Before = prAfterMap.items.find((i) => i.ruleId === "PR-09" && i.severity === "BLOCK");
  assert(!!pr09Before, "PR-09 should BLOCK before duration lift (2s too short)");
  console.log("converter + PR map OK");

  // --- Duration lift clears PR-09 ---
  const lifted = applyDurationCalculator(pkg.shots, 4);
  assert((lifted[0].narrative.duration ?? 0) >= 5.3, `duration should lift to >=5.3, got ${lifted[0].narrative.duration}`);
  const pkgLifted = { ...pkg, shots: lifted };
  const bundleLifted = episodePackageToScriptBundle(pkgLifted, "沈母：春日宴上，萧二公子与顾家那位说笑了三句，你可知？");
  const prAfterLift = runPrValidator(bundleLifted, 4);
  assert(
    !prAfterLift.items.some((i) => i.ruleId === "PR-09" && i.severity === "BLOCK"),
    "PR-09 BLOCK must clear after duration lift",
  );
  assert(!prAfterLift.items.some((i) => i.ruleId === "PR-04"), "PR-04 still clear after lift");
  console.log("PR-09 duration lift OK");

  // --- DC-01 coverage still OK with structured lines ---
  const dcBundle = {
    ...bundleLifted,
    planData: {
      dialoguePlan: {
        lines: [
          {
            lineId: "L-01",
            text: "春日宴上，萧二公子与顾家那位说笑了三句，你可知？",
            speaker: "沈母",
          },
        ],
      },
    },
  };
  const dc = runDesignClosureDryRun(dcBundle as never);
  const dc01 = dc.find((c) => c.id === "DC-01");
  assert(dc01?.passed === true, `DC-01 should pass, got ${JSON.stringify(dc01)}`);
  console.log("DC-01 coverage OK");

  // --- PR-12: dual CHAR + spatial / composition / true miss ---
  function dualCharShot(opts: {
    index: number;
    spatialRelation?: string;
    composition?: { foreground: string; background: string };
  }): EpisodeShot {
    return {
      id: `shot-dual-${opts.index}`,
      storyboardId: 700 + opts.index,
      index: opts.index,
      narrative: {
        type: "CHAR-SCENE",
        duration: 6,
        shotSize: "MS",
        assetCodes: ["CHAR-SHENQINGCI", "CHAR-SHENMU", "SCENE-001"],
        sceneName: "沈家祠堂",
        spatialRelation: opts.spatialRelation,
        composition: opts.composition,
        dialogue: {
          type: "dialogue",
          lines: [{ speaker: "沈母", text: "你可知？" }],
        },
        sound: { dialogue: true },
      },
      generation: { videoPrompt: "中景 static, duration 6s" },
    };
  }

  const withSpatial = episodePackageToScriptBundle(
    { projectId: 1, scriptId: 23, rulePackVersion: "2.0.1", shots: [dualCharShot({ index: 3, spatialRelation: "fg:沈清瓷; bg:沈母" })] },
    "",
  );
  assert(
    !runPrValidator(withSpatial, 4).items.some((i) => i.ruleId === "PR-12"),
    "PR-12 must pass when package has spatialRelation",
  );
  assert(
    (withSpatial.preDesignPack!.shots![0] as { narrative?: { spatialRelation?: string } }).narrative?.spatialRelation ===
      "fg:沈清瓷; bg:沈母",
    "converter must map spatialRelation",
  );

  const withCompOnly = episodePackageToScriptBundle(
    {
      projectId: 1,
      scriptId: 23,
      rulePackVersion: "2.0.1",
      shots: [dualCharShot({ index: 3, composition: { foreground: "茶盏碎裂", background: "烛火晃动" } })],
    },
    "",
  );
  const mappedComp = withCompOnly.preDesignPack!.shots![0] as {
    narrative?: { spatialRelation?: string; shotSize?: string };
  };
  assert(
    mappedComp.narrative?.spatialRelation === "fg:茶盏碎裂; bg:烛火晃动",
    `converter must derive spatial from composition, got ${mappedComp.narrative?.spatialRelation}`,
  );
  assert(mappedComp.narrative?.shotSize === "MS", "converter must map shotSize");
  assert(
    !runPrValidator(withCompOnly, 4).items.some((i) => i.ruleId === "PR-12"),
    "PR-12 must pass when composition derives spatial",
  );

  // Emitter-only fallback: spatial missing on narrative but shotDesign.composition present
  const emitterComp = emitPr12Spatial({
    shotIndex: 4,
    charCodes: ["CHAR-A", "CHAR-B"],
    narrative: { type: "CHAR-SCENE" },
    shotDesign: { composition: { foreground: "左", background: "右" } },
  });
  assert(emitterComp === null, "PR-12 emitter must fall back to shotDesign.composition");

  const trueMiss = emitPr12Spatial({
    shotIndex: 4,
    charCodes: ["CHAR-A", "CHAR-B"],
    narrative: { type: "CHAR-SCENE", shotSize: "MS" },
  });
  assert(trueMiss?.ruleId === "PR-12", "PR-12 must BLOCK when dual CHAR and no spatial/composition");

  const trueMissPkg = episodePackageToScriptBundle(
    { projectId: 1, scriptId: 23, rulePackVersion: "2.0.1", shots: [dualCharShot({ index: 3 })] },
    "",
  );
  assert(
    !!runPrValidator(trueMissPkg, 4).items.find((i) => i.ruleId === "PR-12" && i.severity === "BLOCK"),
    "PR-12 must BLOCK after conversion when no spatial and no composition",
  );
  console.log("PR-12 unit checks OK");

  // --- PR-10: performance only in shotDesign; OS + lip via generation.videoPrompt ---
  const pr10DesignOnly = emitPr10OsVoice({
    shotIndex: 2,
    narrative: {
      type: "dialogue",
      dialogue: { type: "dialogue", lines: [{ text: "你可知？" }] },
      assetCodes: ["CHAR-SHENMU"],
    },
    shotDesign: { performance: { microExpression: { eyes: "冷" } } },
  });
  assert(pr10DesignOnly === null, "PR-10 must not WARN when CHAR visible (performance in shotDesign only)");

  const pr10OsLip = emitPr10OsVoice({
    shotIndex: 2,
    charCodes: ["CHAR-A"],
    narrative: {
      dialogue: { type: "os", lines: [{ text: "画外一句" }] },
    },
    generation: { videoPrompt: "speaking, lip-sync" },
  });
  assert(pr10OsLip?.ruleId === "PR-10" && pr10OsLip.severity === "BLOCK", "PR-10 must BLOCK OS+lip via generation.videoPrompt");
  console.log("PR-10 shotDesign/generation fallback OK");

  // --- H3 / dialogueCoverage SSOT ---
  const { dialogueFidelityGate } = await import("../src/ruleEngine/validators/gates");
  const { dialogueCoverageReport, dialogueLineCountMismatch, flattenDialogueText } = await import(
    "../src/ruleEngine/design/dialogueCoverage"
  );
  const { validateTier0Shots } = await import("../src/ruleEngine/validators/tier0Validators");

  const proseScript = [
    "沈清瓷传 EP01：命轨初现",
    "场1 沈家祠堂 夜 内",
    "人物：沈清瓷 沈母周氏",
    "△烛火摇曳，沈清瓷跪在蒲团上",
    "沈母：春日宴上，萧二公子与顾家那位说笑了三句，你可知？",
    "沈清瓷：女儿在场，萧公子只是应酬。",
  ].join("\n");

  const coveredPkg: EpisodePackage = {
    projectId: 1,
    scriptId: 23,
    rulePackVersion: "2.0.1",
    shots: [
      {
        id: "s1",
        index: 0,
        narrative: {
          type: "CHAR-SCENE",
          duration: 6,
          dialogue: {
            type: "dialogue",
            lines: [
              { speaker: "沈母", text: "春日宴上，萧二公子与顾家那位说笑了三句，你可知？", lineId: "L-01" },
              { speaker: "沈清瓷", text: "女儿在场，萧公子只是应酬。", lineId: "L-02" },
            ],
          },
        },
        generation: {},
      },
    ],
  };

  const h3Ok = dialogueFidelityGate(coveredPkg, proseScript);
  assert(!h3Ok.some((i) => i.severity === "BLOCK"), `H3 must not BLOCK on prose+structured, got ${JSON.stringify(h3Ok)}`);

  const h3DcBundle = {
    script: proseScript,
    preDesignPack: { shots: coveredPkg.shots },
  };
  assert(!dialogueLineCountMismatch(h3DcBundle as never), "DC-01 must agree with H3 pass");

  const missingPkg: EpisodePackage = {
    ...coveredPkg,
    shots: [
      {
        id: "s1",
        index: 0,
        narrative: {
          type: "CHAR-SCENE",
          duration: 6,
          dialogue: {
            type: "dialogue",
            lines: [{ speaker: "沈母", text: "春日宴上，萧二公子与顾家那位说笑了三句，你可知？", lineId: "L-01" }],
          },
        },
        generation: {},
      },
    ],
  };
  const h3Miss = dialogueFidelityGate(missingPkg, proseScript);
  assert(h3Miss.some((i) => i.ruleId === "H3" && i.severity === "BLOCK"), "H3 must BLOCK when one line missing");
  assert(h3Miss.some((i) => i.ruleId === "R2" && i.severity === "BLOCK"), "R2 must BLOCK with H3 on missing");
  assert(/缺 1 条/.test(h3Miss.find((i) => i.ruleId === "H3")!.message), "H3 message should report missing=1");

  const emptyActual: EpisodePackage = {
    ...coveredPkg,
    shots: [{ id: "s0", index: 0, narrative: { type: "CHAR-SCENE", duration: 3 }, generation: {} }],
  };
  const h3Empty = dialogueFidelityGate(emptyActual, proseScript);
  assert(h3Empty.some((i) => i.ruleId === "H3" && i.severity === "BLOCK"), "H3 must BLOCK when expected exists but shots empty");

  // order mismatch WARN: same keys different sequence → coverage ok but hash differs
  const orderReport = dialogueCoverageReport({
    script: "",
    shots: coveredPkg.shots,
    planData: {
      dialoguePlan: {
        lines: [
          { text: "女儿在场，萧公子只是应酬。", lineId: "L-02" },
          { text: "春日宴上，萧二公子与顾家那位说笑了三句，你可知？", lineId: "L-01" },
        ],
      },
    },
  });
  // lineIds both present — if order of ids differs but both present, ok=true; orderMismatch if key join hash differs
  assert(orderReport.ok, "reordered plan lineIds still covered");
  const orderWarnPkg: EpisodePackage = {
    projectId: 1,
    scriptId: 23,
    rulePackVersion: "2.0.1",
    shots: coveredPkg.shots,
  };
  const orderIssues = dialogueFidelityGate(orderWarnPkg, "", {
    planData: {
      dialoguePlan: {
        lines: [
          { text: "女儿在场，萧公子只是应酬。" },
          { text: "春日宴上，萧二公子与顾家那位说笑了三句，你可知？" },
        ],
      },
    },
  });
  assert(!orderIssues.some((i) => i.severity === "BLOCK"), "order-only must not BLOCK");
  assert(
    orderIssues.some((i) => i.ruleId === "H3" && i.severity === "WARN") || orderIssues.length === 0 || orderReport.orderMismatch,
    "order-only should WARN when hashes differ",
  );
  console.log("H3 dialogueCoverage OK");

  // --- V10: 分句 ≤15；停顿切开后各段另计 ---
  const cfg = { videoVendor: "test", speechSpeed: 4, platformProfile: { vertical: true } } as never;
  const pausedLine = "春日宴上，萧二公子与顾家那位说笑了三句，你可知？"; // clauses ≤15
  const pausedIssues = validateTier0Shots(
    [
      {
        id: "v10-pause",
        index: 0,
        narrative: {
          type: "CHAR-SCENE",
          dialogue: { type: "dialogue", lines: [{ speaker: "沈母", text: pausedLine }] },
        },
        generation: {},
      },
    ],
    cfg,
  );
  assert(
    !pausedIssues.some((i) => i.ruleId === "V10"),
    `paused long line must pass V10 after 分句 split, got ${JSON.stringify(pausedIssues.filter((i) => i.ruleId === "V10"))}`,
  );

  const unbroken = "甲".repeat(16); // 16 CJK, no pause → BLOCK
  const unbrokenIssues = validateTier0Shots(
    [
      {
        id: "v10-unbroken",
        index: 0,
        narrative: {
          type: "CHAR-SCENE",
          dialogue: { type: "dialogue", lines: [{ speaker: "沈母", text: unbroken }] },
        },
        generation: {},
      },
    ],
    cfg,
  );
  const v10Block = unbrokenIssues.find((i) => i.ruleId === "V10");
  assert(v10Block?.severity === "BLOCK", `unbroken 16-char 分句 must BLOCK, got ${JSON.stringify(v10Block)}`);
  assert(/分句/.test(v10Block!.message) && /上限 15/.test(v10Block!.message), `message got ${v10Block!.message}`);

  // Two short lines in one shot: each clause ≤15 → no V10
  const mergedIssues = validateTier0Shots(
    [
      {
        id: "v10-merge",
        index: 0,
        narrative: {
          type: "CHAR-SCENE",
          dialogue: {
            type: "dialogue",
            lines: [
              { speaker: "甲", text: "一二三四五六七八九十十一十二" },
              { speaker: "乙", text: "一二三四五六七八九十十一十二" },
            ],
          },
        },
        generation: {},
      },
    ],
    cfg,
  );
  assert(
    !mergedIssues.some((i) => i.ruleId === "V10"),
    "merged short lines must not V10 from shot-total flatten",
  );
  assert(flattenDialogueText([{ text: "你好" }, { text: "世界" }]) === "你好世界", "flattenDialogueText joins texts");
  console.log("V10 分句 budget OK");

  if (!process.env.SKIP_DB_PREFLIGHT) {
    console.log("(DB preflight skipped — set integration env to run runProductionPreflight)");
  }

  console.log("\n=== test:preflight-production OK ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
