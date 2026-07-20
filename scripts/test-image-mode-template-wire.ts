/**
 * yarn test:image-mode-template-wire
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

const batch = fs.readFileSync(path.join(process.cwd(), "src/routes/production/storyboard/batchGenerateImage.ts"), "utf-8");
const flow = fs.readFileSync(path.join(process.cwd(), "src/routes/production/editImage/generateFlowImageCore.ts"), "utf-8");

ok("batch loads image mode template", /loadModePromptTemplate/.test(batch));
ok("batch resolves image mode rules", /resolveGenerationModeRules/.test(batch));
ok("flowImage requireParentRef not default-true", /requireParentRef\s*=\s*true/.test(flow) === false || /requireParentRef === true/.test(flow));
ok("flowImage gates on minRefs", /minRefs/.test(flow) && /requireParentRef === true/.test(flow));

const textMode = path.join(process.cwd(), "data/modelPrompt/image/universalTextMode.md");
ok("universalTextMode.md exists", fs.existsSync(textMode));

if (failed) process.exit(1);
console.log("\n=== test:image-mode-template-wire OK ===");
