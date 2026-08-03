/**
 * yarn test:g-shootable-architecture
 * Shootable-first + RepairAsDesign + episode heal queue + CTA SSOT smoke.
 */
import {
  slimVdForShootable,
  resolveStillPrimaryCta,
  deliveryTierFromStill,
  isTrulyUnshootable,
  buildRepairAsDesignPlan,
} from "../src/ruleEngine/design/shootableArchitecture";
import { planRepairFromFailureCluster, applyRepairAsDesignToShot } from "../src/ruleEngine/design/repairAsDesign";
import { gateStillLitDebtForHq } from "../src/ruleEngine/compilers/stillLitHqGate";
import { shouldLatchBlockSilentRegen } from "../src/ruleEngine/compilers/stillErrorEnvelope";
import { shouldBlockSilentStillRegen, resolveStillPrimaryCtaLabel } from "../docs/toonflow-web/types/stillQuality";
import { auditEpisodeStillReadiness } from "../src/ruleEngine/quality/episodeStillReadiness";
import { assertStillGenDeltaOrThrow, hashStillGenFingerprint } from "../src/ruleEngine/quality/isoRegenHardDelta";
import {
  markGenerationInflight,
  isGenerationInflight,
  runCascadeWhenIdle,
  clearGenerationInflight,
} from "../src/ruleEngine/design/genInflightGuard";

function ok(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
  console.log("✓", msg);
}

const dual =
  "特写。沈清漪休书纸角划过面颊，紧咬下唇渗出血珠。";
const slim = slimVdForShootable(dual);
ok(slim.slimmed && slim.suggestedSplit, "slim dual-contact VD");
ok(!/紧咬下唇/.test(slim.vd) && /纸未入口|颊触/.test(slim.vd), "slim keeps cheek, drops oral");

const gate = gateStillLitDebtForHq({
  visualDescription: dual,
  shotSize: "特写",
  qualityMode: "hq_update",
});
ok(gate.action === "advise" || gate.action === "pass", `lit HQ advise not block (${gate.action})`);

ok(shouldLatchBlockSilentRegen({ primaryNextStep: "split_shot" }) === false, "BE latch never bricks");
ok(shouldBlockSilentStillRegen({ primaryNextStep: "split_shot" }) === false, "FE split allows gen");
ok(shouldBlockSilentStillRegen({ debtKind: "missing_identity" }) === false, "missing identity never bricks");
ok(resolveStillPrimaryCta({ missingIdentity: true }).blocksGenerate === false, "CTA identity never blocks");
ok(resolveStillPrimaryCtaLabel({ debtKind: "missing_identity" }).blocksGenerate === false, "FE identity CTA clickable");

const cta = resolveStillPrimaryCta({ primaryNextStep: "split_shot", irdPrimaryAction: "confirm_split" });
ok(cta.kind === "split_and_generate" && cta.blocksGenerate === false, "CTA split_and_generate");
ok(resolveStillPrimaryCtaLabel({ primaryNextStep: "split_shot" }).label.includes("智拆"), "FE CTA label");

ok(deliveryTierFromStill({ stillQuality: "weak" }) === "preview", "delivery preview");
ok(deliveryTierFromStill({ stillQuality: "hq_ok", visualPass: true }) === "burn", "delivery burn");
ok(isTrulyUnshootable({ visualDescription: "ab" }).unshootable, "empty-ish vd unshootable diag");

const plan = planRepairFromFailureCluster({ kind: "contact_miss", visualDescription: "颊触" });
ok(plan.blocksGenerate === false && plan.writes.length > 0, "repair plan non-blocking");
const shot: Record<string, unknown> = { visualDescription: "颊触", packageVersion: 1 };
applyRepairAsDesignToShot(shot, plan);
ok(Number(shot.packageVersion) === 2, "repair bumps packageVersion");

const ep = auditEpisodeStillReadiness([
  { storyboardId: 1, stillQuality: "weak", visualDescription: "休书纸角划过面颊" },
  { storyboardId: 2, stillQuality: "hq_ok", visualDescription: "中景对话" },
]);
ok(ep.healQueue.length >= 1 && ep.blockers.length === 0, "episode heal queue not global brick");
ok(ep.burnableIds.includes(2), "episode keeps burnable ids");

const fp1 = hashStillGenFingerprint({ promptUsed: "a", visualDescription: "b" });
const fp2 = hashStillGenFingerprint({ promptUsed: "a", visualDescription: "b" });
ok(assertStillGenDeltaOrThrow({ prevFingerprint: fp1, nextFingerprint: fp2 }).ok === false, "iso refuse");
ok(assertStillGenDeltaOrThrow({ prevFingerprint: fp1, nextFingerprint: fp2, force: true }).ok, "iso force");

markGenerationInflight(99, "still");
ok(isGenerationInflight(99), "inflight set");
let ran = false;
const defer = runCascadeWhenIdle(99, () => {
  ran = true;
});
ok(defer.deferred && !ran, "cascade deferred while inflight");
clearGenerationInflight(99);
ok(ran && !isGenerationInflight(99), "cascade flushed on clear");

const emptyPlan = buildRepairAsDesignPlan({ writes: [], blocksBurn: false });
ok(emptyPlan.regenAfterWrite && emptyPlan.blocksGenerate === false, "empty repair plan shape");

const { resolveReverseRouteShootable, routeRequiresFixBeforeBurn } =
  require("../src/ruleEngine/design/reverseRouteShootable") as typeof import("../src/ruleEngine/design/reverseRouteShootable");
const rr = resolveReverseRouteShootable("still_onebeat_multi");
ok(rr.blocksGenerate === false, "reverse route never blocks generate");
ok(routeRequiresFixBeforeBurn("still_onebeat_multi") === true, "onebeat requireFixBeforeBurn");

console.log("\ntest:g-shootable-architecture OK");
