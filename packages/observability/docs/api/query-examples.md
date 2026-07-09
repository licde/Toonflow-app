# 日志 API 查询示例

`Toonflow` 日志中心全部 `/api/logs/*` 端点的 curl 示例。契约以 `docs/api/openapi.yaml` 为准。

**通用变量：**

```bash
BASE=http://localhost:10588
TOKEN="<从 POST /api/login/login 获取的 JWT>"
```

所有请求需头：`Authorization: Bearer $TOKEN`（白名单仅 login）。

---

## POST /api/logs/query

分页筛选结构化日志。

```bash
curl -s -X POST "$BASE/api/logs/query" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "level": "error",
    "category": "ai_call",
    "vendorId": "agnesai",
    "model": "agnes-image-2.1-flash",
    "traceId": "demo-trace-python",
    "projectId": 1,
    "keyword": "rate_limit",
    "from": 1710000000000,
    "to": 1710086400000,
    "limit": 50,
    "offset": 0
  }' | jq .
```

**预期输出：**

```json
{
  "code": 200,
  "message": "成功",
  "data": {
    "rows": [
      {
        "id": 101,
        "ts": 1710001234567,
        "level": "error",
        "category": "ai_call",
        "traceId": "demo-trace-python",
        "vendorId": "agnesai",
        "model": "agnes-image-2.1-flash",
        "message": "simulated vendor failure",
        "errorFingerprint": "agnesai:rate_limit:...",
        "payload": "{\"errorCategory\":\"rate_limit\"}"
      }
    ],
    "total": 1
  }
}
```

---

## GET /api/logs/trace/{traceId}

按 traceId 获取链路时间轴与诊断。

```bash
TRACE_ID="demo-trace-python"
curl -s "$BASE/api/logs/trace/$TRACE_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**预期输出：**

```json
{
  "code": 200,
  "data": {
    "traceId": "demo-trace-python",
    "events": [ { "ts": 1710001234567, "category": "ai_call", "level": "error", "message": "..." } ],
    "diagnosis": {
      "playbookId": "pb_rate_limit",
      "conclusion": "厂商限流（429）",
      "suggestions": ["等待 60 秒后重试", "切换备用模型/厂商", "降低并发任务数"]
    }
  }
}
```

---

## GET /api/logs/incidents

事件中心：错误日志 + 失败任务合并列表。

```bash
curl -s "$BASE/api/logs/incidents?limit=30" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**预期输出：**

```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "type": "log",
        "ts": 1710001234567,
        "level": "error",
        "message": "poll timeout",
        "traceId": "abc-123"
      }
    ]
  }
}
```

---

## POST /api/logs/diagnose

Playbook 诊断（body 需 `traceId`）。

```bash
curl -s -X POST "$BASE/api/logs/diagnose" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"traceId": "demo-trace-python"}' | jq .
```

**预期输出：**

```json
{
  "code": 200,
  "data": {
    "playbookId": "pb_rate_limit",
    "conclusion": "厂商限流（429）",
    "suggestions": ["等待 60 秒后重试", "切换备用模型/厂商", "降低并发任务数"]
  }
}
```

---

## POST /api/logs/similar

按错误指纹查找相似事件。

```bash
curl -s -X POST "$BASE/api/logs/similar" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "errorFingerprint": "agnesai:rate_limit:simulated",
    "limit": 20
  }' | jq .
```

**预期输出：**

```json
{
  "code": 200,
  "data": {
    "matches": [
      { "ts": 1710001234567, "traceId": "demo-trace-python", "message": "simulated vendor failure" }
    ]
  }
}
```

---

## POST /api/logs/aggregate

厂商成功率与延迟聚合（默认 7 天）。

```bash
curl -s -X POST "$BASE/api/logs/aggregate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"days": 7}' | jq .
```

**预期输出：**

```json
{
  "code": 200,
  "data": {
    "vendors": [
      {
        "vendorId": "agnesai",
        "total": 120,
        "errors": 5,
        "successRate": 0.958,
        "avgLatencyMs": 2340
      }
    ]
  }
}
```

---

## GET /api/logs/recommend/list

智能推荐（非 LLM）。

```bash
curl -s "$BASE/api/logs/recommend/list" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**预期输出：**

```json
{
  "code": 200,
  "data": {
    "recommendations": [
      {
        "id": "rec_secure_profile",
        "category": "security",
        "title": "启用 secure profile",
        "reason": "检测到大量 client 错误日志",
        "confidence": 0.82,
        "impact": "medium",
        "safe": true
      }
    ],
    "healthScore": 78,
    "cost": { "estimatedUsd": 12.5 }
  }
}
```

---

## POST /api/logs/ingest

外部单条日志注入。

```bash
curl -s -X POST "$BASE/api/logs/ingest" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "level": "error",
    "category": "ai_call",
    "message": "simulated vendor failure",
    "vendorId": "agnesai",
    "traceId": "demo-trace-python",
    "module": "python-worker",
    "model": "agnes-image-2.1-flash",
    "projectId": 1,
    "payload": { "errorCategory": "rate_limit" }
  }' | jq .
```

**预期输出：**

```json
{ "code": 200, "message": "成功", "data": { "accepted": true } }
```

实现：`src/routes/logs/ingest.ts`。

---

## POST /api/logs/ingest/batch

批量注入（Sidecar / 高吞吐）。

```bash
curl -s -X POST "$BASE/api/logs/ingest/batch" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "events": [
      { "level": "info", "category": "system", "message": "batch-1" },
      { "level": "warn", "category": "task", "message": "batch-2", "traceId": "sidecar-trace" }
    ]
  }' | jq .
```

**预期输出：**

```json
{ "code": 200, "message": "成功", "data": { "accepted": 2, "skipped": 0 } }
```

脚本参考：`packages/observability/scripts/tail-to-ingest.ts`。

---

## POST /api/logs/recommend/feedback

推荐反馈闭环。

```bash
curl -s -X POST "$BASE/api/logs/recommend/feedback" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recommendationId": "rec_secure_profile",
    "helpful": true,
    "comment": "已切换 secure profile"
  }' | jq .
```

**预期输出：**

```json
{ "code": 200, "message": "成功", "data": { "saved": true } }
```

---

## GET /api/logs/health

可观测性健康检查。

```bash
curl -s "$BASE/api/logs/health" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**预期输出：**

```json
{
  "code": 200,
  "data": {
    "enabled": true,
    "degraded": false,
    "sinks": ["stdout", "file", "sqlite"],
    "healthScore": 85
  }
}
```

---

## GET /api/logs/switches/getSwitches

读取日志开关配置。

```bash
curl -s "$BASE/api/logs/switches/getSwitches" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**预期输出：**

```json
{
  "code": 200,
  "data": {
    "enabled": true,
    "level": "info",
    "transports": { "stdout": true, "file": true, "sqlite": true },
    "categories": { "http": true, "client": false },
    "features": { "trace": true, "redact": true, "playbook": true },
    "retentionDays": 30
  }
}
```

---

## POST /api/logs/switches/updateSwitches

更新开关或 Profile。

```bash
curl -s -X POST "$BASE/api/logs/switches/updateSwitches" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "profile": "debug",
    "enabled": true,
    "level": "debug",
    "transports": { "stdout": true, "file": true, "sqlite": true }
  }' | jq .
```

**预期输出：**

```json
{
  "code": 200,
  "data": {
    "enabled": true,
    "level": "debug",
    "features": { "sampler": false, "promptDebug": true }
  }
}
```

---

## 错误响应示例

| HTTP | 场景 | body 示例 |
|------|------|-----------|
| 401 | 无 token | `{"message":"未提供token"}` |
| 401 | token 无效 | `{"message":"无效的token"}` |
| 400 | ingest 校验失败 | Zod 字段错误 |
| 404 | 路由不存在 | `{"message":"API 404 Not Found"}` |

更多排障见 `docs/troubleshooting/`。
