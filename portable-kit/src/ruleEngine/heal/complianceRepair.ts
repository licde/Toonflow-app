/**
 * Q8 compliance — detect policy hits and soft-rewrite via contentPolicyAdapter (M2).
 */
import { precheckContentPolicy } from "../compilers/contentPolicyAdapter";
import { buildPrimaryBlock, type PrimaryBlock } from "../compilers/primaryBlock";

export interface ComplianceRepairResult {
  hit: boolean;
  softenedPrompt: string;
  warnings: string[];
  primary?: PrimaryBlock;
  autoApplicable: boolean;
}

export function repairCompliancePrompt(prompt: string): ComplianceRepairResult {
  const policy = precheckContentPolicy(prompt);
  if (!policy.hasSensitiveTerms) {
    return { hit: false, softenedPrompt: prompt, warnings: [], autoApplicable: false };
  }
  return {
    hit: true,
    softenedPrompt: policy.softenedPrompt,
    warnings: policy.warnings,
    autoApplicable: Boolean(policy.softenedPrompt && policy.softenedPrompt !== prompt),
    primary: buildPrimaryBlock("soft_patch", {
      stage: "import",
      userMessageOverride: "内容含敏感表述，已尝试弱化；请确认后继续",
    }),
  };
}
