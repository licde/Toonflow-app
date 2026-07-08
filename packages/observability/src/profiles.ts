import type { SwitchConfig } from "./types";

export type ProfileName = "balanced" | "secure" | "performance" | "debug";

export const BALANCED_PROFILE: Partial<SwitchConfig> = {
  enabled: true,
  level: "info",
  transports: { stdout: true, file: true, sqlite: true },
  features: {
    trace: true,
    sampler: true,
    redact: true,
    promptDebug: false,
    recommend: true,
    fingerprint: true,
    playbook: true,
  },
  retentionDays: 30,
};

export const SECURE_PROFILE: Partial<SwitchConfig> = {
  ...BALANCED_PROFILE,
  level: "warn",
  features: {
    trace: true,
    sampler: true,
    redact: true,
    promptDebug: false,
    recommend: true,
    fingerprint: true,
    playbook: true,
  },
  categories: { client: false, http: false },
};

export const PERFORMANCE_PROFILE: Partial<SwitchConfig> = {
  ...BALANCED_PROFILE,
  level: "warn",
  categories: { http: false, client: false },
  features: { ...BALANCED_PROFILE.features!, sampler: true },
};

export const DEBUG_PROFILE: Partial<SwitchConfig> = {
  ...BALANCED_PROFILE,
  level: "debug",
  features: {
    trace: true,
    sampler: false,
    redact: false,
    promptDebug: true,
    recommend: true,
    fingerprint: true,
    playbook: true,
  },
};

export const PROFILES: Record<ProfileName, Partial<SwitchConfig>> = {
  balanced: BALANCED_PROFILE,
  secure: SECURE_PROFILE,
  performance: PERFORMANCE_PROFILE,
  debug: DEBUG_PROFILE,
};

export function applyProfile(config: SwitchConfig, name: ProfileName): SwitchConfig {
  const patch = PROFILES[name];
  return {
    ...config,
    ...patch,
    transports: { ...config.transports, ...patch.transports },
    categories: { ...config.categories, ...patch.categories },
    features: { ...config.features, ...patch.features },
  };
}
