/**
 * M17 — migrate dirty in-production packages: match + same-kernel split + stamps.
 */
import { healMisboundDialoguePlacement } from "./dialoguePlacementMatch";
import { runSplitOrchestrator } from "./splitOrchestrator";
import { detectLipSplitPressure } from "./lipSplit";
import { scoreSplitConfidence } from "./splitConfidenceSsot";

export type StockLipMigrateResult = {
  beforePressure: number;
  afterPressure: number;
  shotCountBefore: number;
  shotCountAfter: number;
  log: { step: string; count?: number; detail?: string }[];
  lipConfirmRequired: boolean;
  confirmRequired: boolean;
  healFailed?: string;
};

export function migrateStockLipPackage(plan: Record<string, unknown>): StockLipMigrateResult {
  const pd = (plan.planData ??= {}) as Record<string, unknown>;
  const pack = (pd.preDesignPack ??= { shots: [] }) as { shots: Record<string, unknown>[] };
  const before = pack.shots ?? [];
  const beforePressure = before.filter((s) => detectLipSplitPressure(s).mustConfirm).length;

  const healed = healMisboundDialoguePlacement(before);
  const conf = scoreSplitConfidence({
    lineCount: beforePressure,
    propCuConflict: healed.remainingPressure > 0,
    hasDifferentiatedVd: true,
  });

  if (!conf.autoEligible && beforePressure > 0) {
    pack.shots = healed.shots;
    pd.preDesignPack = pack;
    (pd.meta as Record<string, unknown>) = {
      ...((pd.meta as object) ?? {}),
      lipConfirmRequired: true,
      stockMigrateNeedsConfirm: true,
    };
    return {
      beforePressure,
      afterPressure: healed.remainingPressure || beforePressure,
      shotCountBefore: before.length,
      shotCountAfter: healed.shots.length,
      log: [{ step: "stock_migrate_confirm_only", count: beforePressure }],
      lipConfirmRequired: true,
      confirmRequired: true,
      healFailed: conf.reason ?? "below_autoMin",
    };
  }

  const orch = runSplitOrchestrator({
    planData: pd,
    shots: healed.shots,
    meta: (pd.meta as Record<string, unknown>) ?? {},
    applyClauseSplit: true,
    applyVisBeatExpanders: true,
  });
  Object.assign(pd, orch.planData);
  pack.shots = orch.shots;
  pd.preDesignPack = pack;
  const afterPressure = orch.shots.filter((s) => detectLipSplitPressure(s).mustConfirm).length;
  (pd.meta as Record<string, unknown>) = {
    ...((pd.meta as object) ?? {}),
    lipConfirmRequired: afterPressure > 0,
    importSplitExpanded: true,
    stockMigratedAt: new Date().toISOString(),
  };
  plan.planData = pd;
  return {
    beforePressure,
    afterPressure,
    shotCountBefore: before.length,
    shotCountAfter: orch.shots.length,
    log: orch.log,
    lipConfirmRequired: afterPressure > 0,
    confirmRequired: afterPressure > 0,
  };
}
