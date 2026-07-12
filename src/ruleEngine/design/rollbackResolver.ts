import { readFixtureJson } from "../utils/fixturesPath";
import { resolveReverseTarget } from "./reverseRouteEngine";

interface LinkageChain {
  id: string;
  rollback?: string[] | string;
}

/** Single authority for rollback targets: linkage_chains.json → reverse_route_table. */
export function resolveRollbackTargets(chainId: string, trigger?: string): string[] {
  const chains = readFixtureJson<{ chains?: LinkageChain[] }>("linkage_chains.json", { chains: [] }).chains ?? [];
  const chain = chains.find((c) => c.id === chainId);
  if (chain?.rollback) {
    if (Array.isArray(chain.rollback)) return chain.rollback;
    if (chain.rollback === "reverse_route_table" && trigger) {
      return [resolveReverseTarget(trigger)];
    }
  }
  if (trigger) return [resolveReverseTarget(trigger)];
  return ["SB"];
}

export function inferRollbackFromMatrix(chainId: string): string {
  const matrix = readFixtureJson<{ chains?: Record<string, { rePushTarget?: string }> }>("unified_closure_matrix.json", { chains: {} });
  return matrix.chains?.[chainId]?.rePushTarget ?? "SB";
}
