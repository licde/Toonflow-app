/** V5 剩余规则 stub 分级（P3） */
export const STUB_RULE_LAYERS = ["L5", "L6", "W", "X", "I", "Z"] as const;

export function classifyRuleLanding(ruleId: string): "executable" | "template" | "llm" | "human" {
  if (/^V\d+|^H\d+|^R\d+/.test(ruleId)) return "executable";
  if (/^Y\d+|^EN/.test(ruleId)) return "template";
  if (/^W\d+|^L[56]/.test(ruleId)) return "llm";
  return "human";
}
