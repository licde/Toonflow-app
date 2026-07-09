# 生产环境结构化日志规范

在 prod 下平衡可观测性、性能与敏感信息保护。

## 适用场景

- Toonflow 正式部署（`NODE_ENV=prod`）
- 需要 30 天留存、SQLite 查询、但不希望 stdout 刷屏
- 合规要求：日志中不得出现 API Key、base64 媒体

## 前置条件

- 使用 `balanced` 或 `secure` profile（`packages/observability/src/profiles.ts`）
- DB 就绪后执行 `attachObservabilityAfterDb` 启用 sqlite transport
- 设置环境变量：`OBS_ENABLED=1`、`LOG_STDOUT=0`（可选）

## 完整代码

**bootstrap 生产推荐（`src/observability/bootstrap.ts` 模式）：**

```typescript
const obs = createObservability(
  resolveObservabilityOptions(
    {
      appId: "toonflow",
      appVersion: "1.1.8",
      logDir: getPath("logs"),
      switches: {
        enabled: true,
        transports: {
          stdout: process.env.LOG_STDOUT !== "0",
          file: process.env.LOG_FILE_ENABLED !== "0",
          sqlite: false, // DB 就绪后改为 true
        },
      },
    },
    process.env,
    fileConfig,
  ),
);
obs.applyProfile("balanced");
```

**`.env` 生产片段（`observability-cli init` 生成模板）：**

```bash
OBS_ENABLED=1
OBS_PROFILE=balanced
LOG_STDOUT=0
LOG_FILE_ENABLED=1
```

**结构化字段约定：**

```typescript
await obs.log({
  level: "info",
  category: "ai_call",
  message: "image generation ok",
  vendorId: "agnesai",
  model: "agnes-image-2.1-flash",
  projectId: 42,
  traceId: obs.getTraceId(),
  payload: {
    latencyMs: 1200,
    size: "1024x576",
    // 勿放 apiKey、完整 prompt（debug profile 才开 promptDebug）
  },
});
```

**本地静音高频 category：**

```typescript
await obs.withLocalSwitch({ muteCategories: { http: true } }, async () => {
  await heavyBatchJob();
});
```

`shouldLog` 对 vendor/http 有每分钟速率上限（`observability.ts`），error/fatal 不受限。

## 预期输出

- `data/logs/YYYY-MM-DD.jsonl`：按日滚动 JSONL
- SQLite `o_log_event`（或等价表）：支持 FTS 查询
- stdout 关闭时终端无 JSON 行；`GET /api/logs/health` 仍返回健康分

单条落盘示例（已 redact）：

```json
{
  "level": "error",
  "category": "ai_call",
  "message": "Authorization: Bearer ***",
  "errorFingerprint": "agnesai:rate_limit:...",
  "payload": { "latencyMs": 30000 }
}
```

## FAQ

**Q1：`payload` 超过 16KB 会怎样？**  
`truncatePayload` 截断并附加 `payloadTruncated: true`、`_preview` 前缀（`redact.ts`）。

**Q2：生产能用 `debug` profile 吗？**  
仅短期排障；`sampler: false` + `redact: false` 会放大量与敏感数据，用完切回 `balanced`。
