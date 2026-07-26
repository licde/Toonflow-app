/**
 * yarn test:asset-still-prompt-contract
 */
import {
  buildAssetStillPrompt,
  resolveAssetStillAspect,
  resolveAssetDerivativeAspect,
  shouldBlockAssetStillGen,
  promptAlreadySheetShaped,
  isWeakAssetPrompt,
} from "@/ruleEngine/bundle/assetStillPrompt";
import { touchPromptForVendor } from "@/ruleEngine/compilers/vendorPromptAdapter";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

ok("role default (identity_plate) aspect 3:1", resolveAssetStillAspect("role") === "3:1");
ok("role identity aspect 3:1", resolveAssetStillAspect("role", "identity_plate") === "3:1");
ok("role sheet aspect 4:1", resolveAssetStillAspect("role", "turnaround_sheet") === "4:1");
ok("tool aspect 1:1", resolveAssetStillAspect("tool") === "1:1");
ok("scene aspect 16:9", resolveAssetStillAspect("scene") === "16:9");

ok("derive role aspect 16:9 (not sheet 4:1)", resolveAssetDerivativeAspect("role") === "16:9");
ok("derive scene aspect 16:9", resolveAssetDerivativeAspect("scene") === "16:9");
ok("derive tool aspect 1:1", resolveAssetDerivativeAspect("tool") === "1:1");
ok(
  "still vs derive role aspects diverge",
  resolveAssetStillAspect("role") === "3:1" && resolveAssetDerivativeAspect("role") === "16:9",
);

const defaultPrompt = buildAssetStillPrompt("role", "水墨", "沈清辞", "黑发白衣少女，全身正面");
ok("default wrap uses 身份板 (storyboard cref)", /身份板|cref|单人全身/.test(defaultPrompt));
ok("default not 四视图 title", !defaultPrompt.includes("角色标准四视图"));

const identityPrompt = buildAssetStillPrompt("role", "水墨", "沈清辞", "黑发白衣少女，全身正面", "identity_plate");
ok("identity mode uses 身份板", /身份板|cref|单人全身/.test(identityPrompt));

const sheetPrompt = buildAssetStillPrompt("role", "水墨", "沈清辞", "黑发白衣少女", "turnaround_sheet");
ok("sheet mode uses 四视图", sheetPrompt.includes("角色标准四视图"));

const already = "character turnaround, four panels, front side back";
ok("already sheet shaped", promptAlreadySheetShaped(already));
ok(
  "no double wrap for sheet-shaped sheet mode",
  buildAssetStillPrompt("role", "x", "n", already, "turnaround_sheet") === already.trim(),
);

ok(
  "weakPrompt alone does not hard-exclude",
  !shouldBlockAssetStillGen({
    remark: "assetCode:CHAR-X;weakPrompt:1",
    prompt: "黑发白衣少女，全身正面站姿，四视图设定",
    promptState: "已完成",
    name: "沈清瓷",
  }).block,
);
ok(
  "block batchExclude",
  shouldBlockAssetStillGen({ remark: "batchExclude:1", prompt: "长提示词内容足够", promptState: "已完成" }).block,
);
ok(
  "block weak without polish",
  shouldBlockAssetStillGen({ prompt: "沈清辞", name: "沈清辞", promptState: "未完成" }).block,
);
ok(
  "allow polished strong",
  !shouldBlockAssetStillGen({
    prompt: "黑发白衣少女，全身正面站姿，四视图",
    promptState: "已完成",
    name: "沈清辞",
  }).block,
);
ok(
  "tool name+short significance is weak",
  isWeakAssetPrompt("天命书，命运提示器", "天命书", "tool"),
);
ok(
  "tool rich prompt not weak",
  !isWeakAssetPrompt("天命书，叙事意义:命运提示器，材质:古玉简，形制:半透明篆文虚影", "天命书", "tool"),
);

// Regression: generateAssets must use vendorPrompt (not touched.prompt which is undefined)
const sample = "黑发白衣少女，全身正面站姿，四视图设定";
const touched = touchPromptForVendor(sample, undefined);
ok("touchPromptForVendor returns vendorPrompt", typeof touched.vendorPrompt === "string" && touched.vendorPrompt.length > 0);
ok(
  "TouchPromptResult has no prompt field",
  !("prompt" in touched) || (touched as { prompt?: unknown }).prompt === undefined,
);
const assigned = String(touched.vendorPrompt ?? sample ?? "").trim();
ok("generateAssets-style assignment is not literal undefined", assigned !== "undefined" && assigned.includes("黑发"));
const describe = `生成角色图，名称：沈母周氏，提示词：${assigned}`;
ok("task describe does not contain 提示词：undefined", !describe.includes("提示词：undefined"));

if (failed) {
  console.error(`\n${failed} FAILED`);
  process.exit(1);
}
console.log("\n=== test:asset-still-prompt-contract OK ===");
