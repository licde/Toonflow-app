export interface BrowserReporterOptions {
  ingestUrl: string;
  getToken: () => string | Promise<string>;
  appModule?: string;
  batchEndpoint?: string;
}

export interface ClientLogEvent {
  level: "error" | "warn" | "info";
  category: "client";
  message: string;
  traceId?: string;
  module?: string;
  payload?: Record<string, unknown>;
  ts?: number;
}

let globalReporter: ((event: ClientLogEvent) => void | Promise<void>) | null = null;

export function setReportHandler(fn: (payload: ClientLogEvent) => void | Promise<void>) {
  globalReporter = fn;
}

export function createBrowserReporter(opts: BrowserReporterOptions) {
  const endpoint = opts.batchEndpoint || opts.ingestUrl.replace(/\/$/, "");
  const ingestOne = async (event: ClientLogEvent) => {
    const token = await opts.getToken();
    await fetch(opts.ingestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.replace(/^Bearer\s+/i, "")}`,
      },
      body: JSON.stringify({
        ...event,
        category: "client",
        module: event.module || opts.appModule || "browser",
        ts: event.ts ?? Date.now(),
      }),
    });
  };
  const reporter = async (event: ClientLogEvent) => {
    try {
      await ingestOne(event);
    } catch (e) {
      console.error("[observability-browser] ingest failed", e);
    }
  };
  setReportHandler(reporter);
  return { report: reporter, ingestBatch: ingestBatch.bind(null, endpoint, opts) };
}

async function ingestBatch(endpoint: string, opts: BrowserReporterOptions, events: ClientLogEvent[]) {
  const token = await opts.getToken();
  const batchUrl = endpoint.includes("/batch") ? endpoint : endpoint.replace(/\/ingest$/, "/ingest/batch");
  await fetch(batchUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token.replace(/^Bearer\s+/i, "")}`,
    },
    body: JSON.stringify({ events }),
  });
}

export function reportError(err: unknown, meta?: { module?: string; traceId?: string }) {
  const payload: ClientLogEvent = {
    level: "error",
    category: "client",
    message: err instanceof Error ? err.message : String(err),
    traceId: meta?.traceId || getLastTraceId(),
    module: meta?.module || "browser",
    payload: err instanceof Error ? { stack: String(err.stack || "").slice(0, 2000) } : undefined,
    ts: Date.now(),
  };
  if (globalReporter) {
    void globalReporter(payload);
    return;
  }
  if (typeof window !== "undefined" && (window as any).__toonflowReportError) {
    (window as any).__toonflowReportError(payload);
    return;
  }
  console.error("[observability-browser]", payload);
}

const TRACE_KEY = "toonflow_last_trace_id";

export function getLastTraceId(): string | undefined {
  if (typeof sessionStorage === "undefined") return undefined;
  return sessionStorage.getItem(TRACE_KEY) || undefined;
}

export function setLastTraceId(traceId: string) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(TRACE_KEY, traceId);
}

/** 适用于 axios：响应成功/失败时保存 X-Trace-Id */
export function axiosTraceInterceptor() {
  return {
    onFulfilled: (res: { headers?: Record<string, string> }) => {
      const id = res.headers?.["x-trace-id"] || res.headers?.["X-Trace-Id"];
      if (id) setLastTraceId(id);
      return res;
    },
    onRejected: (err: any) => {
      const id = err?.response?.headers?.["x-trace-id"];
      if (id) setLastTraceId(id);
      reportError(err, { traceId: id, module: "axios" });
      return Promise.reject(err);
    },
  };
}

export function installGlobalErrorHandlers(module = "browser") {
  if (typeof window === "undefined") return;
  window.addEventListener("error", (e) => reportError(e.error || e.message, { module }));
  window.addEventListener("unhandledrejection", (e) => reportError(e.reason, { module }));
}
