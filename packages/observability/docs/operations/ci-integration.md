# CI 集成 Push 日志

## 适用场景

GitHub Actions / GitLab CI 在失败步骤向 Toonflow 推送关键事件，便于与线上日志统一检索。

## 前置条件

- `TOONFLOW_TOKEN`（JWT）
- `TOONFLOW_LOG_INGEST` 指向可访问的 Toonflow 实例

## GitHub Actions 示例

```yaml
- name: Report failure to Toonflow
  if: failure()
  env:
    TOONFLOW_TOKEN: ${{ secrets.TOONFLOW_TOKEN }}
    TOONFLOW_LOG_INGEST: https://your-host/api/logs/ingest
  run: |
    curl -sS -X POST "$TOONFLOW_LOG_INGEST" \
      -H "Authorization: Bearer $TOONFLOW_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"level":"error","category":"system","message":"CI job failed","payload":{"job":"${{ github.job }}","run_id":"${{ github.run_id }}"}}'
```

## 预期输出

`POST` 返回 `{ "code": 200, "data": { "accepted": true } }`；在事件中心或 `POST /api/logs/query` 可查到。

## FAQ

1. **401** — 检查 secret 是否为有效 JWT，见 [07-ingest-rejected](troubleshooting/07-ingest-rejected.md)。
2. **CI 无法访问内网 Toonflow** — 使用公网隧道或仅写 GitHub Actions 日志 + Sidecar 汇聚。
