# 429 限流

**Playbook:** `pb_rate_limit`

1. 等待 60 秒后重试
2. 切换备用厂商/模型
3. 降低并发任务数

API：`POST /api/logs/diagnose` body `{ "traceId": "..." }`
