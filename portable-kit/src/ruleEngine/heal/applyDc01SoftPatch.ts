/**
 * DC-01 soft_patch persist — append missing lines (with lineId+原文), write EpisodePackage, refresh coverage.
 */
import type { Knex } from "knex";
import { dialogueCoverageReport } from "../design/dialogueCoverage";
import { createInMemoryPatchApplier } from "../precheckLoop/ports";
import { dc01Adapter } from "../precheckLoop/adapters/dc01";
import {
  loadEpisodePackage,
  saveEpisodePackage,
  loadProjectBlueprint,
  saveProjectBlueprint,
} from "../storage/episodePackageStore";
import { episodePackageToScriptBundle } from "../detection/preflightProduction";
import { buildDc01HumanEnvelope } from "../heal/dc01Envelope";
import type { EpisodePackage } from "../types";
import type { ScriptBundle } from "../bundle/types";

export interface ApplyDc01Result {
  ok: boolean;
  applied: string[];
  coverageOk: boolean;
  missingCount: number;
  userMessage: string;
  ctaLabel?: string;
  trigger?: string;
  externalHashCheck?: { match: boolean; hash: string };
}

function syncDialogueFromBundleToPackage(pkg: EpisodePackage, bundle: ScriptBundle): EpisodePackage {
  const srcShots = bundle.preDesignPack?.shots ?? [];
  const nextShots = (pkg.shots ?? []).map((shot, i) => {
    const byId =
      shot.storyboardId != null
        ? srcShots.find((s) => (s as { storyboardId?: number }).storyboardId === shot.storyboardId)
        : undefined;
    const src = (byId ?? srcShots[i]) as { narrative?: { dialogue?: { lines?: unknown } } } | undefined;
    const lines = src?.narrative?.dialogue?.lines;
    if (lines == null) return shot;
    return {
      ...shot,
      narrative: {
        ...(shot.narrative ?? {}),
        dialogue: {
          ...((shot.narrative as { dialogue?: object } | undefined)?.dialogue ?? {}),
          lines,
        },
      },
    };
  });
  return { ...pkg, shots: nextShots as EpisodePackage["shots"] };
}

async function loadScriptText(db: Knex, scriptId: number): Promise<string> {
  const row = await db("o_script").where({ id: scriptId }).first().catch(() => null);
  if (!row) return "";
  return String(row.content ?? row.script ?? row.data ?? "");
}

export async function applyDc01SoftPatchAndPersist(input: {
  db: Knex;
  projectId: number;
  scriptId: number;
  forceApply?: boolean;
}): Promise<ApplyDc01Result> {
  const pkg = await loadEpisodePackage(input.db, input.projectId, input.scriptId);
  if (!pkg?.shots?.length) {
    return {
      ok: false,
      applied: [],
      coverageOk: false,
      missingCount: 0,
      userMessage: "无分镜包，无法补台词",
    };
  }
  const blueprint = (await loadProjectBlueprint(input.db, input.projectId)) ?? {};
  const script = await loadScriptText(input.db, input.scriptId);
  const planData = (blueprint.planData as ScriptBundle["planData"]) ?? undefined;
  let working = episodePackageToScriptBundle(pkg, script, {
    planData,
    designBrief: blueprint.designBrief as ScriptBundle["designBrief"],
    characters: (blueprint as { characters?: ScriptBundle["characters"] }).characters,
  });

  const finding = dc01Adapter.diagnose({ bundle: working, scope: { mode: "full" } });
  const applied: string[] = [];
  if (!finding.passed && dc01Adapter.suggestRepair) {
    const patches = dc01Adapter.suggestRepair(finding, { bundle: working, scope: { mode: "full" } });
    const eligible = input.forceApply ? patches : patches.filter((p) => p.confidence >= 0.55);
    if (eligible.length) {
      const out = createInMemoryPatchApplier().apply(working, eligible);
      working = out.bundle;
      applied.push(...out.applied);
    }
  }

  const patchedPkg = syncDialogueFromBundleToPackage(pkg, working);
  if (blueprint.preDesignPack && typeof blueprint.preDesignPack === "object") {
    const pd = blueprint.preDesignPack as { shots?: unknown[] };
    if (Array.isArray(pd.shots) && working.preDesignPack?.shots) {
      blueprint.preDesignPack = { ...pd, shots: working.preDesignPack.shots };
    }
  }

  const report = dialogueCoverageReport({
    script,
    shots: working.preDesignPack?.shots ?? patchedPkg.shots,
    planData,
  });
  const externalHashCheck = {
    match: report.ok && !report.orderMismatch,
    hash: report.actualHash,
  };
  (blueprint as { externalHashCheck?: typeof externalHashCheck }).externalHashCheck = externalHashCheck;

  await saveEpisodePackage(input.db, patchedPkg);
  await saveProjectBlueprint(input.db, input.projectId, blueprint);

  const env = buildDc01HumanEnvelope({
    evidence: {
      missingCount: report.missingCount,
      missingSamples: report.missingKeys.slice(0, 3),
      repairReasons: report.ok ? [] : ["after_persist"],
    },
  });

  return {
    ok: report.ok,
    applied,
    coverageOk: report.ok,
    missingCount: report.missingCount,
    userMessage: report.ok ? "已补齐缺失台词并写回分镜包" : env.userMessage,
    ctaLabel: report.ok ? undefined : env.ctaLabel,
    trigger: report.ok ? undefined : undefined, // never surface raw →SB as sole UI
    externalHashCheck,
  };
}
