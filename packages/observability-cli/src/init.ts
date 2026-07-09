#!/usr/bin/env tsx
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const preset = (args.find((a) => a.startsWith("--preset="))?.split("=")[1] ||
  args[args.indexOf("--preset") + 1] ||
  "express") as string;
const smart = args.includes("--smart");
const cwd = process.cwd();

const pkgRoot = path.resolve(__dirname, "../..");
const exampleConfig = path.join(pkgRoot, "observability", "observability.config.example.json");

const configTarget = path.join(cwd, "observability.config.json");
if (!fs.existsSync(configTarget)) {
  const base = JSON.parse(fs.readFileSync(exampleConfig, "utf8"));
  base.appId = path.basename(cwd);
  base.profile = smart ? "balanced" : base.profile;
  if (preset === "docker") base.switches.transports = { stdout: true, file: false, sqlite: false };
  if (preset === "electron") base.logDir = "./logs";
  fs.writeFileSync(configTarget, JSON.stringify(base, null, 2));
  console.log("Created observability.config.json");
} else {
  console.log("observability.config.json already exists");
}

const bootstrapTarget = path.join(cwd, "observability.bootstrap.ts");
if (!fs.existsSync(bootstrapTarget)) {
  const tpl = `import {
  createFromConfigFile,
  createStdoutSink,
  createFileSink,
  traceMiddleware,
  errorHandler,
} from "@toonflow/observability";

const obs = createFromConfigFile({ appId: "${path.basename(cwd)}" });
obs.registerSink(createStdoutSink());
obs.registerSink(createFileSink(obs.logDir || "./logs"));

export { obs, traceMiddleware: () => traceMiddleware(obs), errorHandler: () => errorHandler(obs) };
`;
  fs.writeFileSync(bootstrapTarget, tpl);
  console.log("Created observability.bootstrap.ts");
}

const envTarget = path.join(cwd, ".env.observability.example");
if (!fs.existsSync(envTarget)) {
  fs.writeFileSync(
    envTarget,
    `# Observability
OBS_ENABLED=1
OBS_PROFILE=balanced
LOG_STDOUT=1
LOG_FILE_ENABLED=1
# Push to remote Toonflow (optional)
# TOONFLOW_LOG_INGEST=http://localhost:10588/api/logs/ingest
# TOONFLOW_TOKEN=your-jwt
`,
  );
  console.log("Created .env.observability.example");
}

console.log(`Done. preset=${preset} smart=${smart}`);
