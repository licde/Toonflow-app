# 日志查询变慢

`POST /api/logs/query` 或 trace 接口响应时间超过数秒。

## 适用场景

- 日志量 > 数十万条后查询卡顿
- 带 `keyword` 全文检索特别慢
- SQLite 单文件过大（数 GB）

## 前置条件

- 使用 SQLite 存储（`attachObservabilityAfterDb` 后）
- 了解 `retentionDays` 默认 30（`SwitchConfig`）
- 有权限执行维护操作（见 `docs/operations/maintenance.md`）

## 完整代码

**缩小查询范围：**

```bash
FROM=$(($(date +%s%3N) - 86400000))
curl -s -X POST http://localhost:10588/api/logs/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"from\": $FROM,
    \"category\": \"ai_call\",
    \"level\": \"error\",
    \"limit\": 50,
    \"offset\": 0
  }" | jq '.data.total'
```

**优先用 traceId 精确查：**

```bash
curl -s "http://localhost:10588/api/logs/trace/$TRACE_ID" \
  -H "Authorization: Bearer $TOKEN"
```

**应用层降采样（减少写入）：**

```typescript
getObs().applyProfile("performance");
getObs().updateSwitches({
  retentionDays: 14,
  categories: { http: false },
});
```

**环境变量减少文件双写：**

```bash
LOG_FILE_ENABLED=0  # 仅 sqlite，需确认备份策略
```

**分页避免一次拉取过大：**

```typescript
let offset = 0;
const limit = 100;
while (true) {
  const { rows, total } = await queryLogs({ limit, offset, from: weekAgo });
  if (offset + limit >= total) break;
  offset += limit;
}
```

## 预期输出

优化后同类查询 P95 从数秒降至亚秒级（数据量与硬件相关）。

窄时间窗 + `traceId` 查询通常 < 200ms。

`aggregate` 限制 `days: 7` 比全表扫更快。

## FAQ

**Q1：keyword 搜索为何最慢？**  
FTS 在大表上成本高；尽量组合 `category`、`vendorId`、`from/to`。

**Q2：能否换 PostgreSQL？**  
当前 `@toonflow/observability` 提供 `createSqliteSink`；外部库需自定义 sink 或 ETL 到分析库。
