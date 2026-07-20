/**
 * Smoke: prepareBundleRaw + Zod on golden fixtures and optional user upload.
 * yarn test:bundle-import-smoke
 */
import fs from "fs";
import path from "path";
import { prepareBundleWithLog, scriptBundleSchema } from "@/ruleEngine/bundle/schema";

function smokeFile(label: string, filePath: string): boolean {
  if (!fs.existsSync(filePath)) {
    console.warn(`SKIP ${label}: not found ${filePath}`);
    return true;
  }
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8")) as Record<string, unknown>;
  if (raw.bundleType !== "script" && !raw.script) {
    console.log(`SKIP ${label}: not a script bundle`);
    return true;
  }
  const prepared = prepareBundleWithLog(raw);
  const result = scriptBundleSchema.safeParse(prepared.bundle);
  if (!result.success) {
    console.error(`\nFAIL ${label}: ${filePath}`);
    for (const issue of result.error.issues) {
      console.error(`  path=${issue.path.join(".")} code=${issue.code} msg=${issue.message}`);
    }
    return false;
  }
  if (prepared.shapeSalvageLog.length) {
    console.log(`  ${label}: salvaged ${prepared.shapeSalvageLog.length} shape(s)`);
  }
  return true;
}

function main() {
  let ok = true;
  const goldenDir = path.join(process.cwd(), "data/fixtures/golden");
  if (fs.existsSync(goldenDir)) {
    for (const f of fs.readdirSync(goldenDir).filter((x) => x.endsWith(".json") && !x.endsWith(".expect.json"))) {
      if (!smokeFile(`golden/${f}`, path.join(goldenDir, f))) ok = false;
    }
  }

  const template = path.join(process.cwd(), "data/fixtures/script-bundle-template-v2.json");
  if (!smokeFile("template-v2", template)) ok = false;

  const userPaths = [
    path.join(process.cwd(), "uploads/c__Users_PC_Downloads_deepseek_json_20260714_ee549a__1_-L1-L1768-0.json"),
    path.join(process.cwd(), "uploads/Untitled-2-L1-L1768-0.txt"),
    "C:/Users/PC/.cursor/projects/i-toonflow-new-Toonflow-app/uploads/c__Users_PC_Downloads_deepseek_json_20260714_ee549a__1_-L1-L1768-0.json",
    "C:/Users/PC/.cursor/projects/i-toonflow-new-Toonflow-app/uploads/Untitled-2-L1-L1768-0.txt",
  ];
  for (const p of userPaths) {
    if (fs.existsSync(p)) {
      if (!smokeFile("user-deepseek", p)) ok = false;
      break;
    }
  }

  if (!ok) {
    console.error("\ntest:bundle-import-smoke FAIL");
    process.exit(1);
  }
  console.log("\ntest:bundle-import-smoke PASS");
}

main();
