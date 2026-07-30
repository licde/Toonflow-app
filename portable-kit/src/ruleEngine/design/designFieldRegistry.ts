/**
 * DesignFieldRegistry SSOT — extract + apply (unique inject surface).
 */
import { readFixtureJson } from "../utils/fixturesPath";
import type { EpisodeShot } from "../types";
import { episodeShotToExtractShot } from "../bundle/hydratePackageFromPreDesign";
import {
  compileEmotionCue,
  compileColorTemp,
  compileSpatial,
  compileDuration,
  compileShotSize,
  compileCamera,
  compileFx,
  compileDialogue,
  compileLipSync,
  compileVoice,
  compileSfx,
  compileExprGuard,
  compileDebut,
  compileEndHook,
  compileNegativeAV,
  compileComposition,
  compileExprCue,
  compileContinuity,
  compileAnchorHint,
  mapLipSyncPolicy,
} from "../compilers/contentFieldCompiler";

export type DesignFieldId =
  | "emotion"
  | "colorTemp"
  | "spatial"
  | "duration"
  | "shotSize"
  | "camera"
  | "fx"
  | "dialogue"
  | "lipSync"
  | "voice"
  | "sfx"
  | "exprGuard"
  | "debutBeat"
  | "endHook"
  | "negativeAV"
  | "composition"
  | "exprCue"
  | "continuity"
  | "anchor";

export interface DesignFields {
  emotion?: number | string | null;
  colorTemp?: string | null;
  spatialRelation?: string | null;
  duration?: number | string | null;
  shotSize?: string | null;
  camera?: string | null;
  fxPrompt?: string | null;
  dialogue?: string | null;
  dialogueSpeaker?: string | null;
  lipSync?: "active" | "silent" | "vo" | "os" | null;
  voice?: string | null;
  sfx?: string | null;
  exprGuard?: boolean | null;
  debutBeat?: string | null;
  endHook?: string | null;
  negativeAV?: boolean | null;
  /** Hint for FE/generate: open native audio when dialogue present */
  forceAudioHint?: boolean;
  foreground?: string | null;
  background?: string | null;
  bgBlur?: boolean | null;
  exprCue?: string | null;
  continuityFrom?: string | null;
  anchorHint?: string | null;
  visualDescription?: string | null;
}

export interface ExtractContext {
  modality?: "image" | "video";
  mode?: string;
  charCodes?: string[];
  shot?: {
    duration?: number;
    shotSize?: string;
    emotion?: number;
    colorTemp?: string;
    sceneCode?: string;
    charCodes?: string[];
    camera?: string | null;
    voice?: string | null;
    visualDescription?: string;
    narrative?: {
      emotionIntensity?: number;
      spatialRelation?: string;
      duration?: number;
      shotSize?: string;
      colorTone?: string;
      dialogue?: { lines?: string | { speaker?: string; text?: string }[]; type?: string };
      sound?: { sfx?: string; bgm?: string; dialogue?: boolean };
      debutBeat?: string;
      endHook?: string;
      composition?: { foreground?: string; background?: string };
      cameraAnchor?: { shotSize?: string; bgBlur?: boolean };
      lipSyncPolicy?: string;
      exprCue?: string;
      continuityFrom?: string;
    };
    generation?: { fxPrompt?: string; audioPrompt?: string; videoPrompt?: string };
    shotDesign?: {
      cameraAnchor?: { shotSize?: string; bgBlur?: boolean };
      performance?: { microExpression?: { eyes?: string; mouthDetail?: string } };
      composition?: { foreground?: string; background?: string };
      lipSyncPolicy?: string;
    };
  };
  storyboard?: {
    duration?: number | string | null;
    fxPrompt?: string | null;
    audioPrompt?: string | null;
    videoDesc?: string | null;
    track?: string | number | null;
  };
  debutBeat?: string | null;
  endHook?: string | null;
  voice?: string | null;
  camera?: string | null;
  anchorHint?: string | null;
}

/**
 * Unified extract context builder — all generate/matrix/batch/IR entrypoints share this.
 */
export function buildExtractContext(input: {
  modality?: "image" | "video";
  mode?: string;
  episodeShot?: EpisodeShot;
  storyboard?: ExtractContext["storyboard"];
  charCodes?: string[];
  voice?: string | null;
  camera?: string | null;
  debutBeat?: string | null;
  endHook?: string | null;
  anchorHint?: string | null;
}): ExtractContext {
  const mapped = input.episodeShot
    ? episodeShotToExtractShot(input.episodeShot, {
        voice: input.voice ?? undefined,
        camera: input.camera ?? undefined,
      })
    : undefined;
  const shot = mapped as ExtractContext["shot"] | undefined;
  if (shot && input.camera) shot.camera = input.camera;
  if (shot && input.voice) shot.voice = input.voice;

  return {
    modality: input.modality ?? "video",
    mode: input.mode,
    charCodes: input.charCodes ?? shot?.charCodes,
    shot,
    storyboard: input.storyboard,
    debutBeat: input.debutBeat ?? shot?.narrative?.debutBeat ?? null,
    endHook: input.endHook ?? shot?.narrative?.endHook ?? null,
    voice: input.voice ?? shot?.voice ?? null,
    camera: input.camera ?? shot?.camera ?? null,
    anchorHint: input.anchorHint ?? null,
  };
}

type RegistryField = {
  id: string;
  modalities?: string[];
  requiredWhen?: string;
  goldMust?: string;
  reverseTrigger?: string;
};

let registryCache: RegistryField[] | null = null;

export function loadDesignFieldRegistry(): RegistryField[] {
  if (registryCache) return registryCache;
  registryCache = readFixtureJson<{ fields?: RegistryField[] }>("design_field_registry.json", { fields: [] }).fields ?? [];
  return registryCache;
}

export function getDesignFieldGoldMust(id: string): string | undefined {
  return loadDesignFieldRegistry().find((f) => f.id === id)?.goldMust;
}

/** Parse loose videoDesc pipe/顿号 fields when structured shot missing. */
function parseVideoDescHints(desc?: string): Partial<DesignFields> {
  if (!desc?.trim()) return {};
  const out: Partial<DesignFields> = {};
  const dur = desc.match(/(\d+)\s*s/);
  if (dur) out.duration = Number(dur[1]);
  const sfx = desc.match(/音效[：:]\s*([^、|]+)/) ?? desc.match(/sfx[：:]\s*([^,]+)/i);
  if (sfx) out.sfx = sfx[1].trim();
  return out;
}

export function extractDesignFields(ctx: ExtractContext): DesignFields {
  const shot = ctx.shot;
  const narr = shot?.narrative;
  const sb = ctx.storyboard;
  const vd = parseVideoDescHints(sb?.videoDesc ?? undefined);

  let dialogueText: string | null = null;
  let speaker: string | null = null;
  const lines = narr?.dialogue?.lines;
  if (typeof lines === "string" && lines.trim()) {
    dialogueText = lines.trim();
  } else if (Array.isArray(lines) && lines.length) {
    const first = lines[0];
    if (typeof first === "string") dialogueText = first;
    else {
      dialogueText = first?.text?.trim() || null;
      speaker = first?.speaker ?? null;
    }
    if (!dialogueText) {
      dialogueText = lines
        .map((l) => (typeof l === "string" ? l : l?.text ?? ""))
        .filter(Boolean)
        .join(" / ");
    }
  }
  if (!dialogueText && sb?.audioPrompt?.trim() && /说|dialogue|"|「/i.test(sb.audioPrompt)) {
    dialogueText = sb.audioPrompt.trim();
  }

  const hasChar = (ctx.charCodes ?? shot?.charCodes ?? []).some((c) => /^CHAR-/i.test(c));
  const mode = (ctx.mode ?? "").toLowerCase();
  const singleImage = mode === "singleimage" || mode === "wan_i2v";
  const isImage = (ctx.modality ?? "video") === "image";
  // Image: exprGuard/negativeAV only appended by stillPromptPipeline after literary ok
  const exprGuard = isImage ? false : hasChar || singleImage ? true : null;

  const lipSyncFromPolicy = mapLipSyncPolicy(
    narr?.lipSyncPolicy ?? shot?.shotDesign?.lipSyncPolicy ?? null,
  );
  const lipSync: DesignFields["lipSync"] =
    lipSyncFromPolicy ??
    (dialogueText
      ? /OS|内心|voiceover|VO|画外/i.test(dialogueText)
        ? /VO|画外|voiceover/i.test(dialogueText)
          ? "vo"
          : "os"
        : "active"
      : null);

  // Camera from shot.camera / videoPrompt motion — NEVER storyboard.track (index)
  const cameraFromVp = (() => {
    const vp = shot?.generation?.videoPrompt ?? sb?.videoDesc ?? "";
    if (/static/i.test(vp)) return "static";
    if (/slow\s*zoom|push|推进/i.test(vp)) return "dolly in / push in";
    if (/track|跟踪/i.test(vp)) return "tracking shot";
    if (/pan|摇/i.test(vp)) return "pan";
    return null;
  })();

  const micro = shot?.shotDesign?.performance?.microExpression;
  const exprCue =
    narr?.exprCue ??
    (micro ? [micro.eyes, micro.mouthDetail].filter(Boolean).join("/") : null);

  const fields: DesignFields = {
    emotion: narr?.emotionIntensity ?? shot?.emotion ?? null,
    colorTemp: shot?.colorTemp ?? narr?.colorTone ?? null,
    spatialRelation: narr?.spatialRelation?.startsWith("microExpr:")
      ? null
      : narr?.spatialRelation ?? null,
    duration: shot?.duration ?? narr?.duration ?? sb?.duration ?? vd.duration ?? null,
    shotSize: shot?.shotSize ?? narr?.shotSize ?? shot?.shotDesign?.cameraAnchor?.shotSize ?? null,
    camera: ctx.camera ?? shot?.camera ?? cameraFromVp,
    fxPrompt: shot?.generation?.fxPrompt ?? sb?.fxPrompt ?? null,
    dialogue: dialogueText,
    dialogueSpeaker: speaker,
    lipSync,
    voice: dialogueText
      ? (ctx.voice ?? shot?.voice ?? "voice:default character timbre")
      : ctx.voice ?? shot?.voice ?? null,
    sfx: narr?.sound?.sfx ?? vd.sfx ?? null,
    exprGuard,
    debutBeat: ctx.debutBeat ?? narr?.debutBeat ?? null,
    endHook: ctx.endHook ?? narr?.endHook ?? null,
    negativeAV: isImage ? false : true,
    forceAudioHint: Boolean(dialogueText || narr?.sound?.dialogue),
    foreground: narr?.composition?.foreground ?? shot?.shotDesign?.composition?.foreground ?? null,
    background: narr?.composition?.background ?? shot?.shotDesign?.composition?.background ?? null,
    bgBlur: narr?.cameraAnchor?.bgBlur ?? shot?.shotDesign?.cameraAnchor?.bgBlur ?? null,
    exprCue,
    continuityFrom: narr?.continuityFrom ?? null,
    anchorHint: ctx.anchorHint ?? null,
    visualDescription: shot?.visualDescription ?? null,
  };
  return fields;
}

function appendUnique(prompt: string, fragment: string): string {
  const bit = fragment.trim();
  if (!bit) return prompt;
  if (prompt.includes(bit)) return prompt;
  return prompt.trim() ? `${prompt.trim()}${bit.startsWith("\n") || bit.startsWith("[") ? "\n" : ", "}${bit}` : bit;
}

function hasFiveSections(prompt: string): boolean {
  return /\[Visual\]/i.test(prompt) || /\[Motion\]/i.test(prompt) || /\[Camera\]/i.test(prompt) || /\[Audio\]/i.test(prompt);
}

function injectIntoNamedSection(prompt: string, section: string, fragment: string): string {
  const bit = fragment.trim();
  if (!bit) return prompt;
  if (prompt.includes(bit)) return prompt;
  const re = new RegExp(
    `\\[${section}\\]([\\s\\S]*?)(?=\\[(?:Visual|Motion|Camera|Audio|Narrative|References|Instruction)\\]|$)`,
    "i",
  );
  if (re.test(prompt)) {
    return prompt.replace(re, (_m, body: string) => {
      let bodyTrim = String(body).trim();
      // Audio XOR: injecting dialogue / lip-sync must replace silence scaffold, not comma-append
      if (/^audio$/i.test(section) && /says\s+|lip-sync\s*active|\(dialogue\)/i.test(bit)) {
        if (/no\s*(spoken\s*)?dialogue|ambient\/?SFX\s*only|无对白|无台词/i.test(bodyTrim)) {
          bodyTrim = "";
        }
      }
      const merged = bodyTrim ? `${bodyTrim}${bodyTrim.endsWith(",") ? " " : ", "}${bit}` : bit;
      return `[${section}]\n${merged}\n\n`;
    });
  }
  return `${prompt.trim()}\n\n[${section}]\n${bit}`;
}

/** Map field id → five-section target for video prompts. */
const FIELD_SECTION: Partial<Record<DesignFieldId, "Visual" | "Motion" | "Camera" | "Audio" | "Narrative">> = {
  emotion: "Visual",
  colorTemp: "Visual",
  spatial: "Visual",
  composition: "Visual",
  exprCue: "Visual",
  exprGuard: "Visual",
  shotSize: "Camera",
  duration: "Camera",
  camera: "Camera",
  fx: "Visual",
  dialogue: "Audio",
  lipSync: "Audio",
  voice: "Audio",
  sfx: "Audio",
  continuity: "Narrative",
  debutBeat: "Narrative",
  endHook: "Narrative",
  anchor: "Narrative",
  negativeAV: "Narrative",
};

/** Unique inject surface — replaces split injectContentFields / forwardDesignFields forks for new fields. */
export function applyDesignFieldRegistry(
  prompt: string,
  fields: DesignFields,
  opts?: { modality?: "image" | "video"; mode?: string },
): { prompt: string; injected: string[] } {
  const modality = opts?.modality ?? "video";
  const injected: string[] = [];
  let next = prompt ?? "";
  const sectioned = modality === "video" && hasFiveSections(next);

  const tryInject = (id: DesignFieldId, fragment: string) => {
    if (!fragment.trim()) return;
    const before = next;
    if (sectioned) {
      const sec = FIELD_SECTION[id] ?? "Visual";
      // Never dump video identity-like cref fragments into Narrative via unknown fields
      next = injectIntoNamedSection(next, sec, fragment);
    } else {
      next = appendUnique(next, fragment);
    }
    if (next !== before) injected.push(id);
  };

  tryInject("emotion", compileEmotionCue(fields.emotion));
  tryInject("colorTemp", compileColorTemp(fields.colorTemp));
  tryInject("spatial", compileSpatial(fields.spatialRelation));
  tryInject(
    "composition",
    compileComposition({
      foreground: fields.foreground,
      background: fields.background,
      bgBlur: fields.bgBlur,
    }),
  );
  tryInject("exprCue", compileExprCue(fields.exprCue));
  if (modality === "video") {
    tryInject("duration", compileDuration(fields.duration));
    tryInject("camera", compileCamera(fields.camera));
    tryInject("continuity", compileContinuity(fields.continuityFrom));
  }
  tryInject("shotSize", compileShotSize(fields.shotSize));
  // Image: FX one line ok; never let empty base + tails alone become egress (pipeline gates literary)
  tryInject("fx", compileFx(fields.fxPrompt));
  if (modality === "video") {
    tryInject("dialogue", compileDialogue(fields.dialogue, fields.dialogueSpeaker));
    tryInject("lipSync", compileLipSync(fields.lipSync, Boolean(fields.dialogue)));
    tryInject("voice", compileVoice(fields.voice, Boolean(fields.dialogue)));
    tryInject("sfx", compileSfx(fields.sfx));
  }
  // Image: exprGuard/negativeAV only when explicitly true (pipeline sets after literary ok)
  if (fields.exprGuard) tryInject("exprGuard", compileExprGuard(true));
  tryInject("debutBeat", compileDebut(fields.debutBeat));
  tryInject("endHook", compileEndHook(fields.endHook));
  tryInject("anchor", compileAnchorHint(fields.anchorHint));
  if (fields.negativeAV) tryInject("negativeAV", compileNegativeAV(true));

  // Block empty-base + design-tail-only for image (FX-only collapse)
  if (modality === "image") {
    const stripped = next
      .replace(/FX\s*:[^,.\n]*/gi, " ")
      .replace(/[^,.\n]*QF-EXPR[^,.\n]*/gi, " ")
      .replace(/\b(?:keep face identity|no exaggerated expression rewrite|no subtitle|no watermark|no Logo)\b/gi, " ")
      .replace(/identity\[[^\]]*]/gi, " ")
      .replace(/(?:^|\s)--(?:cref|sref|ar)\s+\S+/gi, " ")
      .replace(/\s+/g, "")
      .trim();
    if (stripped.length < 12 && (prompt ?? "").replace(/\s+/g, "").length < 12) {
      // Refuse to invent a "valid" prompt from tails alone — return original base
      return { prompt: prompt ?? "", injected: [] };
    }
  }

  // visualDescription for stub bases is applied by native compiler, not double-injected here
  return { prompt: next, injected };
}
