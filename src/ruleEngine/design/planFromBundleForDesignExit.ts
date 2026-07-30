/**
 * Build a designExitGate plan view from ScriptBundle (hoist top-level PDP/CD).
 * Used by exportGate with chatStrict clone — diagnose only, no expand writeback.
 */
import type { ScriptBundle } from "../bundle/types";

export function planFromBundleForDesignExit(bundle: ScriptBundle): Record<string, unknown> {
  const rootPd = (bundle.planData ?? {}) as Record<string, unknown>;
  const pd: Record<string, unknown> = { ...rootPd };

  const rootPdp = bundle.preDesignPack as { shots?: unknown[]; scriptPlan?: string } | undefined;
  const nestedPdp = pd.preDesignPack as { shots?: unknown[]; scriptPlan?: string } | undefined;
  const rootShots = (rootPdp?.shots ?? []) as unknown[];
  const nestedShots = (nestedPdp?.shots ?? []) as unknown[];

  if (rootPdp) {
    pd.preDesignPack = {
      ...(nestedPdp ?? {}),
      ...rootPdp,
      shots: rootShots.length ? rootShots : nestedShots,
      scriptPlan: rootPdp.scriptPlan ?? nestedPdp?.scriptPlan ?? bundle.script,
    };
  } else if (!nestedPdp) {
    pd.preDesignPack = { shots: [], scriptPlan: bundle.script };
  }

  if (bundle.characterDesign && !pd.characterDesign) {
    pd.characterDesign = bundle.characterDesign;
  }
  if (bundle.narrativeSelfcheck && !pd.narrativeSelfcheck) {
    pd.narrativeSelfcheck = bundle.narrativeSelfcheck;
  }

  return {
    script: bundle.script,
    planData: pd,
    characterDesign: bundle.characterDesign ?? pd.characterDesign,
    preDesignPack: pd.preDesignPack,
    narrativeSelfcheck: bundle.narrativeSelfcheck ?? pd.narrativeSelfcheck,
    meta: bundle.meta ?? pd.meta,
  };
}

export function deepCloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Dedupe repair lines: same rule + lineId + message → one. */
export function dedupeChatRepairBlocks<T extends { id: string; message: string; field?: string }>(
  rows: T[],
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const b of rows) {
    const lineId =
      b.message.match(/\b(L-[\w.-]+)\b/)?.[1] ??
      (typeof b.field === "string" && /\bL-[\w.-]+\b/.test(b.field) ? b.field : "");
    const key = `${b.id}::${lineId}::${b.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(b);
  }
  return out;
}
