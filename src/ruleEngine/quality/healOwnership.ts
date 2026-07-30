/**
 * Four-layer heal ownership — prevent double-write on the same field.
 *
 * L1 healViralDesignRouter — viral domains / evidence / split orch
 * L2 healShotQuality — shot field provenance (charCodes, empty-shot strip, low-intensity performance)
 * L3 applySilentSoftPatches — burn-gate soft patches
 * L4 planPostBurnRepairs — post-burn strengthen / retry
 */
export const HEAL_LAYERS = {
  L1_DESIGN: "healViralDesignRouter",
  L2_INGEST: "healShotQuality",
  L3_BURN_SOFT: "applySilentSoftPatches",
  L4_POSTBURN: "planPostBurnRepairs",
} as const;

/** Conflict order within L2 (first wins / runs first). */
export const L2_CONFLICT_ORDER = [
  "cast_on_desc",
  "empty_shot",
  "performance_defaults",
  "duration_lip",
] as const;

export type HealLayerId = keyof typeof HEAL_LAYERS;

/** Fields L2 owns — L3/L4 must not silently overwrite without checking provenance. */
export const L2_OWNED_FIELDS = [
  "charCodes",
  "visualDescription",
  "shotDesign.performance.microExpression",
  "shotDesign.lipSyncPolicy",
  "duration",
] as const;

export function isL2OwnedField(field: string): boolean {
  return (L2_OWNED_FIELDS as readonly string[]).some((f) => field === f || field.startsWith(f));
}

export type ShotQualityProvenance = {
  layer: "L2";
  heals: Array<{
    field: string;
    from?: unknown;
    to?: unknown;
    reasonCode: string;
    confidence: number;
    source: string;
  }>;
  fingerprint?: string;
};
