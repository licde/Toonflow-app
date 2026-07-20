/**
 * Golden: rich HQ compose + stillQuality G7 + lifecycle + refs order + description fidelity.
 */
import assert from "assert";
import {
  composeStillPrompt,
  stripIdentityTokens,
  measureVisualBody,
  stripMotionOnlyForStill,
  scrubStillPromptNoise,
  isDirtyStillPrompt,
  extractEntityAnchors,
  resolveComposeMode,
  computeComposeHash,
  assertStillPromptClean,
  isArtStyleToken,
  formatShotSizeZh,
} from "../src/ruleEngine/compilers/composeStillPrompt";
import {
  inferStillQuality,
  markHqOk,
  parseStillMetaFromReason,
  mergeReasonMeta,
  resolveImageQualityAnchor,
  STILL_HQ_FIRST_FRAME_RECIPE_ZH_EN,
} from "../src/ruleEngine/compilers/stillQuality";
import { orderReferenceUrls } from "../src/ruleEngine/compilers/hydrateComposeStillContext";
import { applyLifecycleInvalidation } from "../src/ruleEngine/heal/lifecycleInvalidate";
import { planPostBurnRepairs } from "../src/ruleEngine/qc/postBurnQc";
import { createHealBudget } from "../src/ruleEngine/heal/healBudgetLedger";
import { buildBurnGateEnvelope } from "../src/ruleEngine/compilers/burnGateEnvelope";
import { buildDc01HumanEnvelope } from "../src/ruleEngine/heal/dc01Envelope";
import { assertStillIdentityCoverage } from "../src/ruleEngine/compilers/stillIdentityCoverage";
import { buildStillErrorEnvelope } from "../src/ruleEngine/compilers/stillErrorEnvelope";

// --- strip tokens / empty cref body ---
const stripped = stripIdentityTokens("   --cref CHAR-A --sref SCENE-001,  --ar 9:16");
assert.ok(!measureVisualBody(stripped.body).ok, "token-only body must be thin");
assert.ok(/CHAR-A/.test(stripped.tokenTail));
assert.ok(!/SCENE-001,/.test(stripped.tokenTail));
assert.ok(/SCENE-001/.test(stripped.tokenTail));

// --- motion strip from videoDesc ---
assert.ok(!/缓推|dolly/i.test(stripMotionOnlyForStill("祠堂烛火 缓推 dolly in 清瓷跪地")));

// --- empty raw + design → rich synthesize ---
const syn = composeStillPrompt({
  rawPrompt: "  --cref CHAR-A --sref SCENE-001, ",
  visualDescription: "祠堂内清瓷跪地双手捧玉扳指，泪光映烛火",
  videoRatio: "9:16",
  artStyle: "水墨国风",
  microExpression: "眉头微蹙唇线绷紧",
  qualityMode: "hq_update",
  dialogueDominantSpeaker: true,
  referenceUrlCount: 3,
});
assert.equal(syn.ok, true, syn.blockReason);
assert.equal(syn.didSynthesize, true);
assert.ok(syn.prompt.includes("清瓷") || syn.prompt.includes("扳指"));
assert.ok(/9:16安全区|power blocking|safe area/i.test(syn.prompt));
assert.ok(syn.sources.includes("shot.visualDescription"));
assert.ok(syn.sources.includes("compositionContract"));
assert.ok(syn.sources.includes("refs.identityLock"));
assert.ok(syn.prompt.length > 80, "promptUsed must be rich");

// --- design merge + raw patch (H1) ---
const merge = composeStillPrompt({
  rawPrompt: "侧光从窗格打下",
  visualDescription: "廊下两人对峙",
  qualityMode: "hq_update",
  videoRatio: "9:16",
});
assert.equal(merge.ok, true, merge.blockReason);
assert.ok(merge.prompt.includes("对峙"));
assert.ok(merge.prompt.includes("侧光"));

// --- skeleton declare with weak anchors ---
const skel = composeStillPrompt({
  rawPrompt: "--cref CHAR-SHENQINGCI --cref CHAR-SHENMU --sref SCENE-001,",
  characters: [
    { code: "CHAR-SHENQINGCI", name: "沈清瓷", tier: "lead", hasImage: true },
    { code: "CHAR-SHENMU", name: "沈母", tier: "support", hasImage: true },
  ],
  sceneCode: "SCENE-001",
  emotion: 4,
  qualityMode: "hq_update",
  referenceUrlCount: 3,
  requireLeadAssetImage: false,
});
assert.equal(skel.ok, true, skel.blockReason);
assert.ok(skel.sources.includes("skeleton.declare") || skel.prompt.includes("沈清瓷"));
assert.ok(/叙事首帧|安全区/.test(skel.prompt));

// --- refs with URL skip lead hard block ---
const withRefs = composeStillPrompt({
  rawPrompt: "",
  visualDescription: "女主站在廊桥上望雨，发丝贴颊",
  characters: [{ code: "CHAR-NVZHU", name: "女主", tier: "lead", hasImage: false }],
  requireLeadAssetImage: false,
  referenceUrlCount: 2,
  qualityMode: "hq_update",
});
assert.equal(withRefs.ok, true, withRefs.blockReason);

// --- abstract only no anchors → block ---
const abs = composeStillPrompt({
  rawPrompt: "很美氛围感高级感",
  qualityMode: "hq_update",
});
assert.equal(abs.ok, false);
assert.equal(abs.qp02Blocked, true);
assert.ok(abs.userMessage);

// --- face rewrite stripped ---
const face = composeStillPrompt({
  rawPrompt: "男子站在窗前改脸成另一个人，手扶门框",
  qualityMode: "hq_update",
  videoRatio: "9:16",
});
assert.equal(face.ok, true, face.blockReason);
assert.ok(!/改脸/.test(face.prompt));

// --- lead missing without refs ---
const lead = composeStillPrompt({
  rawPrompt: "",
  visualDescription: "女主站在廊桥上望雨，发丝贴颊",
  characters: [{ code: "CHAR-NVZHU", name: "女主", tier: "lead", hasImage: false }],
  requireLeadAssetImage: true,
  referenceUrlCount: 0,
  qualityMode: "hq_update",
});
assert.equal(lead.ok, false);
assert.equal(lead.missingLeadAsset, true);
assert.equal(lead.primaryNextStep, "batch_still");

// --- quality anchor ---
assert.equal(resolveImageQualityAnchor("1K", "2K"), "2K");
assert.equal(resolveImageQualityAnchor("4K", "2K"), "4K");
assert.ok(STILL_HQ_FIRST_FRAME_RECIPE_ZH_EN.includes("安全区"));

// --- refs order CHAR before SCENE ---
const ordered = orderReferenceUrls([
  "https://x/scene/a.jpg",
  "https://x/role/b.jpg",
  "https://x/other/c.jpg",
]);
assert.ok(ordered[0].includes("/role/"));
assert.ok(ordered[ordered.length - 1].includes("/scene/") || ordered[1].includes("/other/"));

// --- G7 ---
assert.equal(inferStillQuality({ filePath: "/x.jpg", qualityMode: "hq_update" }), "weak");
assert.equal(
  inferStillQuality({
    filePath: "/x.jpg",
    meta: { stillQuality: "hq_ok", visualPass: true, visualPassAt: "2026-01-01T00:00:00.000Z" },
  }),
  "hq_ok",
);
assert.equal(
  inferStillQuality({ filePath: "/x.jpg", meta: { stillQuality: "hq_ok" }, requireVisualPass: true }),
  "weak",
);

const meta = markHqOk({
  composeSources: ["shot.visualDescription"],
  visualPass: true,
  visualPassAt: "2026-01-01T00:00:00.000Z",
});
const reason = mergeReasonMeta(null, { ...meta, primaryNextStep: "burn" });
assert.equal(parseStillMetaFromReason(reason)?.stillQuality, "hq_ok");

const lifeAsset = applyLifecycleInvalidation("asset_look_changed", { stillQuality: "hq_ok" });
assert.equal(lifeAsset.stillMeta?.stillQuality, "weak");
const lifeVisual = applyLifecycleInvalidation("shot_visual_changed", { stillQuality: "hq_ok" });
assert.equal(lifeVisual.stillMeta?.stillQuality, "weak");
const lifeStill = applyLifecycleInvalidation(
  "still_regenerated",
  markHqOk({ visualPass: true, visualPassAt: "2026-01-01T00:00:00.000Z" }),
);
assert.equal(lifeStill.stillMeta?.videoStale, true);

const repairs = planPostBurnRepairs(
  [{ id: "QC-ID-DRIFT", severity: "BLOCK", message: "face drift" }],
  createHealBudget(),
);
assert.equal(repairs.actions[0]?.nextStep, "regen_storyboard_hq");

// --- dirty curl: scrub + description fidelity (entities before recipe) ---
const dirtyCurl =
  "vertical 9:16 safe area, power blocking, clear face toward camera --cref CHAR-A --cref CHAR-B MS : ::: realpeople_ancient_chinese";
assert.equal(isDirtyStillPrompt(dirtyCurl), true, "dirty curl must be dirty");
const scrubbed = scrubStillPromptNoise(dirtyCurl);
assert.ok(scrubbed.scrubbed);

const dirtySyn = composeStillPrompt(
  {
    rawPrompt: dirtyCurl,
    visualDescription: "祠堂内清瓷跪地双手捧玉扳指，泪光映烛火",
    qualityMode: "hq_update",
    videoRatio: "9:16",
    referenceUrlCount: 3,
  },
  { mode: "full" },
);
assert.equal(dirtySyn.ok, true, dirtySyn.blockReason);
assert.ok(dirtySyn.scrubbed || dirtySyn.dirtyInput);
assert.ok(dirtySyn.prompt.includes("跪地") || dirtySyn.prompt.includes("扳指") || dirtySyn.prompt.includes("祠堂"));
const recipeIdx = dirtySyn.prompt.search(/竖屏9:16安全区|vertical\s*9:16/i);
const descIdx = dirtySyn.prompt.indexOf("祠堂");
assert.ok(descIdx >= 0 && (recipeIdx < 0 || descIdx < recipeIdx), "description must precede recipe");
assert.ok(dirtySyn.entityAnchors.length > 0 || /必须出现/.test(dirtySyn.prompt));
assert.equal(assertStillPromptClean(dirtySyn.visualBody).ok, true);

// --- refine keeps user patch; fidelity reinforces entities ---
const refined = composeStillPrompt(
  {
    rawPrompt: "侧光从窗格打下",
    visualDescription: "廊下两人对峙",
    previousVisualBody: "廊下两人对峙。侧光从窗格打下",
    qualityMode: "hq_update",
  },
  { mode: "refine" },
);
assert.equal(refined.ok, true);
assert.ok(refined.prompt.includes("对峙"));

const fidelity = composeStillPrompt(
  {
    rawPrompt: refined.prompt,
    visualDescription: "廊下两人对峙，沈清瓷握玉扳指",
    previousVisualBody: refined.visualBody,
    qualityMode: "hq_update",
  },
  { mode: "fidelity" },
);
assert.equal(fidelity.ok, true);
assert.ok(fidelity.sources.includes("fidelity.narrativeFirst") || fidelity.sources.includes("fidelity.entityReplay"));
assert.ok(/必须出现|再次强调/.test(fidelity.prompt));

const anchors = extractEntityAnchors("祠堂内清瓷跪地捧玉扳指");
assert.ok(anchors.some((a) => /祠堂|扳指|跪/.test(a)));

assert.equal(resolveComposeMode({ existingPrompt: dirtyCurl }), "full");
assert.equal(resolveComposeMode({ existingPrompt: "廊下对峙清晰可拍", promptState: "composed" }), "refine");
assert.equal(resolveComposeMode({ requested: "fidelity", existingPrompt: "x" }), "fidelity");

const h1 = computeComposeHash({ visualDescription: "A" });
const h2 = computeComposeHash({ visualDescription: "B" });
assert.notEqual(h1, h2);
assert.equal(resolveComposeMode({ promptState: "composed", composeHash: h1, currentHash: h2, existingPrompt: "廊下对峙清晰可拍" }), "full");

const lifeStale = applyLifecycleInvalidation("shot_visual_changed", { stillQuality: "hq_ok", promptState: "hq_ok" });
assert.equal(lifeStale.stillMeta?.promptState, "stale");

// --- DC-01 human envelope (no raw dialogue_hash_mismatch→SB alone) ---
const dcEnv = buildDc01HumanEnvelope({
  message: "台词覆盖不足",
  evidence: { missingCount: 1, missingSamples: ["你凭什么拿回扳指"], repairReasons: ["unique_missing_line"] },
});
assert.equal(dcEnv.primaryNextStep, "soft_patch");
assert.ok(/台词|剧本/.test(dcEnv.userMessage));
assert.ok(!/dialogue_hash_mismatch→/.test(dcEnv.userMessage));
assert.equal(dcEnv.ctaLabel, "一键补台词");

const burnEnv = buildBurnGateEnvelope([{ id: "DC-01", message: "缺 1 条台词", reverseTrigger: "dialogue_hash_mismatch" }]);
assert.equal(burnEnv.primaryNextStep, "soft_patch");
assert.ok(/台词|剧本/.test(burnEnv.userMessage));
assert.ok(burnEnv.triggers.includes("dialogue_hash_mismatch"));

// --- lit fidelity: no realpeople / MS in visual body ---
assert.equal(isArtStyleToken("realpeople_ancient_chinese"), true);
assert.equal(formatShotSizeZh("MS"), "中景");
assert.equal(formatShotSizeZh("中景"), "中景");

const noNoise = composeStillPrompt(
  {
    rawPrompt: "",
    visualDescription: "沈清瓷抬头反驳，眼眶微红，墨滴在纸上晕染开",
    artStyle: "realpeople_ancient_chinese",
    shotSize: "MS",
    qualityMode: "hq_update",
    characters: [
      { code: "CHAR-SHENQINGCI", name: "沈清瓷", hasImage: true, kind: "character" },
      { code: "CHAR-SHENMU", name: "沈母", hasImage: false, kind: "character" },
    ],
    dialogueSpeakers: ["沈清瓷", "沈母"],
    requireLeadAssetImage: false,
  },
  { mode: "full" },
);
assert.equal(noNoise.ok, true, noNoise.blockReason);
assert.ok(!/画风：realpeople/i.test(noNoise.visualBody));
assert.ok(!/景别：MS\b/.test(noNoise.visualBody));
assert.ok(/景别：中景/.test(noNoise.prompt) || !/景别：/.test(noNoise.visualBody));
assert.ok(noNoise.entityAnchors.some((a) => /沈清瓷|墨滴|纸|眼眶/.test(a)) || /必须出现/.test(noNoise.prompt));
assert.ok(noNoise.sources.includes("refs.multiFace") || /不同脸/.test(noNoise.prompt));

// compose-only path: missing lead look must still compose when requireLeadAssetImage=false
const composeOnly = composeStillPrompt(
  {
    rawPrompt: "--cref CHAR-A",
    visualDescription: "女主站在廊桥上望雨",
    characters: [{ code: "CHAR-A", name: "女主", tier: "lead", hasImage: false, kind: "character" }],
    requireLeadAssetImage: false,
    referenceUrlCount: 0,
    qualityMode: "hq_update",
  },
  { mode: "full" },
);
assert.equal(composeOnly.ok, true, composeOnly.blockReason);

// identity gate: dual speaker, one missing look
const idFail = assertStillIdentityCoverage({
  characters: [
    { code: "CHAR-SHENQINGCI", name: "沈清瓷", hasImage: true, kind: "character" },
    { code: "CHAR-SHENMU", name: "沈母", hasImage: false, kind: "character" },
  ],
  dialogueSpeakers: ["沈清瓷", "沈母"],
  enforce: true,
});
assert.equal(idFail.ok, false);
assert.equal(idFail.code, "IMG-CREF-CHAR");
assert.ok(/沈母/.test(idFail.userMessage || ""));
assert.ok(!/构图不够好/.test(idFail.userMessage || ""));

const idOk = assertStillIdentityCoverage({
  characters: [
    { code: "CHAR-A", name: "沈清瓷", hasImage: true },
    { code: "CHAR-B", name: "沈母", hasImage: true },
  ],
  enforce: true,
});
assert.equal(idOk.ok, true);

// vendor envelope must NOT collapse to 构图不好
const vend = buildStillErrorEnvelope({
  errMsg: "502 Bad Gateway from vendor",
  feedbackCategory: "vendor_passthrough",
});
assert.ok(/供应商|重试|502/.test(vend.userMessage));
assert.ok(!/构图不够好/.test(vend.userMessage));
assert.equal(vend.primaryNextStep, "retry_shot");

const stillQa = buildStillErrorEnvelope({ code: "IMG-STILL-QA", feedbackCategory: "img_still_weak" });
assert.ok(/构图/.test(stillQa.userMessage));

console.log("test-storyboard-still-hq-flow: OK");
