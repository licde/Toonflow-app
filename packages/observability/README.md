# 5 分钟接入

```typescript
import { createObservability, traceMiddleware, createStdoutSink, createFileSink } from "@toonflow/observability";

const obs = createObservability({ appId: "my-app", logDir: "./logs" });
obs.registerSink(createStdoutSink());
obs.registerSink(createFileSink("./logs"));
app.use(traceMiddleware(obs));
```

Toonflow 宿主已自动 `import "@/observability/bootstrap"`。

文档 SSOT：`packages/observability/docs/`。
