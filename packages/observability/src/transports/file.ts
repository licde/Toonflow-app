import fs from "node:fs";
import path from "node:path";
import type { LogEvent } from "../types";

export function createFileSink(logDir: string, enabled = true) {
  if (!enabled) return async () => {};
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

  const writeLine = (line: string) => {
    const day = new Date().toISOString().slice(0, 10);
    const file = path.join(logDir, `${day}.jsonl`);
    fs.appendFile(file, line + "\n", { encoding: "utf8" }, () => {});
  };

  return async (event: LogEvent) => {
    writeLine(JSON.stringify(event));
  };
}
