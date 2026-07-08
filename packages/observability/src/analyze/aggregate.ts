import type { LogEvent } from "../types";

export function aggregateVendors(events: LogEvent[]) {
  const map = new Map<string, { ok: number; fail: number; latencies: number[] }>();
  for (const e of events) {
    if (!e.vendorId) continue;
    const row = map.get(e.vendorId) || { ok: 0, fail: 0, latencies: [] };
    if (e.level === "error") row.fail += 1;
    else row.ok += 1;
    const lat = Number(e.payload?.latencyMs);
    if (lat > 0) row.latencies.push(lat);
    map.set(e.vendorId, row);
  }
  return [...map.entries()].map(([vendorId, v]) => {
    const lat = v.latencies.sort((a, b) => a - b);
    const p95 = lat.length ? lat[Math.floor(lat.length * 0.95)] || lat[lat.length - 1] : 0;
    const successRate = v.ok + v.fail ? v.ok / (v.ok + v.fail) : 0;
    return { vendorId, successRate, p95Ms: p95, score: successRate * 0.7 + (p95 ? Math.min(1, 3000 / p95) * 0.3 : 0) };
  });
}

export function findSimilar(events: LogEvent[], fingerprint: string) {
  return events.filter((e) => e.errorFingerprint === fingerprint);
}
