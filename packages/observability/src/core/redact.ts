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
