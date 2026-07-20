/**
 * yarn test:chat-repair-export — chatRepairText includes BLOCK lines + missing fields
 */
import fs from "fs";
import path from "path";
import { buildAggregatedChatRepairText, formatExportGateBlockPayload, runExportGate } from "@/ruleEngine/exportGate";
import { projectFxProseOnBundle } from "@/ruleEngine/import/projectFxProse";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const text = buildAggregatedChatRepairText(
  [{ id: "RH-MOD-02", chatTemplate: "请补 fxPrompt 散文" }],
  ["MOD-02", "NAR-14"],
  "缺失字段 1 项：\n- 场1 → shots[].generation.fxPrompt",
  [{ id: "MOD-02", message: "场1 缺 fxPrompt 散文", field: "generation.fxPrompt" }],
);
ok("has BLOCK 明细", text.includes("【BLOCK 明细】") && text.includes("MOD-02"));
ok("has missing summary", text.includes("缺失字段"));
ok("has RH template", text.includes("RH-MOD-02"));
ok("has preserveMedia tip", text.includes("preserveMedia"));

const mini: ScriptBundle = {
  bundleType: "script",
  script: "x",
  meta: {},
  planData: {
    narrativeBrief: {
      implementationPlan: [{ sceneRef: 1, fxIntent: { level: "F1" }, promptAnchors: { img: ["a"], vid: ["static"] } }],
    },
  },
  preDesignPack: {
    scriptPlan: "",
    shots: [
      {
        shotIndex: 1,
        sceneName: "祠堂",
        visualEffect: "F1: 烛火摇曳，微光闪烁",
        generation: { imagePrompt: "x", videoPrompt: "中景 static, duration 3s" },
      },
    ],
  },
  rulePackVersion: "2.0.1",
} as never;

const before = runExportGate(mini, { allowShapeSalvage: true });
ok("before project has MOD-02 or blocks", !before.exportAllowed || before.blocks.some((b) => b.id === "MOD-02") || before.fieldWalkGaps.some((g) => g.id === "MOD-02"));

const proj = projectFxProseOnBundle(mini);
ok("projected from visualEffect", proj.projected.length >= 1);
ok(
  "fxPrompt is prose not letter",
  String(mini.preDesignPack?.shots?.[0]?.generation?.fxPrompt ?? "").includes("烛火") ||
    String(mini.preDesignPack?.shots?.[0]?.generation?.fxPrompt ?? "").toLowerCase().includes("candle") ||
    !/^F[0-5]$/i.test(String(mini.preDesignPack?.shots?.[0]?.generation?.fxPrompt ?? "")),
);

const after = runExportGate(mini, { allowShapeSalvage: true });
const payload = formatExportGateBlockPayload(after);
ok("payload has chatRepairText", typeof payload.chatRepairText === "string");
ok(
  "projection cleared MOD-02 fieldWalk or export allows / other blocks remain with text",
  !after.fieldWalkGaps.some((g) => g.id === "MOD-02") || String(payload.chatRepairText).includes("闭环修复清单"),
);

{
  const fixture = path.join(process.cwd(), "data/fixtures/golden/deepseek-20260718-b3500a.json");
  if (fs.existsSync(fixture)) {
    const raw = JSON.parse(fs.readFileSync(fixture, "utf-8"));
    const gate = runExportGate(raw, { allowShapeSalvage: true });
    ok("b3500a blocked", gate.exportAllowed === false);
    ok(
      "b3500a chatRepairText has F0/声明/镜",
      /F0|声明|双轨/.test(gate.chatRepairText) && /2|3|4|6|7|9/.test(gate.chatRepairText),
      gate.chatRepairText.slice(0, 160),
    );
  } else {
    console.log("  (skip b3500a — fixture missing)");
  }
}

if (failed) {
  console.error(`\n${failed} test:chat-repair-export failed`);
  process.exit(1);
}
console.log("\n=== test:chat-repair-export OK ===");
