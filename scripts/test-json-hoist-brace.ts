/**
 * Brace + planData hoist salvage regression (霜兰令式错位/截断).
 * yarn test:json-hoist-brace
 */
import { prepareBundleWithLog, parseBundleJsonWithSalvage, JsonIncompleteError } from "../src/ruleEngine/bundle/bundleShapePipeline";
import { tryCompleteRootBraces } from "../src/ruleEngine/bundle/jsonBraceSalvage";
import { hoistPlanDataPackaging } from "../src/ruleEngine/bundle/hoistPlanDataPackaging";
import { ShapeSalvageLog } from "../src/ruleEngine/bundle/shapeSalvageTypes";
import { runDesignPhaseGates } from "../src/ruleEngine/bundle/designPhaseGates";
import { runExportGate } from "../src/ruleEngine/exportGate";
import type { ScriptBundle } from "../src/ruleEngine/bundle/types";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error(`✗ ${name}`, detail ?? "");
    process.exitCode = 1;
    throw new Error(name);
  }
  console.log(`✓ ${name}`);
}

// --- brace: missing root } ---
const nestedFull = {
  bundleVersion: "browser-chat-optimized",
  rulePackVersion: "2.1.0",
  bundleType: "script",
  meta: { episodeKey: "ep-01" },
  script: "场1\n沈父：谢家主深夜来此，又是为了你？\n",
  planData: {
    dialoguePlan: {
      lines: [{ lineId: "L-01a", speaker: "沈父", text: "谢家主深夜来此，又是为了你？" }],
    },
    characterDesign: {
      assets: [{ code: "CHAR-SHENFU", name: "沈父", L0: { identity: "沈家家主" } }],
    },
    preDesignPack: {
      scriptPlan: "# plan",
      shots: [
        {
          shotIndex: 1,
          sceneName: "沈府·祠堂",
          visualDescription: "中景。沈父拍案。",
          narrative: {
            dialogue: {
              lines: [{ lineId: "L-01a", speaker: "沈父", text: "谢家主深夜来此，又是为了你？" }],
            },
          },
        },
      ],
    },
    designBrief: { B1: "ep-01", B6: { characters: ["沈父"] } },
  },
};

const fullJson = JSON.stringify(nestedFull);
const truncated = fullJson.slice(0, -1); // drop root }
ok("truncated depth needs brace", (() => {
  try {
    JSON.parse(truncated);
    return false;
  } catch {
    return true;
  }
})());

const braced = tryCompleteRootBraces(truncated);
ok("brace salvage", braced.salvaged && braced.bracesAdded === 1, JSON.stringify(braced.entry));
ok("brace parses", Boolean(JSON.parse(braced.text)));

const withSalvage = parseBundleJsonWithSalvage(truncated);
ok("parseBundleJsonWithSalvage brace entry", withSalvage.braceEntry?.ruleId === "SH-JSON-BRACE");

const prep = prepareBundleWithLog(truncated);
ok(
  "prepare hoist PDP",
  Array.isArray((prep.bundle.preDesignPack as { shots?: unknown[] })?.shots) &&
    (prep.bundle.preDesignPack as { shots: unknown[] }).shots.length === 1,
);
ok(
  "prepare hoist CD",
  Array.isArray((prep.bundle.characterDesign as { assets?: unknown[] })?.assets) &&
    (prep.bundle.characterDesign as { assets: unknown[] }).assets.length === 1,
);
ok(
  "prepare hoist brief",
  Boolean(prep.bundle.designBrief),
);
ok(
  "salvage log has HOIST+BRACE",
  prep.shapeSalvageLog.some((e) => e.ruleId === "SH-JSON-BRACE") &&
    prep.shapeSalvageLog.some((e) => e.ruleId === "SH-HOIST-PDP") &&
    prep.shapeSalvageLog.some((e) => e.ruleId === "SH-HOIST-CD"),
  prep.shapeSalvageLog.map((e) => e.ruleId).join(","),
);

const gates = runDesignPhaseGates(prep.bundle as ScriptBundle);
ok("no DG-EMPTY after hoist", !gates.findings.some((f) => f.id === "DG-EMPTY" && f.severity === "BLOCK"), gates.findings.map((f) => f.id).join(","));

// --- empty top shell + nested ---
const emptyTop = {
  ...nestedFull,
  preDesignPack: { shots: [] },
  planData: nestedFull.planData,
};
const log2 = new ShapeSalvageLog();
const b2 = JSON.parse(JSON.stringify(emptyTop)) as Record<string, unknown>;
hoistPlanDataPackaging(b2, log2);
ok("empty top still hoist", (b2.preDesignPack as { shots: unknown[] }).shots.length === 1);
ok("empty top log PDP", log2.entries.some((e) => e.ruleId === "SH-HOIST-PDP"));

// --- conflict: top 1, nested 3 ---
const conflict = {
  preDesignPack: { shots: [{ shotIndex: 1 }, { shotIndex: 2 }] },
  planData: {
    preDesignPack: {
      shots: Array.from({ length: 6 }, (_, i) => ({ shotIndex: i + 1 })),
    },
  },
};
const log3 = new ShapeSalvageLog();
const b3 = JSON.parse(JSON.stringify(conflict)) as Record<string, unknown>;
hoistPlanDataPackaging(b3, log3);
ok("conflict keeps top", (b3.preDesignPack as { shots: unknown[] }).shots.length === 2);
ok("conflict WARN", log3.entries.some((e) => e.ruleId === "SH-HOIST-CONFLICT"));

// --- mid-string reject ---
const midStr = '{"a":"hello';
const mid = tryCompleteRootBraces(midStr);
ok("mid-string reject", !mid.salvaged && mid.reject instanceof JsonIncompleteError);

// --- mid structure (ends with colon value missing) ---
const midObj = '{"a":1,"b":';
const mid2 = tryCompleteRootBraces(midObj);
ok("mid-structure reject", !mid2.salvaged && Boolean(mid2.reject));

// --- exportGate incomplete → JSON_INCOMPLETE not DG-EMPTY ---
const eg = runExportGate("{");
ok("exportGate JSON_INCOMPLETE", eg.blocks.some((b) => b.id === "JSON_INCOMPLETE"));
ok("exportGate not DG-EMPTY primary", !eg.blocks.some((b) => b.id === "DG-EMPTY"));
ok("chatRepair mentions JSON_INCOMPLETE", /JSON_INCOMPLETE/.test(eg.chatRepairText));

// --- flowData-only bypass ---
const flowOnly = {
  bundleVersion: "x",
  flowData: { storyboard: [{ id: 1 }, { id: 2 }] },
  preDesignPack: { shots: [] },
};
const gFlow = runDesignPhaseGates(flowOnly as ScriptBundle);
ok(
  "flowData bypass no BLOCK empty",
  !gFlow.findings.some((f) => f.id === "DG-EMPTY" && f.severity === "BLOCK"),
  gFlow.findings.map((f) => `${f.id}:${f.severity}`).join(","),
);
ok("flowData WARN", gFlow.findings.some((f) => f.id === "DG-FLOW-ONLY"));

// --- chat repair structure banner ---
const eg2 = runExportGate(truncated, { allowShapeSalvage: true });
ok(
  "structure salvage banner",
  /已结构 salvage|SH-HOIST|SH-JSON-BRACE/.test(eg2.chatRepairText),
  eg2.chatRepairText.slice(0, 200),
);
ok("after hoist no DG-EMPTY block", !eg2.blocks.some((b) => b.id === "DG-EMPTY"));

console.log("json-hoist-brace OK");
