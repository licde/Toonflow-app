/**
 * Propose+Confirm for splitPlan / fxTemplate — confirm writes; undo via snapshot.
 * splitPlan/2 carries visualDescription for still one-beat.
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
 * Clears filePath on children (no dirty parent media inherit by index).
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
  const parentKey = String(original.clientId ?? original.shotIndex ?? `s${at}`);
  const created = plan.proposedShots.map((p, i) => {
    const n = { ...((original.narrative as object) ?? {}) } as {
      duration?: number;
      shotSize?: string;
      dialogue?: { lines?: unknown[] };
    };
    const hasVd = Boolean(p.visualDescription);
    return {
      ...original,
      clientId: `${parentKey}-sp-${p.role}-${i}`,
      shotIndex: Number(original.shotIndex ?? at + 1) + i,
      duration: p.suggestedDurationSec,
      visualDescription: p.visualDescription ?? original.visualDescription,
      visualBeatTags: p.tags ?? original.visualBeatTags,
      shotSize: p.shotSize ?? original.shotSize,
      _splitFrom: plan.shotIndex,
      _splitRole: p.role,
      _stillBeatSplitId: hasVd ? parentKey : original._stillBeatSplitId,
      burnParentForbidden: true,
      filePath: undefined,
      stillQuality: undefined,
      promptState: "stale",
      composeHash: undefined,
      videoPass: false,
      narrative: {
        ...n,
        duration: p.suggestedDurationSec,
        shotSize: p.shotSize ?? n.shotSize,
        dialogue: hasVd
          ? { lines: [] }
          : {
              lines: [{ text: p.dialogueSlice, splitHint: p.role === "reaction" ? plan.splitHint : undefined }],
            },
      },
    };
  });
  const nextShots = [...shots.slice(0, at), ...created, ...shots.slice(at + 1)];
  nextShots.forEach((s, i) => {
    s.shotIndex = i + 1;
    s.index = i;
  });
  const next: ScriptBundle = {
    ...bundle,
    preDesignPack: { ...(bundle.preDesignPack ?? {}), shots: nextShots as never },
  };
  return { bundle: next, undoToken: snap.snapshotId };
}
