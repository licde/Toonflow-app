# 微信小程序 Push 上报

小程序无法运行 Node SDK，通过 `wx.request` 调用 Toonflow ingest API。

## 适用场景

- 小程序端 AI 配音、素材上传失败需集中排障
- 与 Web 共用同一 JWT 登录体系（token 存 `wx.setStorageSync`）
- 需遵守微信域名白名单（request 合法域名）

## 前置条件

- 微信公众平台配置 Toonflow API 域名为 request 合法域名
- 小程序已登录并取得 JWT（与 `POST /api/login/login` 相同 token）
- 生产环境使用 HTTPS（微信强制）

## 完整代码

```javascript
// utils/obs.js
const INGEST = "https://your-toonflow.example.com/api/logs/ingest";

function getToken() {
  return wx.getStorageSync("token") || "";
}

export function reportClientError(message, extra = {}) {
  const traceId = wx.getStorageSync("toonflow_last_trace_id") || "";
  wx.request({
    url: INGEST,
    method: "POST",
    header: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + getToken(),
    },
    data: {
      level: "error",
      category: "client",
      message: String(message).slice(0, 500),
      traceId: traceId || undefined,
      module: "miniprogram",
      payload: {
        ...extra,
        platform: wx.getSystemInfoSync().platform,
        version: wx.getAccountInfoSync().miniProgram.version,
      },
    },
    fail(err) {
      console.warn("[obs] ingest failed", err);
    },
  });
}

// 保存 API 返回的 traceId（在封装 request 时）
export function saveTraceIdFromHeader(header) {
  const id = header["X-Trace-Id"] || header["x-trace-id"];
  if (id) wx.setStorageSync("toonflow_last_trace_id", id);
}
```

**封装 `wx.request`：**

```javascript
import { saveTraceIdFromHeader, reportClientError } from "./obs";

export function apiRequest(options) {
  return new Promise((resolve, reject) => {
    wx.request({
      ...options,
      header: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + wx.getStorageSync("token"),
        ...options.header,
      },
      success(res) {
        saveTraceIdFromHeader(res.header || {});
        if (res.statusCode >= 400) {
          reportClientError(`HTTP ${res.statusCode}: ${options.url}`, { body: res.data });
          reject(res);
        } else resolve(res);
      },
      fail: reject,
    });
  });
}
```

**全局错误（`app.js`）：**

```javascript
App({
  onError(err) {
    const { reportClientError } = require("./utils/obs");
    reportClientError(err);
  },
});
```

字段校验与 `src/routes/logs/ingest.ts` 一致：`level`、`category`、`message` 必填。

## 预期输出

ingest 成功时 HTTP 200，body：

```json
{ "code": 200, "data": { "accepted": true }, "message": "成功" }
```

日志中心查询：

```bash
curl -s -X POST https://your-toonflow.example.com/api/logs/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"category":"client","keyword":"miniprogram","limit":10}'
```

## FAQ

**Q1：token 过期怎么办？**  
ingest 返回 401 时引导用户重新登录；勿在日志 payload 中记录 token。

**Q2：能否用 batch 接口？**  
可以累积本地队列，页面 `onHide` 时 `POST /api/logs/ingest/batch`；注意微信单次 request body 大小限制，建议每批 ≤ 20 条。
