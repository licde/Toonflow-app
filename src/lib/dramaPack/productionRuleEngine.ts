import type { DramaPack, DramaPackStoryboardShot } from "./schema";
import type { CodeIndex, ComposedShot } from "./promptComposer";
import {
  type PackExtensionsContext,
  mergePackExtensionHints,
  resolveSystemUISound,
} from "./packExtensionsResolver";
import {
  applyImagePromptRules,
  buildPostProductionHints,
  buildPersonalityVideoSuffix,
  formatPerformanceFull,
  mergePerformanceWithMapping,
  resolveWardrobeAssociateCodes,
  type ComposeRuleContext,
} from "./packFieldRegistry";
import { readPersonalitySwitch } from "./personaPolicy";

export type ComposeMode = "merge" | "rebuild";

export type ShotMeta = {
  type?: string;
  visualId?: string;
  sceneName?: string;
  colorTone?: string;
  emotionIntensity?: number;
  performance?: DramaPackStoryboardShot["performance"];
  transitionType?: string;
  transitionDuration?: string;
  cameraAngle?: string;
  characterFacing?: string;
  positionInScene?: string;
  assetCodes?: string[];
  shotType?: string;
  content?: string;
  dialogue?: string;
  sound?: string;
  duration?: number;
  imagePrompt?: string;
  videoPrompt?: string;
  track?: string;
  visualFocus?: Record<string, string>;
  postProductionHints?: Record<string, string>;
  personalitySwitch?: Record<string, unknown>;
  l6Trigger?: string;
};

type TransitionRuleEntry = { duration?: string; states?: number | string };
type DialogueSyncEntry = { actionLead?: string; example?: string };

function classifyDialogueSync(dialogue: string): string | null {
  if (/独白|OS|内心/.test(dialogue)) return "内心独白";
  if (/——|…|\.\.\./.test(dialogue) && dialogue.length < 20) return "欲言又止";
  if (/！|!/.test(dialogue)) return "情绪爆发";
  if (/。/.test(dialogue) && !/！/.test(dialogue)) return "冷淡回应";
  return null;
}

function dialogueActionLead(
  dialogue: string,
  syncRules?: Record<string, DialogueSyncEntry>,
): string {
  if (!dialogue.trim() || !syncRules) return "";
  const category = classifyDialogueSync(dialogue);
  if (!category || !syncRules[category]?.actionLead) return "";
  return `[actionLead:${syncRules[category].actionLead}]`;
}

function resolveSound(
  shot: DramaPackStoryboardShot,
  sceneCode: string | undefined,
  soundDesign?: Record<string, unknown>,
): string {
  if (shot.sound?.trim() && shot.sound !== "—") return shot.sound.trim();
  if (!soundDesign) return "";

  const envSounds = soundDesign["环境音"] as Record<string, string> | undefined;
  if (sceneCode && envSounds?.[sceneCode]) return envSounds[sceneCode];

  const heartbeat = soundDesign["心跳"] as Record<string, string> | undefined;
  if (heartbeat && shot.colorTone) {
    const tone = shot.colorTone;
    if (/社死|恐惧/.test(tone) && heartbeat["恐惧"]) return heartbeat["恐惧"];
    if (/紧张/.test(tone) && heartbeat["紧张"]) return heartbeat["紧张"];
    if (heartbeat["平静"]) return heartbeat["平静"];
  }
  return "";
}

function resolveCameraMotion(
  shot: DramaPackStoryboardShot,
  prevIntensity?: number,
  transitionRules?: Record<string, TransitionRuleEntry>,
  cameraAnchorName?: string,
): string {
  const parts: string[] = [];
  if (cameraAnchorName) parts.push(cameraAnchorName);
  if (shot.transitionType) parts.push(shot.transitionType);
  if (shot.transitionDuration) parts.push(shot.transitionDuration);

  if (transitionRules && prevIntensity != null && shot.emotionIntensity != null) {
    const delta = Math.abs(shot.emotionIntensity - prevIntensity);
    if (delta >= 4 && transitionRules["1to5"]?.duration) {
      parts.push(`rule:1to5 ${transitionRules["1to5"].duration}`);
    } else if (delta >= 2 && transitionRules["2to4"]?.duration) {
      parts.push(`rule:2to4 ${transitionRules["2to4"].duration}`);
    } else if (delta >= 1 && transitionRules["1to2"]?.duration) {
      parts.push(`rule:1to2 ${transitionRules["1to2"].duration}`);
    }
    if (/人格|雪辞/.test(shot.visualId || "") && transitionRules["人格切换"]?.duration) {
      parts.push(`rule:人格切换 ${transitionRules["人格切换"].duration}`);
    }
    const ps = readPersonalitySwitch(shot as Record<string, unknown>);
    if (ps?.enabled && transitionRules["人格切换"]?.duration) {
      parts.push(`rule:人格切换 ${transitionRules["人格切换"].duration}`);
      if (ps.progress) parts.push(`persona:${ps.progress}`);
      if (ps.visualMark) parts.push(ps.visualMark);
    }
    const l6 = String((shot as Record<string, unknown>)["L6-trigger"] || "");
    if (/雪辞|人格切换/.test(l6) && transitionRules["人格切换"]?.duration) {
      parts.push(`rule:人格切换 ${transitionRules["人格切换"].duration}`);
    }
  }

  return parts.filter(Boolean).join(" ") || "静止";
}

function buildFromTemplate(
  shot: DramaPackStoryboardShot,
  templates: Record<string, string> | undefined,
  index: CodeIndex,
  sceneDesign?: Record<string, { desc?: string; baseTemp?: number | string }>,
  propDesign?: Record<string, { desc?: string }>,
): string {
  const type = shot.type;
  if (!type || !templates?.[type]) return "";

  const charCode = (shot.assetCodes ?? []).find((c) => c.startsWith("CHAR-")) || "";
  const sceneCode = (shot.assetCodes ?? []).find((c) => c.startsWith("SCENE-")) || "";
  const propCode = (shot.assetCodes ?? []).find((c) => c.startsWith("PROP-")) || "";

  const sceneDesc = sceneCode && sceneDesign?.[sceneCode]?.desc ? sceneDesign[sceneCode].desc : shot.content || "";
  const propDesc = propCode && propDesign?.[propCode]?.desc ? propDesign[propCode].desc : "";
  const charName = charCode ? index.byCode[charCode]?.name || charCode : "";
  const toneHint = shot.colorTone || "";
  const intensity = shot.emotionIntensity != null ? `emotion intensity ${shot.emotionIntensity}/5` : "";

  return templates[type]
    .replace(/\{场景描述\}/g, sceneDesc)
    .replace(/\{道具描述\}/g, propDesc)
    .replace(/\{角色锁定描述\}/g, charName)
    .replace(/\{光线\}/g, sceneCode && sceneDesign?.[sceneCode]?.baseTemp ? `${sceneDesign[sceneCode].baseTemp}K` : "")
    .replace(/\{构图\}/g, shot.cameraAngle || shot.shotType || "")
    .replace(/\{色调\}/g, toneHint)
    .replace(/\{情绪强度\}/g, intensity)
    .replace(/\{CHAR-CODE\}/g, charCode)
    .replace(/\{SCENE-CODE\}/g, sceneCode)
    .replace(/\{PROP-CODE\}/g, propCode);
}

export function buildStandardVideoDesc(
  shot: DramaPackStoryboardShot,
  assetNames: string[],
  assetIdStr: string,
  sceneName: string,
  performanceText: string,
  cameraMotion: string,
  lightingHint: string,
  soundText: string,
  dialogueSuffix: string,
  extraSuffix = "",
): string {
  const dialogue = [shot.dialogue?.trim() && shot.dialogue !== "—" ? shot.dialogue.trim() : "无台词", dialogueSuffix]
    .filter(Boolean)
    .join(" ");
  const sound = soundText ? `音效：${soundText}` : "无";
  const action = shot.content || "";
  const emotion = [shot.visualId, shot.colorTone].filter(Boolean).join("/") || "";
  const facing = [(shot as Record<string, unknown>).characterFacing, (shot as Record<string, unknown>).positionInScene]
    .filter((v) => v && v !== "—")
    .join(" ");
  const perfBlock = [performanceText, extraSuffix].filter(Boolean).join("；");
  return `（${action}、${sceneName}、${assetNames.join("/") || "无"}、${shot.duration}s、${shot.shotType || "中景"}、${perfBlock}、${cameraMotion}、${emotion}、${lightingHint}、${facing ? `空间:${facing}、` : ""}${dialogue}、${sound}、${assetIdStr || "无"}）`;
}

export function extractShotMeta(shot: DramaPackStoryboardShot): ShotMeta {
  const raw = shot as Record<string, unknown>;
  return {
    type: shot.type,
    visualId: shot.visualId,
    sceneName: raw.sceneName as string | undefined,
    colorTone: shot.colorTone,
    emotionIntensity: shot.emotionIntensity,
    performance: shot.performance,
    transitionType: shot.transitionType,
    transitionDuration: shot.transitionDuration,
    cameraAngle: shot.cameraAngle,
    characterFacing: shot.characterFacing,
    positionInScene: shot.positionInScene,
    assetCodes: shot.assetCodes,
    shotType: shot.shotType,
    content: shot.content,
    dialogue: shot.dialogue,
    sound: shot.sound,
    duration: shot.duration,
    imagePrompt: shot.imagePrompt,
    videoPrompt: shot.videoPrompt,
    track: shot.track,
    visualFocus: raw.visualFocus as Record<string, string> | undefined,
    personalitySwitch: raw.personalitySwitch as Record<string, unknown> | undefined,
    l6Trigger: raw["L6-trigger"] as string | undefined,
  };
}

export function shotMetaToStoryboardShot(meta: ShotMeta, base?: Partial<DramaPackStoryboardShot>): DramaPackStoryboardShot {
  const shot: DramaPackStoryboardShot & Record<string, unknown> = {
    time: base?.time,
    shotType: meta.shotType ?? base?.shotType,
    visualId: meta.visualId ?? base?.visualId,
    content: meta.content ?? base?.content ?? "",
    sound: meta.sound ?? base?.sound ?? "",
    dialogue: meta.dialogue ?? base?.dialogue ?? "",
    duration: meta.duration ?? base?.duration ?? 3,
    assetCodes: meta.assetCodes ?? base?.assetCodes ?? [],
    imagePrompt: meta.imagePrompt ?? base?.imagePrompt,
    videoPrompt: meta.videoPrompt ?? base?.videoPrompt,
    track: meta.track ?? base?.track,
    type: meta.type as DramaPackStoryboardShot["type"],
    cameraAngle: meta.cameraAngle ?? base?.cameraAngle,
    characterFacing: meta.characterFacing ?? base?.characterFacing,
    positionInScene: meta.positionInScene ?? base?.positionInScene,
    transitionType: meta.transitionType ?? base?.transitionType,
    transitionDuration: meta.transitionDuration ?? base?.transitionDuration,
    emotionIntensity: meta.emotionIntensity ?? base?.emotionIntensity,
    colorTone: meta.colorTone ?? base?.colorTone,
    performance: meta.performance ?? base?.performance,
  };
  if (meta.sceneName) shot.sceneName = meta.sceneName;
  if (meta.visualFocus) shot.visualFocus = meta.visualFocus;
  return shot;
}

export function suggestImageQuality(productionSpec?: DramaPack["productionSpec"]): string {
  const tiers = productionSpec?.costTiers as Record<string, { res?: string }> | undefined;
  const t2 = tiers?.["T2-标准"];
  if (t2?.res?.includes("1536")) return "2K";
  if (t2?.res?.includes("1920")) return "4K";
  return "2K";
}

export function getAiFailoverHint(productionSpec?: DramaPack["productionSpec"], step = "Step1"): string {
  const failover = productionSpec?.aiFailover as Record<string, string> | undefined;
  return failover?.[step] || "";
}

export async function applyProductionRules(
  shot: DramaPackStoryboardShot,
  pack: DramaPack,
  artStyle: string,
  index: CodeIndex,
  shotIndex: number,
  mode: ComposeMode = "merge",
  prevIntensity?: number,
  extensions?: PackExtensionsContext,
): Promise<ComposedShot> {
  const spec = pack.productionSpec;
  const templates = spec?.imagePromptTemplates as Record<string, string> | undefined;
  const sceneDesign = spec?.sceneDesign as Record<string, { desc?: string; baseTemp?: number | string }> | undefined;
  const propDesign = spec?.propDesign as Record<string, { desc?: string }> | undefined;
  const performanceBaseline = spec?.performanceBaseline as Record<string, string> | undefined;
  const emotionMapping = spec?.emotionPerformanceMapping as Record<string, Record<string, string>> | undefined;
  const soundDesign = spec?.soundDesign as Record<string, unknown> | undefined;
  const dialogueActionSync = spec?.dialogueActionSync as Record<string, DialogueSyncEntry> | undefined;
  const transitionRules = spec?.transitionRules as Record<string, TransitionRuleEntry> | undefined;
  const cameraAnchor = spec?.cameraAnchor as Record<string, { name?: string }> | undefined;

  const ruleCtx: ComposeRuleContext = { shot, pack, index, shotIndex, prevIntensity, extensions, artStyle, mode };

  const allCodes = resolveWardrobeAssociateCodes(shot.visualId, index, shot.assetCodes ?? [], extensions, shot);
  const assetNames = allCodes.map((c) => index.byCode[c.split(":")[0]]?.name || c).filter(Boolean);
  const sceneCode = (shot.assetCodes ?? []).find((c) => c.startsWith("SCENE-"));
  const sceneName =
    ((shot as Record<string, unknown>).sceneName as string) ||
    (sceneCode ? index.byCode[sceneCode]?.name || "" : "") ||
    assetNames.find((n) => n) ||
    "";

  let baseImagePrompt = mode === "rebuild" ? "" : shot.imagePrompt || "";
  if (!baseImagePrompt.trim()) {
    baseImagePrompt = buildFromTemplate(shot, templates, index, sceneDesign, propDesign);
  }

  let imagePrompt = baseImagePrompt;
  if (mode === "merge") {
    imagePrompt = applyImagePromptRules(ruleCtx, baseImagePrompt);
    if (extensions) {
      imagePrompt = mergePackExtensionHints(imagePrompt, extensions, shot, shotIndex);
    }
  }

  const systemUIAppearance = spec?.systemUIAppearance as
    | Record<string, { method?: string; sound?: string; duration?: number }>
    | undefined;
  const systemSound = resolveSystemUISound(systemUIAppearance, shot, sceneCode);
  const soundText = systemSound || resolveSound(shot, sceneCode, soundDesign);

  const mergedPerf = mergePerformanceWithMapping(shot, performanceBaseline, emotionMapping);
  let performanceText = formatPerformanceFull(mergedPerf);
  const personalitySuffix = buildPersonalityVideoSuffix(ruleCtx);
  if (personalitySuffix) performanceText = [performanceText, personalitySuffix].filter(Boolean).join("，");

  const cameraAnchorName = shot.cameraAngle && cameraAnchor?.[shot.cameraAngle]?.name;
  const cameraMotion = resolveCameraMotion(shot, prevIntensity, transitionRules, cameraAnchorName);

  const colorMapping = spec?.colorToneMapping as Record<string, { tone?: string }> | undefined;
  const lightingHint = (shot.colorTone && colorMapping?.[shot.colorTone]?.tone) || "默认光影";

  const dialogueSuffix = dialogueActionLead(shot.dialogue || "", dialogueActionSync);
  const postProductionHints = buildPostProductionHints(ruleCtx);

  const videoDesc = buildStandardVideoDesc(
    { ...shot, sound: soundText || shot.sound },
    assetNames,
    allCodes.join("/"),
    sceneName,
    performanceText,
    cameraMotion,
    lightingHint,
    soundText,
    dialogueSuffix,
  );

  let videoPrompt = shot.videoPrompt || "";
  if (!videoPrompt) {
    for (const [scene, vp] of Object.entries(index.keyPromptVideo)) {
      if (shot.content?.includes(scene) || shot.visualId?.includes(scene)) {
        videoPrompt = vp;
        break;
      }
    }
  }

  const track = shot.track || String(Math.floor(shotIndex / 3) + 1);

  return {
    imagePrompt,
    videoDesc,
    videoPrompt,
    track,
    shouldGenerateImage: imagePrompt ? 1 : 0,
    promptSource: "import",
    assetCodes: shot.assetCodes ?? [],
    associateCodes: allCodes,
    duration: shot.duration,
    postProductionHints,
  };
}
