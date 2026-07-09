# 多应用统一 Ingest

多个 `appId` 的应用向同一 Toonflow 实例 Push 日志，并按应用筛选查询。

## 适用场景

- Monorepo 内 `express-minimal`、`ai-worker`、Python 批处理共用日志中心
- 测试/预发/生产实例隔离（不同 `appId`，同一 Toonflow）
- 运维大盘需要按 `appId` 或 `module` 聚合

## 前置条件

- 各应用持有有效 JWT（同一 Toonflow 用户或共享服务账号）
- ingest 路由已挂载（`POST /api/logs/ingest`）
- Push 事件可通过 `module` 或 ingest body 区分来源（ingest 会写入宿主 `appId: toonflow`，来源记在 `module`/`payload`）

## 完整代码

**应用 A（Node Embed）：**

```typescript
const obs = createObservability({ appId: "render-farm", logDir: "./logs-a" });
await obs.log({ level: "info", category: "task", message: "job started", module: "render-farm" });
```

**应用 B（Python Push）：**

```python
event = {
    "level": "error",
    "category": "ai_call",
    "message": "GPU OOM",
    "module": "python-upscale",
    "payload": {"sourceApp": "upscale-worker"},
}
```

**应用 C（Go Push）：**

```go
event := map[string]any{
    "level": "warn",
    "category": "system",
    "message": "disk 85%",
    "module": "go-cleaner",
}
```

**批量 Sidecar（历史 JSONL 含不同 appId 字段）：**

```bash
TOONFLOW_TOKEN=$TOKEN npx tsx packages/observability/scripts/tail-to-ingest.ts /var/log/app-b/2026-07-09.jsonl
```

**按 module 查询：**

```bash
curl -s -X POST http://localhost:10588/api/logs/query \
  -H "Authorization: Bearer $TOONFLOW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"keyword": "render-farm", "limit": 50}' | jq '.data.rows[].module'
```

**事件中心（错误汇总）：**

```bash
curl -s "http://localhost:10588/api/logs/incidents?limit=30" \
  -H "Authorization: Bearer $TOONFLOW_TOKEN" | jq .
```

## 预期输出

查询 `rows` 中 `appId` 多为 `toonflow`（ingest 经宿主写入），`module` 区分来源：

```json
[
  { "module": "render-farm", "category": "task", "message": "job started" },
  { "module": "python-upscale", "category": "ai_call", "message": "GPU OOM" }
]
```

`incidents` 合并高优先级 error 与失败任务，便于跨应用巡检。

## FAQ

**Q1：能否在 ingest 里改 `appId`？**  
当前 ingest schema 未暴露 `appId` 字段，统一归宿主；用 `module` + `payload.sourceApp` 区分。Embed SDK 直连 `obs.log` 则保留各自 `appId`。

**Q2：多租户 projectId 如何隔离？**  
ingest 支持 `projectId` 整数；查询时加 `"projectId": 42` 过滤。
