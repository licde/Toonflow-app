/**
 * yarn test:g-prompt-fidelity-heal
 * Untitled-2 path: missing anchors → inject dual-write → no BLOCK gate.
 */
import { healPromptFidelityAnchors, bodyCoversToken } from "../src/ruleEngine/design/healPromptFidelityAnchors";
import { assertPromptDesignFidelity } from "../src/ruleEngine/quality/assertPromptDesignFidelity";
import { composeStillPrompt } from "../src/ruleEngine/compilers/composeStillPrompt";
import { shouldBlockSilentStillRegen, resolveStillPrimaryCtaLabel } from "../docs/toonflow-web/types/stillQuality";
import { resolveStillPrimaryCta } from "../src/ruleEngine/design/shootableArchitecture";
import { auditUntilClearMounts } from "../src/ruleEngine/quality/untilClearRuntime";
import { readFixtureJson } from "../src/ruleEngine/utils/fixturesPath";

function ok(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
  console.log("✓", msg);
}

const vd = "沈清漪端坐太师椅摩挲扳指";
const thinBody = "沈清漪端坐，室内光影。"; // hits 端坐 only → 1/2

const missed = healPromptFidelityAnchors({
  visualDescription: vd,
  visualBody: thinBody,
  knownNames: ["沈清漪"],
});
ok(missed.injected.length >= 1 || missed.ok, "heal injects or already ok");
ok(missed.sources.some((s) => /repair\.fidelity/.test(s)) || missed.ok, "heal sources tagged");
ok(bodyCoversToken(missed.visualBody, "端坐"), "body covers 端坐");
const after = assertPromptDesignFidelity({
  shot: { visualDescription: missed.visualDescription || vd, charCodes: ["CHAR-001"] },
  knownNames: ["沈清漪"],
  imagePrompt: missed.visualBody,
  stage: "compose",
  fidelityHard: false,
});
ok(
  !after.findings.some((f) => f.id === "PROMPT-FIDELITY" && f.severity === "BLOCK"),
  "no BLOCK severity after heal",
);
ok(
  after.findings.every((f) => f.severity !== "BLOCK") || after.ok,
  "chain ok or non-BLOCK debts only",
);

const composed = composeStillPrompt({
  rawPrompt: "",
  visualDescription: "沈清漪端坐太师椅抄书",
  qualityMode: "hq_update",
  characters: [{ name: "沈清漪", code: "CHAR-001", hasImage: true }],
});
ok(composed.ok, "compose seating ok (no hqBlock)");
ok(!composed.sources.includes("entity.anchors.omitMustAppearHq"), "omitMustAppearHq removed");
ok(
  /必须出现|场面锚点|端坐|太师椅/.test(composed.visualBody || composed.prompt || ""),
  "egress keeps anchors",
);

ok(shouldBlockSilentStillRegen({ debtKind: "missing_identity" }) === false, "identity never bricks FE");
ok(resolveStillPrimaryCtaLabel({ debtKind: "missing_identity" }).blocksGenerate === false, "CTA never blocks");
ok(resolveStillPrimaryCta({ missingIdentity: true }).blocksGenerate === false, "BE CTA never blocks");
ok(resolveStillPrimaryCtaLabel({ debtKind: "prompt_fidelity" }).label.includes("锚点"), "fidelity CTA");

const defer = readFixtureJson<{ DEFERRED_UNTIL_CLEAR_CLASSES: string[] }>("until_clear_deferred_classes.json", {
  DEFERRED_UNTIL_CLEAR_CLASSES: [],
});
ok(!defer.DEFERRED_UNTIL_CLEAR_CLASSES.includes("PROMPT_FIDELITY"), "PROMPT_FIDELITY not deferred");
ok(!defer.DEFERRED_UNTIL_CLEAR_CLASSES.includes("IDENTITY_PLATE"), "IDENTITY_PLATE not deferred");

const mounts = auditUntilClearMounts({ deferClassIds: defer.DEFERRED_UNTIL_CLEAR_CLASSES });
ok(!mounts.falseMounts.includes("PROMPT_FIDELITY"), "PROMPT_FIDELITY handler live");
ok(!mounts.falseMounts.includes("IDENTITY_PLATE"), "IDENTITY_PLATE handler live");

const wave = readFixtureJson<{ waves: { W1: { status: string } } }>("until_clear_wave_roadmap.json", {
  waves: { W1: { status: "" } },
});
ok(wave.waves.W1.status === "live", "W1 roadmap live");

console.log("\ntest:g-prompt-fidelity-heal OK");
