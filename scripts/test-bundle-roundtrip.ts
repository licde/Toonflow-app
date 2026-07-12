/**
 * ScriptBundle / EpisodeBundle 黄金路径 roundtrip 测试
 * yarn test:bundle-roundtrip
 */
import u from "@/utils";
import fixDB from "@/lib/fixDB";
import { db } from "@/utils/db";
import fs from "fs";
import path from "path";
import { importScriptBundle, importEpisodeBundle, exportScriptBundle, dryRunImport } from "@/ruleEngine/bundle/importAdapter";
import { productionClosureBlocked } from "@/ruleEngine/bundle/productionClosureDryRun";

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
  if (!project) throw new Error("无测试项目");
  const projectId = project.id!;

  const templatePath = path.join(process.cwd(), "data/fixtures/script-bundle-template.json");
  const bundle = JSON.parse(fs.readFileSync(templatePath, "utf-8"));
  bundle.meta.projectId = projectId;

  console.log("[1] dryRunImport (legacy v1.1)...");
  const dry = await dryRunImport(u.db, bundle, { projectId, validateOnly: true });
  console.log("  layers:", dry.willOverwriteLayers.join(", "));

  console.log("[2] importScriptBundle + autoDesign...");
  const result = await importScriptBundle(u.db, bundle, {
    projectId,
    importMode: "upsert",
    autoDesign: true,
  });
  console.log("  scriptId:", result.scriptId, "panels mapped:", Object.keys(result.idMap).length);
  console.log("  validate passed:", result.validationReport?.passed);

  console.log("[3] exportScriptBundle roundtrip...");
  const exported = await exportScriptBundle(u.db, projectId, result.scriptId);
  console.log("  bundleType:", exported.bundleType, "rulePack:", (exported as { rulePackVersion?: string }).rulePackVersion);

  const v2Path = path.join(process.cwd(), "data/fixtures/script-bundle-template-v2.json");
  const v2 = JSON.parse(fs.readFileSync(v2Path, "utf-8"));
  v2.meta.projectId = projectId;

  console.log("[4] dryRunImport v2 preDesignPack...");
  const dryV2 = await dryRunImport(u.db, v2, { projectId, validateOnly: true });
  console.log("  skipAutoDesignSb:", dryV2.skipAutoDesignSb, "panels:", dryV2.storyboardCount);
  if (dryV2.productionClosureChecks) {
    console.log("  productionClosure BLOCK:", productionClosureBlocked(dryV2.productionClosureChecks));
  }

  console.log("[5] importScriptBundle v2 (preDesignPack, no autoDesign SB)...");
  const v2Result = await importScriptBundle(u.db, v2, {
    projectId,
    importMode: "upsert",
    autoDesign: false,
  });
  console.log("  scriptId:", v2Result.scriptId, "panels:", Object.keys(v2Result.idMap).length);

  const goldenPath = path.join(process.cwd(), "data/fixtures/golden/identity-mismatch-block.json");
  const golden = JSON.parse(fs.readFileSync(goldenPath, "utf-8"));
  golden.meta.projectId = projectId;
  const dryGolden = await dryRunImport(u.db, golden, { projectId, validateOnly: true });
  const blocked = productionClosureBlocked(dryGolden.productionClosureChecks ?? []);
  console.log("[6] golden identity-mismatch dryRun BLOCK:", blocked);
  if (!blocked) throw new Error("golden identity 反例应 BLOCK");

  const flowPath = path.join(process.cwd(), "data/fixtures/episode-bundle-template-v2.json");
  const flowBundle = JSON.parse(fs.readFileSync(flowPath, "utf-8"));
  flowBundle.meta.projectId = projectId;

  console.log("[7] importEpisodeBundle v2...");
  const ep = await importEpisodeBundle(u.db, flowBundle, { projectId, importMode: "upsert" });
  console.log("  scriptId:", ep.scriptId, "storyboard ids:", Object.keys(ep.idMap).length);

  console.log("\n=== bundle roundtrip OK (v1.1 + v2.0.1) ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
