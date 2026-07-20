/**
 * yarn test:import-update-dedup
 *
 * Verifies linkSeededAssetsToScript pruneStale removes stale scriptAssets on update import.
 */
import knex from "knex";
import { linkSeededAssetsToScript } from "@/ruleEngine/bundle/assetSeedFromBundle";
import type { AssetSeedResult } from "@/ruleEngine/bundle/assetSeedFromBundle";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

async function setupDb() {
  const db = knex({
    client: "better-sqlite3",
    connection: { filename: ":memory:" },
    useNullAsDefault: true,
  });
  await db.schema.createTable("o_scriptAssets", (t) => {
    t.integer("scriptId").notNullable();
    t.integer("assetId").notNullable();
    t.primary(["scriptId", "assetId"]);
  });
  await db.schema.createTable("o_assets", (t) => {
    t.increments("id").primary();
    t.integer("scriptId").nullable();
    t.string("name");
  });
  return db;
}

function seedResult(ids: number[]): AssetSeedResult {
  const codeToId: Record<string, number> = {};
  ids.forEach((id, i) => {
    codeToId[`CHAR-00${i + 1}`] = id;
  });
  return {
    codeToId,
    nameToId: {},
    seeded: ids.length,
    derivatives: 0,
    linked: 0,
    allAssetIds: ids,
    weakPromptCount: 0,
    propSeeded: 0,
    speakerSeeded: 0,
    sceneSeeded: 0,
  };
}

async function main() {
  const db = await setupDb();
  const scriptId = 42;

  await db("o_assets").insert([
    { id: 1, name: "A" },
    { id: 2, name: "B" },
    { id: 3, name: "C" },
    { id: 99, name: "stale" },
  ]);
  await db("o_scriptAssets").insert([
    { scriptId, assetId: 1 },
    { scriptId, assetId: 2 },
    { scriptId, assetId: 99 },
  ]);

  const first = await linkSeededAssetsToScript(db, scriptId, seedResult([1, 2, 3]), { pruneStale: true });
  ok("first link adds asset 3", first.linked === 1, `linked=${first.linked}`);
  ok("first prune removes stale 99", first.pruned === 1, `pruned=${first.pruned}`);

  const rows = await db("o_scriptAssets").where({ scriptId }).orderBy("assetId");
  ok("scriptAssets count=3", rows.length === 3, String(rows.length));
  ok("no stale assetId 99", !rows.some((r) => r.assetId === 99));

  const second = await linkSeededAssetsToScript(db, scriptId, seedResult([1, 2]), { pruneStale: true });
  ok("second prune removes asset 3", second.pruned === 1, `pruned=${second.pruned}`);
  ok("second link idempotent", second.linked === 0, `linked=${second.linked}`);

  const finalRows = await db("o_scriptAssets").where({ scriptId });
  ok("final count=2 after shrink", finalRows.length === 2, String(finalRows.length));

  await db.destroy();

  if (failed) {
    console.error(`\n${failed} test:import-update-dedup FAILED`);
    process.exit(1);
  }
  console.log("\n=== test:import-update-dedup OK ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
