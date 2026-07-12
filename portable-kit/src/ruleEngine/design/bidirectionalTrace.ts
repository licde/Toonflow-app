import type { ScriptBundle } from "../bundle/types";
import { buildForwardTrace, type ForwardTraceItem } from "./forwardTrace";
import {
  resolveChainPreserveFields,
  resolveChainReverseTarget,
  resolveChainRuleId,
} from "./chainTriggerMap";
import { readFixtureJson } from "../utils/fixturesPath";

export interface ReverseHint {
  dimension: string;
  chainId: string;
  symptom: string;
  reverseTarget: string;
  preserveFields: string[];
  ruleId?: string;
}

function loadMatrixTarget(chainId: string): string | undefined {
  const matrix = readFixtureJson<{ chains?: Record<string, { rePushTarget?: string }> }>("unified_closure_matrix.json", { chains: {} });
  return matrix.chains?.[chainId]?.rePushTarget;
}

export function buildReverseHints(bundle: ScriptBundle, tier: "T1" | "T2" | "T3" = "T1"): ReverseHint[] {
  const ft = bundle.forwardTrace
    ? (bundle.forwardTrace as { traces?: ForwardTraceItem[] }).traces ?? []
    : buildForwardTrace(bundle, tier).traces;

  const preservePairs = readFixtureJson<{ preservePairs?: { forward: string; rePushPreserve?: string | null }[] }>(
    "unified_closure_matrix.json",
    {},
  ).preservePairs ?? [];

  return ft.map((t) => {
    const fromChain = resolveChainReverseTarget(t.chainId);
    const fromMatrix = loadMatrixTarget(t.chainId);
    const reverseTarget = fromChain !== "SB" ? fromChain : (fromMatrix ?? fromChain);
    let preserveFields = resolveChainPreserveFields(t.chainId, t.preserveOnRePush, t.sourceField);
    const pair = preservePairs.find((p) => t.sourceField.includes(p.forward.split(".")[0] ?? p.forward));
    if (pair?.rePushPreserve) preserveFields = [pair.rePushPreserve];
    return {
      dimension: t.dimension,
      chainId: t.chainId,
      symptom: `${t.sourceField}→${t.targetField}`,
      reverseTarget,
      preserveFields,
      ruleId: resolveChainRuleId(t.chainId),
    };
  });
}

export function bidirectionalCoverageOk(bundle: ScriptBundle): boolean {
  const ft = bundle.forwardTrace as { traces?: unknown[] } | undefined;
  if (!ft?.traces?.length) return true;
  const hints = buildReverseHints(bundle);
  if (hints.length < ft.traces.length) return false;
  return hints.every((h) => {
    const expected = loadMatrixTarget(h.chainId);
    return !expected || h.reverseTarget === expected;
  });
}
