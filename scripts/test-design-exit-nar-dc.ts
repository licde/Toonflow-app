/**
 * yarn test:design-exit-nar-dc
 *
 * Design-time NAR-15 / DC-01 / EXTRA same-kernel:
 * W3 plan RA, SB shot coverage+extras, export 设计未闭合, chatStrict no shot rewrite,
 * UNIMPLEMENTED_DEX zero on W3/SB.
 */
import fs from "fs";
import path from "path";
import { runDesignExitGate } from "@/ruleEngine/design/designExitGate";
import { runExportGate } from "@/ruleEngine/exportGate";
import { deepCloneJson } from "@/ruleEngine/design/planFromBundleForDesignExit";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const genre = { packId: "war_god", adaptationDepth: "viral" as const };

/** W3: emotion_hit without reactionAction → NAR-15; no shots → EXTRA skipped */
const w3MissingRa: Record<string, unknown> = {
  script: "甲：听好了。",
  planData: {
    genreTemplate: genre,
    dialoguePlan: {
      lines: [
        {
          lineId: "L-1",
          speaker: "甲",
          text: "听好了",
          functions: ["emotion_hit"],
        },
      ],
    },
    narrativeSelfcheck: { passed: true },
  },
};
const w3 = runDesignExitGate("W3", w3MissingRa);
ok("W3 blocks NAR-15 without RA", w3.failedIds.includes("NAR-15"));
ok("W3 false-green cannot alone pass", !w3.ok);
ok(
  "W3 no-shots skips EXTRA (not UNIMPLEMENTED)",
  !w3.failedIds.includes("DC-01-EXTRA") &&
    !w3.warnings.some((w) => w.startsWith("UNIMPLEMENTED_DEX:DC-01-EXTRA")),
);

/** SB: missing plan line on shots + intrusion line */
const sbBad: Record<string, unknown> = {
  script: "甲：听好了。\n乙：乱入台词。",
  planData: {
    genreTemplate: genre,
    dialoguePlan: {
      lines: [
        {
          lineId: "L-1",
          speaker: "甲",
          text: "听好了",
          functions: ["emotion_hit"],
          // no reactionAction → NAR-15
        },
      ],
    },
    narrativeSelfcheck: { passed: true },
    preDesignPack: {
      scriptPlan: "甲：听好了。",
      shots: [
        {
          shotIndex: 1,
          visualDescription: "近景。甲开口。",
          duration: 2,
          narrative: {
            dialogue: {
              lines: [
                // missing L-1 → DC-01; intrusion text → EXTRA
                { lineId: "L-X", speaker: "乙", text: "乱入台词" },
              ],
            },
          },
        },
      ],
    },
  },
};
const sb = runDesignExitGate("SB", deepCloneJson(sbBad), { chatStrict: true });
ok("SB blocks NAR-15", sb.failedIds.includes("NAR-15"));
ok("SB blocks DC-01 missing", sb.failedIds.includes("DC-01"));
ok("SB blocks DC-01-EXTRA intrusion", sb.failedIds.includes("DC-01-EXTRA"));
ok(
  "SB no UNIMPLEMENTED_DEX for EXTRA",
  !sb.warnings.some((w) => w.includes("UNIMPLEMENTED_DEX:DC-01-EXTRA")),
);

const shotCountBefore = (
  (sbBad.planData as { preDesignPack?: { shots?: unknown[] } }).preDesignPack?.shots ?? []
).length;

const bundle: ScriptBundle = {
  bundleType: "script",
  script: String(sbBad.script),
  meta: { projectId: 1 },
  planData: sbBad.planData as ScriptBundle["planData"],
  preDesignPack: (sbBad.planData as { preDesignPack: ScriptBundle["preDesignPack"] }).preDesignPack,
  narrativeSelfcheck: { passed: true },
};

const shotsSnap = JSON.stringify(bundle.preDesignPack?.shots ?? []);
const eg = runExportGate(bundle, { allowShapeSalvage: true });
ok("export not allowed when design incomplete", !eg.exportAllowed);
ok(
  "export chatRepair shows 设计未闭合",
  eg.chatRepairText.includes("【设计未闭合】"),
);
ok(
  "export auto-closes NAR-15 (placeholder RA)",
  Boolean(eg.autoClosed?.clearedIds?.includes("NAR-15")) ||
    !eg.blocks.some((b) => b.id === "NAR-15"),
  `cleared=${eg.autoClosed?.clearedIds?.join(",")} blocks=${eg.blocks.map((b) => b.id).join(",")}`,
);
ok(
  "previewStatusLine does not claim 已自动修复 when blocked",
  Boolean(eg.previewStatusLine) &&
    !eg.previewStatusLine.includes("已自动修复") &&
    /设计未闭合|阻断/.test(eg.previewStatusLine),
);
ok(
  "export still surfaces remaining design musts (not fake-green)",
  eg.designExitIncomplete === true && eg.blocks.length > 0,
  eg.blocks.map((b) => b.id).slice(0, 8).join(","),
);
const shotCountAfter = (bundle.preDesignPack?.shots ?? []).length;
ok(
  "export auto-close may writeback shots but shot count stable unless CAM/orch split",
  shotCountAfter >= shotCountBefore,
);
ok(
  "autoClosed applied on export path",
  eg.autoClosed?.applied === true || eg.autoClosed?.clearedIds?.length,
  JSON.stringify(eg.autoClosed)?.slice(0, 120),
);
// chatStrict diagnose uses clone; intentional auto-close writeback may differ from shotsSnap
void shotsSnap;

/** Checklist UNIMPLEMENTED zero: every W3/SB BLOCK id must have a real case */
const checklistPath = path.join(process.cwd(), "data/fixtures/design_exit_checklist.json");
const checklist = JSON.parse(fs.readFileSync(checklistPath, "utf8")) as {
  byStage: Record<string, string[]>;
  checks: Record<string, { severity?: string }>;
};
for (const stage of ["W3", "SB"] as const) {
  const probe: Record<string, unknown> = {
    script: "甲：短。",
    planData: {
      genreTemplate: genre,
      dialoguePlan: { lines: [{ lineId: "L-1", speaker: "甲", text: "短", functions: ["emotion_hit"], reactionAction: "点头" }] },
      preDesignPack: {
        shots: [
          {
            shotIndex: 1,
            visualDescription: "近景。甲点头。",
            duration: 2,
            narrative: { dialogue: { lines: [{ lineId: "L-1", speaker: "甲", text: "短" }] } },
          },
        ],
      },
    },
  };
  const exit = runDesignExitGate(stage, probe, { chatStrict: true });
  const unimpl = exit.warnings.filter((w) => w.startsWith("UNIMPLEMENTED_DEX:"));
  ok(`${stage} UNIMPLEMENTED_DEX zero`, unimpl.length === 0, unimpl.slice(0, 8).join(","));
  // soft assert: known must-ids exist in checklist
  for (const id of ["NAR-15", "DC-01-EXTRA"]) {
    ok(`${stage} checklist mounts ${id}`, (checklist.byStage[stage] ?? []).includes(id));
  }
}

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nall design-exit NAR/DC assertions passed");
