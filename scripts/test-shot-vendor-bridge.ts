/**
 * yarn test:shot-vendor-bridge
 */
import { bridgeShotToVendor, applyTextHardening } from "@/ruleEngine/compilers/shotVendorBridge";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const r = bridgeShotToVendor({
  designFields: {
    duration: 5,
    shotSize: "CU",
    dialogue: "风很大。",
    forceAudioHint: true,
    camera: "推进",
    emotion: 7,
  },
  request: { duration: 12, audio: false, resolution: "720p", mode: "text" },
});

ok("duration from field not request", r.params.duration === 5);
ok("audio forced", r.params.audio === true);
ok("resolution passed", r.params.resolution === "720p");
ok("text_only warning shotSize", r.warnings.includes("bridging:text_only:shotSize"));
ok("hardening non-empty", r.textHardening.length >= 1);

const p = applyTextHardening("[Camera]\nmedium shot", r.textHardening);
ok("hardening inserted under Camera", /\[Camera\]\n/.test(p) && p.length > "[Camera]\nmedium shot".length);

if (failed) process.exit(1);
console.log("\n=== test:shot-vendor-bridge OK ===");
