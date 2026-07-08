import type { LogEvent } from "../types";

export interface AlertRule {
  id: string;
  match: (e: LogEvent) => boolean;
  severity: "warn" | "error";
  message: string;
}

export const DEFAULT_RULES: AlertRule[] = [
  {
    id: "vendor_fail_burst",
    severity: "error",
    match: (e) => e.level === "error" && e.category === "ai_call",
    message: "AI 厂商调用失败",
  },
  {
    id: "rate_limit_spike",
    severity: "warn",
    match: (e) => String(e.payload?.errorCategory) === "rate_limit",
    message: "检测到限流错误",
  },
];

export function evaluateRules(events: LogEvent[], rules = DEFAULT_RULES) {
  const hits: Array<{ ruleId: string; severity: string; message: string; event: LogEvent }> = [];
  for (const e of events) {
    for (const r of rules) {
      if (r.match(e)) hits.push({ ruleId: r.id, severity: r.severity, message: r.message, event: e });
    }
  }
  return hits;
}

export function detectAnomalyBaseline(events: LogEvent[], windowHours = 24) {
  const now = Date.now();
  const windowMs = windowHours * 3600000;
  const recent = events.filter((e) => e.ts >= now - windowMs && e.category === "ai_call");
  const errors = recent.filter((e) => e.level === "error").length;
  const rate = recent.length ? errors / recent.length : 0;
  const baseline = 0.05;
  return {
    errorRate: rate,
    baseline,
    anomalous: rate > baseline * 3 && errors >= 5,
    sampleSize: recent.length,
  };
}

export async function sendWebhook(url: string, payload: unknown) {
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000),
  });
}
