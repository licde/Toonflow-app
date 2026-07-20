import type { EpisodeShot, ShotType } from "../types";
import { parseCrefsSrefsFromPrompt } from "../compilers/compileOrGenerateVideoPrompt";
import { normalizeAssetCode } from "../codes/assetCodeContract";

const SHOT_TYPES: ShotType[] = ["CHAR-SCENE", "PURE-SCENE", "PURE-PROP", "CHAR-PROP"];

/** 解析 Markdown 分镜表 → EpisodeShot[]（场/镜兼容） */
export function parseStoryboardTable(markdown: string, storyboardIds?: number[]): EpisodeShot[] {
  const lines = markdown.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const shots: EpisodeShot[] = [];
  let index = 0;

  for (const line of lines) {
    if (/^\|?\s*[-:|]+\s*\|?$/.test(line)) continue;
    if (/镜号|镜\s|类型|duration|时长/i.test(line) && line.includes("|")) continue;

    const pipeCells = line.split("|").map((c) => c.trim()).filter(Boolean);
    if (pipeCells.length >= 2) {
      const shot = pipeRowToShot(pipeCells, index, storyboardIds?.[index]);
      if (shot) {
        shots.push(shot);
        index++;
      }
      continue;
    }

    const numMatch = line.match(/^(\d+)[.、\s]+(.+)/);
    if (numMatch) {
      shots.push(freeformToShot(numMatch[2], parseInt(numMatch[1], 10) - 1, storyboardIds?.[index]));
      index++;
    }
  }

  if (!shots.length && markdown.trim()) {
    shots.push(freeformToShot(markdown.slice(0, 500), 0, storyboardIds?.[0]));
  }
  return shots;
}

function pipeRowToShot(cells: string[], index: number, storyboardId?: number): EpisodeShot | null {
  const [col0, col1, col2, col3] = cells;
  const num = parseInt(col0, 10);
  const idx = Number.isFinite(num) ? num - 1 : index;
  const typeRaw = cells.find((c) => SHOT_TYPES.some((t) => c.includes(t)));
  const durationRaw = cells.find((c) => /^\d+(\.\d+)?s?$/.test(c) || /^\d+(\.\d+)?$/.test(c));
  const linesCell = cells.find((c) => /台词|对白|：/.test(c)) ?? col3 ?? col2;

  return {
    id: `shot-${idx + 1}`,
    storyboardId,
    index: idx,
    narrative: {
      type: (typeRaw as ShotType) ?? inferType(col1 ?? col2 ?? ""),
      sceneName: col1,
      lines: linesCell,
      dialogue: linesCell ? { type: inferDialogueType(linesCell), lines: linesCell } : undefined,
      duration: durationRaw ? parseFloat(durationRaw.replace(/s$/i, "")) : 3,
      emotionIntensity: 4,
      transitionType: "切",
    },
    generation: {},
  };
}

function freeformToShot(text: string, index: number, storyboardId?: number): EpisodeShot {
  const type = SHOT_TYPES.find((t) => text.includes(t));
  const durMatch = text.match(/(\d+(?:\.\d+)?)\s*s/);
  const dialogueMatch = text.match(/[「"']([^」"']+)[」"']/);
  return {
    id: `shot-${index + 1}`,
    storyboardId,
    index,
    narrative: {
      type: type ?? "CHAR-SCENE",
      lines: dialogueMatch?.[1] ?? "",
      dialogue: dialogueMatch ? { type: inferDialogueType(dialogueMatch[1]), lines: dialogueMatch[1] } : undefined,
      duration: durMatch ? parseFloat(durMatch[1]) : 3,
      emotionIntensity: 4,
      transitionType: "切",
    },
    generation: {},
  };
}

function inferType(text: string): ShotType {
  if (/纯场景|PURE-SCENE|无人物/.test(text)) return "PURE-SCENE";
  if (/纯道具|PURE-PROP/.test(text)) return "PURE-PROP";
  if (/道具|CHAR-PROP/.test(text)) return "CHAR-PROP";
  return "CHAR-SCENE";
}

function inferDialogueType(line: string): string {
  if (/独白|画外/.test(line)) return "monologue";
  if (/旁白/.test(line)) return "narration";
  return "dialogue";
}

/** 从 flowData.storyboard 扁平数组补全 EpisodeShot（含 --cref/--sref → narrative） */
export function shotsFromFlowStoryboard(
  storyboard: {
    id?: number;
    duration?: number;
    prompt?: string;
    videoDesc?: string;
    audioPrompt?: string;
    fxPrompt?: string;
    shouldGenerateImage?: number;
  }[],
): EpisodeShot[] {
  return storyboard.map((sb, index) => {
    const promptBlob = String(sb.prompt ?? sb.videoDesc ?? "");
    const { crefs, srefs } = parseCrefsSrefsFromPrompt(promptBlob);
    const sceneCode = srefs[0] ? normalizeAssetCode(srefs[0]) ?? srefs[0] : undefined;
    const assetCodes = [...new Set([...crefs, ...srefs].map((c) => normalizeAssetCode(c) ?? c))];
    return {
      id: `shot-${sb.id ?? index + 1}`,
      storyboardId: sb.id,
      index,
      narrative: {
        type: "CHAR-SCENE",
        duration: typeof sb.duration === "number" ? sb.duration : parseFloat(String(sb.duration ?? 3)) || 3,
        transitionType: "切",
        emotionIntensity: 4,
        ...(sceneCode ? { sceneCode } : {}),
        ...(assetCodes.length ? { assetCodes } : {}),
      },
      generation: {
        imagePrompt: sb.prompt,
        videoDesc: sb.videoDesc,
        videoPrompt: sb.videoDesc,
        audioPrompt: sb.audioPrompt,
        fxPrompt: sb.fxPrompt,
        manualOverride: sb.prompt ? { image: false } : undefined,
      },
    };
  });
}

function preserveIdentityNarrative(
  preferred: EpisodeShot["narrative"],
  fallback: EpisodeShot["narrative"],
): EpisodeShot["narrative"] {
  const sceneCode = preferred.sceneCode || fallback.sceneCode;
  const assetCodes = [
    ...new Set([...(preferred.assetCodes ?? []), ...(fallback.assetCodes ?? [])].filter(Boolean)),
  ] as string[];
  const preferredHasDialogue = Boolean(
    preferred.dialogue?.lines &&
      (typeof preferred.dialogue.lines === "string"
        ? preferred.dialogue.lines.trim()
        : preferred.dialogue.lines.length),
  );
  const dialogue = preferredHasDialogue ? preferred.dialogue : fallback.dialogue ?? preferred.dialogue;
  const lines = preferred.lines || fallback.lines;
  return {
    ...fallback,
    ...preferred,
    sceneCode: sceneCode || preferred.sceneCode || fallback.sceneCode,
    sceneName: preferred.sceneName || fallback.sceneName,
    assetCodes: assetCodes.length ? assetCodes : preferred.assetCodes ?? fallback.assetCodes,
    dialogue,
    lines,
    shotSize: preferred.shotSize || fallback.shotSize,
    emotionIntensity: preferred.emotionIntensity ?? fallback.emotionIntensity,
    colorTone: preferred.colorTone || fallback.colorTone,
    spatialRelation: preferred.spatialRelation || fallback.spatialRelation,
    composition: preferred.composition ?? fallback.composition,
    cameraAnchor: preferred.cameraAnchor ?? fallback.cameraAnchor,
    lipSyncPolicy: preferred.lipSyncPolicy || fallback.lipSyncPolicy,
    exprCue: preferred.exprCue || fallback.exprCue,
    continuityFrom: preferred.continuityFrom || fallback.continuityFrom,
    performance: preferred.performance ?? fallback.performance,
    debutBeat: preferred.debutBeat || fallback.debutBeat,
    endHook: preferred.endHook || fallback.endHook,
  };
}

export function mergeShots(structured: EpisodeShot[], flat: EpisodeShot[]): EpisodeShot[] {
  if (!structured.length) return flat;
  if (!flat.length) return structured;
  return structured.map((s, i) => {
    const fb = flat[i] ?? flat.find((f) => f.storyboardId === s.storyboardId);
    if (!fb) return s;
    return {
      ...s,
      storyboardId: s.storyboardId ?? fb.storyboardId,
      narrative: preserveIdentityNarrative(s.narrative, fb.narrative),
      generation: { ...fb.generation, ...s.generation, compiled: s.generation.compiled ?? fb.generation.compiled },
    };
  });
}

/** Merge identity fields from previous package so sync does not clobber sceneCode/assetCodes. */
export function mergeShotIdentityFromExisting(next: EpisodeShot[], existing?: EpisodeShot[]): EpisodeShot[] {
  if (!existing?.length) return next;
  return next.map((s, i) => {
    const prev =
      (s.storyboardId != null ? existing.find((e) => e.storyboardId === s.storyboardId) : undefined) ??
      existing[i];
    if (!prev) return s;
    return {
      ...s,
      visualDescription: s.visualDescription || prev.visualDescription,
      narrative: preserveIdentityNarrative(s.narrative, prev.narrative),
      generation: {
        ...prev.generation,
        ...s.generation,
        imagePrompt: s.generation.imagePrompt || prev.generation.imagePrompt,
        videoPrompt: s.generation.videoPrompt || prev.generation.videoPrompt,
        videoDesc: s.generation.videoDesc || prev.generation.videoDesc,
        audioPrompt: s.generation.audioPrompt || prev.generation.audioPrompt,
        fxPrompt: s.generation.fxPrompt || prev.generation.fxPrompt,
        compiled: s.generation.compiled ?? prev.generation.compiled,
      },
    };
  });
}
