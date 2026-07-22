/**
 * yarn test:semantic-gate-dual — F0 false-green fix, paste strip, ingest heals, NAR still strict.
 */
import fs from "fs";
import path from "path";
import { prepareBundleWithLog, parseBundleJson, stripChatRepairPrefix, scriptBundleSchema } from "@/ruleEngine/bundle/schema";
import { prepareBundleForInspect } from "@/ruleEngine/bundle/prepareBundleForInspect";
import { runExportGate, buildAggregatedChatRepairText } from "@/ruleEngine/exportGate";
import { runDesignPhaseGates } from "@/ruleEngine/bundle/designPhaseGates";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const matrixPath = path.join(process.cwd(), "data/fixtures/semantic_gate_dual_track_matrix.json");
ok("matrix exists", fs.existsSync(matrixPath));
const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf-8")) as {
  rows: unknown[];
  autoAdaptBlockIds: string[];
  mustEditBlockIds: string[];
};
ok("matrix rows", (matrix.rows?.length ?? 0) >= 8);
ok("mustEdit has NAR-15", matrix.mustEditBlockIds.includes("NAR-15"));
ok("autoAdapt has DFW-DURATION", matrix.autoAdaptBlockIds.includes("DFW-DURATION"));
ok("autoAdapt has NAR-14", matrix.autoAdaptBlockIds.includes("NAR-14"));

/** Minimal F0-only shots — should NOT trigger DG-FALSE-GREEN-FX */
const f0Bundle = {
  bundleType: "script",
  bundleVersion: "1.0.0",
  rulePackVersion: "2.1.0",
  meta: { episodeKey: "ep-01" },
  script: "场1\n角色：甲\n甲：你好。",
  preDesignPack: {
    scriptPlan: "场1",
    shots: [1, 2, 3].map((i) => ({
      id: `shot-${i}`,
      shotIndex: i,
      visualDescription: `画面${i}`,
      visualEffect: "F0",
      duration: 2,
      narrative: {
        type: "CHAR-SCENE",
        sceneName: "场1",
        emotionIntensity: 3,
        shotSize: "中景",
        duration: 2,
        dialogue: { lines: [{ speaker: "甲", text: "你好。", lineId: `L-${i}` }] },
      },
    })),
  },
};

const prepStrict = prepareBundleForInspect(f0Bundle, { ingestHeal: false });
const findings = runDesignPhaseGates(prepStrict.bundle);
ok(
  "DG-FALSE-GREEN-FX not on F0 shots",
  !findings.findings.some((f) => f.id === "DG-FALSE-GREEN-FX"),
  findings.findings.map((f) => f.id).join(","),
);

/** Paste hybrid strip */
const hybrid = `【闭环修复清单 — 请按项修改 JSON 字段】
待处理规则：NAR-14
【BLOCK 明细】
- NAR-14: 缺 splitHint
[RH-MOD-01] 将 shots[].visualEffect 改为 string，禁止 object {level,desc}。

{
  "bundleVersion": "browser-chat-optimized",
  "rulePackVersion": "2.1.0",
  "bundleType": "script",
  "meta": { "episodeKey": "ep-01" },
  "script": "x"
}`;
const stripped = stripChatRepairPrefix(hybrid);
ok("strip starts with brace", stripped.trimStart().startsWith("{"));
ok("strip has bundleVersion", stripped.includes('"bundleVersion"'));
const parsedHybrid = parseBundleJson(hybrid) as { bundleType?: string };
ok("parseBundleJson hybrid", parsedHybrid.bundleType === "script");

/** Shape salvage regression: narrative beats + spatial object */
const shapeBundle = {
  ...f0Bundle,
  designBrief: {
    B12: [{ scene: "场1", zone: "起", beats: "自残取佩，立下决意" }],
  },
  preDesignPack: {
    scriptPlan: "场1",
    shots: [
      {
        id: "shot-1",
        shotIndex: 1,
        visualDescription: "祠堂",
        visualEffect: "F0",
        audioCue: "簪刺入血肉声",
        spatialRelation: { axis: "甲-乙", anchors: ["左", "右"] },
        duration: 2,
        narrative: {
          type: "CHAR-SCENE",
          sceneName: "场1",
          emotionIntensity: 5,
          shotSize: "中景",
          dialogue: { lines: [{ speaker: "甲", text: "十天。若拿不到霜兰令，他就会把我送去和亲。" }] },
        },
      },
    ],
  },
};
const shapePrep = prepareBundleWithLog(shapeBundle);
ok(
  "SH-B12-BEATS",
  shapePrep.shapeSalvageLog.some((e) => e.ruleId === "SH-B12-BEATS"),
);
ok(
  "SH-SHOT-SPATIAL",
  shapePrep.shapeSalvageLog.some((e) => e.ruleId === "SH-SHOT-SPATIAL"),
);
scriptBundleSchema.parse(shapePrep.bundle);
ok("schema green after shape salvage", true);

/** ingestHeal seeds prompts + duration */
const shortDur = {
  ...shapeBundle,
  preDesignPack: {
    scriptPlan: "场1",
    shots: [
      {
        id: "shot-1",
        shotIndex: 1,
        visualDescription: "铜镜中苍白的脸",
        visualEffect: "F0",
        audioCue: "银簪刺入声",
        duration: 2,
        narrative: {
          type: "CHAR-SCENE",
          sceneName: "场1",
          emotionIntensity: 5,
          shotSize: "特写",
          transitionType: "硬切",
          dialogue: {
            lines: [
              {
                speaker: "甲",
                text: "十天。若拿不到霜兰令，他就会把我送去和亲。所以今夜要么他收下我的忠心。",
                lineId: "L-01",
              },
            ],
          },
        },
      },
    ],
  },
};

const ingest = prepareBundleForInspect(shortDur, { ingestHeal: true });
const shot = ingest.bundle.preDesignPack!.shots[0]!;
ok("duration aligned", (shot.duration ?? 0) > 2, `duration=${shot.duration}`);
ok("imagePrompt seeded", Boolean(shot.generation?.imagePrompt?.trim()), String(shot.generation?.imagePrompt));
ok("audioPrompt seeded", Boolean(shot.generation?.audioPrompt?.trim()), String(shot.generation?.audioPrompt));
ok("videoPrompt seeded", Boolean(shot.generation?.videoPrompt?.trim()), String(shot.generation?.videoPrompt));
ok(
  "heal log present",
  (ingest.shapeSalvageLog ?? []).some((e) =>
    ["SH-DURATION-ALIGN", "SH-IMG-SEED", "SH-AUD-SEED", "SH-VID-SEED", "SH-TRANSITION", "SH-FX-F0"].includes(e.ruleId),
  ),
  JSON.stringify(ingest.shapeSalvageLog?.slice(0, 6)),
);
ok("summary present", Boolean(ingest.shapeSalvageSummary?.includes("已自动适配")));

/** Chat strict path: NAR-14 still blocks; layered repair text */
const narBundle = {
  bundleType: "script",
  bundleVersion: "1.0.0",
  rulePackVersion: "2.1.0",
  meta: { episodeKey: "ep-01" },
  script: "甲：十天。若拿不到霜兰令，他就会把我送去和亲。",
  planData: {
    dialoguePlan: {
      lines: [
        {
          lineId: "L-01",
          speaker: "甲",
          text: "十天。若拿不到霜兰令，他就会把我送去和亲。所以今夜要么他收下。",
          functions: ["emotion_hit"],
        },
      ],
    },
  },
  preDesignPack: {
    scriptPlan: "场1",
    shots: [
      {
        id: "shot-1",
        shotIndex: 1,
        visualDescription: "特写",
        visualEffect: "F0",
        duration: 8,
        narrative: {
          type: "CHAR-SCENE",
          sceneName: "场1",
          emotionIntensity: 7,
          shotSize: "特写",
          dialogue: {
            lines: [
              {
                lineId: "L-01",
                speaker: "甲",
                text: "十天。若拿不到霜兰令，他就会把我送去和亲。所以今夜要么他收下。",
                functions: ["emotion_hit"],
              },
            ],
          },
        },
        generation: {
          imagePrompt: "特写",
          videoPrompt: "特写, speaking lip-sync",
          audioPrompt: "口型同步",
        },
      },
    ],
  },
};

const chatGate = runExportGate(narBundle);
const text = buildAggregatedChatRepairText(
  chatGate.repairHints,
  chatGate.closureSnapshot.blockIds,
  chatGate.missingFieldSummary,
  chatGate.blocks,
);
ok("layered must-edit header", text.includes("【须手改 · Chat 契约】"));
ok("layered auto-adapt header", text.includes("【导入将自动适配 · 可不手改】"));
const narBlocked =
  chatGate.blocks.some((b) => b.id === "NAR-14" || b.id === "NAR-15") ||
  chatGate.designFindings.some((f) => f.id === "NAR-14" || f.id === "NAR-15");
ok("NAR-14/15 still strict on chat path", narBlocked, chatGate.blocks.map((b) => b.id).slice(0, 12).join(","));

if (failed) {
  console.error(`\n${failed} FAILED`);
  process.exit(1);
}
console.log("\n=== test:semantic-gate-dual OK ===");
