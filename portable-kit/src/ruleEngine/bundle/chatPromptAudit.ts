import type { ScriptBundle, PreDesignShot, ShotGeneration } from "./types";

export interface ChatPromptGap {
  id: string;
  shotIndex?: number;
  severity: "BLOCK" | "WARN";
  message: string;
  field?: string;
}

const DIALOGUE_RE = /[^\n：:]+[：:]\s*[^\n]+/g;

function normDialogue(s: string): string {
  return s
    .replace(/\s+/g, "")
    .replace(/[""「」'']/g, "")
    .replace(/\\"/g, "");
}

function extractScriptDialogueLines(script: string): string[] {
  return (script.match(DIALOGUE_RE) ?? []).map((l) => l.trim()).filter(Boolean);
}

function shotDialogueLines(shot: PreDesignShot): string[] {
  const lines = shot.narrative?.dialogue?.lines ?? [];
  return lines.map((l) => `${l.speaker ?? ""}：${l.text ?? ""}`.trim()).filter((s) => s.length > 1);
}

function dialogueCovered(scriptLine: string, covered: Set<string>): boolean {
  const norm = normDialogue(scriptLine);
  return [...covered].some((c) => {
    const cn = normDialogue(c);
    return cn.includes(norm) || norm.includes(cn);
  });
}

function getShots(bundle: ScriptBundle): PreDesignShot[] {
  return bundle.preDesignPack?.shots ?? [];
}

function getGeneration(shot: PreDesignShot, bundle: ScriptBundle, idx: number): ShotGeneration | undefined {
  if (shot.generation) return shot.generation;
  const panel = bundle.flowData?.storyboard?.[idx];
  if (panel) {
    return { imagePrompt: panel.prompt, videoPrompt: panel.videoDesc };
  }
  return undefined;
}

export function auditChatPromptGaps(bundle: ScriptBundle, tier: "T1" | "T2" | "T3" = "T3"): ChatPromptGap[] {
  const gaps: ChatPromptGap[] = [];
  const shots = getShots(bundle);
  const scriptLines = extractScriptDialogueLines(bundle.script ?? "");

  if (scriptLines.length > 0 && shots.length > 0) {
    const covered = new Set<string>();
    for (const s of shots) {
      for (const line of shotDialogueLines(s)) covered.add(line);
    }
    for (const line of scriptLines) {
      if (!dialogueCovered(line, covered)) {
        gaps.push({ id: "CHAT-DLG-01", severity: "BLOCK", message: `剧本台词未映射到 shots: ${line.slice(0, 40)}`, field: "dialogue" });
      }
    }
  }

  shots.forEach((s, i) => {
    const idx = s.shotIndex ?? i + 1;
    if (!s.visualDescription?.trim()) {
      gaps.push({ id: "CHAT-SB-01", shotIndex: idx, severity: "BLOCK", message: "缺 visualDescription", field: "visualDescription" });
    }
  });

  if (tier === "T2" || tier === "T3") {
    const cd = bundle.characterDesign as { assets?: unknown[] } | undefined;
    if (!cd?.assets?.length) {
      gaps.push({ id: "CHAT-CD-01", severity: "BLOCK", message: "缺 characterDesign.assets", field: "characterDesign" });
    }
    if (!bundle.visualLockTable || !Object.keys(bundle.visualLockTable).length) {
      gaps.push({ id: "CHAT-BP-01", severity: "BLOCK", message: "缺 visualLockTable", field: "visualLockTable" });
    }
  }

  if (tier === "T3") {
    shots.forEach((s, i) => {
      const idx = s.shotIndex ?? i + 1;
      const gen = getGeneration(s, bundle, i);
      if (!gen?.imagePrompt?.trim()) {
        gaps.push({ id: "CHAT-IMG-01", shotIndex: idx, severity: "BLOCK", message: "缺 imagePrompt", field: "imagePrompt" });
      }
      if (!gen?.videoPrompt?.trim()) {
        gaps.push({ id: "CHAT-VID-01", shotIndex: idx, severity: "BLOCK", message: "缺 videoPrompt", field: "videoPrompt" });
      }
      const hasDialogue = shotDialogueLines(s).length > 0;
      if (hasDialogue && !gen?.audioPrompt?.trim()) {
        gaps.push({ id: "CHAT-AUD-01", shotIndex: idx, severity: "WARN", message: "台词镜缺 audioPrompt", field: "audioPrompt" });
      }
      const fx = (s as PreDesignShot & { visualEffect?: string }).visualEffect;
      if (fx?.trim() && !gen?.fxPrompt?.trim()) {
        gaps.push({ id: "CHAT-FX-01", shotIndex: idx, severity: "WARN", message: "特效镜缺 fxPrompt", field: "fxPrompt" });
      }
    });
  }

  return gaps;
}

export function chatPromptBlocked(gaps: ChatPromptGap[]): boolean {
  return gaps.some((g) => g.severity === "BLOCK");
}
