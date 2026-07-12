import { getRulePackVersion } from "../ruleRegistry";
import { readFixtureJson } from "../utils/fixturesPath";
import { parseScriptBundleRaw, runRawBundleClosure, runScriptBundleClosure } from "../bundle/closureSummary";
import { auditChatPromptGaps } from "../bundle/chatPromptAudit";
import type { InspectBundleOptions, InspectBundleResult, PortableOptions } from "./types";
import { buildRePushPlan } from "../design/reverseRouteEngine";

function loadRepairHints(ruleIds: string[]): { id: string; chatTemplate?: string; ruleId?: string }[] {
  const hints = readFixtureJson<{ hints?: { id: string; ruleId: string; chatTemplate?: string }[] }>("repair_hint_catalog.json", { hints: [] }).hints ?? [];
  return hints
    .filter((h) => ruleIds.includes(h.ruleId) || ruleIds.includes(h.id))
    .map((h) => ({ id: h.id, chatTemplate: h.chatTemplate, ruleId: h.ruleId }));
}

type InspectOptions = InspectBundleOptions & PortableOptions;

function toResult(closure: ReturnType<typeof runScriptBundleClosure>, bundle: ReturnType<typeof parseScriptBundleRaw> | null, _opts: InspectOptions): InspectBundleResult {
  const triggers = closure.reverseHints.map((h) =>
    h.chainId === "dialogue" ? "dialogue_hash_mismatch" : h.symptom.includes("→") ? h.chainId : h.symptom,
  );
  const rePushPlan = buildRePushPlan(triggers.length ? triggers : ["dialogue_hash_mismatch"], ["script", "globalAnchors"]);
  const ruleIds = closure.reverseHints.map((h) => h.ruleId).filter(Boolean) as string[];
  const chatPromptGaps = bundle ? auditChatPromptGaps(bundle, closure.tier) : [];

  return {
    tier: closure.tier,
    blocked: closure.blocked,
    rulePackVersion: closure.rulePackVersion ?? getRulePackVersion(),
    closureChecks: closure.closureChecks,
    forwardTrace: closure.forwardTrace,
    reverseHints: closure.reverseHints,
    repairHints: loadRepairHints(ruleIds),
    rePushPlan,
    warnings: [
      ...closure.warnings,
      ...chatPromptGaps.map((g) => (g.shotIndex != null ? `[镜${g.shotIndex}] ${g.message}` : g.message)),
    ],
    chatPromptGaps,
  };
}

export function inspectBundle(raw: unknown, opts: InspectOptions = {}): InspectBundleResult {
  const closure = runRawBundleClosure(raw, {
    tier: opts.tier,
    genError: opts.genError,
    sfRound: opts.sfRound,
  });
  if (!closure) {
    try {
      const parsed = parseScriptBundleRaw(raw);
      return toResult(runScriptBundleClosure(parsed, opts), parsed, opts);
    } catch {
      throw new Error("Unsupported bundle: expected ScriptBundle or EpisodeBundle");
    }
  }
  let bundle: ReturnType<typeof parseScriptBundleRaw> | null = null;
  try {
    bundle = parseScriptBundleRaw(raw);
  } catch {
    bundle = null;
  }
  return toResult(closure, bundle, opts);
}

export default inspectBundle;
