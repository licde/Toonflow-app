import type { EpisodePackage, ValidationIssue } from "../types";
import type { ScriptBundle } from "../bundle/types";
import { dialogueCoverageReport } from "../design/dialogueCoverage";

export function dialogueFidelityGate(
  pkg: EpisodePackage,
  script: string,
  opts?: { planData?: ScriptBundle["planData"] },
): ValidationIssue[] {
  const report = dialogueCoverageReport({
    script,
    shots: pkg.shots,
    planData: opts?.planData,
  });

  pkg.scriptHash = report.expectedHash;
  pkg.storyboardHash = report.actualHash;

  // Expected dialogue exists but shots cover nothing → BLOCK (no silent skip)
  if (!report.ok) {
    return [
      {
        ruleId: "H3",
        tier: 0,
        severity: "BLOCK",
        fieldPath: "narrative.dialogue.lines",
        message: `台词覆盖不足：缺 ${report.missingCount} 条`,
        rollbackLayer: "SB",
      },
      {
        ruleId: "R2",
        tier: 0,
        severity: "BLOCK",
        fieldPath: "narrative.dialogue.lines",
        message: "剧本与分镜台词覆盖不一致",
        rollbackLayer: "SB",
      },
    ];
  }

  if (report.orderMismatch) {
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
