/**
 * Goldens: Production Pillars closed loop (identity / duration / expression / first-frame / scorecard).
 */
import assert from "node:assert/strict";
import { mergeCharacterHints } from "../src/ruleEngine/compilers/hydrateComposeStillContext";
import { assertStillIdentityCoverage } from "../src/ruleEngine/compilers/stillIdentityCoverage";
import { assertStillIdentityPreflight } from "../src/ruleEngine/compilers/stillIdentityPreflight";
import { composeStillPrompt } from "../src/ruleEngine/compilers/composeStillPrompt";
import { extractDescPredicates, stripWhoVerbGlue } from "../src/ruleEngine/compilers/extractDescPredicates";
import { buildRequiredCast, isTrueDualCast } from "../src/ruleEngine/compilers/castingSheet";
import { resolveRequiredDuration } from "../src/ruleEngine/compilers/resolveRequiredDuration";
import { resolveSpeechRateCps } from "../src/ruleEngine/compilers/durationNorms";
import { auditDurationNormExtras } from "../src/ruleEngine/compilers/durationNormExtras";
import { defaultPerformanceFromEmotion } from "../src/ruleEngine/emotion/defaultPerformance";
import { assertStillFirstFrameContract } from "../src/ruleEngine/qc/stillFirstFrameGate";
import { assertStillMouthVideoHandoff } from "../src/ruleEngine/qc/stillMouthVideoHandoff";
import { scoreShortVideo } from "../src/ruleEngine/qc/shortVideoQuality";
import { compileVideoNativePrompt } from "../src/ruleEngine/compilers/videoNativeCompiler";
import { buildCrossShotContinuityInject } from "../src/ruleEngine/qc/crossShotContinuity";
import { STILL_HQ_FIRST_FRAME_RECIPE_ZH_EN } from "../src/ruleEngine/compilers/stillQuality";
import {
  healStillRecipePolicy,
  applyContinuityPolicy,
  countCharCodesInPrompt,
} from "../src/ruleEngine/compilers/stillRecipePolicy";
import { runStillPromptPipeline } from "../src/ruleEngine/compilers/stillPromptPipeline";

function ok(name: string, cond: boolean) {
  if (!cond) throw new Error(`FAIL: ${name}`);
  console.log(`✓ ${name}`);
}

// --- Identity: no phantom from 咬帕 ---
ok("glue 咬", stripWhoVerbGlue("沈清漪咬") === "沈清漪");
const merged = mergeCharacterHints(
  [{ code: "CHAR-SHENQINGYI", name: "沈清漪", hasImage: true, kind: "character" }],
  { visualDescription: "银簪刺入，沈清漪咬帕，额角青筋", dialogueSpeakers: ["沈清漪"] },
);
ok(
  "no phantom 沈清漪咬",
  !merged.some((c) => String(c.name).includes("咬")) && merged.length === 1,
);

const biteCompose = composeStillPrompt(
  {
    visualDescription: "银簪尖端刺入锁骨下方皮肉。沈清漪咬帕，额角青筋隐现。",
    characters: [{ code: "CHAR-SHENQINGYI", name: "沈清漪", hasImage: true, kind: "character", tier: "lead" }],
    dialogueSpeakers: ["沈清漪"],
    shotSize: "ecu",
    requireLeadAssetImage: false,
    referenceUrlCount: 1,
    qualityMode: "hq_update",
    rawPrompt: "--cref CHAR-SHENQINGYI",
  },
  { mode: "full" },
);
ok("compose ok", biteCompose.ok === true);
ok("no 不同脸", !/不同脸/.test(biteCompose.prompt || ""));
ok("literary 咬帕 ok", /沈清漪咬帕/.test(biteCompose.prompt || ""));
ok("no phantom must-appear", !/必须出现：[^\n]*沈清漪咬(?!帕)/.test(biteCompose.prompt || ""));
ok("must-appear has 银簪 or 沈清漪", /必须出现：/.test(biteCompose.prompt || "") ? /沈清漪|银簪/.test(biteCompose.prompt || "") : true);
ok("no 嘴部自然微张", !/嘴部自然微张/.test(biteCompose.prompt || ""));
ok("no 权力位 on ECU", !/权力位/.test(biteCompose.prompt || ""));
ok("single identity lock", /锁定角色定妆/.test(biteCompose.prompt || "") || /定妆参考/.test(biteCompose.prompt || ""));

const dual = buildRequiredCast({
  characters: [
    { code: "CHAR-A", name: "沈清瓷", hasImage: true },
    { code: "CHAR-B", name: "沈母", hasImage: true },
  ],
  dialogueSpeakers: ["沈清瓷", "沈母"],
});
ok("true dual", isTrueDualCast(dual.chars));

const unmapped = buildRequiredCast({
  characters: [{ code: "CHAR-A", name: "沈清瓷", hasImage: true }],
  dialogueSpeakers: ["陌生人甲"],
  refusePhantomNames: true,
});
ok("unmapped speaker", unmapped.unmappedSpeakers.includes("陌生人甲"));

const covUnmapped = assertStillIdentityCoverage({
  characters: [{ code: "CHAR-A", name: "沈清瓷", hasImage: true }],
  dialogueSpeakers: ["陌生人甲"],
  enforce: true,
});
ok("DC-16 on unmapped", covUnmapped.ok === false && covUnmapped.code === "DC-16");

// --- Duration ---
const legacy = resolveSpeechRateCps({});
ok("legacy cps 4", legacy.cps === 4 && !legacy.fromNorms);
const v2 = resolveSpeechRateCps({ pillarsDurationV2: true });
ok("v2 cps 4.5", v2.cps === 4.5 && v2.fromNorms);

const shot = {
  duration: 2,
  narrative: {
    dialogue: { lines: [{ speaker: "沈清漪", text: "这银簪刺入皮肉时，我仍要咬住帕子不许哭出声来。" }] },
    emotionBand: "high",
  },
};
const reqLegacy = resolveRequiredDuration(shot, { pillarsDurationV2: false });
const reqV2 = resolveRequiredDuration(shot, { pillarsDurationV2: true });
ok("v2 uses norms path", reqV2.lipRequired === true && reqLegacy.lipRequired === true);
ok("higher cps => lower or equal lipMin", reqV2.lipMin <= reqLegacy.lipMin);

const extras = auditDurationNormExtras({
  shots: [
    { shotIndex: 1, duration: 5, visualDescription: "空镜远景写景无人氛围", narrative: { dialogue: { lines: [] } } },
  ],
});
ok("atmosphere warn", extras.some((e) => e.id === "DURATION-ATMOSPHERE-MAX" || e.id === "DURATION-OPENING-HOOK"));

// --- Expression ---
const perf = defaultPerformanceFromEmotion({ emotionIntensity: 6, hasDialogue: true });
ok("default performance", perf.applied && Boolean(perf.microExpression?.mouthDetail));

const handoff = assertStillMouthVideoHandoff({
  stillPrompt: "neutral_closed 抿嘴",
  videoPrompt: "natural mouth movement for dialogue",
  lipSyncPolicy: "dialogue_native",
  hasDialogue: true,
});
ok("mouth handoff soft_patch", handoff.ok === false && handoff.severity === "soft_patch");

const vid = compileVideoNativePrompt({
  visualDescription: "女主中景",
  dialogueLines: [{ speaker: "A", text: "你好" }],
  lipSyncPolicy: "dialogue_native",
  duration: 4,
});
ok("video enum mouth", /natural mouth|lip sync/i.test(vid.vendorPrompt));

// --- First frame ---
const dirtyFf = assertStillFirstFrameContract({
  stillPrompt: "沈清漪与沈清漪咬不同脸 --cref CHAR-A",
  stillFilePath: "/x.jpg",
  requireStill: true,
});
ok("dirty first frame BLOCK", dirtyFf.ok === false && dirtyFf.code === "STILL-FIRSTFRAME-DIRTY");

const cleanFf = assertStillFirstFrameContract({
  stillPrompt: "沈清漪咬帕，银簪刺入 --cref CHAR-SHENQINGYI",
  stillFilePath: "/x.jpg",
  requireStill: true,
});
ok("clean first frame", cleanFf.ok === true);

// --- Continuity short ---
const cont = buildCrossShotContinuityInject({
  continuityFrom: "铜镜中映出沈清漪苍白的脸，烛火摇曳，铜镜边缘映出她手中银簪的反光",
  neighborShotSize: "MS",
  neighborStillPresent: true,
});
ok("continuity no soft ref dump", !/soft ref/.test(cont.promptFragment) && !/neighbor shotSize/.test(cont.promptFragment));

// --- Recipe ZH only ---
ok("recipe no english power blocking", !/power blocking/.test(STILL_HQ_FIRST_FRAME_RECIPE_ZH_EN));

// --- Scorecard ---
const svq = scoreShortVideo({
  flags: { identityOk: false, lipOk: true, emotionOk: true, motionOk: true },
});
ok("scorecard identity dim", svq.failDims.some((d) => d.id === "identity_cast") || !svq.pass);

// guessWho no invent
const pred = extractDescPredicates({
  description: "沈清漪咬帕于正厅",
  characterNames: ["沈清漪"],
});
ok(
  "predicates who not 沈清漪咬",
  !pred.predicates.some((p) => String(p.who).includes("咬")),
);

const pre = assertStillIdentityPreflight({
  characters: [{ code: "CHAR-SHENQINGYI", name: "沈清漪", hasImage: true, kind: "character" }],
  dialogueSpeakers: ["沈清漪"],
  description: "沈清漪咬帕",
  enforce: true,
});
ok("preflight single ok", pre.ok === true);

// --- Recipe policy SSOT (Untitled-1: single cref + dual URL ≠ multi lock) ---
const untitled1 = composeStillPrompt(
  {
    visualDescription: "银簪尖端刺入锁骨下方皮肉。沈清漪咬帕，额角青筋隐现。",
    characters: [{ code: "CHAR-SHENQINGYI", name: "沈清漪", hasImage: true, kind: "character", tier: "lead" }],
    dialogueSpeakers: ["沈清漪"],
    shotSize: "ecu",
    requireLeadAssetImage: false,
    referenceUrlCount: 2,
    qualityMode: "hq_update",
    rawPrompt: "--cref CHAR-SHENQINGYI",
    continuityInject:
      "continuity: continues from copper mirror reflecting Shen Qingyi pale face, candle flicker, silver hairpin gleam on mirror edge, neighbor shotSize MS soft ref",
  },
  { mode: "full" },
);
ok("untitled1 compose ok", untitled1.ok === true);
ok("untitled1 no 多参考身份", !/多参考身份/.test(untitled1.prompt || ""));
ok("untitled1 single lock", /锁定角色定妆参考脸型/.test(untitled1.prompt || ""));
ok("untitled1 ECU no continuity dump", !/continues from|soft ref|neighbor shotSize/i.test(untitled1.prompt || ""));
ok("untitled1 ecu continuity source", (untitled1.sources || []).includes("cross.continuity.ecuOmit"));

const dualChar = composeStillPrompt(
  {
    visualDescription: "沈清瓷与沈母对峙于正厅，二人目光相交。",
    characters: [
      { code: "CHAR-A", name: "沈清瓷", hasImage: true, kind: "character", tier: "lead" },
      { code: "CHAR-B", name: "沈母", hasImage: true, kind: "character", tier: "supporting" },
    ],
    dialogueSpeakers: ["沈清瓷", "沈母"],
    shotSize: "MS",
    requireLeadAssetImage: false,
    referenceUrlCount: 2,
    qualityMode: "standard",
    rawPrompt: "--cref CHAR-A CHAR-B",
  },
  { mode: "full" },
);
ok("dual CHAR keeps 多参考", /多参考身份/.test(dualChar.prompt || ""));
ok("dual CHAR 不同脸", /不同脸/.test(dualChar.prompt || ""));

const dirty = "严格锁定多参考身份：脸型来自角色定妆参考，环境来自场景参考。沈清漪与沈清漪咬不同脸。嘴部自然微张或闭合。subtle micro-expression on the locked character face. --cref CHAR-SHENQINGYI";
const healed = healStillRecipePolicy(dirty);
ok("heal strips 多参考", !/多参考身份/.test(healed.prompt) && healed.healed.includes("multi_lock_single_cref"));
ok("heal strips phantom dual", !/不同脸/.test(healed.prompt) && healed.healed.includes("phantom_dual_face"));
ok("heal strips mouth", !/嘴部自然微张/.test(healed.prompt) && healed.healed.includes("generic_mouth"));
ok("heal strips en micro", !/micro-expression/i.test(healed.prompt));
ok("heal keeps single lock body", /禁止重塑五官身份/.test(healed.prompt));
ok("heal meta non-empty", healed.changed && healed.healed.length >= 3);
ok("charCodeCount from prompt", countCharCodesInPrompt(dirty) === 1);

const pipeHeal = runStillPromptPipeline({
  composed: {
    ...untitled1,
    prompt: dirty,
    ok: true,
  },
  description: "沈清漪咬帕",
  characterNames: ["沈清漪"],
});
ok("pipeline recipe heal", !/多参考身份/.test(pipeHeal.egressPrompt));
ok(
  "pipeline recipeHeals visible",
  Boolean(pipeHeal.recipeHeals?.length) || pipeHeal.autoHealed.some((a) => a.startsWith("recipe:")),
);

const contLong = applyContinuityPolicy(
  "continuity: continues from a very long previous shot description that should be truncated for recipe noise",
  "MS",
);
ok("continuity truncated", Boolean(contLong.truncated) && (contLong.text?.length ?? 0) <= 40);

const contEcu = applyContinuityPolicy("continuity: continues from prior", "ecu");
ok("continuity ECU omit", contEcu.omitted && !contEcu.text);

assert.ok(true);
console.log("\nAll production-pillars checks passed.");
