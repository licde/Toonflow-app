/**
 * Electron 渲染进程示例：通过 IPC 上报 client 错误
 */
export function reportToMain(err: unknown, meta?: { module?: string; traceId?: string }) {
  const w = globalThis as typeof globalThis & { obsReport?: (p: unknown) => void };
  w.obsReport?.({
    level: "error",
    category: "client",
    message: err instanceof Error ? err.message : String(err),
    module: meta?.module || "renderer",
    traceId: meta?.traceId,
  });
}

export function installRendererErrorHandlers() {
  if (typeof globalThis.addEventListener !== "function") return;
  globalThis.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => reportToMain(e.reason));
}
