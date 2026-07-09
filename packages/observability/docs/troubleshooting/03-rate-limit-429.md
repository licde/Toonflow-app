# 429 限流

AI 厂商或本地 observability 速率限制导致请求失败或日志被丢弃。

## 适用场景

- Agnes `/images/generations` 返回 HTTP 429
- 日志中 `errorCategory: rate_limit` 或 playbook `pb_rate_limit`
- 高并发时 info 级 http 日志变少（非错误）

## 前置条件

- 能访问 `POST /api/logs/query` 筛选 `level: error`
- 了解 SDK 内置 category 速率上限（vendor 30/min，http 500/min，`observability.ts`）
- 厂商侧配额由供应商控制台管理

## 完整代码

**确认是否为厂商 429：**

```bash
curl -s -X POST http://localhost:10588/api/logs/query \
  -H "Authorization: Bearer $TOONFLOW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"category":"ai_call","keyword":"429","limit":10}' | jq '.data.rows[].payload'
```

**诊断：**

```bash
curl -s -X POST http://localhost:10588/api/logs/diagnose \
  -H "Authorization: Bearer $TOONFLOW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"traceId":"<traceId>"}' | jq .
```

**应用层退避重试（axios-retry）：**

```typescript
import axiosRetry from "axios-retry";
import axios from "axios";

axiosRetry(axios, {
  retries: 3,
  retryDelay: (n) => Math.min(1000 * 2 ** n, 60000),
  retryCondition: (err) => err.response?.status === 429,
});
```

**降低本地日志压力：**

```typescript
getObs().applyProfile("performance");
// 或 updateSwitches({ categories: { http: false } })
```

**业务并发控制：**

```typescript
import pLimit from "p-limit";
const limit = pLimit(3);
await Promise.all(tasks.map((t) => limit(() => callVendor(t))));
```

OpenAPI：`/images/generations` 响应 `429` 描述为限流。

## 预期输出

playbook 诊断：

```json
{
  "playbookId": "pb_rate_limit",
  "conclusion": "厂商限流（429）",
  "suggestions": ["等待 60 秒后重试", "切换备用模型/厂商", "降低并发任务数"]
}
```

退避后厂商返回 200，新日志 `level: info`。

本地 http 采样被限时，error/fatal 仍全量记录。

## FAQ

**Q1：日志变少是 bug 吗？**  
对 info/warn 可能是 `allowRate` 故意丢弃；若 error 也缺失，检查 `enabled` 与 sink。

**Q2：ingest 会 429 吗？**  
当前 Toonflow ingest 无标准 429；若前置 Nginx 限流，调高 `limit_req` 或走 batch。
