# 自定义 Transport（外部 Sink）

将日志批量转发到自建 HTTP 端点，失败时由宿主降级到本地 file。

## 适用场景

- 已有 Loki/ELK/自建日志网关，希望复用 `LogEvent` JSON 格式
- 多区域部署：边缘写 file，异步 batch 推到中心 Toonflow ingest
- 实验 OTLP 兼容接收器（当前实现为 JSON batch 占位）

## 前置条件

- 接收端接受 `POST` JSON：`{ "events": LogEvent[] }`
- 网络超时建议 ≤ 5s（默认 `timeoutMs: 5000`）
- 了解 `createExternalSink` 在失败时会 `console.warn` 并抛错，由 `DegradedChain` 处理

## 完整代码

```typescript
import {
  createObservability,
  createStdoutSink,
  createFileSink,
  createExternalSink,
} from "@toonflow/observability";

const obs = createObservability({ appId: "custom-transport", logDir: "./logs" });

// 本地兜底
obs.registerSink(createFileSink("./logs"));
obs.registerSink(createStdoutSink());

// 外部 batch（每 20 条 flush）
obs.registerSink(
  createExternalSink({
    endpoint: process.env.LOG_FORWARD_URL || "http://localhost:10588/api/logs/ingest/batch",
    headers: {
      Authorization: `Bearer ${process.env.TOONFLOW_TOKEN}`,
    },
    batchSize: 20,
    timeoutMs: 8000,
  }),
);

await obs.log({
  level: "info",
  category: "system",
  message: "forwarded via external sink",
});
```

实现参考 `packages/observability/src/transports/external.ts`：

```typescript
await fetch(opts.endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json", ...opts.headers },
  body: JSON.stringify({ events: batch }),
  signal: AbortSignal.timeout(opts.timeoutMs ?? 5000),
});
```

自定义 Sink（完全控制）：

```typescript
import type { LogSink } from "@toonflow/observability";

const mySink: LogSink = async (event) => {
  await fetch("https://logs.example.com/v1/events", {
    method: "POST",
    body: JSON.stringify(event),
  });
};
obs.registerSink(mySink);
```

## 预期输出

- 本地 `./logs/2026-07-09.jsonl` 仍有记录（file sink 独立）
- 外部端点每 20 条收到 batch POST
- 外部不可达时终端出现 `[observability external transport failed]`，本地 file 不受影响

## FAQ

**Q1：能否只走外部、不写本地？**  
可以只 `registerSink(createExternalSink(...))`，但不建议生产环境无本地兜底。

**Q2：与 Sidecar tail 方案如何选？**  
改得动代码用 `createExternalSink`；改不动用 `scripts/tail-to-ingest.ts` 读 JSONL（见 quickstart/06）。
