# Ingest 请求被拒绝

`POST /api/logs/ingest` 或 `/ingest/batch` 返回 400/422 或 `accepted: 0`。

## 适用场景

- Sidecar `tail-to-ingest.ts` 打印 `ingest failed 400`
- Python/Go 上报字段不合规
- batch 部分事件被 `skipped`

## 前置条件

- 熟悉 `LogIngestRequest` schema（`docs/api/openapi.yaml`）
- 服务端校验：`src/routes/logs/ingest.ts` Zod enum
- JWT 已通过（非 401 场景）

## 完整代码

**合法单条 ingest：**

```bash
curl -s -X POST http://localhost:10588/api/logs/ingest \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "level": "info",
    "category": "system",
    "message": "valid event"
  }'
```

**常见非法示例与修复：**

```json
// ❌ level 拼写错误
{ "level": "warning", "category": "system", "message": "x" }
// ✅ 使用 warn
{ "level": "warn", "category": "system", "message": "x" }

// ❌ category 不在枚举
{ "level": "info", "category": "app", "message": "x" }
// ✅ 使用 system / task / client 等

// ❌ 缺少 message
{ "level": "info", "category": "system" }
```

**batch 格式：**

```bash
curl -s -X POST http://localhost:10588/api/logs/ingest/batch \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "events": [
      { "level": "info", "category": "task", "message": "a" },
      { "level": "error", "category": "ai_call", "message": "b", "vendorId": "agnesai" }
    ]
  }' | jq .
```

**Sidecar 映射兜底（`scripts/tail-to-ingest.ts`）：**

```typescript
batch.push({
  level: obj.level || "info",
  category: obj.category || "system",
  message: obj.message || line.slice(0, 500),
  traceId: obj.traceId,
  vendorId: obj.vendorId,
  payload: obj.payload,
});
```

## 预期输出

成功：`{"code":200,"data":{"accepted":true},"message":"成功"}`

batch 成功典型：`{"code":200,"data":{"accepted":2,"skipped":0},"message":"成功"}`

校验失败：HTTP 400 + Zod 错误详情（字段路径与原因）。

## FAQ

**Q1：`payload` 可以是任意 JSON 吗？**  
是 `Record<string, unknown>`；过大时写入后可能被 `truncatePayload` 截断，但不导致 ingest 拒绝。

**Q2：重复 eventId 会重复入库吗？**  
SDK 侧 `seenEventIds` 可去重；ingest 路由若未来支持 `eventId` 幂等，以路由实现为准。
