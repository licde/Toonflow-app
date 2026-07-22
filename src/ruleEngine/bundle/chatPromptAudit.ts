import type { ScriptBundle, PreDesignShot, ShotGeneration } from "./types";
import { dialogueCoverageReport, expandShotDialogueLines } from "../design/dialogueCoverage";
import { checkQp02VisualDescription } from "./visualQualityAudit";

export interface ChatPromptGap {
  id: string;
  shotIndex?: number;
  severity: "BLOCK" | "WARN";
  message: string;
  field?: string;
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

function shotHasDialogue(shot: PreDesignShot): boolean {
  return expandShotDialogueLines([shot]).keys.length > 0;
}

export function auditChatPromptGaps(
  bundle: ScriptBundle,
  tier: "T1" | "T2" | "T3" = "T3",
  opts?: { nonBlocking?: boolean },
): ChatPromptGap[] {
  const demote = opts?.nonBlocking ?? false;
  const sev = (s: "BLOCK" | "WARN"): "BLOCK" | "WARN" => (demote && s === "BLOCK" ? "WARN" : s);
  const gaps: ChatPromptGap[] = [];
  const shots = getShots(bundle);

  const coverage = dialogueCoverageReport({
    script: bundle.script ?? "",
    shots,
    planData: bundle.planData,
  });
  if (!coverage.ok) {
    const sample = coverage.missingKeys[0] ?? "";
    gaps.push({
      id: "CHAT-DLG-01",
      severity: sev("BLOCK"),
      message: `台词覆盖不足：缺 ${coverage.missingCount} 条${sample ? `（如 ${sample.slice(0, 40)}）` : ""}`,
      field: "dialogue",
    });
  }

  shots.forEach((s, i) => {
    const idx = s.shotIndex ?? i + 1;
    const qp = checkQp02VisualDescription({
      visualDescription: s.visualDescription,
      shotIndex: idx,
    });
    if (qp && qp.severity === "BLOCK") {
      // Same core as export QP-02; keep CHAT-SB-01 alias when empty for legacy scanners
      gaps.push({
        id: qp.evidence?.reason === "empty" ? "CHAT-SB-01" : "QP-02",
        shotIndex: idx,
        severity: "BLOCK",
        message: qp.message,
        field: "visualDescription",
      });
      if (qp.evidence?.reason === "empty") {
        gaps.push({
          id: "QP-02",
          shotIndex: idx,
          severity: "BLOCK",
          message: qp.message,
          field: "visualDescription",
        });
      }
    }
  });

  if (tier === "T2" || tier === "T3") {
    const cd = bundle.characterDesign as { assets?: unknown[] } | undefined;
    if (!cd?.assets?.length) {
      gaps.push({ id: "CHAT-CD-01", severity: sev("BLOCK"), message: "缺 characterDesign.assets", field: "characterDesign" });
    }
    if (!bundle.visualLockTable || !Object.keys(bundle.visualLockTable).length) {
      gaps.push({ id: "CHAT-BP-01", severity: sev("BLOCK"), message: "缺 visualLockTable", field: "visualLockTable" });
    }
  }

  if (tier === "T3") {
    shots.forEach((s, i) => {
      const idx = s.shotIndex ?? i + 1;
      const gen = getGeneration(s, bundle, i);
      if (!gen?.imagePrompt?.trim()) {
        gaps.push({ id: "CHAT-IMG-01", shotIndex: idx, severity: sev("BLOCK"), message: "缺 imagePrompt", field: "imagePrompt" });
      }
      if (!gen?.videoPrompt?.trim()) {
        gaps.push({ id: "CHAT-VID-01", shotIndex: idx, severity: sev("BLOCK"), message: "缺 videoPrompt", field: "videoPrompt" });
      }
      if (shotHasDialogue(s) && !gen?.audioPrompt?.trim()) {
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
