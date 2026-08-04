/**
 * RealizationAdaptPack — plate-first Motion/camera/AV when intent ≠ realization.
 * Design SSOT unchanged; implementation layer reads still meta and writes spine atoms.
 */
import { readFixtureJson } from "../utils/fixturesPath";
import type { PoseOccupancy } from "./designIntentProfile";
import {
  resolveRealizationState,
  realizationDegradedUserNote,
  type RealizationState,
  type LocalPoseForRealization,
} from "./realizationLadder";
import { mayApplyRealizationAdapt } from "./policyPrecedence";
import { isRealizationAdaptEnabled } from "./realizationAdaptFlags";

export type RealizationAdaptPack = {
  intentOccupancy: PoseOccupancy;
  realizationOccupancy: PoseOccupancy;
  realizationDegraded: boolean;
  adapted: boolean;
  mappingKey: string;
  motionPhases: string[];
  motionBody: string;
  motionStartHint: string;
  cameraPolicy: string;
  atmosphereBoost?: string;
  sfxBeat?: string;
  performanceBoost?: string;
  narrativeFootnote?: string;
  /** Wave-5C: soft J/L-cut ms offsets (not full NLE) */
  jlCutTimeline?: {
    jCutAudioLeadMs?: number;
    lCutAudioLagMs?: number;
    note: string;
    source?: string;
  };
  i2vCriticalFacts: string[];
  forbiddenMotionTokens: string[];
  sources: string[];
};

type AdaptFixture = {
  mappings?: Record<
    string,
    {
      useVdPhases?: boolean;
      phases?: string[];
      motionStartHint?: string;
      forbiddenMotionTokens?: string[];
      cameraPolicy?: string;
      atmosphereBoost?: string;
      sfxBeat?: string;
      performanceBoost?: string;
      narrativeFootnote?: string;
      i2vCriticalFacts?: string[];
    }
  >;
  emotionWords?: Record<string, string>;
};

export function loadRealizationMotionAdaptFixture(): AdaptFixture {
  return readFixtureJson<AdaptFixture>("realization_motion_adapt.json", { mappings: {}, emotionWords: {} });
}

function mappingKey(intent: PoseOccupancy, realization: PoseOccupancy): string {
  return `${intent}:${realization}`;
}

function fillPhaseTemplate(tmpl: string, dur: number): string {
  const t1 = Math.max(0.5, Math.round((dur / 3) * 10) / 10);
  const t2 = Math.max(t1 + 0.5, Math.round(((2 * dur) / 3) * 10) / 10);
  return tmpl
    .replace(/\{t1\}/g, String(t1))
    .replace(/\{t2\}/g, String(t2))
    .replace(/\{dur\}/g, String(dur));
}

function vdBendPhases(
  vd: string,
  dur: number,
  stillPhase?: string | null,
): string[] {
  const d = Math.max(2, dur);
  const a = Math.max(0.5, Math.round((d / 3) * 10) / 10);
  const b = Math.max(a + 0.5, Math.round(((2 * d) / 3) * 10) / 10);
  const phase = String(stillPhase ?? "");
  // Held plate: do not re-enter bend→touch soup — hold/read from still
  if (phase === "held") {
    if (/捏|攥|握|持/.test(vd)) return [`0s-${d}s: 保持持纸/捏缘可读，禁止再弯腰触及`];
    return [`0s-${d}s: 静帧持态连续，禁止再进入弯腰触及`];
  }
  const phases: string[] = [];
  if (phase === "mid_contact") {
    phases.push(`0s-${a}s: 指尖已触纸缘`);
    if (/捏|攥|握/.test(vd)) phases.push(`${a}s-${d}s: 捏紧纸缘`);
    return phases;
  }
  // approaching (default process): may progress bend → touch → grip in Motion
  if (/弯腰|俯身/.test(vd) || phase === "approaching") phases.push(`0s-${a}s: 弯腰俯身`);
  if (/捡|拾|触及/.test(vd) || phase === "approaching") {
    phases.push(`${phases.length ? a : 0}s-${b}s: 指尖触及物件`);
  }
  if (/捏|攥|握/.test(vd)) phases.push(`${phases.length ? b : a}s-${d}s: 捏紧纸缘`);
  return phases;
}

function emotionBoost(intensity: number | null | undefined, fixture: AdaptFixture): string | undefined {
  if (intensity == null || !Number.isFinite(intensity)) return undefined;
  const key = String(Math.round(intensity));
  return fixture.emotionWords?.[key];
}

function extractAtmosphere(vd: string, stillMeta?: Record<string, unknown> | null): string | undefined {
  const softEnv = (stillMeta?.refsRoles as string[] | undefined)?.includes("softEnv");
  if (/烛|侧光|暖光|雨|雾|月光/.test(vd)) {
    const m = vd.match(/烛[^，,。；;]{0,6}|侧光[^，,。；;]{0,6}|暖光[^，,。；;]{0,6}/);
    if (m?.[0]) return m[0].slice(0, 12);
  }
  if (softEnv) return "场景软环境连续，暖光烛火可辨";
  return undefined;
}

export function buildRealizationAdaptPack(input: {
  visualDescription?: string | null;
  durationSec?: number | null;
  dialoguePresent?: boolean;
  intentOccupancy?: PoseOccupancy | null;
  realizationOccupancy?: PoseOccupancy | null;
  realizationDegraded?: boolean | null;
  realization?: RealizationState | null;
  localSignals?: LocalPoseForRealization | null;
  localHeuristicOk?: boolean | null;
  stillMeta?: Record<string, unknown> | null;
  emotionIntensity?: number | null;
  sfxIntent?: string | null;
  avCausality?: { audioBeat?: string; visualPeak?: string } | null;
  microExpression?: string | { eyes?: string; mouthDetail?: string } | null;
  trunkBlockers?: string[];
  /** Explicit disable (feature flag checked internally when omitted) */
  enable?: boolean;
}): RealizationAdaptPack {
  const vd = String(input.visualDescription ?? "").trim();
  const dur = Math.max(1, Math.round(Number(input.durationSec) || 3));
  const fixture = loadRealizationMotionAdaptFixture();
  const sources: string[] = ["realizationAdapt.build"];
  let stillPhase: string | null = null;
  try {
    const { readStillPhase } =
      require("./stillPhasePlan") as typeof import("./stillPhasePlan");
    stillPhase =
      readStillPhase(input.stillMeta as Record<string, unknown>) ??
      (typeof input.stillMeta?.stillPhase === "string" ? input.stillMeta.stillPhase : null);
  } catch {
    stillPhase =
      typeof input.stillMeta?.stillPhase === "string" ? String(input.stillMeta.stillPhase) : null;
  }
  if (stillPhase) sources.push(`realizationAdapt.stillPhase:${stillPhase}`);

  const realization =
    input.realization ??
    resolveRealizationState({
      intentOccupancy: input.intentOccupancy,
      visualDescription: vd,
      localSignals: input.localSignals,
      localHeuristicOk: input.localHeuristicOk,
    });

  const intent = realization.intentOccupancy;
  const real = input.realizationOccupancy ?? realization.realizationOccupancy;
  const degraded = input.realizationDegraded ?? realization.realizationDegraded;
  const key = mappingKey(intent, real);
  const mapping = fixture.mappings?.[key] ?? fixture.mappings?.[`${intent}:${intent}`];

  const enabled =
    input.enable !== false && isRealizationAdaptEnabled() && mayApplyRealizationAdapt({ trunkBlockers: input.trunkBlockers });

  if (!enabled || !mapping) {
    const phases = vdBendPhases(vd, dur, stillPhase);
    return {
      intentOccupancy: intent,
      realizationOccupancy: real,
      realizationDegraded: degraded,
      adapted: false,
      mappingKey: key,
      motionPhases: phases,
      motionBody: phases.join("\n"),
      motionStartHint: stillPhase === "held" ? "从静帧持态起，禁止再弯腰触及" : "",
      cameraPolicy: input.dialoguePresent ? "静止" : "轻微运镜",
      i2vCriticalFacts: stillPhase === "held" ? ["起态=静帧持态", "禁止再进入弯腰触及"] : [],
      forbiddenMotionTokens: stillPhase === "held" ? ["弯腰俯身", "弯腰捡拾", "俯身捡", "指尖触及"] : [],
      sources: [...sources, "realizationAdapt.disabled_or_no_mapping"],
    };
  }

  let motionPhases: string[] = [];
  if (stillPhase === "held") {
    motionPhases = vdBendPhases(vd, dur, "held");
    sources.push("realizationAdapt.held_plate_no_reenter_bend");
  } else if (mapping.useVdPhases) {
    motionPhases = vdBendPhases(vd, dur, stillPhase);
    sources.push("realizationAdapt.vd_phases");
  } else if (mapping.phases?.length) {
    motionPhases = mapping.phases.map((p) => fillPhaseTemplate(p, dur));
    sources.push("realizationAdapt.fixture_phases");
  }

  const perf =
    mapping.performanceBoost ??
    emotionBoost(input.emotionIntensity, fixture) ??
    (typeof input.microExpression === "object" && input.microExpression?.eyes === "focused" ? "眼神focused" : undefined);

  const atmosphere =
    mapping.atmosphereBoost ?? extractAtmosphere(vd, input.stillMeta) ?? undefined;
  const sfx =
    input.sfxIntent ??
    input.avCausality?.audioBeat ??
    mapping.sfxBeat ??
    (/纸|休书|捏/.test(vd) ? "纸张摩擦" : undefined);

  const footnote =
    degraded && intent === "bend_pickup" && real !== "bend_pickup"
      ? mapping.narrativeFootnote ?? realizationDegradedUserNote(realization)
      : undefined;

  const motionStartHint =
    stillPhase === "held"
      ? "从静帧持态起，禁止再弯腰触及"
      : String(mapping.motionStartHint ?? "").trim();
  const i2vFacts = [...(mapping.i2vCriticalFacts ?? [])];
  if (degraded) i2vFacts.push("起态与静帧一致");
  if (stillPhase === "held") i2vFacts.push("起态=静帧持态", "禁止再进入弯腰触及");
  if (stillPhase === "approaching") i2vFacts.push("起态=接近未握", "Motion可递进至触及捏紧");

  return {
    intentOccupancy: intent,
    realizationOccupancy: real,
    realizationDegraded: degraded,
    adapted: degraded || real !== intent || stillPhase === "held",
    mappingKey: key,
    motionPhases,
    motionBody: motionPhases.join("\n"),
    motionStartHint,
    cameraPolicy: input.dialoguePresent ? "静止" : String(mapping.cameraPolicy ?? "静止"),
    atmosphereBoost: atmosphere,
    sfxBeat: sfx ? String(sfx).slice(0, 24) : undefined,
    performanceBoost: perf,
    narrativeFootnote: footnote,
    i2vCriticalFacts: [...new Set(i2vFacts)],
    forbiddenMotionTokens:
      stillPhase === "held"
        ? [...new Set([...(mapping.forbiddenMotionTokens ?? []), "弯腰俯身", "弯腰捡拾", "俯身捡", "指尖触及"])]
        : mapping.forbiddenMotionTokens ?? [],
    sources,
  };
}

/** True when compiled Motion contradicts plate realization (e.g. kneel plate + 弯腰 motion). */
export function motionContradictsRealization(input: {
  motionBlob?: string | null;
  realizationOccupancy?: PoseOccupancy | null;
  realizationDegraded?: boolean | null;
  adaptPack?: RealizationAdaptPack | null;
}): boolean {
  if (!input.realizationDegraded && input.adaptPack?.adapted !== true) return false;
  const real = input.realizationOccupancy ?? input.adaptPack?.realizationOccupancy;
  const motion = String(input.motionBlob ?? "");
  if (!motion || !real) return false;
  const forbidden =
    input.adaptPack?.forbiddenMotionTokens ??
    (real === "kneel_hold" || real === "stand_hold"
      ? ["弯腰俯身", "弯腰捡拾", "俯身捡"]
      : []);
  return forbidden.some((tok) => {
    try {
      return new RegExp(tok, "i").test(motion);
    } catch {
      return motion.includes(tok);
    }
  });
}

export function realizationAdaptPersistSlice(pack: RealizationAdaptPack): Record<string, unknown> {
  return {
    realizationAdaptPack: {
      mappingKey: pack.mappingKey,
      adapted: pack.adapted,
      motionStartHint: pack.motionStartHint,
      motionPhases: pack.motionPhases,
      cameraPolicy: pack.cameraPolicy,
      atmosphereBoost: pack.atmosphereBoost,
      sfxBeat: pack.sfxBeat,
      performanceBoost: pack.performanceBoost,
      narrativeFootnote: pack.narrativeFootnote,
      jlCutTimeline: pack.jlCutTimeline,
      i2vCriticalFacts: pack.i2vCriticalFacts,
      sources: pack.sources,
    },
    intentOccupancy: pack.intentOccupancy,
    realizationOccupancy: pack.realizationOccupancy,
    realizationDegraded: pack.realizationDegraded,
    videoMotionStartHint: pack.motionStartHint || undefined,
    i2vCriticalFacts: pack.i2vCriticalFacts.length ? pack.i2vCriticalFacts : undefined,
    jlCutTimeline: pack.jlCutTimeline || undefined,
  };
}

/** Persist when adapt hit OR Wave-5 polish left footnotes / jl timeline. */
export function shouldPersistRealizationAdapt(pack: RealizationAdaptPack): boolean {
  if (pack.adapted) return true;
  if (String(pack.narrativeFootnote ?? "").trim()) return true;
  if (pack.jlCutTimeline?.note) return true;
  return false;
}
