# 包边界说明（publish-boundary）

## 独立包（零 Toonflow 业务依赖）

| 包 | 允许 | 禁止 |
|----|------|------|
| `@toonflow/observability` | Node 标准库、LogEvent、Transport | `import "@/"`、Knex、`o_*` 表 |
| `@toonflow/observability-browser` | 浏览器 API、fetch ingest | Node 专有模块 |
| `@toonflow/observability-cli` | 读写 cwd 配置文件 | 业务 DB |

## 宿主胶水（仅 Toonflow-app）

| 路径 | 职责 |
|------|------|
| `src/observability/bootstrap.ts` | getPath、env、早期 sink |
| `src/observability/store.ts` | `o_log_events` + FTS 写入回调 |
| `src/routes/logs/*` | JWT 保护的 REST API |
| `data/web/observability-center/` | 静态事件中心 MVP |

**规则：** 新内核能力进 `packages/observability`；仅 Toonflow 特有的表结构/JWT 留在宿主。
