/**
 * cross-release-train: FE BURN_NEXT_STEPS must match BE.
 * Also guard M7 VIDEO-PROMPT-STALE CTA helpers on FE + docs mirror.
 */
import assert from "assert";
import fs from "fs";
import path from "path";
import { BURN_NEXT_STEPS } from "../src/ruleEngine/compilers/burnGateEnvelope";

const fePath = path.resolve(process.cwd(), "../../Toonflow-web/src/constants/burnNextSteps.ts");
const alt = path.resolve(process.cwd(), "../Toonflow-web/src/constants/burnNextSteps.ts");
const file = fs.existsSync(fePath) ? fePath : alt;
assert.ok(fs.existsSync(file), `FE burnNextSteps missing at ${fePath} or ${alt}`);
const text = fs.readFileSync(file, "utf8");
for (const step of BURN_NEXT_STEPS) {
  assert.ok(text.includes(`"${step}"`), `FE missing nextStep ${step}`);
}

const feTypesCandidates = [
  path.resolve(process.cwd(), "../../Toonflow-web/src/types/videoIntentOps.ts"),
  path.resolve(process.cwd(), "../Toonflow-web/src/types/videoIntentOps.ts"),
];
const feTypes = feTypesCandidates.find((p) => fs.existsSync(p));
assert.ok(feTypes, "FE videoIntentOps.ts missing");
const feOps = fs.readFileSync(feTypes!, "utf8");
assert.ok(feOps.includes("isVideoPromptStaleSignal"), "FE missing isVideoPromptStaleSignal");
assert.ok(feOps.includes("重编译视频提示词"), "FE missing stale recompile CTA");

const docsMirror = path.resolve(process.cwd(), "docs/toonflow-web/types/videoIntentOps.ts");
if (fs.existsSync(docsMirror)) {
  const docsOps = fs.readFileSync(docsMirror, "utf8");
  assert.ok(docsOps.includes("isVideoPromptStaleSignal"), "docs mirror missing isVideoPromptStaleSignal");
  assert.ok(docsOps.includes("重编译视频提示词"), "docs mirror missing stale recompile CTA");
}

assert.ok(
  fs.readFileSync(path.resolve(process.cwd(), "src/ruleEngine/compilers/burnGateEnvelope.ts"), "utf8").includes(
    "VIDEO-PROMPT-STALE",
  ),
  "BE burnGateEnvelope missing VIDEO-PROMPT-STALE map",
);

// SheetLeak CTA homology (BE I5「禁拼版重抽」)
const feStillCandidates = [
  path.resolve(process.cwd(), "../../Toonflow-web/src/types/stillQuality.ts"),
  path.resolve(process.cwd(), "../Toonflow-web/src/types/stillQuality.ts"),
];
const feStill = feStillCandidates.find((p) => fs.existsSync(p));
assert.ok(feStill, "FE stillQuality.ts missing");
const feStillTxt = fs.readFileSync(feStill!, "utf8");
assert.ok(feStillTxt.includes("isSheetLeakSignal"), "FE missing isSheetLeakSignal");
assert.ok(feStillTxt.includes("sheetLeakCtaLabel"), "FE missing sheetLeakCtaLabel");
assert.ok(feStillTxt.includes("禁拼版重抽"), "FE missing 禁拼版重抽 CTA");

const docsStill = path.resolve(process.cwd(), "docs/toonflow-web/types/stillQuality.ts");
if (fs.existsSync(docsStill)) {
  const docsStillTxt = fs.readFileSync(docsStill, "utf8");
  assert.ok(docsStillTxt.includes("isSheetLeakSignal"), "docs mirror missing isSheetLeakSignal");
  assert.ok(docsStillTxt.includes("禁拼版重抽"), "docs mirror missing 禁拼版重抽");
}

assert.ok(
  fs
    .readFileSync(path.resolve(process.cwd(), "src/ruleEngine/compilers/stillDebtActionRouter.ts"), "utf8")
    .includes("禁拼版重抽"),
  "BE stillDebtActionRouter missing 禁拼版重抽",
);

// M7 fail-path must merge reason (not wipe designContentHash)
assert.ok(
  fs
    .readFileSync(path.resolve(process.cwd(), "src/routes/production/workbench/generateVideoPrompt.ts"), "utf8")
    .includes("patchVideoTrackReason"),
  "generateVideoPrompt must use patchVideoTrackReason on fail paths",
);
assert.ok(
  fs
    .readFileSync(path.resolve(process.cwd(), "src/routes/production/workbench/batchGeneratePrompt.ts"), "utf8")
    .includes("patchVideoTrackReason"),
  "batchGeneratePrompt must use patchVideoTrackReason on fail paths",
);

// Keep/upload FE must honor BE stillQuality (not forge HQ via state=已完成 alone)
const feStoryboardCandidates = [
  path.resolve(process.cwd(), "../../Toonflow-web/src/views/production/node/storyboard.vue"),
  path.resolve(process.cwd(), "../Toonflow-web/src/views/production/node/storyboard.vue"),
];
const feStoryboard = feStoryboardCandidates.find((p) => fs.existsSync(p));
assert.ok(feStoryboard, "FE storyboard.vue missing");
const feSbTxt = fs.readFileSync(feStoryboard!, "utf8");
assert.ok(feSbTxt.includes("stateHint"), "FE storyboard must apply BE stateHint after keep/upload");
assert.ok(feSbTxt.includes("stillQuality"), "FE storyboard must apply BE stillQuality after keep/upload");
assert.ok(feSbTxt.includes("isWeakKeepStill"), "FE storyboard must surface weak_keep (not silent HQ)");

// Workbench must not forge track 已完成 when burnAllowed === false
const feGenCandidates = [
  path.resolve(process.cwd(), "../../Toonflow-web/src/views/production/components/workbench/generate/index.vue"),
  path.resolve(process.cwd(), "../Toonflow-web/src/views/production/components/workbench/generate/index.vue"),
];
const feGen = feGenCandidates.find((p) => fs.existsSync(p));
assert.ok(feGen, "FE workbench generate/index.vue missing");
const feGenTxt = fs.readFileSync(feGen!, "utf8");
assert.ok(feGenTxt.includes("burnAllowed === false"), "FE generate must branch on burnAllowed === false");
assert.ok(feGenTxt.includes("需完善"), "FE generate must set 需完善 when not burnable");

assert.ok(
  fs
    .readFileSync(path.resolve(process.cwd(), "src/routes/production/workbench/batchGeneratePrompt.ts"), "utf8")
    .includes("需完善"),
  "batchGeneratePrompt must persist 需完善 when !burnAllowed",
);
assert.ok(
  fs
    .readFileSync(path.resolve(process.cwd(), "src/routes/production/workbench/checkVideoPrompt.ts"), "utf8")
    .includes("需完善"),
  "checkVideoPrompt poll must include 需完善",
);
assert.ok(
  fs.readFileSync(path.resolve(process.cwd(), "src/lib/fixDB.ts"), "utf8").includes("o_videoTrack"),
  "fixDB crash recovery must clear stuck o_videoTrack 生成中",
);

const fePickerCandidates = [
  path.resolve(process.cwd(), "../../Toonflow-web/src/components/storyboardImageCheck.vue"),
  path.resolve(process.cwd(), "../Toonflow-web/src/components/storyboardImageCheck.vue"),
];
const fePicker = fePickerCandidates.find((p) => fs.existsSync(p));
assert.ok(fePicker, "FE storyboardImageCheck.vue missing");
const fePickerTxt = fs.readFileSync(fePicker!, "utf8");
assert.ok(fePickerTxt.includes("stillQuality"), "storyboardImageCheck must surface stillQuality");
assert.ok(fePickerTxt.includes("isWeakStillRow"), "storyboardImageCheck must flag weak stills");

assert.ok(
  fs
    .readFileSync(path.resolve(process.cwd(), "src/routes/production/workbench/updateVideoPrompt.ts"), "utf8")
    .includes("decideVideoQuality"),
  "updateVideoPrompt must re-decide after hand-edit",
);
assert.ok(
  fs
    .readFileSync(path.resolve(process.cwd(), "src/routes/production/workbench/updateVideoPrompt.ts"), "utf8")
    .includes("需完善"),
  "updateVideoPrompt must persist 需完善 when !burnAllowed",
);
assert.ok(
  fs
    .readFileSync(path.resolve(process.cwd(), "src/routes/production/workbench/getGenerateData.ts"), "utf8")
    .includes("burnAllowed"),
  "getGenerateData must enrich burnAllowed for FE load",
);
assert.ok(
  fs
    .readFileSync(path.resolve(process.cwd(), "src/routes/production/workbench/getGenerateData.ts"), "utf8")
    .includes("stillApiFieldsFromReason"),
  "getGenerateData must hydrate stillQuality on storyboardList for first-frame picker",
);
assert.ok(feGenTxt.includes("handlePromptBlur"), "FE must save prompt on blur");
assert.ok(
  /body\.state|burnAllowed/.test(feGenTxt) && feGenTxt.includes("updateVideoPrompt"),
  "FE handlePromptBlur must apply BE state/burnAllowed after hand-edit",
);

const feImageSelectCandidates = [
  path.resolve(process.cwd(), "../../Toonflow-web/src/views/production/components/workbench/generate/components/imageSelect.vue"),
  path.resolve(process.cwd(), "../Toonflow-web/src/views/production/components/workbench/generate/components/imageSelect.vue"),
];
const feImageSelect = feImageSelectCandidates.find((p) => fs.existsSync(p));
assert.ok(feImageSelect, "FE imageSelect.vue missing");
const feImgSelTxt = fs.readFileSync(feImageSelect!, "utf8");
assert.ok(feImgSelTxt.includes("isWeakStill"), "imageSelect must flag weak stills in storyboard picker");
assert.ok(feImgSelTxt.includes("stillQualityBadgeLabel") || feImgSelTxt.includes("stillBadge"), "imageSelect must show weak badge");
assert.ok(feImgSelTxt.includes("slotWeakTag"), "imageSelect must badge weak stills on start-frame slots");
assert.ok(
  fs
    .readFileSync(path.resolve(process.cwd(), "src/routes/production/workbench/getGenerateData.ts"), "utf8")
    .includes("stillApiFieldsFromReason"),
  "getGenerateData medias/storyboardList must hydrate stillQuality",
);

assert.ok(
  fs
    .readFileSync(path.resolve(process.cwd(), "src/routes/production/workbench/batchGeneratePrompt.ts"), "utf8")
    .includes("Gate BEFORE 生成中"),
  "batchGeneratePrompt must refuse lipConfirm BEFORE writing 生成中",
);

const feTrackCandidates = [
  path.resolve(process.cwd(), "../../Toonflow-web/src/views/production/components/workbench/generate/components/track.vue"),
  path.resolve(process.cwd(), "../Toonflow-web/src/views/production/components/workbench/generate/components/track.vue"),
];
const feTrack = feTrackCandidates.find((p) => fs.existsSync(p));
assert.ok(feTrack, "FE track.vue missing");
const feTrackTxt = fs.readFileSync(feTrack!, "utf8");
assert.ok(feTrackTxt.includes("queuedIds"), "batchGenText must only revert queued tracks on fail");
assert.ok(feTrackTxt.includes("prevState"), "batchGenText must restore prior state on fail (not forge 生成失败 on all)");

// Crash recovery must merge storyboard.reason (not plain-string wipe)
assert.ok(
  fs.readFileSync(path.resolve(process.cwd(), "src/lib/fixDB.ts"), "utf8").includes("mergeReasonMeta"),
  "fixDB crash recovery must mergeReasonMeta on o_storyboard.reason",
);

console.log("test-fe-burn-nextstep-parity: OK");
