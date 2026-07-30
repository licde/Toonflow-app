/**
 * M16 — Chat/tool writeback must not wipe splits with false-green.
 * Force Mirror SSOT + placement heal + exit diagnose; pressure → Confirm or forceExpand orch.
 */
import { runDesignExitGate } from "./designExitGate";
import { runSplitOrchestrator } from "./splitOrchestrator";
import { healMisboundDialoguePlacement } from "./dialoguePlacementMatch";
import { detectLipSplitPressure } from "./lipSplit";
import { scoreSplitConfidence } from "./splitConfidenceSsot";

export type ChatWriteGateResult = {
  ok: boolean;
  plan: Record<string, unknown>;
  confirmRequired: boolean;
  exitOk: boolean;
  pressureShots: number;
  log: string[];
  /** Never claim passed:true when pressure remains */
  passed: false | true;
};

export function gateChatShotWriteback(
  plan: Record<string, unknown>,
  opts?: { forceExpand?: boolean; stageId?: string },
): ChatWriteGateResult {
  const log: string[] = [];
  const pd = (plan.planData ??= {}) as Record<string, unknown>;
  const pack = (pd.preDesignPack ??= { shots: [] }) as { shots: Record<string, unknown>[] };
  let shots = pack.shots ?? [];

  const healed = healMisboundDialoguePlacement(shots);
  shots = healed.shots;
  if (healed.stripped || healed.peeledToAudio) {
    log.push(`placement_heal strip=${healed.stripped} peel=${healed.peeledToAudio}`);
  }

  const pressure = shots.filter((s) => detectLipSplitPressure(s).mustConfirm).length;
  const conf = scoreSplitConfidence({
    lineCount: pressure,
    propCuConflict: healed.remainingPressure > 0,
    hasDifferentiatedVd: true,
  });

  if (pressure > 0 && (opts?.forceExpand || conf.autoEligible)) {
    const orch = runSplitOrchestrator({
      planData: pd,
      shots,
      meta: (pd.meta as Record<string, unknown>) ?? {},
      applyClauseSplit: true,
      applyVisBeatExpanders: true,
    });
    Object.assign(pd, orch.planData);
    shots = orch.shots;
    log.push(...orch.log.map((l) => `${l.step}:${l.count ?? ""}`));
  } else if (pressure > 0) {
    log.push("confirm_required");
  } else {
    // Mirror-only SSOT via forward reentry mirror path
    try {
      const { runForwardReentryAfterRepair } =
        require("./designSplitLifecycle") as typeof import("./designSplitLifecycle");
      const re = runForwardReentryAfterRepair({
        planData: pd,
        shots,
        meta: (pd.meta as Record<string, unknown>) ?? {},
        applyClauseSplit: true,
        applyVisBeatExpanders: false,
        applySemanticSplit: false,
      });
      Object.assign(pd, re.planData);
      shots = re.shots;
      log.push("mirror_ssot");
    } catch {
      /* optional */
    }
  }

  pack.shots = shots;
  pd.preDesignPack = pack;
  plan.planData = pd;

  const exit = runDesignExitGate(opts?.stageId ?? "SB", plan, {
    forceExpand: Boolean(opts?.forceExpand),
  });
  const remain = shots.filter((s) => detectLipSplitPressure(s).mustConfirm).length;
  const confirmRequired = remain > 0 && !opts?.forceExpand;
  const exitOk = Boolean(exit.ok) && remain === 0;
  if (remain > 0) {
    (pd.meta as Record<string, unknown>) = {
      ...((pd.meta as object) ?? {}),
      lipConfirmRequired: true,
    };
  }

  return {
    ok: exitOk || confirmRequired,
    plan,
    confirmRequired,
    exitOk,
    pressureShots: remain,
    log,
    passed: exitOk,
  };
}
