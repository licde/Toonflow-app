# 客户端日志噪声过多

`category: client` 日志刷屏，掩盖真实 AI/系统错误。

## 适用场景

- 前端 `installGlobalErrorHandlers` 上报大量重复错误
- 小程序弱网导致 Axios/wx.request 失败风暴
- 事件中心 `incidents` 被 client 错误占满

## 前置条件

- 默认 `categories.client: false` 对 Embed SDK 生效；ingest 仍可能写入 client
- 可改 switch 或前端节流
- 能使用 `keyword`、`module` 过滤查询

## 完整代码

**关闭 client category（服务端）：**

```bash
curl -s -X POST http://localhost:10588/api/logs/switches/updateSwitches \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"categories": {"client": false}}'
```

或在 `secure` / `performance` profile 中默认关闭（`profiles.ts`）。

**前端节流（browser）：**

```typescript
const seen = new Map<string, number>();
function throttledReportError(err: unknown, meta?: { module?: string }) {
  const key = err instanceof Error ? err.message : String(err);
  const now = Date.now();
  const last = seen.get(key) || 0;
  if (now - last < 60_000) return;
  seen.set(key, now);
  reportError(err, meta);
}
```

**仅上报 error，忽略资源加载失败：**

```typescript
window.addEventListener("error", (e) => {
  if (e.target && (e.target as HTMLElement).tagName) return; // script/img 加载错误
  reportError(e.error || e.message, { module: "spa" });
}, true);
```

**查询时排除 client：**

```bash
curl -s -X POST http://localhost:10588/api/logs/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"category":"ai_call","level":"error","limit":50}' | jq '.data.total'
```

**局部静音（单次任务）：**

```typescript
await obs.withLocalSwitch({ muteCategories: { client: true } }, async () => {
  await runAutomatedUiTest();
});
```

## 预期输出

关闭 client 后，新 ingest 的 client 事件在 `shouldLog` 阶段被丢弃（Embed 路径）；已入库历史仍在 DB。

节流后 ingest QPS 从数百降至个位数，incidents 以 `ai_call` error 为主。

## FAQ

**Q1：完全关掉 client 会影响排障吗？**  
会失去前端 stack；建议生产关闭或节流，排障时临时 `categories.client: true` + debug profile。

**Q2：ingest 能绕过 switch 吗？**  
ingest 经 `getObs().log()`，同样受 `shouldLog` 与 category 开关约束。
