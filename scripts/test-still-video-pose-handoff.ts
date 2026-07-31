/**
 * yarn test:still-video-pose-handoff
 */
import { buildContactEventMotionBeats, inferContactStartStateFromStill } from "../src/ruleEngine/compilers/contactEventPolicy";
import { assertStillVideoPoseHandoff } from "../src/ruleEngine/qc/stillVideoPoseHandoff";

function ok(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
  console.log("✓", msg);
}

const vd = "特写。沈清漪侧脸，休书纸角贴颊，她紧咬下唇。";
const inferred = inferContactStartStateFromStill({
  visualDescription: vd,
  stillPrompt: "休书贴颊特写",
});
ok(inferred.state === "at_locus" || inferred.state === "held_mid", "infers at_locus from still blob");

const beatsEnter = buildContactEventMotionBeats({
  visualDescription: "特写。休书自面颊侧进入贴合",
  durationSec: 2,
  contactStartState: "entering",
});
const beatsAt = buildContactEventMotionBeats({
  visualDescription: vd,
  durationSec: 2,
  contactStartState: "at_locus",
});
ok(Boolean(beatsEnter?.body), "entering beats");
ok(Boolean(beatsAt?.body), "at_locus beats");
ok(!/自.*侧进入/.test(beatsAt!.body), "at_locus must not repeat enter motion");

const gate = assertStillVideoPoseHandoff({
  visualDescription: "特写。休书自面颊侧进入贴合",
  stillPrompt: "休书已贴颊",
  stillMeta: { stillPoseAnchor: { state: "at_locus", prop: "休书", locus: "面颊" } },
});
ok(!gate.ok && gate.severity === "BLOCK", "pose mismatch BLOCKs (V5-D)");

console.log("\ntest:still-video-pose-handoff OK");
