/**
 * duration_norms.json SSOT loader — Production Pillars Duration column.
 */
import { readFixtureJson } from "../utils/fixturesPath";

export type DurationNorms = {
  version?: string;
  dialogueShot?: {
    speechRateCps?: number;
    emotionHoldSec?: number;
  };
  reactionShotSec?: { min?: number; max?: number };
  insertShotSec?: { min?: number; max?: number };
  openingHookGroup?: { firstStrongStimulusWithinSec?: number };
  scene?: { maxAtmosphereOnlySec?: number };
  briefLines?: string[];
};

const DEFAULT_CPS = 4;
const V2_CPS = 4.5;
const V2_HOLD = 0.4;

export function loadDurationNorms(): DurationNorms {
  return readFixtureJson<DurationNorms>("duration_norms.json", {
    dialogueShot: { speechRateCps: V2_CPS, emotionHoldSec: V2_HOLD },
  });
}

/** meta.pillarsDurationV2 or opts.forceV2 enables norms cps; else legacy speechSpeed=4. */
export function resolveSpeechRateCps(opts?: {
  pillarsDurationV2?: boolean | null;
  forceV2?: boolean;
}): { cps: number; emotionHoldSec: number; fromNorms: boolean } {
  const useV2 = opts?.forceV2 === true || opts?.pillarsDurationV2 === true;
  if (!useV2) {
    return { cps: DEFAULT_CPS, emotionHoldSec: 0, fromNorms: false };
  }
  const norms = loadDurationNorms();
  const cps = Number(norms.dialogueShot?.speechRateCps) || V2_CPS;
  const hold = Number(norms.dialogueShot?.emotionHoldSec);
  return {
    cps,
    emotionHoldSec: Number.isFinite(hold) ? hold : V2_HOLD,
    fromNorms: true,
  };
}

export function reactionShotBounds(): { min: number; max: number } {
  const n = loadDurationNorms();
  return {
    min: Number(n.reactionShotSec?.min) || 0.8,
    max: Number(n.reactionShotSec?.max) || 2.0,
  };
}

export function openingHookWithinSec(): number {
  const n = loadDurationNorms();
  return Number(n.openingHookGroup?.firstStrongStimulusWithinSec) || 3;
}

export function maxAtmosphereOnlySec(): number {
  const n = loadDurationNorms();
  return Number(n.scene?.maxAtmosphereOnlySec) || 4;
}
