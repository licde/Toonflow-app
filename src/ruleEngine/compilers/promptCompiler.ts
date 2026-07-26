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
  // Thin tag soup is no longer a video body author — narrative prefers existing five-section / desc only.
  const existing =
    shot.generation.videoPrompt?.trim() ||
    shot.generation.videoDesc?.trim() ||
    "";
  const n = shot.narrative;
  return {
    modality: "video",
    tags: [],
    narrative: existing,
    constraints: [],
    motion: undefined,
    apiParams: { duration: n.duration ?? 3, aspectRatio: config.videoRatio },
  };
}

import { loadVideoAudioPolicy } from "../fixtures/policyFixtures";

export function buildAudioIR(shot: EpisodeShot, config: ResolvedConfig): PromptIR {
  const n = shot.narrative;
  const lines = n.dialogue?.lines ?? n.lines ?? "";
  const hasSfx = Boolean(n.sound?.sfx);
  const hasDialogue = Boolean(lines);
  const chatAudio = shot.generation.audioPrompt?.trim();
  const policy = loadVideoAudioPolicy();
  const generateAudio = hasDialogue || hasSfx || Boolean(chatAudio);
  return {
    modality: "audio",
    tags: hasDialogue ? [n.dialogue?.type ?? "dialogue"] : hasSfx ? ["sfx-native"] : ["ambient"],
    narrative: chatAudio || (typeof lines === "string" ? lines : "") || n.sound?.sfx || n.sound?.env || "环境音",
    constraints: [],
    apiParams: { generate_audio: generateAudio, speechSpeed: config.speechSpeed, defaultPolicy: policy.defaultPolicy },
  };
}


export function irToPrompt(ir: PromptIR): string {
  const parts = [...ir.tags, ir.narrative, ...ir.constraints];
  if (ir.motion) parts.push(ir.motion);
  return parts.filter(Boolean).join(", ");
}

export function buildFxIR(shot: EpisodeShot): string {
  return shot.generation.fxPrompt?.trim() || "";
}

export function compileShot(shot: EpisodeShot, config: ResolvedConfig): EpisodeShot {
  const imageIR = buildImageIR(shot, config);
  const audioIR = buildAudioIR(shot, config);
  const fx = buildFxIR(shot);
  const image = shot.generation.manualOverride?.image ? (shot.generation.imagePrompt ?? irToPrompt(imageIR)) : irToPrompt(imageIR);

  let video = shot.generation.videoPrompt ?? shot.generation.videoDesc ?? "";
  if (!shot.generation.manualOverride?.video) {
    try {
      const { compileVideoPromptSpine } = require("./compileVideoPromptSpine") as typeof import("./compileVideoPromptSpine");
      const { isVideoPromptStub } = require("./sanitizeVideoPrompt") as typeof import("./sanitizeVideoPrompt");
      const { isVideoPromptThinShell } = require("./assertVideoPromptReady") as typeof import("./assertVideoPromptReady");
      const needsSpine = !video || isVideoPromptStub(video) || isVideoPromptThinShell(video) || !/\[Visual\]/i.test(video);
      if (needsSpine) {
        const dial = shot.narrative?.dialogue?.lines;
        const lines = Array.isArray(dial)
          ? dial.map((l) => (typeof l === "string" ? { text: l } : { speaker: l.speaker, text: l.text }))
          : [];
        const spine = compileVideoPromptSpine({
          designShot: {
            shotIndex: shot.shotIndex,
            visualDescription: shot.visualDescription,
            shotSize: shot.narrative?.shotSize,
            duration: shot.narrative?.duration,
            sceneName: shot.narrative?.sceneName,
            narrative: { dialogue: { lines }, debutBeat: (shot.narrative as { debutBeat?: string })?.debutBeat },
            generation: {
              videoPrompt: video || undefined,
              stillIntentClass: (shot.generation as { stillIntentClass?: string }).stillIntentClass,
            },
          },
          forceRebuild: true,
          includeSidecar: false,
          vendorId: (config as { vendorId?: string }).vendorId,
        });
        if (spine.ready || spine.prompt) {
          video = spine.prompt;
          if (spine.generationWriteback?.intentClass) {
            (shot.generation as { intentClass?: string }).intentClass = spine.generationWriteback.intentClass;
          }
        }
      }
    } catch {
      // Fallback: keep existing; never invent medium-shot comma soup
      if (!video) video = String(shot.visualDescription ?? "").trim();
    }
  }

  const vd = String(shot.visualDescription ?? "").trim();
  const dialLines = shot.narrative?.dialogue?.lines;
  const hasDial = Array.isArray(dialLines) && dialLines.length > 0;
  const designGaps = !vd && !hasDial ? ["missing_dialogue_and_vd"] : shot.generation?.designGaps;

  const audio = shot.generation.audioPrompt?.trim() || irToPrompt(audioIR);
  const compiled = { image, video, audio, fx: fx || undefined, hash: stableHash({ image, video, audio, fx }) };
  return {
    ...shot,
    generation: {
      ...shot.generation,
      videoDesc: shot.generation.videoDesc ?? video,
      videoPrompt: video || shot.generation.videoPrompt,
      designGaps,
      compiled,
    },
  };
}
