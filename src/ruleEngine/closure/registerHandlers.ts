import type { ScriptBundle } from "../bundle/types";
import { resolveReverseTarget } from "../design/reverseRouteEngine";
import { hasUnconfirmedProposals, type SmartProposal } from "../design/smartProposalMerger";
import { bidirectionalCoverageOk } from "../design/bidirectionalTrace";
import { classifyChainBreaks } from "../design/chainBreakClassifier";
import { validateLinkageChains } from "../design/linkageValidator";
import { readFixtureJson } from "../utils/fixturesPath";
import { registerClosureHandlers, runClosureLevel } from "./ClosureRegistry";

function registerGenerationHandlers(): void {
  registerClosureHandlers({
    "GC-01": (ctx) => {
      const err = ctx.genError ?? "";
      return { passed: !err || /MD|EN|SB|W3|BP/.test(err), message: err ? `route→${resolveReverseTarget(err)}` : "feedback route OK" };
    },
    "GC-02": (ctx) => {
      const err = ctx.genError ?? "";
      return { passed: !/首位帧|first.?frame/i.test(err) || /MD/.test(err), message: "VID first frame → MD" };
    },
    "GC-03": (ctx) => {
      const err = ctx.genError ?? "";
      return { passed: !/native|语音|audio/i.test(err) || /EN/.test(err), message: "AUD native → EN" };
    },
    "GC-04": (ctx) => {
      const err = ctx.genError ?? "";
      return { passed: !/cref|identity/i.test(err) || /EN|BP/.test(err), message: "IMG cref → EN/BP" };
    },
    "GC-05": (ctx) => {
      const err = ctx.genError ?? "";
      return { passed: !/fx|F5|特效/i.test(err) || /SB|W3/.test(err), message: "FX → SB/W3" };
    },
    "GC-06": (ctx) => {
      const durOk = ctx.probeDuration == null || ctx.sbDuration == null || Math.abs(ctx.probeDuration - ctx.sbDuration) <= 1;
      return { passed: durOk, message: durOk ? "MediaProbe duration OK" : "duration drift" };
    },
    "GC-07": (ctx) => {
      const audioOk = ctx.probeHasAudio == null || ctx.policyNative == null || ctx.probeHasAudio === ctx.policyNative;
      return { passed: audioOk, message: audioOk ? "hasAudio policy OK" : "hasAudio mismatch" };
    },
    "GC-08": (ctx) => ({
      passed: (ctx.sfRound ?? 0) < 3 || ctx.hasRePush === true,
      message: "SF escalate rePush",
    }),
  });
}

function registerIntelligentHandlers(): void {
  registerClosureHandlers({
    "IC-01": (ctx) => {
      const bundle = ctx.bundle as ScriptBundle & { qualityDiagnostics?: { qpIds?: string[] } };
      const hints = readFixtureJson<{ hints?: { qpId?: string }[] }>("repair_hint_catalog.json", { hints: [] }).hints ?? [];
      const qpTriggers = bundle?.qualityDiagnostics?.qpIds ?? [];
      const missing = qpTriggers.filter((q) => !hints.some((h) => h.qpId === q));
      return { passed: missing.length === 0, message: missing.length ? `QP 缺 repairHint: ${missing.join(",")}` : "repairHint OK" };
    },
    "IC-02": (ctx) => {
      const proposals = (ctx.bundle as ScriptBundle & { smartDesignProposals?: SmartProposal[] })?.smartDesignProposals ?? [];
      return { passed: !hasUnconfirmedProposals(proposals), message: hasUnconfirmedProposals(proposals) ? "W93 未确认" : "proposals OK" };
    },
    "IC-03": (ctx) => {
      const supervision = (ctx.bundle as ScriptBundle & { supervisionReport?: { grade?: string; blockNext?: boolean } })?.supervisionReport;
      return { passed: !supervision?.blockNext && supervision?.grade !== "D", message: "supervision" };
    },
    "IC-04": (ctx) => {
      const fixPlan = (ctx.bundle as ScriptBundle & { fixPlan?: { items?: { autoApplicable?: boolean; confidence?: number }[] } })?.fixPlan;
      const lowConfidence = (fixPlan?.items ?? []).some((i) => i.autoApplicable && (i.confidence ?? 1) < 0.8);
      return { passed: !lowConfidence, message: lowConfidence ? "confidence<0.8" : "autoApplicable OK" };
    },
    "IC-05": (ctx) => {
      const bundle = ctx.bundle as ScriptBundle;
      const ok = bidirectionalCoverageOk(bundle) || !bundle.forwardTrace;
      return { passed: ok, message: ok ? "bidirectional OK" : "reverseHints 覆盖不足" };
    },
    "IC-06": (ctx) => {
      const bundle = ctx.bundle as ScriptBundle;
      const broken = validateLinkageChains(bundle).filter((l) => l.broken);
      const passed = broken.length === 0 || classifyChainBreaks(broken.length) !== undefined;
      return { passed, message: broken.length <= 1 ? "linkageRepairPlan" : "rePushPlan" };
    },
  });
}

let initialized = false;

export function ensureClosureRegistry(): void {
  if (initialized) return;
  registerGenerationHandlers();
  registerIntelligentHandlers();
  initialized = true;
}

export function runGenerationClosureViaRegistry(opts: Parameters<typeof runClosureLevel>[1]) {
  ensureClosureRegistry();
  return runClosureLevel("GC", opts);
}

export function runIntelligentClosureViaRegistry(bundle: ScriptBundle) {
  ensureClosureRegistry();
  return runClosureLevel("IC", { bundle });
}

export { getRegisteredHandlerIds } from "./ClosureRegistry";
