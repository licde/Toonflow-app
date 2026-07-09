# 参考图拉取失败

图像/视频生成时厂商无法访问本地或内网参考图 URL。

## 适用场景

- Agnes 图生图 `extra_body.image` 使用 `/oss/...` 或 `localhost`
- 日志 message 含 `localhost`、`127.0.0.1`
- 启动时出现 warn：`ossURL 未配置，外部 AI 可能无法拉取本地参考图`

## 前置条件

- 参考图需公网 HTTPS URL（OpenAPI：`AgnesImageRequest.extra_body.image` 为 URI 数组）
- 配置环境变量 `ossURL` 指向可外网访问的基址
- playbook `pb_oss_localhost` 已内置（`playbooks.ts`）

## 完整代码

**检查 bootstrap 警告（`src/observability/bootstrap.ts`）：**

```typescript
if (!process.env.ossURL) {
  await obs.log({
    level: "warn",
    category: "system",
    module: "bootstrap",
    message: "ossURL 未配置，外部 AI 可能无法拉取本地参考图",
  });
}
```

**正确构造公网 URL：**

```typescript
const ossBase = process.env.ossURL || `http://localhost:10588`;
// 生产必须为公网，例如 https://cdn.example.com 或 ngrok
const publicImageUrl = `${ossBase.replace(/\/$/, "")}/oss/${relativePath}`;

await vendorClient.generate({
  model: "agnes-image-2.1-flash",
  prompt: "风格化",
  size: "1024x576",
  extra_body: {
    response_format: "url",
    image: [publicImageUrl],
  },
});
```

**本地开发用 ngrok：**

```bash
ngrok http 10588
export ossURL=https://abc123.ngrok-free.app
yarn dev
```

**诊断：**

```bash
curl -s -X POST http://localhost:10588/api/logs/diagnose \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"traceId":"<traceId>"}' | jq '.data'
```

## 预期输出

失败时厂商返回 4xx，日志含本地 URL；playbook：

```json
{
  "playbookId": "pb_oss_localhost",
  "conclusion": "参考图为本地 URL，外部 API 无法拉取",
  "suggestions": [
    "配置环境变量 ossURL 为公网地址（如 ngrok）",
    "确认参考图已上传到 OSS"
  ]
}
```

配置 `ossURL` 后重新请求，厂商可拉取图片并返回生成结果 URL。

## FAQ

**Q1：`/oss` 静态路由本地能访问为何厂商不行？**  
厂商服务器在公网，无法访问你机器的 `localhost:10588`。

**Q2：base64 参考图可以吗？**  
视厂商 API 支持；日志中 base64 会被 `redact` 掩码。优先使用公网 URL 减小 payload。
