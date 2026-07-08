import type { StructuredScriptJson, StructuredShot } from "./types";
import { buildVideoDesc, compileHash, parseShotDuration, stripCrefSref } from "./utils";
import { compileImage, compileVideo } from "../generationContext/PromptCompiler";
export interface StoryboardRowInput {
  shot: StructuredShot;
  scriptId: number;
  projectId: number;
  index: number;
  json: StructuredScriptJson;
  episodeIndex?: number;
}

export interface MappedStoryboardRow {
  prompt: string;
  videoPrompt: string;
  videoDesc: string;
  duration: string;
  track: string;
  shotMeta: string;
  promptSource: string;
  promptSourceHash: string;
  state: string;
  shouldGenerateImage: number;
  trackDuration: number;
  trackPrompt: string;
  compileLog: Record<string, unknown>;
}

export function mapStoryboardRow(input: StoryboardRowInput): MappedStoryboardRow {
  const { shot, json } = input;
  const ep = json.episodes![input.episodeIndex ?? 0];
  const img = compileImage(shot, { json, episode: ep });
  const vid = compileVideo(shot, { json, episode: ep });
  const hash = compileHash({ shot: shot.镜号, img, vid });

  return {
    prompt: img.prompt,
    videoPrompt: vid.prompt,
    videoDesc: img.videoDesc || buildVideoDesc(shot),
    duration: String(img.duration || parseShotDuration(shot.time, shot.dialogue)),
    track: `镜${String(shot.镜号).padStart(2, "0")}`,
    shotMeta: JSON.stringify(shot),
    promptSource: "structuredImport",
    promptSourceHash: hash,
    state: "未生成",
    shouldGenerateImage: shot.type === "PURE-SCENE" ? 1 : 1,
    trackDuration: vid.duration,
    trackPrompt: vid.prompt,
    compileLog: { image: img.compileLog, video: vid.compileLog, postTasks: [...img.postTasks, ...vid.postTasks] },
  };
}

export function stripPrompt(p: string) {
  return stripCrefSref(p);
}

export function fourViewPrompt(charData: Record<string, unknown>): string {
  const views = charData["四视图"] as { 完整提示词?: string } | undefined;
  return views?.完整提示词 ?? String(charData["分镜引用prompt_日常"] ?? charData.name ?? "");
}
