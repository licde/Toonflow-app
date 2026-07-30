/**
 * M12/M17 — atomic-ish triple writeback after smart split.
 * Order: storyboard sync → EpisodePackage → agentWork. Sync fail = no pkg/agent persist.
 */
import type { Knex } from "knex";
import type { PreDesignShot } from "../bundle/types";
import { preDesignShotsToPanels } from "../bundle/preDesignPackAdapter";
import { syncStoryboardToDb } from "../bundle/storyboardSync";
import { hydratePackageFromPreDesign } from "../bundle/hydratePackageFromPreDesign";
import { loadEpisodePackage, saveEpisodePackage } from "../storage/episodePackageStore";
import type { EpisodePackage } from "../types";
import { rebindAudioVoiceAfterSplit } from "./audioVoiceRebind";

export type SplitWritebackResult = {
  ok: boolean;
  code?: string;
  syncResult?: unknown;
  packageSaved?: boolean;
  agentSaved?: boolean;
  audioRebound?: number;
  healFailed?: string;
};

export async function persistSplitTripleAtomic(input: {
  db: Knex;
  projectId: number;
  scriptId: number;
  plan: Record<string, unknown>;
  shots: Record<string, unknown>[];
  saveAgentWork: (plan: Record<string, unknown>) => Promise<void>;
  /** When false, skip storyboard (diagnose-only). Default true when scriptId set. */
  syncStoryboard?: boolean;
}): Promise<SplitWritebackResult> {
  const { db, projectId, scriptId, plan, shots } = input;
  const syncStoryboard = input.syncStoryboard !== false;

  const rebound = rebindAudioVoiceAfterSplit(shots);
  const pd = (plan.planData ??= {}) as Record<string, unknown>;
  const pack = (pd.preDesignPack ??= { shots: [] }) as { shots: Record<string, unknown>[] };
  pack.shots = rebound.shots;
  pd.preDesignPack = pack;

  // M4: cascade stale prompts after split writeback
  try {
    const { cascadeForwardStale } =
      require("../quality/forwardStaleCascade") as typeof import("../quality/forwardStaleCascade");
    cascadeForwardStale({
      shots: pack.shots,
      forwardStages: ["SB", "MD-IMG", "MD-VID", "EN"],
    });
  } catch {
    /* optional */
  }

  let syncResult: unknown;
  if (syncStoryboard && scriptId) {
    const panels = preDesignShotsToPanels(rebound.shots as PreDesignShot[], { enrichFromDesign: true });
    try {
      syncResult = await syncStoryboardToDb(db, projectId, scriptId, panels, { preserveMedia: true });
    } catch (e) {
      return {
        ok: false,
        code: "SPLIT-WRITEBACK-SYNC",
        healFailed: e instanceof Error ? e.message : String(e),
        audioRebound: rebound.rebound,
      };
    }
  }

  try {
    const pkg = await loadEpisodePackage(db, projectId, scriptId);
    if (pkg) {
      const hydrated = hydratePackageFromPreDesign(pkg, rebound.shots as PreDesignShot[]) as EpisodePackage & {
        meta?: Record<string, unknown>;
      };
      hydrated.meta = {
        ...((hydrated.meta as object) ?? {}),
        ...((pd.meta as object) ?? {}),
        packageVersion: Number(
          (rebound.shots[0] as { packageVersion?: number } | undefined)?.packageVersion ?? pkg.version ?? 0,
        ),
      };
      hydrated.version = Number(hydrated.version ?? 0) + 1;
      await saveEpisodePackage(db, hydrated);
    }
  } catch (e) {
    return {
      ok: false,
      code: "SPLIT-WRITEBACK-PKG",
      syncResult,
      healFailed: e instanceof Error ? e.message : String(e),
      audioRebound: rebound.rebound,
    };
  }

  // flowData best-effort
  try {
    const flowRow = await db("o_agentWorkData").where({ projectId, key: "productionAgent" }).first();
    if (flowRow?.data) {
      const flow = JSON.parse(flowRow.data as string) as {
        flowData?: { shots?: unknown[]; preDesignPack?: { shots?: unknown[] } };
      };
      if (flow.flowData) {
        flow.flowData.preDesignPack = { ...(flow.flowData.preDesignPack ?? {}), shots: rebound.shots };
        await db("o_agentWorkData")
          .where({ id: flowRow.id })
          .update({ data: JSON.stringify(flow), updateTime: Date.now() });
      }
    }
  } catch {
    /* optional */
  }

  await input.saveAgentWork(plan);
  return {
    ok: true,
    syncResult,
    packageSaved: true,
    agentSaved: true,
    audioRebound: rebound.rebound,
  };
}
