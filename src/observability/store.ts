import type { Knex } from "knex";
import type { LogEvent } from "@toonflow/observability";
import { createSqliteSink } from "@toonflow/observability";

let knexRef: Knex | null = null;
let ftsReady = false;

export async function initLogStore(knex: Knex) {
  knexRef = knex;
  try {
    await knex.raw("PRAGMA journal_mode=WAL");
  } catch {}
  if (!(await knex.schema.hasTable("o_log_events"))) return;
  if (!(await knex.schema.hasTable("o_log_events_fts"))) {
    await knex.raw(
      `CREATE VIRTUAL TABLE IF NOT EXISTS o_log_events_fts USING fts5(message, payload, content='o_log_events', content_rowid='id')`,
    );
    ftsReady = true;
  } else {
    ftsReady = true;
  }
}

export function createDbSink() {
  return createSqliteSink(async (event: LogEvent) => {
    if (!knexRef) return;
    const [id] = await knexRef("o_log_events").insert({
      ts: event.ts,
      level: event.level,
      category: event.category,
      traceId: event.traceId || "",
      appId: event.appId,
      module: event.module || null,
      projectId: event.projectId ?? null,
      vendorId: event.vendorId || null,
      model: event.model || null,
      message: event.message,
      errorFingerprint: event.errorFingerprint || null,
      payload: event.payload ? JSON.stringify(event.payload) : null,
      taskId: event.taskId ?? null,
      entityRefs: event.entityRefs ? JSON.stringify(event.entityRefs) : null,
    });
    if (ftsReady && id) {
      try {
        await knexRef.raw(`INSERT INTO o_log_events_fts(rowid, message, payload) VALUES (?, ?, ?)`, [
          id,
          event.message,
          event.payload ? JSON.stringify(event.payload) : "",
        ]);
      } catch {}
    }
  }, true);
}

export function getKnex() {
  return knexRef;
}

export interface LogQuery {
  level?: string;
  category?: string;
  vendorId?: string;
  model?: string;
  traceId?: string;
  projectId?: number;
  keyword?: string;
  from?: number;
  to?: number;
  limit?: number;
  offset?: number;
}

export async function queryLogs(q: LogQuery) {
  if (!knexRef) return { rows: [], total: 0 };
  const limit = Math.min(q.limit ?? 50, 200);
  const offset = q.offset ?? 0;
  let qb = knexRef("o_log_events").orderBy("ts", "desc");
  if (q.level) qb = qb.where("level", q.level);
  if (q.category) qb = qb.where("category", q.category);
  if (q.vendorId) qb = qb.where("vendorId", q.vendorId);
  if (q.model) qb = qb.where("model", q.model);
  if (q.traceId) qb = qb.where("traceId", q.traceId);
  if (q.projectId) qb = qb.where("projectId", q.projectId);
  if (q.from) qb = qb.where("ts", ">=", q.from);
  if (q.to) qb = qb.where("ts", "<=", q.to);
  if (q.keyword && ftsReady) {
    const ids = await knexRef.raw(`SELECT rowid FROM o_log_events_fts WHERE o_log_events_fts MATCH ? LIMIT 500`, [
      q.keyword.replace(/"/g, ""),
    ]);
    const rowids = (ids as any[]).map((r: any) => r.rowid);
    if (!rowids.length) return { rows: [], total: 0 };
    qb = qb.whereIn("id", rowids);
  }
  const totalRow = await knexRef("o_log_events").count("* as c").first();
  const rows = await qb.limit(limit).offset(offset);
  return { rows, total: Number((totalRow as any)?.c || 0) };
}

export async function getTraceEvents(traceId: string) {
  if (!knexRef) return [];
  return knexRef("o_log_events").where("traceId", traceId).orderBy("ts", "asc");
}

export async function getIncidents(limit = 50) {
  if (!knexRef) return { errors: [], tasks: [] };
  const errors = await knexRef("o_log_events").whereIn("level", ["error", "fatal"]).orderBy("ts", "desc").limit(limit);
  const tasks = await knexRef("o_tasks").where("state", "生成失败").orderBy("startTime", "desc").limit(limit);
  return { errors, tasks };
}

export async function purgeProjectLogs(projectId: number) {
  if (!knexRef) return 0;
  return knexRef("o_log_events").where("projectId", projectId).delete();
}
