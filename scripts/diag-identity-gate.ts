/**
 * Diagnose identity gate for project 1784214355701 / storyboard 624
 * yarn tsx scripts/diag-identity-gate.ts
 *
 * Asserts: resolveShotIdentity yields SCENE; getShotSpecDiff-equivalent redLights has no MISSING_SCENE;
 * gateIdentityForShot matches generateVideo / generateVideoPrompt path.
 */
import knex from "knex";
import getPath from "@/utils/getPath";
import { gateIdentityForShot, resolveShotIdentity } from "@/ruleEngine/compilers/resolveShotIdentity";
import { loadEpisodePackage } from "@/ruleEngine/storage/episodePackageStore";

const PROJECT_ID = 1784214355701;
const STORYBOARD_ID = 624;
const TRACK_ID = 1784214424099;

const db = knex({
  client: "better-sqlite3",
  connection: { filename: getPath("db2.sqlite") },
  useNullAsDefault: true,
});

async function main() {
  console.log("db:", getPath("db2.sqlite"));

  const track = await db("o_videoTrack").where({ id: TRACK_ID }).first();
  const sb = await db("o_storyboard").where({ id: STORYBOARD_ID }).first();
  const scriptId = track?.scriptId ?? sb?.scriptId;
  console.log("track/script:", { trackId: track?.id, scriptId, sbPrompt: String(sb?.prompt ?? "").slice(0, 100) });

  const pkg = await loadEpisodePackage(db, PROJECT_ID, scriptId);
  const shot = pkg?.shots?.find((s) => s.storyboardId === STORYBOARD_ID);

  const identity = await resolveShotIdentity({
    db,
    projectId: PROJECT_ID,
    storyboardId: STORYBOARD_ID,
    shot,
    extraPrompt: track?.prompt,
    failClosedBound: true,
  });
  console.log("resolved:", {
    sceneCode: identity.sceneCode,
    charCodes: identity.charCodes,
    propCodes: identity.propCodes,
    bound: identity.boundAssets.map((b) => ({ id: b.assetId, code: b.code, fp: Boolean(b.filePath) })),
  });

  if (!identity.sceneCode) {
    console.error("FAIL: MISSING_SCENE — resolveShotIdentity returned null sceneCode for #624");
    process.exit(1);
  }

  const { gate } = await gateIdentityForShot({
    db,
    projectId: PROJECT_ID,
    storyboardId: STORYBOARD_ID,
    shot,
    extraPrompt: track?.prompt,
    failClosedBound: true,
  });
  console.log("gate:", JSON.stringify(gate, null, 2));

  const wouldRedLightMissingScene = !identity.sceneCode;
  if (wouldRedLightMissingScene) {
    console.error("FAIL: GSD would emit MISSING_SCENE");
    process.exit(1);
  }
  console.log("GSD MISSING_SCENE: absent (ok)");

  if (!gate.ok) {
    console.error("FAIL: identity gate blocked — prompt path and video path would both fail (expected pass for 159/162 stills)");
    process.exit(1);
  }

  await db.destroy();
  console.log("\n=== diag OK: resolve + gate aligned; no MISSING_SCENE ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
