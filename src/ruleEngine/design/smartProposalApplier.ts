import type { ScriptBundle } from "../bundle/types";
import { mergeConfirmedProposals, type SmartProposal } from "./smartProposalMerger";
import { applyFixPlanToBundle } from "./fixPlanApplicator";
import type { ValidationIssue } from "../types";

/** Apply confirmed smart proposals and optional auto-fix issues onto bundle. */
export function applySmartProposalsToBundle(
  bundle: ScriptBundle,
  proposals: SmartProposal[],
  issues: ValidationIssue[] = [],
): ScriptBundle {
  const { fixPlanItems } = mergeConfirmedProposals(bundle, proposals);
  let next = {
    ...bundle,
    smartDesignProposals: proposals,
    fixPlan: {
      ...(bundle as ScriptBundle & { fixPlan?: Record<string, unknown> }).fixPlan,
      items: fixPlanItems,
    },
  } as ScriptBundle;
  if (issues.length) {
    next = applyFixPlanToBundle(next, issues).bundle;
  }
  return next;
}
