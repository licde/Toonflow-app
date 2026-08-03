/**
 * Contract-debt heal router — maps reverse_route / finding ids → live heal actions.
 * Used by generate / persist / Chat; never throws HTTP policy blocks.
 */
import { healPromptFidelityAnchors, type HealFidelityResult } from "./healPromptFidelityAnchors";
import { planRepairFromFailureCluster, applyRepairAsDesignToShot } from "./repairAsDesign";
import { resolveReverseRouteShootable } from "./reverseRouteShootable";

export type ContractHealInput = {
  ruleId?: string | null;
  visualDescription?: string | null;
  visualBody?: string | null;
  knownNames?: string[];
  shot?: Record<string, unknown>;
};

export type ContractHealResult = {
  healed: boolean;
  sources: string[];
  visualBody?: string;
  visualDescription?: string;
  softDefer: boolean;
  requireFixBeforeBurn: boolean;
  fidelity?: HealFidelityResult;
};

export function runContractDebtHeal(input: ContractHealInput): ContractHealResult {
  const rule = String(input.ruleId ?? "");
  const sources: string[] = ["repair.orchestrator"];
  const route = resolveReverseRouteShootable(
    /PROMPT-FIDELITY|prompt_fidelity/i.test(rule) ? "prompt_fidelity" : rule || "prompt_fidelity",
  );
  sources.push(`repair.route:${route.trigger ?? "prompt_fidelity"}`);

  if (/PROMPT-FIDELITY|prompt_fidelity|锚点/i.test(rule) || !rule) {
    const fidelity = healPromptFidelityAnchors({
      visualDescription: input.visualDescription,
      visualBody: input.visualBody ?? input.visualDescription,
      knownNames: input.knownNames,
    });
    sources.push(...fidelity.sources);
    if (input.shot && fidelity.plan.writes.length) {
      applyRepairAsDesignToShot(input.shot, fidelity.plan);
      sources.push("repair.orchestrator.writeShot");
    }
    return {
      healed: fidelity.ok || fidelity.injected.length > 0,
      sources,
      visualBody: fidelity.visualBody,
      visualDescription: fidelity.visualDescription,
      softDefer: fidelity.softDefer,
      requireFixBeforeBurn: route.requireFixBeforeBurn || fidelity.softDefer,
      fidelity,
    };
  }

  const plan = planRepairFromFailureCluster({
    kind: rule,
    visualDescription: input.visualDescription,
  });
  if (input.shot && plan.writes.length) applyRepairAsDesignToShot(input.shot, plan);
  sources.push("repair.orchestrator.failureCluster");
  return {
    healed: plan.writes.length > 0,
    sources,
    visualDescription: input.visualDescription ?? undefined,
    softDefer: plan.blocksBurn,
    requireFixBeforeBurn: route.requireFixBeforeBurn || plan.blocksBurn,
  };
}
