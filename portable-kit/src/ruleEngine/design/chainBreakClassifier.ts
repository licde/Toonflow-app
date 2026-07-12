export function classifyChainBreaks(brokenCount: number): "linkageRepairPlan" | "rePushPlan" {
  return brokenCount <= 1 ? "linkageRepairPlan" : "rePushPlan";
}
