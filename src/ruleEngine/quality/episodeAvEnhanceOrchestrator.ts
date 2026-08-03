/**
 * Episode-level AV enhance orchestrator — cross-shot polish after per-shot adapt.
 * Design SSOT unchanged; polishes camera grammar, SFX cadence, emotion arc.
 */
import { buildRealizationAdaptPack, type RealizationAdaptPack } from "../compilers/realizationAdapt";
import { mayApplyEpisodePolish } from "../compilers/policyPrecedence";
import {
  isEpisodeAvEnhanceEnabled,
  episodePreflightBudgetMs,
} from "../compilers/realizationAdaptFlags";
import { auditEpisodeContinuity } from "./episodeContinuityContract";

export type EpisodeShotAdaptInput = {
  shotIndex?: number | null;
  sceneCode?: string | null;
  shotMeta?: Record<string, unknown> | null;
  designShot?: Record<string, unknown> | null;
  durationSec?: number | null;
  dialoguePresent?: boolean;
  emotionIntensity?: number | null;
};

export type EpisodeAvMetrics = {
  totalShots: number;
  adaptHitCount: number;
  degradeCount: number;
  intentRealizationMismatchCount: number;
  polishAppliedCount: number;
  continuityFindings: string[];
  elapsedMs: number;
  budgetExceeded: boolean;
  episodeEnhanceEnabled: boolean;
};

export type EpisodeShotAdaptResult = {
  shotIndex: number | null;
  adaptPack: RealizationAdaptPack;
  polishNotes: string[];
};

export type EpisodeAvEnhanceResult = {
  shots: EpisodeShotAdaptResult[];
  metrics: EpisodeAvMetrics;
  degradedToPerShot: boolean;
};

function extractEmotion(shot: EpisodeShotAdaptInput): number | null {
  const n =
    shot.emotionIntensity ??
    Number((shot.designShot?.narrative as { emotionIntensity?: number } | undefined)?.emotionIntensity) ??
    Number((shot.shotMeta?.emotionIntensity as number | undefined) ?? NaN);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function hasDialogue(shot: EpisodeShotAdaptInput): boolean {
  if (shot.dialoguePresent === true) return true;
  const lines =
    (shot.designShot?.narrative as { dialogue?: { lines?: unknown[] } } | undefined)?.dialogue?.lines ??
    (shot.shotMeta?.narrative as { dialogue?: { lines?: unknown[] } } | undefined)?.dialogue?.lines;
  return Array.isArray(lines) && lines.length > 0;
}

function extractVd(shot: EpisodeShotAdaptInput): string {
  return String(
    shot.designShot?.visualDescription ??
      shot.shotMeta?.visualDescription ??
      shot.shotMeta?.videoDesc ??
      "",
  ).trim();
}

/** Cross-shot SFX dedupe within same scene — stagger repeated paper friction. */
function polishSfxCadence(shots: EpisodeShotAdaptResult[]): number {
  let count = 0;
  const seenByScene = new Map<string, number>();
  for (const s of shots) {
    const pack = s.adaptPack;
    if (!pack.sfxBeat || !/纸|摩擦/.test(pack.sfxBeat)) continue;
    const scene = String((s as { sceneCode?: string }).sceneCode ?? "default");
    const n = seenByScene.get(scene) ?? 0;
    if (n >= 1) {
      pack.sfxBeat = undefined;
      s.polishNotes.push("sfx_stagger:duplicate_paper_friction");
      count++;
    } else {
      seenByScene.set(scene, n + 1);
    }
  }
  return count;
}

/** Dialogue shots in same scene → static camera grammar. */
function polishCameraGrammar(shots: EpisodeShotAdaptResult[], inputs: EpisodeShotAdaptInput[]): number {
  let count = 0;
  for (let i = 0; i < shots.length; i++) {
    const inp = inputs[i];
    if (!hasDialogue(inp)) continue;
    if (shots[i].adaptPack.cameraPolicy !== "静止") {
      shots[i].adaptPack.cameraPolicy = "静止";
      shots[i].polishNotes.push("cam_static:dialogue_shot");
      count++;
    }
  }
  return count;
}

/** Smooth emotion cliff between adjacent shots (boost only, never change VD). */
function polishEmotionArc(shots: EpisodeShotAdaptResult[], inputs: EpisodeShotAdaptInput[]): number {
  let count = 0;
  for (let i = 1; i < shots.length; i++) {
    const prev = extractEmotion(inputs[i - 1]);
    const cur = extractEmotion(inputs[i]);
    if (prev == null || cur == null) continue;
    if (cur - prev >= 4) {
      shots[i].polishNotes.push("emotion_cliff:warn");
      if (!shots[i].adaptPack.performanceBoost) {
        shots[i].adaptPack.performanceBoost = "情绪递进";
        count++;
      }
    }
  }
  return count;
}

/**
 * Run episode preflight: per-shot adapt + cross-shot polish.
 * On budget exceed → returns per-shot adapt only (no cross polish).
 */
/** Wave-3: consecutive dialogue → realization polish notes for L/J-cut (design SSOT untouched). */
function polishJlCutContinuity(
  results: EpisodeShotAdaptResult[],
  inputs: EpisodeShotAdaptInput[],
): number {
  let n = 0;
  for (let i = 0; i < inputs.length - 1; i++) {
    const a = inputs[i]!;
    const b = inputs[i + 1]!;
    if (!a.dialoguePresent || !b.dialoguePresent) continue;
    const scA = String(a.sceneCode ?? "");
    const scB = String(b.sceneCode ?? "");
    if (scA && scB && scA !== scB) continue;
    if (!results[i] || !results[i + 1]) continue;
    if (!results[i]!.polishNotes.includes("jl_cut:l_cut")) {
      results[i]!.polishNotes.push("jl_cut:l_cut");
      n += 1;
    }
    if (!results[i + 1]!.polishNotes.includes("jl_cut:j_cut")) {
      results[i + 1]!.polishNotes.push("jl_cut:j_cut");
      n += 1;
    }
    // Realization footnote only — never rewrite design shotSize / VD
    const footA = results[i]!.adaptPack as RealizationAdaptPack & { narrativeFootnote?: string };
    const footB = results[i + 1]!.adaptPack as RealizationAdaptPack & { narrativeFootnote?: string };
    if (footA && !String(footA.narrativeFootnote ?? "").includes("声延")) {
      footA.narrativeFootnote = [footA.narrativeFootnote, "本镜声延至下画"].filter(Boolean).join("；");
    }
    if (footB && !String(footB.narrativeFootnote ?? "").includes("声先入")) {
      footB.narrativeFootnote = [footB.narrativeFootnote, "下句声先入再切画"].filter(Boolean).join("；");
    }
  }
  return n;
}

export function runEpisodeAvEnhanceOrchestrator(input: {
  shots: EpisodeShotAdaptInput[];
  trunkBlockersByShot?: Record<number, string[]>;
  enable?: boolean;
  budgetMs?: number;
}): EpisodeAvEnhanceResult {
  const started = Date.now();
  const budget = input.budgetMs ?? episodePreflightBudgetMs();
  const enabled = input.enable !== false && isEpisodeAvEnhanceEnabled();
  const continuityFindings: string[] = [];
  const results: EpisodeShotAdaptResult[] = [];

  let adaptHit = 0;
  let degrade = 0;
  let mismatch = 0;

  for (const shot of input.shots) {
    const idx = shot.shotIndex ?? null;
    const vd = extractVd(shot);
    const meta = shot.shotMeta ?? {};
    const trunk = idx != null ? input.trunkBlockersByShot?.[idx] ?? [] : [];
    const realization = meta.realizationOccupancy as string | undefined;
    const intent = (meta.intentOccupancy ?? meta.poseOccupancy) as string | undefined;

    const pack = buildRealizationAdaptPack({
      visualDescription: vd,
      durationSec: shot.durationSec ?? Number(meta.duration) ?? 3,
      dialoguePresent: hasDialogue(shot),
      intentOccupancy: intent as import("../compilers/designIntentProfile").PoseOccupancy | undefined,
      realizationOccupancy: realization as import("../compilers/designIntentProfile").PoseOccupancy | undefined,
      realizationDegraded: meta.realizationDegraded === true,
      stillMeta: meta,
      emotionIntensity: extractEmotion(shot),
      sfxIntent: String(meta.sfxIntent ?? "").trim() || null,
      avCausality: meta.avCausality as { audioBeat?: string } | undefined,
      microExpression:
        (shot.designShot?.shotDesign as { performance?: { microExpression?: unknown } } | undefined)?.performance
          ?.microExpression as string | { eyes?: string } | undefined,
      trunkBlockers: trunk,
      enable: enabled,
    });

    if (pack.adapted) adaptHit++;
    if (pack.realizationDegraded) degrade++;
    if (pack.intentOccupancy !== pack.realizationOccupancy) mismatch++;

    results.push({ shotIndex: idx, adaptPack: pack, polishNotes: [] });
  }

  const elapsed = Date.now() - started;
  let polishCount = 0;
  let degradedToPerShot = false;

  if (enabled && elapsed < budget && mayApplyEpisodePolish({ adaptApplied: adaptHit > 0 })) {
    for (let i = 1; i < input.shots.length; i++) {
      const cont = auditEpisodeContinuity({
        previousShot: input.shots[i - 1].shotMeta ?? undefined,
        currentShot: input.shots[i].shotMeta ?? undefined,
      });
      continuityFindings.push(...cont.findings);
    }
    polishCount += polishCameraGrammar(results, input.shots);
    polishCount += polishSfxCadence(results);
    polishCount += polishEmotionArc(results, input.shots);
  } else if (enabled && elapsed >= budget) {
    degradedToPerShot = true;
  }
  // Wave-3: J/L-cut continuity polish is independent of adaptHit
  if (enabled && elapsed < budget) {
    polishCount += polishJlCutContinuity(results, input.shots);
  }

  return {
    shots: results,
    metrics: {
      totalShots: input.shots.length,
      adaptHitCount: adaptHit,
      degradeCount: degrade,
      intentRealizationMismatchCount: mismatch,
      polishAppliedCount: polishCount,
      continuityFindings: [...new Set(continuityFindings)],
      elapsedMs: Date.now() - started,
      budgetExceeded: elapsed >= budget,
      episodeEnhanceEnabled: enabled,
    },
    degradedToPerShot,
  };
}

export function episodeAvMetricsSummary(m: EpisodeAvMetrics): string {
  return [
    `adapt=${m.adaptHitCount}/${m.totalShots}`,
    `degrade=${m.degradeCount}`,
    `mismatch=${m.intentRealizationMismatchCount}`,
    `polish=${m.polishAppliedCount}`,
    `${m.elapsedMs}ms`,
  ].join(" ");
}
