/**
 * Diagnose real preflight for project/script/storyboard.
 * yarn tsx scripts/diag-preflight-real.ts
 */
import knex from "knex";
import getPath from "@/utils/getPath";
import { loadEpisodePackage, loadProjectBlueprint } from "@/ruleEngine/storage/episodePackageStore";
import { episodePackageToScriptBundle, runProductionPreflight } from "@/ruleEngine/detection/preflightProduction";
import { validateLinkageChains } from "@/ruleEngine/design/linkageValidator";
import { runDesignClosureDryRun } from "@/ruleEngine/bundle/designClosureDryRun";
import { dialogueCoverageReport } from "@/ruleEngine/design/dialogueCoverage";

const PROJECT_ID = Number(process.env.PROJECT_ID ?? 1784214355701);
const SCRIPT_ID = Number(process.env.SCRIPT_ID ?? 23);
const STORYBOARD_IDS = (process.env.STORYBOARD_IDS ?? "624")
  .split(",")
  .map((s) => Number(s.trim()))
  .filter(Boolean);

const db = knex({
  client: "better-sqlite3",
  connection: { filename: getPath("db2.sqlite") },
  useNullAsDefault: true,
});

async function main() {
  const r = await runProductionPreflight(db, {
    projectId: PROJECT_ID,
    scriptId: SCRIPT_ID,
    storyboardIds: STORYBOARD_IDS,
    tier: "T3",
    modality: "VID",
  });

  const blocks = r.detectionResults.filter((x) => !x.passed && x.severity === "BLOCK");
  const dc = r.closureChecks.dc.filter((c) => !c.passed);

  const scriptRow = await db("o_script").where({ id: SCRIPT_ID }).first();
  const pkg = await loadEpisodePackage(db, PROJECT_ID, SCRIPT_ID);
  const bp = (await loadProjectBlueprint(db, PROJECT_ID)) ?? {};
  let shots = pkg?.shots ?? [];
  if (STORYBOARD_IDS.length) {
    const idSet = new Set(STORYBOARD_IDS);
    shots = shots.filter((s) => s.storyboardId != null && idSet.has(s.storyboardId));
  }
  const bundle = episodePackageToScriptBundle(
    { ...(pkg as NonNullable<typeof pkg>), shots },
    String(scriptRow?.content ?? ""),
    { planData: bp.planData as never },
  );

  // Also full-scope for comparison
  const fullBundle = episodePackageToScriptBundle(
    pkg as NonNullable<typeof pkg>,
    String(scriptRow?.content ?? ""),
    { planData: bp.planData as never },
  );

  const linkageFiltered = validateLinkageChains(bundle, {
    mode: "filtered",
    storyboardIds: STORYBOARD_IDS,
  }).filter((l) => l.broken || l.softBroken);
  const linkageFull = validateLinkageChains(fullBundle).filter((l) => l.broken);
  const dcFiltered = runDesignClosureDryRun(bundle, {
    scope: { mode: "filtered", storyboardIds: STORYBOARD_IDS },
  }).filter((c) => !c.passed);
  const dcFull = runDesignClosureDryRun(fullBundle, { scope: { mode: "full" } }).filter(
    (c) => !c.passed && c.severity === "BLOCK",
  );

  const covFiltered = dialogueCoverageReport({
    script: bundle.script ?? "",
    shots: bundle.preDesignPack?.shots ?? [],
    planData: bundle.planData,
  });
  const covFull = dialogueCoverageReport({
    script: fullBundle.script ?? "",
    shots: fullBundle.preDesignPack?.shots ?? [],
    planData: fullBundle.planData,
  });

  const shot0 = shots[0];
  console.log(
    JSON.stringify(
      {
        blocked: r.blocked,
        blockGenerate: r.blockGenerate,
        blocks: blocks.map((b) => ({ id: b.id, message: b.message, repairHintId: b.repairHintId })),
        dcFailed: dc.map((c) => ({ id: c.id, message: c.message, severity: c.severity, detail: c.detail })),
        linkageFiltered,
        linkageFull,
        dcFilteredFailed: dcFiltered.map((c) => ({ id: c.id, message: c.message, severity: c.severity })),
        dcFullBlocks: dcFull.map((c) => ({ id: c.id, message: c.message })),
        coverage: {
          filtered: { ok: covFiltered.ok, missing: covFiltered.missingCount },
          full: { ok: covFull.ok, missing: covFull.missingCount },
        },
        shotSample: shot0
          ? {
              storyboardId: shot0.storyboardId,
              sceneName: shot0.narrative?.sceneName,
              charCodes: (shot0 as { charCodes?: string[] }).charCodes,
              markers: shot0.narrative?.markers?.length ?? (shot0 as { markers?: unknown[] }).markers?.length,
              emotion: shot0.narrative?.emotionIntensity,
              dialogueLines: shot0.narrative?.dialogue?.lines,
            }
          : null,
        briefKeys: Object.keys((bp as { designBrief?: object }).designBrief ?? bp).slice(0, 30),
        hasDesignBrief: Boolean((bundle as { designBrief?: unknown }).designBrief),
        charactersCount: (bundle.characters ?? []).length,
        precheckLoopOk: r.precheckLoop?.ok,
      },
      null,
      2,
    ),
  );

  await db.destroy();
}

main().catch(async (e) => {
  console.error(e);
  await db.destroy();
  process.exit(1);
});
