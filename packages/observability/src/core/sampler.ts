export function shouldSample(traceId: string | undefined, rate = 1): { sampled: boolean; reason?: string } {
  if (rate >= 1) return { sampled: true };
  if (!traceId) return { sampled: Math.random() < rate, reason: "random" };
  let hash = 0;
  for (let i = 0; i < traceId.length; i++) hash = (hash * 31 + traceId.charCodeAt(i)) >>> 0;
  const bucket = (hash % 10000) / 10000;
  return { sampled: bucket < rate, reason: "trace_hash" };
}
