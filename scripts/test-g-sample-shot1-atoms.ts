/**
 * yarn test:g-sample-shot1-atoms
 * Sample shot1 (纸角触肤): soft_env + contact atoms + no gray-studio empty portrait.
 */
import { deriveGenerationContract } from "../src/ruleEngine/design/deriveGenerationContract";
import { deriveStillGenerationObjective, applyGenerationObjectiveToPrompt } from "../src/ruleEngine/compilers/stillGenerationObjective";
import { deriveStillAtomContract } from "../src/ruleEngine/compilers/stillAtomContract";
import { assessStillVideoReadiness } from "../src/ruleEngine/qc/stillVideoReadiness";
import { applyShotAtomsOnConfirm } from "../src/ruleEngine/design/shotAtomsWriteback";
import { decideAutoRepairPolicy } from "../src/ruleEngine/quality/autoRepairPolicy";
import { deriveFailureCluster } from "../src/ruleEngine/quality/failureClusterLibrary";
import { shouldLatchBlockSilentRegen } from "../src/ruleEngine/compilers/stillErrorEnvelope";
import { resolveStillHumanRejudgeOutcome } from "../src/ruleEngine/compilers/stillQuality";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error("FAIL", name, detail ?? "");
    process.exit(1);
  }
  console.log("ok", name);
}

const vd = "特写。沈清漪侧脸，休书纸角划过面颊，纸角触肤瞬间。";
const contract = deriveGenerationContract({
  visualDescription: vd,
  shotSize: "特写",
  characterNames: ["沈清漪", "沈母"],
  sceneCode: "SCENE-001",
  sceneName: "寝殿",
  foreground: "休书纸角",
  spatialRelation: "axis=沈清漪-沈母；anchors=女主跪坐|沈母站立",
  episodeShot: {
    narrative: {},
    shotDesign: {
      composition: { foreground: "休书纸角", background: "沈母身影虚化" },
      performance: { microExpression: { eyes: "glaring" } },
      cameraAnchor: { shotSize: "CU", bgBlur: true, colorTemp: "暖光 4500K" },
    },
  },
});

ok("sceneWeight soft with SCENE", contract.sceneWeight === "soft", contract.sceneWeight);
ok("foreground must", contract.mustShowFacts.some((f) => f.id === "foreground" && f.priority === "must"), JSON.stringify(contract.mustShowFacts));
ok("color_temp must", contract.mustShowFacts.some((f) => f.id === "color_temp"), JSON.stringify(contract.mustShowFacts));

const raw =
  `${vd} 沈母站立完整立像。背景弱化。 --cref CHAR-SHENQINGYI --sref SCENE-001`;
const objective = deriveStillGenerationObjective({ contract, prompt: raw });
const applied = applyGenerationObjectiveToPrompt({
  prompt: raw,
  objective,
  contract,
  visualDescription: vd,
  characterNames: ["沈清漪"],
});
ok("keeps sref when soft", /--sref\s+SCENE-001/i.test(applied.prompt), applied.prompt);
ok("strips secondary dominance", !/沈母站立|完整立像/.test(applied.prompt), applied.prompt);
ok("keeps contact / paper", /纸角|贴合|触肤|休书/.test(applied.prompt), applied.prompt);
ok("studio ban present", /禁止灰棚|白棚|空白背景/.test(applied.prompt), applied.prompt);

const atoms = deriveStillAtomContract({
  contract,
  visualDescription: vd,
  prompt: applied.prompt,
});
ok("atoms ok for implementable prompt", atoms.ok, JSON.stringify(atoms.mustFail));

const emptyPortrait = assessStillVideoReadiness({
  stillQuality: "hq_ok",
  visualPass: true,
  promptUsed: "古言写实，特写女子侧脸，白棚头像。--cref CHAR-A",
  visualDescription: vd,
  contract,
  i2vCriticalFacts: contract.i2vCriticalFacts,
});
ok("empty portrait not i2vReady", emptyPortrait.i2vReady === false, JSON.stringify(emptyPortrait));

const ready = assessStillVideoReadiness({
  stillQuality: "hq_ok",
  visualPass: true,
  promptUsed: applied.prompt,
  visualDescription: vd,
  contract,
  i2vCriticalFacts: contract.i2vCriticalFacts,
  fidelityItems: [{ id: "contact_geom", pass: true }],
});
ok("implementable prompt can be i2vReady", ready.i2vReady === true, JSON.stringify(ready));

const atomsWb = applyShotAtomsOnConfirm({
  shots: [{ shotIndex: 1, visualDescription: vd, shotSize: "特写", sceneName: "寝殿", charCodes: ["CHAR-SHENQINGYI"] }],
  force: true,
});
ok("shotAtoms written", Array.isArray(atomsWb.shots[0]?.shotAtoms) && (atomsWb.shots[0]!.shotAtoms as unknown[]).length > 0);
ok("expandProvenance applied", atomsWb.expandProvenance.mode === "applied");

const r1 = decideAutoRepairPolicy({ round: 1, keyMissing: true, fidelityStopReason: "vlm_error", visualPass: false });
const r3 = decideAutoRepairPolicy({ round: 3, keyMissing: true, fidelityStopReason: "vlm_error", visualPass: false });
ok("round1 allows silent", r1.allowSilentRegen === true);
ok("round3 budget handoff", r3.autoRepairStage === "handoff_human" || r3.autoRepairBudgetLeft === 0, JSON.stringify(r3));

ok(
  shouldLatchBlockSilentRegen({ irdPrimaryAction: "hand_edit_vd", missingSlots: ["contactGeom"] }) === false,
  "latch not on hand_edit",
);

const humanNoBg = resolveStillHumanRejudgeOutcome({
  items: [{ id: "contact_geom", pass: true }],
  prev: { pendingHumanRejudge: true },
});
ok("human without background_readable cannot hq_ok", humanNoBg.stillQuality !== "hq_ok", JSON.stringify(humanNoBg));

const humanWithBg = resolveStillHumanRejudgeOutcome({
  items: [
    { id: "contact_geom", pass: true },
    { id: "background_readable", pass: true },
    { id: "single_frame", pass: true },
    { id: "cast_cardinality", pass: true },
    { id: "primary_look", pass: true },
  ],
});
ok("human with bg pass can hq_ok", humanWithBg.stillQuality === "hq_ok", JSON.stringify(humanWithBg));

const cluster = deriveFailureCluster({
  promptUsed: "白棚头像",
  criticalMisses: ["missing_soft_env"],
  i2vReady: false,
  stillQuality: "weak",
  objectiveClass: "contact_geom",
});
ok("gray cluster", cluster?.kind === "gray_studio", JSON.stringify(cluster));

console.log("test-g-sample-shot1-atoms passed");
