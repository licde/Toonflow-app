import crypto from "crypto";
import type { StructuredDialogue, StructuredShot } from "./types";

/** 解析 "0.6-1.2s" 或 "10-12s" → 秒数 */
export function parseShotDuration(time?: string, dialogue?: StructuredDialogue | null): number {
  if (dialogue?.推荐分镜时长) {
    const rec = parseFloat(String(dialogue.推荐分镜时长).replace(/s$/i, ""));
    if (!Number.isNaN(rec) && rec > 0) return rec;
  }
  if (!time) return 3;
  const parts = time.replace(/s/gi, "").split("-");
  if (parts.length >= 2) {
    const a = parseFloat(parts[0]);
    const b = parseFloat(parts[1]);
    if (!Number.isNaN(a) && !Number.isNaN(b)) return Math.max(0.5, b - a);
  }
  const single = parseFloat(parts[0]);
  return !Number.isNaN(single) && single > 0 ? single : 3;
}

export function buildVideoDesc(shot: StructuredShot): string {
  const vf = shot.visualFocus;
  const perf = shot.performance as Record<string, string> | undefined;
  return [
    shot.sceneName,
    vf?.说明,
    vf?.拍摄要求,
    perf?.gaze ? `gaze:${perf.gaze}` : "",
    perf?.hands ? `hands:${perf.hands}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
}

export function stripCrefSref(prompt: string): string {
  return prompt
    .replace(/\s*--cref\s+\S+/gi, "")
    .replace(/\s*--sref\s+\S+/gi, "")
    .trim();
}

export function extractCodesFromPrompt(prompt: string): string[] {
  const codes: string[] = [];
  const re = /--c?ref\s+(CHAR-\w+|SCENE-\w+|PROP-\w+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(prompt))) {
    if (!codes.includes(m[1])) codes.push(m[1]);
  }
  return codes;
}

export function compileHash(input: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex").slice(0, 16);
}

export function clampDurationForModel(duration: number, min = 1, max = 30): number {
  return Math.min(max, Math.max(min, Math.ceil(duration * 10) / 10));
}

export function parseShotNumbersFromNotes(notes: string[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const note of notes) {
    const m = note.match(/镜\s*(\d+)\s*[-–]\s*(\d+)/);
    if (m) {
      const start = parseInt(m[1], 10);
      const end = parseInt(m[2], 10);
      for (let i = start; i <= end; i++) map.set(i, note);
    } else {
      const single = note.match(/镜\s*(\d+)/);
      if (single) map.set(parseInt(single[1], 10), note);
    }
  }
  return map;
}

export function isMemoryPointShot(镜号: number, productLayer?: Record<string, unknown>): boolean {
  const points = productLayer?.记忆点;
  if (!Array.isArray(points)) return false;
  return points.some((p) => String(p).includes(`镜${镜号}`) || String(p).includes(`镜 ${镜号}`));
}
