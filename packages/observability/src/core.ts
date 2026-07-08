import crypto from "node:crypto";
import type { AiErrorCategory } from "./types";

const LEVEL_ORDER = ["trace", "debug", "info", "warn", "error", "fatal"] as const;

export function levelGte(a: string, b: string): boolean {
  return LEVEL_ORDER.indexOf(a as any) >= LEVEL_ORDER.indexOf(b as any);
}

export function redactText(input: string): string {
  return input
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer ***")
    .replace(/(api[_-]?key|authorization)["']?\s*[:=]\s*["']?[^"'\s,}]+/gi, "$1:***")
    .replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/gi, "data:image/***")
    .replace(/data:video\/[^;]+;base64,[A-Za-z0-9+/=]+/gi, "data:video/***");
}

export function sanitizeMessage(msg: string): string {
  return redactText(msg.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "")).slice(0, 4000);
}

export function truncatePayload(payload: Record<string, unknown> | undefined, max = 16384): Record<string, unknown> | undefined {
  if (!payload) return payload;
  const json = JSON.stringify(payload);
  if (json.length <= max) return payload;
  return { ...payload, payloadTruncated: true, _preview: json.slice(0, 500) };
}

export function normalizeVendorMessage(msg: string): string {
  return msg
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "<uuid>")
    .replace(/\d{10,13}/g, "<ts>")
    .slice(0, 500);
}

export function computeFingerprint(vendorId: string | undefined, category: string | undefined, message: string): string {
  const base = `${vendorId || ""}|${category || ""}|${normalizeVendorMessage(message)}`;
  return crypto.createHash("sha256").update(base).digest("hex").slice(0, 16);
}

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

export const BALANCED_PROFILE: Partial<import("./types").SwitchConfig> = {
  enabled: true,
  level: "info",
  transports: { stdout: true, file: true, sqlite: true },
  features: {
    trace: true,
    sampler: true,
    redact: true,
    promptDebug: false,
    recommend: true,
    fingerprint: true,
    playbook: true,
  },
  retentionDays: 30,
};
