import express from "express";
import { createObservability, traceMiddleware } from "@toonflow/observability";
import { createStdoutSink, createFileSink } from "@toonflow/observability";
import path from "node:path";
import os from "node:os";

const app = express();
const logDir = path.join(os.tmpdir(), "toonflow-obs-example");
const obs = createObservability({ appId: "express-minimal", logDir });
obs.registerSink(createStdoutSink());
obs.registerSink(createFileSink(logDir));
app.use(traceMiddleware(obs));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(0, () => {
  console.log("express-minimal example running");
});
