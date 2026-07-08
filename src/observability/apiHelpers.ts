import type { LogEvent } from "@toonflow/observability";
import { aggregateVendors, buildRecommendations, findSimilar, computeHealthScore, estimateCostUsd, buildAssistantSummary } from "@toonflow/observability";
import { getObs } from "./bootstrap";
import { getTraceEvents, queryLogs } from "./store";

export function rowToLogEvent(row: Record<string, unknown>): LogEvent {
  return {
    schemaVersion: 1,
    ts: Number(row.ts),
    level: row.level as LogEvent["level"],
    category: row.category as LogEvent["category"],
    message: String(row.message || ""),
    traceId: row.traceId ? String(row.traceId) : undefined,
    appId: String(row.appId || "toonflow"),
    module: row.module ? String(row.module) : undefined,
    vendorId: row.vendorId ? String(row.vendorId) : undefined,
    model: row.model ? String(row.model) : undefined,
    projectId: row.projectId != null ? Number(row.projectId) : undefined,
    taskId: row.taskId != null ? Number(row.taskId) : undefined,
    errorFingerprint: row.errorFingerprint ? String(row.errorFingerprint) : undefined,
    payload: row.payload ? JSON.parse(String(row.payload)) : undefined,
    entityRefs: row.entityRefs ? JSON.parse(String(row.entityRefs)) : undefined,
  };
}

export async function fetchRecentAiEvents(days = 7, limit = 500) {
  const from = Date.now() - days * 86400000;
  const { rows } = await queryLogs({ category: "ai_call", from, limit });
  return rows.map((r) => rowToLogEvent(r as Record<string, unknown>));
}

export async function diagnoseTrace(traceId: string) {
  const obs = getObs();
  const rows = await getTraceEvents(traceId);
  const events = rows.map((r) => rowToLogEvent(r as Record<string, unknown>));
  return { traceId, events, diagnosis: obs.diagnose(traceId, events) };
}

export async function similarByFingerprint(fingerprint: string, limit = 20) {
  const { rows } = await queryLogs({ limit: 500 });
  const events = rows.map((r) => rowToLogEvent(r as Record<string, unknown>));
  return findSimilar(events, fingerprint).slice(0, limit);
}

export async function aggregateVendorStats(days = 7) {
  const events = await fetchRecentAiEvents(days);
  return aggregateVendors(events);
}

export async function listRecommendations() {
  const obs = getObs();
  const events = await fetchRecentAiEvents(7);
  const recommendations = buildRecommendations(events, obs.getSwitches());
  const healthScore = computeHealthScore(events);
  const cost = estimateCostUsd(events);
  return { recommendations, healthScore, cost };
}

export async function assistantForTrace(traceId: string) {
  const rows = await getTraceEvents(traceId);
  const events = rows.map((r) => rowToLogEvent(r as Record<string, unknown>));
  return buildAssistantSummary(traceId, events);
}
