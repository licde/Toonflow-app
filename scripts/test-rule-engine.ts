import u from "@/utils";
import fixDB from "@/lib/fixDB";
import { db } from "@/utils/db";
import fs from "fs";
import path from "path";

async function waitForDbReady() {
  for (let i = 0; i < 40; i++) {
    try {
      if (await db.schema.hasTable("o_user")) {
        await fixDB(db);
        if (await db.schema.hasTable("o_episodePackage")) return;
      }
    } catch {
      /* db init race */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("数据库未就绪");
}
import {
  parseStoryboardTable,
  extractScriptMeta,
  parseScriptPlan,
  syncFromFlowData,
  dryRun,
  validatePackage,
  getRules,
  getTier0Rules,
  exportPackage,
} from "@/ruleEngine";
import { resolveConfig } from "@/ruleEngine/resolveConfig";

async function main() {
  await waitForDbReady();
  console.log("=== 规则引擎统一测试 ===\n");

  const rules = getRules();
  const tier0 = getTier0Rules();
  console.log(`[1] 规则注册: ${rules.length} 条, Tier0 proven: ${tier0.length}`);

  const sampleTable = `
| 镜 | 类型 | 场景 | 台词 | 时长 |
| 1 | CHAR-SCENE | 寝殿 | 婢女："殿下醒了。" | 2s |
| 2 | PURE-SCENE | 宫门 | no people | 3s |
`;
  const shots = parseStoryboardTable(sampleTable);
  console.log(`[2] 分镜解析: ${shots.length} 镜, type[0]=${shots[0]?.narrative.type}`);

  const meta = extractScriptMeta('裴青梧："我知道。"\n婢女："殿下醒了。"');
  console.log(`[3] ScriptMeta: characters=${meta.characters?.length}, hash=${meta.hash?.slice(0, 8)}`);

  const beat = parseScriptPlan("情绪：5\n第一场：寝殿\n前情回顾");
  console.log(`[4] EpisodeBeat: emotionCurve=${beat.emotionCurve?.join(",")}`);

  const pkg = await syncFromFlowData(u.db, {
    projectId: 1,
    scriptId: 1,
    script: '婢女："殿下醒了。"',
    scriptPlan: "情绪：4",
    storyboardTable: sampleTable,
    storyboard: [{ id: 1, duration: 2, prompt: "test", videoDesc: "desc", shouldGenerateImage: 1 }],
  });
  console.log(`[5] EpisodePackage: version=${pkg.version}, shots=${pkg.shots.length}`);

  const dry = await dryRun(u.db, pkg, '婢女："殿下醒了。"');
  console.log(`[6] DryRun: passed=${dry.report.passed}, blocks=${dry.report.blockCount}, warns=${dry.report.warnCount}`);

  const config = await resolveConfig(u.db as never, 1);
  const report = validatePackage(pkg, config, '婢女："殿下醒了。"', [{ id: 1, filePath: "/x.jpg", shouldGenerateImage: 1 }]);
  console.log(`[7] Validate: passed=${report.passed}, coverage=${report.ruleCoverage.hit}/${report.ruleCoverage.total}`);

  const z = exportPackage(pkg);
  console.log(`[8] Export: Z108 prompts=${(z.Z108 as { prompts: unknown[] }).prompts.length}`);

  const compiledCount = pkg.shots.filter((s) => s.generation.compiled?.image).length;
  const coverage = pkg.shots.length ? Math.round((compiledCount / pkg.shots.length) * 100) : 0;
  console.log(`[9] 编译覆盖率: ${coverage}%`);

  const sample2Path = path.join(process.cwd(), "示例2.ini");
  if (fs.existsSync(sample2Path)) {
    const sample2 = fs.readFileSync(sample2Path, "utf-8");
    const shotRows = sample2.match(/\|\s*\d+\s*\|/g) ?? [];
    console.log(`[10] 示例2.ini 镜数参考: ${shotRows.length} 行`);
  }

  const ok = shots.length >= 2 && dry.report.rulePackVersion && coverage >= 50;
  console.log(ok ? "\n✓ 全部测试通过" : "\n✗ 部分测试未通过");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
