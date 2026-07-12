import fs from "fs";
import path from "path";

export interface RePushPlanItem {
  id: string;
  reverseTarget: string;
  forwardRerun: string[];
  preserveFields?: string[];
  presentationFork?: "fork-A" | "fork-B" | null;
  reason: string;
  status: "pending" | "in_progress" | "completed" | "exhausted";
}

let routeCache: { trigger: string; reverseTarget: string; forwardStages?: string[] }[] | null = null;
let matrixCache: { repairPriorityOrder?: string[] } | null = null;

function loadRoutes() {
  if (routeCache) return routeCache;
  const p = path.join(process.cwd(), "data", "fixtures", "reverse_route_table.json");
  routeCache = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf-8")).routes ?? [] : [];
  return routeCache;
}

function loadMatrix() {
  if (matrixCache) return matrixCache;
  const p = path.join(process.cwd(), "data", "fixtures", "unified_closure_matrix.json");
  matrixCache = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf-8")) : {};
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
      presentationFork: t === "emotion_composition" ? "fork-A" : null,
      reason: `trigger:${t}`,
      status: "pending" as const,
    };
  });
}

export function classifyChainBreaks(brokenChainIds: string[]): "linkageRepair" | "rePush" {
  return brokenChainIds.length <= 1 ? "linkageRepair" : "rePush";
}
