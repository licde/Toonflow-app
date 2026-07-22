/**
 * yarn test:shape-dual-matrix — B12 narrative beats + spatial object salvage;
 * peer regression; SCHEMA repairHints for B12/spatial paths.
 */
import fs from "fs";
import path from "path";
import { prepareBundleWithLog, scriptBundleSchema } from "@/ruleEngine/bundle/schema";
import { formatSchemaShapeBlock } from "@/ruleEngine/bundle/schemaShapeErrors";
import { formatShapeSalvageSummary } from "@/ruleEngine/bundle/shapeSalvageTypes";
import { ZodError } from "zod";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const matrixPath = path.join(process.cwd(), "data/fixtures/shape_dual_form_matrix.json");
ok("matrix fixture exists", fs.existsSync(matrixPath));
const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf-8")) as {
  rows: { salvageId: string | null; status: string }[];
};
ok("matrix has rows", (matrix.rows?.length ?? 0) >= 10, `rows=${matrix.rows?.length}`);
ok(
  "B12 + spatial marked salvage_extended",
  matrix.rows.filter((r) => r.status === "salvage_extended").length >= 2,
);

/** Minimal Untitled-3 shape: narrative beats + B13-like spatial objects */
const untitled3Shape = {
  bundleType: "script",
  bundleVersion: "1.0.0",
  rulePackVersion: "2.1.0",
  meta: { episodeKey: "ep-01", episodeIndex: 1 },
  script: "【场】祠堂\n沈清漪：取佩。",
  designBrief: {
    B1: "ep-01",
    B2: "测试",
    B12: [
      { scene: "祠堂", zone: "起", beats: "自残取佩，立下决意" },
      { scene: "正厅", zone: "承", beats: "3" },
    ],
  },
  preDesignPack: {
    scriptPlan: "【场1】祠堂\n【场2】正厅",
    shots: [
      {
        id: "shot-1",
        shotIndex: 1,
        visualDescription: "祠堂内沈清漪立于案前",
        spatialRelation: {
          axis: "谢玄辞-沈清漪",
          anchors: ["立于树影下", "从光亮处走来"],
        },
        narrative: {
          type: "CHAR-SCENE",
          sceneName: "祠堂",
          emotionIntensity: 5,
          shotSize: "中景",
          duration: 3,
          dialogue: { lines: [{ speaker: "沈清漪", text: "取佩。" }] },
        },
      },
      {
        id: "shot-2",
        shotIndex: 2,
        visualDescription: "正厅对峙",
        visualEffect: { level: "F1", desc: "烛火摇曳" },
        narrative: {
          type: "CHAR-SCENE",
          sceneName: "正厅",
          emotionIntensity: 6,
          shotSize: "全景",
          duration: 4,
          dialogue: { lines: [{ speaker: "沈母", text: "放下。" }] },
        },
      },
      {
        id: "shot-3",
        shotIndex: 3,
        visualDescription: "B20 peer",
        narrative: {
          type: "CHAR-SCENE",
          sceneName: "正厅",
          emotionIntensity: 4,
          shotSize: "中景",
          duration: 2,
        },
      },
    ],
  },
};

const prep = prepareBundleWithLog(untitled3Shape);
const b12Log = prep.shapeSalvageLog.filter((e) => e.ruleId === "SH-B12-BEATS");
const spatialLog = prep.shapeSalvageLog.filter((e) => e.ruleId === "SH-SHOT-SPATIAL");
const veLog = prep.shapeSalvageLog.filter((e) => e.ruleId === "SH-VISUAL-EFFECT-OBJ");

ok("SH-B12-BEATS ran", b12Log.length >= 1, JSON.stringify(b12Log.slice(0, 2)));
ok(
  "narrative beats → summary",
  b12Log.some((e) => e.action.includes("narrative→summary")),
  b12Log.map((e) => e.action).join("; "),
);
ok("numeric string beats coerced", b12Log.some((e) => e.action.includes("string→number")));
ok("SH-SHOT-SPATIAL object→string", spatialLog.some((e) => e.action.includes("object→string")));
ok("SH-VISUAL-EFFECT-OBJ peer", veLog.length >= 1);

const b12 = (prep.bundle.designBrief as { B12: { beats: unknown; summary?: string }[] }).B12;
ok("B12[0].beats is number", typeof b12[0]?.beats === "number", `beats=${b12[0]?.beats}`);
ok("B12[0].summary preserved", b12[0]?.summary === "自残取佩，立下决意", String(b12[0]?.summary));
ok("B12[1].beats is 3", b12[1]?.beats === 3);

const shot0 = (prep.bundle.preDesignPack as { shots: Record<string, unknown>[] }).shots[0]!;
ok("top-level spatialRelation removed", shot0.spatialRelation === undefined);
const narr = shot0.narrative as { spatialRelation?: string };
ok(
  "narrative.spatialRelation is string with axis",
  typeof narr.spatialRelation === "string" && narr.spatialRelation.includes("axis="),
  String(narr.spatialRelation),
);

let parseOk = false;
try {
  scriptBundleSchema.parse(prep.bundle);
  parseOk = true;
} catch (e) {
  console.error("parse error", e instanceof ZodError ? e.issues.slice(0, 5) : e);
}
ok("salvage then schema.parse green", parseOk);

const summary = formatShapeSalvageSummary(prep.shapeSalvageLog);
ok("shapeSalvageSummary present", typeof summary === "string" && summary.includes("已自动适配"), String(summary)?.slice(0, 80));

/** repairHints without salvage (raw wrong shapes) */
const rawFail = {
  bundleType: "script",
  bundleVersion: "1.0.0",
  meta: {},
  script: "x",
  designBrief: { B12: [{ scene: "S", zone: "起", beats: "叙事串不可解析为数字且故意跳过salvage" }] },
  preDesignPack: {
    shots: [
      {
        id: "s1",
        spatialRelation: { axis: "a-b", anchors: ["左"] },
        narrative: { type: "CHAR-SCENE", sceneName: "S" },
      },
    ],
  },
};
// Force schema error path: parse without prepareBundleWithLog
let shapeBlock;
try {
  scriptBundleSchema.parse(rawFail);
  ok("expected SCHEMA fail without salvage", false);
} catch (e) {
  ok("ZodError without salvage", e instanceof ZodError);
  if (e instanceof ZodError) {
    shapeBlock = formatSchemaShapeBlock(e);
    const ids = shapeBlock.repairHints.map((h) => h.id);
    ok("RH-B12-BEATS in repairHints", ids.includes("RH-B12-BEATS"), ids.join(","));
    ok("RH-SPATIAL-OBJ in repairHints", ids.includes("RH-SPATIAL-OBJ"), ids.join(","));
    ok("chatRepairText non-empty", shapeBlock.chatRepairText.length > 40);
  }
}

/** B20 object[] peer still salvages */
const b20Peer = {
  bundleType: "script",
  bundleVersion: "1.0.0",
  meta: {},
  script: "y",
  designBrief: {
    B20: [{ infoId: "INF-01", delivery: "动作" }, { infoId: "INF-02" }],
  },
};
const b20Prep = prepareBundleWithLog(b20Peer);
ok(
  "SH-B20 peer",
  b20Prep.shapeSalvageLog.some((e) => e.ruleId === "SH-B20"),
);
ok(
  "B20 is string[]",
  Array.isArray((b20Prep.bundle.designBrief as { B20: unknown }).B20) &&
    ((b20Prep.bundle.designBrief as { B20: unknown[] }).B20.every((x) => typeof x === "string")),
);

if (failed) {
  console.error(`\n${failed} FAILED`);
  process.exit(1);
}
console.log("\n=== test:shape-dual-matrix OK ===");
