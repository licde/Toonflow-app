/**
 * Shared budget for silent heals + regen retries (plan m1-budget-ledger).
 */
export interface HealBudgetState {
  silentHealsUsed: number;
  regenRetriesUsed: number;
  maxSilentHeals: number;
  maxRegenRetries: number;
}

export const DEFAULT_HEAL_BUDGET: HealBudgetState = {
  silentHealsUsed: 0,
  regenRetriesUsed: 0,
  maxSilentHeals: 24,
  maxRegenRetries: 2,
};

export function createHealBudget(partial?: Partial<HealBudgetState>): HealBudgetState {
  return { ...DEFAULT_HEAL_BUDGET, ...partial };
}

export function canSilentHeal(b: HealBudgetState): boolean {
  return b.silentHealsUsed < b.maxSilentHeals;
}

export function canRegenRetry(b: HealBudgetState): boolean {
  return b.regenRetriesUsed < b.maxRegenRetries;
}

export function consumeSilentHeal(b: HealBudgetState, n = 1): HealBudgetState {
  return { ...b, silentHealsUsed: b.silentHealsUsed + n };
}

export function consumeRegenRetry(b: HealBudgetState, n = 1): HealBudgetState {
  return { ...b, regenRetriesUsed: b.regenRetriesUsed + n };
}
