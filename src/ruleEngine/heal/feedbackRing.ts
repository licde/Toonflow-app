/**
 * Q10 feedback ring — candidates only; never auto-write matrix (M4).
 */
export interface RuleCandidate {
  id: string;
  source: "post_burn_qc" | "vendor_fail" | "human_report" | "retention";
  proposedRuleId: string;
  evidence: string;
  createdAt: string;
  status: "pending_review" | "approved" | "rejected";
}

const candidates: RuleCandidate[] = [];

export function proposeRuleCandidate(input: Omit<RuleCandidate, "id" | "createdAt" | "status">): RuleCandidate {
  const c: RuleCandidate = {
    ...input,
    id: `cand_${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    status: "pending_review",
  };
  candidates.push(c);
  return c;
}

export function listPendingCandidates(): RuleCandidate[] {
  return candidates.filter((c) => c.status === "pending_review");
}

/** Human admission — returns payload to merge into matrix (caller writes file). */
export function admitCandidate(id: string): { ok: boolean; entry?: Record<string, unknown>; error?: string } {
  const c = candidates.find((x) => x.id === id);
  if (!c) return { ok: false, error: "not_found" };
  if (c.status !== "pending_review") return { ok: false, error: "not_pending" };
  c.status = "approved";
  return {
    ok: true,
    entry: {
      id: c.proposedRuleId,
      domain: "feedback",
      stages: ["preflight", "burn"],
      severityByStage: { preflight: "WARN", burn: "WARN" },
      handler: "feedbackAdmitted",
      softPatch: false,
      note: `Admitted from ${c.source}: ${c.evidence.slice(0, 120)}`,
      repairKind: "escalate_chat",
    },
  };
}
