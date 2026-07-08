import crypto from "node:crypto";

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
