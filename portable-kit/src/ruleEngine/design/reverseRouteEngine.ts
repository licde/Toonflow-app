import { resolvePresentationFork } from "./presentationForkResolver";
import {
  buildDeepRePushPlan,
  resolveReverseTargetDeep,
  type RePushPlanItem,
} from "../kernels/reverseKernel";

export type { RePushPlanItem };

export function getRepairPriorityOrder(): string[] {
  const { readFixtureJson } = require("../utils/fixturesPath") as typeof import("../utils/fixturesPath");
  const matrix = readFixtureJson<{ repairPriorityOrder?: string[] }>("unified_closure_matrix.json", {});
  return matrix.repairPriorityOrder ?? ["VID", "IMG", "AUD", "FX", "EN", "SB", "W3"];
}

/** Prefer DepthPolicy — never silent-default unknown to SB. */
export function resolveReverseTarget(trigger: string): string {
  return resolveReverseTargetDeep(trigger);
}

export function buildRePushPlan(triggers: string[], preserveFields: string[] = ["script", "globalAnchors"]): RePushPlanItem[] {
  return buildDeepRePushPlan(triggers, preserveFields);
}

export function classifyChainBreaks(brokenChainIds: string[]): "linkageRepair" | "rePush" {
  return brokenChainIds.length <= 1 ? "linkageRepair" : "rePush";
}

void resolvePresentationFork;
