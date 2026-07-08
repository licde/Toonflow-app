import type { LogEvent } from "../types";

export interface ExternalTransportOptions {
  endpoint: string;
  headers?: Record<string, string>;
  batchSize?: number;
  timeoutMs?: number;
}

/** OTLP/Loki 兼容占位：失败时由宿主降级到 file */
export function createExternalSink(opts: ExternalTransportOptions, enabled = true) {
  if (!enabled) return async () => {};
  const buffer: LogEvent[] = [];
  return async (event: LogEvent) => {
    buffer.push(event);
    if (buffer.length < (opts.batchSize ?? 20)) return;
    const batch = buffer.splice(0, buffer.length);
    try {
      await fetch(opts.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...opts.headers },
        body: JSON.stringify({ events: batch }),
        signal: AbortSignal.timeout(opts.timeoutMs ?? 5000),
      });
    } catch (e) {
      console.warn("[observability external transport failed]", e);
      throw e;
    }
  };
}
