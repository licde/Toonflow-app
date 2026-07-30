/**
 * LIP design-first raise + per-shot DFW/LIP layering + import fallback goldens.
 */
import assert from "node:assert/strict";
import { raiseDurationHygieneOnly } from "@/ruleEngine/export/durationHygiene";
import { runDesignAutoClose } from "@/ruleEngine/design/designAutoClose";
import { runDesignExitGate } from "@/ruleEngine/design/designExitGate";
import {
  classifyLipForChatRepairDetailed,
  detectLipSplitPressure,
} from "@/ruleEngine/design/lipSplit";
import { buildAggregatedChatRepairText } from "@/ruleEngine/exportGate";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";

function ok(name: string, cond: unknown, detail?: string) {
  assert.ok(cond, detail ? `${name}: ${detail}` : name);
  console.log(`ok - ${name}`);
}

function shot(partial: Record<string, unknown>): Record<string, unknown> {
  return {
    clientId: `c-${partial.shotIndex ?? 1}`,
    visualDescription: "中景角色对白",
    ...partial,
  };
}

// --- 1) canSilentRaise short shot: design autoClose raise → exit clears LIP_RAISE ---
{
  const shortText =
    "这霜兰令本就是交易筹码你我今日一诺既定不可反悔此事攸关宗门。";
  const plan: Record<string, unknown> = {
    planData: {
      preDesignPack: {
        shots: [
          shot({
            shotIndex: 2,
            duration: 3,
            narrative: {
              dialogue: { lines: [{ speaker: "甲", text: shortText }] },
              shotSize: "MS",
            },
            shotDesignIntent: { picture: "对白", durationSec: 3 },
          }),
        ],
      },
      dialoguePlan: { lines: [{ speaker: "甲", text: shortText, lineId: "L2" }] },
    },
  };
  const before = detectLipSplitPressure(
    ((plan.planData as { preDesignPack: { shots: Record<string, unknown>[] } }).preDesignPack.shots[0])!,
  );
  ok("fixture canSilentRaise before raise", before.canSilentRaise, JSON.stringify(before));

  const ac = runDesignAutoClose(plan, { stageId: "SB", maxRounds: 1 });
  const afterShot = (
    (ac.plan.planData as { preDesignPack: { shots: Record<string, unknown>[] } }).preDesignPack.shots[0]
  )!;
  const after = detectLipSplitPressure(afterShot);
  ok("design raise cleared canSilentRaise", !after.canSilentRaise, JSON.stringify({ after, dur: afterShot.duration }));
  ok("duration snapped/raised above 3", Number(afterShot.duration) > 3, `dur=${afterShot.duration}`);
  ok(
    "durationSec synced",
    Number((afterShot.shotDesignIntent as { durationSec?: number })?.durationSec ?? 0) >= Number(afterShot.duration),
  );
}

// --- 2) designExit without raise fails on short; with raise path via autoClose ok for lip raise ---
{
  const text = "今日一诺既定不可反悔此事攸关宗门存亡。";
  const plan: Record<string, unknown> = {
    planData: {
      preDesignPack: {
        shots: [
          shot({
            shotIndex: 15,
            duration: 3,
            narrative: {
              dialogue: { lines: [{ speaker: "乙", text }] },
              shotSize: "CU",
            },
          }),
        ],
      },
    },
  };
  const exitRaw = runDesignExitGate("SB", structuredClone(plan), { chatStrict: true });
  const lipWarn = (exitRaw.warnings ?? []).some((w: string) => /LIP_RAISE|LIP_SPLIT/.test(w));
  // May fail for many SB reasons; assert lip raise warning present when short
  const pressure = detectLipSplitPressure(
    ((plan.planData as { preDesignPack: { shots: Record<string, unknown>[] } }).preDesignPack.shots[0])!,
  );
  if (pressure.canSilentRaise) {
    ok("raw exit surfaces LIP_RAISE or fails DEX-LIP-SPLIT", lipWarn || exitRaw.failedIds.includes("DEX-LIP-SPLIT"));
  }
}

// --- 3) mixed pack: per-shot classify — must + raise indexes; repair text no DFW import lie ---
{
  const raiseText =
    "这霜兰令本就是交易筹码你我今日一诺既定不可反悔此事攸关宗门。";
  const shots = [
    shot({
      shotIndex: 2,
      duration: 3,
      narrative: { dialogue: { lines: [{ speaker: "甲", text: raiseText }] } },
    }),
    shot({
      shotIndex: 11,
      duration: 4,
      narrative: {
        dialogue: {
          lines: [
            { speaker: "乙", text: "第一句已经很长需要单独口型预算。" },
            { speaker: "乙", text: "第二句继续加长使得多句同镜触发拆镜压力。" },
          ],
        },
      },
    }),
  ];
  const p2 = detectLipSplitPressure(shots[0]!, { vendorId: "agnesai" });
  const p11 = detectLipSplitPressure(shots[1]!, { vendorId: "agnesai" });
  ok("shot2 canSilentRaise", p2.canSilentRaise, JSON.stringify(p2));
  ok("shot11 mustConfirm", p11.mustConfirm, JSON.stringify(p11));

  const detail = classifyLipForChatRepairDetailed({ shots, blockHasLip01: true, vendorId: "agnesai" });
  ok("mixed has must shots", detail.mustShotIndexes.includes(11), JSON.stringify(detail));
  ok("mixed lists raise shot", detail.raiseShotIndexes.includes(2), JSON.stringify(detail));
  ok("mixed flag", detail.mixed);

  const text = buildAggregatedChatRepairText(
    [{ id: "RH-PR-09", chatTemplate: "lip" }],
    ["LIP-01", "DFW-DURATION"],
    "DFW-DURATION: 镜2 duration short\nDFW-DURATION: 镜11 duration short",
    [
      { id: "LIP-01", message: "镜2 时长短", shotIndex: 2 },
      { id: "LIP-01", message: "镜11 多句", shotIndex: 11 },
      { id: "DFW-DURATION", message: "镜2 DFW", shotIndex: 2 },
      { id: "DFW-DURATION", message: "镜11 DFW", shotIndex: 11 },
    ],
    { shots },
  );
  ok("repair mentions 逐镜 or 须手改", /LIP 逐镜|须手改/.test(text));
  const autoSection = text.split("【导入将自动适配")[1] ?? "";
  ok(
    "no DFW-DURATION under 导入可愈 for lip-pressure pack",
    !/DFW-DURATION/.test(autoSection.split("【")[0] ?? autoSection),
    autoSection.slice(0, 200),
  );
}

// --- 4) import兜底 raise clears canSilentRaise residual (hygiene kernel; skip full schema) ---
{
  const text =
    "这霜兰令本就是交易筹码你我今日一诺既定不可反悔此事攸关宗门。";
  const bundle = {
    bundleType: "script",
    meta: { vendorId: "agnesai" },
    script: text,
    preDesignPack: {
      scriptPlan: text,
      shots: [
        shot({
          shotIndex: 99,
          duration: 3,
          narrative: { dialogue: { lines: [{ speaker: "甲", text }] } },
        }),
      ],
    },
    planData: {},
  } as ScriptBundle;
  const hy = raiseDurationHygieneOnly(bundle, { vendorId: "agnesai" });
  const s99 = ((bundle.preDesignPack as { shots?: Record<string, unknown>[] })?.shots ?? []).find(
    (s) => Number(s.shotIndex) === 99,
  );
  ok("import-kernel raise duration > 3", Number(s99?.duration ?? 0) > 3 && hy.raised > 0, `dur=${s99?.duration};raised=${hy.raised}`);
  const p = detectLipSplitPressure(s99 ?? {});
  ok("import-kernel cleared canSilentRaise", !p.canSilentRaise, JSON.stringify(p));
}

// --- 5) multi-line: duration may raise; mustConfirm structure remains ---
{
  const bundle = {
    preDesignPack: {
      shots: [
        shot({
          shotIndex: 11,
          duration: 4,
          narrative: {
            dialogue: {
              lines: [
                { speaker: "乙", text: "第一句已经很长需要单独口型预算。" },
                { speaker: "乙", text: "第二句继续加长使得多句同镜触发拆镜压力。" },
              ],
            },
          },
        }),
      ],
    },
    meta: { vendorId: "agnesai" },
  } as ScriptBundle;
  const hy = raiseDurationHygieneOnly(bundle, { vendorId: "agnesai", respectEpisodeCap: false });
  const afterShot = ((bundle.preDesignPack as { shots: Record<string, unknown>[] }).shots[0])!;
  const p = detectLipSplitPressure(afterShot, { vendorId: "agnesai" });
  ok("multi-line still mustConfirm after dur raise", p.mustConfirm, JSON.stringify(p));
  ok("multi-line duration raised or already enough", hy.raised > 0 || Number(afterShot.duration) >= 4, JSON.stringify(hy));
}

// --- 6) user sample: 6/25/3 — raise 2&15, over-vendor 11 stays short of PR-09 ---
{
  const t2 =
    "这霜兰令本就是交易筹码你我今日一诺既定不可反悔此事攸关宗门存亡苍生。";
  const t11 =
    "霜兰令本是交易筹码你我今日一诺既定不可反悔此事攸关宗门存亡苍生安危岂能儿戏况且对方早有准备你若再退半步全盘皆输更何况城中暗桩已布四面楚歌。";
  const t15 =
    "今夜必须拿到霜兰令否则全盘皆输此事攸关宗门存亡岂能儿戏。";
  // Build texts that measure ≈15.8 / 34+ / 16 via chars
  const mk = (n: number) => "甲".repeat(n);
  const bundle = {
    meta: { vendorId: "agnesai" },
    preDesignPack: {
      shots: [
        shot({
          shotIndex: 2,
          duration: 6,
          narrative: { dialogue: { lines: [{ speaker: "甲", text: mk(63) }] } }, // ~15.8s at cps4
        }),
        shot({
          shotIndex: 11,
          duration: 25,
          narrative: { dialogue: { lines: [{ speaker: "乙", text: mk(137) }] } }, // ~34s
        }),
        shot({
          shotIndex: 15,
          duration: 3,
          narrative: { dialogue: { lines: [{ speaker: "丙", text: mk(65) }] } },
        }),
      ],
    },
  } as ScriptBundle;
  const hy = raiseDurationHygieneOnly(bundle, { vendorId: "agnesai", respectEpisodeCap: false });
  const byIdx = (i: number) =>
    ((bundle.preDesignPack as { shots: Record<string, unknown>[] }).shots ?? []).find(
      (s) => Number(s.shotIndex) === i,
    );
  const d2 = Number(byIdx(2)?.duration ?? 0);
  const d11 = Number(byIdx(11)?.duration ?? 0);
  const d15 = Number(byIdx(15)?.duration ?? 0);
  ok("sample shot2 raised above 6", d2 > 6, `d2=${d2};log=${hy.log.join(",")}`);
  ok("sample shot15 raised above 3", d15 > 3, `d15=${d15}`);
  ok("sample shot2 clears PR-09 floor", d2 >= 16, `d2=${d2}`);
  ok("sample shot15 clears PR-09 floor", d15 >= 16, `d15=${d15}`);
  // over-vendor: may partial to 30 but still < 34
  ok("sample shot11 still over lip need or at vendor max", d11 <= 30 && (d11 >= 25), `d11=${d11};over=${hy.skippedOverVendor}`);
  void t2;
  void t11;
  void t15;
}

// --- 7) Chat keeps over-vendor LIP BLOCK；Import soft（不硬拦）---
{
  const { runExportGate } = require("@/ruleEngine/exportGate") as typeof import("@/ruleEngine/exportGate");
  const mk = (n: number) => "甲".repeat(n);
  const raw = {
    bundleType: "script",
    bundleVersion: "1.0.0",
    rulePackVersion: "2.1.0",
    meta: { vendorId: "agnesai", episodeKey: "ep-lip" },
    script: "场1",
    preDesignPack: {
      scriptPlan: "场1",
      shots: [
        shot({
          shotIndex: 11,
          duration: 30,
          visualDescription: "中景对白超长",
          narrative: {
            dialogue: { lines: [{ speaker: "乙", text: mk(137) }] },
            shotSize: "MS",
          },
          generation: { imagePrompt: "x", videoPrompt: "speaking lip-sync", audioPrompt: "口型" },
        }),
      ],
    },
    planData: {},
  };
  const chat = runExportGate(structuredClone(raw), { allowShapeSalvage: false });
  ok(
    "Chat path LIP-01 still BLOCK (设计不过绿)",
    chat.blocks.some((b) => b.id === "LIP-01") || !chat.exportAllowed,
    `blocks=${chat.blocks.map((b) => b.id).join(",")}`,
  );
  const imp = runExportGate(structuredClone(raw), { allowShapeSalvage: true });
  ok(
    "Import path LIP not hard BLOCK after soft",
    !imp.blocks.some((b) => b.id === "LIP-01"),
    `blocks=${imp.blocks.map((b) => b.id).join(",")}`,
  );
  ok(
    "Import surfaces lip as warn or designExitIncomplete",
    imp.designExitIncomplete === true ||
      imp.warns.some((w) => w.id === "LIP-01" || /反推设计|导入不拦/.test(w.message)),
    `incomplete=${imp.designExitIncomplete};warns=${imp.warns.map((w) => w.id).slice(0, 6).join(",")}`,
  );
}

console.log("\nAll lip design-raise goldens passed.");
