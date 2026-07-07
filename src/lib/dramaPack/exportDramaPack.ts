import u from "@/utils";
import { DRAMA_PACK_VERSION, DramaPack, parseLockCode } from "./schema";

export type ExportOptions = {
  projectId: number;
  scriptIds?: number[];
};

function parseVideoDesc(videoDesc: string) {
  const parenMatch = videoDesc.match(/^（(.+)）$/);
  if (parenMatch) {
    const parts = parenMatch[1].split("、");
    return {
      content: parts[0]?.trim() || "",
      sceneName: parts[1]?.trim() || "",
      assetNames: parts[2]?.trim() || "",
      duration: parts[3]?.trim() || "",
      shotType: parts[4]?.trim() || "",
      dialogue: parts[9]?.trim() || "",
      sound: parts[10]?.trim() || "",
      visualId: parts[7]?.trim() || "",
      time: "",
    };
  }
  const get = (label: string) => {
    const m = videoDesc.match(new RegExp(`${label}[：:]([^；;]+)`));
    return m?.[1]?.trim() || "";
  };
  return {
    content: videoDesc.split(/；/)[0]?.trim() || videoDesc,
    sound: get("音效"),
    dialogue: get("台词"),
    visualId: get("视觉标识"),
    time: get("时间"),
    shotType: get("景别"),
    sceneName: "",
    assetNames: "",
    duration: "",
  };
}

export async function exportDramaPack(options: ExportOptions): Promise<DramaPack> {
  const { projectId, scriptIds } = options;
  const project = await u.db("o_project").where("id", projectId).first();
  if (!project) throw new Error(`项目 ${projectId} 不存在`);

  const planRow = await u.db("o_agentWorkData").where({ projectId, key: "scriptAgent" }).first();
  const planData = planRow?.data ? JSON.parse(planRow.data) : {};

  const assets = await u.db("o_assets").where({ projectId }).whereNull("assetsId");
  const characters: DramaPack["plan"]["visualLock"]["characters"] = [];
  const scenes: DramaPack["plan"]["visualLock"]["scenes"] = [];
  const props: DramaPack["plan"]["visualLock"]["props"] = [];

  for (const a of assets) {
    const code = parseLockCode(a.remark);
    if (!code) continue;
    const item = {
      code,
      name: a.name || "",
      prompt: a.prompt || "",
      desc: a.describe || "",
    };
    if (a.type === "role") characters.push(item);
    else if (a.type === "scene") scenes.push(item);
    else if (a.type === "tool") props.push(item);
  }

  let globalStyle: DramaPack["plan"]["visualLock"]["globalStyle"];
  if (planData.visualLockGlobal) {
    try {
      globalStyle = JSON.parse(planData.visualLockGlobal);
    } catch {
      globalStyle = undefined;
    }
  }

  let scriptQuery = u.db("o_script").where("projectId", projectId);
  if (scriptIds?.length) scriptQuery = scriptQuery.whereIn("id", scriptIds);
  const scripts = await scriptQuery.orderBy("createTime");

  const episodes: DramaPack["episodes"] = [];
  for (const script of scripts) {
    const prodRow = await u.db("o_agentWorkData").where({ projectId, episodesId: script.id, key: "productionAgent" }).first();
    const flow = prodRow?.data ? JSON.parse(prodRow.data) : {};

    const boards = await u.db("o_storyboard").where("scriptId", script.id).orderBy("index");
    const storyboard = await Promise.all(
      boards.map(async (b) => {
        const assetCodes = await u
          .db("o_assets2Storyboard")
          .leftJoin("o_assets", "o_assets.id", "o_assets2Storyboard.assetId")
          .where("storyboardId", b.id)
          .select("o_assets.remark");
        const codes = assetCodes.map((r) => parseLockCode(r.remark)).filter(Boolean) as string[];
        const parsed = parseVideoDesc(b.videoDesc || "");
        return {
          time: parsed.time,
          shotType: parsed.shotType,
          visualId: parsed.visualId,
          content: parsed.content,
          sound: parsed.sound,
          dialogue: parsed.dialogue,
          duration: Number(b.duration) || 3,
          assetCodes: codes,
          imagePrompt: b.prompt || "",
          videoPrompt: b.videoPrompt || "",
          track: b.track || "",
        };
      }),
    );

    episodes.push({
      name: script.name || "",
      script: script.content || flow.script || "",
      emotionBeats: flow.emotionBeats || "",
      dialogueValidation: flow.dialogueValidation || "",
      directorNotes: flow.directorNotes || "",
      rhythmReview: flow.rhythmReview || "",
      sensoryReview: flow.sensoryReview || "",
      storyboard,
      keyPrompts: flow.keyPrompts || [],
    });
  }

  return {
    version: DRAMA_PACK_VERSION,
    meta: {
      title: project.name || "",
      episodeCount: episodes.length,
      tone: planData.stylePosition ? planData.stylePosition.slice(0, 200) : undefined,
      artStyleHint: project.artStyle || undefined,
    },
    plan: {
      storySkeleton: planData.storySkeleton || "",
      adaptationStrategy: planData.adaptationStrategy || "",
      stylePosition: planData.stylePosition || "",
      adaptationMatrix: planData.adaptationMatrix || "",
      characterBible: planData.characterBible || "",
      dialogueStyleAnchor: planData.dialogueStyleAnchor || "",
      visualLock: { characters, scenes, props, globalStyle },
    },
    episodes,
  };
}
