/**
 * Seal: eng tokens never reach vendor egress; paper roll bans; refs budget; cheek locus; literary fills.
 * yarn test:g-egress-no-eng-leak
 */
import { lintStillPromptBody } from "../src/ruleEngine/compilers/stillPromptLint";
import { buildPropFormInjectFromVd, getPropFormDoctrine } from "../src/ruleEngine/compilers/propFormDoctrine";
import {
  applyEventRefSlotBudget,
  buildEventRefOrdinalBinding,
  assertEventRefContract,
} from "../src/ruleEngine/compilers/eventPlateReadiness";
import {
  deriveFailureCluster,
  literaryFillsForCluster,
  isIsomorphicRegen,
} from "../src/ruleEngine/quality/failureClusterLibrary";
import { buildStillErrorEnvelope } from "../src/ruleEngine/compilers/stillErrorEnvelope";
import { deriveGenerationContract } from "../src/ruleEngine/design/deriveGenerationContract";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error("FAIL", name, detail ?? "");
    process.exit(1);
  }
  console.log("ok", name);
}

function main() {
  // ENG leak
  const dirty =
    "特写。女主侧脸。force_compose_delta_hash_or_refs。inject_cross_class_anti_sub+prop_soft_plate。休书纸角划过面颊。";
  const linted = lintStillPromptBody({ prompt: dirty, visualDescription: "休书纸角划过面颊。烛火。" });
  ok("no force_compose", !/force_compose/i.test(linted.prompt), linted.prompt);
  ok("no delta_hash", !/delta_hash/i.test(linted.prompt), linted.prompt);
  ok("no inject_cross eng", !/inject_cross_class/i.test(linted.prompt), linted.prompt);
  ok("kept literary cheek", /面颊|休书|纸角/.test(linted.prompt), linted.prompt);

  const cluster = deriveFailureCluster({ isomorphic: true, atomMisses: ["propPlateMissing"], objectiveClass: "contact_geom" });
  ok("cluster hint is eng token", /force_compose|hash_or_refs/.test(String(cluster?.hint)), cluster?.hint);
  const fills = literaryFillsForCluster({
    kind: cluster?.kind,
    hint: cluster?.hint,
    atomMisses: ["propPlateMissing"],
    visualDescription: "殿内烛火。休书划过面颊。",
  });
  ok("literary fills chinese", fills.some((f) => /薄纸片|道具/.test(f)), fills.join("|"));
  ok("literary fills no eng", fills.every((f) => !/force_compose|delta_hash|propSoftPlate/.test(f)), fills.join("|"));

  // Paper roll / cheek
  const paper = getPropFormDoctrine("paper_doc");
  ok("forbid 纸卷/卷棒", (paper?.formForbid ?? []).some((f) => /纸卷|卷棒/.test(f)));
  const inject = buildPropFormInjectFromVd("特写。女主侧脸，休书纸角划过面颊。禁口含。");
  ok("form bans roll baton", inject.forbidden.some((f) => /纸卷|卷棒|筒状/.test(f)), JSON.stringify(inject.forbidden));
  ok("cheek bans 抵颏", /抵颏|贴颏|近口/.test(`${inject.poseFact ?? ""}${inject.forbidden.join("")}`), JSON.stringify(inject));

  const contract = deriveGenerationContract({
    visualDescription: "特写。女主侧脸，休书纸角划过面颊。殿内烛火。",
    shotSize: "特写",
    characterNames: ["女主"],
    sceneCode: "SCENE-001",
  });
  ok(
    "contract forbids 卷棒 or 纸卷",
    contract.forbiddenSubstitutions.some((s) => /卷棒|纸卷|书本|卷轴/.test(s)) ||
      contract.mustShowFacts.some((f) => f.id === "prop_form" && /卷棒|纸卷|薄纸片/.test(f.text)),
    JSON.stringify(contract.mustShowFacts.concat(contract.forbiddenSubstitutions as unknown as { id: string; text: string }[])),
  );

  // Refs budget: cap=2 keeps prop, drops softEnv
  const refs = [
    { type: "image" as const, base64: "AAA", role: "identity" as const },
    { type: "image" as const, base64: "BBB", role: "propSoft" as const },
    { type: "image" as const, base64: "CCC", role: "softEnv" as const },
  ];
  const tight = applyEventRefSlotBudget({ refs, propRequired: true, maxSlots: 2 });
  ok("cap2 has prop", tight.roles.includes("propSoft"), tight.roles.join(","));
  ok("cap2 has identity", tight.roles.includes("identity"), tight.roles.join(","));
  ok("cap2 dropped soft (raw budget)", tight.droppedSoftEnv && !tight.roles.includes("softEnv"), tight.roles.join(","));
  // Continuity bake recovery covered by test:g-softenv-bake
  const full = applyEventRefSlotBudget({ refs, propRequired: true, maxSlots: 3 });
  ok("cap3 has soft", full.roles.includes("softEnv"), full.roles.join(","));

  const bind = buildEventRefOrdinalBinding({
    roles: full.roles,
    propRequired: true,
    thinSheets: true,
  });
  ok("图1 identity", /图1=身份脸/.test(bind), bind);
  ok("图2 prop thin", /图2=.*薄纸角|图2=.*薄纸片/.test(bind), bind);
  ok("图3 soft", /图3=软环境/.test(bind), bind);

  const assertOk = assertEventRefContract({ roles: tight.roles, propRequired: true });
  ok("assert prop ok under cap2", assertOk.ok);

  const assertFail = assertEventRefContract({ roles: ["identity", "softEnv"], propRequired: true });
  ok("assert missing prop", !assertFail.ok && assertFail.code === "DEX-PROP-PLATE-MISSING");

  // Debt semantics envelopes
  const formEnv = buildStillErrorEnvelope({ code: "PROP-FORM", errMsg: "卷棒抵颏" });
  ok("form CTA 重出形态", formEnv.ctaLabel.includes("形态") || formEnv.ctaLabel.includes("重出"), formEnv.ctaLabel);
  const keyEnv = buildStillErrorEnvelope({ code: "KEY-UNMEASURED", errMsg: "Key未测" });
  ok("key CTA 人审", /人审|未测/.test(keyEnv.ctaLabel), keyEnv.ctaLabel);
  ok("key msg not 缺约束", !/没写约束|无约束/.test(keyEnv.userMessage), keyEnv.userMessage);

  ok(
    "isomorphic detect",
    isIsomorphicRegen({
      prevContractHash: "a",
      nextContractHash: "a",
      prevRefsSig: "b",
      nextRefsSig: "b",
    }),
  );
  ok(
    "force delta breaks iso",
    !isIsomorphicRegen({
      prevContractHash: "a",
      nextContractHash: "a",
      prevRefsSig: "b",
      nextRefsSig: "b",
      forceDelta: true,
    }),
  );

  console.log("test-g-egress-no-eng-leak passed");
}

main();
