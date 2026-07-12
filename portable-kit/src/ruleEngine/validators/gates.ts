import type { EpisodePackage, ValidationIssue } from "../types";
import { stableHash, extractDialogueLines } from "../utils/hash";

export function dialogueFidelityGate(pkg: EpisodePackage, script: string): ValidationIssue[] {
  const scriptLines = extractDialogueLines(script);
  const sbLines = pkg.shots
    .map((s) => s.narrative.dialogue?.lines ?? s.narrative.lines ?? "")
    .filter(Boolean);
  const scriptHash = stableHash(scriptLines.join("|"));
  const sbHash = stableHash(sbLines.join("|"));
  pkg.scriptHash = stableHash(script);
  pkg.storyboardHash = sbHash;

  if (scriptLines.length && sbLines.length && scriptHash !== sbHash) {
    const missing = scriptLines.filter((l) => !sbLines.some((s) => s.includes(l.slice(0, 8))));
    if (missing.length) {
      return [
        {
          ruleId: "H3",
          tier: 0,
          severity: "BLOCK",
          fieldPath: "narrative.dialogue.lines",
          message: `台词保真失败：剧本有 ${missing.length} 条未出现在分镜`,
          rollbackLayer: "SB",
        },
        {
          ruleId: "R2",
          tier: 0,
          severity: "BLOCK",
          fieldPath: "narrative.dialogue.lines",
          message: "剧本 hash 与分镜 hash 不一致",
          rollbackLayer: "SB",
        },
      ];
    }
    return [
      {
        ruleId: "H3",
        tier: 0,
        severity: "WARN",
        fieldPath: "narrative.dialogue.lines",
        message: "台词顺序或标点与剧本略有差异",
        rollbackLayer: "SB",
      },
    ];
  }
  return [];
}

export function modeAgnesGate(
  shots: EpisodePackage["shots"],
  storyboardRows: { id: number; filePath?: string | null; shouldGenerateImage?: number }[],
  videoVendor: string,
): ValidationIssue[] {
  if (!/agnes/i.test(videoVendor)) return [];
  const issues: ValidationIssue[] = [];
  for (const shot of shots) {
    const sb = storyboardRows.find((r) => r.id === shot.storyboardId);
    if (!sb) continue;
    if (!sb.filePath) {
      issues.push({
        ruleId: "MODE-AGNES",
        tier: 0,
        severity: "BLOCK",
        shotId: shot.id,
        fieldPath: "storyboardId",
        message: `镜 ${shot.index + 1} Agnes 模式需要首位帧图片`,
        rollbackLayer: "MD",
      });
    }
    if (sb.shouldGenerateImage === 0) {
      issues.push({
        ruleId: "MODE-AGNES",
        tier: 0,
        severity: "BLOCK",
        shotId: shot.id,
        fieldPath: "shouldGenerateImage",
        message: `镜 ${shot.index + 1} shouldGenerateImage 必须为 true`,
        rollbackLayer: "MD",
        autoFix: { patch: { shouldGenerateImage: 1 }, confidence: 0.95 },
      });
    }
  }
  return issues;
}
