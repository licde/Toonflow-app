import type { ObservabilityOptions } from "./observability";
import { createObservability } from "./observability";
import { loadConfigFile, resolveObservabilityOptions } from "./configFile";

export type PresetName = "express" | "electron" | "docker" | "ai-worker";

const PRESETS: Record<PresetName, Partial<ObservabilityOptions>> = {
  express: { switches: { categories: { http: true, ai_call: true } } },
  electron: { switches: { transports: { stdout: true, file: true, sqlite: true } } },
  docker: { switches: { transports: { stdout: true, file: false, sqlite: false } } },
  "ai-worker": { switches: { categories: { ai_call: true, vendor: true, task: true, http: false } } },
};

export function createFromPreset(preset: PresetName, overrides: ObservabilityOptions) {
  const patch = PRESETS[preset] || {};
  return createObservability({
    ...overrides,
    switches: { ...patch.switches, ...overrides.switches },
  });
}

export function createFromConfigFile(filePath: string, overrides: ObservabilityOptions) {
  const file = loadConfigFile(filePath);
  const resolved = resolveObservabilityOptions(overrides, process.env, file);
  return createObservability(resolved);
}
