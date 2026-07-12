import type { ProductionClosureCheck } from "../bundle/types";
import { resolveReverseTarget } from "../design/reverseRouteEngine";

export function runGenerationClosureDryRun(opts: {
  error?: string;
  sfRound?: number;
  hasRePush?: boolean;
  probeDuration?: number;
  sbDuration?: number;
  probeHasAudio?: boolean;
  policyNative?: boolean;
}): ProductionClosureCheck[] {
  const checks: ProductionClosureCheck[] = [];
  const err = opts.error ?? "";

  checks.push({
    id: "GC-01",
    passed: !err || /MD|EN|SB|W3|BP/.test(err),
    message: err ? `route→${resolveReverseTarget(err)}` : "feedback route OK",
    severity: "BLOCK",
  });

  checks.push({
    id: "GC-02",
    passed: !/首位帧|first.?frame/i.test(err) || /MD/.test(err),
    message: "VID first frame → MD",
    severity: "BLOCK",
  });

  checks.push({
    id: "GC-03",
    passed: !/native|语音|audio/i.test(err) || /EN/.test(err),
    message: "AUD native → EN",
    severity: "BLOCK",
  });

  checks.push({
    id: "GC-04",
    passed: !/cref|identity/i.test(err) || /EN|BP/.test(err),
    message: "IMG cref → EN/BP",
    severity: "BLOCK",
  });

  checks.push({
    id: "GC-05",
    passed: !/fx|F5|特效/i.test(err) || /SB|W3/.test(err),
    message: "FX → SB/W3",
    severity: "BLOCK",
  });

  const durOk = opts.probeDuration == null || opts.sbDuration == null
    || Math.abs(opts.probeDuration - opts.sbDuration) <= 1;
  checks.push({
    id: "GC-06",
    passed: durOk,
    message: durOk ? "MediaProbe duration OK" : "duration drift",
    severity: "WARN",
  });

  const audioOk = opts.probeHasAudio == null || opts.policyNative == null
    || opts.probeHasAudio === opts.policyNative;
  checks.push({
    id: "GC-07",
    passed: audioOk,
    message: audioOk ? "hasAudio policy OK" : "hasAudio mismatch",
    severity: "WARN",
  });

  checks.push({
    id: "GC-08",
    passed: (opts.sfRound ?? 0) < 3 || opts.hasRePush === true,
    message: "SF escalate rePush",
    severity: "WARN",
  });

  return checks;
}
