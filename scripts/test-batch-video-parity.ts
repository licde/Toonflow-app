/**
 * yarn test:batch-video-parity
 * Source-level: batchGenerateVideo must wire identity + bridge like single generateVideo.
 */
import fs from "fs";
import path from "path";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const batch = fs.readFileSync(path.join(process.cwd(), "src/routes/production/workbench/batchGenerateVideo.ts"), "utf-8");
const single = fs.readFileSync(path.join(process.cwd(), "src/routes/production/workbench/generateVideo.ts"), "utf-8");

ok("batch imports gateIdentityForShot", /gateIdentityForShot/.test(batch));
ok("batch imports bridgeShotToVendor", /bridgeShotToVendor/.test(batch));
ok("batch imports vendorCapability", /resolveVendorCapability|vendorCapabilityMap/.test(batch));
ok("batch uses inferMediaType or optional type", /inferMediaType|filePath\?\.type/.test(batch));
ok("batch filePath?.type safe", /filePath\?\.type/.test(batch));
ok("batch outer try/catch 500", /BATCH_GENERATE_VIDEO/.test(batch) && /catch \(e\)/.test(batch));
ok("batch stillGateApplied", /stillGateApplied/.test(batch));
ok("batch assertStillFirstFrameContract or detect", /assertStillFirstFrameContract|assertStillDetectForBurn/.test(batch));
ok("batch audioGateDeferred", /audioGateDeferred/.test(batch));
ok("single has identity", /gateIdentityForShot/.test(single));
ok("single has bridge", /bridgeShotToVendor/.test(single));
ok("single audio L0 soft-absorb", /assertAudioLiteraryFidelity/.test(single) && /音轨债已标|audioAssert/.test(single));
ok("single voice bind", /assertAudioVoiceBindGate|AUD-VOICE-BIND/.test(single));
ok("single detect passes stillQuality", /stillQuality/.test(single) && /assertStillDetectForBurn/.test(single));
ok("single outer 500", /GENERATE_VIDEO/.test(single) && /catch \(e\)/.test(single));
ok("batch heal_then_burn 需完善 (absorb, not skip)", /healThenBurn|契约债已智能吸收/.test(batch));
ok("batch soft_defer writeback patchVideoTrackReason", /patchVideoTrackReason/.test(batch));
ok("single heal_then_burn 需完善/仓债", /healThenBurnNotes/.test(single) && /实现已降级/.test(single));
ok("batch absorbs warehouse debt (no hard 400 WAREHOUSE)", /healThenBurnAbsorbed/.test(batch) && !/code: "WAREHOUSE_DEBT_SOFT_DEFER"/.test(batch));
ok("single absorbs lipConfirm (no LIP_CONFIRM 400)", /仓债已吸收/.test(single) && !/code: "LIP_CONFIRM_REQUIRED"/.test(single));
ok(
  "single vendorPrompt mutable (spine path reassign)",
  /let vendorPrompt/.test(single) && !/const vendorPrompt\s*=/.test(single),
);
ok("prompt gen uses literaryDialogueTexts", /literaryDialogueTexts/.test(fs.readFileSync(path.join(process.cwd(), "src/routes/production/workbench/generateVideoPrompt.ts"), "utf-8")));
ok("prompt gen scrubs before quality decision", /scrubVideoPromptForBurn/.test(fs.readFileSync(path.join(process.cwd(), "src/routes/production/workbench/generateVideoPrompt.ts"), "utf-8")) && /softHealVideoHomologyOnShots/.test(fs.readFileSync(path.join(process.cwd(), "src/routes/production/workbench/generateVideoPrompt.ts"), "utf-8")));
ok("single scrubs before quality decision", /scrubVideoPromptForBurn/.test(single) && /softHealVideoHomologyOnShots/.test(single));
ok("getGenerateData qcSoftDeliver", /mapVideoStateForFe|qcSoftDeliver/.test(fs.readFileSync(path.join(process.cwd(), "src/routes/production/workbench/getGenerateData.ts"), "utf-8")));
ok("getGenerateData prefers burnDurationSec for duration", /duration:\s*burnDurationSec/.test(fs.readFileSync(path.join(process.cwd(), "src/routes/production/workbench/getGenerateData.ts"), "utf-8")));
ok("getGenerateData live rescore fidelity", /liveDesignIntentFidelityForTrack/.test(fs.readFileSync(path.join(process.cwd(), "src/routes/production/workbench/getGenerateData.ts"), "utf-8")));
ok(
  "prompt gen durationSec is let (adaptBurn reassign)",
  /let durationSec\s*=/.test(fs.readFileSync(path.join(process.cwd(), "src/routes/production/workbench/generateVideoPrompt.ts"), "utf-8")),
);
ok(
  "prompt gen uses adaptBurnFromDesign SSOT",
  /adaptBurnFromDesign/.test(fs.readFileSync(path.join(process.cwd(), "src/routes/production/workbench/generateVideoPrompt.ts"), "utf-8")),
);
ok("batch stamps burnDurationSec on track", /burnDurationSec:\s*vendorDuration/.test(batch));
ok("checkVideoStateList qcSoftDeliver", /mapVideoStateForFe|qcSoftDeliver/.test(fs.readFileSync(path.join(process.cwd(), "src/routes/production/workbench/checkVideoStateList.ts"), "utf-8")));
const checkVideoSrc = fs.readFileSync(path.join(process.cwd(), "src/routes/production/workbench/checkVideoStateList.ts"), "utf-8");
ok("checkVideoStateList scorecard + track fidelity", /skippedDims/.test(checkVideoSrc) && /scorecard/.test(checkVideoSrc) && /trackFidelityFromReason/.test(checkVideoSrc));
ok("batch mouth uses resolveLipSyncPolicyFromShot", /resolveLipSyncPolicyFromShot/.test(batch));
ok("single soft-absorbs or hard-blocks I2V (both paths present)", /STILL-I2V-NOT-READY/.test(single) && /首帧债已吸收|弱图首帧已吸收/.test(single));
ok("single soft-absorbs contact handoff", /接触交接债已吸收|assertStillContactVideoHandoff/.test(single));
ok("single LANG-01 packed gate", /VID-LANG-01|checkLangVid01/.test(single));
ok("single fidelity videoPass gate", /fidelityMissesBlockAbsorb/.test(single));
ok(
  "FE debt mount wires both bars",
  /VideoIntentDebtBar/.test(fs.readFileSync(path.join(process.cwd(), "docs/toonflow-web/components/ShotWorkbenchDebtMount.vue"), "utf-8")) &&
    /LitDetailDebtBar/.test(fs.readFileSync(path.join(process.cwd(), "docs/toonflow-web/components/ShotWorkbenchDebtMount.vue"), "utf-8")),
);

if (failed) process.exit(1);
console.log("\n=== test:batch-video-parity OK ===");
