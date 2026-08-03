/**
 * Framework matrix regression — path / anti-sub / glyph / lint / pose / delta.
 * Sample names only in fixtures; production asserts no new hardcoding.
 * yarn test:g-framework-matrix
 */
import { deriveGenerationContract } from "../src/ruleEngine/design/deriveGenerationContract";
import {
  deriveStillGenerationObjective,
  applyGenerationObjectiveToPrompt,
} from "../src/ruleEngine/compilers/stillGenerationObjective";
import { deriveStillAtomContract, buildAtomStructureFills } from "../src/ruleEngine/compilers/stillAtomContract";
import { lintStillPromptBody } from "../src/ruleEngine/compilers/stillPromptLint";
import { deriveShotModalityIntent, inferHasSceneLink, inferSceneCodeFromText } from "../src/ruleEngine/compilers/shotModalityIntent";
import { buildCrossClassAntiSubstitutions } from "../src/ruleEngine/compilers/contactEventPolicy";
import {
  deriveFailureCluster,
  isIsomorphicRegen,
  literaryFillsForCluster,
  refsSignature,
} from "../src/ruleEngine/quality/failureClusterLibrary";
import { composeStillPrompt } from "../src/ruleEngine/compilers/composeStillPrompt";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error("FAIL", name, detail ?? "");
    process.exit(1);
  }
  console.log("ok", name);
}

// --- Path: sref / SCENE token ⇒ hasSceneLink (canvas parity) ---
{
  const code = inferSceneCodeFromText("特写。--sref SCENE-001 --cref CHAR-A");
  ok("inferSceneCodeFromText", code === "SCENE-001", String(code));
  ok(
    "inferHasSceneLink from sref",
    inferHasSceneLink({ promptText: "侧脸。--sref SCENE-002" }) === true,
  );
  const intent = deriveShotModalityIntent({
    visualDescription: "特写。侧脸，纸角划过面颊，烛火。",
    shotSize: "特写",
    hasSceneLink: true,
  });
  ok("soft_env when scene linked", intent.keepSoftEnvRef === true && intent.bgMode === "soft_env");
}

// --- paper_doc: anti-sub family + glyph + readable tighten ---
{
  const vd =
    "特写。女主侧脸，休书纸角划过面颊。禁口含；禁纸入口；仅颊触非口含。纸面须见字迹。";
  const contract = deriveGenerationContract({
    visualDescription: vd,
    shotSize: "特写",
    characterNames: ["女主", "配角"],
    sceneCode: "SCENE-001",
  });
  ok("objective contact_geom", contract.objectiveClass === "contact_geom");
  ok(
    "anti-sub cross class",
    contract.forbiddenSubstitutions.some((s) => /禁止以.+替代/.test(s)),
    JSON.stringify(contract.forbiddenSubstitutions),
  );
  ok(
    "glyph fact",
    contract.mustShowFacts.some((f) => f.id === "prop_glyph"),
    JSON.stringify(contract.mustShowFacts.map((f) => f.id)),
  );
  const weakPrompt = "特写。清晰入画可读。锁定微表情。禁止灰棚。";
  const weakAtom = deriveStillAtomContract({
    contract,
    visualDescription: vd,
    prompt: weakPrompt,
  });
  ok(
    "readable false-green blocked",
    weakAtom.mustFail.includes("missing_prop_readable") ||
      weakAtom.mustFail.includes("missing_prop_glyph") ||
      weakAtom.mustFail.includes("missing_anti_sub"),
    JSON.stringify(weakAtom.mustFail),
  );
  const fills = buildAtomStructureFills({ contract, visualDescription: vd, atom: weakAtom });
  const filled = `${fills.join("。")}。${weakPrompt}。${contract.forbiddenSubstitutions.join("。")}。休书纸角清晰入画。纸面须清晰可见字迹。微表情眼：冷厉。本帧冻结为纸角已触肤瞬间。`;
  const filledAtom = deriveStillAtomContract({ contract, visualDescription: vd, prompt: filled });
  ok("fills clear must atoms", filledAtom.ok, JSON.stringify(filledAtom.mustFail));
}

// --- digit_prop: glyph NOT forced ---
{
  const vd = "特写。女主摩挲扳指。";
  const contract = deriveGenerationContract({
    visualDescription: vd,
    shotSize: "特写",
    characterNames: ["女主"],
  });
  ok(
    "digit_prop no forced glyph",
    !contract.mustShowFacts.some((f) => f.id === "prop_glyph"),
    JSON.stringify(contract.mustShowFacts.map((f) => f.id)),
  );
  const anti = buildCrossClassAntiSubstitutions("digit_prop", "扳指");
  ok("digit_prop has anti-sub", anti.some((s) => /禁止以.+替代扳指/.test(s)), JSON.stringify(anti));
}

// --- cloth class ---
{
  const vd = "近景。帕角拂过面颊。";
  const contract = deriveGenerationContract({
    visualDescription: vd,
    shotSize: "近景",
    characterNames: ["女主"],
  });
  ok("cloth contact", contract.objectiveClass === "contact_geom", contract.objectiveClass);
  ok(
    "cloth anti-sub",
    contract.forbiddenSubstitutions.some((s) => /禁止以.+替代/.test(s)),
  );
}

// --- Egress lint via compose ---
{
  const dirty =
    "特写。女主侧脸，休书纸角划过面颊。正脸朝向镜头。不可读则拆持物镜+反应镜。禁止灰棚。 --sref SCENE-001";
  const composed = composeStillPrompt(
    {
      rawPrompt: dirty,
      visualDescription: "特写。女主侧脸，休书纸角划过面颊。禁口含；仅颊触非口含。",
      shotSize: "特写",
      sceneCode: "SCENE-001",
      characters: [{ name: "女主", code: "CHAR-A", hasImage: true, kind: "character" }],
      qualityMode: "hq_update",
      requireLeadAssetImage: false,
    },
    { mode: "full" },
  );
  ok("compose ok", composed.ok, composed.blockReason);
  ok("compose keepSoftEnvRef", composed.keepSoftEnvRef === true, String(composed.keepSoftEnvRef));
  ok(
    "lint dropped face conflict",
    !/正脸朝向镜头/.test(composed.prompt),
    composed.prompt.slice(0, 200),
  );
  ok(
    "lint dropped FLOW_ONLY",
    !/不可读则拆/.test(composed.prompt),
    composed.prompt.slice(0, 200),
  );
  ok(
    "anti-sub in compose prompt",
    /禁止以.+替代|禁止折扇|替代/.test(composed.prompt),
    composed.prompt.slice(0, 280),
  );
}

// --- Objective strip: no sample character name hardcode ---
{
  const vd = "特写。主角侧脸，纸角划过面颊。";
  const contract = deriveGenerationContract({
    visualDescription: vd,
    shotSize: "特写",
    characterNames: ["主角", "配角甲"],
  });
  const objective = deriveStillGenerationObjective({
    contract,
    prompt: "配角甲完整立像抢戏。正脸。",
  });
  const applied = applyGenerationObjectiveToPrompt({
    prompt: "配角甲完整立像抢戏。纸角贴颊。",
    objective,
    contract,
    visualDescription: vd,
  });
  ok("strip complete standing generic", !/完整立像/.test(applied.prompt), applied.prompt);
}

// --- Pose honesty: atoms fail ⇒ not at_locus meta policy ---
{
  const vd = "特写。纸角划过面颊。";
  const contract = deriveGenerationContract({ visualDescription: vd, shotSize: "特写" });
  const atom = deriveStillAtomContract({
    contract,
    visualDescription: vd,
    prompt: "特写。清晰入画。",
  });
  ok("pose blocked when atoms fail", !atom.ok, JSON.stringify(atom.mustFail));
}

// --- Delta / isomorphic ---
{
  ok(
    "isomorphic detect",
    isIsomorphicRegen({
      prevContractHash: "abc",
      nextContractHash: "abc",
      prevRefsSig: "b:1",
      nextRefsSig: "b:1",
    }) === true,
  );
  ok(
    "delta when hash changes",
    isIsomorphicRegen({
      prevContractHash: "abc",
      nextContractHash: "def",
      prevRefsSig: "b:1",
      nextRefsSig: "b:1",
    }) === false,
  );
  const cluster = deriveFailureCluster({
    atomMisses: ["missing_anti_sub"],
    objectiveClass: "contact_geom",
    isomorphic: true,
  });
  ok("cluster isomorphic kind", cluster?.kind === "isomorphic_regen", JSON.stringify(cluster));
  ok("refsSignature stable", refsSignature([{ base64: "AAAA" }]).startsWith("b:"));
  const litFills = literaryFillsForCluster({
    kind: "isomorphic_regen",
    hint: cluster?.hint,
    visualDescription: "烛火。纸角划过面颊。",
  });
  ok("iso literary fill no eng", litFills.every((f) => !/force_compose|delta_hash/.test(f)), litFills.join("|"));
}

// --- Lint helper ---
{
  const linted = lintStillPromptBody({
    prompt: "侧脸。正脸朝向镜头。不可读则拆持物镜。force_compose_delta_hash_or_refs。禁口含。",
    visualDescription: "侧脸。纸角划过。",
  });
  ok("lint drops eng", !/force_compose|delta_hash/.test(linted.prompt), linted.prompt);
  ok("lint face", !/正脸朝向/.test(linted.prompt));
  ok("lint flow", !/不可读则拆/.test(linted.prompt));
}

console.log("test-g-framework-matrix passed");
