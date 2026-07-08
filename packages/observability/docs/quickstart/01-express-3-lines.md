# Express 三行接入

```typescript
import { createObservability, traceMiddleware, createStdoutSink } from "@toonflow/observability";

const obs = createObservability({ appId: "my-app" });
obs.registerSink(createStdoutSink());
app.use(traceMiddleware(obs));
```

响应头将包含 `X-Trace-Id`。
