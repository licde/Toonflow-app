/**
 * Video compile spine golden — L33 thin shell + heal-first (not hard block when material exists).
 * yarn test:video-prompt-spine
 */
import { compileVideoPromptSpine } from "../src/ruleEngine/compilers/compileVideoPromptSpine";
import { assertVideoPromptReady, isVideoPromptThinShell } from "../src/ruleEngine/compilers/assertVideoPromptReady";
import { classifyVideoIntent } from "../src/ruleEngine/compilers/videoIntentPolicy";
import {
  hydrateShotCompileContextSync,
  mergeWorkbenchCompileSources,
  isTrueDesignGap,
} from "../src/ruleEngine/compilers/hydrateShotCompileContext";
import { softPatchQfExpr } from "../src/ruleEngine/compilers/qfExprGate";
import { compileFromShotDesign } from "../src/ruleEngine/bundle/compileFromShotDesign";
import { enrichShotGenerationFromDesign } from "../src/ruleEngine/bundle/modalityChainAudit";

const L33 =
  "[Visual]\n, 禁止夸张., 锁定脸型身份，禁止夸张\n\n[Motion]\nmotion-from-frame\n\n[Camera]\n中景，轻微运镜，，单次连续镜头。, 时长, duration 5s\n\n[Audio]\n无对白。仅环境音效。\n\n[Narrative]\n设计连贯；锁定脸型身份。, anchor:天命书/丹方遗物, 无字幕无水印无Logo。锁定脸型上的细微微表情（禁止/）；表情细节属分镜静帧";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
  console.log("✓", msg);
}

// --- QF self-eat ---
{
  const r = softPatchQfExpr("改脸测试");
  assert(!/禁止\//.test(r.prompt), "qf hint no 禁止/");
  assert(/禁止改面容身份|微表情/.test(r.prompt) || r.patched, "qf injects safe hint");
}

// --- L33 thin shell gate ---
{
  assert(
    isVideoPromptThinShell(L33, {
      dialogueLines: ["春日宴上"],
      durationSec: 20,
      gaps: {
        missingVisualDescription: true,
        missingShotSize: false,
        missingDuration: false,
        missingDialogueWhenExpected: false,
      },
    }),
    "L33 is thin shell",
  );
  const ready = assertVideoPromptReady(L33, {
    dialogueLines: ["春日宴上"],
    durationSec: 20,
  } as never);
  assert(!ready.ok && ready.code === "VP-THIN-SHELL", "L33 assert → VP-THIN-SHELL");
}

// --- Intent classes ---
{
  const speak = classifyVideoIntent({
    visualDescription: "沈母端坐说教",
    shotSize: "中景",
    dialogueLines: ["你可知"],
  });
  assert(speak.intentClass === "speak_lip", "speak_lip from dialogue");

  const prop = classifyVideoIntent({
    visualDescription: "沈母摩挲玉扳指特写",
    shotSize: "CU",
    dialogueLines: ["春日宴上"],
    stillIntentClass: "hand_cu_explicit",
  });
  assert(prop.intentClass === "prop_cu", "prop_cu inherit/hand");
}

// --- Spine authors CU + dialogue + duration ---
{
  const dial = [
    { speaker: "沈母", text: "春日宴上" },
    { speaker: "沈母", text: "萧二公子与顾家那位说笑了三句" },
  ];
  const ctx = hydrateShotCompileContextSync({
    designShot: {
      shotIndex: 1,
      visualDescription: "沈母摩挲玉扳指特写，冷厉神色",
      shotSize: "CU",
      duration: 20,
      sceneName: "沈家祠堂",
      narrative: { dialogue: { lines: dial } },
      generation: { stillIntentClass: "hand_cu_explicit" },
    },
    seedPrompt: L33,
    shotIndex: 1,
    vendorId: "agnesai",
  });
  assert(ctx.canAuthorFromDesign, "can author from design");
  assert(ctx.durationSec >= 10, `duration from design/lip not silent 5 (got ${ctx.durationSec})`);
  assert(!isTrueDesignGap(ctx), "not true design gap when VD+dial present");

  const spine = compileVideoPromptSpine({
    ctx,
    forceRebuild: true,
    includeSidecar: false,
    vendorId: "agnesai",
  });
  assert(spine.ready, `spine ready: ${spine.readyCode} ${spine.readyReasons.join(",")}`);
  assert(/扳指/.test(spine.prompt), "Visual has 扳指");
  assert(/春日宴上/.test(spine.prompt), "Audio has dialogue");
  assert(!/无对白/.test(spine.prompt), "not 无对白");
  assert(/特写/.test(spine.prompt), "Camera 特写");
  assert(!/禁止\//.test(spine.prompt), "no QF residue 禁止/");
  assert(spine.generationWriteback.videoPrompt === spine.generationWriteback.compiledVideo, "dual-write same body");
  assert(Boolean(spine.promptHash), "prompt hash");

  const spine2 = compileVideoPromptSpine({
    ctx,
    forceRebuild: true,
    includeSidecar: false,
    vendorId: "agnesai",
  });
  assert(spine.promptHash === spine2.promptHash, "persist/burn fingerprint stable");
}

// --- Heal: package empty VD but storyboard videoDesc → ready (not block) ---
{
  const merged = mergeWorkbenchCompileSources({
    designShot: { shotIndex: 1, duration: 20, shotSize: "CU" } as never,
    shotMeta: { shotIndex: 1 },
    storyboard: {
      videoDesc: "沈母摩挲玉扳指特写，冷厉",
      duration: 20,
      shotSize: "CU",
      dialogue: { lines: [{ speaker: "沈母", text: "春日宴上你可知" }] },
    },
  });
  const ctx = hydrateShotCompileContextSync({
    designShot: merged.designShot,
    shotMeta: merged.shotMeta,
    seedPrompt: L33,
    shotIndex: 1,
    vendorId: "agnesai",
  });
  assert(ctx.canAuthorFromDesign, "merged storyboard → can author");
  assert(/扳指/.test(ctx.visualDescription), "merged VD from storyboard videoDesc");
  assert(!isTrueDesignGap(ctx), "merged material ≠ true gap");
  const spine = compileVideoPromptSpine({ ctx, forceRebuild: true, includeSidecar: false });
  assert(spine.ready, "heal from storyboard material → ready (persist allowed)");
  assert(/扳指/.test(spine.prompt), "healed Visual has 扳指");
}

// --- True gap: no VD no dialogue → still not ready / isTrueDesignGap ---
{
  const ctx = hydrateShotCompileContextSync({
    designShot: { shotIndex: 0 } as never,
    seedPrompt: L33,
    shotIndex: 0,
  });
  assert(isTrueDesignGap(ctx), "empty design is true gap");
  const spine = compileVideoPromptSpine({ ctx, forceRebuild: true, includeSidecar: false });
  assert(!spine.ready || isVideoPromptThinShell(spine.prompt, ctx), "true gap does not fake-ready body");
  assert(!/画面主体/.test(spine.prompt), "no invented 画面主体");
}

// --- Track-scoped: never use wrong storyboard[0] ---
{
  const {
    pickHydratedStoryboardById,
    bestLiteraryDescFromPanels,
    preferLiteraryVisualDesc,
    literaryCjkScore,
  } = require("../src/ruleEngine/compilers/resolveTrackStoryboard") as typeof import("../src/ruleEngine/compilers/resolveTrackStoryboard");
  const list = [
    { id: 101, videoDesc: "镜1开场跪抄书" },
    { id: 202, videoDesc: "沈母摩挲玉扳指特写" },
  ];
  const hit = pickHydratedStoryboardById(list, 202);
  assert(hit?.videoDesc?.includes("扳指"), "pick by storyboardId not [0]");
  assert(pickHydratedStoryboardById(list, 999) == null, "missing id → null not [0]");
  const panels = [
    { id: 1, videoDesc: "锁定脸型身份，禁止夸张" },
    { id: 2, videoDesc: "沈母摩挲玉扳指特写，冷厉神色" },
  ];
  assert(bestLiteraryDescFromPanels(panels).includes("扳指"), "best literary skips lock-face shell");
  assert(
    preferLiteraryVisualDesc("沈母摩挲玉扳指特写", "特写 static, duration 6s, subtle mouth movement, 背景虚化").includes(
      "扳指",
    ),
    "package VD wins over motion-template storyboard videoDesc",
  );
  assert(
    preferLiteraryVisualDesc(
      "沈母摩挲玉扳指特写",
      "沈母摩挲玉扳指特写。场面硬约束：沈母周氏必须摩挲扳指。竖屏9:16安全区构图，高细节视频首帧。出镜人数：仅4人。",
    ) === "沈母摩挲玉扳指特写",
    "package short VD wins over still-compose essay",
  );
  assert(literaryCjkScore("特写 static, duration 6s, subtle mouth movement") < 8, "motion template score < literary floor");
}

// --- Duration + audio content-aware ---
{
  const longDial = [
    { speaker: "沈母", text: "春日宴上萧二公子与顾家那位说笑了三句你可知应酬若真是应酬他为何不与你应酬" },
    { speaker: "沈母", text: "我供你吃穿教你琴棋不是为了让你当哑巴的" },
  ];
  const ctx = hydrateShotCompileContextSync({
    designShot: {
      shotIndex: 1,
      visualDescription: "沈母摩挲玉扳指特写",
      shotSize: "CU",
      duration: 8,
      narrative: { dialogue: { lines: longDial } },
      generation: { fxPrompt: "摔杯，烛火骤灭", audioPrompt: "杯碎音效" },
      audioCue: "杯碎",
    } as never,
    seedPrompt: L33,
    shotIndex: 1,
    vendorId: "agnesai",
  });
  assert(ctx.dialogueLines.length >= 1, "long dial loaded");
  assert(ctx.durationSec >= 8, `lip/content duration >= author (got ${ctx.durationSec})`);
  const spine = compileVideoPromptSpine({ ctx, forceRebuild: true, includeSidecar: false, vendorId: "agnesai" });
  assert(spine.ready, "content spine ready");
  assert(/口型同步|春日宴/.test(spine.prompt), "Audio has dialogue/lip");
  assert(/摔杯|烛火|杯碎|音效/.test(spine.prompt), "Audio/Narrative has FX/SFX");
  assert(/时长\s*\d+s/.test(spine.prompt), "Camera has duration");
  const m = spine.prompt.match(/时长\s*(\d+)s/);
  assert(m && Number(m[1]) >= 8, `Camera duration intelligent >=8 (got ${m?.[1]})`);
}

// --- compileFromShotDesign no stub plant ---
{
  const frag = compileFromShotDesign({
    shotDesign: { cameraAnchor: { shotSize: "medium" }, lipSyncPolicy: "off" },
    duration: 5,
  } as never);
  assert(!frag.videoPrompt, "compileFromShotDesign does not plant video stub");
}

// --- import designGaps mark ---
{
  const enriched = enrichShotGenerationFromDesign({ visualDescription: "", narrative: {} } as never);
  assert(
    Array.isArray(enriched.generation?.designGaps) &&
      enriched.generation!.designGaps!.includes("missing_dialogue_and_vd"),
    "import marks designGaps when VD and dialogue missing",
  );
  const ok = enrichShotGenerationFromDesign({
    visualDescription: "沈母摩挲扳指",
    narrative: { dialogue: { lines: [{ text: "你可知" }] } },
  } as never);
  assert(!ok.generation?.designGaps?.includes("missing_dialogue_and_vd"), "no dual-gap when VD present");
}

console.log("OK video-prompt-spine");
