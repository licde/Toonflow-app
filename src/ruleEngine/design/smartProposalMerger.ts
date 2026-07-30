/**
 * Smart proposal merge — Confirm then write (W93/IC-02).
 * pending → confirmed → apply patches onto bundle; never silent-write without confirm.
 */
import type { ScriptBundle } from "../bundle/types";
import { applyPatchesToShot } from "./patchApplicator";
import { presentationForkChoices } from "./presentationForkResolver";

export interface SmartProposal {
  id?: string;
  ruleId: string;
  trigger: string;
  proposal: string;
  targetStage: string;
  status: "pending_user_confirm" | "confirmed" | "rejected" | "applied";
  /** Optional shot scope */
  shotIndex?: number;
  /** Flat patch applied on confirm (patchApplicator keys) */
  patch?: Record<string, unknown>;
  confidence?: number;
  presentationFork?: { fork: string; label: string }[];
  /** When set, selecting fork-A/B stamps this nextStep */
  forkNextStep?: "chat_repair" | "split_shot";
}

export function hasUnconfirmedProposals(proposals: SmartProposal[]): boolean {
  return proposals.some((p) => p.status === "pending_user_confirm");
}

export function confirmSmartProposal(
  proposals: SmartProposal[],
  idOrRuleId: string,
  status: "confirmed" | "rejected",
  fork?: string,
): SmartProposal[] {
  return proposals.map((p) => {
    const hit = p.id === idOrRuleId || p.ruleId === idOrRuleId || p.trigger === idOrRuleId;
    if (!hit) return p;
    const next: SmartProposal = { ...p, status };
    if (fork && p.presentationFork?.length) {
      const choice = p.presentationFork.find((f) => f.fork === fork);
      if (choice) {
        next.forkNextStep = /split/i.test(choice.label) || fork === "fork-B" ? "split_shot" : "chat_repair";
        next.proposal = `${p.proposal} [fork=${fork}]`;
      }
    }
    return next;
  });
}

/** Build pending proposals from reverse/rePush triggers (diagnose surface). */
export function buildSmartProposalsFromTriggers(
  triggers: { trigger: string; reverseTarget?: string; ruleId?: string; reason?: string; shotIndex?: number }[],
  opts?: { confidenceByTrigger?: Record<string, number> },
): SmartProposal[] {
  const out: SmartProposal[] = [];
  const seen = new Set<string>();
  for (const t of triggers) {
    const trigger = String(t.trigger || "").trim();
    if (!trigger || seen.has(trigger)) continue;
    seen.add(trigger);
    const conf = opts?.confidenceByTrigger?.[trigger] ?? 0.6;
    const forks = presentationForkChoices(trigger);
    out.push({
      id: `sp-${trigger}-${out.length + 1}`,
      ruleId: t.ruleId || trigger.toUpperCase().replace(/\W+/g, "_").slice(0, 32),
      trigger,
      proposal: t.reason || `Confirm 修复：${trigger}`,
      targetStage: t.reverseTarget || "SB",
      status: "pending_user_confirm",
      shotIndex: t.shotIndex,
      confidence: conf,
      presentationFork: forks.map((f) => ({ fork: f.fork, label: f.label })),
    });
  }
  return out;
}

/**
 * Merge confirmed proposals into bundle:
 * - writes fixPlan items
 * - applies patch onto matching shot when present
 * - marks status → applied
 * Rejected proposals are left as-is (not applied).
 */
export function mergeConfirmedProposals(
  bundle: ScriptBundle,
  proposals: SmartProposal[],
): {
  merged: number;
  appliedIds: string[];
  fixPlanItems: { ruleId: string; action: string; shotIndex?: number }[];
  bundle: ScriptBundle;
  proposals: SmartProposal[];
} {
  const confirmed = proposals.filter((p) => p.status === "confirmed");
  const fixPlanItems = confirmed.map((p) => ({
    ruleId: p.ruleId,
    action: p.proposal,
    shotIndex: p.shotIndex,
  }));

  let next = {
    ...bundle,
    smartDesignProposals: proposals,
    fixPlan: {
      ...(bundle as ScriptBundle & { fixPlan?: Record<string, unknown> }).fixPlan,
      items: [
        ...((((bundle as ScriptBundle & { fixPlan?: { items?: unknown[] } }).fixPlan?.items as unknown[]) ??
          []) as unknown[]),
        ...fixPlanItems.map((it, i) => ({
          id: `smart-${i + 1}`,
          ruleId: it.ruleId,
          action: it.action,
          autoApplicable: false,
          confidence: confirmed[i]?.confidence ?? 0.7,
          shotIndex: it.shotIndex,
        })),
      ],
    },
  } as ScriptBundle;

  const appliedIds: string[] = [];
  const shots = [...((next.preDesignPack?.shots ?? []) as Record<string, unknown>[])];
  let shotsDirty = false;

  const updated = proposals.map((p) => {
    if (p.status !== "confirmed") return p;
    if (p.patch && shots.length) {
      const idx =
        p.shotIndex != null
          ? shots.findIndex((s) => Number((s as { shotIndex?: number }).shotIndex) === p.shotIndex)
          : 0;
      const targetIdx = idx >= 0 ? idx : 0;
      const { shot, applied } = applyPatchesToShot(shots[targetIdx]!, p.patch);
      if (applied.length) {
        shots[targetIdx] = shot;
        shotsDirty = true;
      }
    }
    // Record fork choice onto plan meta for FE/nextStep
    if (p.forkNextStep) {
      const pd = ((next.planData as Record<string, unknown>) ??= {});
      const meta = ((pd.meta as Record<string, unknown>) ??= {});
      meta.lastSmartProposalNextStep = p.forkNextStep;
      meta.lastSmartProposalTrigger = p.trigger;
      pd.meta = meta;
      next.planData = pd as typeof next.planData;
    }
    appliedIds.push(p.id || p.ruleId);
    return { ...p, status: "applied" as const };
  });

  if (shotsDirty && next.preDesignPack) {
    next = {
      ...next,
      preDesignPack: { ...next.preDesignPack, shots: shots as typeof next.preDesignPack.shots },
    };
  }
  next = { ...next, smartDesignProposals: updated } as ScriptBundle;

  return {
    merged: confirmed.length,
    appliedIds,
    fixPlanItems,
    bundle: next,
    proposals: updated,
  };
}
