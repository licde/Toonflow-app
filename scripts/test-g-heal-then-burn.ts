/**
 * heal_then_burn: warehouse/stale/需完善 absorb; pose/contact soft WARN absorb; true missing prop may still BLOCK.
 * debtLedger humanizes absorbed notes into video info (not long toast).
 * Run: npx tsx scripts/test-g-heal-then-burn.ts
 */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = path.resolve(__dirname, "..");

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function ok(name: string, cond: boolean) {
  assert.equal(cond, true, name);
  console.log("ok:", name);
}

const gv = read("src/routes/production/workbench/generateVideo.ts");
ok(
  "generateVideo absorbs 需完善 (no TRACK_PROMPT 400 return)",
  /healThenBurnNotes/.test(gv) && !/code: "TRACK_PROMPT_NOT_BURN_READY"/.test(gv),
);
ok("generateVideo absorbs lipConfirm (no LIP_CONFIRM 400)", !/code: "LIP_CONFIRM_REQUIRED"/.test(gv));
ok("generateVideo clears stale", /promptState=stale 已清/.test(gv));
ok(
  "generateVideo absorbs contact WARN into healThenBurnNotes",
  /healThenBurnNotes\.push\(contactGate\.message\)/.test(gv) &&
    /\[Motion\]/.test(gv) &&
    /禁止弯腰绿继承/.test(gv),
);
ok(
  "generateVideo absorbs pose handoff BLOCK",
  /姿态交接债已吸收/.test(gv),
);
ok(
  "generateVideo absorbs mouth handoff (no STILL-MOUTH 400 return)",
  /口型交接债已吸收/.test(gv) && !/return res\.status\(400\)\.send\(\s*error\([^)]*STILL-MOUTH-HANDOFF/s.test(gv),
);
ok(
  "generateVideo soft-absorbs I2V debts (only missing hard-blocks)",
  /首帧债已吸收|弱图首帧已吸收/.test(gv) &&
    /mayAbsorbBurnDebt\("still_i2v_ready"\)/.test(gv) &&
    /code: "STILL-I2V-NOT-READY"/.test(gv) &&
    /hardMisses/.test(gv) &&
    !/禁止带病烧片/.test(gv),
);
ok(
  "generateVideo strip syncs visualPass on heal",
  /healThenBurnStillDebt:\s*true/.test(gv) && /visualPass:\s*true/.test(gv),
);
ok(
  "generateVideo I2V hard path still kicks smart repair",
  /STILL-I2V-NOT-READY/.test(gv) && /runSelfHeal/.test(gv) && /compose_regen/.test(gv) && /一键重出HQ静照/.test(gv),
);
ok("generateVideo stripStillContamForBurn shared", /stripStillContamForBurn/.test(gv));
ok("generateVideo debtLedger human labels", /debtLedger/.test(gv) && /静帧弱\/跨镜污染已吸收/.test(gv));
ok("generateVideo short userMessage", /缺债已记入台账/.test(gv));
ok("generateVideo gates videoPass on fidelity", /fidelityMissesBlockAbsorb/.test(gv));

const gvp = read("src/routes/production/workbench/generateVideoPrompt.ts");
ok(
  "generateVideoPrompt heal_then_burn (no force split hard gate)",
  /heal_then_burn/.test(gvp) && !/本台不执行拆镜/.test(gvp),
);

const batch = read("src/routes/production/workbench/batchGenerateVideo.ts");
ok(
  "batch does not 400 WAREHOUSE_DEBT_SOFT_DEFER",
  !/return res\.status\(400\).*WAREHOUSE_DEBT_SOFT_DEFER/s.test(batch) && /healThenBurnAbsorbed/.test(batch),
);
ok(
  "batch absorbs 需完善 instead of skip",
  /契约债已智能吸收后继续烧/.test(batch) && !/skipReason: "TRACK_PROMPT_NOT_BURN_READY"/.test(batch),
);
ok(
  "batch absorbs contact WARN + Motion inject + pose",
  /batchHealNotes\.push\(contact\.message\)/.test(batch) &&
    /\[Motion\]/.test(batch) &&
    /姿态交接债已吸收/.test(batch),
);

const bp = read("src/routes/production/workbench/batchGeneratePrompt.ts");
ok("batch prompt no warehouse 400", /heal_then_burn：仓债不硬拒/.test(bp));

const heal = read("src/routes/ruleEngine/selfHeal.ts");
ok("selfHeal absorbs track 需完善", /trackAbsorbed/.test(heal) && /需完善/.test(heal));
ok(
  "selfHeal strips storyboard contact_zombie",
  /healThenBurnStillDebt/.test(heal) && /contaminationClass/.test(heal),
);

const absorb = read("src/ruleEngine/compilers/burnAbsorbPolicy.ts");
ok(
  "absorb allowlist includes pose/contact/mouth/i2v",
  /mayAbsorbBurnDebt/.test(absorb) &&
    /still_mouth/.test(absorb) &&
    /still_pose/.test(absorb) &&
    /still_contact/.test(absorb) &&
    /still_i2v_ready/.test(absorb),
);

const handoff = read("src/ruleEngine/qc/stillContactVideoHandoff.ts");
ok(
  "contact handoff pose degrade is WARN not BLOCK",
  /intentBend && realizationDegraded/.test(handoff) &&
    /severity: "WARN"/.test(handoff) &&
    /可烧视频/.test(handoff) &&
    !/禁止视频绿继承弯腰/.test(handoff),
);

const ladder = read("src/ruleEngine/compilers/realizationLadder.ts");
ok(
  "ladder trusts egress when no counter-evidence",
  /intent_egress_trusted/.test(ladder) && !/degrade_bend_failclosed_stand_hold/.test(ladder),
);
ok("ladder no fail-closed on localHeuristicOk", !/localHeuristicOk !== true/.test(ladder));

const resolveStill = read("src/ruleEngine/qc/resolveStillForBurn.ts");
ok(
  "resolveStill prefers bend intent over track latest alone",
  /scoreStillForBendIntent/.test(resolveStill) && /track_bend_intent/.test(resolveStill),
);

const readinessSrc = read("src/ruleEngine/qc/stillVideoReadiness.ts");
ok(
  "I2V only hard-blocks still_quality:missing",
  /still_quality:missing/.test(readinessSrc) &&
    /secondary_dominance/.test(readinessSrc) &&
    /isHardMiss/.test(readinessSrc),
);

const doctrine = read("data/fixtures/prop_form_doctrine.json");
ok("prop_form single sheet only", /单张笺面/.test(doctrine) && !/两张笺面/.test(doctrine));

console.log("PASS test-g-heal-then-burn");
