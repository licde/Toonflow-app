/**
 * C1–C3: video frame sample + motion VLM judge stubs → strengthen / retry / heal.
 */
import { readFixtureJson } from "../utils/fixturesPath";

type MotionCfg = {
  sampleFrames: number;
  actions: { mismatch: string; severe: string; structureRoot: string };
  thresholds: { motionMatchMin: number; continuityStableMin: number };
};

export type FrameSample = {
  indices: number[];
  count: number;
};

export type MotionJudge = {
  motionMatch: number;
  continuityStable: number;
  mismatch: boolean;
  severe: boolean;
  structureRoot: boolean;
  notes?: string[];
};

export function sampleVideoFrames(opts?: {
  durationSec?: number;
  frameCount?: number;
}): FrameSample {
  const cfg = readFixtureJson<MotionCfg>("video_motion_fidelity.json", {
    sampleFrames: 4,
    actions: { mismatch: "strengthen", severe: "retry", structureRoot: "heal" },
    thresholds: { motionMatchMin: 0.55, continuityStableMin: 0.5 },
  });
  const n = opts?.frameCount ?? cfg.sampleFrames ?? 4;
  const dur = Math.max(1, opts?.durationSec ?? 4);
  const indices: number[] = [];
  for (let i = 0; i < n; i++) {
    indices.push(Math.round(((i + 0.5) / n) * dur * 1000) / 1000);
  }
  return { indices, count: n };
}

/** Stub judge — real VLM plugs in later; heuristics from prompt vs expected motion. */
export function judgeMotionFidelity(input: {
  expectedMotion?: string;
  observedScore?: number;
  continuityScore?: number;
  structureBroken?: boolean;
}): MotionJudge {
  const cfg = readFixtureJson<MotionCfg>("video_motion_fidelity.json", {
    sampleFrames: 4,
    actions: { mismatch: "strengthen", severe: "retry", structureRoot: "heal" },
    thresholds: { motionMatchMin: 0.55, continuityStableMin: 0.5 },
  });
  const motionMatch = input.observedScore ?? 0.7;
  const continuityStable = input.continuityScore ?? 0.7;
  const mismatch = motionMatch < cfg.thresholds.motionMatchMin;
  const severe = motionMatch < cfg.thresholds.motionMatchMin * 0.6;
  return {
    motionMatch,
    continuityStable,
    mismatch,
    severe,
    structureRoot: Boolean(input.structureBroken),
    notes: input.expectedMotion ? [`expected:${input.expectedMotion}`] : [],
  };
}

export function resolveMotionAction(judge: MotionJudge): "pass" | "strengthen" | "retry" | "heal" {
  const cfg = readFixtureJson<MotionCfg>("video_motion_fidelity.json", {
    sampleFrames: 4,
    actions: { mismatch: "strengthen", severe: "retry", structureRoot: "heal" },
    thresholds: { motionMatchMin: 0.55, continuityStableMin: 0.5 },
  });
  if (judge.structureRoot) return (cfg.actions.structureRoot as "heal") || "heal";
  if (judge.severe) return (cfg.actions.severe as "retry") || "retry";
  if (judge.mismatch) return (cfg.actions.mismatch as "strengthen") || "strengthen";
  return "pass";
}
