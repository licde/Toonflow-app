import type { EpisodeShot, ShotType } from "../types";

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

/** 从 flowData.storyboard 扁平数组补全 EpisodeShot */
export function shotsFromFlowStoryboard(
  storyboard: { id?: number; duration?: number; prompt?: string; videoDesc?: string; shouldGenerateImage?: number }[],
): EpisodeShot[] {
  return storyboard.map((sb, index) => ({
    id: `shot-${sb.id ?? index + 1}`,
    storyboardId: sb.id,
    index,
    narrative: {
      type: "CHAR-SCENE",
      duration: typeof sb.duration === "number" ? sb.duration : parseFloat(String(sb.duration ?? 3)) || 3,
      transitionType: "切",
      emotionIntensity: 4,
    },
    generation: {
      imagePrompt: sb.prompt,
      videoDesc: sb.videoDesc,
      manualOverride: sb.prompt ? { image: false } : undefined,
    },
  }));
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
      generation: { ...fb.generation, ...s.generation, compiled: s.generation.compiled ?? fb.generation.compiled },
    };
  });
}
