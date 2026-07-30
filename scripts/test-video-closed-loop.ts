/**
 * Video closed-loop golden: pseudo strip, pad gate, viral mediate, IRD, impl→spine, softAllow inventory.
 * yarn test:video-closed-loop
 */
import { readFileSync } from "fs";
import { join } from "path";
import { diagnoseVideoIntent, applyVideoIntentPatches } from "../src/ruleEngine/design/videoIntentReverse";
import {
  assertNoPadDuration,
  audioBodyForMode,
  scrubVideoPromptForBurn,
  assertStillVideoIntentMap,
} from "../src/ruleEngine/compilers/videoDesignContract";
import { mediateViralMotion } from "../src/ruleEngine/compilers/viralMotionMediate";
import { hydrateShotCompileContextSync } from "../src/ruleEngine/compilers/hydrateShotCompileContext";
import { compileVideoPromptSpine } from "../src/ruleEngine/compilers/compileVideoPromptSpine";
import { stripPseudoDialogueFromVideoPrompt } from "../src/ruleEngine/heal/videoHomologyHeal";
import { scoreShortVideo } from "../src/ruleEngine/qc/shortVideoQuality";
import { runPostBurnRuntime } from "../src/ruleEngine/qc/postBurnRuntime";
import { buildPostBurnVideoUpdate } from "../src/ruleEngine/qc/persistPostBurnVideo";
import { applyLifecycleInvalidation } from "../src/ruleEngine/heal/lifecycleInvalidate";
import { hasOnCameraDialogue } from "../src/ruleEngine/design/onCameraDialogue";
import { buildPostBurnVideoUpdate } from "../src/ruleEngine/qc/persistPostBurnVideo";
import { mapVideoStateForFe, isSoftDeliveredVideoRow } from "../src/ruleEngine/qc/qcSoftDeliver";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
  console.log("✓", msg);
}

// --- Pseudo dialogue strip homology ---
{
  assert(!hasOnCameraDialogue([{ text: "2s" }]), "2s not on-camera dialogue");
  assert(!hasOnCameraDialogue([{ text: "：：：3s" }]), "colon soup duration not on-camera");
  const dirty = `[Audio]\n"：：：：：3s"\n口型同步开启。\n\n[Motion]\n事件拍点`;
  const stripped = stripPseudoDialogueFromVideoPrompt(dirty);
  assert(stripped.changed, "pseudo strip changed");
  assert(!/：：：/.test(stripped.prompt) || !/口型同步开启/.test(stripped.prompt), "pseudo or orphan lip cleared");
  const scrub = scrubVideoPromptForBurn({ prompt: dirty, dialogueLines: [] });
  assert(scrub.changes.includes("strip_pseudo_audio") || scrub.changes.includes("strip_orphan_lip"), "scrub homology");
}

// --- QC soft deliver (weak playback) ---
{
  const soft = buildPostBurnVideoUpdate({
    videoPass: false,
    primaryNextStep: "human_review",
    userMessage: "SVQ 未测维",
    unknownDims: ["motion_fidelity"],
  });
  assert(soft.state === "生成成功", "soft human_review → 生成成功");
  const row = { state: "质检未过", filePath: "/p/v.mp4", errorReason: soft.errorReason };
  assert(isSoftDeliveredVideoRow(row), "soft row deliverable");
  assert(mapVideoStateForFe(row) === "已完成", "FE state 已完成 not 生成失败");
  const hard = buildPostBurnVideoUpdate({
    videoPass: false,
    primaryNextStep: "retry_shot",
    failDims: [{ id: "vendor_corrupt" }],
  });
  assert(hard.state === "质检未过", "vendor hard stays 质检未过");
}

{
  const pad = assertNoPadDuration({
    authorBeatSec: 2,
    burnDurationSec: 6,
    hasLiteraryDialogue: false,
  });
  assert(Boolean(pad && pad.id === "DUR-PAD"), "pad gate blocks 2→6");
  const ok = assertNoPadDuration({
    authorBeatSec: 2,
    burnDurationSec: 3,
    hasLiteraryDialogue: false,
  });
  assert(!ok, "pad allows +1 snap");
}

// --- Viral mediate Agnes vs Wan ---
{
  const agnes = mediateViralMotion({ text: "急推冲击开场", vendorId: "agnesai" });
  assert(!agnes.confirmRequired || agnes.changed || agnes.mediated.length > 0, "agnes mediate returns");
  const wan = mediateViralMotion({ text: "急推冲击开场", vendorId: "wan" });
  assert(Boolean(wan.mediated), "wan mediate returns");
}

// --- audioMode templates ---
{
  const amb = audioBodyForMode({ audioMode: "ambient", dialogueLines: [] });
  assert(/无对白/.test(amb) && !/口型同步/.test(amb), "ambient no lip");
  const lip = audioBodyForMode({ audioMode: "dialogue_lip", dialogueLines: ["你敢？"] });
  assert(/口型同步/.test(lip) && /你敢/.test(lip), "dialogue_lip template");
}

// --- IRD diagnose + apply ---
{
  const shots = [
    {
      shotIndex: 0,
      visualDescription: "特写。休书纸角",
      duration: 2,
      narrative: {
        dialogue: { lines: [{ text: "：：：：3s" }] },
        voiceIntent: { type: "lip_native" },
      },
      generation: { videoPrompt: "[Motion]\n事件拍点\n[Audio]\n口型同步开启。" },
    },
  ];
  const d = diagnoseVideoIntent({ shots });
  assert(!d.ok, "IRD finds debt");
  assert(d.findings.some((f) => /PSEUDO|VOICE|MOTION|BEAT|INTENT/i.test(f.id)), "IRD finding ids");
  const { shots: next, applied } = applyVideoIntentPatches({ shots, patches: d.patches });
  assert(applied.length >= 1 || d.patches.length === 0, "IRD apply path");
  const again = diagnoseVideoIntent({ shots: next });
  assert(again.findings.length <= d.findings.length, "IRD until-clear trend");
}

// --- implPlan → spine ---
{
  const ctx = hydrateShotCompileContextSync({
    designShot: {
      shotIndex: 1,
      visualDescription: "沈清漪侧脸，纸角划过面颊",
      shotSize: "特写",
      duration: 2,
      narrative: { beatDuration: 2 },
      shotDesign: { performance: { microExpression: { eyes: "含泪", mouthDetail: "抿唇" } } },
      implementationPlan: {
        sfxIntent: "纸页轻擦",
        avCausality: { audioBeat: "纸擦", visualPeak: "纸角贴颊" },
        promptAnchors: ["休书", "面颊"],
      },
    } as never,
    vendorId: "agnesai",
  });
  assert(Boolean(ctx.microExpression), "hydrate microExpression");
  assert(ctx.beatDurationSec === 2, "hydrate beatDuration");
  assert(Boolean(ctx.sfxIntent || ctx.avCausality), "hydrate impl bind");
  const spine = compileVideoPromptSpine({ ctx, forceRebuild: true, includeSidecar: false });
  assert(/微表情|纸|面颊|拍点|音效/.test(spine.prompt), "spine consumes impl/micro");
}

// --- still→video intent map ---
{
  const bad = assertStillVideoIntentMap({
    stillIntentClass: "ecu_face",
    videoIntentClass: "fx_peak",
    visualDescription: "侧脸特写无特效",
    dialogueLines: [],
    voiceType: "lip_native",
  });
  assert(Boolean(bad), "intent map blocks fx_peak+lip on silent face");
}

// --- SVQ honesty ---
{
  const svq = scoreShortVideo({ flags: {}, unknownDims: ["motion_fidelity"] });
  assert(!svq.pass, "unknown ≠ pass");
  const post = runPostBurnRuntime({
    hasDialogue: false,
    visualPass: true,
    motionIntent: "push",
    vlmAdapterPresent: false,
  });
  assert(post.videoPass === false, "postBurn not pass without measure");
  assert(
    post.primaryNextStep === "human_review" || (post.unknownDims?.length ?? 0) > 0,
    "SVQ skip → human_review or unknownDims",
  );
  const row = buildPostBurnVideoUpdate(post);
  assert(row.state === "生成成功", "soft human_review persists as deliverable (qcWeak)");
  const er = JSON.parse(row.errorReason) as { primaryNextStep?: string; ctaLabel?: string; qcWeak?: boolean };
  assert(er.qcWeak === true, "qcWeak flag set");
  assert(Boolean(er.primaryNextStep), "persist flat primaryNextStep");
  const lifePass = applyLifecycleInvalidation("video_burned", { stillQuality: "hq_ok", videoStale: true });
  assert(lifePass.stillMeta?.videoStale === false && lifePass.stillMeta?.videoPass === true, "lifecycle video_burned clears stale");
}

// --- softAllow inventory present ---
{
  const inv = JSON.parse(
    readFileSync(join(__dirname, "../data/fixtures/soft_allow_inventory.json"), "utf8"),
  ) as { entries: { id: string }[]; policy?: string };
  assert(inv.entries.some((e) => e.id === "SOFT-ALLOW-WEAK-STILL-INFRA"), "softAllow inventory");
  assert(/never fake designExitPass or videoPass/i.test(String(inv.policy ?? "")), "softAllow policy no fake pass");
}

// --- paper_doc lifts prop_readable; heal_placeholder blocks redesignPass ---
{
  const { buildLiteraryFidelityChecklist } =
    require("../src/ruleEngine/compilers/literaryFidelityChecklist") as typeof import("../src/ruleEngine/compilers/literaryFidelityChecklist");
  const items = buildLiteraryFidelityChecklist({
    description: "特写。沈清漪侧脸，休书纸角划过面颊。",
    characterNames: ["沈清漪"],
  });
  assert(
    items.some((i) => i.id === "lit:prop_readable"),
    "paper_doc VD lifts lit:prop_readable without 字迹 keyword",
  );
  const { assertRedesignPass } =
    require("../src/ruleEngine/design/redesignContract") as typeof import("../src/ruleEngine/design/redesignContract");
  const pass = assertRedesignPass({
    planData: {
      preDesignPack: {
        shots: [{ visualDescription: "x", shotDesign: { raSource: "heal_placeholder", reactionAction: "停顿" } }],
      },
      dialoguePlan: { lines: [{ raSource: "heal_placeholder" }] },
    },
  });
  assert(!pass.ok && pass.failedIds.includes("NAR-15"), "heal_placeholder blocks redesignPass (NAR-15)");
}

console.log("\nAll video closed-loop checks passed.");
