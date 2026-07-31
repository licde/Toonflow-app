/**
 * Dual-write burned video prompt back to episode package generation.compiled.video.
 */
import type { Knex } from "knex";
import { loadEpisodePackage, saveEpisodePackage } from "../storage/episodePackageStore";
import { buildShotChainContract } from "../quality/shotChainContract";
import { deriveSuccessPattern } from "../quality/successPatternLibrary";

export async function writebackBurnVideoToPackage(input: {
  db: Knex;
  projectId: number;
  scriptId: number;
  storyboardId: number;
  videoPrompt: string;
  promptHash: string;
  durationSec: number;
  intentClass?: string | null;
  shotMeta?: Record<string, unknown> | null;
}): Promise<boolean> {
  const pkg = await loadEpisodePackage(input.db, input.projectId, input.scriptId);
  if (!pkg?.shots?.length) return false;
  const ix = pkg.shots.findIndex((s) => s.storyboardId === input.storyboardId);
  if (ix < 0) return false;
  const shot = pkg.shots[ix] as unknown as Record<string, unknown>;
  const gen = { ...((shot.generation as object) ?? {}) } as Record<string, unknown>;
  const compiled = { ...((gen.compiled as object) ?? {}) } as Record<string, unknown>;
  gen.videoPrompt = input.videoPrompt;
  if (input.intentClass) gen.intentClass = input.intentClass;
  compiled.video = input.videoPrompt;
  compiled.hash = input.promptHash;
  gen.compiled = compiled;
  let designContentHash: string | undefined;
  let successPattern: Record<string, unknown> | undefined;
  try {
    const merged = {
      ...shot,
      duration: input.durationSec,
      generation: gen,
    };
    designContentHash = buildShotChainContract(merged).designContentHash;
    successPattern = deriveSuccessPattern({
      visualDescription: String((shot as { visualDescription?: string }).visualDescription ?? ""),
      objectiveClass: String((input.shotMeta as { generationContract?: { objectiveClass?: string } } | null)?.generationContract?.objectiveClass ?? ""),
      promptHash: input.promptHash,
      contractHash: String((input.shotMeta as { contractHash?: string } | null)?.contractHash ?? ""),
    });
  } catch {
    /* optional */
  }
  pkg.shots[ix] = {
    ...shot,
    duration: input.durationSec,
    generation: gen,
    ...(successPattern ? { successPattern } : {}),
    ...(designContentHash ? { designContentHash } : {}),
  } as never;
  await saveEpisodePackage(input.db, pkg);
  return true;
}
