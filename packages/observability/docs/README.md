# @toonflow/observability 文档（SSOT）

## 快速入门 Quickstart

| 文档 | 场景 |
|------|------|
| [01-express-3-lines](quickstart/01-express-3-lines.md) | Express 3 行嵌入 |
| [02-electron-desktop](quickstart/02-electron-desktop.md) | Electron 主进程 + IPC |
| [03-python-push](quickstart/03-python-push.md) | Python Push |
| [04-go-push](quickstart/04-go-push.md) | Go Push |
| [05-browser-web](quickstart/05-browser-web.md) | Vue/React + browser SDK |
| [06-sidecar-tail](quickstart/06-sidecar-tail.md) | Sidecar tail JSONL |

## Cookbook

| 文档 | 主题 |
|------|------|
| [01-switch-config](cookbook/01-switch-config.md) | 开关与 Profile |
| [02-vendor-debug](cookbook/02-vendor-debug.md) | AI 厂商排障 |
| [03-trace-cross-service](cookbook/03-trace-cross-service.md) | 跨服务 trace |
| [04-custom-transport](cookbook/04-custom-transport.md) | 自定义 Transport |
| [05-custom-playbook](cookbook/05-custom-playbook.md) | 自定义 Playbook |
| [06-multi-app-ingest](cookbook/06-multi-app-ingest.md) | 多应用汇聚 |
| [07-structured-production](cookbook/07-structured-production.md) | entityRefs |
| [08-web-error-ux](cookbook/08-web-error-ux.md) | Web 错误 UX |
| [09-miniprogram-push](cookbook/09-miniprogram-push.md) | 小程序 Push |

## Troubleshooting

| 文档 | 对应 Playbook |
|------|----------------|
| [01-no-logs-generated](troubleshooting/01-no-logs-generated.md) | 开关 |
| [02-auth-401](troubleshooting/02-auth-401.md) | pb_auth_invalid |
| [03-rate-limit-429](troubleshooting/03-rate-limit-429.md) | pb_rate_limit |
| [04-reference-image-fail](troubleshooting/04-reference-image-fail.md) | pb_oss_localhost |
| [05-poll-timeout](troubleshooting/05-poll-timeout.md) | pb_timeout_poll |
| [06-log-query-slow](troubleshooting/06-log-query-slow.md) | 索引 |
| [07-ingest-rejected](troubleshooting/07-ingest-rejected.md) | JWT |
| [08-client-noise](troubleshooting/08-client-noise.md) | client 噪音 |
| [09-trace-broken](troubleshooting/09-trace-broken.md) | trace 断裂 |

## API 与迁移

- [OpenAPI](api/openapi.yaml)
- [query-examples](api/query-examples.md)
- [npm-install](migration/npm-install.md)
- [boundary](architecture/boundary.md)

## 可运行示例

| 目录 | 说明 |
|------|------|
| `examples/express-minimal/` | Embed Express |
| `examples/electron-minimal/` | Electron 主进程 |
| `examples/browser-spa/` | Web browser SDK |
| `examples/python-ingest/` | Python Push |
| `examples/go-ingest/` | Go Push |
| `examples/push-node/` | Node createPushClient |
| `scripts/tail-to-ingest.ts` | Sidecar batch |

## 包

- `@toonflow/observability` — Node SDK
- `@toonflow/observability-browser` — 浏览器 SDK
- `@toonflow/observability-cli` — `yarn obs:init`
