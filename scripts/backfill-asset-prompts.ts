#!/usr/bin/env tsx
/**
 * 对项目资产生图 prompt 执行 buildFinalAssetImagePrompt 回填（尤其 T1 去除四视图词）
 */
import u from "../src/utils";
import { parseLockCode } from "../src/lib/dramaPack/schema";
import { detectAssetTier } from "../src/lib/dramaPack/assetTierUtils";
import { buildFinalAssetImagePrompt } from "../src/lib/dramaPack/assetImagePromptBuilder";
import { loadProjectPackContext } from "../src/lib/dramaPack/loadProjectPackContext";

async function main() {
  const projectId = Number(process.argv[2]);
  if (!projectId) {
    console.error("用法: npx tsx scripts/backfill-asset-prompts.ts <projectId>");
    process.exit(1);
  }

  const packCtx = await loadProjectPackContext(projectId);
  const rows = await u
    .db("o_assets")
    .where({ projectId })
    .whereIn("type", ["role", "scene", "tool"])
    .select("id", "name", "type", "remark", "prompt", "promptSource", "assetsId");

  let updated = 0;
  const details: string[] = [];

  for (const row of rows) {
    const code = parseLockCode(row.remark ?? "");
    const tier = detectAssetTier(row.remark, row.assetsId);
    const assetType = row.type === "scene" ? "scene" : row.type === "tool" ? "tool" : "role";
    const before = (row.prompt || "").trim();
    const after = buildFinalAssetImagePrompt({
      type: assetType,
      dbPrompt: before,
      remark: row.remark,
      assetsId: row.assetsId,
      productionSpec: packCtx.productionSpec,
      tier,
      extensions: packCtx.extensions,
    });
    if (after === before) continue;
    await u.db("o_assets").where("id", row.id).update({
      prompt: after,
      promptState: "已完成",
      promptSource: row.promptSource === "manual" ? "manual" : "import",
    });
    updated++;
    details.push(`${code || row.name} [${tier}]: ${before.slice(0, 60)} → ${after.slice(0, 80)}`);
  }

  console.log(JSON.stringify({ projectId, total: rows.length, updated, details }, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
