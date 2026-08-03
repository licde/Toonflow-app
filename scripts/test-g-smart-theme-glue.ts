/**
 * yarn test:g-smart-theme-glue
 * G5: contact mouth-ban compose, at_locus motion beats, pose handoff, Key decouple,
 * soft_deliver honesty, spineReady, ASSET soft-warn contract.
 */
import { composeStillPrompt } from "../src/ruleEngine/compilers/composeStillPrompt";
import {
  buildContactEventMotionBeats,
  inferContactStartStateFromStill,
} from "../src/ruleEngine/compilers/contactEventPolicy";
import { assertStillVideoPoseHandoff } from "../src/ruleEngine/qc/stillVideoPoseHandoff";
import { isStillKeyAbsentOnly } from "../src/ruleEngine/qc/resolveStillForBurn";
import { dedupeBareSeconds } from "../src/ruleEngine/quality/resolveLipDuration";
import { reconcileQcWeakStructure } from "../src/ruleEngine/qc/qcSoftDeliver";
import { ensureShotPerformanceDefaults } from "../src/ruleEngine/emotion/defaultPerformance";
import { spineReady, isThinVideoPromptStub } from "../docs/toonflow-web/types/videoIntentOps";

function ok(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
  console.log("✓", msg);
}

const vd = "特写。沈清漪侧脸，休书纸角贴颊划过面颊。";
const composed = composeStillPrompt({
  visualDescription: vd,
  shotSize: "cu",
  qualityMode: "hq_update",
  requireLeadAssetImage: false,
  referenceUrlCount: 1,
  characters: [{ name: "沈清漪", code: "CHAR-01", kind: "character" as const, hasImage: true }],
});
ok(composed.ok, "compose contact VD ok");
ok(/禁口含/.test(composed.prompt), "compose contact VD includes 禁口含");

const beatsAt = buildContactEventMotionBeats({
  visualDescription: vd,
  durationSec: 2,
  stillPrompt: "休书纸角已贴颊特写",
});
ok(Boolean(beatsAt?.body), "at_locus beats from stillPrompt");
ok(!/自.*侧进入/.test(beatsAt!.body), "stillPrompt 贴颊 uses at_locus not 进入");
ok(inferContactStartStateFromStill({ stillPrompt: "休书贴颊", visualDescription: vd }).state === "at_locus", "infer at_locus");

const poseGate = assertStillVideoPoseHandoff({
  visualDescription: "特写。休书自面颊侧进入贴合",
  stillPrompt: "休书已贴颊",
  stillMeta: { stillPoseAnchor: { state: "at_locus", prop: "休书", locus: "面颊" } },
  videoPrompt: "[Motion]\n0s-2s: 休书自面颊侧进入贴合。",
});
ok(!poseGate.ok && poseGate.severity === "BLOCK", "assertStillVideoPoseHandoff Motion 进入 BLOCK");

ok(
  isStillKeyAbsentOnly({ vlmError: "VLM_API_KEY_MISSING", pendingHumanRejudge: true }),
  "isStillKeyAbsentOnly true for Key miss",
);
ok(!isStillKeyAbsentOnly({ vlmError: "vendor timeout 429" }), "isStillKeyAbsentOnly false for vendor");

const deduped = dedupeBareSeconds("0s-0.5s: 微动；1s-2s: 贴合", 2);
ok(/0s-0\.5s/.test(deduped.prompt), "dedupeBareSeconds keeps 0s-0.5s");

// G13: soft_deliver must not wash structure fail into videoPass
const soft = reconcileQcWeakStructure({
  videoPass: true,
  qcWeak: true,
  findings: [{ id: "DEX-PROP-IN-FRAME", severity: "BLOCK" }],
  code: "STILL-CONTACT-HANDOFF",
});
ok(soft?.videoPass === false && soft?.honestSoftDeliver === true, "soft_deliver clears forged videoPass");

// G8: thin stub ≠ spineReady
ok(isThinVideoPromptStub("static,duration=2"), "thin stub detected");
ok(!spineReady("static,duration=2"), "thin stub not spineReady");
ok(
  spineReady("[Visual]\n休书贴颊特写清晰\n[Motion]\n0s-1s: 微颤；1s-2s: 贴合"),
  "full spine Ready",
);

// G14: EXPR default performance auto (low/mid intensity)
const shot: {
  narrative: { dialogue: { lines: { text: string; speaker: string }[] }; emotionIntensity: number };
  shotDesign?: { performance?: { microExpression?: { eyes?: string; mouthDetail?: string } }; lipSyncPolicy?: string };
} = {
  narrative: {
    dialogue: { lines: [{ text: "你回来了", speaker: "沈清漪" }] },
    emotionIntensity: 4,
  },
};
ok(ensureShotPerformanceDefaults(shot), "EXPR default performance applied");
ok(Boolean(shot.shotDesign?.performance?.microExpression?.mouthDetail), "microExpression filled");

console.log("\ntest:g-smart-theme-glue OK");
