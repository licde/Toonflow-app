/**
 * Diagnose real DeepSeek sample against current seal/exportGate.
 */
import fs from "fs";
import { runExportGate } from "../src/ruleEngine/exportGate";
import { sealThemeGlueUntilClear } from "../src/ruleEngine/design/sealThemeGlueUntilClear";
import { auditPropContinuity } from "../src/ruleEngine/compilers/propContinuitySsot";
import {
  getShotDesignIntentsFromPlan,
  auditIntentPictureSync,
} from "../src/ruleEngine/design/shotDesignIntent";

const path =
  process.argv[2] ||
  String.raw`C:\Users\PC\.cursor\projects\i-toonflow-new-Toonflow-app\uploads\c__Users_PC_Downloads_deepseek_json_20260730_0e8e29-L1-L494-0.json`;

const raw = JSON.parse(fs.readFileSync(path, "utf8"));
const shots = raw.preDesignPack?.shots ?? [];
console.log(
  "shots",
  shots.length,
  "propStates",
  shots.map((s: { shotIndex?: number; propState?: string; shotDesign?: { propState?: string } }) => ({
    i: s.shotIndex,
    ps: s.propState || s.shotDesign?.propState || "(none)",
  })),
);
const intents0 = getShotDesignIntentsFromPlan(raw.planData || {});
console.log(
  "intents before",
  intents0.length,
  intents0.map((i) => ({ si: (i as { shotIndex?: number }).shotIndex, pic: String(i.picture || "").slice(0, 40) })),
);

const clone = JSON.parse(JSON.stringify(raw));
const seal = sealThemeGlueUntilClear(clone);
console.log("seal", seal);
console.log("prop audit after seal", auditPropContinuity(clone.preDesignPack.shots));
const intents = getShotDesignIntentsFromPlan(clone.planData || {});
console.log(
  "intent audit after seal",
  auditIntentPictureSync({ intents, shots: clone.preDesignPack.shots }),
);

const gate = runExportGate(JSON.parse(JSON.stringify(raw)), { allowShapeSalvage: true });
console.log("blocks", gate.blocks.map((b) => b.id));
console.log("exportAllowed", gate.exportAllowed, "tier", gate.tier, "exitIncomplete", gate.designExitIncomplete);
console.log("preview", gate.previewStatusLine);
console.log(
  "warns theme",
  (gate.warns || [])
    .filter((w) => /PROP|INTENT|CAM|THEME|seal/.test(`${w.id} ${w.message}`))
    .map((w) => `${w.id}: ${w.message.slice(0, 80)}`),
);
console.log("cleared", gate.autoClosed?.clearedIds);
console.log("remainingFailed", gate.autoClosed?.remainingFailedIds);
console.log("--- full chatRepairText ---");
console.log(gate.chatRepairText);
