/**
 * yarn test:polish-assets-text
 * Source + unit: polish must read invoke().text not only _output.
 */
import fs from "fs";
import path from "path";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const single = fs.readFileSync(path.join(process.cwd(), "src/routes/assetsGenerate/polishAssetsPrompt.ts"), "utf-8");
const batch = fs.readFileSync(path.join(process.cwd(), "src/routes/assetsGenerate/batchPolishAssetsPrompt.ts"), "utf-8");

ok("single uses text extract", /r\?\.text\s*\?\?/.test(single) || /extractPolishText/.test(single));
ok("batch uses text extract", /r\?\.text\s*\?\?/.test(batch) || /extractPolishText/.test(batch));
ok("single rejects stub describe", /STUB_DESCRIBE|describe_empty_or_stub/.test(single));
ok("single terminal 生成失败", /生成失败/.test(single));
ok("no sole destructure _output without text", !/const\s*\{\s*_output\s*\}\s*=/.test(single));
ok("batch no sole _output destructure", !/const\s*\{\s*_output\s*\}\s*=/.test(batch));

if (failed) process.exit(1);
console.log("\n=== test:polish-assets-text OK ===");
