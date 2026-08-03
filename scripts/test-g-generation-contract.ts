import { deriveGenerationContract } from "../src/ruleEngine/design/deriveGenerationContract";
import { deriveStillGenerationObjective, applyGenerationObjectiveToPrompt } from "../src/ruleEngine/compilers/stillGenerationObjective";
import { guardStillPromptFoundations } from "../src/ruleEngine/compilers/stillPromptFoundationGuard";
import { assessStillVideoReadiness } from "../src/ruleEngine/qc/stillVideoReadiness";
import { lintStillPromptBody } from "../src/ruleEngine/compilers/stillPromptLint";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error("FAIL", name, detail ?? "");
    process.exit(1);
  }
  console.log("ok", name);
}

const contract = deriveGenerationContract({
  visualDescription: "特写。沈清漪侧脸，休书纸角划过面颊。禁口含；禁纸入口；仅颊触非口含。",
  shotSize: "特写",
  characterNames: ["沈清漪", "沈母"],
  spatialRelation: "axis=沈清漪-沈母 anchors=女主跪坐|沈母站立",
  sceneCode: "SCENE-001",
});

ok("contract has mustShowFacts", contract.mustShowFacts.length > 0, JSON.stringify(contract));
ok("contract objective contact", contract.objectiveClass === "contact_geom", contract.objectiveClass);

const objective = deriveStillGenerationObjective({
  contract,
  prompt: "背景弱化。流程：失败后拆镜。",
});
ok("objective lead contact first", /贴合|划过接触|道具/.test(objective.promptLead), objective.promptLead);

const readiness = assessStillVideoReadiness({
  stillQuality: "hq_ok",
  visualPass: true,
  sheetLeak: false,
  fidelityItems: [{ id: "contact_geom", pass: true }],
  promptUsed: objective.promptLead,
});
ok("readiness pass", readiness.i2vReady === true, JSON.stringify(readiness));

const cheekVd =
  "特写。沈清漪侧脸，休书纸角划过面颊。纸未入口；仅颊触非口含。（可见度：面颊浅痕可见）。禁口含；禁纸入口。";
const cheekOriginal =
  `${cheekVd} 沈母站立完整立像抢占半幅画面。本镜主look以「沈清漪」定妆为准。锁定脸型禁止重塑五官。单镜头成片，禁四视图。 --cref CHAR-SHENQINGYI --sref SCENE-001`;
const cheekContract = deriveGenerationContract({
  visualDescription: cheekVd,
  shotSize: "特写",
  characterNames: ["沈清漪", "沈母"],
  spatialRelation: "axis=沈清漪-沈母 anchors=女主跪坐|沈母站立",
});
const cheekObjective = deriveStillGenerationObjective({ contract: cheekContract, prompt: cheekOriginal });
const cheekApplied = applyGenerationObjectiveToPrompt({
  prompt: cheekOriginal,
  objective: cheekObjective,
  contract: cheekContract,
  visualDescription: cheekVd,
  characterNames: ["沈清漪", "沈母"],
});
ok("foundation keeps mouth xor", /禁口含/.test(cheekApplied.prompt) && /禁纸入口|纸未入口/.test(cheekApplied.prompt), cheekApplied.prompt);
ok("foundation keeps cref", /--cref\s+CHAR-SHENQINGYI/i.test(cheekApplied.prompt), cheekApplied.prompt);
ok("foundation strips secondary dominance", !/沈母站立|完整立像/.test(cheekApplied.prompt), cheekApplied.prompt);
ok("foundation keeps contact lead", /贴合|划过接触|纸角/.test(cheekApplied.prompt), cheekApplied.prompt);

const linted = lintStillPromptBody({
  prompt: cheekApplied.prompt,
  visualDescription: cheekVd,
});
ok("lint preserves foundation after guard", /禁口含/.test(linted.prompt) && /--cref/i.test(linted.prompt), linted.prompt);

const guardOnly = guardStillPromptFoundations({
  prompt: "特写。纸角贴颊。",
  originalPrompt: cheekOriginal,
  visualDescription: cheekVd,
  contract: cheekContract,
  characterNames: ["沈清漪", "沈母"],
});
ok("guard restores stripped basics", guardOnly.restored.length > 0, JSON.stringify(guardOnly.restored));
ok("guard restores mouth ban", /禁口含/.test(guardOnly.prompt), guardOnly.prompt);

console.log("test-g-generation-contract passed");
