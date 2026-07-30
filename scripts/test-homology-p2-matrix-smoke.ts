/**
 * P2 matrix battery (subset): expected ∪, merge toast helper, registry untilClear flags
 */
import { collectExpectedDialogue } from "../src/ruleEngine/design/dialogueCoverage";
import {
  mergePreflightBlocksForToast,
  HOMOLOGY_CLEAR_RULE_IDS,
} from "../docs/toonflow-web/types/stillQuality";
import { readFileSync } from "fs";
import { join } from "path";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error("FAIL", name, detail ?? "");
    process.exit(1);
  }
  console.log("ok", name);
}

{
  const { keys } = collectExpectedDialogue({
    script: "甲：你好\n乙：再见",
    planData: {
      dialoguePlan: {
        lines: [{ speaker: "甲", text: "你好", lineId: "L1" }],
      },
    },
  });
  ok("union has 你好", keys.some((k) => /你好/.test(k)), JSON.stringify(keys));
  ok("union has 再见", keys.some((k) => /再见/.test(k)), JSON.stringify(keys));
}

{
  const merged = mergePreflightBlocksForToast(
    [{ id: "DC-01-EXTRA", passed: false, severity: "BLOCK", message: "乱入" }],
    [{ id: "DC-01-EXTRA", passed: true, severity: "INFO", message: "ok" }],
  );
  ok("merge drops cleared EXTRA", merged.length === 0, JSON.stringify(merged));
  ok("homology set has H3", HOMOLOGY_CLEAR_RULE_IDS.has("H3"));
}

{
  const matrix = JSON.parse(
    readFileSync(join(__dirname, "../data/fixtures/semantic_gate_dual_track_matrix.json"), "utf8"),
  );
  const reg = matrix.importSalvageRegistry as {
    ruleId: string;
    demoteAfterHeal?: boolean;
    untilClear?: boolean;
  }[];
  const dc = reg.find((e) => e.ruleId === "DC-01-EXTRA");
  ok("DC registered", Boolean(dc), "missing");
  ok("DC demote false", dc?.demoteAfterHeal === false);
  ok("DC untilClear", dc?.untilClear === true);
  const fx = reg.find((e) => e.ruleId === "FX-GRADE-01");
  ok("FX untilClear", fx?.untilClear === true && fx?.demoteAfterHeal === false);
  const note = String(matrix.mustEditBlockIdsNote ?? "");
  ok("note until-clear", /until-clear|untilClear|同核清零/.test(note), note.slice(0, 80));
}

console.log("OK homology-p2-matrix-smoke");
