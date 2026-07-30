/**
 * yarn test:quality-gate — LANG / CAM / QP / multi-stage contracts (no DB)
 */
import { qualityGate } from "@/ruleEngine/qualityGate";
import { checkLangVid01, checkFxGrade } from "@/ruleEngine/validators/langAudFxCam";
import { isAllowedTransition, promptMotionWhitelistViolation } from "@/ruleEngine/qualityGate/cameraWhitelist";
import { checkQp02VisualDescription, checkCamXshot } from "@/ruleEngine/bundle/visualQualityAudit";
import { runDesignClosureDryRun } from "@/ruleEngine/bundle/designClosureDryRun";
import { runPrecheckLoop, createInMemoryPatchApplier } from "@/ruleEngine/precheckLoop";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

// LANG-01: Chinese dialogue + English videoPrompt
{
  const hit = checkLangVid01({
    dialogueLines: "春日宴上，萧二公子与顾家那位说笑了三句，你可知？",
    videoPrompt: `[Audio]\n0s-3s: "Do you know what happened at the spring banquet?" — Mother (dialogue), lip-sync active.`,
    shotIndex: 1,
  });
  ok("LANG-01 detects EN dialogue in videoPrompt", Boolean(hit && hit.ruleId === "LANG-01"));
}

{
  const pass = checkLangVid01({
    dialogueLines: "你可知？",
    videoPrompt: `[Audio]\n0s-3s: "你可知？" — 沈母 (dialogue), lip-sync active.`,
    shotIndex: 1,
  });
  ok("LANG-01 passes source-language Audio", pass == null);
}

// Camera whitelist
{
  ok("transition 切 allowed", isAllowedTransition("切"));
  ok("transition 360-orbit-spin banned", !isAllowedTransition("360-orbit-spin"));
  ok("whip pan forbidden in prompt", Boolean(promptMotionWhitelistViolation("Camera: whip pan across room")));
  ok("slow pan allowed", !promptMotionWhitelistViolation("Camera: slow pan left"));
}

// QP-02
{
  const empty = checkQp02VisualDescription({ visualDescription: "", shotIndex: 1 });
  ok("QP-02 empty BLOCK", empty?.severity === "BLOCK");
  const abstract = checkQp02VisualDescription({ visualDescription: "很美的氛围感", shotIndex: 2 });
  ok("QP-02 abstract BLOCK", abstract?.severity === "BLOCK");
  const concrete = checkQp02VisualDescription({
    visualDescription: "沈母摩挲玉扳指，烛火摇曳映在祠堂石墙",
    shotIndex: 3,
  });
  ok("QP-02 concrete OK", concrete == null);
}

// DC-09 BLOCK via dryRun
{
  const bundle: ScriptBundle = {
    bundleType: "script",
    script: "场1\n\n男主：\"你好。\"",
    preDesignPack: {
      scriptPlan: "#",
      shots: [
        {
          shotIndex: 1,
          duration: 3,
          narrative: {
            dialogue: { lines: [{ speaker: "男主", text: "你好。" }] },
            transitionType: "360-orbit-spin",
          },
        },
      ],
      externalHashCheck: { match: true },
    },
  };
  const dc = runDesignClosureDryRun(bundle);
  const dc09 = dc.find((c) => c.id === "DC-09");
  ok("DC-09 blocks illegal transition", dc09?.passed === false && dc09.severity === "BLOCK", JSON.stringify(dc09));
}

// qualityGate burn vs export same LANG block
{
  const bundle: ScriptBundle = {
    bundleType: "script",
    script: "场1\n\n沈母：\"你可知？\"",
    preDesignPack: {
      scriptPlan: "#",
      shots: [
        {
          shotIndex: 1,
          narrative: { dialogue: { lines: [{ speaker: "沈母", text: "你可知？" }] } },
          videoPrompt: `[Audio]\n"Do you know?" — Mother (dialogue)`,
          generation: { videoPrompt: `[Audio]\n"Do you know?" — Mother (dialogue)` },
        },
      ],
    },
  };
  const exportG = qualityGate(bundle, { stage: "export" });
  const burnG = qualityGate(bundle, {
    stage: "burn",
    promptOverride: {
      videoPrompt: `[Audio]\n"Do you know?" — Mother (dialogue)`,
      dialogueLines: "你可知？",
      shotIndex: 1,
    },
  });
  ok("export LANG blocked", exportG.blocks.some((b) => b.id === "LANG-01"));
  ok("burn LANG blocked", burnG.blocks.some((b) => b.id === "LANG-01"));
}

// LANG soft_patch heal
{
  const bundle: ScriptBundle = {
    bundleType: "script",
    script: "场1\n\n沈母：\"你可知？\"",
    preDesignPack: {
      scriptPlan: "#",
      shots: [
        {
          shotIndex: 1,
          narrative: { dialogue: { lines: [{ speaker: "沈母", text: "你可知？" }] } },
          videoPrompt: `[Visual]\nroom\n\n[Audio]\n"Do you know?" — Mother (dialogue), lip-sync active.`,
          generation: {
            videoPrompt: `[Visual]\nroom\n\n[Audio]\n"Do you know?" — Mother (dialogue), lip-sync active.`,
          },
        },
      ],
    },
  };
  const healed = runPrecheckLoop(
    { bundle, checks: ["LANG-01"], apply: true },
    { applier: createInMemoryPatchApplier() },
  );
  ok("LANG-01 heal ok or suggest", healed.ok || healed.decision.mode === "suggest" || healed.decision.mode === "soft_patch" || Boolean(healed.patches?.length), JSON.stringify(healed.decision));
}

// CAM-XSHOT adjacent motion jump
{
  const hits = checkCamXshot([
    { shotIndex: 1, motion: "static", transitionType: "切" },
    { shotIndex: 2, motion: "tracking", transitionType: "切" },
  ]);
  ok("CAM-XSHOT detects abrupt motion", hits.some((h) => h.id === "CAM-XSHOT"));
}

// T3 ep1 elevates VIR/NAR
{
  const bundle: ScriptBundle = {
    bundleType: "script",
    script: "场1",
    planData: {
      episodeIndex: 1,
      viralAdaptation: { retentionPlan: { ep1: {} } },
    },
    preDesignPack: { scriptPlan: "#", shots: [{ shotIndex: 1, visualDescription: "沈母摩挲玉扳指，烛火映石墙" }] },
  };
  const t3 = qualityGate(bundle, { stage: "export", tier: "T3" });
  const t1 = qualityGate(bundle, { stage: "export", tier: "T1" });
  ok(
    "T3 ep1 elevates viral/nar to BLOCK",
    t3.blocks.some((b) => b.id === "VIR-01" || b.id === "RET-01" || b.id === "NAR-01" || b.id === "NAR-DENSITY"),
    JSON.stringify(t3.blocks.map((b) => b.id)),
  );
  ok(
    "T1 does not elevate viral/nar to BLOCK",
    !t1.blocks.some((b) => b.id === "VIR-01" || b.id === "RET-01" || b.id === "NAR-01" || b.id === "NAR-DENSITY"),
    JSON.stringify(t1.blocks.map((b) => `${b.id}:${b.severity}`)),
  );
}

// PR-CAM / DC-09 soft_patch
{
  const bundle: ScriptBundle = {
    bundleType: "script",
    script: "场1",
    preDesignPack: {
      scriptPlan: "#",
      shots: [
        {
          shotIndex: 1,
          narrative: { transitionType: "360-orbit-spin" },
          videoPrompt: "Camera: whip pan across room",
        },
      ],
    },
  };
  const healed = runPrecheckLoop(
    { bundle, checks: ["PR-CAM-01", "DC-09"], apply: true },
    { applier: createInMemoryPatchApplier() },
  );
  ok(
    "PR-CAM/DC-09 heal suggests or soft_patches",
    Boolean(healed.patches?.length) || healed.decision.mode === "soft_patch" || healed.ok || Boolean(healed.applied?.length),
    JSON.stringify({ mode: healed.decision.mode, patches: healed.patches?.length, applied: healed.applied }),
  );
}

// FX semantics
{
  ok("FX empty burn path PASS", checkFxGrade({ fxPrompt: "", shotIndex: 1 }) == null);
  ok("FX F0 PASS", checkFxGrade({ fxPrompt: "", fxFeasibility: "F0", shotIndex: 1 }) == null);
  ok(
    "FX undeclared BLOCK at export",
    checkFxGrade({ fxPrompt: "", shotIndex: 1, warnUndeclared: true })?.severity === "BLOCK",
  );
  ok("FX F5 BLOCK", checkFxGrade({ fxPrompt: "不可行", fxFeasibility: "F5", shotIndex: 2 })?.severity === "BLOCK");
  const emptyBurn = qualityGate(
    {
      bundleType: "script",
      script: "场1",
      preDesignPack: {
        scriptPlan: "#",
        shots: [{ shotIndex: 1, generation: { videoPrompt: "Camera: slow pan", fxPrompt: "" } }],
      },
    },
    { stage: "burn" },
  );
  ok("burn empty FX not blocked", !emptyBurn.blocks.some((b) => b.id === "FX-GRADE-01"));
  const hardBurn = qualityGate(
    {
      bundleType: "script",
      script: "场1",
      preDesignPack: {
        scriptPlan: "#",
        shots: [{ shotIndex: 1, generation: { fxPrompt: "需拆镜 F5" }, fxFeasibility: "F5" }],
      },
    },
    { stage: "burn" },
  );
  ok("burn F5 blocked", hardBurn.blocks.some((b) => b.id === "FX-GRADE-01"));
  const fxHeal = runPrecheckLoop(
    {
      bundle: {
        bundleType: "script",
        script: "场1",
        preDesignPack: {
          scriptPlan: "#",
          shots: [{ shotIndex: 1, generation: { videoPrompt: "x", fxPrompt: "" } }],
        },
      },
      checks: ["FX-GRADE-01"],
      apply: true,
    },
    { applier: createInMemoryPatchApplier() },
  );
  ok(
    "FX-GRADE F0 soft_patch suggests or applies",
    Boolean(fxHeal.patches?.length) || fxHeal.ok || fxHeal.decision.mode === "soft_patch",
    JSON.stringify(fxHeal.decision),
  );
}

process.exit(failed ? 1 : 0);
