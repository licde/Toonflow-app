/**
 * Industry AV Wave-3 — J/L-cut + axis180 softHints → design avBeats → spine realize.
 * Run: npx tsx scripts/test-g-industry-av-wave3.ts
 */
import assert from "node:assert/strict";
import {
  ensureAdjacentJlCutAvBeats,
  healEyelinePair,
  applyGrammarDefaultsToShot,
} from "../src/ruleEngine/design/industryAvSilentRepair";
import { softGrammarHints } from "../src/ruleEngine/compilers/cinematicShotGrammar";
import { compileVideoPromptSpine } from "../src/ruleEngine/compilers/compileVideoPromptSpine";
import { hydrateShotCompileContextSync } from "../src/ruleEngine/compilers/hydrateShotCompileContext";
import { runEpisodeAvEnhanceOrchestrator } from "../src/ruleEngine/quality/episodeAvEnhanceOrchestrator";

function ok(name: string, cond: boolean) {
  assert.equal(cond, true, name);
  console.log("ok:", name);
}

ok("jCut softHint", Boolean(softGrammarHints(["jCut"])[0]));
ok("lCut softHint", Boolean(softGrammarHints(["lCut"])[0]));
ok("axis180 softHint", Boolean(softGrammarHints(["axis180"])[0]));

const dialA = {
  clientId: "a",
  shotIndex: 1,
  sceneCode: "S1",
  shotSize: "近景",
  visualDescription: "沈清漪抬视线",
  narrative: {
    dialogue: { lines: [{ speaker: "沈", text: "休书在此", onCamera: true }] },
  },
  shotDesign: { lipSyncPolicy: "dialogue_native" },
};
const dialB = {
  clientId: "b",
  shotIndex: 2,
  sceneCode: "S1",
  shotSize: "近景",
  visualDescription: "沈清漪对视",
  narrative: {
    dialogue: { lines: [{ speaker: "沈", text: "我收下了", onCamera: true }] },
  },
  shotDesign: { lipSyncPolicy: "dialogue_native" },
};

const pair = [
  { ...dialA, narrative: { ...dialA.narrative, avBeats: [] as string[] } },
  { ...dialB, narrative: { ...dialB.narrative, avBeats: [] as string[] } },
];
const jl = ensureAdjacentJlCutAvBeats(pair);
ok("adjacent jlcut stamps", jl.changed >= 2);
ok("lcut on prev", jl.changelog.some((e) => e.reason === "silent_l_cut_adjacent"));
ok("jcut on next", jl.changelog.some((e) => e.reason === "silent_j_cut_adjacent"));
const jl2 = ensureAdjacentJlCutAvBeats(pair);
ok("jlcut idempotent", jl2.changed === 0);

{
  const shot: Record<string, unknown> = {
    sceneCode: "S1",
    narrative: { spatialRelation: "左侧近景" },
    visualDescription: "对视",
  };
  const r = healEyelinePair(
    { sceneCode: "S1", narrative: { spatialRelation: "左侧前景" } },
    shot,
  );
  ok("eyeline entry present", Boolean(r.entry));
  const beats = ((shot.narrative as { avBeats?: string[] }).avBeats ?? []) as string[];
  ok("axis180 on healed shot", beats.some((b) => /180|轴线/.test(b)));
}

const designShot = {
  shotSize: "近景",
  visualDescription: "沈清漪近景对白",
  narrative: {
    dialogue: { lines: [{ speaker: "沈", text: "我收下了", onCamera: true }] },
    avBeats: [softGrammarHints(["jCut"])[0]!, softGrammarHints(["lCut"])[0]!],
  },
  shotDesign: { lipSyncPolicy: "dialogue_native", cameraMotion: "静止" },
};

let text = "";
try {
  const ctx = hydrateShotCompileContextSync({
    designShot: designShot as never,
    shotMeta: designShot as never,
    seedPrompt: "",
  } as never);
  const spine = compileVideoPromptSpine({ ctx } as never);
  text = String(
    (spine as { prompt?: string; fiveSection?: string }).prompt ??
      (spine as { fiveSection?: string }).fiveSection ??
      spine ??
      "",
  );
} catch (e) {
  // Fallback: compile with minimal ctx-shaped object if hydrate signature differs
  try {
    const spine = compileVideoPromptSpine({
      designShot: designShot as never,
      shotMeta: designShot as never,
    } as never);
    text = String((spine as { prompt?: string }).prompt ?? spine ?? "");
  } catch (e2) {
    console.error(e);
    console.error(e2);
    throw e2;
  }
}
ok("spine non-empty", text.length > 40);
ok(
  "spine realizes jlcut",
  /声先入|声延|J.?cut|L.?cut|转场声画|avBeats:/i.test(text),
);


{
  const ots = {
    visualDescription: "过肩近景看沈清漪",
    shotSize: "",
    narrative: {},
  };
  const log = applyGrammarDefaultsToShot(ots);
  ok("ots grammar defaults size", Boolean(String(ots.shotSize || "").trim()));
  ok(
    "ots axis180 default",
    log.some((e) => e.reason === "ots_axis180_default") ||
      (((ots.narrative as { avBeats?: string[] }).avBeats ?? []) as string[]).some((b) => /180|轴线/.test(b)),
  );
}

{
  const ep = runEpisodeAvEnhanceOrchestrator({
    enable: true,
    shots: [
      {
        shotIndex: 1,
        sceneCode: "S1",
        dialoguePresent: true,
        designShot: {
          visualDescription: "对白A",
          narrative: { dialogue: { lines: [{ text: "a", onCamera: true }] } },
        },
        shotMeta: {},
      },
      {
        shotIndex: 2,
        sceneCode: "S1",
        dialoguePresent: true,
        designShot: {
          visualDescription: "对白B",
          narrative: { dialogue: { lines: [{ text: "b", onCamera: true }] } },
        },
        shotMeta: {},
      },
    ],
  });
  ok(
    "episode jlcut polish",
    ep.shots.some((x) => x.polishNotes.includes("jl_cut:l_cut")) &&
      ep.shots.some((x) => x.polishNotes.includes("jl_cut:j_cut")),
  );
}

console.log("PASS test-g-industry-av-wave3");
