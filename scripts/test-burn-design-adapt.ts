/**
 * Burn-time design adaptation — stale track seed vs package SSOT.
 * yarn test:burn-design-adapt
 */
import { adaptBurnFromDesign } from "../src/ruleEngine/compilers/adaptBurnFromDesign";
import { seedContradictsDesign } from "../src/ruleEngine/compilers/staleSeedDetector";
import { hydrateShotCompileContextSync } from "../src/ruleEngine/compilers/hydrateShotCompileContext";
import { classifyVideoIntent } from "../src/ruleEngine/compilers/videoIntentPolicy";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
  console.log("✓", msg);
}

const staleTrackPrompt = `[Visual]
特写。咬唇不屈
intent:fx_peak

[Motion]
事件拍点：F0

[Camera]
近景，静止，时长 4s，单次连续镜头。

[Audio]
"2s"
口型同步开启。

[Narrative]
休书甩脸`;

const packageShot = {
  storyboardId: 783,
  visualDescription: "特写。休书纸角甩至脸颊，纸未入口；仅颊触非口含，烛火映面",
  duration: 2,
  narrative: {
    duration: 2,
    debutBeat: "休书甩脸，咬唇不屈",
    dialogue: { lines: [{ text: "2s" }] },
    sound: { sfx: "祠堂环境音, 烛火噼啪" },
  },
  generation: {
    intentClass: "react_silent",
    fxPrompt: "F0",
    compiled: {
      video: `[Visual]
特写。休书纸角甩至脸颊，咬唇不屈
intent:react_silent

[Motion]
微颤持镜

[Camera]
特写，静止，时长 2s，单次连续镜头。

[Audio]
无对白。仅环境音效：祠堂环境音, 烛火噼啪。

[Narrative]
休书甩脸，咬唇不屈`,
    },
  },
};

// Shot 783 realistic — contact VD + F0 + narrative.performance microExpression
const shot783 = {
  storyboardId: 783,
  visualDescription:
    "特写。沈清漪侧脸，休书纸角划过面颊。纸未入口；仅颊触非口含。（可见度：面颊浅痕可见）",
  shotSize: "特写",
  duration: 2,
  narrative: {
    duration: 2,
    debutBeat: "休书甩脸，咬唇不屈",
    dialogue: { lines: [{ text: "2s" }] },
    sound: { dialogue: true, bgm: "none", sfx: "祠堂环境音, 烛火噼啪" },
    performance: {
      microExpression: { eyes: "平视", mouthDetail: "闭合" },
    },
    cameraAnchor: { shotSize: "CU", bgBlur: true },
  },
  generation: { intentClass: "react_silent", fxPrompt: "F0" },
};

// --- stale seed detector ---
{
  const ctx = hydrateShotCompileContextSync({
    designShot: packageShot as never,
    shotMeta: packageShot,
    seedPrompt: staleTrackPrompt,
    preferStillIntentClass: "react_silent",
  });
  assert(seedContradictsDesign(staleTrackPrompt, ctx), "stale track contradicts react_silent design");
  assert(ctx.dialogueLines.length === 0, "pseudo 2s filtered from dialogueLines");
}

// --- intent: package intentClass wins over stale fx blob ---
{
  const cls = classifyVideoIntent({
    visualDescription: packageShot.visualDescription,
    stillIntentClass: "react_silent",
    dialogueLines: ["2s"],
    promptBlob: staleTrackPrompt,
  });
  assert(cls.intentClass === "react_silent", "persisted react_silent over stale fx_peak blob");
}

// --- adaptBurnFromDesign ---
{
  const adapted = adaptBurnFromDesign({
    shotMeta: packageShot,
    trackPrompt: staleTrackPrompt,
    vendorId: "agnesai",
  });
  assert(adapted.staleSeedDiscarded, "stale seed discarded");
  assert(adapted.intentClass === "react_silent", "adapt intent react_silent");
  assert(adapted.durationSec === 2, "adapt duration 2s from design");
  assert(!/"2s"/.test(adapted.prompt), "no pseudo 2s in adapted prompt");
  assert(!/口型同步开启/.test(adapted.prompt), "no orphan lip-sync");
  assert(!/特效可见：\s*F0/.test(adapted.prompt), "no F0 as fx visible");
  assert(!/事件拍点：\s*F0/.test(adapted.prompt), "no F0 as event peak");
  assert(/祠堂环境音|烛火噼啪/.test(adapted.prompt), "SFX from design sound.sfx");
  assert(/时长\s*2\s*s/i.test(adapted.prompt), "camera duration 2s");
  assert(adapted.fidelity?.pass === true, `fidelity pass (${adapted.fidelity?.items.filter((i) => !i.pass).map((i) => i.id).join(",") || "ok"})`);
}

// --- shot 783 contact VD + F0 grade + full fidelity ---
{
  const stale783 = `[Visual]
特写。咬唇不屈

[Motion]
0s-4s: 微表情呼吸。

[Camera]
近景，轻微运镜，时长 4s，单次连续镜头。

[Audio]
视觉特效呼应：F0

[Narrative]
intent:fx_peak fx:F0`;

  const adapted = adaptBurnFromDesign({
    shotMeta: shot783,
    trackPrompt: stale783,
    vendorId: "agnesai",
  });
  assert(adapted.intentClass === "react_silent", "783 adapt intent react_silent");
  assert(/纸未入口|仅颊触/.test(adapted.prompt), "783 VD mutex atoms in prompt");
  assert(/划过面颊|休书纸角划过/.test(adapted.prompt), "783 contact verb in prompt");
  assert(!/视觉特效呼应\s*[：:]\s*F0/i.test(adapted.prompt), "783 no F0 fx echo");
  assert(!/\bfx:F0\b/i.test(adapted.prompt), "783 no fx:F0 in narrative");
  assert(/祠堂环境音|烛火噼啪/.test(adapted.prompt), "783 SFX present");
  assert(
    /微表情|划过|贴合|停住/.test(adapted.prompt),
    "783 contact beats or microExpression in motion",
  );
  assert(adapted.fidelity?.pass === true, `783 fidelity all pass`);
  const fails = adapted.fidelity?.items.filter((i) => !i.pass) ?? [];
  if (fails.length) {
    throw new Error(`783 fidelity misses: ${fails.map((f) => f.id).join(", ")}`);
  }
}

// --- video homology: sound.dialogue + av scene sfx heal ---
{
  const { softHealVideoHomologyOnShots } =
    require("../src/ruleEngine/heal/videoHomologyHeal") as typeof import("../src/ruleEngine/heal/videoHomologyHeal");
  const { checkAvSceneSfxCoherence, healAvSceneSfxText } =
    require("../src/ruleEngine/compilers/videoDesignIntentFidelity") as typeof import("../src/ruleEngine/compilers/videoDesignIntentFidelity");

  const hom = softHealVideoHomologyOnShots({
    shots: [
      {
        ...shot783,
        narrative: {
          ...shot783.narrative,
          sceneName: "寝殿内",
          sound: { dialogue: true, sfx: "祠堂环境音, 烛火噼啪" },
        },
      },
    ],
  });
  const healedShot = hom.shots[0] as { narrative?: { sound?: { dialogue?: boolean; sfx?: string } } };
  assert(healedShot.narrative?.sound?.dialogue === false, "sound.dialogue healed false on react_silent");
  assert(/寝殿环境音/.test(String(healedShot.narrative?.sound?.sfx ?? "")), "SFX scene token aligned to 寝殿");
  assert(hom.heals.includes("sound_dialogue_false_on_silent"), "sound heal logged");
  assert(hom.heals.includes("heal_av_scene_sfx"), "av scene sfx heal logged");

  const mismatch = checkAvSceneSfxCoherence({ sceneName: "寝殿", sfx: "祠堂环境音" });
  assert(!mismatch.ok, "detect 寝殿/祠堂 mismatch");
  const aligned = healAvSceneSfxText({ sceneName: "寝殿", sfx: "祠堂环境音, 烛火噼啪" });
  assert(aligned.healed && /寝殿环境音/.test(aligned.sfx), "healAvSceneSfxText replaces 祠堂→寝殿");
}

{
  const { asDialogueLineObjects } = require("../src/ruleEngine/design/dialogueCoverage") as typeof import("../src/ruleEngine/design/dialogueCoverage");
  const objs = asDialogueLineObjects([{ text: "2s" }]);
  assert(objs.length === 1 && objs[0].text === "2s", "asDialogueLineObjects handles array");
  const fromStr = asDialogueLineObjects("甲：你好");
  assert(fromStr[0]?.speaker === "甲", "asDialogueLineObjects handles string");
}

console.log("\nAll burn-design-adapt tests passed.");
