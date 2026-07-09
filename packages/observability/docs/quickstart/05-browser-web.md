# 浏览器 Web SPA 接入

在 Vue/React SPA 中捕获前端错误，并关联 API 响应头中的 `X-Trace-Id`。

## 适用场景

- Toonflow Web 前端或独立管理台需要上报 `window.onerror`、Axios 失败
- 用户报错时希望带上最近一次 API 的 `traceId`，便于 `GET /api/logs/trace/:id`
- 不希望在浏览器 bundle 中引入完整 Node observability SDK

## 前置条件

- 已安装 `@toonflow/observability-browser`（workspace 包）
- 前端与 API 同源或 CORS 允许 `POST /api/logs/ingest`
- 用户已登录，可通过 `getToken()` 取得 JWT

## 完整代码

参考 `packages/observability/examples/browser-spa/setup.ts` 与 `packages/observability-browser/src/index.ts`：

```typescript
import axios from "axios";
import {
  createBrowserReporter,
  installGlobalErrorHandlers,
  axiosTraceInterceptor,
  reportError,
} from "@toonflow/observability-browser";

export function setupObservabilityBrowser(getToken: () => string) {
  createBrowserReporter({
    ingestUrl: "/api/logs/ingest",
    getToken,
    appModule: "toonflow-web",
  });
  installGlobalErrorHandlers("spa");
  return axiosTraceInterceptor();
}

// main.ts
const { onFulfilled, onRejected } = setupObservabilityBrowser(
  () => localStorage.getItem("token")!
);
axios.interceptors.response.use(onFulfilled, onRejected);

// 业务代码手动上报
try {
  riskyOperation();
} catch (e) {
  reportError(e, { module: "storyboard-editor" });
}
```

`createBrowserReporter` 会将事件 POST 到 ingest，并强制 `category: "client"`。`axiosTraceInterceptor` 从响应头读取 `x-trace-id` 写入 `sessionStorage`（键 `toonflow_last_trace_id`），供后续 `reportError` 自动附带。

Vue 3 入口示例：

```typescript
// main.ts
import { createApp } from "vue";
import App from "./App.vue";
import { setupObservabilityBrowser } from "./obs/setup";

setupObservabilityBrowser(() => localStorage.getItem("token") || "");
createApp(App).mount("#app");
```

## 预期输出

**ingest 请求体**（浏览器 Network 面板）：

```json
{
  "level": "error",
  "category": "client",
  "message": "Network Error",
  "module": "axios",
  "traceId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "ts": 1710000000000,
  "payload": { "stack": "AxiosError: ..." }
}
```

**服务端响应**：`{"code":200,"data":{"accepted":true},"message":"成功"}`

**日志查询**：`category=client` 且 `module=axios` 可筛到对应记录。

## FAQ

**Q1：ingest 失败会在控制台刷屏吗？**  
`createBrowserReporter` 仅在 catch 时 `console.error("[observability-browser] ingest failed")`，不会重试风暴；可配合 `batchEndpoint` 走批量接口降低 QPS。

**Q2：Electron 渲染进程用这套还是 IPC？**  
纯 Web 用本包；Electron 若已暴露本地 API，ingest 同样可用。离线场景优先 IPC（见 `02-electron-desktop.md`）。
