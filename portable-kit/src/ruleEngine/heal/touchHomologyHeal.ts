/**
 * Homology heal-until-clear (design ↔ import/touch same kernel).
 * Success = detectors PASS (not demote/WARN). Mutates bundle in place.
 */
import type { ScriptBundle } from "../bundle/types";
import { undeclaredEmptyFxShotIndexes } from "../bundle/designExportHelpers";
import { absorbLiteraryDialogueExtrasOnBundle } from "../design/absorbLiteraryDialogueExtras";
import { dialogueCoverageReport } from "../design/dialogueCoverage";
import { declareF0OnBundle } from "../import/declareF0";

export type HomologyHealResult = {
  cleared: boolean;
  absorbed: number;
  strippedNoise: number;
  extrasLeft: number;
  f0Declared: number[];
  undeclaredFxLeft: number;
  clearedRuleIds: string[];
  residualRuleIds: string[];
};

const MAX_ROUNDS = 3;

/**
 * F0 empty FX + strip noise + absorb literary EXTRA into dialoguePlan.
 * Loops until dialogue extras=0 and no undeclared empty FX (or max rounds).
 */
export function softHealTouchHomology(
  bundle: ScriptBundle,
  opts?: { maxAbsorb?: number; maxRounds?: number },
): HomologyHealResult {
  const maxRounds = opts?.maxRounds ?? MAX_ROUNDS;
  const maxAbsorb = opts?.maxAbsorb ?? 48;
  let absorbed = 0;
  let strippedNoise = 0;
  let f0Declared: number[] = [];
  let extrasLeft = 0;
  let undeclaredFxLeft = 0;

  for (let round = 0; round < maxRounds; round++) {
    if (undeclaredEmptyFxShotIndexes(bundle).length) {
      const f0 = declareF0OnBundle(bundle);
      f0Declared = [...new Set([...f0Declared, ...f0.declared])];
    }

    const abs = absorbLiteraryDialogueExtrasOnBundle(bundle, { maxAbsorb });
    absorbed += abs.absorbed;
    strippedNoise += abs.strippedNoise;
    extrasLeft = abs.extrasLeft;

    undeclaredFxLeft = undeclaredEmptyFxShotIndexes(bundle).length;
    const shots = (bundle.preDesignPack?.shots ?? []) as unknown[];
    const cov = dialogueCoverageReport({
      script: String(bundle.script ?? ""),
      planData: bundle.planData,
      shots,
    });
    extrasLeft = cov.extraCount;

    if (extrasLeft === 0 && undeclaredFxLeft === 0) break;
    if (abs.absorbed === 0 && abs.strippedNoise === 0 && f0Declared.length === 0 && round > 0) break;
  }

  undeclaredFxLeft = undeclaredEmptyFxShotIndexes(bundle).length;
  const shots = (bundle.preDesignPack?.shots ?? []) as unknown[];
  const cov = dialogueCoverageReport({
    script: String(bundle.script ?? ""),
    planData: bundle.planData,
    shots,
  });
  extrasLeft = cov.extraCount;

  const clearedRuleIds: string[] = [];
  const residualRuleIds: string[] = [];
  if (extrasLeft === 0) clearedRuleIds.push("DC-01-EXTRA", "H3");
  else residualRuleIds.push("DC-01-EXTRA", "H3");
  if (undeclaredFxLeft === 0) clearedRuleIds.push("FX-GRADE-01");
  else residualRuleIds.push("FX-GRADE-01");

  // On-camera dialogue + none/silent → subtle (NO-LIP-DIALOGUE)
  try {
    const { softHealNoLipDialogueOnBundle } =
      require("../quality/resolveLipSyncPolicy") as typeof import("../quality/resolveLipSyncPolicy");
    const lip = softHealNoLipDialogueOnBundle(bundle);
    if (lip.upgraded > 0) clearedRuleIds.push("NO-LIP-DIALOGUE");
  } catch {
    /* optional */
  }

  // Video homology: pseudo lines / orphan lip / IRD patches / viral mediate (until-clear)
  try {
    const pack = bundle.preDesignPack as { shots?: Record<string, unknown>[] } | undefined;
    const shots = pack?.shots;
    if (Array.isArray(shots) && shots.length) {
      const { softHealVideoHomologyOnShots } =
        require("./videoHomologyHeal") as typeof import("./videoHomologyHeal");
      const vh = softHealVideoHomologyOnShots({ shots });
      if (pack) pack.shots = vh.shots;
      if (vh.cleared) {
        clearedRuleIds.push(
          "DEX-VID-PSEUDO-LINE",
          "DEX-VID-VOICE-MODE",
          "DEX-VID-MOTION-VERB",
          "DEX-VID-CAM-MEDIATE",
        );
      } else if (vh.heals.length || vh.findings.length) {
        for (const f of vh.findings) residualRuleIds.push(f.id);
        if (!vh.findings.length) residualRuleIds.push("DEX-VID-RESIDUAL");
      }
      if (vh.confirmRequired) residualRuleIds.push("DEX-VID-CAM-MEDIATE");
    }
  } catch {
    /* optional video heal */
  }

  return {
    cleared: extrasLeft === 0 && undeclaredFxLeft === 0,
    absorbed,
    strippedNoise,
    extrasLeft,
    f0Declared,
    undeclaredFxLeft,
    clearedRuleIds: [...new Set(clearedRuleIds)],
    residualRuleIds: [...new Set(residualRuleIds)],
  };
}

/** Alias — plan / call sites may use either name. */
export const touchHomologyHeal = softHealTouchHomology;
