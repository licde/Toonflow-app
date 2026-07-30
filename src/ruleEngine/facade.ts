import type { Knex } from "knex";
import type { DryRunResult, EpisodePackage, EpisodeShot, PreflightResult } from "./types";
import {
  parseStoryboardTable,
  shotsFromFlowStoryboard,
  mergeShots,
  mergeShotIdentityFromExisting,
} from "./parsers/storyboardTableParser";
import { parseScriptPlan } from "./parsers/scriptPlanParser";
import { extractScriptMeta } from "./parsers/scriptMetaExtractor";
import { transformShots } from "./transform/emotionBridge";
import { applyDurationCalculator } from "./durationCalculator";
import { touchModality } from "./modalityOrchestrator";
import { validatePackage } from "./validators";
import { resolveConfig } from "./resolveConfig";
import { loadEpisodePackage, saveEpisodePackage, loadProjectBlueprint } from "./storage/episodePackageStore";
import { getRulePackVersion } from "./ruleRegistry";
import { stableHash } from "./utils/hash";
import { applyAutoFix } from "./validators/autoFix";
import { hydratePackageFromPreDesign } from "./bundle/hydratePackageFromPreDesign";
import { parseCrefsSrefsFromPrompt } from "./compilers/compileOrGenerateVideoPrompt";
import { normalizeAssetCode } from "./codes/assetCodeContract";
import type { PreDesignShot } from "./bundle/types";

export interface BuildPackageInput {
  projectId: number;
  scriptId: number;
  script?: string;
  scriptPlan?: string;
  storyboardTable?: string;
  storyboard?: { id?: number; duration?: number; prompt?: string; videoDesc?: string; audioPrompt?: string; fxPrompt?: string; shouldGenerateImage?: number }[];
}

function backfillIdentityFromPrompts(shots: EpisodeShot[]): EpisodeShot[] {
  return shots.map((s) => {
    const blob = String(
      s.generation?.imagePrompt ?? s.generation?.videoPrompt ?? s.generation?.videoDesc ?? "",
    );
    const { crefs, srefs } = parseCrefsSrefsFromPrompt(blob);
    const fromPrompt = [...crefs, ...srefs].map((c) => normalizeAssetCode(c) ?? c);
    const sceneCode =
      s.narrative.sceneCode ||
      (srefs[0] ? normalizeAssetCode(srefs[0]) ?? srefs[0] : undefined);
    const assetCodes = [...new Set([...(s.narrative.assetCodes ?? []), ...fromPrompt])];
    if (!sceneCode && !assetCodes.length) return s;
    return {
      ...s,
      narrative: {
        ...s.narrative,
        ...(sceneCode ? { sceneCode } : {}),
        ...(assetCodes.length ? { assetCodes } : {}),
      },
    };
  });
}

/** Rebuild o_assets2Storyboard from shot narrative codes / prompt refs (G04). */
export async function rebuildAssets2StoryboardFromPackage(
  db: Knex,
  projectId: number,
  pkg: EpisodePackage,
): Promise<number> {
  let linked = 0;
  const assets = await db("o_assets").where({ projectId }).select("id", "remark", "name");
  const codeToId = new Map<string, number>();
  for (const a of assets) {
    const m = String(a.remark ?? "").match(/(?:assetCode|charCode):([A-Za-z]+-[A-Za-z0-9]+)/gi);
    if (m) {
      for (const tag of m) {
        const code = tag.split(":")[1];
        if (code) codeToId.set(normalizeAssetCode(code) ?? code.toUpperCase(), a.id);
      }
    }
  }

  for (const shot of pkg.shots) {
    const sbId = shot.storyboardId;
    if (sbId == null) continue;
    const blob = String(
      shot.generation?.imagePrompt ?? shot.generation?.videoPrompt ?? shot.generation?.videoDesc ?? "",
    );
    const { crefs, srefs } = parseCrefsSrefsFromPrompt(blob);
    const codes = [
      ...new Set([
        ...(shot.narrative.assetCodes ?? []),
        ...(shot.narrative.sceneCode ? [shot.narrative.sceneCode] : []),
        ...crefs,
        ...srefs,
      ]),
    ]
      .map((c) => normalizeAssetCode(c) ?? c)
      .filter(Boolean);

    const ids = [...new Set(codes.map((c) => codeToId.get(c)).filter((id): id is number => typeof id === "number"))];
    await db("o_assets2Storyboard").where({ storyboardId: sbId }).delete();
    if (ids.length) {
      await db("o_assets2Storyboard").insert(ids.map((assetId) => ({ assetId, storyboardId: sbId })));
      linked += ids.length;
    }
  }
  return linked;
}

export async function buildEpisodePackage(db: Knex, input: BuildPackageInput): Promise<EpisodePackage> {
  const existing = await loadEpisodePackage(db, input.projectId, input.scriptId);
  const structured = input.storyboardTable
    ? parseStoryboardTable(
        input.storyboardTable,
        input.storyboard?.map((s) => s.id!).filter(Boolean),
      )
    : [];
  const flat = input.storyboard ? shotsFromFlowStoryboard(input.storyboard) : [];
  let shots = mergeShots(structured, flat);
  shots = mergeShotIdentityFromExisting(shots, existing?.shots);
  shots = backfillIdentityFromPrompts(shots);
  shots = transformShots(applyDurationCalculator(shots));

  return {
    version: (existing?.version ?? 0) + 1,
    projectId: input.projectId,
    scriptId: input.scriptId,
    scriptMeta: input.script ? extractScriptMeta(input.script) : existing?.scriptMeta,
    episodeBeat: input.scriptPlan ? parseScriptPlan(input.scriptPlan) : existing?.episodeBeat,
    shots,
    rulePackVersion: getRulePackVersion(),
    updatedAt: Date.now(),
  };
}

export async function dryRun(
  db: Knex,
  pkg: EpisodePackage,
  script: string,
  profile = "dry-run",
  opts?: { storyboardIds?: number[] },
): Promise<DryRunResult> {
  const config = await resolveConfig(db as never, pkg.projectId);
  const storyboardRows = await db("o_storyboard")
    .where({ scriptId: pkg.scriptId, projectId: pkg.projectId })
    .select("id", "filePath", "shouldGenerateImage");
  const touchedBase = touchModality({ ...pkg, shots: pkg.shots }, config, profile);
  let touched = touchedBase;
  const blueprint = (await loadProjectBlueprint(db, pkg.projectId)) ?? {};
  let planData = blueprint.planData as import("./bundle/types").ScriptBundle["planData"] | undefined;

  // Homology until-clear before H3: F0 + absorb literary EXTRA / strip noise
  try {
    const { episodePackageToScriptBundle } = await import("./detection/preflightProduction");
    const { softHealTouchHomology } = await import("./heal/touchHomologyHeal");
    const { saveProjectBlueprint } = await import("./storage/episodePackageStore");
    let workingPkg: EpisodePackage = { ...pkg, shots: touched };
    const preShots =
      (blueprint.preDesignPack as { shots?: PreDesignShot[] } | undefined)?.shots ??
      (blueprint.preDesign as { shots?: PreDesignShot[] } | undefined)?.shots;
    if (preShots?.length) {
      workingPkg = hydratePackageFromPreDesign(workingPkg, preShots, {});
    }
    const mini = episodePackageToScriptBundle(workingPkg, script, { planData });
    if (preShots?.length && mini.preDesignPack) {
      (mini.preDesignPack as { shots: unknown }).shots = preShots;
    }
    const heal = softHealTouchHomology(mini);
    planData = mini.planData ?? planData;
    if (heal.absorbed > 0 || heal.strippedNoise > 0 || heal.f0Declared.length) {
      const nextBp = {
        ...blueprint,
        fxFeasibilityAudit: (mini as { fxFeasibilityAudit?: unknown }).fxFeasibilityAudit,
        preDesignPack: mini.preDesignPack ?? blueprint.preDesignPack,
        planData: {
          ...((blueprint.planData as object) ?? {}),
          ...((mini.planData as object) ?? {}),
          dialoguePlan:
            (mini.planData as { dialoguePlan?: unknown } | undefined)?.dialoguePlan ??
            (blueprint.planData as { dialoguePlan?: unknown } | undefined)?.dialoguePlan,
        },
      };
      await saveProjectBlueprint(db, pkg.projectId, nextBp);
      const cleaned =
        (mini.preDesignPack as { shots?: PreDesignShot[] } | undefined)?.shots ?? [];
      if (cleaned.length) {
        workingPkg = hydratePackageFromPreDesign(workingPkg, cleaned, {});
        await saveEpisodePackage(db, workingPkg);
        touched = workingPkg.shots;
      }
    }
  } catch {
    /* best-effort homology */
  }

  const report = validatePackage({ ...pkg, shots: touched }, config, script, storyboardRows, {
    planData,
    storyboardIds: opts?.storyboardIds,
  });
  return { shots: touched, report, estimatedCost: touched.length * 0.1 };
}

export async function recomputeShots(
  db: Knex,
  pkg: EpisodePackage,
  shotIds: string[],
  script: string,
): Promise<{ shots: EpisodeShot[]; report: ReturnType<typeof validatePackage> }> {
  const config = await resolveConfig(db as never, pkg.projectId);
  const toRecompute = new Set(shotIds);
  const shots = pkg.shots.map((s) => {
    if (!toRecompute.has(s.id) && s.generation.compiled) return s;
    const enriched = transformShots(applyDurationCalculator([s]))[0];
    return touchModality({ ...pkg, shots: [enriched] }, config)[0];
  });
  const storyboardRows = await db("o_storyboard")
    .where({ scriptId: pkg.scriptId })
    .select("id", "filePath", "shouldGenerateImage");
  const blueprint = (await loadProjectBlueprint(db, pkg.projectId)) ?? {};
  const planData = blueprint.planData as import("./bundle/types").ScriptBundle["planData"] | undefined;
  const report = validatePackage({ ...pkg, shots }, config, script, storyboardRows, { planData });
  return { shots, report };
}

export async function preflightTouch(
  db: Knex,
  pkg: EpisodePackage,
  script: string,
  opts?: { storyboardIds?: number[] },
): Promise<PreflightResult> {
  const { report } = await dryRun(db, pkg, script, "standard", opts);
  const tier0Blocks = report.issues.filter((i) => i.tier === 0 && i.severity === "BLOCK");
  return { allowed: tier0Blocks.length === 0, report };
}

export async function syncFromFlowData(db: Knex, input: BuildPackageInput): Promise<EpisodePackage> {
  let pkg = await buildEpisodePackage(db, input);
  const config = await resolveConfig(db as never, input.projectId);
  pkg.shots = touchModality(pkg, config);
  // touchModality may drop identity — re-backfill from prompts after compile
  pkg.shots = backfillIdentityFromPrompts(pkg.shots);

  const blueprint = (await loadProjectBlueprint(db, input.projectId)) ?? {};
  const preShots =
    (blueprint.preDesignPack as { shots?: PreDesignShot[] } | undefined)?.shots ??
    (blueprint.preDesign as { shots?: PreDesignShot[] } | undefined)?.shots;
  if (preShots?.length) {
    const sceneColorLock =
      (blueprint.sceneColorLock as Record<string, { colorTemp?: string; kelvin?: string | number; name?: string }>) ??
      (blueprint.visualLockTable as { sceneColorLock?: Record<string, { colorTemp?: string; kelvin?: string | number; name?: string }> } | undefined)
        ?.sceneColorLock;
    const fxAudit = blueprint.fxFeasibilityAudit;
    const fxByShotIndex: Record<number, string> = {};
    const rows =
      (fxAudit as { shots?: { shotIndex?: number; level?: string }[] } | undefined)?.shots ??
      (fxAudit as { items?: { shotIndex?: number; level?: string }[] } | undefined)?.items ??
      [];
    for (const r of rows) {
      if (r.shotIndex != null && r.level) fxByShotIndex[r.shotIndex] = String(r.level).toUpperCase();
    }
    // SSOT: blueprint.preDesignPack dialogue/FX wins over flow-derived package (防 sync 回污)
    pkg = hydratePackageFromPreDesign(pkg, preShots, { sceneColorLock, fxByShotIndex });
  }

  await saveEpisodePackage(db, pkg);
  await rebuildAssets2StoryboardFromPackage(db, input.projectId, pkg).catch(() => 0);
  return pkg;
}

export function getCompiledPromptForStoryboard(
  pkg: EpisodePackage,
  storyboardId: number,
  modality: "image" | "video" | "audio",
): string | null {
  const shot = pkg.shots.find((s) => s.storyboardId === storyboardId);
  if (!shot) return null;
  let text: string | null = null;
  if (!shot.generation.compiled) {
    if (modality === "video") text = shot.generation.videoDesc ?? shot.generation.videoPrompt ?? null;
    else if (modality === "audio") text = shot.generation.audioPrompt ?? null;
    else text = shot.generation.imagePrompt ?? null;
  } else {
    text = shot.generation.compiled[modality] ?? null;
  }
  // Refuse stub / thin compiled.video — force callers to rebuild via spine
  if (modality === "video" && text) {
    try {
      const { isVideoPromptStub } = require("./compilers/sanitizeVideoPrompt") as typeof import("./compilers/sanitizeVideoPrompt");
      const { isVideoPromptThinShell } = require("./compilers/assertVideoPromptReady") as typeof import("./compilers/assertVideoPromptReady");
      if (isVideoPromptStub(text) || isVideoPromptThinShell(text)) return null;
      // Comma-soup / non five-section package IR is not spine output
      if (!/\[Visual\]/i.test(text) && !/\[Audio\]/i.test(text) && /motion-from-frame|medium shot static|lipSync off/i.test(text)) {
        return null;
      }
    } catch {
      /* keep text */
    }
  }
  return text;
}

export { applyAutoFix, stableHash };
