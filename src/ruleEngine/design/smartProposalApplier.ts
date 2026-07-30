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
  const merged = mergeConfirmedProposals(bundle, proposals);
  let next = merged.bundle;
  if (issues.length) {
    next = applyFixPlanToBundle(next, issues).bundle;
  }
  return next;
}
