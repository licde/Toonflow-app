/**
 * yarn test:e2e-production-loop
 * Covers P0–P5 unit matrices from the production closed-loop plan.
 */
import {
  ASSET_CODE_TEST_VECTORS,
  normalizeAssetCode,
  normalizeAssetCodes,
  splitCodeTokens,
  LANGUAGE_POLICY,
} from "../src/ruleEngine/codes/assetCodeContract";
import { applyModeDialect, adaptPromptForModeSync } from "../src/ruleEngine/compilers/adaptPromptForMode";
import { applyProjectAspectRatio, parsePromptRefs, resolveAspectRatio } from "../src/ruleEngine/compilers/vendorPromptAdapter";
import { measureDialogue, suggestShotDuration } from "../src/ruleEngine/dialogueMetrics";
import { checkDialogueDuration, runPrValidator } from "../src/ruleEngine/validators/prValidator";
import { runPrEmitters } from "../src/ruleEngine/validators/prEmitters";
import { runLangAudFxCamGates, checkLangAud01, checkCamVariety, checkFxGrade } from "../src/ruleEngine/validators/langAudFxCam";
import { materializePackaging } from "../src/ruleEngine/bundle/packagingMaterialize";
import { assertNonEmptyEpisode } from "../src/ruleEngine/bundle/emptyEpisodeGate";
import { expandTracksToShots } from "../src/ruleEngine/trackShotExpander";
import { injectContentFields } from "../src/ruleEngine/compilers/contentFieldCompiler";
import { sharedMediaPreflight, mediaPreflightBlocked, requirePublicOssUrl } from "../src/ruleEngine/compilers/mediaTouchParity";
import { runDesignPhaseGates } from "../src/ruleEngine/bundle/designPhaseGates";
import { generationJobQueue, __resetJobQueue } from "../src/ruleEngine/ports/jobQueue";
import { withImportLock, __resetImportLocks } from "../src/ruleEngine/bundle/importMutex";
import { buildRePushPlan } from "../src/ruleEngine/design/reverseRouteEngine";
import type { EpisodePackage } from "../src/ruleEngine/types";

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failed++;
    console.error("FAIL:", msg);
  } else {
    console.log("OK:", msg);
  }
}

// --- asset-code-slug ---
for (const v of ASSET_CODE_TEST_VECTORS) {
  if (v.input.includes(",")) {
    const norms = normalizeAssetCodes(splitCodeTokens(v.input));
    assert(norms.includes("CHAR-001") && norms.includes("CHAR-005"), `split ${v.input}`);
    continue;
  }
  assert(normalizeAssetCode(v.input) === v.expect, `code ${v.input} → ${normalizeAssetCode(v.input)}`);
}
assert(normalizeAssetCode("CHAR-QINGCI") === "CHAR-QINGCI", "slug CHAR-QINGCI");
assert(parsePromptRefs("x --cref CHAR-QINGCI,CHAR-005").crefs.includes("CHAR-QINGCI"), "slug in parsePromptRefs");

// --- AR SSOT ---
assert(resolveAspectRatio("9:16", "16:9") === "9:16", "project.videoRatio wins");
const ar = applyProjectAspectRatio("shot --ar 1:1 --cref CHAR-001", "16:9");
assert(ar.aspectRatio === "16:9" && !ar.vendorPrompt.includes("--ar"), "strip --ar + project ratio");

// --- language policy ---
assert(LANGUAGE_POLICY.audioPayload === "source_language" && LANGUAGE_POLICY.videoMotionShell === "en", "lang policy");

// --- mode-dialect-matrix ---
const modes = ["text", "singleImage", "firstLastFrame", "multiImage"];
for (const m of modes) {
  const r = adaptPromptForModeSync("close-up confrontation, static", m);
  assert(r.modeId.length > 0 && !r.prompt.includes("[mode="), `dialect ${m} no fake tag`);
  assert(applyModeDialect("foo", m).length > 3, `dialect apply ${m}`);
}

// --- dialogue metrics V10 vs PR-09 ---
const metrics = measureDialogue({ text: "这是一句超过十五个汉字的测试独白内容呀", isMonologue: true });
assert(metrics.exceedsLineBudget === true && metrics.lineBudgetMax === 12, "V10 monologue budget");
assert(suggestShotDuration(1, measureDialogue({ text: "你好世界测试时长不足" })) >= 1, "duration suggest");
const pr09 = checkDialogueDuration({ shotIndex: 1, duration: 0.5, narrative: { dialogue: { lines: "这是足够长的中文台词用来触发时长闸" } } });
assert(pr09?.ruleId === "PR-09", "PR-09 duration block");

// --- lang/fx/cam ---
assert(checkLangAud01({ dialogueLines: "你好", audioPrompt: "VOICE: Hello my friend what are you", shotIndex: 1 })?.ruleId === "LANG-AUD-01", "LANG-AUD-01");
assert(checkFxGrade({ fxPrompt: "", fxFeasibility: "F5", shotIndex: 2 })?.severity === "BLOCK", "FX F5");
assert(checkCamVariety({ cameraMotions: ["static", "static", "static", "static"] })?.ruleId === "CAM-VARIETY", "CAM-VARIETY");
const gates = runLangAudFxCamGates([
  { shotIndex: 1, dialogueLines: "走", audioPrompt: "鼓点", cameraMotion: "static", fxPrompt: "火花", fxFeasibility: "F2" },
]);
assert(Array.isArray(gates), "gates array");

// --- PR emitters ---
const prItems = runPrEmitters([
  {
    shotIndex: 1,
    charCodes: ["CHAR-001", "CHAR-002"],
    narrative: { type: "CHAR-SCENE", dialogue: { lines: ["你走"] }, spatialRelation: "" },
  },
]);
assert(prItems.some((i) => i.ruleId === "PR-12"), "PR-12 spatial");

const prBundle = runPrValidator({
  meta: { episodeKey: "ep01" },
  script: "x",
  preDesignPack: {
    shots: [
      {
        shotIndex: 1,
        duration: 0.4,
        narrative: { dialogue: { lines: "足够长的中文对白触发口型时长", type: "dialogue" }, type: "CHAR-SCENE", charCodes: ["CHAR-A"] },
      },
    ],
  },
} as never);
assert(prBundle.items.some((i) => i.ruleId === "PR-09"), "runPrValidator PR-09");

// --- packaging materialize ---
const pack = materializePackaging({
  meta: { episodeKey: "e1" },
  script: "s",
  debutIntroPack: { beatHint: "debut open", characters: [{}] },
  continuity: { unresolvedHooks: ["cliff?"] },
  preDesignPack: { shots: [{ narrative: {} }, { narrative: {} }] },
} as never);
assert(pack.report.debutApplied && pack.report.endHookApplied, "debut/endHook materialize");

// --- empty + design gate ---
assert(!assertNonEmptyEpisode({ storyboardCount: 0 }).ok, "empty episode");
const dg = runDesignPhaseGates({
  meta: { episodeKey: "e" },
  script: "s",
  preDesignPack: {
    shots: [
      { duration: 2, narrative: { type: "CHAR-SCENE" }, fxPrompt: "" },
      { duration: 2, narrative: { type: "CHAR-SCENE" }, fxPrompt: "" },
      { duration: 2, narrative: { type: "CHAR-SCENE" }, fxPrompt: "" },
    ],
  },
} as never);
assert(dg.findings.some((f) => f.id === "DG-FALSE-GREEN-FX"), "anti false green FX");

// --- track expand ---
const pkg = {
  shots: [
    {
      id: "s1",
      storyboardId: 10,
      narrative: { duration: 3 },
      generation: { compiled: { video: "v1", image: "i1", audio: "a1", hash: "h1" } },
    },
    {
      id: "s2",
      storyboardId: 11,
      narrative: { duration: 4 },
      generation: { compiled: { video: "v2", image: "i2", audio: "a2", hash: "h2" } },
    },
  ],
} as unknown as EpisodePackage;
const expanded = expandTracksToShots(pkg, [
  { trackId: 1, storyboardId: 10 },
  { trackId: 1, storyboardId: 11 },
]);
assert(expanded.length === 2 && expanded[0].compiled.video === "v1", "track-shot-expand");

// --- content compile ---
assert(injectContentFields("base", { emotion: 9, colorTemp: "暖", spatialRelation: "左男右女" }).includes("warm"), "content fields");

// --- media / oss ---
assert(!requirePublicOssUrl("http://localhost/x").ok, "block localhost");
assert(mediaPreflightBlocked(sharedMediaPreflight({ paths: ["http://127.0.0.1/a"], requireAtLeastOne: true })), "oss preflight");

// --- reverse plans ---
for (const t of ["lang_aud_mismatch", "cam_speak", "pr_os_voice", "content_policy_rewrite", "fx_infeasible"]) {
  const plan = buildRePushPlan([t]);
  assert(plan.length > 0, `rePush plan ${t}`);
}

// --- job queue + import lock ---
__resetJobQueue();
__resetImportLocks();

async function main() {
  await generationJobQueue.enqueue({ id: "j1", shotId: "1", modality: "video", priority: 1 });
  assert((await generationJobQueue.getStatus("j1"))?.status === "pending", "job enqueue");
  await withImportLock(99, "t1", async () => {
    assert(true, "import lock held");
  });

  if (failed) {
    console.error(`\n${failed} e2e-production-loop failures`);
    process.exit(1);
  }
  console.log("\n=== test:e2e-production-loop OK ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
