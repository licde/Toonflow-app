/**
 * In-memory import-prep pipeline — same normalize path as import, no DB writes.
 */
import type { ScriptBundle } from "./types";
import type { ShapeSalvageEntry } from "./shapeSalvageTypes";
import { formatShapeSalvageSummary } from "./shapeSalvageTypes";
import { prepareBundleWithLog, scriptBundleSchema } from "./schema";
import { parseScriptBundleOrThrowShape } from "./schemaShapeErrors";
import { applySmartProposalsToBundle } from "../design/smartProposalApplier";
import { materializePackaging } from "./packagingMaterialize";
import { normalizePreDesignPack, applyNormalizedShotsToBundle } from "./normalizePreDesignPack";
import { hasPreDesignShots } from "./preDesignPackAdapter";
import { inferTierFromBundle } from "./closureSummary";
import type { ClosureTier } from "../portable/types";
import { normalizeVisualLockTableOnBundle } from "./assetLabel";
import { runShotExpanders } from "../design/expanderRegistry";
import { migrateShotVisualBeatTags } from "../design/visualBeatPolicy";

export interface PreparedBundleForInspect {
  bundle: ScriptBundle;
  tier: ClosureTier;
  shapeSalvageLog?: ShapeSalvageEntry[];
  shapeSalvageSummary?: string;
  speakerOrphans: { name: string; code: string }[];
}

export interface PrepareBundleForInspectOpts {
  /** false for exportGate strict check; true (default) for import/dryRun ingest */
  ingestHeal?: boolean;
}

/** Parse + materialize + normalize (mirror import asset-closure prep). */
export function prepareBundleForInspect(raw: unknown, opts: PrepareBundleForInspectOpts = {}): PreparedBundleForInspect {
  const prepared = prepareBundleWithLog(raw);
  const parsed = parseScriptBundleOrThrowShape(prepared.bundle, scriptBundleSchema) as ScriptBundle;
  let bundle = parsed;
  const proposals = (bundle as ScriptBundle & { smartDesignProposals?: unknown[] }).smartDesignProposals;
  if (proposals?.length) {
    bundle = applySmartProposalsToBundle(bundle, proposals as Parameters<typeof applySmartProposalsToBundle>[1]);
  }
  const mat = materializePackaging(bundle);
  bundle = mat.bundle;
  normalizeVisualLockTableOnBundle(bundle);

  let speakerOrphans: { name: string; code: string }[] = [];
  let semanticHealLog: ShapeSalvageEntry[] = [];
  if (bundle.preDesignPack && hasPreDesignShots(bundle.preDesignPack)) {
    const normalized = normalizePreDesignPack(bundle, { ingestHeal: opts.ingestHeal !== false });
    let shots = normalized.shots as Record<string, unknown>[];
    if (opts.ingestHeal !== false) {
      shots = shots.map((s) => migrateShotVisualBeatTags(s, { confirmSuggested: false }));
      const meta =
        ((bundle.planData as { meta?: Record<string, unknown> } | undefined)?.meta ??
          (bundle as unknown as { meta?: Record<string, unknown> }).meta) ??
        {};
      // Import/preview salvage: auto expand under enforce meta only when chatStrict≠true
      const chatStrict = Boolean((bundle as { chatStrict?: boolean }).chatStrict);
      if (!chatStrict) {
        const expanded = runShotExpanders(shots, {
          meta: { ...meta, pillarsVisBeatV2: (meta.pillarsVisBeatV2 as string) || "shadow" },
          applyClusters: true,
        });
        shots = expanded.shots;
        if (expanded.log.some((l) => l.expanded)) {
          semanticHealLog.push({
            ruleId: "VIS-MULTI-BEAT",
            path: "preDesignPack.shots",
            action: `visBeat_expand:${expanded.log.map((l) => `${l.expanderId}:${l.count}`).join(",")}`,
          });
        }
      }
    }
    applyNormalizedShotsToBundle(bundle, shots as Parameters<typeof applyNormalizedShotsToBundle>[1]);
    speakerOrphans = normalized.speakerOrphans ?? [];
    semanticHealLog = [...(normalized.semanticHealLog ?? []), ...semanticHealLog];
    (bundle as { _speakerOrphans?: { name: string; code: string }[] })._speakerOrphans = speakerOrphans;
  }

  const mergedLog = [...(prepared.shapeSalvageLog ?? []), ...semanticHealLog];
  const tier = inferTierFromBundle(bundle);
  return {
    bundle,
    tier,
    shapeSalvageLog: mergedLog,
    shapeSalvageSummary: formatShapeSalvageSummary(mergedLog),
    speakerOrphans,
  };
}
