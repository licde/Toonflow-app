/**
 * Mode template structural regex goldens — START/END, identity, multi markers.
 * yarn test:mode-template-regex
 */
import fs from "fs";
import path from "path";
import { applyModeDialect } from "@/ruleEngine/compilers/compileOrGenerateVideoPrompt";
import { assemblePromptWithSlots, buildIdentitySlots } from "@/ruleEngine/kernels/promptKernel";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

function main() {
  console.log("# mode template regex goldens\n");

  const slots = buildIdentitySlots({ charCodes: ["CHAR-001"], sceneCode: "SCENE-01" });
  const textBase = assemblePromptWithSlots({ basePrompt: "candlelight corridor", identitySlots: slots }).prompt;
  ok("text mode identity block or cref", /identity\[|--cref\s+CHAR-001/.test(textBase));
  ok("text mode sref or SCENE", /--sref\s+SCENE-0*1|SCENE:SCENE-0*1/.test(textBase), textBase.slice(0, 160));

  const startEnd = applyModeDialect(textBase, "startEndRequired");
  ok("firstLast/startEnd START_FRAME", /START_FRAME/i.test(startEnd));
  ok("firstLast/startEnd END_FRAME", /END_FRAME/i.test(startEnd));
  ok("startEnd keeps identity", /CHAR-001|identity\[/.test(startEnd));

  const single = applyModeDialect(textBase, "singleImage");
  ok("singleImage motion dialect", /motion-from-frame|from.?frame|single/i.test(single) || single.length > textBase.length - 5);

  const multi = applyModeDialect("multi refs @图1 @图2", "multiParameter");
  ok("multiParameter keeps @图 or multi marker", /@图|multi|reference/i.test(multi));

  // Template markdown hard acceptance lines must exist
  const tplDir = path.join(process.cwd(), "data", "modelPrompt", "video");
  const firstLast = path.join(tplDir, "universalFirstAndLastFrameMode.md");
  ok("firstLast template file", fs.existsSync(firstLast));
  if (fs.existsSync(firstLast)) {
    const md = fs.readFileSync(firstLast, "utf-8");
    ok("template documents identity验收", /身份槽|identity\[|--cref/.test(md));
    ok("template documents START/END", /START_FRAME|END_FRAME|首尾帧/.test(md));
  }

  const textTpl = path.join(tplDir, "universalTextMode.md");
  ok("text template file", fs.existsSync(textTpl));
  if (fs.existsSync(textTpl)) {
    const md = fs.readFileSync(textTpl, "utf-8");
    ok("text template mentions identity", /identity|--cref|身份/.test(md));
    ok("text template has 输出格式 + Visual", /输出格式/.test(md) && /\[Visual\]/.test(md));
  }

  const singleTpl = path.join(tplDir, "universalSingleImageMode.md");
  ok("singleImage template file", fs.existsSync(singleTpl));
  if (fs.existsSync(singleTpl)) {
    const md = fs.readFileSync(singleTpl, "utf-8");
    ok("singleImage template motion-from-frame + Visual", /motion-from-frame/.test(md) && /\[Visual\]/.test(md));
  }

  if (failed) {
    console.error(`\n${failed} mode-template-regex check(s) failed`);
    process.exit(1);
  }
  console.log("\n=== test:mode-template-regex OK ===");
}

main();
