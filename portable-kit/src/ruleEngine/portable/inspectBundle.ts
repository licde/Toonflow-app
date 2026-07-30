import { getRulePackVersion } from "../ruleRegistry";
import { readFixtureJson } from "../utils/fixturesPath";
import { parseScriptBundleRaw, runRawBundleClosure, runScriptBundleClosure } from "../bundle/closureSummary";
import { auditChatPromptGaps } from "../bundle/chatPromptAudit";
import { auditAllBundleGaps } from "../bundle/bundleGapAudits";
import { buildClosureReport } from "../bundle/closureReport";
import type { InspectBundleOptions, InspectBundleResult, PortableOptions } from "./types";
import { buildRePushPlan } from "../design/reverseRouteEngine";
import { qualityGate } from "../qualityGate";

function loadRepairHints(ids: string[]): { id: string; chatTemplate?: string; ruleId?: string }[] {
  const catalog = readFixtureJson<{
    hints?: { id: string; ruleId: string; qpId?: string; symptom?: string; chatTemplate?: string; checkIds?: string[] }[];
  }>("repair_hint_catalog.json", { hints: [] });
  const hints = catalog.hints ?? [];
  const idSet = new Set(ids);
  return hints
    .filter(
      (h) =>
        idSet.has(h.ruleId) ||
        idSet.has(h.id) ||
        (h.qpId && idSet.has(h.qpId)) ||
        (h.checkIds?.some((c) => idSet.has(c)) ?? false) ||
        (h.symptom && ids.some((i) => i.includes(h.symptom!) || h.symptom!.includes(i))),
    )
    .map((h) => ({ id: h.id, chatTemplate: h.chatTemplate, ruleId: h.ruleId }));
}

type InspectOptions = InspectBundleOptions & PortableOptions;

function toResult(closure: ReturnType<typeof runScriptBundleClosure>, bundle: ReturnType<typeof parseScriptBundleRaw> | null, opts: InspectOptions): InspectBundleResult {
  const tier = closure.tier;
  const gapResult = bundle ? auditAllBundleGaps(bundle, tier) : null;

  const closureTriggers = closure.reverseHints.map((h) =>
    h.chainId === "dialogue" ? "dialogue_hash_mismatch" : h.symptom.includes("→") ? h.chainId : h.symptom,
  );
  const gapTriggers = gapResult?.triggers ?? [];
  const triggers = [...new Set([...closureTriggers, ...gapTriggers])];
  const rePushPlan = triggers.length ? buildRePushPlan(triggers, ["script", "globalAnchors"]) : [];

  const failedCheckIds = [
    ...(closure.closureChecks?.dc ?? []),
    ...(closure.closureChecks?.pc ?? []),
    ...(closure.closureChecks?.gc ?? []),
    ...(closure.closureChecks?.ic ?? []),
  ]
    .filter((c) => c && c.passed === false && c.id)
    .map((c) => c.id);
  const ruleIds = [
    ...closure.reverseHints.map((h) => h.ruleId).filter(Boolean),
    ...(gapResult?.allGaps.map((g) => g.id) ?? []),
    ...failedCheckIds,
  ] as string[];
  const repairHints = loadRepairHints(ruleIds);

  const chatPromptGaps = bundle ? auditChatPromptGaps(bundle, tier) : [];
  const gapWarnings = gapResult?.allGaps.map((g) => (g.shotIndex != null ? `[镜${g.shotIndex}] ${g.id}: ${g.message}` : `${g.id}: ${g.message}`)) ?? [];

  const closureReport = buildClosureReport({
    allGaps: gapResult?.allGaps ?? [],
    chatPromptGaps,
    closureChecks: closure.closureChecks,
    tier,
  });

  const linkageRepairPlan =
    gapResult?.repairMode === "linkageRepair" && gapResult.allGaps.length
      ? gapResult.allGaps.map((g) => ({ gapId: g.id, chainId: g.chainId, trigger: g.trigger, field: g.field }))
      : undefined;

  let qualityGateResult: ReturnType<typeof qualityGate> | undefined;
  if (bundle) {
    qualityGateResult = qualityGate(bundle, { stage: "export", tier });
  }

  const chatBlocks = tier === "T3" ? chatPromptGaps.filter((g) => g.severity === "BLOCK") : [];
  const qgBlocked = Boolean(qualityGateResult?.blocked);
  const blocked =
    closure.closureChecks.blocked || qgBlocked || (tier === "T3" && chatBlocks.length > 0);

  const qgWarnings =
    qualityGateResult?.issues.map((i) =>
      i.shotIndex != null ? `[镜${i.shotIndex}] ${i.id}: ${i.message}` : `${i.id}: ${i.message}`,
    ) ?? [];

  return {
    tier,
    blocked,
    rulePackVersion: closure.rulePackVersion ?? getRulePackVersion(),
    closureChecks: { ...closure.closureChecks, blocked },
    forwardTrace: closure.forwardTrace,
    reverseHints: closure.reverseHints,
    repairHints,
    rePushPlan,
    linkageRepairPlan,
    smartDetection: gapResult
      ? {
          gapCount: gapResult.allGaps.length,
          repairMode: gapResult.repairMode,
          chains: [...new Set(gapResult.allGaps.map((g) => g.chainId).filter(Boolean))],
        }
      : undefined,
    warnings: [
      ...closure.warnings,
      ...gapWarnings,
      ...chatPromptGaps.map((g) => (g.shotIndex != null ? `[镜${g.shotIndex}] ${g.message}` : g.message)),
      ...qgWarnings,
    ],
    chatPromptGaps,
    adaptationGaps: gapResult?.adaptationGaps,
    retentionGaps: gapResult?.retentionGaps,
    narrativeDriveGaps: gapResult?.narrativeDriveGaps,
    packagingGaps: gapResult?.packagingGaps,
    generationApplyGaps: gapResult?.generationApplyGaps,
    designSpecGaps: gapResult?.designSpecGaps,
    scriptViralGaps: gapResult?.scriptViralGaps,
    modalityGaps: gapResult?.modalityGaps,
    closureReport,
    qualityGate: qualityGateResult,
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
