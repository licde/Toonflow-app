/**
 * M11 Chain break diagnostics — breakAt → repair plan class.
 */
import type { ChainBreakAt } from "../quality/shotChainContract";

export type ChainBreakPlan = "linkageRepairPlan" | "rePushPlan" | "designSupplement" | "camHeal" | "camSplit";

const BREAK_TO_PLAN: Record<ChainBreakAt, ChainBreakPlan> = {
  ok: "linkageRepairPlan",
  literary: "designSupplement",
  design: "designSupplement",
  design_loss: "designSupplement",
  split: "camSplit",
  cam_split: "camSplit",
  cam_heal: "camHeal",
  import: "rePushPlan",
  still: "rePushPlan",
  video: "rePushPlan",
  audio: "camHeal",
};

/** Legacy: count-based. Prefer classifyByBreakAt when findings exist. */
export function classifyChainBreaks(brokenCount: number): "linkageRepairPlan" | "rePushPlan" {
  return brokenCount <= 1 ? "linkageRepairPlan" : "rePushPlan";
}

export function classifyByBreakAt(breakAt: ChainBreakAt | string | undefined): ChainBreakPlan {
  if (!breakAt || breakAt === "ok") return "linkageRepairPlan";
  return BREAK_TO_PLAN[breakAt as ChainBreakAt] ?? "rePushPlan";
}

export function primaryBreakAt(
  findings: { breakAt?: string; severity?: string }[],
): ChainBreakAt {
  const block = findings.find((f) => f.severity === "BLOCK" && f.breakAt);
  if (block?.breakAt) return block.breakAt as ChainBreakAt;
  const any = findings.find((f) => f.breakAt);
  return (any?.breakAt as ChainBreakAt) ?? "ok";
}
