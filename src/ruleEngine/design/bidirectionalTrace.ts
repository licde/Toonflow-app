import type { ScriptBundle } from "../bundle/types";
import { buildForwardTrace, type ForwardTraceItem } from "./forwardTrace";
import { resolveReverseTarget } from "./reverseRouteEngine";

export interface ReverseHint {
  dimension: string;
  chainId: string;
  symptom: string;
  reverseTarget: string;
  preserveFields: string[];
  ruleId?: string;
}

export function buildReverseHints(bundle: ScriptBundle, tier: "T1" | "T2" | "T3" = "T1"): ReverseHint[] {
  const ft = bundle.forwardTrace
    ? (bundle.forwardTrace as { traces?: ForwardTraceItem[] }).traces ?? []
    : buildForwardTrace(bundle, tier).traces;

  return ft.map((t) => ({
    dimension: t.dimension,
    chainId: t.chainId,
    symptom: `${t.sourceField}→${t.targetField}`,
    reverseTarget: resolveReverseTarget(t.chainId === "dialogue" ? "dialogue_hash_mismatch" : t.chainId),
    preserveFields: t.preserveOnRePush ? [t.sourceField.split(".")[0] ?? t.sourceField] : [],
    ruleId: t.chainId === "camera" ? "PR-CAM-01" : undefined,
  }));
}

export function bidirectionalCoverageOk(bundle: ScriptBundle): boolean {
  const ft = bundle.forwardTrace as { traces?: unknown[] } | undefined;
  if (!ft?.traces?.length) return true;
  const hints = buildReverseHints(bundle);
  return hints.length >= ft.traces.length;
}
