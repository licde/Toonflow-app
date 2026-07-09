# 异步任务轮询超时

视频生成等长任务在轮询 `GET /videos/{taskId}` 或 `GET /agnesapi` 时超时失败。

## 适用场景

- `errorCategory: timeout` 或 playbook `pb_timeout_poll`
- 任务在厂商侧仍在 `processing`，客户端已放弃
- 日志含 `poll`、`task_id`、`video_id` 关键字

## 前置条件

- 了解厂商两种轮询模式（OpenAPI：`/videos/{taskId}` vs `/agnesapi?video_id=`）
- 异步任务超时时间可配置（业务层）
- trace 内可见 `ai_call` + `task` category 事件

## 完整代码

**带指数退避的轮询：**

```typescript
async function pollVideoTask(taskId: string, opts = { maxWaitMs: 600_000, intervalMs: 5000 }) {
  const deadline = Date.now() + opts.maxWaitMs;
  while (Date.now() < deadline) {
    const res = await axios.get(`https://apihub.agnes-ai.com/v1/videos/${taskId}`, {
      headers: { Authorization: `Bearer ${AGNES_KEY}` },
    });
    const status = res.data?.status;
    if (status === "completed" || res.data?.video_url) return res.data;
    if (status === "failed") throw new Error(res.data?.message || "vendor failed");
    await new Promise((r) => setTimeout(r, opts.intervalMs));
  }
  await getObs().logAiError({
    vendorId: "agnesai",
    model: "agnes-video-v2.0",
    message: "poll timeout",
    errorCategory: "timeout",
    payload: { taskId, maxWaitMs: opts.maxWaitMs },
  });
  throw new Error("poll timeout");
}
```

**查询 trace 确认卡在哪一步：**

```bash
TRACE_ID="<id>"
curl -s "http://localhost:10588/api/logs/trace/$TRACE_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.events[] | {ts, category, message}'
```

**诊断 API：**

```bash
curl -s -X POST http://localhost:10588/api/logs/diagnose \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"traceId\":\"$TRACE_ID\"}" | jq '.data.suggestions'
```

## 预期输出

超时时日志：

```json
{
  "level": "error",
  "category": "ai_call",
  "message": "poll timeout",
  "payload": { "errorCategory": "timeout", "taskId": "vid_xxx" }
}
```

playbook：

```json
{
  "playbookId": "pb_timeout_poll",
  "conclusion": "异步任务超时",
  "suggestions": ["检查厂商任务状态", "增大轮询超时或换同步接口厂商"]
}
```

增大 `maxWaitMs` 后任务完成则出现 success 日志。

## FAQ

**Q1：`video_id` 和 `task_id` 用哪个接口？**  
以厂商返回字段为准：task 模式用 `/videos/{taskId}`；video_id 模式用 `/agnesapi?video_id=`（见 openapi.yaml）。

**Q2：轮询间隔多短合适？**  
建议 ≥ 3–5s，避免触发厂商 429；高并发任务用队列串行轮询。
