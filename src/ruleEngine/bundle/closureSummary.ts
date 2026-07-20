import type { ScriptBundle, EpisodeBundle, ProductionClosureCheck } from "./types";
import { enrichBundleForwardTrace } from "../design/forwardTrace";
import { buildReverseHints } from "../design/bidirectionalTrace";
import { runUnifiedClosure } from "../design/unifiedDryRun";
import { productionClosureBlocked, runProductionClosureDryRunForTier } from "./productionClosureDryRun";
import { designClosureBlocked } from "./designClosureDryRun";
import { getRulePackVersion } from "../ruleRegistry";
import { prepareBundleWithLog, scriptBundleSchema } from "./schema";
import type { ClosureTier } from "../portable/types";

export interface ScriptClosureResult {
  tier: ClosureTier;
  blocked: boolean;
  rulePackVersion: string;
  closureChecks: {
    dc: ProductionClosureCheck[];
    pc: ProductionClosureCheck[];
    gc: ProductionClosureCheck[];
    ic: ProductionClosureCheck[];
    blocked: boolean;
  };
  designClosureChecks: ProductionClosureCheck[];
  productionClosureChecks: ProductionClosureCheck[];
  intelligentClosureChecks: ProductionClosureCheck[];
  forwardTrace?: Record<string, unknown>;
  reverseHints: ReturnType<typeof buildReverseHints>;
  warnings: string[];
}

export function inferTierFromBundle(bundle: ScriptBundle): ClosureTier {
  if (bundle.modalityPromptAudit) return "T3";
  const shots = bundle.preDesignPack?.shots ?? [];
  if (shots.some((s) => s.generation?.imagePrompt?.trim())) return "T3";
  if (bundle.flowData?.storyboard?.some((p) => p.prompt?.trim())) return "T3";
  if (bundle.characterDesign || bundle.assetPipeline || bundle.visualLockTable) return "T2";
  return "T1";
}

export function episodeToScriptBundle(ep: EpisodeBundle): ScriptBundle {
  const fd = ep.flowData;
  return {
    bundleType: "script",
    bundleVersion: ep.bundleVersion,
    rulePackVersion: ep.rulePackVersion ?? "2.0.1",
    meta: ep.meta,
    script: fd.script ?? "",
    preDesignPack: undefined,
    modalityPromptAudit: (fd as { modalityPromptAudit?: Record<string, unknown> }).modalityPromptAudit,
    identityAudit: (fd as { identityAudit?: Record<string, unknown> }).identityAudit,
    fxFeasibilityAudit: (fd as { fxFeasibilityAudit?: Record<string, unknown> }).fxFeasibilityAudit,
    debutIntroPack: (fd as { debutIntroPack?: Record<string, unknown> }).debutIntroPack,
    productionReasonableness: (fd as { productionReasonableness?: Record<string, unknown> }).productionReasonableness,
    characterDesign: (fd as { characterDesign?: Record<string, unknown> }).characterDesign,
    assetPipeline: (fd as { assetPipeline?: Record<string, unknown> }).assetPipeline,
  } as ScriptBundle;
}

export function runScriptBundleClosure(
  bundle: ScriptBundle,
  opts: { tier?: ClosureTier; genError?: string; sfRound?: number } = {},
): ScriptClosureResult {
  const tier = opts.tier ?? inferTierFromBundle(bundle);
  const warnings: string[] = [];
  const enriched = enrichBundleForwardTrace(bundle, tier);
  const unified = runUnifiedClosure(enriched, { tier, genError: opts.genError, sfRound: opts.sfRound });
  const pcTier: "T2" | "T3" = tier === "T1" && (bundle.identityAudit || bundle.fxFeasibilityAudit || bundle.modalityPromptAudit) ? "T3" : tier === "T1" ? "T2" : tier;
  const pcDry =
    tier === "T2" || tier === "T3" || bundle.identityAudit || bundle.fxFeasibilityAudit || bundle.modalityPromptAudit
      ? runProductionClosureDryRunForTier(enriched, pcTier)
      : [];
  const productionClosureChecks = (() => {
    if (!pcDry.length) return unified.pc;
    if (!unified.pc.length) return pcDry;
    const byId = new Map(pcDry.map((c) => [c.id, c]));
    for (const c of unified.pc) byId.set(c.id, c);
    return [...byId.values()];
  })();
  const reverseHints = buildReverseHints(enriched, tier);
  const blocked = unified.blocked || designClosureBlocked(unified.dc) || productionClosureBlocked(productionClosureChecks);

  if (blocked) {
    warnings.push("unified_closure_checklist 存在 BLOCK 项");
  }

  return {
    tier,
    blocked,
    rulePackVersion: getRulePackVersion(),
    closureChecks: { ...unified, blocked, pc: productionClosureChecks },
    designClosureChecks: unified.dc,
    productionClosureChecks,
    intelligentClosureChecks: unified.ic,
    forwardTrace: enriched.forwardTrace,
    reverseHints,
    warnings,
  };
}

export function parseScriptBundleRaw(raw: unknown): ScriptBundle {
  return scriptBundleSchema.parse(prepareBundleWithLog(raw).bundle) as ScriptBundle;
}

export function runRawBundleClosure(raw: unknown, opts: { tier?: ClosureTier; genError?: string; sfRound?: number } = {}): ScriptClosureResult | null {
  const o = raw as Record<string, unknown>;
  if (o?.bundleType === "script" || (o?.script && !o?.flowData)) {
    return runScriptBundleClosure(parseScriptBundleRaw(raw), opts);
  }
  if (o?.flowData) {
    const ep = { bundleVersion: o.bundleVersion, meta: o.meta ?? {}, flowData: o.flowData, rulePackVersion: o.rulePackVersion } as EpisodeBundle;
    const sb = episodeToScriptBundle(ep);
    return runScriptBundleClosure(sb, { ...opts, tier: opts.tier ?? "T2" });
  }
  return null;
}
