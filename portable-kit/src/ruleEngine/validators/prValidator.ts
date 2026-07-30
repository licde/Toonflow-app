import type { ScriptBundle } from "../bundle/types";
import { measureDialogue, suggestShotDuration } from "../dialogueMetrics";
import { flattenDialogueText } from "../design/dialogueCoverage";
import { runPrEmitters, prRuleToReverseTrigger } from "./prEmitters";

type Shot = Record<string, unknown>;

export interface PrCheckItem {
  ruleId: string;
  severity: string;
  message: string;
  shotIndex?: number;
  reverseTrigger?: string;
}

function dialogueText(shot: Shot): string {
  const lines = (shot.narrative as { dialogue?: { lines?: unknown }; lines?: string })?.dialogue?.lines
    ?? (shot.narrative as { lines?: string })?.lines;
  return flattenDialogueText(lines);
}

/** PR-09: duration + lip phrase — shares dialogueMetrics with V10 */
export function checkDialogueDuration(shot: Shot, speechSpeed = 4): PrCheckItem | null {
  const text = dialogueText(shot);
  if (!text.trim()) return null;
  const isMono =
    (shot.narrative as { dialogue?: { type?: string } })?.dialogue?.type === "monologue" || /独白|画外/.test(text);
  const metrics = measureDialogue({ text, isMonologue: isMono, speechSpeed });
  const dur = Number(shot.duration ?? (shot.narrative as { duration?: number })?.duration ?? 0);
  const idx = shot.shotIndex as number | undefined;
  if (dur > 0 && dur < metrics.minDurationSec) {
    return {
      ruleId: "PR-09",
      severity: "BLOCK",
      message: `镜 ${idx ?? "?"} 时长 ${dur}s < 台词所需 ${metrics.minDurationSec}s`,
      shotIndex: idx,
      reverseTrigger: prRuleToReverseTrigger("PR-09"),
    };
  }
  const video = String(shot.videoPrompt ?? (shot.generation as { videoPrompt?: string })?.videoPrompt ?? "");
  if (metrics.lipRequired && dur >= metrics.minDurationSec && video && !/口型|lip|speaking|嘴型/i.test(video)) {
    return {
      ruleId: "PR-09",
      severity: "WARN",
      message: `镜 ${idx ?? "?"} 有台词建议 video 含口型/speaking 短语`,
      shotIndex: idx,
      reverseTrigger: prRuleToReverseTrigger("PR-09"),
    };
  }
  return null;
}

export function checkHighEmotionDuration(shot: Shot): PrCheckItem | null {
  const emotion = Number(shot.emotion ?? (shot.narrative as { emotionIntensity?: number })?.emotionIntensity ?? 0);
  const dur = Number(shot.duration ?? 0);
  const idx = shot.shotIndex as number | undefined;
  if (emotion >= 8 && dur > 0 && dur < 2) {
    return { ruleId: "PR-14", severity: "BLOCK", message: `镜 ${idx ?? "?"} 高强度情绪镜时长过短`, shotIndex: idx };
  }
  return null;
}

function shotHasCharacter(shot: Shot): boolean {
  const n = (shot.narrative as {
    type?: string;
    charCodes?: unknown;
    assetCodes?: unknown;
  }) ?? {};
  if (String(n.type ?? "").includes("CHAR")) return true;
  const charPools = [shot.charCodes, n.charCodes];
  for (const p of charPools) {
    if (Array.isArray(p) && p.length > 0) return true;
  }
  const assets = n.assetCodes;
  return Array.isArray(assets) && assets.some((c) => typeof c === "string" && /^CHAR-/i.test(c));
}

export function checkDialogueHasCharacter(shot: Shot): PrCheckItem | null {
  const lines = (shot.narrative as { dialogue?: { lines?: unknown[] } })?.dialogue?.lines ?? [];
  const idx = shot.shotIndex as number | undefined;
  if (lines.length && !shotHasCharacter(shot)) {
    return { ruleId: "PR-04", severity: "BLOCK", message: `镜 ${idx ?? "?"} 台词镜无人物`, shotIndex: idx };
  }
  return null;
}

export function rewriteDurationFromDialogue(shot: Shot, speechSpeed = 4): number {
  const text = dialogueText(shot);
  const metrics = measureDialogue({ text, speechSpeed });
  const cur = Number(shot.duration ?? (shot.narrative as { duration?: number })?.duration ?? 0);
  return suggestShotDuration(cur, metrics);
}

export function runPrValidator(bundle: ScriptBundle, speechSpeed = 4): { items: PrCheckItem[] } {
  const items: PrCheckItem[] = [];
  const shots = (bundle.preDesignPack?.shots ?? []) as Shot[];

  for (const shot of shots) {
    for (const fn of [
      () => checkHighEmotionDuration(shot),
      () => checkDialogueHasCharacter(shot),
      () => checkDialogueDuration(shot, speechSpeed),
    ]) {
      const hit = fn();
      if (hit) items.push(hit);
    }
  }
  items.push(...runPrEmitters(shots));
  return { items };
}
