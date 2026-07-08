import type { LogEvent } from "../types";

export function createStdoutSink(enabled = true) {
  if (!enabled) return async () => {};
  return async (event: LogEvent) => {
    const line = JSON.stringify(event);
    if (event.level === "error" || event.level === "fatal") console.error(line);
    else console.log(line);
  };
}
