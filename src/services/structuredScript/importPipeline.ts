import u from "@/utils";

import type { StructuredScriptJson, StructuredShot } from "./types";

import { fourViewPrompt, mapStoryboardRow, stripPrompt } from "./mapper";

import { registerDeriveVariants } from "./deriveVariant";



export type AssetCodeMap = Map<string, number>;



async function upsertAsset(

  projectId: number,

  scriptId: number,

  code: string,

  type: "role" | "scene" | "tool",

  name: string,

  prompt: string,

  codeMap: AssetCodeMap,

): Promise<number> {

  const existing = await u

    .db("o_assets")

    .where({ projectId, remark: code })

    .first();

  if (existing?.id) {

    await u.db("o_assets").where("id", existing.id).update({ prompt, name, describe: name });

    codeMap.set(code, existing.id);

    return existing.id;

  }

  const [id] = await u.db("o_assets").insert({

    projectId,

    scriptId,

    name,

    describe: name,

    type,

    remark: code,

    prompt,

    startTime: Date.now(),

  });

  codeMap.set(code, id);

  return id;

}



function collectScenePropFromShots(shots: StructuredShot[]) {

  const scenes = new Map<string, string>();

  const props = new Map<string, string>();

  for (const shot of shots) {

    if (shot.type === "PURE-SCENE" && shot.imagePrompt) {

      for (const c of shot.assetCodes ?? []) {

        if (c.startsWith("SCENE-")) scenes.set(c, stripPrompt(shot.imagePrompt));

      }

    }

    if (shot.type === "PURE-PROP" && shot.imagePrompt) {

      for (const c of shot.assetCodes ?? []) {

        if (c.startsWith("PROP-")) props.set(c, stripPrompt(shot.imagePrompt));

      }

    }

  }

  return { scenes, props };

}



export async function importStructuredEpisode(opts: {

  projectId: number;

  json: StructuredScriptJson;

  episodeIndex?: number;

  updateProjectMeta?: boolean;

}): Promise<{ scriptId: number; storyboardIds: number[]; codeMap: AssetCodeMap; deriveCount: number }> {

  const { projectId, json, episodeIndex = 0, updateProjectMeta = true } = opts;

  const ep = json.episodes![episodeIndex];

  if (!ep) throw new Error("episode not found");



  if (updateProjectMeta && json.meta?.title) {

    await u.db("o_project").where("id", projectId).update({

      name: json.meta.title,

      intro: json.meta.叙事内核 ?? json.meta.tone ?? "",

      artStyle: json.meta.artStyleHint ?? undefined,

    });

  }



  await u.db("o_agentWorkData").where({ projectId, key: "productionSpec" }).delete();

  if (json.productionSpec) {

    await u.db("o_agentWorkData").insert({

      projectId,

      key: "productionSpec",

      data: JSON.stringify(json.productionSpec),

      createTime: Date.now(),

      updateTime: Date.now(),

    });

  }



  await saveStructuredSource(projectId, json);



  const codeMap: AssetCodeMap = new Map();

  const charAssets = json.characterAssets ?? {};

  for (const [code, data] of Object.entries(charAssets)) {

    const name = String(data.name ?? code);

    await upsertAsset(projectId, 0, code, "role", name, fourViewPrompt(data), codeMap);

  }



  const shots = ep.storyboard ?? [];

  const { scenes, props } = collectScenePropFromShots(shots);

  for (const [code, prompt] of scenes) {

    await upsertAsset(projectId, 0, code, "scene", code, prompt, codeMap);

  }

  for (const [code, prompt] of props) {

    await upsertAsset(projectId, 0, code, "tool", code, prompt, codeMap);

  }



  let scriptRow = await u.db("o_script").where({ projectId, name: ep.name }).first();

  let scriptId: number;

  if (scriptRow?.id) {

    scriptId = scriptRow.id;

    await u.db("o_script").where("id", scriptId).update({ content: ep.script ?? "", createTime: Date.now() });

    await u.db("o_storyboard").where("scriptId", scriptId).delete();

    await u.db("o_videoTrack").where("scriptId", scriptId).delete();

  } else {

    [scriptId] = await u.db("o_script").insert({

      projectId,

      name: ep.name,

      content: ep.script ?? "",

      createTime: Date.now(),

    });

  }



  const deriveCount = await registerDeriveVariants(projectId, scriptId, json, shots, codeMap);



  for (const code of codeMap.keys()) {

    const assetId = codeMap.get(code)!;

    const link = await u.db("o_scriptAssets").where({ scriptId, assetId }).first();

    if (!link) await u.db("o_scriptAssets").insert({ scriptId, assetId });

    await u.db("o_assets").where("id", assetId).update({ scriptId });

  }



  if (json.continuityTracking) {

    await u.db("o_agentWorkData").where({ projectId, episodesId: scriptId, key: "continuity" }).delete();

    await u.db("o_agentWorkData").insert({

      projectId,

      episodesId: scriptId,

      key: "continuity",

      data: JSON.stringify(json.continuityTracking),

      createTime: Date.now(),

      updateTime: Date.now(),

    });

  }



  await u.db("o_agentWorkData").where({ projectId, episodesId: scriptId, key: "postProductionQueue" }).delete();

  await u.db("o_agentWorkData").insert({

    projectId,

    episodesId: scriptId,

    key: "postProductionQueue",

    data: JSON.stringify({ tasks: [], createdAt: Date.now() }),

    createTime: Date.now(),

    updateTime: Date.now(),

  });



  const storyboardIds: number[] = [];

  for (let i = 0; i < shots.length; i++) {

    const shot = shots[i];

    const mapped = mapStoryboardRow({ shot, scriptId, projectId, index: i, json, episodeIndex });



    const trackId = Date.now() + i;



    await u.db("o_videoTrack").insert({

      id: trackId,

      scriptId,

      projectId,

      duration: mapped.trackDuration,

      prompt: mapped.trackPrompt,

      promptSource: "structuredImport",

      state: "未生成",

    });



    const inserted = (await u.db("o_storyboard").insert({

      scriptId,

      projectId,

      prompt: mapped.prompt,

      videoPrompt: mapped.videoPrompt,

      videoDesc: mapped.videoDesc,

      duration: mapped.duration,

      track: mapped.track,

      trackId,

      shotMeta: mapped.shotMeta,

      promptSource: mapped.promptSource,

      promptSourceHash: mapped.promptSourceHash,

      state: mapped.state,

      shouldGenerateImage: mapped.shouldGenerateImage,

      index: i,

      reason: JSON.stringify({ compileLog: mapped.compileLog }),

      createTime: Date.now(),

    })) as number[];

    const sbId = inserted[0]!;



    storyboardIds.push(sbId);



    const assetIds = (shot.assetCodes ?? [])

      .map((c) => codeMap.get(c))

      .filter((id): id is number => id != null);

    if (assetIds.length) {

      await u.db("o_assets2Storyboard").insert(

        assetIds.map((assetId) => ({ assetId, storyboardId: sbId })),

      );

    }

  }



  await u.db("o_agentWorkData").where({ projectId, episodesId: scriptId, key: "structuredEpisode" }).delete();

  await u.db("o_agentWorkData").insert({

    projectId,

    episodesId: scriptId,

    key: "structuredEpisode",

    data: JSON.stringify({ episodeIndex, directorNotes: ep.directorNotes, keyPrompts: ep.keyPrompts }),

    createTime: Date.now(),

    updateTime: Date.now(),

  });



  return { scriptId, storyboardIds, codeMap, deriveCount };

}



export async function saveStructuredSource(projectId: number, json: StructuredScriptJson) {

  const row = await u.db("o_agentWorkData").where({ projectId, key: "structuredSource" }).first();

  const payload = JSON.stringify({ json, revision: Date.now(), version: json.version ?? "1.0" });

  if (row?.id) {

    await u.db("o_agentWorkData").where("id", row.id).update({ data: payload, updateTime: Date.now() });

  } else {

    await u.db("o_agentWorkData").insert({

      projectId,

      key: "structuredSource",

      data: payload,

      createTime: Date.now(),

      updateTime: Date.now(),

    });

  }

}



export async function loadStructuredSource(projectId: number): Promise<StructuredScriptJson | null> {

  const row = await u.db("o_agentWorkData").where({ projectId, key: "structuredSource" }).first();

  if (!row?.data) return null;

  try {

    const parsed = JSON.parse(row.data);

    return parsed.json ?? parsed;

  } catch {

    return null;

  }

}


