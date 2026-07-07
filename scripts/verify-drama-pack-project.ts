#!/usr/bin/env tsx
/**
 * 项目一次性验收：audit + bundle 检查 + 人工清单
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

async function main() {
  const projectId = Number(process.argv[2]);
  const packFile = process.argv[3];
  if (!projectId) {
    console.error("用法: yarn drama-pack:verify <projectId> [pack.json]");
    process.exit(1);
  }

  const root = path.resolve(__dirname, "..");
  const webDir = path.join(root, "data", "web");
  const indexHtml = path.join(webDir, "index.html");
  const bundleOk = fs.existsSync(indexHtml);
  let bundleAge = "";
  if (bundleOk) {
    const stat = fs.statSync(indexHtml);
    bundleAge = stat.mtime.toISOString();
  }

  console.log("=== Bundle 检查 ===");
  console.log(JSON.stringify({ bundleOk, indexHtml, bundleAge }, null, 2));
  if (!bundleOk) {
    console.error("data/web 未部署，请先 yarn build:fast 并复制 dist");
    process.exit(1);
  }

  if (packFile) {
    console.log("\n=== Audit ===");
    const audit = spawnSync("npx", ["tsx", "scripts/audit-drama-pack.ts", String(projectId), packFile], {
      cwd: root,
      stdio: "inherit",
      shell: true,
    });
    if (audit.status !== 0) {
      console.error("audit 未通过");
      process.exit(audit.status ?? 1);
    }
  }

  console.log(`
=== 十四步人工验收清单（项目 ${projectId}）===
[ ] 0. data/web 已更新并重启 dev:gui
[ ] 1. yarn drama-pack audit baseline
[ ] 2. yarn drama-pack:backfill-prompts
[ ] 3. CornerScape WRJ T0 + T1 归组
[ ] 4. 生成 T0 CHAR-WRJ 四视图
[ ] 5. 删除旧 T1 后逐张重生（日常/潜入/落魄）
[ ] 6. XC 镜 secondary ref（如有）
[ ] 7. batchGenerateImage 分镜
[ ] 8. PURE-SCENE 抽检
[ ] 9. 视频轨重置参考条带 + 拖入 T1 有图资产
[ ] 10. 单轨 genText（多参 imageReference）
[ ] 11. 批量 batchGenText
[ ] 12. generateVideo 无 missingRefs/orphan
[ ] 13. 终检 audit valid:true
[ ] 14. 台词中文保留、@图N 缩略图与条带一致
`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
