import type { ObservabilityOptions } from "./observability";
import { createObservability } from "./observability";
import { loadConfigFile, resolveObservabilityOptions, defaultConfigPath } from "./configFile";

export type PresetName = "express" | "electron" | "docker" | "ai-worker";

const PRESETS: Record<PresetName, Partial<ObservabilityOptions>> = {
  express: { switches: { categories: { http: true, ai_call: true } } },
  electron: { switches: { transports: { stdout: true, file: true, sqlite: true } } },
  docker: { switches: { transports: { stdout: true, file: false, sqlite: false } } },
  "ai-worker": { switches: { categories: { ai_call: true, vendor: true, task: true, http: false } } },
};

const DEFAULT_BASE: ObservabilityOptions = {
  appId: "app",
  logDir: "./logs",
  switches: { enabled: true },
};

export function createFromPreset(preset: PresetName, overrides: ObservabilityOptions) {
  const patch = PRESETS[preset] || {};
  return createObservability({
    ...overrides,
    switches: { ...patch.switches, ...overrides.switches },
  });
}

export function createFromConfigFile(overrides?: Partial<ObservabilityOptions>): ReturnType<typeof createObservability>;
export function createFromConfigFile(filePath: string, overrides?: Partial<ObservabilityOptions>): ReturnType<typeof createObservability>;
export function createFromConfigFile(
  filePathOrOverrides?: string | Partial<ObservabilityOptions>,
  overrides: Partial<ObservabilityOptions> = {},
): ReturnType<typeof createObservability> {
  let filePath = defaultConfigPath();
  let opts = { ...DEFAULT_BASE, ...overrides };
  if (typeof filePathOrOverrides === "string") {
    filePath = filePathOrOverrides;
  } else if (filePathOrOverrides) {
    opts = { ...opts, ...filePathOrOverrides };
  }
  const file = loadConfigFile(filePath);
  const resolved = resolveObservabilityOptions(opts as ObservabilityOptions, process.env, file);
  return createObservability(resolved);
}
