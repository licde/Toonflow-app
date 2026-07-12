import type { ProductionClosureCheck } from "../bundle/types";
import { readFixtureJson } from "../utils/fixturesPath";

export type ClosureLevel = "DC" | "PC" | "GC" | "IC";

export interface ClosureHandlerContext {
  bundle?: unknown;
  genError?: string;
  sfRound?: number;
  hasRePush?: boolean;
  probeDuration?: number;
  sbDuration?: number;
  probeHasAudio?: boolean;
  policyNative?: boolean;
}

type HandlerFn = (ctx: ClosureHandlerContext) => { passed: boolean; message: string };

const handlers = new Map<string, HandlerFn>();
const severityCache = new Map<string, string>();

function checklistFile(level: ClosureLevel): string {
  const map: Record<ClosureLevel, string> = {
    DC: "design_closure_checklist.json",
    PC: "production_closure_checklist.json",
    GC: "generation_closure_checklist.json",
    IC: "intelligent_closure_checklist.json",
  };
  return map[level];
}

export function loadChecklistSeverity(level: ClosureLevel, id: string, fallback = "WARN"): string {
  const key = `${level}:${id}`;
  if (severityCache.has(key)) return severityCache.get(key)!;
  const checks = readFixtureJson<{ checks?: { id: string; severity?: string }[] }>(checklistFile(level), { checks: [] }).checks ?? [];
  const sev = checks.find((c) => c.id === id)?.severity ?? fallback;
  severityCache.set(key, sev);
  return sev;
}

export function registerClosureHandler(id: string, fn: HandlerFn): void {
  handlers.set(id, fn);
}

export function registerClosureHandlers(entries: Record<string, HandlerFn>): void {
  for (const [id, fn] of Object.entries(entries)) handlers.set(id, fn);
}

export function runClosureLevel(level: ClosureLevel, ctx: ClosureHandlerContext): ProductionClosureCheck[] {
  const prefix = `${level}-`;
  const checklist = readFixtureJson<{ checks?: { id: string; severity?: string }[] }>(checklistFile(level), { checks: [] }).checks ?? [];
  const ids = checklist.map((c) => c.id).filter((id) => handlers.has(id));
  const fallbackIds = [...handlers.keys()].filter((id) => id.startsWith(prefix));
  const runIds = ids.length ? ids : fallbackIds;

  return runIds.map((id) => {
    const fn = handlers.get(id)!;
    const result = fn(ctx);
    return {
      id,
      passed: result.passed,
      message: result.message,
      severity: loadChecklistSeverity(level, id),
    };
  });
}

export function closureLevelBlocked(checks: ProductionClosureCheck[]): boolean {
  return checks.some((c) => !c.passed && c.severity === "BLOCK");
}

export function getRegisteredHandlerIds(): string[] {
  return [...handlers.keys()];
}
