import { lintStillPromptBody } from "../src/ruleEngine/compilers/stillPromptLint";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error("FAIL", name, detail ?? "");
    process.exit(1);
  }
  console.log("ok", name);
}

{
  const res = lintStillPromptBody({
    prompt:
      "特写。沈清漪侧脸。正脸朝向镜头。禁口含；禁纸入口；仅颊触非口含。禁口含；禁纸入口；仅颊触非口含。不可读则拆持物镜+反应镜。",
    visualDescription: "特写。沈清漪侧脸，纸角划过面颊。",
  });
  ok("drop face conflict", !/正脸朝向镜头/.test(res.prompt), res.prompt);
  ok("drop flow strategy", !/拆持物镜/.test(res.prompt), res.prompt);
  ok("compress duplicate bans", (res.prompt.match(/禁口含/g) ?? []).length <= 1, res.prompt);
}

console.log("test-g-prompt-conflict-lint passed");
