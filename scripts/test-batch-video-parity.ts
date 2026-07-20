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
ok("batch audioGateDeferred", /audioGateDeferred/.test(batch));
ok("single has identity", /gateIdentityForShot/.test(single));
ok("single has bridge", /bridgeShotToVendor/.test(single));
ok("single audio L0 → 400", /AUD-LIT-L0/.test(single));
ok("single voice bind", /assertAudioVoiceBindGate|AUD-VOICE-BIND/.test(single));
ok("single outer 500", /GENERATE_VIDEO/.test(single) && /catch \(e\)/.test(single));

if (failed) process.exit(1);
console.log("\n=== test:batch-video-parity OK ===");
