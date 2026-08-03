/**
 * yarn test:g-vendor-regen-latch
 * Vendor/transient errors must NOT latch blockSilentRegen (Generate stays clickable).
 */
import {
  buildStillErrorEnvelope,
  shouldLatchBlockSilentRegen,
} from "../src/ruleEngine/compilers/stillErrorEnvelope";
import { shouldBlockSilentStillRegen } from "../docs/toonflow-web/types/stillQuality";
import { sanitizeReferenceList } from "../src/routes/production/editImage/generateFlowImageCore";

function ok(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
  console.log("✓", msg);
}

const vendorMsg =
  "upload image queue input image[0]: image queue input invalid: download input image";
const env = buildStillErrorEnvelope({
  errMsg: vendorMsg,
  feedbackCategory: "vendor",
});
ok(env.code === "VENDOR" || env.primaryNextStep === "retry_shot", `vendor envelope step=${env.primaryNextStep} code=${env.code}`);
ok(env.primaryNextStep === "retry_shot", "vendor → retry_shot");
ok(
  shouldLatchBlockSilentRegen({
    primaryNextStep: env.primaryNextStep,
    code: env.code,
    errMsg: vendorMsg,
  }) === false,
  "vendor must not latch blockSilentRegen",
);

ok(
  shouldLatchBlockSilentRegen({
    primaryNextStep: "split_shot",
    code: "DEX-LIT-CONTACT-XOR",
  }) === false,
  "shootable-first: split_shot must NOT latch Generate",
);

ok(
  shouldLatchBlockSilentRegen({
    primaryNextStep: "chat_repair",
    irdPrimaryAction: "hand_edit_vd",
    missingSlots: ["contactGeom"],
  }) === false,
  "hand_edit_vd + missingSlots must NOT latch",
);

ok(
  shouldLatchBlockSilentRegen({
    primaryNextStep: "regen_storyboard_hq",
  }) === false,
  "regen_storyboard_hq must NOT latch",
);

ok(
  shouldBlockSilentStillRegen({
    blockSilentRegen: true,
    primaryNextStep: "retry_shot",
  }) === false,
  "FE: stale latch + retry_shot → allow click",
);

ok(
  shouldBlockSilentStillRegen({
    blockSilentRegen: true,
    primaryNextStep: "split_shot",
  }) === false,
  "FE shootable-first: split_shot allows Generate",
);

ok(
  shouldBlockSilentStillRegen({
    blockSilentRegen: true,
  }) === false,
  "FE: bare stale latch without debt → allow click",
);

ok(
  shouldBlockSilentStillRegen({
    blockSilentRegen: true,
    pixelDimStatus: "unmeasured",
    keyOptional: true,
    primaryNextStep: "regen_storyboard_hq",
  }) === false,
  "FE: Key optional unmeasured must allow Generate",
);

ok(
  shouldBlockSilentStillRegen({
    blockSilentRegen: true,
    irdPrimaryAction: "hand_edit_vd",
    missingSlots: ["contactGeom", "propInFrame"],
    primaryNextStep: "chat_repair",
  }) === false,
  "FE: literary enhanceable hand_edit_vd must allow Generate",
);

ok(
  shouldBlockSilentStillRegen({
    autoRepairStage: "compose_regen",
    blockSilentRegen: true,
    pixelDimStatus: "unmeasured",
  }) === false,
  "FE: autoRepairStage active must allow Generate",
);

ok(
  shouldBlockSilentStillRegen({
    irdPrimaryAction: "confirm_split",
    primaryNextStep: "split_shot",
    blockSilentRegen: true,
  }) === false,
  "FE shootable-first: confirm_split does not hard-block Generate",
);

ok(
  shouldBlockSilentStillRegen({
    debtKind: "missing_identity",
  }) === true,
  "FE: missing identity still blocks",
);

const cleaned = sanitizeReferenceList([
  { type: "image", base64: "data:image/png;base64,abc" },
  { type: "image", base64: `data:image/png;base64,${"A".repeat(200)}` },
]);
ok(cleaned.length === 1, `sanitize drops tiny ref (kept=${cleaned.length})`);

console.log("\ntest:g-vendor-regen-latch OK");
