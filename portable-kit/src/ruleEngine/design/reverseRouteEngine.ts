import { readFixtureJson } from "../utils/fixturesPath";
import { resolvePresentationFork } from "./presentationForkResolver";

export interface RePushPlanItem {
  id: string;
  reverseTarget: string;
  forwardRerun: string[];
  preserveFields?: string[];
  presentationFork?: "fork-A" | "fork-B" | null;
  reason: string;
  status: "pending" | "in_progress" | "completed" | "exhausted";
}

type RouteEntry = { trigger: string; reverseTarget: string; forwardStages?: string[] };

let routeCache: RouteEntry[] | null = null;
let matrixCache: { repairPriorityOrder?: string[] } | null = null;

function loadRoutes(): RouteEntry[] {
  if (routeCache) return routeCache;
  routeCache = readFixtureJson<{ routes?: RouteEntry[] }>("reverse_route_table.json", { routes: [] }).routes ?? [];
  return routeCache;
}

function loadMatrix() {
  if (matrixCache) return matrixCache;
  matrixCache = readFixtureJson<{ repairPriorityOrder?: string[] }>("unified_closure_matrix.json", {});
  return matrixCache;
}

export function getRepairPriorityOrder(): string[] {
  return loadMatrix().repairPriorityOrder ?? ["VID", "IMG", "AUD", "FX", "EN", "SB", "W3"];
}

export function resolveReverseTarget(trigger: string): string {
  const routes = loadRoutes();
  const hit = routes.find((r) => r.trigger === trigger);
  return hit?.reverseTarget ?? "SB";
}

export function buildRePushPlan(triggers: string[], preserveFields: string[] = ["script", "globalAnchors"]): RePushPlanItem[] {
  const routes = loadRoutes();
  return triggers.map((t, i) => {
    const hit = routes.find((r) => r.trigger === t);
    return {
      id: `RP-auto-${i + 1}`,
      reverseTarget: hit?.reverseTarget ?? "SB",
      forwardRerun: hit?.forwardStages ?? [hit?.reverseTarget ?? "SB"],
      preserveFields,
      presentationFork: resolvePresentationFork(t),
      reason: `trigger:${t}`,
      status: "pending" as const,
    };
  });
}

export function classifyChainBreaks(brokenChainIds: string[]): "linkageRepair" | "rePush" {
  return brokenChainIds.length <= 1 ? "linkageRepair" : "rePush";
}
