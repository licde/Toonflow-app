# Web 前端错误体验优化

让用户看到友好提示，同时把技术细节与 `traceId` 送到日志中心。

## 适用场景

- Axios 请求失败时 Toast「请稍后重试」，后台保留完整 stack
- 未捕获异常显示「错误已上报，编号：xxxx」
- 客服可根据用户提供的 trace 编号查询链路

## 前置条件

- 已集成 `@toonflow/observability-browser`（见 quickstart/05）
- UI 层有全局消息组件（Ant Design Message、Element Plus ElMessage 等）
- API `errorHandler` 返回 JSON 含 `traceId`（`packages/observability/src/adapters/express.ts`）

## 完整代码

```typescript
// obs/errorUx.ts
import axios, { AxiosError } from "axios";
import { ElMessage } from "element-plus";
import {
  setupObservabilityBrowser,
  getLastTraceId,
  reportError,
} from "./setup"; // 封装自 browser-spa/setup.ts

const { onFulfilled, onRejected } = setupObservabilityBrowser(
  () => localStorage.getItem("token") || ""
);

axios.interceptors.response.use(onFulfilled, (err: AxiosError) => {
  const traceId =
    (err.response?.headers as Record<string, string>)?.["x-trace-id"] ||
    getLastTraceId();
  const code = err.response?.status;

  if (code === 401) {
    ElMessage.warning("登录已过期，请重新登录");
  } else if (code === 429) {
    ElMessage.warning("操作过于频繁，请稍后再试");
  } else {
    ElMessage.error(
      traceId
        ? `服务异常，请反馈编号：${traceId.slice(0, 8)}`
        : "服务异常，请稍后重试"
    );
  }

  reportError(err, { module: "axios", traceId });
  return Promise.reject(err);
});

// Vue 全局错误钩子
export function installVueErrorHandler(app: import("vue").App) {
  app.config.errorHandler = (err, _instance, info) => {
    reportError(err, { module: `vue:${info}` });
    ElMessage.error("页面发生错误，已自动上报");
  };
}
```

服务端 500 响应格式：

```json
{ "message": "服务器错误", "traceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890" }
```

用户界面仅展示 trace 前 8 位；支持人员用完整 ID 查询：

```bash
curl -s "http://localhost:10588/api/logs/trace/$TRACE_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.diagnosis'
```

## 预期输出

- 用户看到简短中文提示 + 短编号
- `POST /api/logs/ingest` 收到 `category: client`、含 stack 的 payload
- 服务端 `category: system` error 与 client 报告共享同一 `traceId`（若 header 透传成功）

## FAQ

**Q1：ingest 失败用户仍看到「已上报」？**  
应在 `reportError` 回调中区分成功/失败，或文案改为「正在上报」；当前 browser 包静默失败，仅 `console.error`。

**Q2：如何避免重复上报？**  
对同一 `errorFingerprint` 做前端节流（如 60s 内相同 message 只报一次）；指纹算法与后端 `computeFingerprint` 字段一致时可对齐。
