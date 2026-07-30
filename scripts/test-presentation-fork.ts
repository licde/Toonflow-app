/**
 * yarn test:presentation-fork — F12 med-confidence fork choices
 */
import { presentationForkChoices, resolvePresentationFork } from "../src/ruleEngine/design/presentationForkResolver";
import { repairActionForConfidence } from "../src/ruleEngine/quality/practiceCompleteness";

function ok(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
  console.log("✓", msg);
}

ok(resolvePresentationFork("构图难表达") === "fork-B", "spatial → fork-B");
ok(resolvePresentationFork("台词缺槽") === "fork-A", "default → fork-A");
const choices = presentationForkChoices("DEX-LIT-CONTACT-XOR spatial");
ok(choices.length === 2, "two fork choices");
ok(choices.some((c) => c.fork === "fork-A") && choices.some((c) => c.fork === "fork-B"), "A+B present");
ok(repairActionForConfidence("ird_confirm", 0.6) === "presentation_fork", "med conf → presentation_fork");
ok(repairActionForConfidence("DEX-PROP-IN-FRAME", 0.9) === "apply_auto", "high conf auto");
ok(repairActionForConfidence("unknown", 0.4) === "confirm_only", "low conf confirm");

console.log("\ntest:presentation-fork OK");
