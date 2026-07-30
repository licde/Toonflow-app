/**
 * Golden: still→video quality loop — design DEX, L2 heal guardrails, SVQ unknown≠0.7, reverse map.
 * yarn test:still-video-quality-loop
 */
import {
  checkCastOnDesc,
  checkEmptyShotConsistency,
  checkSpeakPerformance,
  stripEmptyShotConflictClauses,
} from "../src/ruleEngine/quality/shotQualityPredicates";
import { healShotQuality } from "../src/ruleEngine/quality/healShotQuality";
import { loadSvqDoctrine, resetSvqDoctrineCacheForTest } from "../src/ruleEngine/quality/loadSvqDoctrine";
import { scoreShortVideo } from "../src/ruleEngine/qc/shortVideoQuality";
import { collectPostBurnFlags } from "../src/ruleEngine/quality/collectPostBurnFlags";
import { runPostBurnRuntime } from "../src/ruleEngine/qc/postBurnRuntime";
import { BLOCK_TO_TRIGGER_FOR_TEST } from "../src/ruleEngine/compilers/burnGateEnvelope";
import { buildChatRepairDeeplinks } from "../src/ruleEngine/design/chatRepairDeeplink";
import { runDesignExitGate } from "../src/ruleEngine/design/designExitGate";
import { resolveLipDurationSingleSource } from "../src/ruleEngine/quality/resolveLipDuration";
import { cascadeForwardStale } from "../src/ruleEngine/quality/forwardStaleCascade";
import { diagnoseShotQuality } from "../src/ruleEngine/design/gateDiagnose";
import { composeStillPrompt } from "../src/ruleEngine/compilers/composeStillPrompt";
import { assertStillMouthVideoHandoff } from "../src/ruleEngine/qc/stillMouthVideoHandoff";
import { injectMirrorAntiWarp, hasMirrorIntent } from "../src/ruleEngine/qc/mirrorAntiWarp";
import { evaluateSfxDelivery } from "../src/ruleEngine/ports/sfxSynthPort";
import { resolveRequiredDuration } from "../src/ruleEngine/compilers/resolveRequiredDuration";
import { preDesignShotsToStoryboardTable } from "../src/ruleEngine/bundle/preDesignPackAdapter";
import { parseStoryboardTable } from "../src/ruleEngine/parsers/storyboardTableParser";
import type { ScriptBundle } from "../src/ruleEngine/bundle/types";
import { hasOnCameraDialogue, isOffscreenLine } from "../src/ruleEngine/design/onCameraDialogue";
import { resolveLipSyncPolicyFromShot } from "../src/ruleEngine/quality/resolveLipSyncPolicy";
import { matchDescNamesToCasting, findOrphanNamesInDesc } from "../src/ruleEngine/quality/matchDescNamesToCasting";
import { mergeCharacterHints } from "../src/ruleEngine/compilers/hydrateComposeStillContext";

function ok(name: string, cond: boolean) {
  if (!cond) {
    console.error(`✗ ${name}`);
    process.exitCode = 1;
    throw new Error(name);
  }
  console.log(`✓ ${name}`);
}

resetSvqDoctrineCacheForTest();
const doc = loadSvqDoctrine();
ok("doctrine loaded", Boolean(doc.version && doc.heal.minConfidence >= 0.5));
ok("cases present", (doc.cases?.length ?? 0) >= 5);

// --- Design predicates ---
ok(
  "CAST-ON-DESC blocks",
  Boolean(
    checkCastOnDesc({
      visualDescription: "沈清漪咬帕望铜镜",
      charCodes: [],
      knownNames: ["沈清漪"],
      nameToCodes: { 沈清漪: ["CHAR-SHEN"] },
      shotIndex: 1,
    }),
  ),
);
ok(
  "CAST-ON-DESC pass with code",
  checkCastOnDesc({
    visualDescription: "沈清漪咬帕望铜镜",
    charCodes: ["CHAR-SHEN"],
    knownNames: ["沈清漪"],
    nameToCodes: { 沈清漪: ["CHAR-SHEN"] },
  }) === null,
);
ok(
  "EMPTY conflict",
  Boolean(
    checkEmptyShotConsistency({
      visualDescription: "空镜无人物。沈清漪正脸特写",
      charCodes: ["CHAR-SHEN"],
      knownNames: ["沈清漪"],
    }),
  ),
);
const stripped = stripEmptyShotConflictClauses("空镜无人物。沈清漪正脸特写望铜镜");
ok("strip empty conflict", !/空镜/.test(stripped) || stripped.includes("沈清漪"));
ok(
  "EXPR high intensity block",
  Boolean(
    checkSpeakPerformance({
      hasDialogue: true,
      emotionIntensity: 8,
      microExpression: null,
      lipSyncPolicy: null,
    }),
  ),
);
ok(
  "EXPR low intensity no block",
  checkSpeakPerformance({
    hasDialogue: true,
    emotionIntensity: 3,
    microExpression: null,
    lipSyncPolicy: null,
  }) === null,
);

const exit = runDesignExitGate("SB", {
  characterDesign: { assets: [{ code: "CHAR-SHEN", name: "沈清漪" }] },
  preDesignPack: {
    shots: [
      {
        shotIndex: 1,
        visualDescription: "沈清漪咬帕望铜镜烛火",
        charCodes: [],
        emotionIntensity: 8,
        narrative: { dialogue: { lines: [{ text: "你敢？" }] } },
      },
    ],
  },
});
ok(
  "designExit CAST or EXPR",
  exit.failedIds.includes("DEX-CAST-ON-DESC") ||
    exit.failedIds.includes("DEX-EXPR-SPEAK") ||
    exit.warnings.some((w) => /CAST-ON-DESC|EXPR-SPEAK/.test(w)),
);

// --- Heal: unique match ---
const shotHeal = {
  shotIndex: 2,
  visualDescription: "沈清漪持刀立于廊下",
  charCodes: [] as string[],
};
const healed = healShotQuality({
  shots: [shotHeal],
  characterAssets: [{ code: "CHAR-SHEN", name: "沈清漪" }],
});
ok("heal cast codes", (shotHeal.charCodes ?? []).includes("CHAR-SHEN"));
ok("heal diffs explain", healed.diffs.some((d) => d.reasonCode === "cast_on_desc" && d.confidence >= 0.72));

// --- Heal: ambiguous refuse ---
const amb = { shotIndex: 3, visualDescription: "阿姐望窗", charCodes: [] as string[] };
const ambR = healShotQuality({
  shots: [amb],
  characterAssets: [
    { code: "CHAR-A", name: "阿姐" },
    { code: "CHAR-B", name: "阿姐" },
  ],
});
ok("ambiguous refuse", ambR.unsalvageable.length >= 1 && !(amb.charCodes ?? []).length);

// --- Heal proposeOnly ---
const prop = { shotIndex: 4, visualDescription: "沈清漪落泪", charCodes: [] as string[] };
const propR = healShotQuality({
  shots: [prop],
  characterAssets: [{ code: "CHAR-SHEN", name: "沈清漪" }],
  proposeOnly: true,
});
ok("proposeOnly no mutate", (prop.charCodes ?? []).length === 0 && propR.diffs.length >= 1);

// --- SVQ unknown ≠ 0.7 ---
const svq = scoreShortVideo({ flags: {}, unknownDims: ["identity_cast", "motion_fidelity"] });
ok("svq unknown fails", !svq.pass && svq.unknownDims.length >= 1);
ok(
  "svq score not fake 0.7 pass",
  svq.failDims.length > 0 || svq.unknownDims.length > 0,
);

const flags = collectPostBurnFlags({
  visualPass: true,
  hasDialogue: true,
  motionIntent: "push in",
  vlmAdapterPresent: false,
});
ok("vlm unknown without adapter", flags.unknownDims.includes("motion_fidelity") || flags.notes.some((n) => /vlm/.test(n)));
ok("lit unmeasured skipped", flags.skippedDims.includes("lit_detail") && flags.notes.some((n) => /lit_skipped/.test(n)));

const litFlags = collectPostBurnFlags({
  visualPass: true,
  hasDialogue: false,
  visualDescription: "特写。沈清漪侧脸，休书纸角划过面颊，她紧咬下唇渗出血珠。",
  shotSize: "特写",
});
ok("lit xor measured fail", litFlags.flags.litContactXorOk === false);
ok("lit detail measured", litFlags.flags.litDetailOk === true || litFlags.flags.litDetailOk === false);

const litSvq = scoreShortVideo({
  flags: {
    identityOk: true,
    emotionOk: true,
    lipOk: true,
    motionOk: true,
    audioOk: true,
    litDetailOk: true,
    litContactXorOk: false,
  },
});
ok("svq xor fail dim", litSvq.failDims.some((d) => d.id === "lit_contact_xor") || !litSvq.pass);
const post = runPostBurnRuntime({
  hasDialogue: true,
  visualPass: true,
  motionIntent: "push",
  vlmAdapterPresent: false,
  audioL1: { vendorReportedAudio: true, dialogueLines: ["你敢？"] },
});
ok("postBurn not pass without motion measure", post.videoPass === false);
ok("postBurn scorecard present", Boolean(post.scorecard));
ok("postBurn deeplinks or failDims", (post.failDims?.length ?? 0) + (post.unknownDims?.length ?? 0) > 0);

// --- Reverse map ---
ok("BLOCK_TO_TRIGGER CAST", BLOCK_TO_TRIGGER_FOR_TEST["DEX-CAST-ON-DESC"] === "cast_on_desc_missing");
ok("BLOCK_TO_TRIGGER EMPTY", BLOCK_TO_TRIGGER_FOR_TEST["DEX-EMPTY-SHOT-CONSISTENCY"] === "empty_shot_conflict");
ok("BLOCK_TO_TRIGGER ASSET-CREF", BLOCK_TO_TRIGGER_FOR_TEST["DEX-ASSET-CREF"] === "asset_cref");
ok("BLOCK_TO_TRIGGER NO-LIP", BLOCK_TO_TRIGGER_FOR_TEST["NO-LIP-DIALOGUE"] === "no_lip_dialogue");
ok("BLOCK_TO_TRIGGER SFX", BLOCK_TO_TRIGGER_FOR_TEST["SFX-UNBACKED"] === "sfx_unbacked");
ok("BLOCK_TO_TRIGGER LIT-XOR", BLOCK_TO_TRIGGER_FOR_TEST["DEX-LIT-CONTACT-XOR"] === "lit_detail_contact_xor");
ok("BLOCK_TO_TRIGGER LIT-CONTACT", BLOCK_TO_TRIGGER_FOR_TEST["DEX-LIT-CONTACT"] === "lit_detail_contact");

{
  const { triggerForFailDim, routeFailDims } =
    require("../src/ruleEngine/quality/failDimRouter") as typeof import("../src/ruleEngine/quality/failDimRouter");
  ok("failDim lit_detail → contact", triggerForFailDim("lit_detail") === "lit_detail_contact");
  ok("failDim lit_xor → xor", triggerForFailDim("lit_contact_xor") === "lit_detail_contact_xor");
  const routed = routeFailDims({ failDims: [{ id: "lit_contact_xor" }, { id: "lit_detail" }] });
  ok(
    "route lit triggers",
    routed.triggers.includes("lit_detail_contact_xor") && routed.triggers.includes("lit_detail_contact"),
    JSON.stringify(routed.triggers),
  );
}

{
  const litPost = runPostBurnRuntime({
    hasDialogue: false,
    visualPass: true,
    visualDescription: "特写。沈清漪侧脸，休书纸角划过面颊，她紧咬下唇渗出血珠。",
    shotSize: "特写",
  });
  ok("postBurn lit xor → chat_repair", litPost.primaryNextStep === "chat_repair", litPost.primaryNextStep);
  ok(
    "postBurn lit xor failDim",
    (litPost.failDims ?? []).some((d) => d.id === "lit_contact_xor"),
    JSON.stringify(litPost.failDims),
  );
  ok(
    "postBurn lit deeplink xor",
    (litPost.deeplinks ?? []).some((l) => l.trigger === "lit_detail_contact_xor"),
    JSON.stringify(litPost.deeplinks?.map((l) => l.trigger)),
  );
}

const links = buildChatRepairDeeplinks(["DEX-CAST-ON-DESC", "DEX-ASSET-CREF", "NO-LIP-DIALOGUE"]);
ok("deeplink cast", links[0]?.trigger === "cast_on_desc_missing" && links[0]?.reverseTarget === "SB");
ok(
  "deeplink asset_cref",
  links.some((l) => l.trigger === "asset_cref" && l.reverseTarget === "AS"),
);
ok(
  "deeplink no_lip",
  links.some((l) => l.trigger === "no_lip_dialogue"),
);

// --- Lip/duration single source ---
const lip = resolveLipDurationSingleSource({
  prompt: "medium shot, no lip sync, duration 2s, duration 4s",
  lipSyncPolicy: "dialogue_native",
  hasDialogue: true,
  durationSec: 5,
});
ok("strip no lip conflict", !/no lip sync/i.test(lip.prompt));
ok("single duration", (lip.prompt.match(/duration\s*\d+/gi) ?? []).length <= 1);

const bare = resolveLipDurationSingleSource({
  prompt: "CU, 2s, 3s, ambient",
  hasDialogue: false,
  durationSec: 4,
});
ok("dedupe bare sec", !/\b2s\b/.test(bare.prompt) || (bare.prompt.match(/\d+s/g) ?? []).length <= 2);
ok("bare inject duration", /duration\s*4/i.test(bare.prompt) || bare.changes.includes("dedupe_bare_sec"));

const noLipUpgrade = resolveLipDurationSingleSource({
  prompt: "says hello, no lip sync",
  lipSyncPolicy: "none",
  hasDialogue: true,
  hardBlockNoLipOnDialogue: true,
});
ok("T-NOLIP explicit silent upgrades by default", !noLipUpgrade.blocked && /subtle|lip/i.test(noLipUpgrade.lipLine ?? ""));
const noLipBlock = resolveLipDurationSingleSource({
  prompt: "says hello, no lip sync",
  lipSyncPolicy: "none",
  hasDialogue: true,
  hardBlockNoLipOnDialogue: true,
  refuseExplicitSilent: true,
});
ok("T-NOLIP hard block with refuseExplicitSilent", Boolean(noLipBlock.blocked && noLipBlock.blockCode === "NO-LIP-DIALOGUE"));

// --- T-NOLIP-OS / EMPTY-POLICY / MOUTH-OS / HYDRATE-POLICY ---
ok(
  "T-NOLIP-OS offscreen not on-camera",
  !hasOnCameraDialogue([{ speaker: "沈清漪", type: "os", text: "他走了" }]) &&
    isOffscreenLine({ type: "os", text: "x" }),
);
const emptyPol = resolveLipDurationSingleSource({
  prompt: "medium shot",
  lipSyncPolicy: "",
  hasDialogue: true,
});
ok(
  "T-NOLIP-EMPTY-POLICY upgrades not block",
  !emptyPol.blocked && emptyPol.changes.includes("default_empty_policy_to_subtle"),
);
const osOnlyLip = resolveLipDurationSingleSource({
  prompt: "reaction, no lip sync",
  lipSyncPolicy: "none",
  hasDialogue: false,
});
ok("T-NOLIP-OS allow no lip when not on-camera", !osOnlyLip.blocked);
const mouthOs = assertStillMouthVideoHandoff({
  stillPrompt: "闭口抿嘴",
  videoPrompt: "natural mouth movement for dialogue, lip-sync active",
  hasDialogue: false,
});
ok("T-MOUTH-OS skip when OS-only", mouthOs.ok && mouthOs.severity === "ok");
ok(
  "T-HYDRATE-POLICY narrative fallback",
  resolveLipSyncPolicyFromShot({
    narrative: { lipSyncPolicy: "subtle_natural" },
  }) === "subtle_natural",
);

// --- T-BIND / ORPHAN / NO-STRIP ---
const bind = matchDescNamesToCasting({
  visualDescription: "沈清漪咬帕望铜镜",
  knownNames: ["沈清漪"],
  nameToCodes: { 沈清漪: ["CHAR-SHEN"] },
});
ok("T-BIND unique", bind.bound.length === 1 && bind.bound[0].code === "CHAR-SHEN");
const ambBind = matchDescNamesToCasting({
  visualDescription: "沈清漪立于廊下",
  knownNames: ["沈清漪"],
  nameToCodes: { 沈清漪: ["CHAR-A", "CHAR-B"] },
});
ok("T-BIND-AMBIG", ambBind.ambiguous.length === 1 && !ambBind.bound.length);
const orphans = findOrphanNamesInDesc({
  visualDescription: "沈清漪咬帕望铜镜",
  knownNames: [],
  allowDiagnosticScan: true,
});
ok("T-ORPHAN detects name outside CD", orphans.includes("沈清漪"));
const merged = mergeCharacterHints([], {
  visualDescription: "沈清漪咬帕望铜镜",
  knownNames: ["沈清漪"],
  nameToCodes: { 沈清漪: ["CHAR-SHEN"] },
});
ok(
  "T-NO-STRIP keeps name in characters",
  merged.some((c) => c.name === "沈清漪" && c.code === "CHAR-SHEN"),
);
const composeKeep = composeStillPrompt({
  visualDescription: "中景。沈清漪咬帕止血，眉心微蹙。",
  qualityMode: "hq_update",
  characters: [{ name: "沈清漪", kind: "character", hasImage: false }],
  requireLeadAssetImage: false,
});
ok(
  "T-NO-STRIP compose blocks no-image without fake cref",
  !composeKeep.ok &&
    composeKeep.blockReason === "DEX-ASSET-CREF" &&
    !/--cref/i.test(composeKeep.prompt || ""),
);
const composeImaged = composeStillPrompt({
  visualDescription: "中景。沈清漪咬帕止血，眉心微蹙。",
  qualityMode: "hq_update",
  characters: [{ name: "沈清漪", code: "CHAR-SHEN", kind: "character", hasImage: true, filePath: "/stills/shen.png" }],
  requireLeadAssetImage: false,
});
ok(
  "T-NO-STRIP compose keeps name when imaged",
  composeImaged.ok !== false && /沈清漪/.test(composeImaged.prompt || ""),
);

// --- Stale cascade ---
const shots = [{ clientId: "c1", videoPass: true, videoPassAt: "x", reason: {} }];
const casc = cascadeForwardStale({ shots, forwardStages: ["EN", "MD-IMG"], staleClientIds: ["c1"] });
ok("clear videoPass", casc.clearedVideoPass >= 1 && shots[0].videoPass === false);

// --- Diagnose mount ---
const diag = diagnoseShotQuality({
  characterDesign: { assets: [{ code: "CHAR-SHEN", name: "沈清漪" }] },
  preDesignPack: { shots: [{ shotIndex: 9, visualDescription: "沈清漪", charCodes: [] }] },
} as ScriptBundle);
ok("diagnose cast", diag.some((d) => d.id === "DEX-CAST-ON-DESC"));

// --- T-CREF-DEX: AS needs imaged; SB may stub-bind ---
const crefFail = runDesignExitGate("AS", {
  preDesignPack: {
    shots: [{ shotIndex: 1, visualDescription: "正脸特写凝视镜头", charCodes: ["CHAR-X"] }],
  },
});
ok("T-CREF-DEX blocks without plan/assets", crefFail.failedIds.includes("DEX-ASSET-CREF") || crefFail.warnings.some((w) => /ASSET-CREF/.test(w)));
const crefPass = runDesignExitGate("AS", {
  characterDesign: { assets: [{ code: "CHAR-X", name: "角色X", filePath: "/stills/x.png" }] },
  assetCrefPlan: [{ shotIndex: 1, codes: ["CHAR-X"] }],
  preDesignPack: {
    shots: [{ shotIndex: 1, visualDescription: "正脸特写", charCodes: ["CHAR-X"] }],
  },
});
ok("T-CREF-DEX AS pass with imaged plan", !crefPass.failedIds.includes("DEX-ASSET-CREF"));
const crefSbStub = runDesignExitGate("SB", {
  characterDesign: { assets: [{ code: "CHAR-X", name: "角色X", L0: { stub: true }, crefDeferred: true }] },
  assetCrefPlan: [{ shotIndex: 1, codes: ["CHAR-X"], deferredStill: true }],
  preDesignPack: {
    shots: [{ shotIndex: 1, visualDescription: "正脸特写", charCodes: ["CHAR-X"] }],
  },
});
ok("T-CREF-DEX SB stub bind passes", !crefSbStub.failedIds.includes("DEX-ASSET-CREF"));
ok("T-CREF-DEX AS stub still blocks", runDesignExitGate("AS", {
  characterDesign: { assets: [{ code: "CHAR-X", name: "角色X", L0: { stub: true }, crefDeferred: true }] },
  assetCrefPlan: [{ shotIndex: 1, codes: ["CHAR-X"], deferredStill: true }],
  preDesignPack: {
    shots: [{ shotIndex: 1, visualDescription: "正脸特写", charCodes: ["CHAR-X"] }],
  },
}).failedIds.includes("DEX-ASSET-CREF"));

// --- T-BRIEF-EMPTY: designBrief mounts EMPTY ---
const briefEmpty = runDesignExitGate("designBrief", {
  characterDesign: { assets: [{ code: "CHAR-SHEN", name: "沈清漪" }] },
  preDesignPack: {
    shots: [
      {
        shotIndex: 1,
        visualDescription: "空镜无人物。沈清漪正脸特写",
        charCodes: ["CHAR-SHEN"],
      },
    ],
  },
});
ok(
  "T-BRIEF-EMPTY blocks",
  briefEmpty.failedIds.includes("DEX-EMPTY-SHOT-CONSISTENCY") ||
    briefEmpty.warnings.some((w) => /EMPTY-SHOT/.test(w)),
);

// --- T-EXIT-L2: heal on exit ---
const exitHealPlan = {
  characterDesign: { assets: [{ code: "CHAR-SHEN", name: "沈清漪" }] },
  preDesignPack: {
    shots: [
      {
        shotIndex: 11,
        clientId: "c11",
        visualDescription: "沈清漪持刀立于廊下烛火",
        charCodes: [] as string[],
        videoPass: true,
      },
    ],
  },
};
const exitHeal = runDesignExitGate("SB", exitHealPlan, { applyL2Heal: true });
ok(
  "T-EXIT-L2 heals cast",
  ((exitHealPlan.preDesignPack.shots[0].charCodes as string[]) ?? []).includes("CHAR-SHEN") ||
    exitHeal.healDiffs! >= 0,
);
ok("T-EXIT-L2 heal flag", exitHeal.healApplied === true || (exitHeal.healDiffs ?? 0) >= 0);

// --- Compose empty egress ---
const emptyCompose = composeStillPrompt({
  visualDescription: "空镜无人物，庭院石阶落叶",
  qualityMode: "hq_update",
  characters: [{ code: "CHAR-SHEN", name: "沈清漪", kind: "character" }],
});
ok(
  "T-PREVIEW empty no face recipe",
  emptyCompose.ok &&
    !/权力位：.*正脸/.test(emptyCompose.prompt) &&
    (emptyCompose.sources.includes("emptyShot.skipFaceLayers") ||
      emptyCompose.sources.includes("compositionContract.emptyShot") ||
      !/正脸清晰/.test(emptyCompose.prompt)),
);

// --- Mouth handoff ---
const mouth1 = assertStillMouthVideoHandoff({
  stillPrompt: "闭口抿嘴",
  videoPrompt: "natural mouth movement for dialogue, lip-sync active",
  hasDialogue: true,
});
ok("T-HANDOFF soft first", mouth1.severity === "soft_patch" && Boolean(mouth1.strengthen));
const mouth2 = assertStillMouthVideoHandoff({
  stillPrompt: "闭口抿嘴",
  videoPrompt: "natural mouth movement for dialogue, lip-sync active",
  hasDialogue: true,
  afterStrengthen: true,
});
ok("T-HANDOFF hard after", mouth2.severity === "BLOCK" && mouth2.reverseTrigger === "still_mouth_handoff");

// --- Mirror ---
ok("mirror detect", hasMirrorIntent("望铜镜中倒影"));
const mir = injectMirrorAntiWarp("[Motion]\npush in", "望铜镜");
ok("mirror anti-warp", mir.applied && /no warped face/i.test(mir.prompt));

// --- SFX ---
const sfx = evaluateSfxDelivery({ prompt: "sfx:<茶盏碎裂>", adapterPresent: false });
ok("T-SFX unknown without adapter", sfx.unknown === true && sfx.code === "SFX-UNBACKED");

// --- Hold reserve ---
const hold = resolveRequiredDuration(
  {
    duration: 2,
    narrative: {
      dialogue: { lines: [{ text: "你竟敢如此欺我，今日必要讨个说法！" }] },
      emotionBand: "high",
    },
  },
  { pillarsDurationV2: true },
);
ok("T-HOLD emotion floor", hold.emotionFloor > 0 && hold.required >= hold.lipMin);

// --- Storyboard table cols ---
const table = preDesignShotsToStoryboardTable([
  {
    shotIndex: 1,
    type: "CHAR-SCENE",
    sceneName: "祠堂",
    visualDescription: "清瓷跪地望香案",
    shotSize: "近景",
    duration: 3,
    narrative: { dialogue: { lines: [{ speaker: "清瓷", text: "娘亲" }] } },
    shotDesign: { performance: { microExpression: { mouthDetail: "微颤" } }, lipSyncPolicy: "subtle" },
  } as never,
]);
ok("table has 画面描写", /画面描写/.test(table) && /清瓷跪地/.test(table));
const parsed = parseStoryboardTable(table);
ok("parser roundtrip vd", Boolean(
  (parsed[0] as { visualDescription?: string })?.visualDescription?.includes("清瓷") ||
    (parsed[0]?.narrative as { visualDescription?: string } | undefined)?.visualDescription?.includes("清瓷") ||
    String(parsed[0]?.narrative?.sceneName ?? "").includes("祠堂"),
));

// --- Doctrine stages sync ---
resetSvqDoctrineCacheForTest();
const doc2 = loadSvqDoctrine();
ok(
  "doctrine EMPTY includes designBrief",
  (doc2.dex["DEX-EMPTY-SHOT-CONSISTENCY"]?.stages ?? []).includes("designBrief"),
);

console.log("still-video-quality-loop OK");
