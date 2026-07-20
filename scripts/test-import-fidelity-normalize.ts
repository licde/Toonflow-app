/**
 * yarn test:import-fidelity-normalize
 * Unit: sceneName→SCENE + sref without DB.
 */
import { allocateSceneCodes, normalizePreDesignPack, normalizePropCode } from "@/ruleEngine/bundle/normalizePreDesignPack";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const map = allocateSceneCodes(["沈家祠堂", "沈家祠堂", "萧府静水阁"]);
ok("dedupe scene names", map.size === 2);
ok("stable SCENE-001", map.get("沈家祠堂") === "SCENE-001");
ok("PROP_TMS", normalizePropCode("PROP_TMS") === "PROP-TMS");

const bundle = {
  preDesignPack: {
    scriptPlan: "x",
    shots: [
      {
        shotIndex: 1,
        sceneName: "沈家祠堂",
        duration: 3,
        shotSize: "CU",
        charCodes: ["CHAR-SHENQINGCI"],
        narrative: {
          dialogue: { lines: [{ speaker: "沈母", text: "你好" }] },
          emotionIntensity: 6,
        },
        shotDesign: { performance: { microExpression: { eyes: "冷厉", mouthDetail: "pressed" } } },
        generation: { imagePrompt: "x --cref CHAR-SHENQINGCI --ar 9:16", videoPrompt: "特写 static, duration 3s" },
      },
    ],
  },
  visualLockTable: { sceneColorLock: { 沈家祠堂: "暖光3000K" } },
  characterDesign: { assets: [{ code: "CHAR-SHENQINGCI", L5: { timbre: "清冷" } }] },
  planData: {
    narrativeBrief: {
      implementationPlan: [{ sceneRef: 1, fxIntent: { level: "F1" }, voiceIntent: { speaker: "沈母", tone: "冰冷" } }],
    },
  },
} as unknown as ScriptBundle;

const { shots } = normalizePreDesignPack(bundle);
const s = shots[0] as {
  sceneCode?: string;
  colorTemp?: string;
  voice?: string;
  generation?: { fxPrompt?: string; imagePrompt?: string };
  narrative?: { spatialRelation?: string };
};
ok("sceneCode", s.sceneCode === "SCENE-001");
ok("sref on image", /--sref\s+SCENE-001/.test(s.generation?.imagePrompt ?? ""));
ok("fx F1", /F1/i.test(s.generation?.fxPrompt ?? ""));
ok("colorTemp", Boolean(s.colorTemp));
ok("micro spatial", /microExpr/.test(s.narrative?.spatialRelation ?? ""));
ok("voice", /voice:/.test(s.voice ?? ""));

if (failed) process.exit(1);
console.log("\n=== test:import-fidelity-normalize OK ===");
