/**
 * C0: Short Video Quality scorecard — default soft_patch / retry / strengthen.
 */
import { readFixtureJson } from "../utils/fixturesPath";

type Dim = {
  id: string;
  weight: number;
  failBelow: number;
  defaultAction: "soft_patch" | "retry" | "strengthen";
};

type Scorecard = {
  dimensions: Dim[];
  passScore: number;
};

export type SvqInput = {
  scores?: Record<string, number>;
  /** heuristic flags when numeric scores absent */
  flags?: {
    identityOk?: boolean;
    emotionOk?: boolean;
    lipOk?: boolean;
    camVarietyOk?: boolean;
    audioOk?: boolean;
    retentionOk?: boolean;
    packagingOk?: boolean;
    motionOk?: boolean;
    visBeatOk?: boolean;
  };
};

export type SvqResult = {
  score: number;
  pass: boolean;
  failDims: { id: string; score: number; action: string }[];
  defaultAction: "soft_patch" | "retry" | "strengthen" | "pass";
};

function flagToScore(ok: boolean | undefined): number {
  if (ok === true) return 0.85;
  if (ok === false) return 0.35;
  return 0.7;
}

export function scoreShortVideo(input: SvqInput): SvqResult {
  const card = readFixtureJson<Scorecard>("short_video_quality_scorecard.json", {
    dimensions: [],
    passScore: 0.65,
  });
  const flagMap: Record<string, number | undefined> = {
    identity_cast: input.flags?.identityOk === undefined ? undefined : flagToScore(input.flags.identityOk),
    vis_beat: input.flags?.visBeatOk === undefined ? undefined : flagToScore(input.flags.visBeatOk),
    emotion_clarity: input.flags?.emotionOk === undefined ? undefined : flagToScore(input.flags.emotionOk),
    dialogue_lip: input.flags?.lipOk === undefined ? undefined : flagToScore(input.flags.lipOk),
    cam_variety: input.flags?.camVarietyOk === undefined ? undefined : flagToScore(input.flags.camVarietyOk),
    audio_mood: input.flags?.audioOk === undefined ? undefined : flagToScore(input.flags.audioOk),
    retention_hook: input.flags?.retentionOk === undefined ? undefined : flagToScore(input.flags.retentionOk),
    packaging: input.flags?.packagingOk === undefined ? undefined : flagToScore(input.flags.packagingOk),
    motion_fidelity: input.flags?.motionOk === undefined ? undefined : flagToScore(input.flags.motionOk),
  };

  let weighted = 0;
  let wSum = 0;
  const failDims: SvqResult["failDims"] = [];
  for (const d of card.dimensions) {
    const s = input.scores?.[d.id] ?? flagMap[d.id] ?? 0.7;
    weighted += s * d.weight;
    wSum += d.weight;
    if (s < d.failBelow) {
      failDims.push({ id: d.id, score: s, action: d.defaultAction });
    }
  }
  const score = wSum > 0 ? weighted / wSum : 0.7;
  const pass = score >= (card.passScore ?? 0.65) && failDims.length === 0;
  let defaultAction: SvqResult["defaultAction"] = "pass";
  if (!pass) {
    if (failDims.some((f) => f.action === "strengthen")) defaultAction = "strengthen";
    else if (failDims.some((f) => f.action === "retry")) defaultAction = "retry";
    else defaultAction = "soft_patch";
  }
  return { score, pass, failDims, defaultAction };
}
