import type {
  CompileImageResult,
  CompileVideoResult,
  EffectStack,
  StructuredEpisode,
  StructuredScriptJson,
  StructuredShot,
} from "../structuredScript/types";
import {
  buildVideoDesc,
  isMemoryPointShot,
  parseShotDuration,
  parseShotNumbersFromNotes,
  stripCrefSref,
} from "../structuredScript/utils";
import { routeAudio } from "./AudioRouter";
import { compileCharacterDesign } from "./CharacterDesignMatcher";
import { matchCreativeIntent } from "./CreativeIntentMatcher";
import { adaptDuration } from "./DurationAdapter";
import { linkEmotionMotion } from "./EmotionMotionLinker";
import { getModelCapabilities } from "./ModelCapabilityRegistry";
import { routePostProduction } from "./PostProductionRouter";
import { resolveAspectRatio, resolveReferenceCodes } from "./ReferenceResolver";
import { applyFieldHandlers } from "./fieldHandlers/registry";
import type { CompileContext, ImageConfig, VideoConfig } from "./types";

function defaultEffectStack(shot: StructuredShot, episode?: StructuredEpisode): EffectStack {
  const custom = shot.effectStack ?? {};
  const hasDialogue = !!(shot.dialogue?.text || shot.voiceover);
  const hasVfx = !!shot.visualEffect;
  const memory = episode?.productLayer ? isMemoryPointShot(shot.镜号, episode.productLayer as Record<string, unknown>) : false;
  const directorMap = episode?.directorNotes ? parseShotNumbersFromNotes(episode.directorNotes) : new Map();

  let motion: EffectStack["motion"] = "basic";
  if (custom.motion) motion = custom.motion;
  else if (hasVfx || memory || directorMap.has(shot.镜号) || shot.personalitySwitch?.enabled) motion = "enhanced";
  else if (shot.type === "PURE-SCENE") motion = "basic";

  let voice: EffectStack["voice"] = "auto";
  if (custom.voice) voice = custom.voice;
  else if (hasDialogue) voice = "video_native";
  else voice = "off";

  let sfx: EffectStack["sfx"] = "auto";
  if (custom.sfx) sfx = custom.sfx;
  else if (hasVfx) sfx = "post_layer";
  else if (shot.sound?.音效 && shot.sound.音效 !== "无") sfx = "prompt_only";

  return { voice, motion, sfx };
}

function applyProductionSpecColor(prompt: string, shot: StructuredShot, spec?: Record<string, unknown>): string {
  const mapping = spec?.colorToneMapping as Record<string, { tone?: string; colorTemp?: number | string }> | undefined;
  const tone = shot.colorTone;
  if (tone && mapping?.[tone]) {
    const m = mapping[tone];
    return `${prompt}, color tone ${m.tone ?? tone}, color temperature ${m.colorTemp ?? ""}K`;
  }
  return prompt;
}

function applyTypeRules(prompt: string, shot: StructuredShot, spec?: Record<string, unknown>): string {
  const rules = spec?.imagePromptRules as Record<string, string> | undefined;
  const type = shot.type ?? "CHAR-SCENE";
  if (rules?.[type] && !prompt.includes("no people")) {
    if (type === "PURE-SCENE" && !/no people/i.test(prompt)) return `${prompt}, no people, no characters`;
    if (type === "PURE-PROP" && !/no hands/i.test(prompt)) return `${prompt}, isolated, no hands, no person`;
  }
  return prompt;
}

function applyPerformance(prompt: string, shot: StructuredShot): string {
  const p = shot.performance as Record<string, unknown> | undefined;
  if (!p) return prompt;
  const parts: string[] = [];
  for (const k of ["breath", "gaze", "hands", "mouth", "shoulders"]) {
    if (p[k]) parts.push(`${k}: ${p[k]}`);
  }
  const micro = p.microExpression as Record<string, string> | undefined;
  if (micro) parts.push(`expression: ${JSON.stringify(micro)}`);
  return parts.length ? `${prompt}, ${parts.join(", ")}` : prompt;
}

function applyCameraAnchor(prompt: string, shot: StructuredShot, spec?: Record<string, unknown>): string {
  const anchors = spec?.cameraAnchor as Record<string, string> | undefined;
  if (shot.cameraAngle && anchors?.[shot.cameraAngle]) {
    return `${prompt}, camera: ${anchors[shot.cameraAngle]}`;
  }
  if (shot.shotType) return `${prompt}, shot type: ${shot.shotType}`;
  return prompt;
}

export function compileImage(
  shot: StructuredShot,
  ctx: { json: StructuredScriptJson; episode?: StructuredEpisode; imageModel?: string; videoModel?: string },
): ImageConfig {
  const { json, episode } = ctx;
  const spec = json.productionSpec as Record<string, unknown> | undefined;
  const compileCtx: CompileContext = { json, episode, spec };
  const effectStack = defaultEffectStack(shot, episode);
  const creative = matchCreativeIntent(shot, episode);

  let prompt = creative.imageOverride ?? shot.imagePrompt ?? "";
  prompt = stripCrefSref(prompt);
  prompt = applyTypeRules(prompt, shot, spec);
  prompt = applyProductionSpecColor(prompt, shot, spec);
  prompt = applyPerformance(prompt, shot);
  prompt = applyCameraAnchor(prompt, shot, spec);

  const charDesign = compileCharacterDesign(shot, json.characterAssets);
  if (charDesign && !prompt.includes(charDesign.slice(0, 16))) prompt = `${charDesign}, ${prompt}`;

  const emotion = linkEmotionMotion(shot, spec, "image");
  if (emotion) prompt = `${prompt}, ${emotion}`;

  const handlerPatch = applyFieldHandlers(compileCtx, shot, "image");
  if (handlerPatch.promptPrepend) prompt = `${handlerPatch.promptPrepend}, ${prompt}`;
  if (handlerPatch.promptAppend) prompt = `${prompt}, ${handlerPatch.promptAppend}`;

  if (json.meta?.tone) prompt = `${prompt}, tone: ${json.meta.tone}`;

  const duration = parseShotDuration(shot.time, shot.dialogue);
  const referenceAssetCodes = handlerPatch.referenceAssetCodes ?? resolveReferenceCodes(shot);
  const postTasks = routePostProduction(shot);

  return {
    prompt: prompt.trim(),
    videoDesc: buildVideoDesc(shot) + (handlerPatch.videoDescAppend ?? ""),
    duration,
    aspectRatio: handlerPatch.aspectRatio ?? resolveAspectRatio(shot),
    referenceAssetCodes,
    effectStack,
    postTasks,
    compileLog: {
      镜号: shot.镜号,
      effectStack,
      tier: creative.tier,
      promptLength: prompt.length,
      handlers: handlerPatch.compileLog,
    },
  };
}

export function compileVideo(
  shot: StructuredShot,
  ctx: { json: StructuredScriptJson; episode?: StructuredEpisode; imageModel?: string; videoModel?: string },
): VideoConfig {
  const { json, episode } = ctx;
  const spec = json.productionSpec as Record<string, unknown> | undefined;
  const compileCtx: CompileContext = { json, episode, spec };
  const caps = getModelCapabilities(ctx.imageModel, ctx.videoModel);
  const effectStack = defaultEffectStack(shot, episode);
  const creative = matchCreativeIntent(shot, episode);
  const audioRoute = routeAudio(shot, effectStack, caps);

  let prompt = creative.videoOverride ?? shot.videoPrompt ?? shot.imagePrompt ?? "";
  if (shot.dialogue?.text) {
    const lead = shot.dialogue.type === "情绪爆发" ? "action before dialogue 0.3s, " : "";
    prompt = `${lead}${prompt}, character says: "${shot.dialogue.text}"`;
  }
  if (shot.voiceover && !shot.dialogue?.text) {
    const vo = shot.voiceover as Record<string, string>;
    if (vo.text) prompt = `${prompt}, voiceover: "${vo.text}"`;
  }
  if (shot.performance?.transition) {
    prompt = `${prompt}, transition: ${shot.performance.transition}`;
  }
  if (shot.transitionType === "慢放") prompt = `${prompt}, slow motion`;
  if (effectStack.sfx === "prompt_only" && shot.sound?.音效) {
    prompt = `${prompt}, sound effect: ${shot.sound.音效}`;
  }

  const emotion = linkEmotionMotion(shot, spec, "video");
  if (emotion) prompt = `${prompt}, ${emotion}`;

  const handlerPatch = applyFieldHandlers(compileCtx, shot, "video");
  if (handlerPatch.promptAppend) prompt = `${prompt}, ${handlerPatch.promptAppend}`;

  const { duration, speedAdjust } = adaptDuration(shot, caps);

  let mode: string | string[] = handlerPatch.mode ?? "singleImage";
  if (shot.personalitySwitch?.enabled && shot.personalitySwitch.progress !== "100%") {
    mode = "startEndRequired";
  }
  if (effectStack.motion === "enhanced" && !shot.personalitySwitch?.enabled) {
    prompt = `${prompt}, cinematic motion, enhanced camera movement`;
  }

  const postTasks = [...routePostProduction(shot), ...audioRoute.postTasks];
  if (speedAdjust > 1.01) {
    postTasks.push({
      type: "speed_adjust",
      shotNo: shot.镜号,
      payload: { speedAdjust, targetDuration: parseShotDuration(shot.time, shot.dialogue) },
    });
  }

  return {
    prompt: prompt.trim(),
    duration: handlerPatch.duration ?? duration,
    mode,
    audio: handlerPatch.audio ?? audioRoute.audio,
    effectStack,
    postTasks,
    speedAdjust,
    compileLog: {
      镜号: shot.镜号,
      effectStack,
      speedAdjust,
      audio: audioRoute.audio,
      voice: audioRoute.voice,
      tier: creative.tier,
    },
  };
}

export function buildPreview(ctx: {
  json: StructuredScriptJson;
  episodeIndex?: number;
}): import("../structuredScript/types").ImportPreviewResult {
  const ep = ctx.json.episodes![ctx.episodeIndex ?? 0];
  const shots = ep.storyboard ?? [];
  const charAssets = ctx.json.characterAssets ?? {};
  const sceneCodes = new Set<string>();
  const propCodes = new Set<string>();

  for (const s of shots) {
    for (const c of s.assetCodes ?? []) {
      if (c.startsWith("SCENE-")) sceneCodes.add(c);
      if (c.startsWith("PROP-")) propCodes.add(c);
    }
  }

  const warnings: string[] = [];
  if (ctx.json.version && ctx.json.version !== "1.0") warnings.push(`JSON version ${ctx.json.version}, expected 1.0`);

  return {
    episodeName: ep.name,
    shotCount: shots.length,
    characterCount: Object.keys(charAssets).length,
    sceneCount: sceneCodes.size,
    propCount: propCodes.size,
    fieldCoverage: {
      G0: shots.filter((s) => s.imagePrompt && s.videoPrompt).length,
      G1: shots.filter((s) => s.performance && s.colorTone).length,
      G4: shots.filter((s) => s.sound).length,
    },
    warnings,
    shots: shots.map((s) => {
      const img = compileImage(s, { json: ctx.json, episode: ep });
      return {
        镜号: s.镜号,
        visualId: s.visualId,
        duration: img.duration,
        imagePromptPreview: img.prompt.slice(0, 120),
      };
    }),
  };
}
