/**
 * BE BurnNextStep contract — FE must mirror this list (cross-release-train).
 */
import assert from "assert";
import { BURN_NEXT_STEPS, buildBurnGateEnvelope } from "../src/ruleEngine/compilers/burnGateEnvelope";
import { softPatchQfExpr } from "../src/ruleEngine/compilers/qfExprGate";
import { buildSplitPlanStub } from "../src/ruleEngine/compilers/splitPlanStub";
import { decideVideoQuality } from "../src/ruleEngine/compilers/qualityDecision";

assert.ok(BURN_NEXT_STEPS.includes("raise_duration"));
assert.ok(BURN_NEXT_STEPS.includes("regen_storyboard_hq"));
assert.ok(BURN_NEXT_STEPS.includes("human_review"));
assert.ok(BURN_NEXT_STEPS.includes("batch_still"));

const env = buildBurnGateEnvelope(
  [{ id: "IMG-STILL-QA", message: "weak", reverseTrigger: "img_still_weak" }],
  { nextStep: "regen_storyboard_hq", stage: "burn" },
);
assert.equal(env.primaryNextStep, "regen_storyboard_hq");
assert.ok(env.userMessage.length > 0);
assert.ok(env.ctaLabel.length > 0);

const qf = softPatchQfExpr("请改脸成另一个人，保持光影");
assert.equal(qf.patched, true);
assert.ok(!/改脸/.test(qf.prompt));

const stub = buildSplitPlanStub({
  shotIndex: 2,
  duration: 5,
  narrative: {
    duration: 5,
    dialogue: {
      lines: [{ text: "第一句很长的对白内容啊啊啊" }, { text: "第二句也很长需要拆开才说得完" }],
    },
  },
});
assert.ok(stub);
assert.equal(stub!.schemaVersion, "splitPlan/1");
assert.equal(stub!.writeMode, "propose_only");

const qd = decideVideoQuality({
  videoPrompt: "[Visual]\nx\n[Motion]\ny\n[Camera]\nz\n[Audio]\na\n[Narrative]\nb",
  stillQuality: "weak",
  missingStillOrCref: false,
});
assert.equal(qd.burnAllowed, false);
// Weak still → batch_still（去生成静照）；regen_storyboard_hq 仅显式 HQ 路径
assert.equal(qd.nextStep, "batch_still");

const { buildPrimaryBlock } = require("../src/ruleEngine/compilers/primaryBlock") as typeof import("../src/ruleEngine/compilers/primaryBlock");
const hr = buildPrimaryBlock("human_review", { stage: "qc" });
assert.equal(hr.primaryNextStep, "human_review");
assert.ok(/人审|SVQ/.test(hr.ctaLabel));

console.log("test-burn-nextstep-contract: OK");
console.log("BURN_NEXT_STEPS=", JSON.stringify(BURN_NEXT_STEPS));
