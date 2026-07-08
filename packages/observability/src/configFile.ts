import fs from "node:fs";
import path from "node:path";
import type { ObservabilityOptions } from "./observability";
import type { SwitchConfig } from "./types";
import { applyProfile, type ProfileName } from "./profiles";

export interface ConfigFileShape {
  appId?: string;
  profile?: ProfileName;
  logDir?: string;
  switches?: Partial<SwitchConfig>;
}

export function loadConfigFile(filePath: string): ConfigFileShape | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as ConfigFileShape;
  } catch {
    return null;
  }
}

export function resolveObservabilityOptions(
  base: ObservabilityOptions,
  env: NodeJS.ProcessEnv = process.env,
  configFile?: ConfigFileShape | null,
): ObservabilityOptions {
  const profile = (env.OBS_PROFILE as ProfileName) || configFile?.profile;
  let switches = { ...base.switches, ...configFile?.switches };
  if (env.OBS_ENABLED === "0") switches = { ...switches, enabled: false };
  if (env.LOG_STDOUT === "0")
    switches = {
      ...switches,
      transports: {
        stdout: false,
        file: switches?.transports?.file ?? true,
        sqlite: switches?.transports?.sqlite ?? true,
      },
    };
  if (env.LOG_FILE_ENABLED === "0")
    switches = {
      ...switches,
      transports: {
        stdout: switches?.transports?.stdout ?? true,
        file: false,
        sqlite: switches?.transports?.sqlite ?? true,
      },
    };
  const opts: ObservabilityOptions = {
    ...base,
    appId: configFile?.appId || base.appId,
    logDir: configFile?.logDir || base.logDir,
    switches,
  };
  if (profile) {
    const merged = applyProfile(
      {
        enabled: true,
        level: "info",
        transports: { stdout: true, file: true, sqlite: true },
        categories: {},
        modules: {},
        vendors: {},
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
        ...opts.switches,
      },
      profile,
    );
    opts.switches = merged;
  }
  return opts;
}

export function defaultConfigPath(cwd = process.cwd()) {
  return path.join(cwd, "observability.config.json");
}
