/**
 * DB-backed import hydration journey for Untitled-2 golden.
 * yarn test:import-runtime-journey
 */
import fs from "fs";
import path from "path";
import u from "@/utils";
import fixDB from "@/lib/fixDB";
import { db } from "@/utils/db";
import { importScriptBundle } from "@/ruleEngine/bundle/importAdapter";
import { RuntimeGapCollector } from "@/ruleEngine/bundle/runtimeGapRegistry";
import { runHydrationAndDeriveDbChecks } from "@/ruleEngine/bundle/runtimeMatrix/runHydrationMatrix";
import type { MatrixExpect } from "@/ruleEngine/bundle/runtimeMatrix/runSemanticMatrix";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";

async function waitForDb() {
  for (let i = 0; i < 40; i++) {
    try {
      if (await db.schema.hasTable("o_user")) {
        await fixDB(db);
        if (await db.schema.hasTable("o_episodePackage")) return;
      }
    } catch {
      /* */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("数据库未就绪");
}

async function main() {
  await waitForDb();
  const project = await u.db("o_project").first();
  if (!project) throw new Error("无测试项目 — 请先启动过一次应用初始化 DB");
  const projectId = project.id!;

  const fixture = path.join(process.cwd(), "data/fixtures/golden/ep1-suiyu-deepseek.json");
  const expectPath = path.join(process.cwd(), "data/fixtures/golden/ep1-suiyu-deepseek.expect.json");
  if (!fs.existsSync(fixture)) throw new Error(`missing ${fixture}`);
  const raw = JSON.parse(fs.readFileSync(fixture, "utf-8"));
  const expect = JSON.parse(fs.readFileSync(expectPath, "utf-8")) as MatrixExpect;
  raw.meta = { ...(raw.meta ?? {}), projectId, episodeKey: `runtime-journey-${Date.now()}` };

  const gaps = new RuntimeGapCollector();
  console.log("[journey] importScriptBundle…");
  const result = await importScriptBundle(u.db, raw, {
    projectId,
    importMode: "create",
    mergeStrategy: "replaceAll",
    autoDesign: false,
  });
  console.log("  scriptId:", result.scriptId);

  const snap = await runHydrationAndDeriveDbChecks(
    u.db,
    projectId,
    result.scriptId,
    raw as ScriptBundle,
    expect,
    gaps,
  );
  console.log("  hydration:", snap);

  if (gaps.failed) {
    console.error("\nimport-runtime-journey FAIL");
    for (const g of gaps.gaps) console.error(`  [${g.dimension}] ${g.id}: ${g.message}`);
    process.exit(1);
  }
  console.log("\ntest:import-runtime-journey PASS");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
