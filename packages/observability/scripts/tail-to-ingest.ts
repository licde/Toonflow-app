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
