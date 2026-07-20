import type { RePushPlanItem } from "./reverseRouteEngine";

export function planRePush(items: RePushPlanItem[]): {
  stagesToRerun: string[];
  preservedFields: string[];
  round: number;
} {
  const stages = [...new Set(items.flatMap((i) => i.forwardRerun))];
  const preserved = [...new Set(items.flatMap((i) => i.preserveFields ?? []))];
  const round = items[0] ? 1 : 0;
  return { stagesToRerun: stages, preservedFields: preserved, round };
}

/**
 * Execute rePush plan: mark items completed and return concrete stage list.
 * Design-stage LLM rewrite remains FE/Chat; this records executable stage order for runners.
 */
export function executeRePushPlan(
  items: RePushPlanItem[],
  opts?: { maxRounds?: number; currentRound?: number },
): {
  stagesToRerun: string[];
  preservedFields: string[];
  round: number;
  status: "pending" | "completed" | "exhausted";
  items: (RePushPlanItem & { status: string })[];
} {
  const planned = planRePush(items);
  const maxRounds = opts?.maxRounds ?? 3;
  const round = opts?.currentRound ?? planned.round;
  if (round > maxRounds) {
    return {
      ...planned,
      round,
      status: "exhausted",
      items: items.map((i) => ({ ...i, status: "exhausted" })),
    };
  }
  return {
    ...planned,
    round,
    status: planned.stagesToRerun.length ? "completed" : "pending",
    items: items.map((i) => ({
      ...i,
      status: i.forwardRerun?.length ? "completed" : "pending",
    })),
  };
}
