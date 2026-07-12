import type { EpisodePackage, PipelineStage, ValidationIssue, ValidationReport, ResolvedConfig } from "../types";
import { getRulePackVersion, getRules, getTier0Rules } from "../ruleRegistry";
import { validateTier0Shots } from "./tier0Validators";
import { dialogueFidelityGate, modeAgnesGate } from "./gates";

const DEFAULT_STAGE: Record<PipelineStage, "pass" | "warn" | "block" | "skip"> = {
  "N-1": "skip",
  P0: "pass",
  G: "pass",
  BP: "pass",
  GB: "pass",
  SB: "pass",
  EN: "pass",
  MD: "pass",
  P2: "skip",
};

export function buildValidationReport(
  projectId: number,
  scriptId: number,
  issues: ValidationIssue[],
): ValidationReport {
  const blockCount = issues.filter((i) => i.severity === "BLOCK").length;
  const warnCount = issues.filter((i) => i.severity === "WARN").length;
  const rules = getRules();
  const tier0 = getTier0Rules();
  const hitIds = new Set(issues.map((i) => i.ruleId));
  const stageStatus = { ...DEFAULT_STAGE };
  if (issues.some((i) => i.rollbackLayer === "SB" && i.severity === "BLOCK")) stageStatus.SB = "block";
  else if (issues.some((i) => i.rollbackLayer === "SB")) stageStatus.SB = "warn";
  if (issues.some((i) => i.rollbackLayer === "EN" && i.severity === "BLOCK")) stageStatus.EN = "block";
  if (issues.some((i) => i.rollbackLayer === "MD" && i.severity === "BLOCK")) stageStatus.MD = "block";

  return {
    scriptId,
    projectId,
    passed: blockCount === 0,
    blockCount,
    warnCount,
    issues,
    stageStatus,
    ruleCoverage: {
      total: rules.length,
      hit: hitIds.size,
      tier0Hit: tier0.filter((r) => hitIds.has(r.id)).length,
      executed: hitIds.size,
      registered: rules.length,
      skipped: Math.max(0, rules.length - hitIds.size),
    },
    rulePackVersion: getRulePackVersion(),
  };
}

export function validatePackage(
  pkg: EpisodePackage,
  config: ResolvedConfig,
  script: string,
  storyboardRows: { id: number; filePath?: string | null; shouldGenerateImage?: number }[] = [],
): ValidationReport {
  const issues: ValidationIssue[] = [
    ...validateTier0Shots(pkg.shots, config),
    ...dialogueFidelityGate(pkg, script),
    ...modeAgnesGate(pkg.shots, storyboardRows, config.videoVendor),
  ];
  return buildValidationReport(pkg.projectId, pkg.scriptId, issues);
}
