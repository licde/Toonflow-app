# @toonflow/observability

Toonflow 可观测性子架构（SSOT 文档目录）。

## 能力

- 结构化 `LogEvent`（traceId、errorFingerprint、vendorId、entityRefs）
- 多传输：stdout / 按日 JSONL / SQLite `o_log_events` + FTS5
- Express：`traceMiddleware`、`errorHandler`
- 智能层（无 LLM）：Playbook 诊断、厂商聚合、推荐
- Profile：`balanced` | `secure` | `performance` | `debug`

## 宿主集成

| 路径 | 说明 |
|------|------|
| `src/observability/bootstrap.ts` | 早期初始化 + DB 挂载 |
| `src/observability/store.ts` | SQLite 读写 |
| `src/routes/logs/*` | REST API |
| `src/app.ts` | trace 中间件 |

## API

OpenAPI：`docs/api/openapi.yaml`

主要端点（前缀 `/api/logs`）：

- `POST /query` — 查询
- `GET /trace/:traceId` — 链路
- `GET /incidents` — 事件中心
- `POST /diagnose` — Playbook
- `POST /similar` — 指纹相似
- `POST /aggregate` — 厂商统计
- `GET /recommend/list` — 推荐
- `POST /ingest` — 外部注入
- `GET /health` — 健康
- `GET|POST /switches/*` — 开关

## 环境变量

| 变量 | 默认 | 说明 |
|------|------|------|
| `OBS_ENABLED` | 1 | 总开关 |
| `LOG_STDOUT` | 1 | 控制台 JSON |
| `LOG_FILE_ENABLED` | 1 | 日 JSONL |
| `ossURL` | — | 外部 AI 拉取参考图公网地址 |

## Agnes AI

供应商 ID：`agnesai`，源码 `data/vendor/agnesai.ts` v2.6。  
首次启动由 `fixDB` 种子写入 `o_vendorConfig` 与 vendor 目录。  
外部 HTTP 契约见 OpenAPI `agnes` tag。

## 简易 UI

静态页：`data/web/observability-center/`（需登录 token）
