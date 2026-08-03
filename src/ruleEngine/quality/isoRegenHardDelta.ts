/**
 * Isomorphic regen hard-delta — refuse vendor spend when contract/refs unchanged.
 */
import { createHash } from "crypto";

export function hashStillGenFingerprint(input: {
  promptUsed?: string | null;
  refsRoles?: string[] | null;
  refUrls?: string[] | null;
  visualDescription?: string | null;
  actuatorId?: string | null;
}): string {
  const blob = [
    String(input.promptUsed ?? "").trim(),
    String(input.visualDescription ?? "").trim(),
    (input.refsRoles ?? []).join(","),
    (input.refUrls ?? []).join("|"),
    String(input.actuatorId ?? ""),
  ].join("\n");
  return createHash("sha256").update(blob).digest("hex").slice(0, 24);
}

export function assertStillGenDeltaOrThrow(input: {
  prevFingerprint?: string | null;
  nextFingerprint: string;
  force?: boolean;
  /** Forced delta hints from literary repair (seed/propSoft/drop_softEnv) */
  deltaHints?: string[] | null;
}): { ok: true } | { ok: false; code: "ISO_REGEN_NO_DELTA"; message: string } {
  if (input.force) return { ok: true };
  if ((input.deltaHints ?? []).length > 0) return { ok: true };
  const prev = String(input.prevFingerprint ?? "").trim();
  if (!prev) return { ok: true };
  if (prev === input.nextFingerprint) {
    return {
      ok: false,
      code: "ISO_REGEN_NO_DELTA",
      message: "同构再生成无 contract/refs 差分，已拒绝厂商花费；请先增强设计或智拆后再生成",
    };
  }
  return { ok: true };
}

/** Apply literary repair delta hints into fingerprint salt (anti-isomorphic). */
export function applyLiteraryRepairDeltaSalt(
  fingerprint: string,
  deltaHints?: string[] | null,
): string {
  const hints = (deltaHints ?? []).filter(Boolean);
  if (!hints.length) return fingerprint;
  return createHash("sha256")
    .update(`${fingerprint}|${hints.sort().join(",")}|${Date.now()}`)
    .digest("hex")
    .slice(0, 24);
}
