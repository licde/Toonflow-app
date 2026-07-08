import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import type { Observability } from "./observability";

export function traceMiddleware(obs: Observability) {
  return (req: Request, res: Response, next: NextFunction) => {
    const incoming = (req.headers["x-trace-id"] as string) || (req.headers.traceparent as string)?.split("-")[1];
    const traceId = incoming || randomUUID();
    res.setHeader("X-Trace-Id", traceId);
    const start = Date.now();
    obs.runWithContext({ traceId, module: "http" }, () => {
      res.on("finish", () => {
        const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
        void obs.log({
          level,
          category: "http",
          message: `${req.method} ${req.path} ${res.statusCode}`,
          traceId,
          payload: { method: req.method, path: req.path, status: res.statusCode, latencyMs: Date.now() - start },
        });
      });
      next();
    });
  };
}

export function errorHandler(obs: Observability) {
  return (err: any, _req: Request, res: Response, _next: NextFunction) => {
    const traceId = obs.getTraceId() || randomUUID();
    void obs.log({
      level: "error",
      category: "system",
      message: err?.message || "Internal error",
      traceId,
      payload: { stack: String(err?.stack || "").slice(0, 2000) },
    });
    res.status(err?.status || 500).json({ message: err?.message || "服务器错误", traceId });
  };
}
