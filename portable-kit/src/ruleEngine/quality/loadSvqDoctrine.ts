/**
 * Still→video quality doctrine loader (SSOT fixture).
 */
import { readFixtureJson } from "../utils/fixturesPath";

export type DimPolicyLevel = "must" | "optional" | "skip";

export type SvqDoctrine = {
  version: string;
  heal: {
    minConfidence: number;
    exprHighIntensityMustEdit: number;
    conflictOrder: string[];
  };
  dimPolicy: Record<string, DimPolicyLevel>;
  unknownScore: number;
  asr: { defaultEnabled: boolean; skipWhenNoAdapter: boolean };
  vlm: { requireAdapter: boolean; stubIsUnknown: boolean };
  dex: Record<string, { severity: "BLOCK" | "WARN"; stages: string[]; trigger: string }>;
  failDimTriggers: Record<string, string>;
  healLayers: Record<string, string>;
  cases: Array<{ id: string; pillar: string; expect: string }>;
};

const FALLBACK: SvqDoctrine = {
  version: "0",
  heal: { minConfidence: 0.72, exprHighIntensityMustEdit: 6, conflictOrder: ["cast_on_desc", "empty_shot", "performance_defaults"] },
  dimPolicy: {
    identity_cast: "must",
    dialogue_lip: "must",
    emotion_clarity: "must",
    motion_fidelity: "must",
    audio_mood: "must",
    lit_detail: "must",
    lit_contact_xor: "must",
    cam_variety: "optional",
    retention_hook: "optional",
    packaging: "optional",
    vis_beat: "optional",
  },
  unknownScore: 0.35,
  asr: { defaultEnabled: false, skipWhenNoAdapter: true },
  vlm: { requireAdapter: true, stubIsUnknown: true },
  dex: {},
  failDimTriggers: {
    lit_detail: "lit_detail_contact",
    lit_contact_xor: "lit_detail_contact_xor",
  },
  healLayers: { L2: "healShotQuality" },
  cases: [],
};

let cached: SvqDoctrine | null = null;

export function loadSvqDoctrine(): SvqDoctrine {
  if (cached) return cached;
  cached = readFixtureJson<SvqDoctrine>("still_video_quality_doctrine.json", FALLBACK);
  return cached;
}

export function resetSvqDoctrineCacheForTest(): void {
  cached = null;
}

export function dimPolicyOf(dimId: string): DimPolicyLevel {
  return loadSvqDoctrine().dimPolicy[dimId] ?? "optional";
}

export function healMinConfidence(): number {
  return loadSvqDoctrine().heal.minConfidence ?? 0.72;
}

export function exprHighIntensityThreshold(): number {
  return loadSvqDoctrine().heal.exprHighIntensityMustEdit ?? 6;
}
