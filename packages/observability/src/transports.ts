import fs from "node:fs";
import path from "node:path";
import type { LogEvent } from "./types";

export function createStdoutSink(enabled = true) {
  if (!enabled) return async () => {};
  return async (event: LogEvent) => {
    const line = JSON.stringify(event);
    if (event.level === "error" || event.level === "fatal") console.error(line);
    else console.log(line);
  };
}

export function createFileSink(logDir: string, enabled = true) {
  if (!enabled) return async () => {};
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

  const writeLine = (line: string) => {
    const day = new Date().toISOString().slice(0, 10);
    const file = path.join(logDir, `${day}.jsonl`);
    fs.appendFile(file, line + "\n", () => {});
  };

  return async (event: LogEvent) => {
    writeLine(JSON.stringify(event));
  };
}

export type SqliteWriter = (event: LogEvent) => Promise<void>;

export function createSqliteSink(writer: SqliteWriter | null, enabled = true) {
  if (!enabled || !writer) return async () => {};
  return writer;
}
