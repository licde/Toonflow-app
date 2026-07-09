# 跨服务 Trace 串联

让浏览器、Node API、Python Worker 共享同一 `traceId`，在日志中心查看完整时间轴。

## 适用场景

- 用户在前端触发任务 → API → 异步 Worker → 厂商回调
- 微服务间透传 `X-Trace-Id` 或 W3C `traceparent`
- 排障时用 `GET /api/logs/trace/:traceId` 一次看清全链路

## 前置条件

- 各 hop 至少一方写入带相同 `traceId` 的 `LogEvent`
- Node 服务使用 `traceMiddleware`（自动设置响应头）
- 下游 Push 服务在 ingest 时传入上游 `traceId`

## 完整代码

**1. Node API 入口（自动 trace）：**

```typescript
// src/app.ts 已集成
import { traceMiddleware } from "@toonflow/observability";
app.use(traceMiddleware(getObs()));
// 响应头: X-Trace-Id
```

**2. 调用下游时透传：**

```typescript
import { getObs } from "@/observability/bootstrap";
import axios from "axios";

const traceId = getObs().getTraceId();
await axios.post("http://worker:8080/run", body, {
  headers: { "X-Trace-Id": traceId! },
});
```

`traceMiddleware` 也支持解析入站 `traceparent`（`packages/observability/src/adapters/express.ts`）。

**3. Python Worker ingest 同一 trace：**

```python
import os, json, urllib.request

trace_id = os.environ["UPSTREAM_TRACE_ID"]  # 从 HTTP header 读取
event = {
    "level": "info",
    "category": "task",
    "message": "worker step completed",
    "traceId": trace_id,
}
# ... POST /api/logs/ingest
```

**4. 浏览器保存 traceId：**

```typescript
import { axiosTraceInterceptor } from "@toonflow/observability-browser";
const { onFulfilled, onRejected } = axiosTraceInterceptor();
axios.interceptors.response.use(onFulfilled, onRejected);
// sessionStorage: toonflow_last_trace_id
```

**5. 查询链路：**

```bash
curl -s "http://localhost:10588/api/logs/trace/$TRACE_ID" \
  -H "Authorization: Bearer $TOONFLOW_TOKEN" | jq '.data.events | sort_by(.ts)'
```

## 预期输出

`GET /api/logs/trace/:traceId` 返回按时间排序的事件列表 + 诊断摘要（`src/observability/apiHelpers.ts` 的 `diagnoseTrace`）。

示例时间轴：

| ts | category | message |
|----|----------|---------|
| T0 | http | GET /api/task/start 200 |
| T1 | task | worker step completed |
| T2 | ai_call | vendor request failed |

每条共享 `traceId: "f47ac10b-..."`。

## FAQ

**Q1：没有传 `traceId` 会怎样？**  
各服务各自 `randomUUID()`，链路断裂。务必在 HTTP header 或消息队列 payload 中透传。

**Q2：`spanSeq` 有什么用？**  
同一 trace 内递增序号，用于排序同一毫秒内的多条日志；ingest 可不传，由服务端 `obs.log` 自动生成。
