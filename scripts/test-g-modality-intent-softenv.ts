/**
 * Modality intent + softEnv — literary-led bg policy.
 * yarn test:g-modality-intent-softenv
 */
import { deriveShotModalityIntent } from "../src/ruleEngine/compilers/shotModalityIntent";
import { resolveStillBgPolicy } from "../src/ruleEngine/compilers/stillBgPolicy";
import { classifyVideoIntent } from "../src/ruleEngine/compilers/videoIntentPolicy";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error("FAIL", name, detail ?? "");
    process.exit(1);
  }
  console.log("ok", name);
}

// Face CU + SCENE link → soft_env + keepSoftEnvRef
{
  const intent = deriveShotModalityIntent({
    visualDescription: "特写。沈清漪侧脸，休书纸角划过面颊，烛火摇曳。",
    shotSize: "特写",
    hasSceneLink: true,
  });
  ok("CU soft_env", intent.bgMode === "soft_env");
  ok("CU keepSoftEnvRef", intent.keepSoftEnvRef === true);
  ok("CU exclude establishing", intent.excludeSceneEstablishing === true);
  const p = resolveStillBgPolicy({
    description: "特写。沈清漪侧脸，休书纸角划过面颊。",
    shotSize: "特写",
    hasSceneLink: true,
  });
  ok("bgPolicy soft_env", p.bgMode === "soft_env" && p.keepSoftEnvRef === true);
}

// Establishing keep plate
{
  const intent = deriveShotModalityIntent({
    visualDescription: "空镜建立：殿内全景。",
    shotSize: "全景",
    sceneEstablishingHint: true,
    hasSceneLink: true,
  });
  ok("establish keep", intent.bgMode === "keep_plate" && !intent.excludeSceneEstablishing);
}

// Video inherit: action_primary_mid not wiped by dialogue seed alone
{
  const v = classifyVideoIntent({
    visualDescription: "中景。沈清漪挥袖转身。",
    shotSize: "中景",
    stillIntentClass: "action_primary_mid",
    dialogueLines: ["（OS）内心独白"],
  });
  ok("action inherit over pseudo dial", v.intentClass === "react_silent", v.reasons.join(","));
}

// empty_os over speak_lip
{
  const v = classifyVideoIntent({
    visualDescription: "空镜。画外独白。",
    stillIntentClass: "empty_or_os",
    dialogueLines: ["旁白"],
  });
  ok("empty_os protected", v.intentClass === "empty_os", v.reasons.join(","));
}

console.log("test:g-modality-intent-softenv passed");
