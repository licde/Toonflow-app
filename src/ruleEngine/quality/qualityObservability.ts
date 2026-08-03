/**
 * qualityObservability — compact stats bucket for repair and readiness governance.
 */
export function buildQualityObservabilityRow(input: {
  stillQuality?: string | null;
  i2vReady?: boolean | null;
  autoRepairStage?: string | null;
  failureKinds?: string[] | null;
  healTrace?: string[] | null;
  debtKind?: string | null;
  deliveryTier?: string | null;
}): Record<string, unknown> {
  return {
    stillQuality: input.stillQuality ?? null,
    i2vReady: input.i2vReady ?? null,
    autoRepairStage: input.autoRepairStage ?? null,
    failureKinds: input.failureKinds ?? [],
    healTrace: input.healTrace ?? [],
    debtKind: input.debtKind ?? null,
    deliveryTier: input.deliveryTier ?? null,
    recordedAt: new Date().toISOString(),
  };
}
