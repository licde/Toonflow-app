# Sidecar：Tail JSONL 批量注入

旁路进程监听本地 JSONL 日志文件，批量推送到 Toonflow `ingest/batch` 接口。

## 适用场景

- 遗留服务只写文件、无法改代码嵌入 SDK
- 多实例各自写 `logs/*.jsonl`，需汇聚到中央 Toonflow
- 网络抖动时希望批量（默认 20 条）flush，降低 HTTP 开销

## 前置条件

- 源日志为每行一个 JSON 对象（与 `createFileSink` 输出格式兼容）
- 已设置 `TOONFLOW_TOKEN`（JWT）
- 可选：`TOONFLOW_LOG_INGEST_BATCH` 指向自定义 batch 端点

## 完整代码

使用仓库脚本 `packages/observability/scripts/tail-to-ingest.ts`：

```typescript
#!/usr/bin/env tsx
/**
 * Sidecar：tail JSONL 日志文件并 batch 推送到 Toonflow ingest
 * Usage: TOONFLOW_TOKEN=xxx tsx scripts/tail-to-ingest.ts ./logs/2026-07-09.jsonl
 */
import fs from "node:fs";
import readline from "node:readline";

const file = process.argv[2];
const endpoint = process.env.TOONFLOW_LOG_INGEST_BATCH || "http://localhost:10588/api/logs/ingest/batch";
const token = process.env.TOONFLOW_TOKEN;
if (!file || !token) {
  console.error("Usage: TOONFLOW_TOKEN=... tsx tail-to-ingest.ts <jsonl-file>");
  process.exit(1);
}

const batch: unknown[] = [];
const flush = async () => {
  if (!batch.length) return;
  const events = batch.splice(0, batch.length);
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ events }),
  });
  if (!res.ok) console.error("ingest failed", res.status, await res.text());
};

const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: "utf8" }) });
rl.on("line", (line) => {
  try {
    const obj = JSON.parse(line);
    batch.push({
      level: obj.level || "info",
      category: obj.category || "system",
      message: obj.message || line.slice(0, 500),
      traceId: obj.traceId,
      vendorId: obj.vendorId,
      payload: obj.payload,
    });
    if (batch.length >= 20) void flush();
  } catch {
    batch.push({ level: "info", category: "system", message: line.slice(0, 500) });
  }
});
rl.on("close", () => void flush().then(() => console.log("done")));
```

运行（从 monorepo 根目录）：

```bash
# 先生成 JSONL（启动 Toonflow 或 express-minimal 示例）
export TOONFLOW_TOKEN="<jwt>"

# Windows PowerShell
$env:TOONFLOW_TOKEN="<jwt>"
npx tsx packages/observability/scripts/tail-to-ingest.ts data/logs/2026-07-09.jsonl

# Linux/macOS
TOONFLOW_TOKEN=<jwt> npx tsx packages/observability/scripts/tail-to-ingest.ts ./logs/2026-07-09.jsonl
```

持续 tail 可用 `tail -F` 配合定时脚本，或改为 `fs.watch` 增量读取（cookbook 高阶场景）。

## 预期输出

**成功时终端：**

```
done
```

**batch 请求体结构：**

```json
{
  "events": [
    { "level": "info", "category": "http", "message": "GET /api/health 200", "traceId": "..." }
  ]
}
```

**API 响应**（典型）：`{"code":200,"data":{"accepted":20,"skipped":0},"message":"成功"}`

非 JSON 行会被降级为 `category: "system"`、`message` 为截断原文。

## FAQ

**Q1：与单条 `POST /api/logs/ingest` 有何区别？**  
Batch 减少 RTT，适合历史文件回放；实时单条适合 Python/Go 即时上报。二者最终都进入同一 SQLite/查询索引。

**Q2：ingest failed 400/422？**  
某条 `category` 或 `level` 不合法会导致整批或部分拒绝，见 `troubleshooting/07-ingest-rejected.md`。Sidecar 映射时已兜底 `level`/`category`，但 `message` 不能为空字符串。
