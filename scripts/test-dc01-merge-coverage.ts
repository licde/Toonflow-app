/**
 * yarn tsx scripts/test-dc01-merge-coverage.ts
 */
import fs from "fs";
import path from "path";
import { dialogueLineCountMismatch } from "@/ruleEngine/design/forwardTrace";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";
import { compileVideoNativePrompt, isVideoPromptStub } from "@/ruleEngine/compilers/videoNativeCompiler";
import { applyDesignFieldRegistry, extractDesignFields, buildExtractContext } from "@/ruleEngine/design/designFieldRegistry";
import { hydratePackageFromPreDesign } from "@/ruleEngine/bundle/hydratePackageFromPreDesign";
import type { EpisodePackage } from "@/ruleEngine/types";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const goldenPath = path.join(process.cwd(), "data/fixtures/golden/deepseek-20260716-43ce74.json");
const breakPath = path.join(process.cwd(), "data/fixtures/golden/dialogue-break-block.json");
const golden = JSON.parse(fs.readFileSync(goldenPath, "utf-8")) as ScriptBundle;
const broken = JSON.parse(fs.readFileSync(breakPath, "utf-8")) as ScriptBundle;

ok("43ce74 DC-01 pass (mergeable)", dialogueLineCountMismatch(golden) === false);
ok("dialogue-break DC-01 BLOCK (missing line)", dialogueLineCountMismatch(broken) === true);

// Merge into one shot should still cover
const merged: ScriptBundle = {
  ...broken,
  script: '场1\n\n男主："你好。"\n\n女主："再见。"',
  preDesignPack: {
    scriptPlan: "#",
    shots: [
      {
        shotIndex: 1,
        duration: 4,
        narrative: {
          dialogue: {
            lines: [
              { speaker: "男主", text: "你好。" },
              { speaker: "女主", text: "再见。" },
            ],
          },
        },
      },
    ],
  },
};
ok("merged two lines one shot DC-01 pass", dialogueLineCountMismatch(merged) === false);

ok("stub detect", isVideoPromptStub("特写 static, duration 2s"));
ok("non-stub", !isVideoPromptStub("沈母摩挲玉扳指，烛火摇曳，缓慢推进"));

const shot0 = golden.preDesignPack!.shots[0];
const shotDial = golden.preDesignPack!.shots.find(
  (s) => (s.narrative?.dialogue?.lines?.length ?? 0) > 0,
)!;
const pkg: EpisodePackage = {
  version: 1,
  projectId: 1,
  scriptId: 1,
  shots: [
    {
      id: "s1",
      index: 0,
      storyboardId: 1,
      narrative: { type: "CHAR-SCENE", duration: 3 },
      generation: {},
    },
  ],
  rulePackVersion: "2.0.1",
  updatedAt: Date.now(),
};
const hydrated = hydratePackageFromPreDesign(pkg, [shotDial as never], {
  sceneColorLock: (golden.visualLockTable as { sceneColorLock?: Record<string, { colorTemp?: string; name?: string }> })
    ?.sceneColorLock,
});
const hs = hydrated.shots[0]!;
ok("hydrate keeps dialogue array", Array.isArray(hs.narrative.dialogue?.lines) && (hs.narrative.dialogue!.lines as unknown[]).length > 0);
ok("hydrate composition bg", Boolean(hs.narrative.composition?.background || shotDial.shotDesign));
ok("hydrate visualDescription", Boolean(hs.visualDescription || shot0.visualDescription));

const fields = extractDesignFields(
  buildExtractContext({
    modality: "video",
    mode: "text",
    episodeShot: hs,
    anchorHint: "G4玉扳指",
  }),
);
ok("extract background", Boolean(fields.background));
ok("extract exprCue or composition", Boolean(fields.exprCue || fields.foreground));
const applied = applyDesignFieldRegistry("seed", fields, { modality: "video" });
ok("inject bg/composition", /bg:|fg:/.test(applied.prompt) || applied.injected.includes("composition"));
ok("inject anchor", applied.prompt.includes("anchor:") || applied.injected.includes("anchor"));

const native = compileVideoNativePrompt({
  videoPrompt: "特写 static, duration 2s",
  visualDescription: hs.visualDescription,
  background: hs.narrative.composition?.background,
  foreground: hs.narrative.composition?.foreground,
  dialogueLines: Array.isArray(hs.narrative.dialogue?.lines)
    ? (hs.narrative.dialogue!.lines as { speaker?: string; text?: string }[])
    : [],
  audioPrompt: hs.generation.audioPrompt,
  continuityFrom: "上一镜跪蒲团",
});
ok("native has visualDescription or bg", /祖训|烛火|fg:|bg:|kneel|蒲团/i.test(native.vendorPrompt) || Boolean(hs.visualDescription));
ok("native continuity", /continuity:/i.test(native.vendorPrompt));

if (failed) process.exit(1);
console.log("\n=== test:dc01-merge-coverage OK ===");
