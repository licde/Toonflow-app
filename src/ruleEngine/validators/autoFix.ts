import type { ValidationIssue } from "../types";

const AUTO_FIX: Record<string, (patch: Record<string, unknown>) => Record<string, unknown>> = {
  V3: (p) => ({ imageAppend: p.append ?? " --ar 1:1" }),
  "MODE-AGNES": (p) => ({ shouldGenerateImage: p.shouldGenerateImage ?? 1 }),
  V1: (p) => ({ type: p.type ?? "CHAR-SCENE" }),
};

export function applyAutoFix(issues: ValidationIssue[]): { applied: string[]; patches: Record<string, unknown>[] } {
  const applied: string[] = [];
  const patches: Record<string, unknown>[] = [];
  for (const issue of issues) {
    if (!issue.autoFix || issue.autoFix.confidence < 0.8) continue;
    const fn = AUTO_FIX[issue.ruleId];
    if (fn) {
      patches.push({ shotId: issue.shotId, fieldPath: issue.fieldPath, ...fn(issue.autoFix.patch) });
      applied.push(issue.ruleId);
    }
  }
  return { applied, patches };
}

export const FEEDBACK_ROUTING: Record<string, string> = {
  H2: "GB",
  H3: "SB",
  H4: "EN",
  H5: "EN",
  V1: "SB",
  V10: "SB",
  "MODE-AGNES": "MD",
};
