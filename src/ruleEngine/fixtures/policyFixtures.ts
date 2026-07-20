import { readFixtureJson } from "../utils/fixturesPath";

export interface VideoAudioPolicy {
  version?: string;
  defaultPolicy?: string;
  policies?: Record<string, { generateAudio?: boolean; audioRoute?: string }>;
  vendorDefaults?: Record<string, { policy?: string }>;
}

export interface FxFeasibilityMatrix {
  version?: string;
  levels?: Record<string, { label?: string; strategy?: string }>;
  vendorOverrides?: Record<string, { maxLevel?: string }>;
}

let videoAudioCache: VideoAudioPolicy | null = null;
let fxMatrixCache: FxFeasibilityMatrix | null = null;

export function loadVideoAudioPolicy(): VideoAudioPolicy {
  if (!videoAudioCache) {
    videoAudioCache = readFixtureJson<VideoAudioPolicy>("video_audio_policy.json", {});
  }
  return videoAudioCache;
}

export function loadFxFeasibilityMatrix(): FxFeasibilityMatrix {
  if (!fxMatrixCache) {
    fxMatrixCache = readFixtureJson<FxFeasibilityMatrix>("fx_feasibility_matrix.json", {});
  }
  return fxMatrixCache;
}

/** Normalize audit item level/feasibility field split */
export function normalizeFxLevel(item: { level?: string; feasibility?: string }): string | undefined {
  return item.level ?? item.feasibility;
}

export function resolveVendorAudioPolicy(vendor: string): { policy: string; generateAudio: boolean } {
  const cfg = loadVideoAudioPolicy();
  const vd = cfg.vendorDefaults?.[vendor] ?? cfg.vendorDefaults?.agnesai;
  const policyName = vd?.policy ?? cfg.defaultPolicy ?? "native";
  const pol = cfg.policies?.[policyName];
  return {
    policy: policyName,
    generateAudio: pol?.generateAudio ?? policyName === "native",
  };
}
