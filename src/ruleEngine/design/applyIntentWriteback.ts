/**
 * Shared post-apply writeback: cascade stale → designExit re-gate → optional storyboard sync.
 * SSOT for V5-01 / V5-11 / ladder.requireReGateAfterApply.
 */
import type { Knex } from "knex";
import { cascadeForwardStale } from "../quality/forwardStaleCascade";
import { runDesignExitGate, type DesignExitResult } from "../design/designExitGate";
import { readFixtureJson } from "../utils/fixturesPath";
import { syncStoryboardToDb } from "../bundle/storyboardSync";
import { preDesignShotsToPanels } from "../bundle/preDesignPackAdapter";

export type ApplyWritebackResult = {
  shots: Record<string, unknown>[];
  exitGate: { ok: boolean; failedIds: string[]; warnings: string[] };
  cascade: { markedStale: number; clearedVideoPass: number };
  designExitPass: boolean;
  forgedPass: boolean;
  syncedStoryboard?: boolean;
};

function ladderRequiresReGate(): boolean {
  try {
    const ladder = readFixtureJson<{ requireReGateAfterApply?: boolean }>("repair_confidence_ladder.json", {});
    return ladder.requireReGateAfterApply !== false;
  } catch {
    return true;
  }
}

export function applyCascadeAndReGate(input: {
  plan: Record<string, unknown>;
  shots: Record<string, unknown>[];
  stageId?: string;
  skipReGate?: boolean;
}): ApplyWritebackResult {
  const cascaded = cascadeForwardStale({
    shots: input.shots,
    forwardStages: ["SB", "MD-IMG", "EN"],
  });
  try {
    const { regenerateModalityPromptsAfterDesign } =
      require("./modalityPromptRegen") as typeof import("./modalityPromptRegen");
    regenerateModalityPromptsAfterDesign({
      shots: cascaded.shots,
      forceAll: true,
    });
  } catch {
    /* optional */
  }
  const pd = ((input.plan.planData as Record<string, unknown>) ??= {});
  const pack = ((pd.preDesignPack as Record<string, unknown>) ??= {});
  pack.shots = cascaded.shots;
  pd.preDesignPack = pack;
  input.plan.planData = pd;

  let exit: DesignExitResult | { ok: boolean; failedIds: string[]; warnings: string[] } = {
    ok: true,
    failedIds: [],
    warnings: [],
  };
  const doReGate = !input.skipReGate && ladderRequiresReGate();
  if (doReGate) {
    try {
      const planView = {
        ...input.plan,
        planData: pd,
        preDesignPack: { shots: cascaded.shots },
      };
      exit = runDesignExitGate(input.stageId ?? "SB", planView as Record<string, unknown>, {
        chatStrict: false,
      });
    } catch (e) {
      exit = {
        ok: false,
        failedIds: ["EXIT-REGATE-ERR"],
        warnings: [e instanceof Error ? e.message : "reGate fail"],
      };
    }
  }

  const failedIds = exit.failedIds ?? [];
  const ok = Boolean(exit.ok) && failedIds.length === 0;
  return {
    shots: cascaded.shots,
    exitGate: {
      ok,
      failedIds,
      warnings: (exit as { warnings?: string[] }).warnings ?? [],
    },
    cascade: {
      markedStale: cascaded.markedStale,
      clearedVideoPass: cascaded.clearedVideoPass,
    },
    designExitPass: ok,
    forgedPass: false,
  };
}

export async function syncShotsToStoryboardDb(input: {
  db: Knex;
  projectId: number;
  scriptId: number;
  shots: Record<string, unknown>[];
}): Promise<boolean> {
  try {
    const panels = preDesignShotsToPanels(input.shots as never);
    await syncStoryboardToDb(input.db, input.projectId, input.scriptId, panels, { preserveMedia: true });
    return true;
  } catch {
    return false;
  }
}
