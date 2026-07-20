/**
 * M1 duration SSOT + LIP raise_duration token (D13) + silent raise.
 */
import assert from "assert";
import { resolveRequiredDuration } from "../src/ruleEngine/compilers/resolveRequiredDuration";
import { lip01Adapter } from "../src/ruleEngine/precheckLoop/adapters/lip01";
import { decideRepairMode } from "../src/ruleEngine/precheckLoop/policy";
import { PRECHECK_LOOP_SCHEMA_VERSION } from "../src/ruleEngine/precheckLoop/types";

function shot(text: string, duration: number) {
  return {
    shotIndex: 1,
    duration,
    narrative: { duration, dialogue: { lines: [{ text }] } },
  };
}

const short = shot("这是一句比较长的中文对白用来测试口型时长是否足够啊", 3);
const req = resolveRequiredDuration(short);
assert.ok(req.required > 3, `expected required>3 got ${req.required}`);
assert.ok(req.canSilentRaise, "should allow silent raise");

const finding = lip01Adapter.diagnose({
  bundle: { preDesignPack: { shots: [short] } },
  schemaVersion: PRECHECK_LOOP_SCHEMA_VERSION,
} as never);
assert.equal(finding.passed, false);
assert.deepEqual(finding.evidence?.repairReasons, ["raise_duration"]);

const patches = lip01Adapter.suggestRepair!(finding, {
  bundle: { preDesignPack: { shots: [short] } },
} as never);
assert.ok(patches.length >= 1);
assert.ok(String(patches[0]!.reason).includes("raise_duration"));

const mode = decideRepairMode({
  findings: [finding],
  patches,
});
assert.equal(mode.mode, "soft_patch", `D13: expected soft_patch got ${mode.mode} (${mode.reason})`);

const vo = shot("旁白：命运的齿轮开始转动了", 3);
const voReq = resolveRequiredDuration(vo);
assert.equal(voReq.lipRequired, false, "VO should not require lip");

console.log("test-m1-duration-intelligence: OK");
