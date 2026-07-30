/**
 * C0: Short Video Quality scorecard — default soft_patch / retry / strengthen.
 * Must dims: missing flag → unknownScore (not 0.7). Optional: skip weight when absent.
 */
import { readFixtureJson } from "../utils/fixturesPath";
import { dimPolicyOf, loadSvqDoctrine } from "../quality/loadSvqDoctrine";

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
    litDetailOk?: boolean;
    litContactXorOk?: boolean;
  };
  /** Explicit unknown must-dims (fail, not 0.7) */
  unknownDims?: string[];
  /** Optional dims to exclude from weighting */
  skippedDims?: string[];
};

export type SvqResult = {
  score: number;
  pass: boolean;
  failDims: { id: string; score: number; action: string }[];
  defaultAction: "soft_patch" | "retry" | "strengthen" | "pass";
  unknownDims: string[];
};

function flagToScore(ok: boolean | undefined): number | undefined {
  if (ok === true) return 0.85;
  if (ok === false) return 0.35;
  return undefined;
}

export function scoreShortVideo(input: SvqInput): SvqResult {
  const card = readFixtureJson<Scorecard>("short_video_quality_scorecard.json", {
    dimensions: [],
    passScore: 0.65,
  });
  const unknownScore = loadSvqDoctrine().unknownScore ?? 0.35;
  const unknownSet = new Set(input.unknownDims ?? []);
  const skipSet = new Set(input.skippedDims ?? []);

  const flagMap: Record<string, number | undefined> = {
    identity_cast: flagToScore(input.flags?.identityOk),
    vis_beat: flagToScore(input.flags?.visBeatOk),
    emotion_clarity: flagToScore(input.flags?.emotionOk),
    dialogue_lip: flagToScore(input.flags?.lipOk),
    cam_variety: flagToScore(input.flags?.camVarietyOk),
    audio_mood: flagToScore(input.flags?.audioOk),
    retention_hook: flagToScore(input.flags?.retentionOk),
    packaging: flagToScore(input.flags?.packagingOk),
    motion_fidelity: flagToScore(input.flags?.motionOk),
    lit_detail: flagToScore(input.flags?.litDetailOk),
    lit_contact_xor: flagToScore(input.flags?.litContactXorOk),
  };

  let weighted = 0;
  let wSum = 0;
  const failDims: SvqResult["failDims"] = [];
  const unknownDims: string[] = [];

  for (const d of card.dimensions) {
    if (skipSet.has(d.id) || dimPolicyOf(d.id) === "skip") continue;
    const policy = dimPolicyOf(d.id);
    let s = input.scores?.[d.id] ?? flagMap[d.id];
    if (s === undefined || unknownSet.has(d.id)) {
      // lit_*：未测得则跳过权重，勿一律 unknown 假红（测得时由 flags/unknownDims 显式传入）
      if (
        (d.id === "lit_detail" || d.id === "lit_contact_xor") &&
        s === undefined &&
        !unknownSet.has(d.id)
      ) {
        continue;
      }
      if (policy === "optional") continue;
      s = unknownScore;
      unknownDims.push(d.id);
    }
    weighted += s * d.weight;
    wSum += d.weight;
    if (s < d.failBelow) {
      failDims.push({ id: d.id, score: s, action: d.defaultAction });
    }
  }
  const score = wSum > 0 ? weighted / wSum : unknownScore;
  const pass = score >= (card.passScore ?? 0.65) && failDims.length === 0 && unknownDims.length === 0;
  let defaultAction: SvqResult["defaultAction"] = "pass";
  if (!pass) {
    if (failDims.some((f) => f.action === "strengthen")) defaultAction = "strengthen";
    else if (failDims.some((f) => f.action === "retry")) defaultAction = "retry";
    else defaultAction = "soft_patch";
  }
  return { score, pass, failDims, defaultAction, unknownDims };
}
