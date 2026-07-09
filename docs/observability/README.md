# Toonflow 可观测性

**文档 SSOT：** [`packages/observability/docs/README.md`](../packages/observability/docs/README.md)

## 四种接入模式

| 模式 | 适用 | 文档 |
|------|------|------|
| Embed | Node/Express/Electron 主进程 | [quickstart/01](packages/observability/docs/quickstart/01-express-3-lines.md) |
| Browser Report | Vue/React Web | [quickstart/05](packages/observability/docs/quickstart/05-browser-web.md) |
| Push | Python/Go/小程序/CI | [quickstart/03](packages/observability/docs/quickstart/03-python-push.md) |
| Sidecar | 不改业务代码 | [quickstart/06](packages/observability/docs/quickstart/06-sidecar-tail.md) |

## 安装独立包

见 [migration/npm-install.md](packages/observability/docs/migration/npm-install.md)

## API 与 UI

- OpenAPI: `packages/observability/docs/api/openapi.yaml`
- 日志中心: `/observability-center/`（需 JWT）
