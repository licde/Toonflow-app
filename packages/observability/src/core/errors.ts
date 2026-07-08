import type { AiErrorCategory } from "../types";

export function categorizeAiError(err: unknown): AiErrorCategory {
  const anyErr = err as any;
  const status = anyErr?.status ?? anyErr?.response?.status;
  const msg = String(anyErr?.message || err || "").toLowerCase();
  if (status === 401 || status === 403 || msg.includes("api key") || msg.includes("unauthorized")) return "auth";
  if (status === 429 || msg.includes("rate limit") || msg.includes("too many")) return "rate_limit";
  if (status === 402 || msg.includes("quota") || msg.includes("insufficient")) return "quota_exceeded";
  if (status === 408 || msg.includes("timeout") || msg.includes("timed out")) return "timeout";
  if (status === 502 || status === 503 || status === 504) return "provider_down";
  if (msg.includes("content filter") || msg.includes("moderation") || msg.includes("safety")) return "content_filter";
  if (status === 400 || msg.includes("invalid")) return "invalid_request";
  return "unknown";
}

export function extractUpstreamMessage(err: unknown): string {
  const anyErr = err as any;
  const data = anyErr?.responseData ?? anyErr?.response?.data;
  if (typeof data === "string") return data.slice(0, 500);
  if (data?.error?.message) return String(data.error.message).slice(0, 500);
  if (data?.message) return String(data.message).slice(0, 500);
  return String(anyErr?.message || err).slice(0, 500);
}
