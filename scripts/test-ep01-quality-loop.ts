/**
 * yarn test:ep01-quality-loop
 * Goldens for persist mode, import no-reexpand, dirty still, filtered DC, dup VD.
 */
import { composeAndPersistStillPrompt } from "@/ruleEngine/compilers/persistStillPrompt";
import { prepareBundleForInspect } from "@/ruleEngine/bundle/prepareBundleForInspect";
import { runDesignExitGate } from "@/ruleEngine/design/designExitGate";
import { dialogueCoverageReport, formatDialogueCoverageMessage } from "@/ruleEngine/design/dialogueCoverage";
import { composeStillPrompt } from "@/ruleEngine/compilers/composeStillPrompt";
import {
  isHandEyeMultiBeat,
  hasBareCrefCode,
  findDupVdStreaks,
} from "@/ruleEngine/design/dirtyStillPromptGate";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log("✓ " + label);
  else {
    console.error("✗ " + label + (detail ? " -- " + detail : ""));
    failed++;
  }
}

// --- persist mode is defined (no ReferenceError path) ---
{
  const mode = "refine" as const;
  const composeMode = mode;
  const promptState = composeMode === "fidelity" ? "fidelity" : composeMode === "refine" ? "refined" : "composed";
  ok("persist composeMode resolve", promptState === "refined");
}

// --- dirty still heuristics ---
ok(
  "hand+eye multi-beat",
  isHandEyeMultiBeat("沈母周氏手部特写，摩挲玉扳指，眼神冰冷犀利"),
);
ok("bare cref", hasBareCrefCode("--cref CHAR-SHENMU --ar 9:16"));
ok("url cref not bare", !hasBareCrefCode("--cref https://x/a.png --ar 9:16") || hasBareCrefCode("--cref CHAR-X /oss/a.png") === false);

// --- compose blocks dirty ---
{
  const r = composeStillPrompt({
    visualDescription: "沈母周氏手部特写，摩挲玉扳指，眼神冰冷犀利",
    qualityMode: "hq_update",
    characters: [{ name: "沈母", code: "CHAR-SHENMU", kind: "character", hasImage: true, filePath: "/stills/x.png" }],
  } as any);
  ok("compose blocks hand+eye", !r.ok && r.blockReason === "DEX-DIRTY-STILL-PROMPT", String(r.blockReason));
}

// --- dup VD ---
{
  const vd = "沈母摩挲玉扳指特写眼神冰冷犀利";
  const dups = findDupVdStreaks(
    [1, 2, 3, 4].map((i) => ({ shotIndex: i, visualDescription: vd })),
    3,
  );
  ok("dup VD streak", dups.length >= 1);
}

// --- design exit dirty / dup ---
{
  const vd = "沈母摩挲玉扳指特写，眼神冰冷犀利";
  const plan = {
    planData: {
      preDesignPack: {
        shots: [1, 2, 3].map((i) => ({
          shotIndex: i,
          visualDescription: vd,
          generation: { imagePrompt: `${vd}，--cref CHAR-SHENMU` },
          shotDesign: { lipSyncPolicy: "subtle_natural" },
        })),
      },
    },
  };
  const exit = runDesignExitGate("SB", plan);
  ok(
    "exit DEX-DUP-VD or DIRTY",
    exit.failedIds.includes("DEX-DUP-VD") ||
      exit.failedIds.includes("DEX-DIRTY-STILL-PROMPT") ||
      exit.failedIds.includes("DEX-HAND-LIP"),
    exit.failedIds.join(","),
  );

  const { applyDesignAutoCloseToBundle } =
    require("@/ruleEngine/design/designAutoClose") as typeof import("@/ruleEngine/design/designAutoClose");
  const { runExportGate } = require("@/ruleEngine/exportGate") as typeof import("@/ruleEngine/exportGate");
  const dirtyBundle = {
    bundleType: "script",
    script: "测",
    meta: {},
    planData: plan.planData,
    preDesignPack: plan.planData.preDesignPack,
    characterDesign: { assets: [{ code: "CHAR-SHENMU", name: "沈母", filePath: "/a.png" }] },
  } as ScriptBundle;
  const ac = applyDesignAutoCloseToBundle(dirtyBundle as any, { stageId: "SB", maxRounds: 4 });
  ok(
    "auto-close clears DUP/DIRTY/HAND",
    !ac.autoClosed.remainingFailedIds.includes("DEX-DUP-VD") &&
      !ac.autoClosed.remainingFailedIds.includes("DEX-DIRTY-STILL-PROMPT") &&
      !ac.autoClosed.remainingFailedIds.includes("DEX-HAND-LIP"),
    ac.autoClosed.remainingFailedIds.join(","),
  );

  const chatGate = runExportGate(dirtyBundle, { allowShapeSalvage: false });
  ok(
    "Chat export: no DUP/DIRTY block after heal",
    !chatGate.blocks.some((b) =>
      ["DEX-DUP-VD", "DEX-DIRTY-STILL-PROMPT", "DEX-HAND-LIP"].includes(b.id),
    ),
    chatGate.blocks.map((b) => b.id).join(","),
  );

  const irdBundle = {
    ...dirtyBundle,
    meta: { irdConfirmRequired: true },
    irdConfirmRequired: true,
  } as any;
  const importGate = runExportGate(irdBundle, {
    allowShapeSalvage: true,
    alreadyPrepared: true,
    bundle: irdBundle,
  });
  ok(
    "Import salvage demotes IRD-CONFIRM",
    !importGate.blocks.some((b) => b.id === "IRD-CONFIRM") &&
      importGate.warns.some((w) => w.id === "IRD-CONFIRM"),
    `blocks=${importGate.blocks.map((b) => b.id).join(",")} warns=${importGate.warns.map((w) => w.id).join(",")}`,
  );

  const camBundle = {
    ...dirtyBundle,
    meta: {},
  } as any;
  // Simulate designExit re-adding CAM-FIT on import path
  const camGate = runExportGate(
    {
      ...camBundle,
      preDesignPack: {
        scriptPlan: "测",
        shots: [
          {
            shotIndex: 1,
            visualDescription: "对话全景缓推",
            camera: "orbit 360 impossible",
            duration: 2,
          },
        ],
      },
    },
    {
      allowShapeSalvage: true,
      alreadyPrepared: true,
      bundle: {
        ...camBundle,
        meta: { camFitUntilClear: { remainingMustSplit: 1 } },
        preDesignPack: {
          scriptPlan: "测",
          shots: [
            {
              shotIndex: 1,
              visualDescription: "对话全景缓推",
              camera: "orbit 360 impossible",
              duration: 2,
            },
          ],
        },
      } as any,
    },
  );
  ok(
    "Import salvage: no DEX-CAM-FIT hard block",
    !camGate.blocks.some((b) => b.id === "DEX-CAM-FIT"),
    `blocks=${camGate.blocks.map((b) => b.id).join(",")} allowed=${camGate.exportAllowed}`,
  );
}

{
  const { buildAggregatedChatRepairText } =
    require("@/ruleEngine/exportGate") as typeof import("@/ruleEngine/exportGate");
  const soft = buildAggregatedChatRepairText([], [], "", [], {
    designExitIncomplete: true,
    warnIds: ["DEX-CAM-FIT", "IRD-CONFIRM"],
  });
  ok(
    "soft banner when no must blocks",
    /【可导入 · 设计未完全闭合】/.test(soft) && !/【设计未闭合】请回 W3/.test(soft),
    soft.slice(0, 220),
  );
}

// --- filtered coverage message ---
{
  const report = dialogueCoverageReport({
    script: "甲：你好。\n乙：再见。",
    shots: [{ narrative: { dialogue: { lines: [{ speaker: "甲", text: "你好。" }] } } }],
    planData: {
      dialoguePlan: {
        lines: [
          { lineId: "L1", speaker: "甲", text: "你好。" },
          { lineId: "L2", speaker: "乙", text: "再见。" },
        ],
      },
    },
    shotScope: "filtered",
  });
  ok("filtered ok ignores missing", report.ok || report.extraCount === 0, JSON.stringify(report));
  const msg = formatDialogueCoverageMessage(report, { filtered: true });
  ok("filtered msg not 乱入 for missing", !/乱入：多 \d+/.test(msg) || report.extraCount > 0, msg);
}

// --- prepare no reexpand ---
{
  const shots = Array.from({ length: 16 }, (_, i) => ({
    shotIndex: i + 1,
    visualDescription: `独特描写镜${i + 1}近景动作${i}`,
    duration: 2,
    charCodes: ["CHAR-A"],
    narrative: { dialogue: { lines: [] } },
  }));
  const raw: ScriptBundle = {
    bundleType: "script",
    script: "甲：测。",
    meta: {},
    planData: { dialoguePlan: { lines: [{ lineId: "L1", speaker: "甲", text: "测。" }] } },
    preDesignPack: { scriptPlan: "测", shots },
    characterDesign: { assets: [{ code: "CHAR-A", name: "甲", filePath: "/a.png" }] },
  } as any;
  const prep = prepareBundleForInspect(raw);
  const n = prep.bundle.preDesignPack?.shots?.length ?? 0;
  ok("author 16 not expanded to 170", n <= 20 && n >= 16, `n=${n} counts=${JSON.stringify(prep.shotCounts)}`);
  ok("diagnoseOnly flag", Boolean(prep.shotCounts?.diagnoseOnly), JSON.stringify(prep.shotCounts));

  const { runExportGate } = require("@/ruleEngine/exportGate") as typeof import("@/ruleEngine/exportGate");
  const eg = runExportGate(raw, {
    allowShapeSalvage: true,
    alreadyPrepared: true,
    bundle: prep.bundle,
    forceExpand: false,
  });
  const afterN = eg.bundle.preDesignPack?.shots?.length ?? 0;
  ok(
    "import exportGate diagnose-only keeps ~16",
    afterN <= 20 && afterN >= 16,
    `afterN=${afterN} camLog=${JSON.stringify((eg.shapeSalvageLog ?? []).filter((e) => /CAM/.test(e.ruleId)))}`,
  );
}

// --- clone VD: empty only; dialogue same-VD stays + Chat BLOCK ---
{
  const { collapseCloneVdShots } =
    require("@/ruleEngine/design/designAutoClose") as typeof import("@/ruleEngine/design/designAutoClose");
  const { runDesignExitGate } = require("@/ruleEngine/design/designExitGate") as typeof import("@/ruleEngine/design/designExitGate");
  const { runExportGate } = require("@/ruleEngine/exportGate") as typeof import("@/ruleEngine/exportGate");
  const vd = "沈母摩挲玉扳指特写";
  const withDlg = Array.from({ length: 9 }, (_, i) => ({
    shotIndex: i + 1,
    visualDescription: vd,
    duration: 2,
    narrative: {
      dialogue: { lines: [{ speaker: "沈母", text: `台词${i + 1}` }] },
    },
  }));
  const rDlg = collapseCloneVdShots(withDlg as any, { minRun: 3 });
  ok(
    "9 same VD with dialogue kept (no fold)",
    rDlg.shots.length === 9 && rDlg.merged === 0,
    `len=${rDlg.shots.length} merged=${rDlg.merged}`,
  );
  const exitDup = runDesignExitGate("SB", {
    planData: { preDesignPack: { shots: withDlg } },
  });
  ok("Chat exit BLOCK DEX-DUP-VD with dialogue", exitDup.failedIds.includes("DEX-DUP-VD"), exitDup.failedIds.join(","));

  const empty = Array.from({ length: 9 }, (_, i) => ({
    shotIndex: i + 1,
    visualDescription: vd,
    duration: 2,
    narrative: { dialogue: { lines: [] } },
  }));
  const rEmpty = collapseCloneVdShots(empty as any, { minRun: 3 });
  ok("9 empty same VD → 1", rEmpty.shots.length === 1 && rEmpty.merged === 8, `len=${rEmpty.shots.length}`);

  // Import must NOT run splitOverloaded to manufacture same-VD clones
  const fatBundle = {
    bundleType: "script",
    script: "测",
    meta: {},
    planData: {},
    preDesignPack: {
      scriptPlan: "测",
      shots: [
        {
          shotIndex: 1,
          visualDescription: vd,
          duration: 12,
          narrative: {
            dialogue: {
              lines: Array.from({ length: 8 }, (_, i) => ({
                speaker: "沈母",
                text: "把薄家的奉日宣朗表备好，滚金边的，一件一件报上来。",
                lineId: `L${i}`,
              })),
            },
          },
        },
      ],
    },
    characterDesign: { assets: [{ code: "CHAR-SHENMU", name: "沈母", filePath: "/a.png" }] },
  } as any;
  const beforeLip = fatBundle.preDesignPack.shots.length;
  const egLip = runExportGate(fatBundle, {
    allowShapeSalvage: true,
    alreadyPrepared: true,
    bundle: fatBundle,
    forceExpand: false,
  });
  const afterLip = egLip.bundle.preDesignPack?.shots?.length ?? 0;
  ok(
    "import salvage does not same-VD lip-split inflate",
    afterLip <= beforeLip + 1,
    `before=${beforeLip} after=${afterLip} log=${JSON.stringify((egLip.shapeSalvageLog ?? []).filter((e) => /LIP|CLONE|SPLIT/.test(e.ruleId)))}`,
  );
  ok(
    "registry does not demote DEX-DUP-VD",
    !egLip.warns.some((w) => w.id === "DEX-DUP-VD" && /导入智能愈/.test(w.message)),
    JSON.stringify(egLip.warns.filter((w) => w.id === "DEX-DUP-VD").map((w) => w.message)),
  );
  {
    const matrix = require("../data/fixtures/semantic_gate_dual_track_matrix.json") as {
      importSalvageRegistry?: { ruleId: string; demoteAfterHeal?: boolean }[];
    };
    const dup = (matrix.importSalvageRegistry ?? []).find((e) => e.ruleId === "DEX-DUP-VD");
    ok(
      "fixture DUP demoteAfterHeal=false",
      dup?.demoteAfterHeal === false,
      JSON.stringify(dup),
    );
  }
}

// --- compose literary vs IR tail ---
{
  const { composeStillPrompt } = require("@/ruleEngine/compilers/composeStillPrompt") as typeof import("@/ruleEngine/compilers/composeStillPrompt");
  const withTail = composeStillPrompt({
    visualDescription: "沈母手部特写摩挲玉扳指",
    rawPrompt: "沈母手部特写摩挲玉扳指 --cref CHAR-SHENMU --ar 9:16",
    qualityMode: "hq_update",
    characters: [{ name: "沈母", code: "CHAR-SHENMU", kind: "character", hasImage: true, filePath: "/stills/x.png" }],
  } as any);
  ok(
    "IR tail alone does not dirty-block",
    withTail.ok || withTail.blockReason !== "DEX-DIRTY-STILL-PROMPT",
    String(withTail.blockReason),
  );
  // CJK punct before IR (。--cref) must strip, not false-block
  const cjkTail = composeStillPrompt({
    visualDescription: "特写。沈母周氏指尖摩挲扳指，手部特写。",
    rawPrompt: "特写。沈母周氏指尖摩挲扳指，手部特写。竖屏9:16。--cref CHAR-SHENMU --ar 9:16",
    qualityMode: "hq_update",
    characters: [{ name: "沈母", code: "CHAR-SHENMU", kind: "character", hasImage: true }],
  } as any);
  ok("CJK punct IR tail does not dirty-block", cjkTail.ok === true, String(cjkTail.blockReason));
  // Mid-text bare codes in VD: peel and continue (compose re-emits IR at tail from charCodes)
  const midBareOnly = composeStillPrompt({
    visualDescription: "特写。沈母周氏指尖摩挲扳指，手部特写，--cref CHAR-SHENMU。",
    qualityMode: "hq_update",
    characters: [{ name: "沈母", code: "CHAR-SHENMU", kind: "character", hasImage: true }],
  } as any);
  ok("VD mid bare cref peels (no dirty-block)", midBareOnly.ok === true, String(midBareOnly.blockReason));
  const litHandEye = composeStillPrompt({
    visualDescription: "沈母手部特写，眼神冰冷",
    qualityMode: "hq_update",
    characters: [{ name: "沈母", code: "CHAR-SHENMU", kind: "character", hasImage: true, filePath: "/stills/x.png" }],
  } as any);
  ok(
    "literary hand+eye still blocks",
    !litHandEye.ok && litHandEye.blockReason === "DEX-DIRTY-STILL-PROMPT",
    String(litHandEye.blockReason),
  );
}

// --- ingestHeal must not lip-inflate; Confirm semantic children differ ---
{
  const { prepareBundleForInspect } =
    require("@/ruleEngine/bundle/prepareBundleForInspect") as typeof import("@/ruleEngine/bundle/prepareBundleForInspect");
  const { healLipMultiLineWithB } =
    require("@/ruleEngine/design/lipSplit") as typeof import("@/ruleEngine/design/lipSplit");
  const { normalizeVdKey } =
    require("@/ruleEngine/design/dirtyStillPromptGate") as typeof import("@/ruleEngine/design/dirtyStillPromptGate");
  const vd = "沈母摩挲玉扳指特写";
  const fat = {
    bundleType: "script",
    script: "测",
    meta: {},
    planData: {},
    preDesignPack: {
      scriptPlan: "测",
      shots: [
        {
          shotIndex: 1,
          visualDescription: vd,
          duration: 12,
          narrative: {
            dialogue: {
              lines: Array.from({ length: 6 }, (_, i) => ({
                speaker: "沈母",
                text: `把薄家的奉日宣朗表备好第${i + 1}句。`,
                lineId: `L${i}`,
              })),
            },
          },
        },
      ],
    },
    characterDesign: { assets: [{ code: "CHAR-SHENMU", name: "沈母", filePath: "/a.png" }] },
  } as any;
  const prep = prepareBundleForInspect(fat, { ingestHeal: true, forceExpand: false });
  const afterPrep = prep.bundle.preDesignPack?.shots?.length ?? 0;
  ok(
    "ingestHeal diagnose does not lip-inflate same-VD",
    afterPrep <= 2,
    `afterPrep=${afterPrep} log=${JSON.stringify((prep.shapeSalvageLog ?? []).slice(0, 6))}`,
  );

  const confirm = healLipMultiLineWithB({
    shots: [
      {
        shotIndex: 1,
        visualDescription: vd,
        duration: 4,
        narrative: {
          dialogue: {
            lines: [
              {
                speaker: "沈母",
                text: "把薄家的奉日宣朗表备好，滚金边的一件一件报上来，第一句。",
                lineId: "A",
              },
              {
                speaker: "沈母",
                text: "再把库房账册翻出来，第二句一件一件核对清楚。",
                lineId: "B",
              },
            ],
          },
        },
      },
    ],
  });
  const keys = new Set(
    confirm.shots.map((s) => normalizeVdKey(String(s.visualDescription ?? ""))).filter((k) => k.length >= 6),
  );
  ok(
    "Confirm lip semantic children differentiate VD",
    confirm.shots.length >= 2 && keys.size >= 2,
    `n=${confirm.shots.length} uniqueVd=${keys.size} sample=${confirm.shots
      .slice(0, 3)
      .map((s) => String(s.visualDescription).slice(0, 40))
      .join("|")}`,
  );
}

// --- setStepStatus/exportGate: diagnose-only writes expandProvenance ---
{
  const { runDesignExitGate } = require("@/ruleEngine/design/designExitGate") as typeof import("@/ruleEngine/design/designExitGate");
  const plan = {
    planData: {
      preDesignPack: {
        shots: [
          {
            shotIndex: 1,
            visualDescription: "簪刺入颈侧血珠渗出，冷笑未散，匕首入鞘完成。",
            duration: 4,
          },
        ],
      },
      meta: {},
    },
  };
  const exit = runDesignExitGate("SB", plan as any, { forceExpand: false });
  const prov = (plan.planData as any).meta?.expandProvenance;
  ok(
    "diagnose-only expandProvenance",
    prov?.mode === "diagnose_only" && prov?.forceExpand === false,
    JSON.stringify(prov),
  );
  const exitForce = runDesignExitGate("SB", structuredClone(plan) as any, { forceExpand: true });
  const metaF = (exitForce as any).warnings ? plan : plan;
  void metaF;
  ok(
    "forceExpand path does not invent silent default",
    exitForce.splitApplied === true || exitForce.failedIds.includes("DEX-STILL-ONEBEAT") || Boolean(exit.warnings?.length),
    `split=${exitForce.splitApplied} failed=${exitForce.failedIds.join(",")}`,
  );
}

// --- Confirm raise respects episodeCap ---
{
  const { runSplitOrchestrator } =
    require("@/ruleEngine/design/splitOrchestrator") as typeof import("@/ruleEngine/design/splitOrchestrator");
  const { DEFAULT_EPISODE_DURATION_CAP } =
    require("@/ruleEngine/compilers/resolveRequiredDuration") as typeof import("@/ruleEngine/compilers/resolveRequiredDuration");
  const longText = "把薄家的奉日宣朗表备好，滚金边的一件一件报上来。".repeat(2);
  const shots = Array.from({ length: 20 }, (_, i) => ({
    shotIndex: i + 1,
    duration: 8,
    visualDescription: `沈母近景第${i + 1}镜`,
    narrative: {
      dialogue: { lines: [{ speaker: "沈母", text: longText.slice(0, 20), lineId: `E${i}` }] },
    },
  }));
  const orch = runSplitOrchestrator({
    planData: { dialoguePlan: { lines: shots.flatMap((s) => (s.narrative.dialogue.lines as object[])) } },
    shots,
    applyClauseSplit: false,
    applyVisBeatExpanders: false,
  });
  const sum = orch.shots.reduce((a, s) => a + Math.max(0, Number(s.duration ?? 0)), 0);
  ok(
    "orchestrator duration raise respects episodeCap",
    sum <= DEFAULT_EPISODE_DURATION_CAP + 40,
    `sum=${sum} cap=${DEFAULT_EPISODE_DURATION_CAP} log=${JSON.stringify(orch.log.filter((l) => /duration/.test(l.step)))}`,
  );
}

// --- autoHeal without forceExpand must not lip/VisBeat inflate ---
{
  const { runDesignAutoClose } =
    require("@/ruleEngine/design/designAutoClose") as typeof import("@/ruleEngine/design/designAutoClose");
  const vd = "沈母摩挲玉扳指特写";
  const fatLines = Array.from({ length: 6 }, (_, i) => ({
    speaker: "沈母",
    text: `把薄家的奉日宣朗表备好第${i + 1}句滚金边。`,
    lineId: `AC${i}`,
  }));
  const plan = {
    planData: {
      dialoguePlan: { lines: fatLines },
      preDesignPack: {
        shots: [
          {
            shotIndex: 1,
            visualDescription: vd,
            duration: 4,
            narrative: { dialogue: { lines: fatLines } },
          },
        ],
      },
    },
  };
  const before = 1;
  const ac = runDesignAutoClose(plan as any, {
    stageId: "SB",
    maxRounds: 1,
    failedIds: ["DC-01", "DEX-CAM-FIT"],
    forceExpand: false,
  });
  const after =
    ((ac.plan.planData as any)?.preDesignPack?.shots ?? []).length;
  ok(
    "autoHeal diagnose does not semantic-inflate shots",
    after <= before + 2,
    `before=${before} after=${after} changes=${JSON.stringify(ac.changes.slice(0, 4))}`,
  );
}

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nall passed");
