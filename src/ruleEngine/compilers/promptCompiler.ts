import type { EpisodeShot, ResolvedConfig } from "../types";
import { stableHash } from "../utils/hash";

export interface PromptIR {
  modality: "image" | "video" | "audio";
  tags: string[];
  narrative: string;
  constraints: string[];
  motion?: string;
  negative?: string;
  apiParams?: Record<string, unknown>;
}

export function buildImageIR(shot: EpisodeShot, config: ResolvedConfig): PromptIR {
  const n = shot.narrative;
  const tags = [
    config.artStyle,
    n.type ?? "CHAR-SCENE",
    n.sceneName ?? "",
    n.shotSize ?? "medium shot",
    n.colorTone ?? "4500K",
    `情绪${n.emotionIntensity ?? 4}`,
  ].filter(Boolean);
  const constraints: string[] = [];
  if (n.type === "PURE-SCENE") constraints.push("no people, no characters");
  if (n.type === "PURE-PROP") constraints.push("no hands, no person", "--ar 1:1");
  return {
    modality: "image",
    tags,
    narrative: shot.generation.imagePrompt ?? tags.join("，"),
    constraints,
    negative: "blurry, low quality, watermark",
  };
}

export function buildVideoIR(shot: EpisodeShot, config: ResolvedConfig): PromptIR {
  const n = shot.narrative;
  const motion = inferMotion(n.transitionType, n.shotSize);
  return {
    modality: "video",
    tags: [n.shotSize ?? "medium shot", motion, `${n.duration ?? 3}s`],
    narrative: shot.generation.videoDesc ?? shot.generation.videoPrompt ?? "",
    constraints: ["motion-from-frame"],
    motion,
    apiParams: { duration: n.duration ?? 3, aspectRatio: config.videoRatio },
  };
}

export function buildAudioIR(shot: EpisodeShot, config: ResolvedConfig): PromptIR {
  const n = shot.narrative;
  const lines = n.dialogue?.lines ?? n.lines ?? "";
  const hasSfx = Boolean(n.sound?.sfx);
  const hasDialogue = Boolean(lines);
  return {
    modality: "audio",
    tags: hasDialogue ? [n.dialogue?.type ?? "dialogue"] : hasSfx ? ["sfx-native"] : ["ambient"],
    narrative: lines || n.sound?.sfx || n.sound?.env || "环境音",
    constraints: [],
    apiParams: { generate_audio: hasDialogue || hasSfx, speechSpeed: config.speechSpeed },
  };
}

function inferMotion(transition?: string, shotSize?: string): string {
  if (transition === "快切") return "fast cut";
  if (transition === "慢放") return "slow motion";
  if (/特写|close/i.test(shotSize ?? "")) return "slow push";
  if (/全景|wide/i.test(shotSize ?? "")) return "static";
  return "slow pan";
}

export function irToPrompt(ir: PromptIR): string {
  const parts = [...ir.tags, ir.narrative, ...ir.constraints];
  if (ir.motion) parts.push(ir.motion);
  return parts.filter(Boolean).join(", ");
}

export function compileShot(shot: EpisodeShot, config: ResolvedConfig): EpisodeShot {
  const imageIR = buildImageIR(shot, config);
  const videoIR = buildVideoIR(shot, config);
  const audioIR = buildAudioIR(shot, config);
  const image = shot.generation.manualOverride?.image ? (shot.generation.imagePrompt ?? irToPrompt(imageIR)) : irToPrompt(imageIR);
  const video = shot.generation.manualOverride?.video ? (shot.generation.videoPrompt ?? irToPrompt(videoIR)) : irToPrompt(videoIR);
  const audio = irToPrompt(audioIR);
  const compiled = { image, video, audio, hash: stableHash({ image, video, audio }) };
  return {
    ...shot,
    generation: {
      ...shot.generation,
      videoDesc: shot.generation.videoDesc ?? video,
      compiled,
    },
  };
}
