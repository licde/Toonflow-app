/**
 * yarn test:video-prompt-ir
 * EP01-like stub → IR writeback with peak + Chinese audio.
 */
import { buildPromptIR, applyPromptIRToShot, isFxPromptGradeStub } from "@/ruleEngine/compilers/promptIR";
import type { PreDesignShot } from "@/ruleEngine/bundle/types";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const shot: PreDesignShot = {
  shotIndex: 2,
  duration: 2,
  sceneName: "祠堂",
  visualDescription: "扳指特写",
  visualEffect: "暗金瞳微闪",
  fxLevel: "F1",
  charCodes: ["CHAR-SQC"],
  generation: {
    videoPrompt: "中景 static, duration 2s",
    audioPrompt: "冰冷女声",
    fxPrompt: "F1",
  },
  narrative: {
    dialogue: {
      lines: [{ speaker: "沈清瓷", text: "天命在我，岂容尔等置喙。" }],
    },
  },
  shotDesign: {
    composition: { foreground: "扳指", anchor: "ring close" },
    cameraAnchor: { shotSize: "CU" },
  },
};

const plan = {
  sceneRef: 2,
  avCausality: { visualPeak: "扳指暗金一闪", audioBeat: "碎裂声" },
  voiceIntent: { speaker: "沈清瓷", speakingStyle: "冰冷" },
  fxIntent: { level: "F1" },
  promptAnchors: { vid: ["static hold"], aud: ["碎裂声"], fx: ["暗金瞳"] },
};

const ir = buildPromptIR(shot, { implementationPlanItem: plan, forceRebuild: true });
ok("rebuilt note", (ir.notes ?? []).some((n) => n.includes("rebuilt") || n.includes("audio")));
ok("visual peak in video", /扳指暗金|ring|扳指/i.test(ir.videoPrompt ?? ""));
ok("Chinese in Audio section", /天命在我/.test(ir.videoPrompt ?? ""));
ok("no No dialogue", !/no\s*dialogue/i.test(ir.videoPrompt ?? ""));
ok("audioPrompt has lines", /天命在我/.test(ir.audioPrompt ?? ""));
ok("fx not grade stub", !isFxPromptGradeStub(ir.fxPrompt) && /暗金/.test(ir.fxPrompt ?? ""));
ok("duration raised for lip", (ir.durationSec ?? 0) >= 3);

const applied = applyPromptIRToShot(shot, ir);
ok("writeback videoPrompt", Boolean(applied.generation?.videoPrompt?.includes("[")));
ok("writeback audioPrompt", Boolean(applied.generation?.audioPrompt));
ok("writeback fxPrompt", Boolean(applied.generation?.fxPrompt && !/^F[0-5]$/i.test(applied.generation.fxPrompt)));

if (failed) {
  console.error(`\n${failed} video-prompt-ir failed`);
  process.exit(1);
}
console.log("\n=== test:video-prompt-ir OK ===");
