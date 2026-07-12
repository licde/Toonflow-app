import { readFixtureJson } from "../utils/fixturesPath";
import { resolveReverseTarget } from "./reverseRouteEngine";

export interface ChainTriggerEntry {
  trigger: string;
  preserveFields?: string[];
  ruleId?: string;
}

let cache: Record<string, ChainTriggerEntry> | null = null;

export function loadChainTriggerMap(): Record<string, ChainTriggerEntry> {
  if (cache) return cache;
  const raw = readFixtureJson<{ chains?: Record<string, ChainTriggerEntry> }>("chain_trigger_map.json", { chains: {} });
  cache = raw.chains ?? {};
  return cache;
}

export function resolveChainReverseTarget(chainId: string): string {
  const matrix = readFixtureJson<{ chains?: Record<string, { rePushTarget?: string }> }>("unified_closure_matrix.json", { chains: {} });
  const matrixTarget = matrix.chains?.[chainId]?.rePushTarget;
  if (matrixTarget) return matrixTarget;

  const map = loadChainTriggerMap();
  const entry = map[chainId];
  if (entry?.trigger) {
    const fromRoute = resolveReverseTarget(entry.trigger);
    if (fromRoute !== "SB" || entry.trigger === "dialogue_hash_mismatch") return fromRoute;
  }
  return resolveReverseTarget(entry?.trigger ?? chainId);
}

export function resolveChainPreserveFields(chainId: string, tracePreserve: boolean, sourceField?: string): string[] {
  const map = loadChainTriggerMap();
  const fromMap = map[chainId]?.preserveFields ?? [];
  if (fromMap.length) return fromMap;
  if (tracePreserve && sourceField) return [sourceField.split(".")[0] ?? sourceField];
  return [];
}

export function resolveChainRuleId(chainId: string): string | undefined {
  return loadChainTriggerMap()[chainId]?.ruleId ?? (chainId === "camera" ? "PR-CAM-01" : undefined);
}
