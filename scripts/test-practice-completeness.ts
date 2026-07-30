/**
 * Practice Completeness Ladder CI — yarn test:practice-completeness
 * Fails if any class missing a ladder step, or Key marked required, or mount matrix missing contact gates.
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  auditPracticeCompleteness,
  loadPracticeInventory,
  loadQualityStateMatrix,
  isVlmKeyRequired,
  pixelDimStatus,
  mustDimAllowsVideoPass,
  stillQualityUserMessage,
} from "../src/ruleEngine/quality/practiceCompleteness";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
  console.log("✓", msg);
}

const root = join(process.cwd(), "data", "fixtures");
const invPath = join(root, "practice_completeness_inventory.json");
const qsPath = join(root, "quality_state_matrix.json");
const mountPath = join(root, "design_gate_mount_matrix.json");

assert(existsSync(invPath), "practice_completeness_inventory.json exists");
assert(existsSync(qsPath), "quality_state_matrix.json exists");

const inv = loadPracticeInventory();
assert((inv.classes?.length ?? 0) >= 28, `inventory has ≥28 classes (got ${inv.classes?.length})`);
assert(inv.keyPolicy?.required !== true, "Key is optional (keyPolicy.required !== true)");
assert(!isVlmKeyRequired(), "isVlmKeyRequired() false");

const incomplete = auditPracticeCompleteness(inv);
assert(incomplete.length === 0, `all classes six-ladder complete (missing: ${JSON.stringify(incomplete)})`);

const qs = loadQualityStateMatrix();
assert(
  (qs.forbidden ?? []).some((f) => /must_configure_key|hq_ok_without_visualPass/i.test(f)),
  "quality_state_matrix forbids fake pass / must-configure-key",
);

assert(pixelDimStatus({ keyOrAdapterPresent: false }) === "unmeasured", "no Key ⇒ unmeasured");
assert(pixelDimStatus({ keyOrAdapterPresent: true, observed: false }) === "measured_fail", "Key+fail ⇒ measured_fail");
assert(pixelDimStatus({ keyOrAdapterPresent: true, observed: true }) === "measured_pass", "Key+pass ⇒ measured_pass");
assert(!mustDimAllowsVideoPass("unmeasured"), "unmeasured forbids videoPass");
assert(!mustDimAllowsVideoPass("measured_fail"), "measured_fail forbids videoPass");
assert(mustDimAllowsVideoPass("measured_pass"), "measured_pass allows videoPass gate");

const msgNoKey = stillQualityUserMessage({ keyAbsent: true });
assert(!/必须配置\s*Key|须配置.*API\s*Key/i.test(msgNoKey), "no-Key message is not hard must-configure");
assert(/未配置诊断|未测|弱图/.test(msgNoKey), "no-Key message honest L0/unmeasured");

const mount = JSON.parse(readFileSync(mountPath, "utf-8")) as {
  rows: { ruleId: string; stages?: string[] }[];
};
const ids = new Set(mount.rows.map((r) => r.ruleId));
for (const need of ["STILL-CONTACT-HANDOFF", "VID-CONTACT-BEATS", "DESIGN-LOSS", "CHAIN-BEAT", "IRD-CONFIRM"]) {
  assert(ids.has(need), `mount matrix includes ${need}`);
}

const stillContact = mount.rows.find((r) => r.ruleId === "STILL-CONTACT-HANDOFF");
assert(
  Boolean(stillContact?.stages?.includes("EN") || stillContact?.stages?.includes("MD-VID")),
  "STILL-CONTACT-HANDOFF mounted on EN or MD-VID",
);

console.log("\ntest:practice-completeness OK");
