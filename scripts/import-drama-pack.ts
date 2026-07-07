#!/usr/bin/env tsx
/**
 * CLI：导入 / 校验 / 导出 / 重合成 / 同步 drama-pack
 */
import fs from "fs";
import path from "path";
import { validateDramaPack } from "../src/lib/dramaPack/validate";
import { importDramaPack } from "../src/lib/dramaPack/importDramaPack";
import { exportDramaPack } from "../src/lib/dramaPack/exportDramaPack";
import { normalizePackInput } from "../src/lib/dramaPack/packNormalizer";
import { DramaPackCoreSchema } from "../src/lib/dramaPack/schema";
import { recomposeScriptStoryboards, recomposeProjectPrompts } from "../src/lib/dramaPack/recomposeDramaPack";
import { syncDramaPack, buildCoverageReport } from "../src/lib/dramaPack/packSync";
import { resolveProjectId } from "../src/lib/dramaPack/resolveProjectId";
import { spawnSync } from "child_process";

async function main() {
  const [, , cmd, ...args] = process.argv;
  if (!cmd || cmd === "help" || cmd === "-h") {
    console.log(`用法:
  yarn drama-pack validate <pack.json> [--with-pack]
  yarn drama-pack normalize <pack.json> [--dry-run] [-o out.json]
  yarn drama-pack import <projectId|scriptId> <pack.json> [--merge-plan] [--soft] [--reconcile-assets] [--skip-validation] [--t1-stages-from-storyboard]
  yarn drama-pack sync <projectId|scriptId> <pack.json> [--soft] [--force-recompose] [--skip-validation] [--no-expand-video-prompts] [--replace-storyboards] [--prune-storyboards] [--t1-stages-from-storyboard]
  yarn drama-pack audit <projectId|scriptId> <pack.json>
  yarn drama-pack manifest
  yarn drama-pack export <projectId> [out.json]
  yarn drama-pack recompose <projectId> <scriptId> [--merge|--rebuild]
  yarn drama-pack recompose-all <projectId> [--storyboards-only] [--assets-only] [--force-assets]
  yarn drama-pack status <projectId>
  yarn drama-pack coverage <pack.json>`);
    process.exit(0);
  }

  if (cmd === "normalize") {
    const file = args.find((a) => !a.startsWith("-"));
    if (!file) throw new Error("用法: normalize <pack.json> [--dry-run] [-o out.json]");
    const dryRun = args.includes("--dry-run");
    const outIdx = args.indexOf("-o");
    const outFile = outIdx >= 0 ? args[outIdx + 1] : undefined;
    const raw = JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
    const { normalized, fixes, format } = normalizePackInput(raw);
    const parsed = DramaPackCoreSchema.safeParse(normalized);
    const report = {
      format,
      schemaValid: parsed.success,
      fixCount: fixes.length,
      fixes,
      ...(parsed.success ? {} : { schemaErrors: parsed.error.issues.map((e) => e.path.join(".")) }),
    };
    if (dryRun || !outFile) {
      console.log(JSON.stringify(report, null, 2));
    }
    if (outFile) {
      fs.writeFileSync(path.resolve(outFile), JSON.stringify(normalized, null, 2), "utf8");
      console.log(`已写出归一化 pack → ${outFile}（${fixes.length} 项修复，格式 ${format}）`);
    }
    process.exit(parsed.success ? 0 : 1);
  }

  if (cmd === "validate") {
    const file = args[0];
    if (!file) throw new Error("请指定 pack.json 路径");
    const includePack = args.includes("--with-pack");
    const pack = JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
    const result = validateDramaPack(pack, { includePack });
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.valid ? 0 : 1);
  }

  if (cmd === "manifest") {
    const r = spawnSync("npx", ["tsx", path.join(__dirname, "generate-pack-manifest.ts")], {
      stdio: "inherit",
      cwd: path.resolve(__dirname, ".."),
      shell: true,
    });
    process.exit(r.status ?? 1);
  }

  if (cmd === "coverage") {
    const file = args[0];
    if (!file) throw new Error("用法: coverage <pack.json>");
    const pack = JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
    const result = validateDramaPack(pack, { includePack: true });
    if (!result.pack) throw new Error("pack 解析失败");
    console.log(JSON.stringify(buildCoverageReport(result.pack, result.pack.meta.artStyleHint), null, 2));
    process.exit(0);
  }

  if (cmd === "import") {
    const rawId = Number(args[0]);
    const file = args[1];
    if (!rawId || !file) throw new Error("用法: import <projectId|scriptId> <pack.json>");
    const resolved = await resolveProjectId(rawId);
    const projectId = resolved?.projectId ?? rawId;
    const mergePlanOnly = args.includes("--merge-plan") || args.includes("--merge");
    const skipValidation = args.includes("--skip-validation");
    const soft = args.includes("--soft");
    const reconcileAssets = args.includes("--reconcile-assets");
    const t1StagesFromStoryboard = args.includes("--t1-stages-from-storyboard");
    const pack = JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
    const result = await importDramaPack(pack, {
      projectId,
      mergePlanOnly,
      skipValidation,
      soft,
      reconcileAssets,
      t1StagesFromStoryboard,
    });
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  }

  if (cmd === "sync") {
    const rawId = Number(args[0]);
    const file = args[1];
    if (!rawId || !file) throw new Error("用法: sync <projectId|scriptId> <pack.json>");
    const resolved = await resolveProjectId(rawId);
    const projectId = resolved?.projectId ?? rawId;
    if (resolved?.resolvedFrom === "script") {
      console.error(`[info] scriptId=${rawId}（${resolved.scriptName}）→ projectId=${projectId}`);
    }
    const pack = JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
    const result = await syncDramaPack(pack, {
      projectId,
      skipValidation: args.includes("--skip-validation"),
      forceRecompose: args.includes("--force-recompose"),
      soft: args.includes("--soft"),
      expandVideoPrompts: !args.includes("--no-expand-video-prompts"),
      preserveStoryboardImages: !args.includes("--replace-storyboards"),
      replaceStoryboards: args.includes("--replace-storyboards"),
      pruneStoryboards: args.includes("--prune-storyboards"),
      t1StagesFromStoryboard: args.includes("--t1-stages-from-storyboard"),
    });
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  }

  if (cmd === "audit") {
    const rawId = Number(args[0]);
    const file = args[1];
    if (!rawId || !file) throw new Error("用法: audit <projectId|scriptId> <pack.json>");
    const r = spawnSync("npx", ["tsx", path.join(__dirname, "audit-drama-pack.ts"), String(rawId), file], {
      stdio: "inherit",
      cwd: path.resolve(__dirname, ".."),
      shell: true,
    });
    process.exit(r.status ?? 1);
  }

  if (cmd === "export") {
    const projectId = Number(args[0]);
    const outFile = args[1];
    if (!projectId) throw new Error("用法: export <projectId> [out.json]");
    const pack = await exportDramaPack({ projectId });
    const json = JSON.stringify(pack, null, 2);
    if (outFile) {
      fs.writeFileSync(path.resolve(outFile), json, "utf8");
      console.log(`已导出到 ${outFile}`);
    } else {
      console.log(json);
    }
    process.exit(0);
  }

  if (cmd === "status") {
    const projectId = Number(args[0]);
    if (!projectId) throw new Error("用法: status <projectId>");
    const r = spawnSync("npx", ["tsx", path.join(__dirname, "check-db.ts"), String(projectId)], {
      stdio: "inherit",
      cwd: path.resolve(__dirname, ".."),
      shell: true,
    });
    process.exit(r.status ?? 1);
  }

  if (cmd === "recompose") {
    const projectId = Number(args[0]);
    const scriptId = Number(args[1]);
    if (!projectId || !scriptId) throw new Error("用法: recompose <projectId> <scriptId> [--merge]");
    const mode = args.includes("--rebuild") ? "rebuild" : "merge";
    const result = await recomposeScriptStoryboards({ projectId, scriptId, mode });
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  }

  if (cmd === "recompose-all") {
    const projectId = Number(args[0]);
    if (!projectId) throw new Error("用法: recompose-all <projectId>");
    const mode = args.includes("--rebuild") ? "rebuild" : "merge";
    const storyboardsOnly = args.includes("--storyboards-only");
    const assetsOnly = args.includes("--assets-only");
    const forceAssets = args.includes("--force-assets");
    const result = await recomposeProjectPrompts({
      projectId,
      mode,
      storyboards: assetsOnly ? false : true,
      assets: storyboardsOnly ? false : true,
      forceAssets,
    });
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  }

  throw new Error(`未知命令: ${cmd}`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
