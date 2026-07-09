# Electron 桌面端接入

在 Electron 主进程集中写入日志，渲染进程通过 IPC 上报客户端错误。

## 适用场景

- Toonflow 桌面版（`yarn dev:gui`）或自建 Electron 应用
- 渲染进程（Vue/React）崩溃、未捕获 Promise 需汇总到主进程日志
- 需要与后端 API 共用 `traceId` 做全链路排查

## 前置条件

- Electron 主进程可写本地目录（`userData/logs` 或 `getPath("logs")`）
- 主进程已安装 `@toonflow/observability`
- 渲染进程与主进程约定 IPC 通道名（示例使用 `obs:report`）

## 完整代码

主进程初始化（参考 `packages/observability/examples/electron-minimal/main.ts`）：

```typescript
import { app, ipcMain, BrowserWindow } from "electron";
import path from "node:path";
import {
  createFromPreset,
  createStdoutSink,
  createFileSink,
  traceMiddleware,
  errorHandler,
} from "@toonflow/observability";
import express from "express";

const logDir = path.join(app.getPath("userData"), "logs");

export function setupElectronObs() {
  const obs = createFromPreset("electron", { appId: "electron-demo", logDir });
  obs.registerSink(createStdoutSink());
  obs.registerSink(createFileSink(logDir));
  return obs;
}

const obs = setupElectronObs();

// 渲染进程上报客户端错误
ipcMain.on("obs:report", (_e, payload: { message: string; level?: string; traceId?: string; payload?: object }) => {
  void obs.log({
    level: (payload.level as "error") || "error",
    category: "client",
    message: payload.message,
    traceId: payload.traceId,
    module: "renderer",
    payload: payload.payload,
  });
});

// 内嵌 Express（Toonflow 模式）
const api = express();
api.use(traceMiddleware(obs));
api.use(errorHandler(obs));
```

渲染进程（preload 或 Vue 入口）：

```typescript
// preload.ts
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("toonflowObs", {
  reportError(err: unknown, meta?: { traceId?: string }) {
    const message = err instanceof Error ? err.message : String(err);
    ipcRenderer.send("obs:report", {
      level: "error",
      message,
      traceId: meta?.traceId,
      payload: err instanceof Error ? { stack: err.stack?.slice(0, 2000) } : undefined,
    });
  },
});
```

Toonflow 宿主：`src/app.ts` 在 Electron 下启动 Express，`attachSocketObservability` 同步 WebSocket 事件到 obs。

## 预期输出

- `{userData}/logs/2026-07-09.jsonl` 含 `category: "client"` 的 error 行
- 主进程 HTTP 请求产生 `category: "http"` 行，与 Web 版格式一致
- 启动时若 `ossURL` 未配置，`bootstrap.ts` 会写一条 `category: "system"` 的 warn（参考图公网可达性）

示例 client 行：

```json
{"level":"error","category":"client","message":"TypeError: Cannot read property 'x' of undefined","traceId":"demo-trace","module":"renderer","appId":"electron-demo"}
```

## FAQ

**Q1：为什么 client 日志默认在 SDK 里是关闭的？**  
`SwitchConfig.categories.client` 默认为 `false`，避免噪声。Electron 场景在 preset 或 `updateSwitches({ categories: { client: true } })` 中显式开启。

**Q2：渲染进程能直接 `createObservability` 吗？**  
不推荐。渲染进程无稳定文件路径且易泄露密钥；应 IPC 到主进程或使用 `@toonflow/observability-browser` 走 `POST /api/logs/ingest`（见 `05-browser-web.md`）。
