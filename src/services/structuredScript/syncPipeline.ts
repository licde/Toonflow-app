import u from "@/utils";
import type { StructuredScriptJson, StructuredShot, SyncDiffResult } from "./types";
import { compileImage, compileVideo } from "../generationContext/PromptCompiler";
import { compileHash } from "./utils";
import { saveStructuredSource } from "./importPipeline";

export async function syncStructuredEpisode(opts: {
  projectId: number;
  scriptId: number;
  json: StructuredScriptJson;
  episodeIndex?: number;
}): Promise<SyncDiffResult> {
  const { projectId, scriptId, json, episodeIndex = 0 } = opts;
  const ep = json.episodes![episodeIndex];
  if (!ep) throw new Error("episode not found");

  await saveStructuredSource(projectId, json);

  if (json.productionSpec) {
    const specRow = await u.db("o_agentWorkData").where({ projectId, key: "productionSpec" }).first();
    const data = JSON.stringify(json.productionSpec);
    if (specRow?.id) await u.db("o_agentWorkData").where("id", specRow.id).update({ data, updateTime: Date.now() });
    else
      await u.db("o_agentWorkData").insert({
        projectId,
        key: "productionSpec",
        data,
        createTime: Date.now(),
        updateTime: Date.now(),
      });
  }

  await u.db("o_script").where("id", scriptId).update({ content: ep.script ?? "" });

  const existing = await u.db("o_storyboard").where({ scriptId, projectId }).orderBy("index", "asc");
  const existingByShotNo = new Map<number, (typeof existing)[0]>();
  for (const row of existing) {
    if (row.shotMeta) {
      try {
        const meta = JSON.parse(row.shotMeta) as StructuredShot;
        existingByShotNo.set(meta.镜号, row);
      } catch {
        /* skip */
      }
    }
  }

  const newShots = ep.storyboard ?? [];
  const newShotNos = new Set(newShots.map((s) => s.镜号));
  const changedShots: number[] = [];
  const newShotNosList: number[] = [];
  const archivedShots: number[] = [];
  const dirtyShots: number[] = [];
  const suggestions: SyncDiffResult["suggestions"] = [];

  for (const shot of newShots) {
    const img = compileImage(shot, { json, episode: ep });
    const vid = compileVideo(shot, { json, episode: ep });
    const hash = compileHash({ shot: shot.镜号, img, vid });
    const row = existingByShotNo.get(shot.镜号);

    if (!row) {
      newShotNosList.push(shot.镜号);
      dirtyShots.push(shot.镜号);
      suggestions.push({ 镜号: shot.镜号, targets: ["image", "video"] });
      continue;
    }

    if (row.promptSourceHash !== hash) {
      changedShots.push(shot.镜号);
      dirtyShots.push(shot.镜号);
      const targets: ("image" | "video")[] = [];
      if (row.prompt !== img.prompt) targets.push("image");
      if (row.videoPrompt !== vid.prompt) targets.push("video");
      if (!targets.length) targets.push("image", "video");
      suggestions.push({ storyboardId: row.id, 镜号: shot.镜号, targets });

      await u.db("o_storyboard").where("id", row.id).update({
        prompt: img.prompt,
        videoPrompt: vid.prompt,
        videoDesc: img.videoDesc,
        duration: String(img.duration),
        shotMeta: JSON.stringify(shot),
        promptSourceHash: hash,
        state: "dirty",
      });
    } else {
      await u.db("o_storyboard").where("id", row.id).update({
        shotMeta: JSON.stringify(shot),
        videoDesc: img.videoDesc,
      });
    }
  }

  for (const row of existing) {
    if (!row.shotMeta) continue;
    try {
      const meta = JSON.parse(row.shotMeta) as StructuredShot;
      if (!newShotNos.has(meta.镜号)) {
        archivedShots.push(meta.镜号);
        await u.db("o_storyboard").where("id", row.id).update({ state: "archived" });
      }
    } catch {
      /* skip */
    }
  }

  return { changedShots, newShots: newShotNosList, archivedShots, dirtyShots, suggestions };
}
