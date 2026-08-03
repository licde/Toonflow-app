/**
 * Prop form doctrine — thin sheets vs book, glyph visualization (generic).
 * yarn test:g-prop-form-doctrine
 */
import {
  buildPropFormInjectFromVd,
  getPropFormDoctrine,
  resolveGlyphTextFromVd,
  assertDoctrineCoversPolicyClasses,
} from "../src/ruleEngine/compilers/propFormDoctrine";
import { deriveGenerationContract } from "../src/ruleEngine/design/deriveGenerationContract";
import { deriveStillAtomContract } from "../src/ruleEngine/compilers/stillAtomContract";
import { deriveStillGenerationObjective } from "../src/ruleEngine/compilers/stillGenerationObjective";
import { synthesizePropSoftPlate, resolvePropPlateLabel } from "../src/ruleEngine/compilers/eventPlateReadiness";
import sharp from "sharp";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error("FAIL", name, detail ?? "");
    process.exit(1);
  }
  console.log("ok", name);
}

async function main() {
  ok("doctrine covers policy classes", assertDoctrineCoversPolicyClasses().length === 0, assertDoctrineCoversPolicyClasses().join(","));

  const paperD = getPropFormDoctrine("paper_doc");
  ok("paper thin sheets hint", paperD?.softPlateHint === "thin_sheets");
  ok("paper forbids book", (paperD?.formForbid ?? []).some((f) => /书本|卷轴/.test(f)));
  ok("paper forbids 纸卷/卷棒", (paperD?.formForbid ?? []).some((f) => /纸卷|卷棒/.test(f)));
  ok("paper formMust thin expanded", /展开.*薄纸片|薄纸片/.test(paperD?.formMust ?? ""), paperD?.formMust);
  ok("paper single sheet only", /单张笺面/.test(paperD?.formPositive?.size ?? "") && !/两张/.test(paperD?.formPositive?.size ?? ""), paperD?.formPositive?.size);

  const vd = "特写。女主侧脸，休书纸角划过面颊。禁口含。";
  const inject = buildPropFormInjectFromVd(vd);
  ok("glyph 休书 from alias", inject.glyphText === "休书", inject.glyphText);
  ok("form fact thin paper", /薄纸片|笺面/.test(inject.formFact ?? ""), inject.formFact);
  ok("glyph fact quotes", /「休书」/.test(inject.glyphFact ?? ""), inject.glyphFact);
  ok("forbid book/scroll", inject.forbidden.some((s) => /书本|卷轴/.test(s)), JSON.stringify(inject.forbidden));
  ok("cheek locus bans 抵颏", /抵颏|贴颏|近口/.test(`${inject.poseFact ?? ""}${inject.forbidden.join("")}`));

  const contract = deriveGenerationContract({
    visualDescription: vd,
    shotSize: "特写",
    characterNames: ["女主"],
    sceneCode: "SCENE-001",
  });
  ok(
    "contract prop_form",
    contract.mustShowFacts.some((f) => f.id === "prop_form"),
    JSON.stringify(contract.mustShowFacts.map((f) => f.id)),
  );
  ok(
    "contract prop_glyph quoted",
    contract.mustShowFacts.some((f) => f.id === "prop_glyph" && /「休书」/.test(f.text)),
    JSON.stringify(contract.mustShowFacts.filter((f) => f.id === "prop_glyph")),
  );
  ok(
    "contract forbid book form",
    contract.forbiddenSubstitutions.some((s) => /书本|卷轴|厚本/.test(s)),
    JSON.stringify(contract.forbiddenSubstitutions),
  );

  const objective = deriveStillGenerationObjective({ contract, prompt: "流程：失败后拆镜。" });
  ok("lead has form or glyph", /薄纸片|「休书」|纸角/.test(objective.promptLead), objective.promptLead);

  const atom = deriveStillAtomContract({
    contract,
    visualDescription: vd,
    prompt: objective.promptLead,
  });
  ok("atom form/glyph present path", !atom.mustFail.includes("missing_prop_form"), JSON.stringify(atom.mustFail));

  // cloth: no forced glyph quote
  const clothInj = buildPropFormInjectFromVd("近景。帕角拂过面颊。");
  ok("cloth no glyph required fact unless declared", !clothInj.glyphFact || !/「/.test(clothInj.glyphFact ?? ""));

  const label = resolvePropPlateLabel({ visualDescription: vd, contract });
  ok("label softPlateHint thin_sheets", label.softPlateHint === "thin_sheets");
  const synth = await synthesizePropSoftPlate({
    propClassId: label.propClassId,
    canonical: label.canonical,
    glyphText: label.glyphText,
    softPlateHint: label.softPlateHint,
  });
  ok("synth thin sheets kind", /thin_sheets/.test(synth.kind), synth.kind);
  const meta = await sharp(Buffer.from(synth.base64, "base64")).metadata();
  ok("synth jpeg", meta.format === "jpeg");

  ok(
    "glyph resolve digit",
    resolveGlyphTextFromVd({ visualDescription: "摩挲扳指", propClassId: "digit_prop" }).length >= 1,
  );

  console.log("test-g-prop-form-doctrine passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
