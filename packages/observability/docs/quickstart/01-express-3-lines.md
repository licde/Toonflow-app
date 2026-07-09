# Express 三行接入

在独立 Node/Express 服务中快速启用结构化日志与 HTTP 链路追踪。

## 适用场景

- 新建 Express API 服务，需要与 Toonflow 相同的 `X-Trace-Id` 与 JSONL 落盘格式
- 本地调试时希望在终端看到结构化日志，同时写入 `logs/YYYY-MM-DD.jsonl`
- 不想依赖 Toonflow 宿主，仅使用 `@toonflow/observability` SDK

## 前置条件

- Node.js ≥ 18，已安装 `express`
- 仓库内可通过 Yarn workspace 引用 `@toonflow/observability`（见 `docs/migration/npm-install.md`）
- 可选：运行 `yarn obs:init` 生成 `observability.config.json`

## 完整代码

与仓库示例 `packages/observability/examples/express-minimal/server.ts` 一致：

```typescript
import express from "express";
import { createObservability, traceMiddleware } from "@toonflow/observability";
import { createStdoutSink, createFileSink } from "@toonflow/observability";
import path from "node:path";
import os from "node:os";

const app = express();
const logDir = path.join(os.tmpdir(), "toonflow-obs-example");
const obs = createObservability({ appId: "express-minimal", logDir });
obs.registerSink(createStdoutSink());
obs.registerSink(createFileSink(logDir));
app.use(traceMiddleware(obs));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(0, () => {
  console.log("express-minimal example running");
});
```

最小三行核心（不含 Sink 注册）：

```typescript
const obs = createObservability({ appId: "my-app", logDir: "./logs" });
obs.registerSink(createStdoutSink());
app.use(traceMiddleware(obs));
```

验证请求：

```bash
curl -i http://localhost:10588/health
# 响应头应含 X-Trace-Id
```

Toonflow 宿主已在 `src/app.ts` 中集成相同模式：`traceMiddleware(getObs())` + `errorHandler(getObs())`。

## 预期输出

**终端（stdout sink）** 每行一条 JSON，例如：

```json
{"schemaVersion":1,"ts":1710000000000,"level":"info","category":"http","message":"GET /health 200","traceId":"a1b2c3d4-...","appId":"express-minimal","module":"http","payload":{"method":"GET","path":"/health","status":200,"latencyMs":3}}
```

**文件 sink**：`{logDir}/2026-07-09.jsonl` 追加相同 JSON 行。

**HTTP 响应头**：`X-Trace-Id: <uuid>`，前端或 Sidecar 可据此关联链路。

## FAQ

**Q1：`registerSink` 可以不注册吗？**  
不注册则 `obs.log()` 不会落盘，仅内存计数。生产环境至少注册 `createFileSink` 或 SQLite sink（Toonflow 宿主在 DB 就绪后注册 `createDbSink`）。

**Q2：与 Toonflow 主应用的区别？**  
主应用通过 `src/observability/bootstrap.ts` 自动加载配置、环境变量与 SQLite；独立 Express 需自行指定 `logDir` 与 sink。API 契约（`LogEvent` schema）完全一致。
