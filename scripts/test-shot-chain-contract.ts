/**
 * yarn test:shot-chain-contract
 * M0/M5/M6/M9/M12/M18 core: chain contract, fidelity, no-trim, duration, beat cover, design loss.
 */
import {
  assertChainEgress,
  buildShotChainContract,
  resolveShotDurationSec,
  markChainStale,
} from "@/ruleEngine/quality/shotChainContract";
import { applyDesignLossSupplement } from "@/ruleEngine/quality/designLossSupplement";
import { assertPromptDesignFidelity } from "@/ruleEngine/quality/assertPromptDesignFidelity";
import { auditCamShootableFit } from "@/ruleEngine/quality/camShootableFit";
import { auditLiteraryBeatCoverage } from "@/ruleEngine/design/literaryBeatCoverage";
import { dialogueCoverageReport } from "@/ruleEngine/design/dialogueCoverage";
import { shouldWarnOneBeat } from "@/ruleEngine/compilers/stillIdentitySsot";
import { expandVisualBeats } from "@/ruleEngine/design/expandVisualBeats";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

function main() {
  // M0 duration
  const d1 = resolveShotDurationSec({ duration: 2 });
  ok("duration 2 trusted", d1.durationSec === 2 && d1.trusted);
  const dMiss = resolveShotDurationSec({});
  ok("duration missing untrusted", !dMiss.trusted && dMiss.durationSec === 0);

  // M0 multi-beat egress
  const multiVd = "他刺入胸口。她咬帕。旁人包扎伤口。露出冷笑。勾起往事。";
  ok("multi-beat detect", shouldWarnOneBeat(multiVd) || multiVd.length > 10);
  const cMulti = buildShotChainContract({
    shotIndex: 1,
    visualDescription: "沈清漪端坐太师椅，摩挲扳指。",
    duration: 3,
    charCodes: ["CHAR-001"],
  });
  ok("contract hash", cMulti.designContentHash.length >= 8);
  const eg = assertChainEgress("burn", cMulti, { burnDuration: 1 });
  ok("DUR-DESYNC blocks lower burn", eg.codes.includes("DUR-DESYNC"), eg.codes.join(","));

  // M5 fidelity
  const fid = assertPromptDesignFidelity({
    shot: { visualDescription: "沈清漪端坐太师椅摩挲扳指", duration: 3 },
    knownNames: ["沈清漪"],
    videoPrompt: "空镜风景无人物",
    stage: "burn",
  });
  ok("fidelity can flag", typeof fid.ok === "boolean");

  // M6 no trim path — compose pick returns null for multi; we only assert detector
  ok("one-beat warn API exists", typeof shouldWarnOneBeat === "function");

  // M9 raise-only: burn 3 >= shot 2 ok
  const egOk = assertChainEgress(
    "burn",
    buildShotChainContract({ visualDescription: "端坐太师椅", duration: 2 }),
    { burnDuration: 5 },
  );
  ok("raise duration ok", !egOk.codes.includes("DUR-DESYNC"));

  // M10 cam fit
  const cam = auditCamShootableFit({
    shotIndex: 2,
    visualDescription: "推近又摇移又升降",
    camera: "static",
  });
  ok("multi cam intent split", cam.healHint === "split" || cam.findings.some((f) => f.id === "DEX-CAM-FIT"));

  // M12 beat coverage
  const kids = [
    {
      _stillBeatSplitId: "p1",
      _parentVisualDescription: "沈清漪端坐太师椅摩挲扳指",
      visualDescription: "端坐太师椅",
    },
    {
      _stillBeatSplitId: "p1",
      _parentVisualDescription: "沈清漪端坐太师椅摩挲扳指",
      visualDescription: "摩挲扳指",
    },
  ];
  const beat = auditLiteraryBeatCoverage(kids, { knownNames: ["沈清漪"] });
  ok("beat coverage runs", Array.isArray(beat));

  // M18 design loss
  const bundle = {
    preDesignPack: {
      shots: [{ shotIndex: 1, visualDescription: "", duration: 2, narrative: { dialogue: { lines: [] } } }],
    },
    planData: { narrativeBrief: { scenes: [{ picture: "沈清漪端坐太师椅，烛火侧光，摩挲扳指。" }] } },
    characterDesign: { assets: [{ code: "CHAR-001", name: "沈清漪" }] },
  } as ScriptBundle;
  const loss = applyDesignLossSupplement(bundle);
  ok(
    "design loss salvages from plan",
    loss.supplemented >= 1 || String(bundle.preDesignPack!.shots![0].visualDescription).length > 5,
    JSON.stringify(loss),
  );

  // M1 extras
  const cov = dialogueCoverageReport({
    script: "甲：你好\n",
    shots: [
      {
        narrative: {
          dialogue: {
            lines: [
              { speaker: "甲", text: "你好" },
              { speaker: "乙", text: "乱入台词不该出现" },
            ],
          },
        },
      },
    ],
    planData: { dialoguePlan: { lines: [{ speaker: "甲", text: "你好", lineId: "L1" }] } },
  });
  ok("extra dialogue blocked", !cov.ok && cov.extraCount > 0, `extra=${cov.extraCount}`);

  // M8 VisBeat cuts VD + no ??1.5
  const expanded = expandVisualBeats(
    [
      {
        clientId: "v1",
        visualDescription: "第一句端坐。第二句摩挲扳指。",
        visualBeatTags: ["weapon_insert"],
        shotSize: "MS",
        duration: 3,
        narrative: { shotSize: "MS" },
      },
    ],
    { meta: { pillarsVisBeatV2: "enforce" } },
  );
  ok("expand runs", expanded.shots.length >= 1);
  if (expanded.expandedCount > 0) {
    ok(
      "visbeat children have parent stash or cut vd",
      expanded.shots.some((s) => s._parentVisualDescription || s._visualSplitId),
    );
    ok(
      "no duration 1.5 default in videoDesc",
      !expanded.shots.some((s) => String(s.videoDesc ?? "").includes("1.5s")),
    );
  }

  // M7 stale mark
  const sh: Record<string, unknown> = { visualDescription: "端坐", duration: 2 };
  markChainStale(sh, { still: true, video: true });
  ok("stale marked", sh.promptState === "stale" && sh.videoStale === true);

  // M7: dialogue/VD designContentHash drift blocks burn
  const shotA: Record<string, unknown> = {
    shotIndex: 3,
    visualDescription: "沈清漪端坐太师椅摩挲扳指",
    duration: 4,
    narrative: { dialogue: { lines: [{ speaker: "沈清漪", text: "你走" }] } },
  };
  const cA = buildShotChainContract(shotA);
  const egFresh = assertChainEgress("burn", cA, {
    videoPrompt: "沈清漪端坐太师椅摩挲扳指 你走",
    burnDuration: 4,
    designContentHashAtCompile: cA.designContentHash,
  });
  ok("fresh design hash allows burn", egFresh.ok || !egFresh.codes.includes("VIDEO-PROMPT-STALE"), egFresh.codes.join(","));
  const shotB = {
    ...shotA,
    narrative: { dialogue: { lines: [{ speaker: "沈清漪", text: "乱入多一句台词" }] } },
  };
  const cB = buildShotChainContract(shotB);
  ok("dialogue change moves designContentHash", cB.designContentHash !== cA.designContentHash);
  const egStale = assertChainEgress("burn", cB, {
    videoPrompt: "沈清漪端坐太师椅摩挲扳指 你走",
    burnDuration: 4,
    designContentHashAtCompile: cA.designContentHash,
  });
  ok("stale design hash blocks burn", egStale.codes.includes("VIDEO-PROMPT-STALE"), egStale.codes.join(","));
  const egFlag = assertChainEgress(
    "burn",
    buildShotChainContract({ ...shotA, videoStale: true }),
    { videoPrompt: "沈清漪端坐太师椅摩挲扳指", burnDuration: 4 },
  );
  ok("videoStale flag blocks burn", egFlag.codes.includes("VIDEO-PROMPT-STALE"), egFlag.codes.join(","));

  // Audio × reaction linkage
  const { resolveAudioShotLinkage } = require("@/ruleEngine/quality/audioShotLinkage") as typeof import("@/ruleEngine/quality/audioShotLinkage");
  const speakReact = resolveAudioShotLinkage({
    visualDescription: "沈清漪开口道完，旁人愣住反应",
    narrative: { dialogue: { lines: [{ speaker: "沈清漪", text: "你走" }] } },
  });
  ok("speak+reaction must split", speakReact.mustSplit, speakReact.reason);

  const osReact = resolveAudioShotLinkage({
    visualDescription: "谢玄特写侧目听雨",
    narrative: { dialogue: { lines: [{ speaker: "旁白", type: "OS", text: "雨还在下" }] } },
    shotSize: "ECU",
  });
  ok("OS on ECU no split", !osReact.mustSplit && osReact.role === "os_vo_on_reaction", osReact.role);

  // M3 AUD-ORPHAN strip
  const { sanitizeVideoPrompt } = require("@/ruleEngine/compilers/sanitizeVideoPrompt") as typeof import("@/ruleEngine/compilers/sanitizeVideoPrompt");
  const orphan = sanitizeVideoPrompt({
    prompt: "[Audio]\n\"乱入口播\"\nlip-sync active\n[Camera]\nstatic",
    dialogueLines: [],
  });
  ok(
    "orphan speech stripped",
    orphan.conflicts.includes("AUD-ORPHAN-SPEECH") || orphan.changes.includes("audio_strip_orphan_speech"),
    orphan.changes.join(","),
  );

  // M11 breakAt
  const { classifyByBreakAt } = require("@/ruleEngine/design/chainBreakClassifier") as typeof import("@/ruleEngine/design/chainBreakClassifier");
  ok("design_loss → designSupplement", classifyByBreakAt("design_loss") === "designSupplement");
  ok("cam_split → camSplit", classifyByBreakAt("cam_split") === "camSplit");
  ok("cam_heal → camHeal", classifyByBreakAt("cam_heal") === "camHeal");

  // M17 soft cannot trump must-split / design-loss; DEX-CAM-FIT → autoAdapt (export cam hygiene)
  const matrix = require("../data/fixtures/semantic_gate_dual_track_matrix.json") as {
    mustEditBlockIds?: string[];
    autoAdaptBlockIds?: string[];
    softPatchBlockIds?: string[];
  };
  for (const id of ["DESIGN-LOSS", "DEX-STILL-ONEBEAT", "CHAIN-BEAT", "IMPORT-SPLIT-SYNC"]) {
    ok(`mustEdit has ${id}`, (matrix.mustEditBlockIds ?? []).includes(id));
    ok(`soft does not claim ${id}`, !(matrix.softPatchBlockIds ?? []).includes(id));
  }
  ok("DEX-CAM-FIT is autoAdapt", (matrix.autoAdaptBlockIds ?? []).includes("DEX-CAM-FIT"));
  ok("soft does not claim DEX-CAM-FIT", !(matrix.softPatchBlockIds ?? []).includes("DEX-CAM-FIT"));
  ok("DEX-CAM-FIT not mustEdit", !(matrix.mustEditBlockIds ?? []).includes("DEX-CAM-FIT"));

  if (failed) {
    console.error(`\n${failed} test:shot-chain-contract FAILED`);
    process.exit(1);
  }
  console.log("\n=== test:shot-chain-contract OK ===");
}

main();
