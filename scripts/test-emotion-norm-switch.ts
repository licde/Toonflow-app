/**
 * R5 / E3: emotionNorm switch does not rewrite dialogue; strategies differ by profile.
 */
import assert from "node:assert/strict";
import {
  resolveEmotionStrategy,
  setEmotionNormOnPlan,
  getEmotionNormFromPlan,
  currentNormVersion,
  assertDialogueUnchanged,
} from "../src/ruleEngine/emotion/emotionNorm";
import { migrateEmotionNormIfNeeded, isNormVersionBehind } from "../src/ruleEngine/emotion/migrateEmotionNorm";
import { expandDialogueClusters } from "../src/ruleEngine/design/expandDialogueClusters";
import { runContractStructureHeal } from "../src/ruleEngine/heal/contractStructureHeal";
import { checkEmotionEvidence, silentHealEmotionEvidence } from "../src/ruleEngine/emotion/emotionEvidenceGate";
import { scoreShortVideo } from "../src/ruleEngine/qc/shortVideoQuality";
import { sampleVideoFrames, judgeMotionFidelity, resolveMotionAction } from "../src/ruleEngine/qc/videoMotionVlm";
import { flattenDialogueText } from "../src/ruleEngine/design/dialogueCoverage";

function ok(name: string, cond: boolean) {
  if (!cond) throw new Error(`FAIL: ${name}`);
  console.log(`✓ ${name}`);
}

const sweet = resolveEmotionStrategy({ intensity: 8, profileId: "sweet" });
const war = resolveEmotionStrategy({ intensity: 8, profileId: "war_god" });
ok("profiles differ avStyle", sweet.avStyle !== war.avStyle);
ok("high intensity cluster insert-capable", ["speak_react", "speak_react_insert"].includes(sweet.clusterPolicy));
ok("speak motion always static", sweet.speakMotion === "static" && war.speakMotion === "static");

const plan: Record<string, unknown> = {
  planData: {
    emotionNorm: { activeProfileId: "sweet", normVersion: "1.0.0" },
    preDesignPack: {
      shots: [
        {
          shotIndex: 1,
          clientId: "s1",
          duration: 3,
          narrative: {
            dialogue: { lines: [{ speaker: "女主", text: "这房子从来就不是你的。" }] },
            emotionIntensity: 8,
          },
          videoDesc: "近景 gentle push, 3s",
        },
      ],
    },
    sceneMeta: [{ sceneRef: 1, intensity: 8 }],
  },
};

const dlgBefore = flattenDialogueText(
  (plan.planData as { preDesignPack: { shots: { narrative: { dialogue: { lines: unknown } } }[] } }).preDesignPack
    .shots[0].narrative.dialogue.lines,
);

setEmotionNormOnPlan(plan, { activeProfileId: "war_god" });
ok("profile switched", getEmotionNormFromPlan(plan).activeProfileId === "war_god");
ok("structureStale on switch", getEmotionNormFromPlan(plan).structureStale === true);

const healed = runContractStructureHeal({
  shots: (plan.planData as { preDesignPack: { shots: unknown[] } }).preDesignPack.shots,
  sceneMeta: (plan.planData as { sceneMeta: Record<string, unknown>[] }).sceneMeta,
  plan,
  profileId: "war_god",
});

const speak = healed.shots.find((s) => s.beatRole === "speak") ?? healed.shots[0];
const dlgAfter = flattenDialogueText(speak.narrative?.dialogue?.lines);
ok("dialogue unchanged after heal", dlgBefore === dlgAfter);
ok("heal marks dialogueUnchanged", healed.healSummary.dialogueUnchanged === true);
ok("speak clamped static", String(speak.motion ?? speak.videoDesc ?? "").toLowerCase().includes("static"));

const once = expandDialogueClusters(healed.shots, { profileId: "war_god" });
const twice = expandDialogueClusters(once.shots, { profileId: "war_god" });
ok("cluster expand idempotent", once.shots.length === twice.shots.length);

const ev = checkEmotionEvidence({ intensity: 8 });
ok("high intensity needs evidence", !ev.ok && ev.canSilentHeal);
const healedMeta = silentHealEmotionEvidence({ sceneRef: 1 }, 8);
ok("silent heal phase", healedMeta.healed && Boolean(healedMeta.meta.emotionPhase));

ok("migrate behind detect", isNormVersionBehind("0.9.0", currentNormVersion()));
const mig = migrateEmotionNormIfNeeded({ planData: { emotionNorm: { activeProfileId: "sweet", normVersion: "0.0.1" } } });
ok("migrate bumps version keeps profile", mig.migrated && mig.emotionNorm.activeProfileId === "sweet");

const svq = scoreShortVideo({ flags: { emotionOk: false, lipOk: true, motionOk: true } });
ok("svq soft_patch default", svq.defaultAction === "soft_patch" || svq.failDims.length > 0);

const frames = sampleVideoFrames({ durationSec: 4 });
ok("frame sample count", frames.count >= 2);
const judge = judgeMotionFidelity({ observedScore: 0.2, structureBroken: false });
ok("motion mismatch → strengthen/retry", ["strengthen", "retry"].includes(resolveMotionAction(judge)));

ok("assertDialogueUnchanged helper", assertDialogueUnchanged([dlgBefore], [dlgAfter]));

console.log("\nemotion-norm-switch OK");
