import type { Knex } from "knex";
import type { DryRunResult, EpisodePackage, EpisodeShot, PreflightResult, ResolvedConfig } from "./types";
import { parseStoryboardTable, shotsFromFlowStoryboard, mergeShots } from "./parsers/storyboardTableParser";
import { parseScriptPlan } from "./parsers/scriptPlanParser";
import { extractScriptMeta } from "./parsers/scriptMetaExtractor";
import { transformShots } from "./transform/emotionBridge";
import { applyDurationCalculator } from "./durationCalculator";
import { touchModality } from "./modalityOrchestrator";
import { validatePackage } from "./validators";
import { resolveConfig } from "./resolveConfig";
import { loadEpisodePackage, saveEpisodePackage } from "./storage/episodePackageStore";
import { getRulePackVersion } from "./ruleRegistry";
import { stableHash } from "./utils/hash";
import { applyAutoFix } from "./validators/autoFix";

export interface BuildPackageInput {
  projectId: number;
  scriptId: number;
  script?: string;
  scriptPlan?: string;
  storyboardTable?: string;
  storyboard?: { id?: number; duration?: number; prompt?: string; videoDesc?: string; shouldGenerateImage?: number }[];
}

export async function buildEpisodePackage(db: Knex, input: BuildPackageInput): Promise<EpisodePackage> {
  const existing = await loadEpisodePackage(db, input.projectId, input.scriptId);
  const structured = input.storyboardTable ? parseStoryboardTable(input.storyboardTable, input.storyboard?.map((s) => s.id!).filter(Boolean)) : [];
  const flat = input.storyboard ? shotsFromFlowStoryboard(input.storyboard) : [];
  let shots = mergeShots(structured, flat);
  shots = transformShots(applyDurationCalculator(shots));
  const config = await resolveConfig(db as never, input.projectId);

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

export async function dryRun(db: Knex, pkg: EpisodePackage, script: string, profile = "dry-run"): Promise<DryRunResult> {
  const config = await resolveConfig(db as never, pkg.projectId);
  const storyboardRows = await db("o_storyboard").where({ scriptId: pkg.scriptId, projectId: pkg.projectId }).select("id", "filePath", "shouldGenerateImage");
  const touched = touchModality({ ...pkg, shots: pkg.shots }, config, profile);
  const report = validatePackage({ ...pkg, shots: touched }, config, script, storyboardRows);
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
  const storyboardRows = await db("o_storyboard").where({ scriptId: pkg.scriptId }).select("id", "filePath", "shouldGenerateImage");
  const report = validatePackage({ ...pkg, shots }, config, script, storyboardRows);
  return { shots, report };
}

export async function preflightTouch(db: Knex, pkg: EpisodePackage, script: string): Promise<PreflightResult> {
  const { report } = await dryRun(db, pkg, script, "standard");
  const tier0Blocks = report.issues.filter((i) => i.tier === 0 && i.severity === "BLOCK");
  return { allowed: tier0Blocks.length === 0, report };
}

export async function syncFromFlowData(db: Knex, input: BuildPackageInput): Promise<EpisodePackage> {
  const pkg = await buildEpisodePackage(db, input);
  const config = await resolveConfig(db as never, input.projectId);
  pkg.shots = touchModality(pkg, config);
  await saveEpisodePackage(db, pkg);
  return pkg;
}

export function getCompiledPromptForStoryboard(pkg: EpisodePackage, storyboardId: number, modality: "image" | "video" | "audio"): string | null {
  const shot = pkg.shots.find((s) => s.storyboardId === storyboardId);
  if (!shot?.generation.compiled) return shot?.generation.imagePrompt ?? null;
  return shot.generation.compiled[modality] ?? null;
}

export { applyAutoFix, stableHash };
