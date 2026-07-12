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
