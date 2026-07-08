import u from "@/utils";
import type { StructuredScriptJson, StructuredShot, SyncDiffResult, ShotDiffEntry } from "./types";
import { compileImage, compileVideo } from "../generationContext/PromptCompiler";
import { compileHash } from "./utils";
import { saveStructuredSource } from "./importPipeline";
import { diffShotFields, inferImpact, buildRecommendationReason } from "./diffExplainer";
import { appendSyncRevision } from "./promptHistory";
import { getAutoApplyPolicy } from "./autoApplyPolicy";
import { applyStructuredPlan } from "./applyPlan";

export async function syncStructuredEpisode(opts: {
  projectId: number;
  scriptId: number;
  json: StructuredScriptJson;
  episodeIndex?: number;
  triggerAutoApply?: boolean;
}): Promise<SyncDiffResult> {
  const { projectId, scriptId, json, episodeIndex = 0, triggerAutoApply = true } = opts;
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
  const diffByShot: ShotDiffEntry[] = [];

  for (const shot of newShots) {
    const img = compileImage(shot, { json, episode: ep });
    const vid = compileVideo(shot, { json, episode: ep });
    const hash = compileHash({ shot: shot.镜号, img, vid });
    const row = existingByShotNo.get(shot.镜号);

    if (!row) {
      newShotNosList.push(shot.镜号);
      dirtyShots.push(shot.镜号);
      suggestions.push({ 镜号: shot.镜号, targets: ["image", "video"] });
      diffByShot.push({
        shotNo: shot.镜号,
        hashAfter: hash,
        changedFields: ["*"],
        impact: "both",
        recommendationReason: "新增镜头，需完整生成",
        handlersHit: { ...(img.compileLog.handlers as object), ...(vid.compileLog.handlers as object) },
        promptAfter: img.prompt,
        videoPromptAfter: vid.prompt,
      });
      continue;
    }

    let beforeShot: StructuredShot | null = null;
    if (row.shotMeta) {
      try {
        beforeShot = JSON.parse(row.shotMeta) as StructuredShot;
      } catch {
        beforeShot = null;
      }
    }

    const changedFields = beforeShot ? diffShotFields(beforeShot, shot) : ["shotMeta"];
    const hashBefore = row.promptSourceHash ?? undefined;
    const imageChanged = row.prompt !== img.prompt;
    const videoChanged = row.videoPrompt !== vid.prompt;
    const impact = inferImpact(changedFields, imageChanged, videoChanged);

    if (row.promptSourceHash !== hash) {
      changedShots.push(shot.镜号);
      dirtyShots.push(shot.镜号);
      const targets: ("image" | "video")[] = [];
      if (imageChanged) targets.push("image");
      if (videoChanged) targets.push("video");
      if (!targets.length) targets.push("image", "video");
      suggestions.push({ storyboardId: row.id, 镜号: shot.镜号, targets });

      const diffEntry: ShotDiffEntry = {
        shotNo: shot.镜号,
        storyboardId: row.id,
        hashBefore,
        hashAfter: hash,
        changedFields,
        impact,
        recommendationReason: buildRecommendationReason(changedFields, {
          ...(img.compileLog.handlers as object),
          ...(vid.compileLog.handlers as object),
        } as Record<string, unknown>),
        handlersHit: { ...(img.compileLog.handlers as object), ...(vid.compileLog.handlers as object) },
        promptBefore: row.prompt ?? undefined,
        promptAfter: img.prompt,
        videoPromptBefore: row.videoPrompt ?? undefined,
        videoPromptAfter: vid.prompt,
      };
      diffByShot.push(diffEntry);

      await u.db("o_storyboard").where("id", row.id).update({
        prompt: img.prompt,
        videoPrompt: vid.prompt,
        videoDesc: img.videoDesc,
        duration: String(img.duration),
        shotMeta: JSON.stringify(shot),
        promptSourceHash: hash,
        state: "dirty",
        reason: JSON.stringify({ compileLog: { image: img.compileLog, video: vid.compileLog }, syncDiff: diffEntry }),
      });

      await appendSyncRevision({
        projectId,
        scriptId,
        storyboardId: row.id!,
        revision: {
          at: Date.now(),
          hashBefore,
          hashAfter: hash,
          changedFields,
          prompt: img.prompt,
          videoPrompt: vid.prompt,
          impact,
          reason: diffEntry.recommendationReason,
        },
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
        diffByShot.push({
          shotNo: meta.镜号,
          storyboardId: row.id,
          changedFields: ["archived"],
          impact: "both",
          recommendationReason: "镜头已从 JSON 移除，已归档保留原资源",
        });
      }
    } catch {
      /* skip */
    }
  }

  const result: SyncDiffResult = {
    changedShots,
    newShots: newShotNosList,
    archivedShots,
    dirtyShots,
    suggestions,
    diffByShot,
  };

  if (triggerAutoApply && dirtyShots.length) {
    const policy = await getAutoApplyPolicy(projectId, scriptId);
    if (policy.enabled && policy.autoApplyOnSync) {
      const applyResult = await applyStructuredPlan({
        projectId,
        scriptId,
        mode: "syncApply",
        scope: policy.scope === "all" ? "all" : "dirty",
        policy,
      });
      result.autoApplyResult = {
        started: !applyResult.skipped,
        taskId: applyResult.taskId,
        message: applyResult.message,
        planSummary: applyResult.planSummary as Record<string, unknown>,
      };
    }
  }

  return result;
}
