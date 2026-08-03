/**
 * Trace why exit still lists DEX-PROP-CONT after seal on real sample.
 */
import fs from "fs";
import { sealThemeGlueUntilClear } from "../src/ruleEngine/design/sealThemeGlueUntilClear";
import { auditPropContinuity, hydrateShotsPropState } from "../src/ruleEngine/compilers/propContinuitySsot";
import { planFromBundleForDesignExit, deepCloneJson } from "../src/ruleEngine/design/planFromBundleForDesignExit";
import { runDesignExitGate } from "../src/ruleEngine/design/designExitGate";
import { applyDesignAutoCloseToBundle } from "../src/ruleEngine/design/designAutoClose";
import { prepareBundleForInspect } from "../src/ruleEngine/bundle/prepareBundleForInspect";

const path =
  process.argv[2] ||
  String.raw`C:\Users\PC\.cursor\projects\i-toonflow-new-Toonflow-app\uploads\c__Users_PC_Downloads_deepseek_json_20260730_0e8e29-L1-L494-0.json`;

const raw = JSON.parse(fs.readFileSync(path, "utf8"));
const prep = prepareBundleForInspect(raw, { forceExpand: false });
const bundle = prep.bundle;

const ac = applyDesignAutoCloseToBundle(bundle, { stageId: "SB", maxRounds: 5, forceExpand: false });
console.log("autoClose cleared", ac.autoClosed.clearedIds);
console.log("autoClose remaining", ac.autoClosed.remainingFailedIds);
console.log("autoClose exitFailed", ac.autoClosed.exitGate?.failedIds);

const seal = sealThemeGlueUntilClear(bundle);
console.log("seal", seal);
console.log(
  "shots propState",
  (bundle.preDesignPack?.shots ?? []).map((s: { shotIndex?: number; propState?: string; narrative?: { propState?: string } }) => ({
    i: s.shotIndex,
    ps: s.propState || s.narrative?.propState || "",
  })),
);

const planView = deepCloneJson(planFromBundleForDesignExit(bundle));
const pd = (planView.planData ?? planView) as {
  preDesignPack?: { shots?: Record<string, unknown>[] };
};
const shots = (pd.preDesignPack?.shots ?? []) as Record<string, unknown>[];
const rawShots = shots.map((s, i) => {
  const narrPs = (s.narrative as { propState?: string } | undefined)?.propState;
  return {
    shotIndex: Number(s.shotIndex) || i + 1,
    visualDescription: String(s.visualDescription ?? ""),
    sceneName: String(s.sceneName ?? ""),
    transitionType: String(s.transitionType ?? (s.narrative as { transitionType?: string })?.transitionType ?? ""),
    propState: String(s.propState ?? narrPs ?? ""),
    shotSize: String(s.shotSize ?? ""),
  };
});
console.log("planView propStates", rawShots.map((s) => ({ i: s.shotIndex, ps: s.propState, sc: s.sceneName, tr: s.transitionType })));
const hydrated = hydrateShotsPropState(rawShots);
const findings = auditPropContinuity(hydrated);
console.log(
  "findings",
  findings.map((f) => ({ sev: f.severity, rule: f.ruleId, i: f.shotIndex, m: f.message.slice(0, 60) })),
);
console.log("BLOCKs", findings.filter((f) => f.severity === "BLOCK").length);

const exit = runDesignExitGate("SB", planView, { chatStrict: false });
console.log("exit ok", exit.ok);
console.log(
  "exit failed theme",
  exit.failedIds.filter((id) => /PROP|INTENT|FALSE|CAM|IRD/.test(id)),
);
console.log(
  "exit warnings theme",
  exit.warnings.filter((w) => /PROP|INTENT/.test(w)).slice(0, 20),
);
