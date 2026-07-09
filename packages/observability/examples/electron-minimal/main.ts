/**
 * Electron 主进程 observability 示例（简化）
 * 渲染进程通过 IPC 发送 client 错误，主进程写入 obs
 */
import { createFromPreset, createStdoutSink, createFileSink } from "@toonflow/observability";

export function setupElectronObs(logDir: string) {
  const obs = createFromPreset("electron", { appId: "electron-demo", logDir });
  obs.registerSink(createStdoutSink());
  obs.registerSink(createFileSink(logDir));
  return obs;
}

// 在 ipcMain 中:
// ipcMain.on("obs:report", (_e, payload) => obs.log({ level: "error", category: "client", ...payload }));
