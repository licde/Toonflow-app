# 厂商调用调试（Vendor Debug）

针对 Agnes 等 AI 厂商的请求失败，用聚合 API 与结构化字段快速定位。

## 适用场景

- 图像/视频生成报错，需区分 auth、限流、参考图、轮询超时
- 对比各 `vendorId` 成功率与 P95 延迟
- 在日志中心筛选 `category: ai_call` 或 `vendor`

## 前置条件

- 已在设置中配置厂商 API Key（Agnes 等）
- `ai_call` category 未被 `performance` profile 关闭
- 可选：配置 `ossURL` 公网地址（本地参考图场景）

## 完整代码

**记录一次 AI 调用失败（应用内）：**

```typescript
import { getObs } from "@/observability/bootstrap";

await getObs().logAiError({
  vendorId: "agnesai",
  model: "agnes-image-2.1-flash",
  message: "429 Too Many Requests",
  errorCategory: "rate_limit",
  projectId: 1,
  payload: { status: 429, endpoint: "/images/generations" },
});
```

`logAiError` 会自动归类、计算 `errorFingerprint` 并触发 playbook 匹配。

**查询厂商维度聚合（最近 7 天）：**

```bash
curl -s -X POST http://localhost:10588/api/logs/aggregate \
  -H "Authorization: Bearer $TOONFLOW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"days": 7}' | jq .
```

**按厂商筛选原始日志：**

```bash
curl -s -X POST http://localhost:10588/api/logs/query \
  -H "Authorization: Bearer $TOONFLOW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "ai_call",
    "vendorId": "agnesai",
    "level": "error",
    "limit": 20
  }' | jq '.data.rows'
```

**Playbook 诊断：**

```bash
curl -s -X POST http://localhost:10588/api/logs/diagnose \
  -H "Authorization: Bearer $TOONFLOW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"traceId": "<从响应头 X-Trace-Id 复制>"}' | jq .
```

OpenAPI 中 Agnes 外部接口见 `docs/api/openapi.yaml` 的 `/images/generations`、`/videos` 等。

## 预期输出

`aggregate` 返回各 vendor 成功数、失败数、平均延迟（由 `aggregateVendors` 计算）。

`diagnose` 对 `errorCategory: rate_limit` 典型返回：

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

定义于 `packages/observability/src/analyze/playbooks.ts`。

## FAQ

**Q1：payload 里会记录完整 API Key 吗？**  
开启 `features.redact`（默认）时，`redactText` 会掩码 `Bearer` token 与 `api_key` 字段（`src/core/redact.ts`）。

**Q2：如何对比两个模型？**  
`query` 请求加 `"model": "agnes-video-v2.0"` 过滤；或对 `aggregate` 结果按 model 二次分组（当前 API 以 vendor 为主维度）。
