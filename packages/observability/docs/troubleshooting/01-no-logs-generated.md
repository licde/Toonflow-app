# 没有日志生成

启动服务后 `logs/` 目录为空或查询 API 返回空列表。

## 适用场景

- 新部署 Toonflow，不知道日志写到哪里
- `GET /api/logs/query` 始终 `total: 0`
- 终端看不到 JSON 结构化输出

## 前置条件

- 确认 `OBS_ENABLED` 未设为 `0`
- 确认至少注册了一个 sink（stdout / file / sqlite）
- 若仅依赖 SQLite，需 DB 迁移完成且 `attachObservabilityAfterDb` 已执行

## 完整代码

**诊断清单脚本：**

```bash
# 1. 健康检查
curl -s http://localhost:10588/api/logs/health \
  -H "Authorization: Bearer $TOONFLOW_TOKEN" | jq .

# 2. 查看开关
curl -s http://localhost:10588/api/logs/switches/getSwitches \
  -H "Authorization: Bearer $TOONFLOW_TOKEN" | jq '.data.enabled, .data.transports'

# 3. 手动写一条
curl -s -X POST http://localhost:10588/api/logs/ingest \
  -H "Authorization: Bearer $TOONFLOW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"level":"info","category":"system","message":"probe"}' | jq .

# 4. 再查询
curl -s -X POST http://localhost:10588/api/logs/query \
  -H "Authorization: Bearer $TOONFLOW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"keyword":"probe","limit":5}' | jq '.data.total'
```

**应用内探针：**

```typescript
import { getObs } from "@/observability/bootstrap";
import fs from "node:fs";

const obs = getObs();
console.log("switches", obs.getSwitches());
console.log("degraded", obs.getDegradedState());
await obs.log({ level: "info", category: "system", message: "bootstrap probe" });
console.log("logDir exists", fs.existsSync(getPath("logs")));
```

**常见修复：**

```typescript
// 确保注册 file sink
obs.registerSink(createFileSink(logDir, true));
obs.updateSwitches({ enabled: true, level: "info" });
```

## 预期输出

修复后：

- `data/logs/2026-07-09.jsonl` 出现新行
- `query` 对 `keyword: probe` 返回 `total >= 1`
- `health` 中 degraded 链状态为正常

若 `enabled: false` 或 `level: "error"` 而只打 info，则 `shouldLog` 过滤（`observability.ts`）。

## FAQ

**Q1：`LOG_STDOUT=0` 且 `LOG_FILE_ENABLED=0` 还有日志吗？**  
仅当 sqlite transport 为 true 且 DB sink 已注册；否则全部丢弃。

**Q2：发了 HTTP 请求但没有 http 日志？**  
检查是否挂载 `traceMiddleware`；`performance` profile 会关闭 `http` category。
