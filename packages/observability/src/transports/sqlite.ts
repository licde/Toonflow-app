import type { LogEvent } from "../types";

export type SqliteWriter = (event: LogEvent) => Promise<void>;

export function createSqliteSink(writer: SqliteWriter | null, enabled = true) {
  if (!enabled || !writer) return async () => {};
  return writer;
}
