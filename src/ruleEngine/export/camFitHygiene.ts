/**
 * Cam-fit until-clear: loop high-conf speak+react splits until auditCam is clean or Confirm.
 */
import type { ScriptBundle } from "../bundle/types";
import {
  diagnoseStillIntent,
  applyStillIntentPatches,
} from "../design/stillIntentReverse";
import { reindexDerivedTables } from "../bundle/reindexDerivedTables";
import { auditCamShootableFit } from "../quality/camShootableFit";

export type CamFitUntilClearResult = {
  applied: number;
  refused: number;
  remainingMustSplit: number;
  rounds: number;
  confirmRequired: boolean;
};

const DEFAULT_MAX_ROUNDS = 5;

function countCamMustSplit(shots: Record<string, unknown>[]): number {
  let n = 0;
  for (const s of shots) {
    const cam = auditCamShootableFit(s);
    if (cam.healHint === "split" || cam.findings.some((f) => f.id === "DEX-CAM-FIT" && f.severity === "BLOCK")) {
      n++;
    }
  }
  return n;
}

/**
 * Run cam-fit split until zero DEX-CAM-FIT must-split, or residual → IRD-CONFIRM.
 * chatStrict / proposeOnly: diagnose only, no invent.
 */
export function runCamFitUntilClear(
  bundle: ScriptBundle,
  opts?: {
    maxRounds?: number;
    chatStrict?: boolean;
    autoMinConfidence?: number;
  },
): CamFitUntilClearResult {
  const pack = bundle.preDesignPack as { shots?: Record<string, unknown>[] } | undefined;
  let shots = [...((pack?.shots ?? []) as Record<string, unknown>[])];
  if (!shots.length) {
    return { applied: 0, refused: 0, remainingMustSplit: 0, rounds: 0, confirmRequired: false };
  }

  const maxRounds = opts?.maxRounds ?? DEFAULT_MAX_ROUNDS;
  const autoMin = opts?.autoMinConfidence ?? 0.7;
  const chatStrict = Boolean(opts?.chatStrict);
  let appliedTotal = 0;
  let refusedTotal = 0;
  let rounds = 0;

  if (chatStrict) {
    const remaining = countCamMustSplit(shots);
    if (remaining > 0) {
      (bundle as { irdConfirmRequired?: boolean }).irdConfirmRequired = true;
      const meta = ((bundle as { meta?: Record<string, unknown> }).meta ??= {});
      meta.irdConfirmRequired = true;
      meta.camFitChatStrictBlocked = true;
    }
    return {
      applied: 0,
      refused: remaining,
      remainingMustSplit: remaining,
      rounds: 0,
      confirmRequired: remaining > 0,
    };
  }

  for (let r = 0; r < maxRounds; r++) {
    rounds = r + 1;
    const remainingBefore = countCamMustSplit(shots);
    if (remainingBefore === 0) break;

    const diagnose = diagnoseStillIntent(shots, {
      bundle,
      planData: (bundle.planData as Record<string, unknown>) ?? {},
      autoMinConfidence: autoMin,
    });
    const camPatches = diagnose.patches.filter((p) => p.op === "split_speak_react");
    const autoIds = camPatches
      .filter((p) => p.confidence >= autoMin && !(p.after as { refuse?: boolean })?.refuse)
      .map((p) => p.id);

    if (!autoIds.length) {
      refusedTotal += camPatches.length || remainingBefore;
      break;
    }

    const result = applyStillIntentPatches(shots, diagnose, {
      patchIds: autoIds,
      forceApply: false,
      autoMinConfidence: autoMin,
      planData: (bundle.planData as Record<string, unknown>) ?? {},
      meta: ((bundle as { meta?: Record<string, unknown> }).meta ??= {}),
    });

    shots = result.shots;
    appliedTotal += result.applied.length;
    refusedTotal += result.refused.length;
    if (pack) pack.shots = shots as never;

    try {
      reindexDerivedTables(bundle);
    } catch {
      /* optional */
    }
    // Re-mirror plan → shots but speak children stay exempt (normalizePreDesignPack)
    try {
      const { mirrorDialoguePlanToShots } =
        require("../bundle/normalizePreDesignPack") as typeof import("../bundle/normalizePreDesignPack");
      mirrorDialoguePlanToShots(bundle);
    } catch {
      /* optional */
    }
    shots = [...((pack?.shots ?? []) as Record<string, unknown>[])];

    if (!result.applied.length) break;
  }

  const remainingMustSplit = countCamMustSplit(shots);
  const confirmRequired = remainingMustSplit > 0;
  if (confirmRequired) {
    (bundle as { irdConfirmRequired?: boolean }).irdConfirmRequired = true;
    const meta = ((bundle as { meta?: Record<string, unknown> }).meta ??= {});
    meta.irdConfirmRequired = true;
  }
  if (appliedTotal > 0) {
    const meta = ((bundle as { meta?: Record<string, unknown> }).meta ??= {});
    meta.exportCamFitHygiene = true;
    meta.camFitUntilClear = { applied: appliedTotal, rounds, remainingMustSplit };
  }

  return {
    applied: appliedTotal,
    refused: refusedTotal,
    remainingMustSplit,
    rounds,
    confirmRequired,
  };
}

/** @deprecated Prefer runCamFitUntilClear — one-shot wrapper kept for callers. */
export function applyCamFitHygieneOnExport(bundle: ScriptBundle): CamFitUntilClearResult {
  return runCamFitUntilClear(bundle, { maxRounds: DEFAULT_MAX_ROUNDS });
}
