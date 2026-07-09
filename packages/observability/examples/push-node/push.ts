import { createPushClient } from "@toonflow/observability";

async function main() {
  const push = createPushClient({
    endpoint: process.env.TOONFLOW_LOG_INGEST || "http://localhost:10588/api/logs/ingest",
    getToken: () => process.env.TOONFLOW_TOKEN || "",
  });

  await push.ingest({
    level: "error",
    category: "system",
    message: "demo from node push client",
    traceId: "demo-node-push",
  });

  console.log("pushed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
