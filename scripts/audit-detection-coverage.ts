/**
 * Detection registry coverage — handler + runtime hook wiring
 * yarn audit:detection-coverage [--strict]
 */
import fs from "fs";
import path from "path";
import { readFixtureJson } from "../src/ruleEngine/utils/fixturesPath";

const ROOT = process.cwd();
const STRICT = process.argv.includes("--strict");

interface RegistryEntry {
  id: string;
  level: string;
  severity: string;
  tier: string[];
  handler: string;
  runtimeHooks: string[];
  implemented: boolean;
  stage: string[];
}

function exists(rel: string): boolean {
  return fs.existsSync(path.join(ROOT, rel));
}

function fileHas(rel: string, needle: string): boolean {
  if (!exists(rel)) return false;
  return fs.readFileSync(path.join(ROOT, rel), "utf-8").includes(needle);
}

const HANDLER_FILES: Record<string, string[]> = {
  generationApplyAudit: ["src/ruleEngine/bundle/generationApplyAudit.ts"],
  retentionAudit: ["src/ruleEngine/bundle/retentionAudit.ts"],
  narrativeDriveAudit: ["src/ruleEngine/bundle/narrativeDriveAudit.ts"],
  modalityChainAudit: ["src/ruleEngine/bundle/modalityChainAudit.ts"],
  prValidator: ["src/ruleEngine/validators/prValidator.ts"],
  "prValidator.checkDialogueDuration": ["src/ruleEngine/validators/prValidator.ts"],
  "prValidator.checkHighEmotionDuration": ["src/ruleEngine/validators/prValidator.ts"],
  "prValidator.checkDialogueHasCharacter": ["src/ruleEngine/validators/prValidator.ts"],
  productionClosureDryRun: ["src/ruleEngine/bundle/productionClosureDryRun.ts"],
  designClosureDryRun: ["src/ruleEngine/bundle/designClosureDryRun.ts"],
  closureRegistry: ["src/ruleEngine/closure/registerHandlers.ts", "src/ruleEngine/closure/ClosureRegistry.ts"],
};

const HOOK_FILES: Record<string, string> = {
  preflightProduction: "src/routes/ruleEngine/preflightProduction.ts",
  inspectBundle: "src/routes/ruleEngine/inspectBundle.ts",
  dryRunImport: "src/routes/ruleEngine/dryRunImport.ts",
  batchGenerateVideo: "src/routes/production/workbench/batchGenerateVideo.ts",
  batchGenerateImage: "src/routes/production/storyboard/batchGenerateImage.ts",
  pollingImage: "src/routes/production/storyboard/pollingImage.ts",
  checkVideoStateList: "src/routes/production/workbench/checkVideoStateList.ts",
  generationFeedback: "src/routes/ruleEngine/generationFeedback.ts",
};

function handlerOk(handler: string): boolean {
  const files = HANDLER_FILES[handler] ?? HANDLER_FILES[handler.split(".")[0]];
  if (!files) return ["productionClosureDryRun", "designClosureDryRun", "closureRegistry"].includes(handler);
  return files.some((f) => exists(f) && (handler.includes(".") ? fileHas(f, handler.split(".")[1] ?? "") : true));
}

function hookOk(hook: string, entry: RegistryEntry): boolean {
  const file = HOOK_FILES[hook];
  if (!file) return !entry.implemented;
  if (!exists(file)) return false;
  if (hook === "preflightProduction") return fileHas(file, "runProductionPreflight");
  if (hook === "batchGenerateVideo") return fileHas(file, "runPreflightGate");
  if (hook === "batchGenerateImage") return fileHas(file, "runPreflightGate");
  return true;
}

function main() {
  let entries: RegistryEntry[] = [];
  try {
    const registry = readFixtureJson<{ entries: RegistryEntry[] }>("closure_detection_registry.json", { entries: [] });
    entries = registry.entries ?? [];
  } catch {
    console.error("Missing closure_detection_registry.json — run yarn generate:detection-registry");
    process.exit(1);
  }
  if (!entries.length) {
    console.error("Registry empty — run yarn generate:detection-registry");
    process.exit(1);
  }

  const issues: { id: string; kind: string; detail: string }[] = [];
  let implemented = 0;
  let t3BlockTotal = 0;
  let t3BlockImplemented = 0;

  for (const e of entries) {
    const isT3Block = e.tier.includes("T3") && e.severity === "BLOCK";
    if (isT3Block) t3BlockTotal++;
    if (e.implemented) implemented++;

    if (e.implemented && !handlerOk(e.handler)) {
      issues.push({ id: e.id, kind: "handler", detail: `missing handler ${e.handler}` });
    }

    const needsRuntime = e.implemented && e.stage.some((s) => s === "preflight" || s === "pre-generate" || s === "post-generate");
    if (needsRuntime) {
      for (const hook of e.runtimeHooks) {
        if (!hookOk(hook, e)) {
          issues.push({ id: e.id, kind: "hook", detail: `missing runtime hook ${hook}` });
        }
      }
    }

    if (isT3Block && e.implemented) t3BlockImplemented++;
    if (STRICT && isT3Block && !e.implemented) {
      issues.push({ id: e.id, kind: "unimplemented", detail: "T3 BLOCK not implemented" });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    total: entries.length,
    implemented,
    t3BlockTotal,
    t3BlockImplemented,
    coveragePct: entries.length ? Math.round((implemented / entries.length) * 100) : 100,
    t3BlockPct: t3BlockTotal ? Math.round((t3BlockImplemented / t3BlockTotal) * 100) : 100,
    issues,
  };

  const outPath = path.join(ROOT, "reports/detection_coverage.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log("=== Detection Coverage ===\n");
  console.log(`Entries: ${report.total} | implemented: ${implemented} (${report.coveragePct}%)`);
  console.log(`T3 BLOCK: ${t3BlockImplemented}/${t3BlockTotal} (${report.t3BlockPct}%)`);
  console.log(`Report: ${outPath}`);

  if (issues.length) {
    console.error(`\n${issues.length} issue(s):`);
    for (const i of issues.slice(0, 20)) {
      console.error(`  [${i.id}] ${i.kind}: ${i.detail}`);
    }
    if (issues.length > 20) console.error(`  ... +${issues.length - 20} more`);
    const hookOrHandler = issues.some((i) => i.kind === "handler" || i.kind === "hook");
    if (hookOrHandler || STRICT) process.exit(1);
  }
  console.log("\n=== detection-coverage OK ===");
}

main();
