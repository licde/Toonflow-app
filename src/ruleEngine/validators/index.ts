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
  opts?: {
    planData?: import("../bundle/types").ScriptBundle["planData"];
    /** When set, shot-level gates (V* / MODE-AGNES) only run on these storyboard ids. */
    storyboardIds?: number[];
  },
): ValidationReport {
  // undefined = all shots; [] / ids = only those (empty ⇒ skip shot-level gates)
  const scopedShots =
    opts?.storyboardIds != null
      ? pkg.shots.filter((s) => s.storyboardId != null && opts.storyboardIds!.includes(s.storyboardId))
      : pkg.shots;
  const issues: ValidationIssue[] = [
    ...validateTier0Shots(scopedShots, config),
    ...dialogueFidelityGate(pkg, script, { planData: opts?.planData }),
    ...modeAgnesGate(scopedShots, storyboardRows, config.videoVendor),
  ];
  return buildValidationReport(pkg.projectId, pkg.scriptId, issues);
}
