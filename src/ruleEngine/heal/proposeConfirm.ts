/**
 * Propose+Confirm for splitPlan / fxTemplate (M2) — confirm writes; undo via snapshot.
 */
import type { ScriptBundle } from "../bundle/types";
import type { SplitPlanStub } from "../compilers/splitPlanStub";
import { newSnapshotId, nextPackageVersion } from "./packageConcurrency";

export interface ProposeSnapshot {
  snapshotId: string;
  packageVersion: number;
  bundle: ScriptBundle;
  kind: "splitPlan" | "fxTemplate";
  createdAt: string;
}

const undoStore = new Map<string, ProposeSnapshot>();

export function stashProposeSnapshot(bundle: ScriptBundle, kind: ProposeSnapshot["kind"], version?: number): ProposeSnapshot {
  const snap: ProposeSnapshot = {
    snapshotId: newSnapshotId(),
    packageVersion: nextPackageVersion(version),
    bundle: JSON.parse(JSON.stringify(bundle)) as ScriptBundle,
    kind,
    createdAt: new Date().toISOString(),
  };
  undoStore.set(snap.snapshotId, snap);
  return snap;
}

export function undoPropose(snapshotId: string): ScriptBundle | null {
  const snap = undoStore.get(snapshotId);
  if (!snap) return null;
  undoStore.delete(snapshotId);
  return JSON.parse(JSON.stringify(snap.bundle)) as ScriptBundle;
}

/**
 * Apply split plan by expanding one shot into proposedShots (physical split).
 * Caller persists bundle; renumber shotIndex sequentially.
 */
export function applySplitPlanToBundle(
  bundle: ScriptBundle,
  plan: SplitPlanStub,
): { bundle: ScriptBundle; undoToken: string } {
  const snap = stashProposeSnapshot(bundle, "splitPlan");
  const shots = [...(bundle.preDesignPack?.shots ?? [])] as Record<string, unknown>[];
  const idx = shots.findIndex((s) => Number(s.shotIndex) === Number(plan.shotIndex));
  const at = idx >= 0 ? idx : 0;
  const original = shots[at] ?? {};
  const created = plan.proposedShots.map((p, i) => ({
    ...original,
    shotIndex: Number(original.shotIndex ?? at + 1) + i,
    duration: p.suggestedDurationSec,
    narrative: {
      ...((original.narrative as object) ?? {}),
      duration: p.suggestedDurationSec,
      dialogue: {
        lines: [{ text: p.dialogueSlice, splitHint: p.role === "reaction" ? plan.splitHint : undefined }],
      },
    },
    _splitFrom: plan.shotIndex,
    _splitRole: p.role,
  }));
  const nextShots = [...shots.slice(0, at), ...created, ...shots.slice(at + 1)];
  // renumber SSOT
  nextShots.forEach((s, i) => {
    s.shotIndex = i + 1;
  });
  const next: ScriptBundle = {
    ...bundle,
    preDesignPack: { ...(bundle.preDesignPack ?? {}), shots: nextShots as never },
  };
  return { bundle: next, undoToken: snap.snapshotId };
}
