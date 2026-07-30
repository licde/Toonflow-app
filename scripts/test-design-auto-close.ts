/**
 * yarn test:design-auto-close
 *
 * NAR-15/DC auto-close; INTENT from peaks; CREF imaged bind; SB stub defer / AS needs still.
 */
import { runDesignExitGate } from "@/ruleEngine/design/designExitGate";
import { runDesignAutoClose, applyDesignAutoCloseToBundle } from "@/ruleEngine/design/designAutoClose";
import { buildChatRepairDeeplinks } from "@/ruleEngine/design/chatRepairDeeplink";
import { runExportGate, buildExportPreviewStatusLine } from "@/ruleEngine/exportGate";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log("✓ " + label);
  else {
    console.error("✗ " + label + (detail ? " -- " + detail : ""));
    failed++;
  }
}

const genre = { packId: "war_god", adaptationDepth: "viral" as const };
const RA = "听者微徇";
const TEXT = "听好了";
const SPEAKER = "甲";
const PIC = "巴掌";
const HOOK = "钩子";
const SHOT = "特写";
const CUT = "切";
const AUD = "拍";
const EMO = "爽";
const AV = "冲突";
const FACE = "沈甲正脸特写凝视镜头。";
const NAME = "沈甲";
const NEAR = "近景。甲开口。";
const SCRIPT = SPEAKER + "：" + TEXT + "。";
const SCRIPT2 = NAME + "：" + TEXT + "。";

const w3MissingRa: Record<string, unknown> = {
  script: SCRIPT,
  planData: {
    genreTemplate: genre,
    dialoguePlan: { lines: [{ lineId: "L-1", speaker: SPEAKER, text: TEXT, functions: ["emotion_hit"] }] },
    narrativeSelfcheck: { passed: true },
    shotDesignIntent: [{ intentId: "i1", purpose: HOOK, emotionGoal: EMO, picture: PIC, shotSizeIntent: SHOT, cutIntent: CUT, audioIntent: AUD, durationSec: 1.2, peakId: "p1", hookId: "h1" }],
    sceneAvTags: [{ sceneRef: 1, tags: ["war_god"] }],
    sceneMeta: [{ sceneRef: 1, avCausality: { visualPeak: "仰拍", audioBeat: "bass" }, avTags: ["war_god"] }],
    implementationPlan: [{ sceneRef: 1, fxIntent: { level: "F0" } }],
    retentionPlan: { opening5sHook: "打脸" },
    hookPlan: { opening: { hookId: "h1", slot: "opening", hookType: "crisis", visualBeat: PIC, audioBeat: AUD, targetEmotion: EMO, suggestedDurationSec: 2 } },
    peakLedger: [{ peakId: "p1", avForm: AV, emotionType: EMO, avPayload: { visual: PIC, audio: AUD } }],
  },
};
ok("pre: W3 blocks NAR-15", runDesignExitGate("W3", w3MissingRa).failedIds.includes("NAR-15"));
const closed = runDesignAutoClose(w3MissingRa, { stageId: "W3", maxRounds: 1 });
ok("auto-close applied", closed.applied);
ok("NAR-15 cleared", !closed.remainingFailedIds.includes("NAR-15") && closed.clearedIds.includes("NAR-15"));
const line0 = (closed.plan.planData as any).dialoguePlan.lines[0];
ok("placeholder RA tagged", Boolean(line0?.reactionAction) && line0?.raSource === "heal_placeholder", JSON.stringify(line0));

const lockedPlan: Record<string, unknown> = {
  script: SCRIPT,
  planData: {
    genreTemplate: genre,
    viralPrefs: { literaryLocked: true },
    dialoguePlan: { lines: [{ lineId: "L-lock", speaker: SPEAKER, text: TEXT, functions: ["emotion_hit"] }] },
    peakLedger: [{ peakId: "p1", avForm: AV, emotionType: EMO, avPayload: { visual: PIC, audio: AUD } }],
    hookPlan: { opening: { hookId: "h-open", slot: "opening", hookType: "crisis", visualBeat: PIC, audioBeat: AUD, targetEmotion: EMO, suggestedDurationSec: 2 } },
  },
};
ok("locked pre: NAR-15", runDesignExitGate("W3", lockedPlan).failedIds.includes("NAR-15"));
const lockedClosed = runDesignAutoClose(lockedPlan, { stageId: "W3", maxRounds: 1 });
ok("locked auto-close clears NAR-15", !lockedClosed.remainingFailedIds.includes("NAR-15"));
ok("locked text unchanged", (lockedClosed.plan.planData as any).dialoguePlan.lines[0]?.text === TEXT);
ok("locked can still ensure intents from peaks", Boolean((lockedClosed.plan.planData as any).shotDesignIntent?.length) || !lockedClosed.remainingFailedIds.includes("DEX-SHOT-INTENT"));

const intentEmpty: Record<string, unknown> = {
  script: SCRIPT,
  planData: {
    genreTemplate: genre,
    dialoguePlan: { lines: [{ lineId: "L-1", speaker: SPEAKER, text: TEXT, functions: ["emotion_hit"], reactionAction: RA }] },
    shotDesignIntent: [],
    peakLedger: [{ peakId: "p1", avForm: AV, emotionType: EMO, avPayload: { visual: PIC, audio: AUD } }],
    hookPlan: { opening: { hookId: "h-open", slot: "opening", hookType: "crisis", visualBeat: PIC, audioBeat: AUD, targetEmotion: EMO, suggestedDurationSec: 2 } },
    preDesignPack: { shots: [{ shotIndex: 1, visualDescription: NEAR, duration: 2, narrative: { dialogue: { lines: [{ lineId: "L-1", speaker: SPEAKER, text: TEXT }] } } }] },
  },
};
ok("pre: empty intents DEX-SHOT-INTENT", runDesignExitGate("SB", intentEmpty).failedIds.includes("DEX-SHOT-INTENT"));
const intentClosed = runDesignAutoClose(intentEmpty, { stageId: "SB", maxRounds: 1 });
ok("INTENT cleared from peaks", !intentClosed.remainingFailedIds.includes("DEX-SHOT-INTENT"), intentClosed.remainingFailedIds.join(","));
ok("opening hook hung on intent", ((intentClosed.plan.planData as any).shotDesignIntent ?? []).some((i: any) => i.hookId === "h-open"));

const intentPatch: Record<string, unknown> = {
  script: SCRIPT,
  planData: {
    genreTemplate: genre,
    dialoguePlan: { lines: [{ lineId: "L-1", speaker: SPEAKER, text: TEXT, functions: ["emotion_hit"], reactionAction: RA }] },
    shotDesignIntent: [{ intentId: "i1", purpose: HOOK, emotionGoal: EMO, picture: PIC, shotSizeIntent: SHOT, cutIntent: CUT, audioIntent: AUD, peakId: "p1" }],
    peakLedger: [{ peakId: "p1", avForm: AV, emotionType: EMO, avPayload: { visual: PIC, audio: AUD } }],
    preDesignPack: { shots: [{ shotIndex: 1, visualDescription: NEAR, duration: 2, narrative: { dialogue: { lines: [{ lineId: "L-1", speaker: SPEAKER, text: TEXT }] } } }] },
  },
};
ok("pre: incomplete intent fails", runDesignExitGate("W3", intentPatch).failedIds.includes("DEX-SHOT-INTENT"));
const patched = runDesignAutoClose(intentPatch, { stageId: "W3", maxRounds: 1 });
ok("incomplete INTENT patched", !patched.remainingFailedIds.includes("DEX-SHOT-INTENT"));
ok("durationSec filled", Number((patched.plan.planData as any).shotDesignIntent[0]?.durationSec) > 0);

const crefOk: Record<string, unknown> = {
  script: SCRIPT2,
  characterDesign: { assets: [{ code: "CHAR-SHEN", name: NAME, filePath: "/stills/jia.png" }] },
  planData: {
    genreTemplate: genre,
    characterDesign: { assets: [{ code: "CHAR-SHEN", name: NAME, filePath: "/stills/jia.png" }] },
    dialoguePlan: { lines: [{ lineId: "L-1", speaker: NAME, text: TEXT, functions: ["emotion_hit"], reactionAction: RA }] },
    shotDesignIntent: [{ intentId: "i1", purpose: HOOK, emotionGoal: EMO, picture: PIC, shotSizeIntent: SHOT, cutIntent: CUT, audioIntent: AUD, durationSec: 1.2, peakId: "p1", hookId: "h1" }],
    peakLedger: [{ peakId: "p1", avForm: AV, emotionType: EMO, avPayload: { visual: PIC, audio: AUD } }],
    preDesignPack: { shots: [{ shotIndex: 1, visualDescription: FACE, duration: 2, narrative: { dialogue: { lines: [{ lineId: "L-1", speaker: NAME, text: TEXT }] } } }] },
  },
};
ok("pre: face without assets CREF", runDesignExitGate("SB", {
  ...crefOk,
  characterDesign: { assets: [] },
  planData: { ...(crefOk.planData as object), characterDesign: { assets: [] } },
} as Record<string, unknown>).failedIds.includes("DEX-ASSET-CREF"));
const crefClosed = runDesignAutoClose(JSON.parse(JSON.stringify(crefOk)), { stageId: "SB", maxRounds: 1 });
ok("CREF ok with imaged name (gate or bind)", !crefClosed.remainingFailedIds.includes("DEX-ASSET-CREF"), crefClosed.remainingFailedIds.join(","));
ok("assetCrefPlan written", Array.isArray((crefClosed.plan.planData as any).assetCrefPlan) && (crefClosed.plan.planData as any).assetCrefPlan.length > 0);

const crefNoImg: Record<string, unknown> = {
  script: SCRIPT2,
  characterDesign: { assets: [{ code: "CHAR-SHEN", name: NAME }] },
  planData: {
    genreTemplate: genre,
    characterDesign: { assets: [{ code: "CHAR-SHEN", name: NAME }] },
    dialoguePlan: { lines: [{ lineId: "L-1", speaker: NAME, text: TEXT, functions: ["emotion_hit"], reactionAction: RA }] },
    shotDesignIntent: [{ intentId: "i1", purpose: HOOK, emotionGoal: EMO, picture: PIC, shotSizeIntent: SHOT, cutIntent: CUT, audioIntent: AUD, durationSec: 1.2, peakId: "p1", hookId: "h1" }],
    peakLedger: [{ peakId: "p1", avForm: AV, emotionType: EMO, avPayload: { visual: PIC, audio: AUD } }],
    preDesignPack: { scriptPlan: SCRIPT2, shots: [{ shotIndex: 1, visualDescription: FACE, duration: 2, charCodes: ["CHAR-SHEN"], narrative: { dialogue: { lines: [{ lineId: "L-1", speaker: NAME, text: TEXT }] } } }] },
  },
};
const noImgClosed = runDesignAutoClose(JSON.parse(JSON.stringify(crefNoImg)), { stageId: "SB", maxRounds: 1 });
ok("CREF SB passes with stub/no-image bind", !noImgClosed.remainingFailedIds.includes("DEX-ASSET-CREF"), noImgClosed.remainingFailedIds.join(","));
ok(
  "CREF AS still BLOCK without image",
  runDesignExitGate("AS", noImgClosed.plan).failedIds.includes("DEX-ASSET-CREF"),
  runDesignExitGate("AS", noImgClosed.plan).failedIds.join(","),
);

const crefSeedEmpty = runDesignAutoClose(
  {
    script: SCRIPT2,
    characterDesign: { assets: [] },
    planData: {
      genreTemplate: genre,
      characterDesign: { assets: [] },
      dialoguePlan: { lines: [{ lineId: "L-1", speaker: NAME, text: TEXT, functions: ["emotion_hit"], reactionAction: RA }] },
      shotDesignIntent: [{ intentId: "i1", purpose: HOOK, emotionGoal: EMO, picture: PIC, shotSizeIntent: SHOT, cutIntent: CUT, audioIntent: AUD, durationSec: 1.2, peakId: "p1", hookId: "h1" }],
      peakLedger: [{ peakId: "p1", avForm: AV, emotionType: EMO, avPayload: { visual: PIC, audio: AUD } }],
      preDesignPack: {
        scriptPlan: SCRIPT2,
        shots: [{ shotIndex: 1, visualDescription: FACE, duration: 2, narrative: { dialogue: { lines: [{ lineId: "L-1", speaker: NAME, text: TEXT }] } } }],
      },
    },
  } as Record<string, unknown>,
  { stageId: "SB", maxRounds: 1 },
);
ok("CREF empty-CD seeds stub and clears SB", !crefSeedEmpty.remainingFailedIds.includes("DEX-ASSET-CREF"), crefSeedEmpty.remainingFailedIds.join(","));
{
  const assets =
    ((crefSeedEmpty.plan.planData as any).characterDesign?.assets as any[]) ??
    ((crefSeedEmpty.plan.planData as any).characterAssets as any[]) ??
    [];
  ok(
    "stub asset seeded no fake URL",
    assets.some((a) => (a.L0?.stub || a.crefDeferred) && !a.filePath && !a.stillUrl),
    JSON.stringify(assets),
  );
  ok(
    "assetCrefPlan deferredStill",
    ((crefSeedEmpty.plan.planData as any).assetCrefPlan ?? []).some((e: any) => e.deferredStill === true && (e.codes?.length ?? 0) > 0),
    JSON.stringify((crefSeedEmpty.plan.planData as any).assetCrefPlan),
  );
}
ok("seeded stub still BLOCK on AS", runDesignExitGate("AS", crefSeedEmpty.plan).failedIds.includes("DEX-ASSET-CREF"));

const links = buildChatRepairDeeplinks(["DEX-SHOT-INTENT", "DEX-ASSET-CREF"]);
ok("INTENT deeplink W3", links.some((l) => l.blockId === "DEX-SHOT-INTENT" && l.reverseTarget === "W3" && l.trigger === "shot_intent_decay"), JSON.stringify(links));
ok("CREF deeplink AS", links.some((l) => l.blockId === "DEX-ASSET-CREF" && l.reverseTarget === "AS"), JSON.stringify(links));

const bundle = {
  bundleType: "script",
  script: SCRIPT2,
  meta: { projectId: 1 },
  characterDesign: (noImgClosed.plan as any).characterDesign ?? { assets: [{ code: "CHAR-SHEN", name: NAME }] },
  planData: noImgClosed.plan.planData,
  preDesignPack: {
    scriptPlan: SCRIPT2,
    ...((noImgClosed.plan.planData as any).preDesignPack ?? {}),
  },
} as ScriptBundle;
const eg = runExportGate(bundle, { allowShapeSalvage: true });
ok("previewStatusLine no fake auto-fix", Boolean(eg.previewStatusLine) && !eg.previewStatusLine.includes("已自动修复"), eg.previewStatusLine);
ok("export does not BLOCK CREF after SB stub", !eg.blocks.some((b) => b.id === "DEX-ASSET-CREF"), eg.blocks.map((b) => b.id).join(","));

const line = buildExportPreviewStatusLine({
  exportAllowed: false,
  designExitIncomplete: true,
  blocks: [{ id: "DEX-ASSET-CREF" }],
  autoClosedClearedIds: ["NAR-15", "DEX-SHOT-INTENT"],
  shapeSalvageLog: [{ ruleId: "x" }, { ruleId: "y" }],
});
ok("status line auto-closed without salvage masquerade", line.includes("已自动闭合") && !line.includes("已自动修复") && line.includes("形态适配≠契约已修"), line);

const rawBundle = {
  script: SCRIPT,
  planData: {
    genreTemplate: genre,
    dialoguePlan: { lines: [{ lineId: "L-1", speaker: SPEAKER, text: TEXT, functions: ["emotion_hit"] }] },
    peakLedger: [{ peakId: "p1", avForm: AV, emotionType: EMO, avPayload: { visual: PIC, audio: AUD } }],
    shotDesignIntent: [],
    preDesignPack: { shots: [{ shotIndex: 1, visualDescription: "近景", duration: 2, narrative: { dialogue: { lines: [{ speaker: SPEAKER, text: TEXT }] } } }] },
  },
  preDesignPack: { shots: [{ shotIndex: 1, visualDescription: "近景", duration: 2, narrative: { dialogue: { lines: [{ speaker: SPEAKER, text: TEXT }] } } }] },
} as ScriptBundle;
const applied = applyDesignAutoCloseToBundle(rawBundle, { stageId: "SB", maxRounds: 1 });
ok("bundle autoClosed applied", applied.autoClosed.applied);
ok("bundle plan has RA after writeback", Boolean((applied.bundle.planData as any).dialoguePlan?.lines?.[0]?.reactionAction));
ok("bundle intents written from peaks", Array.isArray((applied.bundle.planData as any).shotDesignIntent) && (applied.bundle.planData as any).shotDesignIntent.length > 0);

if (failed) { console.error("\\n" + failed + " failed"); process.exit(1); }
console.log("\\nall passed");
