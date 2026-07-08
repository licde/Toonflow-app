export function reportError(err: unknown, meta?: { module?: string; traceId?: string }) {
  const payload = {
    level: "error",
    category: "client",
    message: err instanceof Error ? err.message : String(err),
    traceId: meta?.traceId,
    module: meta?.module || "browser",
    ts: Date.now(),
  };
  if (typeof window !== "undefined" && (window as any).__toonflowReportError) {
    (window as any).__toonflowReportError(payload);
    return;
  }
  console.error("[observability-browser]", payload);
}

export function setReportHandler(fn: (payload: Record<string, unknown>) => void) {
  if (typeof window !== "undefined") (window as any).__toonflowReportError = fn;
}
