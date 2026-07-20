/**
 * Full Runtime Matrix — dimensions A–F for Untitled-2 golden.
 * yarn test:full-runtime-matrix
 *
 * DB-backed B/E2/F2: needs initialized local DB.
 * RUNTIME_MATRIX_SKIP_DB=1 — offline A/C/D/E + F0/F1/F3/F4 only.
 * RUNTIME_MATRIX_LIVE_GEN=1 — also exercise real AssetPort upload (needs ossURL/ngrok).
 * ossURL — public base for reference images (priority over localhost in getFileUrl).
 */
import fs from "fs";
import path from "path";
import { RuntimeGapCollector } from "@/ruleEngine/bundle/runtimeGapRegistry";
import { runSemanticMatrix, type MatrixExpect } from "@/ruleEngine/bundle/runtimeMatrix/runSemanticMatrix";
import { runPromptDeriveMatrixOnBundle } from "@/ruleEngine/bundle/runtimeMatrix/runPromptDeriveMatrix";
import { runGenApiAndFrontendContracts } from "@/ruleEngine/bundle/runtimeMatrix/runGenApiFrontendContract";
import { runHydrationAndDeriveDbChecks } from "@/ruleEngine/bundle/runtimeMatrix/runHydrationMatrix";
import { runGenE2EMatrix } from "@/ruleEngine/bundle/runtimeMatrix/runGenE2E";
import { runModeMatrix } from "@/ruleEngine/bundle/runtimeMatrix/runModeMatrix";
import { importScriptBundle } from "@/ruleEngine/bundle/importAdapter";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";

function loadGolden(): { raw: Record<string, unknown>; expect: MatrixExpect } {
  const fixture = path.join(process.cwd(), "data/fixtures/golden/ep1-suiyu-deepseek.json");
  const expectPath = path.join(process.cwd(), "data/fixtures/golden/ep1-suiyu-deepseek.expect.json");
  if (!fs.existsSync(fixture)) throw new Error(`missing golden fixture ${fixture}`);
  return {
    raw: JSON.parse(fs.readFileSync(fixture, "utf-8")),
    expect: JSON.parse(fs.readFileSync(expectPath, "utf-8")) as MatrixExpect,
  };
}

function printDim(name: string, gaps: RuntimeGapCollector, dim: "A" | "B" | "C" | "D" | "E" | "F" | "M" | "Q" | "R") {
  const list = gaps.byDimension(dim);
  const mark = list.length ? "✗" : "✓";
  console.log(`${mark} ${name}  (${list.length} fail${list.length === 1 ? "" : "s"})`);
  for (const g of list) console.log(`    ${g.id}: ${g.message}`);
}

async function runDbLayers(
  raw: Record<string, unknown>,
  expect: MatrixExpect,
  gaps: RuntimeGapCollector,
): Promise<{ projectId: number; scriptId: number; storyboardId?: number } | null> {
  const u = (await import("@/utils")).default;
  const { db } = await import("@/utils/db");
  const fixDB = (await import("@/lib/fixDB")).default;

  for (let i = 0; i < 40; i++) {
    try {
      if (await db.schema.hasTable("o_user")) {
        await fixDB(db);
        if (await db.schema.hasTable("o_episodePackage")) break;
      }
    } catch {
      /* */
    }
    await new Promise((r) => setTimeout(r, 300));
    if (i === 39) throw new Error("数据库未就绪");
  }

  const project = await u.db("o_project").first();
  if (!project) throw new Error("无测试项目");
  const projectId = project.id!;
  const payload = structuredClone(raw);
  (payload as { meta: Record<string, unknown> }).meta = {
    ...((payload as { meta?: Record<string, unknown> }).meta ?? {}),
    projectId,
    episodeKey: `frm-${Date.now()}`,
  };

  const result = await importScriptBundle(u.db, payload, {
    projectId,
    importMode: "create",
    mergeStrategy: "replaceAll",
    autoDesign: false,
  });
  console.log(`  imported scriptId=${result.scriptId}`);
  await runHydrationAndDeriveDbChecks(u.db, projectId, result.scriptId, payload as unknown as ScriptBundle, expect, gaps);
  const firstSb = await u.db("o_storyboard").where({ projectId, scriptId: result.scriptId }).orderBy("index").first();
  return { projectId, scriptId: result.scriptId, storyboardId: firstSb?.id };
}

async function main() {
  const skipDb = process.env.RUNTIME_MATRIX_SKIP_DB === "1";
  const { raw, expect } = loadGolden();
  const gaps = new RuntimeGapCollector();

  console.log("=== Full Runtime Matrix (Untitled-2) ===\n");

  const bundle = await runPromptDeriveMatrixOnBundle(raw, expect, gaps);
  runSemanticMatrix(bundle, expect, gaps);
  runGenApiAndFrontendContracts(gaps);

  console.log("[M/Q/R] Mode + Queue + Reverse…");
  await runModeMatrix(gaps);

  let journey: { projectId: number; scriptId: number; storyboardId?: number } | null = null;
  if (!skipDb) {
    try {
      console.log("[B/E2] import hydration…");
      journey = await runDbLayers(raw, expect, gaps);
    } catch (e) {
      gaps.push("B", "HYD-FLOW", `DB journey failed: ${(e as Error).message}`);
    }
  } else {
    console.log("[B/E2] SKIP (RUNTIME_MATRIX_SKIP_DB=1)");
  }

  console.log("[F] GenE2E…");
  const u = (await import("@/utils")).default;
  await runGenE2EMatrix(gaps, {
    db: skipDb ? undefined : u.db,
    projectId: journey?.projectId,
    storyboardId: journey?.storyboardId,
  });

  printDim("A Semantic (FT/RV)", gaps, "A");
  printDim("B Hydration", gaps, "B");
  printDim("C Gen API Contract", gaps, "C");
  printDim("D Frontend Contract", gaps, "D");
  printDim("E Prompt + Derive", gaps, "E");
  printDim("F GenE2E", gaps, "F");
  printDim("M Mode Adaptive", gaps, "M");
  printDim("Q Queue Logic", gaps, "Q");
  printDim("R Reverse Routes", gaps, "R");

  if (gaps.failed) {
    console.error(`\ntest:full-runtime-matrix FAIL (${gaps.gaps.length} gaps)`);
    process.exit(1);
  }
  console.log("\ntest:full-runtime-matrix PASS");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
