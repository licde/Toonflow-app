/**
 * Observability bridge for heal/regen (M3 m3-obs) — best-effort emit.
 */
import type { HealBudgetState } from "./healBudgetLedger";

export interface HealObsEvent {
  type:
    | "import_heal"
    | "post_burn_repair"
    | "silent_raise"
    | "budget"
    | "still_fidelity_round"
    | "still_fidelity_pass"
    | "still_fidelity_stop_converged"
    | "still_fidelity_vlm_error"
    | "still_fidelity_edit_on_repeat"
    | "still_fidelity_unknown_no_converge"
    | "audio_l1"
    | "post_burn_runtime";
  at: string;
  payload: Record<string, unknown>;
}

const buffer: HealObsEvent[] = [];

export function emitHealObs(type: HealObsEvent["type"], payload: Record<string, unknown>): void {
  buffer.push({ type, at: new Date().toISOString(), payload });
  if (buffer.length > 200) buffer.shift();
}

export function snapshotHealObs(limit = 50): HealObsEvent[] {
  return buffer.slice(-limit);
}

export function observeImportHeal(input: {
  serverFixedIds: string[];
  healLogLen: number;
  healBudget: HealBudgetState;
}): void {
  emitHealObs("import_heal", {
    fixed: input.serverFixedIds.length,
    log: input.healLogLen,
    silentUsed: input.healBudget.silentHealsUsed,
    regenUsed: input.healBudget.regenRetriesUsed,
  });
}
