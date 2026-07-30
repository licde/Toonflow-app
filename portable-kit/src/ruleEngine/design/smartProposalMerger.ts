import type { ScriptBundle } from "../bundle/types";

export interface SmartProposal {
  ruleId: string;
  trigger: string;
  proposal: string;
  targetStage: string;
  status: "pending_user_confirm" | "confirmed" | "rejected";
}

export function mergeConfirmedProposals(
  bundle: ScriptBundle,
  proposals: SmartProposal[],
): { merged: number; fixPlanItems: { ruleId: string; action: string }[] } {
  const confirmed = proposals.filter((p) => p.status === "confirmed");
  return {
    merged: confirmed.length,
    fixPlanItems: confirmed.map((p) => ({ ruleId: p.ruleId, action: p.proposal })),
  };
}

export function hasUnconfirmedProposals(proposals: SmartProposal[]): boolean {
  return proposals.some((p) => p.status === "pending_user_confirm");
}
