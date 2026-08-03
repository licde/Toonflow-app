/**
 * DEX stage registry — each id declares import / exit / burn mount so import-green ≠ burn-swallow.
 */
export type DexStage = "import" | "exit" | "burn";

export type DexStageEntry = {
  id: string;
  stages: DexStage[];
  /** When true, burn may soft-heal design SSOT then recompile instead of hard BLOCK. */
  healPrefer?: boolean;
  /** When true, heal_then_burn must not absorb. */
  noAbsorb?: boolean;
};

export const VIDEO_DEX_STAGE_MATRIX: DexStageEntry[] = [
  { id: "VID-LANG-01", stages: ["import", "exit", "burn"], noAbsorb: true },
  { id: "VID-EXPR-SPEAK", stages: ["import", "exit", "burn"], healPrefer: true },
  { id: "VID-MOUTH-XOR", stages: ["import", "exit", "burn"], healPrefer: true },
  { id: "VID-PERF-MOTION", stages: ["exit", "burn"], healPrefer: true },
  { id: "VID-AV-SFX", stages: ["exit", "burn"], healPrefer: true },
  { id: "VID-COMP-01", stages: ["exit", "burn"], healPrefer: true },
  { id: "VID-FX-F0", stages: ["import", "exit", "burn"] },
  { id: "VID-EMOTION", stages: ["exit", "burn"], healPrefer: true },
  { id: "VID-DUR-LIP", stages: ["exit", "burn"], noAbsorb: true },
  { id: "VID-STILL-HANDOFF", stages: ["burn"], noAbsorb: true },
  { id: "DEX-EXPR-SPEAK", stages: ["import", "exit", "burn"], healPrefer: true },
  { id: "STILL-I2V-NOT-READY", stages: ["burn"], noAbsorb: false },
  { id: "STILL-VIDEO-POSE-MISMATCH", stages: ["burn"], noAbsorb: false },
  { id: "STILL-CONTACT-HANDOFF", stages: ["burn"], noAbsorb: false },
  { id: "STILL-MOUTH-HANDOFF", stages: ["burn"], noAbsorb: false },
];

export function dexEntry(id: string): DexStageEntry | undefined {
  return VIDEO_DEX_STAGE_MATRIX.find((e) => e.id === id);
}

export function dexMountedAt(id: string, stage: DexStage): boolean {
  return Boolean(dexEntry(id)?.stages.includes(stage));
}

export function assertDexMatrixCoverage(requiredIds: string[]): { ok: boolean; missing: string[] } {
  const missing = requiredIds.filter((id) => !dexEntry(id));
  return { ok: missing.length === 0, missing };
}
