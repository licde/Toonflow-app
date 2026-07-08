import type { Server, Namespace } from "socket.io";
import type { Observability } from "../observability";
import { randomUUID } from "node:crypto";

export function attachSocketObservability(io: Server, obs: Observability) {
  io.use((socket, next) => {
    const traceId = (socket.handshake.auth?.traceId as string) || (socket.handshake.headers["x-trace-id"] as string) || randomUUID();
    socket.data.traceId = traceId;
    obs.runWithContext({ traceId, module: "socket" }, () => next());
  });

  io.on("connection", (socket) => {
    const traceId = socket.data.traceId as string;
    void obs.log({ level: "info", category: "http", module: "socket", message: `connect ${socket.id}`, traceId });
    socket.on("disconnect", () => {
      void obs.log({ level: "info", category: "http", module: "socket", message: `disconnect ${socket.id}`, traceId });
    });
  });
}

export function wrapNamespace(nsp: Namespace, obs: Observability, name: string) {
  nsp.use((socket, next) => {
    const traceId = socket.data.traceId || randomUUID();
    obs.runWithContext({ traceId, module: `socket:${name}` }, () => next());
  });
}
