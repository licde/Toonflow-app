import type { ProductionClosureCheck } from "../bundle/types";
import { runGenerationClosureViaRegistry } from "../closure/registerHandlers";

export function runGenerationClosureDryRun(opts: {
  error?: string;
  sfRound?: number;
  hasRePush?: boolean;
  probeDuration?: number;
  sbDuration?: number;
  probeHasAudio?: boolean;
  policyNative?: boolean;
}): ProductionClosureCheck[] {
  return runGenerationClosureViaRegistry({
    genError: opts.error,
    sfRound: opts.sfRound,
    hasRePush: opts.hasRePush,
    probeDuration: opts.probeDuration,
    sbDuration: opts.sbDuration,
    probeHasAudio: opts.probeHasAudio,
    policyNative: opts.policyNative,
  });
}
