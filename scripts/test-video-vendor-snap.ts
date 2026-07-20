/**
 * yarn test:video-vendor-snap
 */
import { snapDurationToVendorMap, applyVendorPromptPack, VENDOR_DURATION_BUCKETS } from "@/ruleEngine/vendor-packs/videoVendorPack";
import { bridgeShotToVendor } from "@/ruleEngine/compilers/shotVendorBridge";
import { resolveVendorCapability } from "@/ruleEngine/compilers/vendorCapabilityMap";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const kling = snapDurationToVendorMap(7, VENDOR_DURATION_BUCKETS.klingai, { lipMin: 6 });
ok("kling snaps up to 10", kling.duration === 10 && kling.ok);

const seed = snapDurationToVendorMap(3, VENDOR_DURATION_BUCKETS.seedance);
ok("seedance min 4", seed.duration === 4);

const pack = applyVendorPromptPack({
  prompt: "[Instruction]\n@图1 : x\nhello",
  vendorId: "seedance",
  duration: 5,
  audio: true,
});
ok("seedance @图片", /@图片1/.test(pack.prompt));

const wan = applyVendorPromptPack({
  prompt: "@图1 : char\nnarrative beat",
  vendorId: "wan",
  templatePath: "video/wan2.6Single-imageFirstFrameMode.md",
  duration: 5,
  audio: true,
});
ok("wan strips @图", !/@图/.test(wan.prompt));

const cap = resolveVendorCapability("klingai");
ok("kling no native audio", cap.nativeAudio === false);
const br = bridgeShotToVendor({
  designFields: { duration: 7, dialogue: "很长的一句台词用来抬升" },
  capability: cap,
  lipMin: 6,
  request: { audio: true },
});
ok("kling duration bucket", br.params.duration === 10);
ok("kling audio false", br.params.audio === false);

if (failed) {
  console.error(`\n${failed} video-vendor-snap failed`);
  process.exit(1);
}
console.log("\n=== test:video-vendor-snap OK ===");
