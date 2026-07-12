import type { ScriptBundle } from "../bundle/types";
import type { ProductionClosureCheck } from "../bundle/types";
import { runProductionClosureDryRun } from "../bundle/productionClosureDryRun";
import { runDesignClosureDryRun } from "../bundle/designClosureDryRun";
import { runGenerationClosureDryRun } from "../bundle/generationClosureDryRun";
import { runIntelligentClosureDryRun } from "../bundle/intelligentClosureDryRun";
import { enrichBundleForwardTrace } from "./forwardTrace";

export interface UnifiedClosureResult {
  dc: ProductionClosureCheck[];
  pc: ProductionClosureCheck[];
  gc: ProductionClosureCheck[];
  ic: ProductionClosureCheck[];
  blocked: boolean;
}

export function runUnifiedClosure(
  bundle: ScriptBundle,
  opts: { tier?: "T1" | "T2" | "T3"; genError?: string; sfRound?: number } = {},
): UnifiedClosureResult {
  const tier = opts.tier ?? "T1";
  const enriched = enrichBundleForwardTrace(bundle, tier);
  const dc = runDesignClosureDryRun(enriched);
  const pc = tier === "T3" ? runProductionClosureDryRun(enriched) : [];
  const gc = opts.genError ? runGenerationClosureDryRun({ error: opts.genError, sfRound: opts.sfRound }) : [];
  const ic = runIntelligentClosureDryRun(enriched);
  const blocked = [...dc, ...pc, ...gc, ...ic].some((c) => !c.passed && c.severity === "BLOCK");
  return { dc, pc, gc, ic, blocked };
}
