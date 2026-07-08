import u from "@/utils";

import { v4 as uuidv4 } from "uuid";

import type { ReferenceList } from "@/utils/ai";

import { compileImage, compileVideo } from "../generationContext/PromptCompiler";

import { runQualityGate } from "../generationContext/QualityGate";

import { routeModels } from "../generationContext/ModelRouter";

import { assembleTimeline } from "../generationContext/TimelineAssembler";

import { getAssetIdsByStoryboard, resolveProjectModels, resolveReferenceImages } from "./assetResolver";

import type { StructuredShot, EffectStack } from "./types";

import { loadStructuredSource } from "./importPipeline";



async function appendPostProductionQueue(projectId: number, scriptId: number, shotNo: number, tasks: unknown[]) {

  if (!tasks.length) return;

  const row = await u.db("o_agentWorkData").where({ projectId, episodesId: scriptId, key: "postProductionQueue" }).first();

  const data = row?.data ? JSON.parse(row.data) : { tasks: [] };

  data.tasks.push(...tasks.map((t) => ({ ...t as object, shotNo, addedAt: Date.now() })));

  if (row?.id) await u.db("o_agentWorkData").where("id", row.id).update({ data: JSON.stringify(data), updateTime: Date.now() });

}



export async function generateStoryboardImage(

  storyboardId: number,

  projectId: number,

  tier: "1K" | "2K" | "4K" = "2K",

  effectStackOverride?: Partial<EffectStack>,

) {

  const sb = await u.db("o_storyboard").where("id", storyboardId).first();

  if (!sb) throw new Error("分镜不存在");



  const shot: StructuredShot | null = sb.shotMeta ? JSON.parse(sb.shotMeta) : null;

  const json = await loadStructuredSource(projectId);

  const models = await resolveProjectModels(projectId);

  let prompt = sb.prompt!;

  let compileLog: Record<string, unknown> = {};

  let postTasks: unknown[] = [];



  if (shot && json) {

    const ep = json.episodes?.find((e) => e.storyboard?.some((s) => s.镜号 === shot.镜号));

    if (effectStackOverride) shot.effectStack = { ...shot.effectStack, ...effectStackOverride };

    const compiled = compileImage(shot, { json, episode: ep, ...models });

    prompt = compiled.prompt;

    compileLog = compiled.compileLog ?? {};

    postTasks = compiled.postTasks;

    routeModels(shot, models, { productLayer: ep?.productLayer as Record<string, unknown> });

  }



  const assetIds = await getAssetIdsByStoryboard(storyboardId);

  const referenceList = await resolveReferenceImages(assetIds);



  const gate = runQualityGate({
    shot: shot ?? { 镜号: storyboardId },
    prompt,
    hasReferenceImages: referenceList.length > 0,
  });

  if (!gate.passed) {

    throw new Error(`质量门禁未通过: ${gate.issues.join("; ")}`);

  }



  await u.db("o_storyboard").where("id", storyboardId).update({ state: "生成中" });



  const savePath = `/${projectId}/assets/${sb.scriptId}/${uuidv4()}.jpg`;

  const [imageId] = await u.db("o_image").insert({

    type: "storyboard",

    state: "生成中",

    storyboardId,

    model: models.imageModel.split(/:(.+)/)[1],

    resolution: tier,

  });



  try {

    const imageCls = await u.Ai.Image(models.imageModel).run(

      {

        prompt,

        referenceList,

        size: tier,

        aspectRatio: models.videoRatio,

      },

      {

        taskClass: "结构化分镜图",

        describe: `分镜${storyboardId}`,

        relatedObjects: JSON.stringify({ storyboardId }),

        projectId,

      },

    );

    await imageCls.save(savePath);

    await u.db("o_image").where("id", imageId).update({ state: "已完成", filePath: savePath });

    await u.db("o_storyboard").where("id", storyboardId).update({

      filePath: savePath,

      imageId,

      state: "已完成",

      reason: JSON.stringify({ compileLog: { ...compileLog, tier, qualityGate: gate } }),

    });

    if (sb.scriptId) await appendPostProductionQueue(projectId, sb.scriptId, shot?.镜号 ?? 0, postTasks);

    return { imageId, filePath: savePath, compileLog, qualityGate: gate };

  } catch (e) {

    const msg = u.error(e).message;

    await u.db("o_image").where("id", imageId).update({ state: "生成失败", errorReason: msg });

    await u.db("o_storyboard").where("id", storyboardId).update({ state: "生成失败", reason: msg });

    throw e;

  }

}



export async function generateStoryboardVideo(

  storyboardId: number,

  projectId: number,

  opts?: { resolution?: string; audio?: boolean; effectStack?: Partial<EffectStack> },

) {

  const sb = await u.db("o_storyboard").where("id", storyboardId).first();

  if (!sb?.trackId) throw new Error("分镜或轨道不存在");

  if (!sb.filePath) throw new Error("请先生成分镜图");



  const shot: StructuredShot | null = sb.shotMeta ? JSON.parse(sb.shotMeta) : null;

  const json = await loadStructuredSource(projectId);

  let prompt = sb.videoPrompt || sb.prompt || "";

  let duration = Number(sb.duration) || 3;

  let mode: string | string[] = "singleImage";

  let audio = opts?.audio ?? false;

  let compileLog: Record<string, unknown> = {};

  let postTasks: unknown[] = [];



  const models = await resolveProjectModels(projectId);



  if (shot && json) {

    const ep = json.episodes?.find((e) => e.storyboard?.some((s) => s.镜号 === shot.镜号));

    if (opts?.effectStack) shot.effectStack = { ...shot.effectStack, ...opts.effectStack };

    const route = routeModels(shot, models, { productLayer: ep?.productLayer as Record<string, unknown> });

    const compiled = compileVideo(shot, { json, episode: ep, ...models });

    prompt = compiled.prompt;

    duration = compiled.duration;

    mode = compiled.mode;

    audio = opts?.audio ?? compiled.audio;

    compileLog = compiled.compileLog ?? {};

    postTasks = compiled.postTasks;

    opts = { ...opts, resolution: opts?.resolution ?? route.resolution };

  }



  const videoPath = `/${projectId}/video/${uuidv4()}.mp4`;

  const base64 = await u.oss.getImageBase64(sb.filePath);

  const referenceList: ReferenceList[] = [{ type: "image", base64 }];



  const [videoId] = await u.db("o_video").insert({

    filePath: videoPath,

    time: Date.now(),

    state: "生成中",

    scriptId: sb.scriptId,

    projectId,

    videoTrackId: sb.trackId,

  });



  await u.db("o_videoTrack").where("id", sb.trackId).update({ state: "生成中" });



  const modeData = Array.isArray(mode) ? mode : [mode];

  const resolution = opts?.resolution ?? "720p";



  try {

    const aiVideo = u.Ai.Video(models.videoModel);

    await aiVideo.run(

      {

        prompt,

        referenceList,

        mode: modeData as any,

        duration,

        aspectRatio: (models.videoRatio as "16:9" | "9:16") || "9:16",

        resolution,

        audio,

      },

      {

        projectId,

        taskClass: "结构化分镜视频",

        describe: `分镜视频 ${storyboardId}`,

        relatedObjects: JSON.stringify({ storyboardId, videoId }),

      },

    );

    await aiVideo.save(videoPath);

    await u.db("o_video").where("id", videoId).update({ state: "生成成功" });

    await u.db("o_videoTrack").where("id", sb.trackId).update({

      state: "已完成",

      prompt,

      videoId,

      selectVideoId: videoId,

    });

    await u.db("o_storyboard").where("id", storyboardId).update({

      state: "已完成",

      reason: JSON.stringify({ compileLog }),

    });

    if (sb.scriptId) await appendPostProductionQueue(projectId, sb.scriptId, shot?.镜号 ?? 0, postTasks);

    return { videoId, filePath: videoPath, compileLog };

  } catch (e) {

    const msg = u.error(e).message;

    await u.db("o_video").where("id", videoId).update({ state: "生成失败", errorReason: msg });

    await u.db("o_videoTrack").where("id", sb.trackId).update({ state: "生成失败", reason: msg });

    throw e;

  }

}



export async function assembleEpisodeTimeline(

  scriptId: number,

  projectId: number,

  opts?: { skipConcat?: boolean; includeSfx?: boolean },

) {

  return assembleTimeline({ scriptId, projectId, ...opts });

}



export async function selectActiveVideo(trackId: number, videoId: number) {

  await u.db("o_videoTrack").where("id", trackId).update({ videoId, selectVideoId: videoId });

  return { trackId, videoId };

}


