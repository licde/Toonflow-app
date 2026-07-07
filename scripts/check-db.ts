import u from "../src/utils";
import getPath from "../src/utils/getPath";
import { lookupLockDescription } from "../src/lib/dramaPack/characterAssetUtils";
import { detectStaleFacePrompt } from "../src/lib/dramaPack/packDerivation";

async function main() {
  const pid = Number(process.argv[2] || 1783139305612);
  console.log("DB:", getPath("db2.sqlite"));
  const proj = await u.db("o_project").where("id", pid).first();
  console.log("project:", proj ? { id: proj.id, name: proj.name, artStyle: proj.artStyle } : "NOT FOUND");

  const agentRow = await u.db("o_agentWorkData").where({ projectId: pid, key: "scriptAgent" }).first();
  const agentData = agentRow?.data ? JSON.parse(agentRow.data) : {};
  console.log("packContentHash:", agentData.packContentHash ?? "(未 sync)");
  console.log("artStyleHint:", agentData.artStyleHint ?? "(无)");

  const scripts = await u.db("o_script").where({ projectId: pid }).select("id", "name");
  console.log("scripts:", scripts);

  for (const script of scripts) {
    const count = await u.db("o_storyboard").where({ scriptId: script.id }).count("id as c").first();
    console.log(`  storyboards[${script.name}]:`, count?.c ?? 0);
  }

  const assets = await u.db("o_assets").where({ projectId: pid }).select("id", "name", "remark", "promptSource");
  console.log("assets:", assets.length);
  const derivatives = assets.filter((a) => (a.remark || "").includes(":"));
  console.log("  derivative lockCodes:", derivatives.map((a) => a.remark));

  const charAssets = agentData.packExtensions?.characterAssets ?? {};
  const boards = await u.db("o_storyboard").where({ projectId: pid }).orderBy("index", "asc").select("id", "index", "prompt", "promptSource", "shotMeta");
  let staleCount = 0;
  for (const row of boards) {
    if (row.promptSource === "manual" || row.promptSource === "ai") continue;
    let meta: { assetCodes?: string[] } = {};
    try {
      meta = row.shotMeta ? JSON.parse(row.shotMeta) : {};
    } catch {
      /* ignore */
    }
    const charCode = meta.assetCodes?.find((c) => c.startsWith("CHAR-"));
    if (!charCode || !charAssets[charCode]) continue;
    const lockDesc = lookupLockDescription(charAssets[charCode]);
    const stale = detectStaleFacePrompt(row.prompt || "", lockDesc, row.index ?? 0);
    if (stale) staleCount++;
  }
  console.log("stale face prompts (import源):", staleCount);

  const agentRows = await u.db("o_agentWorkData").where({ projectId: pid }).select("key", "episodesId", "updateTime");
  console.log("agentWorkData keys:", agentRows.map((r) => `${r.key}${r.episodesId ? `@${r.episodesId}` : ""}`));
  const novelCount = await u.db("o_novel").where({ projectId: pid }).count("id as c").first();
  console.log("novel chapters:", novelCount?.c ?? 0, "(drama-pack 不导入原小说)");

  const sceneAssets = await u.db("o_assets").where({ projectId: pid, type: "scene" }).select("remark", "prompt");
  let sceneViolations = 0;
  for (const s of sceneAssets) {
    const p = (s.prompt || "").toLowerCase();
    if (!p.includes("no people") && !p.includes("no characters")) sceneViolations++;
    if (/\bpeople\b/.test(p) && !/\bno people\b/.test(p)) sceneViolations++;
  }
  console.log("scene assets missing no-people:", sceneViolations, "/", sceneAssets.length);

  const propAssets = await u.db("o_assets").where({ projectId: pid, type: "tool" }).select("remark", "prompt");
  let propViolations = 0;
  for (const p of propAssets) {
    const text = (p.prompt || "").toLowerCase();
    if (!text.includes("isolated")) propViolations++;
  }
  console.log("prop assets missing isolated:", propViolations, "/", propAssets.length);

  const tracks = await u.db("o_videoTrack").where({ projectId: pid }).select("id", "prompt", "promptSource");
  for (const t of tracks) {
    const boards = await u.db("o_storyboard").where("trackId", t.id).select("videoDesc");
    const maxDesc = Math.max(0, ...boards.map((b) => (b.videoDesc || "").length));
    console.log(`track ${t.id}: promptLen=${(t.prompt || "").length} videoDescMax=${maxDesc} source=${t.promptSource}`);
  }

  console.log("提示: 改 pack 后请 yarn drama-pack sync", pid, "./my-pack.json");
  console.log("审计: yarn drama-pack audit", pid, "./my-pack.json");
}

main().then(() => process.exit(0));
