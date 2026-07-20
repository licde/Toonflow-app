/**
 * In-memory import-prep pipeline — same normalize path as import, no DB writes.
 */
import type { ScriptBundle } from "./types";
import type { ShapeSalvageEntry } from "./shapeSalvageTypes";
import { prepareBundleWithLog, scriptBundleSchema } from "./schema";
import { parseScriptBundleOrThrowShape } from "./schemaShapeErrors";
import { applySmartProposalsToBundle } from "../design/smartProposalApplier";
import { materializePackaging } from "./packagingMaterialize";
import { normalizePreDesignPack, applyNormalizedShotsToBundle } from "./normalizePreDesignPack";
import { hasPreDesignShots } from "./preDesignPackAdapter";
import { inferTierFromBundle } from "./closureSummary";
import type { ClosureTier } from "../portable/types";

export interface PreparedBundleForInspect {
  bundle: ScriptBundle;
  tier: ClosureTier;
  shapeSalvageLog?: ShapeSalvageEntry[];
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

  let speakerOrphans: { name: string; code: string }[] = [];
  if (bundle.preDesignPack && hasPreDesignShots(bundle.preDesignPack)) {
    const normalized = normalizePreDesignPack(bundle, { ingestHeal: opts.ingestHeal !== false });
    applyNormalizedShotsToBundle(bundle, normalized.shots);
    speakerOrphans = normalized.speakerOrphans ?? [];
    (bundle as { _speakerOrphans?: { name: string; code: string }[] })._speakerOrphans = speakerOrphans;
  }

  const tier = inferTierFromBundle(bundle);
  return { bundle, tier, shapeSalvageLog: prepared.shapeSalvageLog, speakerOrphans };
}
