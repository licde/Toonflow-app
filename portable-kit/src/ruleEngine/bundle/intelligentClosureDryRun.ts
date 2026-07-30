import type { ScriptBundle } from "../bundle/types";
import type { ProductionClosureCheck } from "../bundle/types";
import { runIntelligentClosureViaRegistry } from "../closure/registerHandlers";

export function runIntelligentClosureDryRun(bundle: ScriptBundle): ProductionClosureCheck[] {
  return runIntelligentClosureViaRegistry(bundle);
}
