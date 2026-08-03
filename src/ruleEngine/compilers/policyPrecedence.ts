/**
 * Rule precedence — higher tiers win; lower tiers must not override hard gates.
 * trunk_hard_debt > pose_contact_handoff > realization_adapt > episode_polish
 */
export const POLICY_PRECEDENCE = [
  "trunk_hard_debt",
  "pose_contact_handoff",
  "realization_adapt",
  "episode_polish",
] as const;

export type PolicyTier = (typeof POLICY_PRECEDENCE)[number];

export type PolicyGateInput = {
  trunkBlockers?: string[];
  handoffBlock?: boolean;
  poseMismatchBlock?: boolean;
};

/** Realization adapt may run when trunk/handoff hard gates are clear. */
export function mayApplyRealizationAdapt(input: PolicyGateInput): boolean {
  if (input.trunkBlockers?.length) return false;
  if (input.handoffBlock === true) return false;
  if (input.poseMismatchBlock === true) return false;
  return true;
}

/** Episode polish is lowest tier — never masks trunk or handoff. */
export function mayApplyEpisodePolish(input: PolicyGateInput & { adaptApplied?: boolean }): boolean {
  if (!mayApplyRealizationAdapt(input)) return false;
  return input.adaptApplied !== false;
}

export function policyTierRank(tier: PolicyTier): number {
  return POLICY_PRECEDENCE.indexOf(tier);
}

export function higherTierWins(a: PolicyTier, b: PolicyTier): PolicyTier {
  return policyTierRank(a) <= policyTierRank(b) ? a : b;
}
