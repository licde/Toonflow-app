/**
 * Post-still literary effects reassert — shared by single-shot + batch.
 * Per-atom sample judge → qualify → repair plan → modality sync.
 * Never stamps hq_ok / visualPass. Egress alone cannot green Must.
 */
import {
  qualifyLiteraryEffects,
  repairPlanForMissingEffects,
  type LocalPoseSignals,
  type LiteraryEffectMiss,
  type QualifyLiteraryEffectsResult,
} from "./literaryPrimaryEffects";
import type { PrimaryIntentCarrierSet } from "../compilers/primaryIntentSeal";
import type { ShotDesignSample } from "../design/shotDesignSample";
import type { SampleAtomJudgment } from "../design/judgeSampleAtoms";
import type { RealizationAdaptPack } from "../compilers/realizationAdapt";

export type LiteraryEffectsAfterStill = QualifyLiteraryEffectsResult & {
  localPoseSignals: LocalPoseSignals;
  repairInjectLines: string[];
  repairDeltaHints: string[];
  forceFull: boolean;
  videoMotionStartHint?: string;
  i2vCriticalFacts?: string[];
  realizationAdaptPack?: RealizationAdaptPack | null;
  /** Closed-loop: Must atoms fulfilled (not egress-only) */
  sampleMustFulfilled?: boolean;
  sampleMustMissIds?: string[];
  sampleAtomJudgments?: SampleAtomJudgment[];
  shotDesignSample?: ShotDesignSample | null;
};

/** Sync Motion / i2v facts with still seal after heal (同源首帧). Plate-first when realization degraded. */
export function syncStillModalityHints(input: {
  seal?: PrimaryIntentCarrierSet | null;
  visualDescription?: string | null;
  literaryEffectsQualified?: boolean;
  realizationOccupancy?: string | null;
  realizationDegraded?: boolean | null;
  realization?: { intentOccupancy?: string; realizationOccupancy?: string; realizationDegraded?: boolean } | null;
  durationSec?: number | null;
  dialoguePresent?: boolean;
  emotionIntensity?: number | null;
  stillMeta?: Record<string, unknown> | null;
}): {
  videoMotionStartHint?: string;
  i2vCriticalFacts?: string[];
  realizationAdaptPack?: RealizationAdaptPack | null;
} {
  const seal = input.seal ?? null;
  const vd = String(input.visualDescription ?? "");
  const bend =
    seal?.poseOccupancy === "bend_pickup" ||
    seal?.primaryObjective === "action_primary" ||
    /弯腰|捡起|捡拾|俯身/.test(vd);
  const out: {
    videoMotionStartHint?: string;
    i2vCriticalFacts?: string[];
    realizationAdaptPack?: RealizationAdaptPack | null;
  } = {};
  const degraded =
    input.realizationDegraded === true ||
    seal?.realizationDegraded === true ||
    input.realization?.realizationDegraded === true;

  if (bend || input.realization) {
    try {
      const { buildRealizationAdaptPack } =
        require("../compilers/realizationAdapt") as typeof import("../compilers/realizationAdapt");
      const pack = buildRealizationAdaptPack({
        visualDescription: vd,
        durationSec: input.durationSec ?? 3,
        dialoguePresent: input.dialoguePresent,
        intentOccupancy: (input.realization?.intentOccupancy ?? seal?.poseOccupancy) as
          | import("../compilers/designIntentProfile").PoseOccupancy
          | undefined,
        realizationOccupancy: (input.realizationOccupancy ??
          input.realization?.realizationOccupancy) as import("../compilers/designIntentProfile").PoseOccupancy | undefined,
        realizationDegraded: degraded,
        stillMeta: input.stillMeta,
        emotionIntensity: input.emotionIntensity,
      });
      out.realizationAdaptPack = pack;
      if (pack.motionStartHint) out.videoMotionStartHint = pack.motionStartHint;
      if (pack.i2vCriticalFacts.length) out.i2vCriticalFacts = pack.i2vCriticalFacts;
      if (!pack.motionStartHint && !degraded && bend) {
        out.videoMotionStartHint =
          "起态：弯腰捡拾触地，主手前伸近地；禁止跪坐捧持举卡开场";
      }
    } catch {
      if (bend && !degraded) {
        out.videoMotionStartHint =
          "起态：弯腰捡拾触地，主手前伸近地；禁止跪坐捧持举卡开场";
      }
    }
    if (!out.i2vCriticalFacts?.length && bend) {
      try {
        const { buildI2vCriticalFactsFromSeal } =
          require("../compilers/stillSealGate") as typeof import("../compilers/stillSealGate");
        out.i2vCriticalFacts = buildI2vCriticalFactsFromSeal(seal, vd);
      } catch {
        out.i2vCriticalFacts = ["弯腰捡拾", "休书主手触地", "禁止跪坐捧持"];
      }
    }
  }
  if (input.literaryEffectsQualified === false && bend) {
    out.videoMotionStartHint = `${out.videoMotionStartHint ?? ""}；静帧文学细节可增强`.trim();
  }
  return out;
}

function resolveSample(input: {
  shotDesignSample?: ShotDesignSample | null;
  episodeShot?: Record<string, unknown> | null;
  visualDescription?: string | null;
  seal?: PrimaryIntentCarrierSet | null;
}): ShotDesignSample | null {
  if (input.shotDesignSample?.must?.length) return input.shotDesignSample;
  try {
    const { extractShotDesignSample } =
      require("../design/shotDesignSample") as typeof import("../design/shotDesignSample");
    if (input.episodeShot && typeof input.episodeShot === "object") {
      return extractShotDesignSample(input.episodeShot);
    }
    const vd = String(input.visualDescription ?? "").trim();
    if (!vd) return null;
    const synthetic: Record<string, unknown> = {
      visualDescription: vd,
      shotSize: "MS",
      shotDesign: {
        composition: {
          foreground: /休书|纸/.test(vd) ? "主手持纸" : "",
          background: /裙摆|衣角/.test(vd) ? "裙摆碎片" : "",
        },
        cameraAnchor: { shotSize: "MS" },
      },
      narrative: {
        spatialRelation: input.seal?.poseOccupancy === "bend_pickup" ? "弯腰捡拾" : "",
      },
    };
    return extractShotDesignSample(synthetic);
  } catch {
    return null;
  }
}

/**
 * Run local heuristic + per-atom sample judge + qualify + modality sync.
 * literaryEffectsQualified ≡ sampleMustFulfilled when sample Must exist.
 */
export async function reassertLiteraryEffectsAfterStill(input: {
  visualDescription?: string | null;
  promptUsed?: string | null;
  seal?: PrimaryIntentCarrierSet | null;
  refsRoles?: string[] | null;
  propPlateGrade?: string | null;
  propPlateMissing?: boolean | null;
  imageBase64?: string | null;
  imageBuffer?: Buffer | null;
  skipLocalHeuristic?: boolean;
  videoMotionStartHint?: string | null;
  shotDesignSample?: ShotDesignSample | null;
  episodeShot?: Record<string, unknown> | null;
  droppedSoftEnv?: boolean | null;
  referenceList?: Array<{ base64?: string; role?: string }> | null;
  propSoftPresent?: boolean | null;
  fragmentPlateHung?: boolean | null;
  /** Pre-vendor identity cref contamination (modern/gray) — merges into local signals */
  identityContam?: {
    modernAttireSuspected?: boolean;
    grayStudioSuspected?: boolean;
  } | null;
}): Promise<LiteraryEffectsAfterStill> {
  let localHeuristicOk: boolean | undefined;
  let localPoseSignals: LocalPoseSignals = {};
  if (!input.skipLocalHeuristic) {
    try {
      const { analyzeLocalStillPose } =
        require("./localStillPoseHeuristic") as typeof import("./localStillPoseHeuristic");
      const { isNoComfyNoKeyDoctrine } =
        require("./literaryPrimaryEffects") as typeof import("./literaryPrimaryEffects");
      if (isNoComfyNoKeyDoctrine().localPoseHeuristic) {
        const loc = await analyzeLocalStillPose({
          imageBase64: input.imageBase64,
          imageBuffer: input.imageBuffer,
          poseOccupancy: input.seal?.poseOccupancy ?? null,
        });
        localHeuristicOk = loc.ok;
        if (loc.ok) {
          localPoseSignals = {
            holdCardSuspected: loc.holdCardSuspected,
            groundPropSuspected: loc.groundPropSuspected,
            uprightTorsoSuspected: loc.uprightTorsoSuspected,
            kneelSquatSuspected: loc.kneelSquatSuspected,
            primaryPoseGuess: loc.primaryPoseGuess,
            grayStudioSuspected: loc.grayStudioSuspected,
            voidBgSuspected: loc.voidBgSuspected,
            sceneIllegibleSuspected: loc.sceneIllegibleSuspected,
            modernAttireSuspected: loc.modernAttireSuspected,
          };
        }
      }
    } catch {
      localHeuristicOk = false;
    }
  }
  if (input.identityContam?.modernAttireSuspected === true) {
    localPoseSignals = { ...localPoseSignals, modernAttireSuspected: true };
  }
  if (input.identityContam?.grayStudioSuspected === true) {
    localPoseSignals = { ...localPoseSignals, grayStudioSuspected: true };
  }

  const q = qualifyLiteraryEffects({
    visualDescription: input.visualDescription,
    promptUsed: input.promptUsed,
    seal: input.seal,
    refsRoles: input.refsRoles,
    propPlateGrade: input.propPlateGrade,
    propPlateMissing: input.propPlateMissing,
    localSignals: localPoseSignals,
    videoMotionStartHint: input.videoMotionStartHint,
    localHeuristicOk,
    softEnvHung: (input.refsRoles ?? []).includes("softEnv") && input.droppedSoftEnv !== true,
    droppedSoftEnv: input.droppedSoftEnv,
  });

  const sample = resolveSample(input);
  let sampleMustFulfilled = q.literaryEffectsQualified === true;
  let sampleMustMissIds = q.missingEffects.filter((m) => m.bar === "must").map((m) => m.id);
  let sampleAtomJudgments: SampleAtomJudgment[] = [];
  let literaryEffectsQualified = q.literaryEffectsQualified;
  let missingEffects = q.missingEffects;
  let shouldMisses = q.shouldMisses;
  let debtKind = q.debtKind;
  let ctaLabel = q.ctaLabel;
  const sources = [...q.sources];
  let realization = q.realization;

  if (sample && sample.must.length > 0) {
    const { judgeSampleAtoms, repairHintsForSampleMisses, sampleMissesAsLiteraryMisses } =
      require("../design/judgeSampleAtoms") as typeof import("../design/judgeSampleAtoms");
    const { propSoftSlotActuallyPresent } =
      require("./applyLiteraryRepairDeltas") as typeof import("./applyLiteraryRepairDeltas");
    const propSoftPresent =
      input.propSoftPresent === true ||
      propSoftSlotActuallyPresent({
        refsRoles: input.refsRoles,
        referenceList: input.referenceList,
      });
    const softEnvHung = (input.refsRoles ?? []).includes("softEnv") && input.droppedSoftEnv !== true;
    const judged = judgeSampleAtoms({
      sample,
      promptUsed: input.promptUsed,
      refsRoles: input.refsRoles,
      propSoftPresent,
      propPlateMissing: input.propPlateMissing,
      droppedSoftEnv: input.droppedSoftEnv,
      softEnvHung,
      fragmentPlateHung: input.fragmentPlateHung,
      localSignals: localPoseSignals,
      localHeuristicOk,
    });
    sampleAtomJudgments = judged.atoms;
    sampleMustFulfilled = judged.mustFulfilled;
    sampleMustMissIds = judged.mustMissIds;
    // Sample Must SSOT ∧ literary trunk Must
    literaryEffectsQualified = sampleMustFulfilled && q.literaryEffectsQualified;
    sources.push(...judged.sources);

    if (!sampleMustFulfilled) {
      const mapped = sampleMissesAsLiteraryMisses(judged.mustMissIds) as LiteraryEffectMiss[];
      missingEffects = mapped.length ? mapped.filter((m) => m.bar === "must") : q.missingEffects;
      shouldMisses = [
        ...q.shouldMisses,
        ...mapped.filter((m) => m.bar === "should"),
      ];
      debtKind = judged.mustMissIds.some((id) => /fg\.|prop/.test(id))
        ? "prop_plate"
        : judged.mustMissIds.some((id) => /bg\./.test(id))
          ? "contamination"
          : q.debtKind ?? "prop_plate";
      ctaLabel = judged.mustMissIds.some((id) => /fg\.|prop/.test(id))
        ? "挂真道具板后重出"
        : judged.mustMissIds.some((id) => /bg\./.test(id))
          ? "补场景软板后重出"
          : q.ctaLabel ?? "继续生成修复";
      void repairHintsForSampleMisses;
    } else {
      // Trunk pass: action should-misses stay in shouldMisses (intent debt)
      shouldMisses = [
        ...q.shouldMisses,
        ...judged.shouldMissIds.map((id) => ({
          id: id as LiteraryEffectMiss["id"],
          tier: "L0" as const,
          bar: "should" as const,
          reason: `sample_should:${id}`,
        })),
      ];
    }
  }

  const planFromLit = repairPlanForMissingEffects([...missingEffects, ...shouldMisses.slice(0, 2)]);
  let repairInjectLines = planFromLit.injectLines;
  let repairDeltaHints = planFromLit.deltaHints;
  let forceFull = planFromLit.forceFull;
  if (sampleMustMissIds.length && sample) {
    try {
      const { repairHintsForSampleMisses } =
        require("../design/judgeSampleAtoms") as typeof import("../design/judgeSampleAtoms");
      const samplePlan = repairHintsForSampleMisses(sampleMustMissIds);
      repairInjectLines = [...new Set([...samplePlan.injectLines, ...repairInjectLines])].slice(0, 8);
      repairDeltaHints = [...new Set([...samplePlan.deltaHints, ...repairDeltaHints])];
      forceFull = forceFull || samplePlan.forceFull;
    } catch {
      /* keep lit plan */
    }
  }

  const modality = syncStillModalityHints({
    seal: input.seal,
    visualDescription: input.visualDescription,
    literaryEffectsQualified,
    realizationOccupancy: realization?.realizationOccupancy,
    realizationDegraded: realization?.realizationDegraded,
    realization,
    durationSec: Number((input.episodeShot as { duration?: number } | undefined)?.duration) || 3,
    dialoguePresent: Boolean(
      (input.episodeShot as { narrative?: { dialogue?: { lines?: unknown[] } } } | undefined)?.narrative
        ?.dialogue?.lines?.length,
    ),
    emotionIntensity: Number(
      (input.episodeShot as { narrative?: { emotionIntensity?: number } } | undefined)?.narrative
        ?.emotionIntensity,
    ),
    stillMeta: input.episodeShot as Record<string, unknown> | undefined,
  });

  return {
    literaryEffectsQualified,
    missingEffects,
    shouldMisses,
    debtKind,
    ctaLabel,
    sources,
    realization,
    localPoseSignals,
    repairInjectLines,
    repairDeltaHints,
    forceFull,
    sampleMustFulfilled,
    sampleMustMissIds,
    sampleAtomJudgments,
    shotDesignSample: sample,
    realizationAdaptPack: modality.realizationAdaptPack ?? null,
    ...modality,
  };
}

/** Heuristic faceReadable stamp for dialogue/bow stills (L3 handoff). */
export function inferFaceReadableFromStill(input: {
  stillMeta?: Record<string, unknown> | null;
  visualDescription?: string | null;
  dialoguePresent?: boolean;
  i2vCriticalFacts?: string[] | null;
  realizationOccupancy?: string | null;
}): "ok" | "risk" | "unknown" {
  const meta = input.stillMeta ?? {};
  if (meta.faceReadable === true || meta.faceReadable === "ok") return "ok";
  if (meta.faceReadable === "risk" || meta.faceReadable === false) return "risk";
  const facts = input.i2vCriticalFacts ?? (meta.i2vCriticalFacts as string[] | undefined) ?? [];
  if (facts.some((f) => /面容可读|抬视线|半身|近景脸/.test(String(f)))) return "ok";
  const vd = String(input.visualDescription ?? "");
  const bow =
    /弯腰|俯身|低头|跪/.test(vd) ||
    input.realizationOccupancy === "kneel_hold" ||
    meta.realizationOccupancy === "kneel_hold" ||
    meta.intentOccupancy === "bend_pickup";
  if (input.dialoguePresent && bow) return "risk";
  if (input.dialoguePresent) return "unknown";
  return "ok";
}

/** Persistable slice for o_storyboard.reason */
export function literaryEffectsPersistSlice(r: LiteraryEffectsAfterStill): Record<string, unknown> {
  const sampleMustFulfilled = r.sampleMustFulfilled ?? r.literaryEffectsQualified;
  const faceReadable = inferFaceReadableFromStill({
    stillMeta: {
      realizationOccupancy: r.realization?.realizationOccupancy,
      intentOccupancy: r.realization?.intentOccupancy,
      i2vCriticalFacts: r.i2vCriticalFacts,
    },
    dialoguePresent: Boolean(
      r.i2vCriticalFacts?.some((f) => /口型|对白|抬视线|面容/.test(f)) ||
        r.videoMotionStartHint?.includes("口型") ||
        r.videoMotionStartHint?.includes("抬脸"),
    ),
    i2vCriticalFacts: r.i2vCriticalFacts,
    realizationOccupancy: r.realization?.realizationOccupancy,
  });
  return {
    literaryEffectsQualified: r.literaryEffectsQualified,
    sampleMustFulfilled,
    faceReadable,
    sampleFulfillment: {
      mustFulfilled: sampleMustFulfilled,
      mustMissIds: r.sampleMustMissIds ?? r.missingEffects.filter((m) => m.bar === "must").map((m) => m.id),
      shouldMissIds: r.shouldMisses.map((m) => m.id),
      atoms: (r.sampleAtomJudgments ?? []).map((a) => ({
        id: a.id,
        bar: a.bar,
        pass: a.pass,
        evidence: a.evidence,
        repairHint: a.repairHint,
      })),
    },
    missingEffects: r.missingEffects.map((m) => ({
      id: m.id,
      tier: m.tier,
      bar: m.bar,
      reason: m.reason,
    })),
    shouldMissEffects: r.shouldMisses.map((m) => m.id),
    localPoseSignals: r.localPoseSignals,
    literaryDebtKind: r.debtKind,
    literaryCtaLabel: r.ctaLabel,
    literaryQualifySources: r.sources,
    repairInjectLines: r.repairInjectLines,
    repairDeltaHints: r.repairDeltaHints,
    videoMotionStartHint: r.videoMotionStartHint,
    i2vCriticalFacts: r.i2vCriticalFacts,
    ...(r.realizationAdaptPack
      ? {
          realizationAdaptPack: {
            mappingKey: r.realizationAdaptPack.mappingKey,
            adapted: r.realizationAdaptPack.adapted,
            motionPhases: r.realizationAdaptPack.motionPhases,
            motionStartHint: r.realizationAdaptPack.motionStartHint,
            cameraPolicy: r.realizationAdaptPack.cameraPolicy,
            narrativeFootnote: r.realizationAdaptPack.narrativeFootnote,
          },
        }
      : {}),
    ...(r.realization
      ? {
          intentOccupancy: r.realization.intentOccupancy,
          realizationOccupancy: r.realization.realizationOccupancy,
          realizationDegraded: r.realization.realizationDegraded,
          realizationReason: r.realization.realizationReason,
          realizationLadder: r.realization.ladder,
        }
      : {}),
  };
}
