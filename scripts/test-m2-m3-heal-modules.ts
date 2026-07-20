import assert from "assert";
import { projectShotReadiness, projectEpisodeReadiness } from "../src/ruleEngine/heal/shotReadiness";
import { applyLifecycleInvalidation } from "../src/ruleEngine/heal/lifecycleInvalidate";
import { applySplitPlanToBundle, undoPropose } from "../src/ruleEngine/heal/proposeConfirm";
import { buildSplitPlanStub } from "../src/ruleEngine/compilers/splitPlanStub";
import { planPostBurnRepairs } from "../src/ruleEngine/qc/postBurnQc";
import { evaluateLipPixel } from "../src/ruleEngine/qc/lipPixelQc";
import { planVendorDegrade } from "../src/ruleEngine/qc/vendorDegrade";
import { softFillViralAnchors } from "../src/ruleEngine/heal/virTemplateFill";
import { assertPackageVersion } from "../src/ruleEngine/heal/packageConcurrency";
import { proposeRuleCandidate, admitCandidate } from "../src/ruleEngine/heal/feedbackRing";
import { createHealBudget } from "../src/ruleEngine/heal/healBudgetLedger";

const r1 = projectShotReadiness({
  hasAssets: true,
  stillQuality: "weak",
  promptClean: true,
});
assert.equal(r1.burnAllowed, false);
assert.equal(r1.primary?.primaryNextStep, "regen_storyboard_hq");

const ep = projectEpisodeReadiness([
  r1,
  projectShotReadiness({ hasAssets: true, stillQuality: "hq_ok", promptClean: true }),
]);
assert.equal(ep.partialBurnReady, true);

const life = applyLifecycleInvalidation("asset_look_changed", { stillQuality: "hq_ok" });
assert.equal(life.stillMeta?.stillQuality, "weak");
assert.equal(life.primaryNextStep, "regen_storyboard_hq");

const lifeVisual = applyLifecycleInvalidation("shot_visual_changed", { stillQuality: "hq_ok" });
assert.equal(lifeVisual.stillMeta?.stillQuality, "weak");
assert.equal(lifeVisual.primaryNextStep, "regen_storyboard_hq");

const plan = buildSplitPlanStub({
  shotIndex: 1,
  duration: 4,
  narrative: {
    dialogue: { lines: [{ text: "第一句足够长用来拆镜测试内容" }, { text: "第二句同样很长必须拆开" }] },
  },
});
assert.ok(plan);
const applied = applySplitPlanToBundle(
  { preDesignPack: { shots: [{ shotIndex: 1, duration: 4 }] } } as never,
  plan!,
);
assert.ok(applied.bundle.preDesignPack?.shots && applied.bundle.preDesignPack.shots.length >= 2);
assert.ok(undoPropose(applied.undoToken));

const lip = evaluateLipPixel({
  samples: [
    { tSec: 0.5, mouthOpenness: 0.1 },
    { tSec: 1.5, mouthOpenness: 0.12 },
    { tSec: 3, mouthOpenness: 0.11 },
  ],
  dialogueWindows: [{ startSec: 0, endSec: 2 }],
  priorWarnCount: 0,
});
assert.ok(lip);
assert.equal(lip!.severity, "WARN");

const repairs = planPostBurnRepairs([lip!], createHealBudget());
assert.ok(repairs.actions.length >= 1);

const vd = planVendorDegrade({ errorText: "429 quota exceeded", fallbackVendors: ["klingai"] });
assert.ok(vd.suggestVendorIds?.includes("klingai"));

const vir = softFillViralAnchors({
  hasTemplate: true,
  missingFields: ["openingHook"],
  templateValues: { openingHook: "身份反差" },
});
assert.equal(vir.templateFilled, true);
assert.equal(vir.warn, true);

assert.equal(assertPackageVersion(2, 2).ok, true);
assert.equal(assertPackageVersion(2, 3).ok, false);

const cand = proposeRuleCandidate({
  source: "post_burn_qc",
  proposedRuleId: "QC-CUSTOM-01",
  evidence: "lip fail cluster",
});
const admitted = admitCandidate(cand.id);
assert.equal(admitted.ok, true);

console.log("test-m2-m3-heal-modules: OK");
