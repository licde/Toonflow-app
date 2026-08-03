/**
 * yarn test:g-export-theme-glue-seal
 * exportGate must not list DEX-PROP-CONT / DEX-INTENT-PIC as open BLOCK after seal.
 * Also runs real DeepSeek sample when present.
 */
import fs from "fs";
import path from "path";
import { runExportGate } from "../src/ruleEngine/exportGate";

function ok(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
  console.log("✓", msg);
}

function assertThemeGlueCleared(gate: ReturnType<typeof runExportGate>, label: string) {
  const blockIds = gate.blocks.map((b) => b.id);
  const text = gate.chatRepairText;
  ok(!blockIds.includes("DEX-PROP-CONT"), `${label}: PROP-CONT not in blocks`);
  ok(!blockIds.includes("DEX-INTENT-PIC"), `${label}: INTENT-PIC not in blocks`);
  ok(!/untilClear 未清零/.test(text), `${label}: no 未清零 banner`);
  ok(
    gate.autoClosed?.clearedIds?.includes("DEX-PROP-CONT") ||
      (gate.warns ?? []).some((w) => w.id === "DEX-PROP-CONT"),
    `${label}: PROP sealed`,
  );
  ok(
    gate.autoClosed?.clearedIds?.includes("DEX-INTENT-PIC") ||
      (gate.warns ?? []).some((w) => w.id === "DEX-INTENT-PIC"),
    `${label}: INTENT sealed`,
  );
  ok(!/服务端 untilClear \/ 自动适配：[^\n]*DEX-PROP-CONT/.test(text), `${label}: PROP not in autoPending header`);
  ok(!/服务端 untilClear \/ 自动适配：[^\n]*DEX-INTENT-PIC/.test(text), `${label}: INTENT not in autoPending header`);
  ok(gate.exportAllowed === true || blockIds.length === 0, `${label}: exportAllowed or empty blocks`);
}

const raw = {
  bundleVersion: "1.0.0",
  bundleType: "script",
  meta: { projectId: 1, episodeKey: "ep1", title: "theme-glue-seal" },
  script: "测试集",
  preDesignPack: {
    scriptPlan: "测试集",
    shots: [
      {
        shotIndex: 1,
        visualDescription: "沈清漪手持休书立于殿中对质",
        sceneName: "大殿",
        shotSize: "中景",
        duration: 3,
        generation: {
          imagePrompt: "沈清漪手持休书立于殿中对质",
          videoPrompt: "[Visual]\n沈清漪手持休书\n[Motion]\n0s-3s: 微动对质",
        },
      },
      {
        shotIndex: 2,
        visualDescription: "两人分立阶前对峙",
        sceneName: "大殿",
        shotSize: "中景",
        duration: 2,
        generation: {
          imagePrompt: "两人分立阶前对峙",
          videoPrompt: "[Visual]\n两人分立对峙\n[Motion]\n0s-2s: 静持",
        },
      },
      {
        shotIndex: 3,
        visualDescription: "殿柱光影横切",
        sceneName: "大殿",
        shotSize: "全景",
        duration: 2,
        generation: {
          imagePrompt: "殿柱光影横切",
          videoPrompt: "[Visual]\n殿柱光影\n[Motion]\n0s-2s: 光影横切",
        },
      },
    ],
  },
  planData: {
    shotDesignIntent: [
      {
        purpose: "信息",
        emotionGoal: "冷",
        picture: "花园/流水/桃花/亭台/柳絮",
        shotSizeIntent: "近景",
        cutIntent: "切",
        audioIntent: "无",
        durationSec: 3,
        shotIndex: 1,
      },
    ],
    dialoguePlan: { lines: [] },
  },
  narrativeSelfcheck: { passed: false },
  characterDesign: { assets: [{ code: "CHAR-01", name: "沈清漪", L0: { identity: "女主" } }] },
};

assertThemeGlueCleared(runExportGate(raw, { allowShapeSalvage: true }), "synthetic");

const sampleCandidates = [
  path.resolve(
    "C:/Users/PC/.cursor/projects/i-toonflow-new-Toonflow-app/uploads/c__Users_PC_Downloads_deepseek_json_20260730_0e8e29-L1-L494-0.json",
  ),
  path.resolve(__dirname, "../data/fixtures/golden/deepseek-20260730-0e8e29.json"),
];
for (const p of sampleCandidates) {
  if (!fs.existsSync(p)) continue;
  const sample = JSON.parse(fs.readFileSync(p, "utf8"));
  assertThemeGlueCleared(runExportGate(sample, { allowShapeSalvage: true }), `sample:${path.basename(p)}`);
  break;
}

console.log("\ntest:g-export-theme-glue-seal OK");
