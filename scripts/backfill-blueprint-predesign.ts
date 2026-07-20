/**
 * Backfill blueprint.preDesignPack + planData from golden (or path) so preflight can re-hydrate dialogue.
 * yarn tsx scripts/backfill-blueprint-predesign.ts [projectId] [goldenPath]
 */
import fs from "fs";
import path from "path";
import knex from "knex";
import getPath from "@/utils/getPath";
import { loadProjectBlueprint, saveProjectBlueprint } from "@/ruleEngine/storage/episodePackageStore";
import { hasPreDesignShots } from "@/ruleEngine/bundle/preDesignPackAdapter";
import { hydratePackageFromPreDesign } from "@/ruleEngine/bundle/hydratePackageFromPreDesign";
import { loadEpisodePackage, saveEpisodePackage } from "@/ruleEngine/storage/episodePackageStore";
import { dialogueLineCountMismatch } from "@/ruleEngine/design/forwardTrace";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";

const PROJECT_ID = Number(process.argv[2] || 1784214355701);
const GOLDEN =
  process.argv[3] ||
  path.join(process.cwd(), "data/fixtures/golden/deepseek-20260716-43ce74.json");

const db = knex({
  client: "better-sqlite3",
  connection: { filename: getPath("db2.sqlite") },
  useNullAsDefault: true,
});

async function main() {
  const bundle = JSON.parse(fs.readFileSync(GOLDEN, "utf-8")) as ScriptBundle;
  if (!hasPreDesignShots(bundle.preDesignPack)) {
    console.error("golden missing preDesignPack.shots");
    process.exit(1);
  }
  const existing = (await loadProjectBlueprint(db, PROJECT_ID)) ?? {};
  const merged = {
    ...existing,
    preDesignPack: bundle.preDesignPack,
    planData: bundle.planData ?? (existing as { planData?: unknown }).planData,
    visualLockTable: bundle.visualLockTable ?? (existing as { visualLockTable?: unknown }).visualLockTable,
    sceneColorLock:
      (bundle.visualLockTable as { sceneColorLock?: unknown } | undefined)?.sceneColorLock ??
      (existing as { sceneColorLock?: unknown }).sceneColorLock,
    fxFeasibilityAudit: bundle.fxFeasibilityAudit ?? (existing as { fxFeasibilityAudit?: unknown }).fxFeasibilityAudit,
    debutIntroPack: bundle.debutIntroPack ?? (existing as { debutIntroPack?: unknown }).debutIntroPack,
    globalAnchors:
      (bundle.planData as { globalAnchors?: unknown } | undefined)?.globalAnchors ??
      (existing as { globalAnchors?: unknown }).globalAnchors,
    narrativeCausalityGraph:
      bundle.narrativeCausalityGraph ?? (existing as { narrativeCausalityGraph?: unknown }).narrativeCausalityGraph,
  };
  await saveProjectBlueprint(db, PROJECT_ID, merged);

  // Hydrate first matching script package
  const scripts = await db("o_script").where({ projectId: PROJECT_ID }).select("id");
  for (const s of scripts) {
    const pkg = await loadEpisodePackage(db, PROJECT_ID, s.id);
    if (!pkg?.shots?.length) continue;
    const hydrated = hydratePackageFromPreDesign(pkg, bundle.preDesignPack!.shots, {
      sceneColorLock: merged.sceneColorLock as never,
      debutBeat: (bundle.debutIntroPack as { items?: { copyHint?: string }[] } | undefined)?.items?.[0]?.copyHint,
    });
    await saveEpisodePackage(db, hydrated);
    const fakeBundle: ScriptBundle = {
      bundleType: "script",
      script: bundle.script,
      planData: bundle.planData,
      preDesignPack: {
        scriptPlan: "",
        shots: hydrated.shots.map((sh, i) => ({
          shotIndex: i + 1,
          narrative: { dialogue: sh.narrative.dialogue as never },
        })),
      },
    } as ScriptBundle;
    console.log("script", s.id, "DC-01 mismatch?", dialogueLineCountMismatch(fakeBundle));
  }

  console.log("blueprint preDesignPack shots:", bundle.preDesignPack!.shots.length);
  await db.destroy();
  console.log("=== backfill OK ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
