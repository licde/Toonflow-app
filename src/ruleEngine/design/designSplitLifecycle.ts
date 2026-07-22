/**
 * Design-split lifecycle: undo snapshot, reverse loop, telemetry, forward reentry after repair.
 */
import { planForwardReentry, checkReverseLoop } from "./visBeatLifecycle";
import { runSplitOrchestrator } from "./splitOrchestrator";

export type DesignSplitTelemetryEvent =
  | "propose"
  | "confirm"
  | "undo"
  | "orchestrator_fail"
  | "dry_run"
  | "forward_reentry";

const telemetryLog: { at: string; event: DesignSplitTelemetryEvent; detail?: string }[] = [];

export function recordDesignSplitTelemetry(event: DesignSplitTelemetryEvent, detail?: string): void {
  telemetryLog.push({ at: new Date().toISOString(), event, detail });
  if (telemetryLog.length > 200) telemetryLog.shift();
}

export function getDesignSplitTelemetryForTests(): typeof telemetryLog {
  return [...telemetryLog];
}

export function clearDesignSplitTelemetryForTests(): void {
  telemetryLog.length = 0;
}

export type DesignSplitSnapshot = {
  packageVersion: number;
  planData: Record<string, unknown>;
  shots: Record<string, unknown>[];
};

/** Soft undo buffer keyed by projectId (in-memory; last confirm only). */
const undoByProject = new Map<number, DesignSplitSnapshot>();

export function pushDesignSplitUndo(projectId: number, snap: DesignSplitSnapshot): void {
  undoByProject.set(projectId, snap);
}

export function popDesignSplitUndo(projectId: number, expectedVersion?: number): DesignSplitSnapshot | null {
  const snap = undoByProject.get(projectId);
  if (!snap) return null;
  if (expectedVersion != null && snap.packageVersion !== expectedVersion) return null;
  undoByProject.delete(projectId);
  return snap;
}

export function peekPackageVersion(shots: Record<string, unknown>[]): number {
  return Math.max(0, ...shots.map((s) => Number(s.packageVersion ?? 0)));
}

/**
 * After reverse repair: run orchestrator + mark stale prompts; keep hq_ok media.
 */
export function runForwardReentryAfterRepair(input: {
  planData?: Record<string, unknown> | null;
  shots: Record<string, unknown>[];
  meta?: Record<string, unknown> | null;
  applyClauseSplit?: boolean;
}): {
  planData: Record<string, unknown>;
  shots: Record<string, unknown>[];
  reentry: ReturnType<typeof planForwardReentry>;
  log: { step: string; detail?: string; count?: number }[];
} {
  const orch = runSplitOrchestrator({
    planData: input.planData,
    shots: input.shots,
    meta: input.meta,
    applyClauseSplit: input.applyClauseSplit !== false,
    applyVisBeatExpanders: true,
  });
  const reentry = planForwardReentry(orch.shots);
  for (const s of orch.shots) {
    const id = String(s.clientId ?? s.shotIndex ?? "");
    if (reentry.staleClientIds.includes(id)) {
      s.promptState = "stale";
      s.composeHash = undefined;
    }
  }
  recordDesignSplitTelemetry("forward_reentry", `stale=${reentry.staleClientIds.length}`);
  return { planData: orch.planData, shots: orch.shots, reentry, log: orch.log };
}

/** Dual-track: auto/silent may heal without RH; must-edit always RH. */
export function shouldEmitRepairHint(dualTrack: "must" | "auto" | "silent", healed: boolean): boolean {
  if (dualTrack === "silent") return false;
  if (dualTrack === "auto" && healed) return false;
  return true;
}

export function guardReverseLoop(
  trigger: string,
  projectKey: string,
  max = 3,
): { allow: boolean; count: number; escalateHuman: boolean } {
  const r = checkReverseLoop(trigger, projectKey, max);
  return { allow: r.allow, count: r.count, escalateHuman: !r.allow };
}
