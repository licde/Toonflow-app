import type { LogEvent } from "../types";

export function estimateCostUsd(events: LogEvent[], pricePer1kTokens = 0.002) {
  let tokens = 0;
  for (const e of events) {
    if (e.category !== "ai_call") continue;
    const t = Number(e.payload?.totalTokens || e.payload?.tokens || 0);
    if (t > 0) tokens += t;
  }
  return { tokens, usd: (tokens / 1000) * pricePer1kTokens };
}
