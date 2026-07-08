import {
  createObservability,
  createFileSink,
  createStdoutSink,
  loadConfigFile,
  defaultConfigPath,
  resolveObservabilityOptions,
} from "@toonflow/observability";
import getPath from "@/utils/getPath";
import { createDbSink, initLogStore } from "./store";

declare global {
  // eslint-disable-next-line no-var
  var __toonflowObs: ReturnType<typeof createObservability> | undefined;
}

const appVersion = process.env.npm_package_version || "1.1.8";

function envEnabled(): boolean {
  if (process.env.OBS_ENABLED === "0") return false;
  return true;
}

export function initObservabilityBootstrap() {
  if (global.__toonflowObs) return global.__toonflowObs;

  const logDir = getPath("logs");
  const fileConfig = loadConfigFile(defaultConfigPath());
  const obs = createObservability(
    resolveObservabilityOptions(
      {
        appId: "toonflow",
        appVersion,
        logDir,
        switches: {
          enabled: envEnabled(),
          transports: {
            stdout: process.env.LOG_STDOUT !== "0",
            file: process.env.LOG_FILE_ENABLED !== "0",
            sqlite: false,
          },
        },
      },
      process.env,
      fileConfig,
    ),
  );

  obs.applyProfile("balanced");
  obs.registerSink(createStdoutSink(process.env.LOG_STDOUT !== "0"));
  obs.registerSink(createFileSink(logDir, process.env.LOG_FILE_ENABLED !== "0"));

  global.__toonflowObs = obs;
  return obs;
}

export async function attachObservabilityAfterDb(knex: import("knex").Knex) {
  const obs = initObservabilityBootstrap();
  await initLogStore(knex);
  obs.registerSink(createDbSink());
  obs.updateSwitches({ transports: { ...obs.getSwitches().transports, sqlite: true } });

  if (!process.env.ossURL) {
    await obs.log({
      level: "warn",
      category: "system",
      module: "bootstrap",
      message: "ossURL 未配置，外部 AI 可能无法拉取本地参考图",
    });
  }
}

export function getObs() {
  return global.__toonflowObs || initObservabilityBootstrap();
}

initObservabilityBootstrap();
