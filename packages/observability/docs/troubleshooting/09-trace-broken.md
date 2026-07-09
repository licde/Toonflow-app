# Trace 链路断裂

`GET /api/logs/trace/:traceId` 只有单条记录，或前后端 traceId 不一致。

## 适用场景

- 用户提供的编号查不到完整时间轴
- API 响应头 `X-Trace-Id` 与 ingest 日志 traceId 不同
- 跨 Python/Go 服务无关联事件

## 前置条件

- 各 hop 使用同一 traceId 字符串（UUID）
- Node 服务已挂 `traceMiddleware`
- 浏览器使用 `axiosTraceInterceptor` 或手动读 header

## 完整代码

**验证 API 是否返回 trace 头：**

```bash
curl -i http://localhost:10588/api/health 2>/dev/null | grep -i x-trace-id
# X-Trace-Id: 8f14e45f-ceea-467f-a9bf-2b9d0b8b8c8e
```

**用返回的 ID 查链路：**

```bash
TID="8f14e45f-ceea-467f-a9bf-2b9d0b8b8c8e"
curl -s "http://localhost:10588/api/logs/trace/$TID" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.events | length'
```

**下游透传（修复断裂）：**

```typescript
// 调用方
const traceId = getObs().getTraceId();
await fetch(workerUrl, {
  headers: { "X-Trace-Id": traceId! },
});

// Worker ingest
await ingest({ ...event, traceId: req.headers["x-trace-id"] });
```

**解析 W3C traceparent（已支持）：**

```typescript
// traceMiddleware 自动 parseTraceparent(headers.traceparent)
// 出站调用可设置 traceparent 与 trace-id 双头
```

**浏览器 sessionStorage 检查：**

```javascript
// DevTools Console
sessionStorage.getItem("toonflow_last_trace_id");
```

**跨服务相似错误（指纹聚合）：**

```bash
curl -s -X POST http://localhost:10588/api/logs/similar \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"errorFingerprint":"<fp>","limit":10}' | jq .
```

## 预期输出

修复后同一 `traceId` 下多条事件，按 `ts` 排序，例如 http → task → ai_call。

`diagnose` 能基于完整链路最后一条 error 给出 playbook。

若仅 1 条，多为未透传或使用了错误 ID（用户只复制了前 8 位展示码）。

## FAQ

**Q1：ingest 没传 traceId 会怎样？**  
服务端 `obs.log` 可能生成新 UUID，与前端无关。

**Q2：WebSocket 事件有 trace 吗？**  
`attachSocketObservability(io, getObs())` 会关联 socket 事件；需确认 socket 处理器在 `runWithContext` 内。
