/**
 * SSOT for CHAR/SCENE/PROP/INF/P code normalization.
 * Export prefers CHAR-<SLUG>; CHAR-NNN dual-accepted.
 */

export type AssetCodeKind = "CHAR" | "SCENE" | "PROP" | "INF" | "P" | "UNKNOWN";

const KIND_PAD: Record<Exclude<AssetCodeKind, "UNKNOWN">, number> = {
  CHAR: 3,
  SCENE: 3,
  PROP: 3,
  INF: 2,
  P: 3,
};

const DIGIT_RE = /^(CHAR|SCENE|PROP|INF|P)[\s\-_]*0*(\d+)$/i;
/** Semantic slug: CHAR-QINGCI / CHAR_QINGCI */
const SLUG_RE = /^(CHAR|SCENE|PROP)[-_]([A-Za-z][A-Za-z0-9]*)$/i;

/** Split comma/顿号 joined tokens before normalize. */
export function splitCodeTokens(raw: string): string[] {
  return raw
    .split(/[,，、;/|]+/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("--"));
}

export function kindOf(code: string): AssetCodeKind {
  const m = code.trim().match(/^(CHAR|SCENE|PROP|INF|P)(?=[-_\s]|$)/i);
  if (!m) return "UNKNOWN";
  return m[1].toUpperCase() as Exclude<AssetCodeKind, "UNKNOWN">;
}

/**
 * Normalize to canonical form.
 * Digits → CHAR-005; Slug → CHAR-QINGCI. Returns null if unrecognized.
 */
export function normalizeAssetCode(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const token = raw.trim();
  if (!token) return null;

  const dig = token.match(DIGIT_RE);
  if (dig) {
    const kind = dig[1].toUpperCase() as Exclude<AssetCodeKind, "UNKNOWN">;
    const n = Number(dig[2]);
    if (!Number.isFinite(n) || n < 0) return null;
    const pad = KIND_PAD[kind];
    return `${kind}-${String(n).padStart(pad, "0")}`;
  }

  const slug = token.match(SLUG_RE);
  if (slug) {
    const kind = slug[1].toUpperCase() as "CHAR" | "SCENE" | "PROP";
    const body = slug[2].toUpperCase();
    return `${kind}-${body}`;
  }

  return null;
}

/** Normalize or return trimmed original when not a typed code. */
export function normalizeAssetCodeLoose(raw: string): string {
  return normalizeAssetCode(raw) ?? raw.replace(/[,，].*$/, "").trim();
}

export function normalizeAssetCodes(raws: Iterable<string>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of raws) {
    for (const part of splitCodeTokens(raw)) {
      const n = normalizeAssetCode(part);
      if (!n || seen.has(n)) continue;
      seen.add(n);
      out.push(n);
    }
    // Also extract embedded KIND+slug/digit from space-joined blocks
    const embedded = /(CHAR|SCENE|PROP|INF|P)[-_\s]*0*\d+|(CHAR|SCENE|PROP)[-_][A-Za-z][A-Za-z0-9]*/gi;
    for (const m of String(raw).matchAll(embedded)) {
      const n = normalizeAssetCode(m[0]);
      if (!n || seen.has(n)) continue;
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}

export function assertCanonical(code: string): boolean {
  const n = normalizeAssetCode(code);
  return n != null && n === code.trim();
}

export function parseAssetCode(raw: string): { kind: AssetCodeKind; canonical: string | null } {
  const canonical = normalizeAssetCode(raw);
  return { kind: canonical ? kindOf(canonical) : "UNKNOWN", canonical };
}

/** Long L-layer keys accepted only at ingest; short keys are export canonical. */
export const L_LONG_TO_SHORT: Record<string, string> = {
  L0_identity: "L0",
  L1_face: "L1",
  L2_hair: "L2",
  L3_costume: "L3",
  L4_posture: "L4",
  L5_voice: "L5",
  L6_arcVisual: "L6",
};

export function isShortLKey(key: string): boolean {
  return /^L[0-6]$/.test(key);
}

/** Language policy SSOT: AUD = source language; VID motion shell = EN */
export const LANGUAGE_POLICY = {
  audioPayload: "source_language" as const,
  videoMotionShell: "en" as const,
  forbidLineTranslationInVideo: true,
};

export const ASSET_CODE_TEST_VECTORS: { input: string; expect: string | null }[] = [
  { input: "CHAR-005", expect: "CHAR-005" },
  { input: "CHAR005", expect: "CHAR-005" },
  { input: "CHAR 005", expect: "CHAR-005" },
  { input: "CHAR-5", expect: "CHAR-005" },
  { input: "char-005", expect: "CHAR-005" },
  { input: "CHAR-QINGCI", expect: "CHAR-QINGCI" },
  { input: "CHAR_QINGCI", expect: "CHAR-QINGCI" },
  { input: "char-qingci", expect: "CHAR-QINGCI" },
  { input: "SCENE-CITANG", expect: "SCENE-CITANG" },
  { input: "PROP-YUBEI", expect: "PROP-YUBEI" },
  { input: "SCENE-001", expect: "SCENE-001" },
  { input: "SCENE1", expect: "SCENE-001" },
  { input: "PROP-004", expect: "PROP-004" },
  { input: "INF-04", expect: "INF-04" },
  { input: "P-001", expect: "P-001" },
  { input: "CHAR-001,CHAR-005", expect: null },
  { input: "not-a-code", expect: null },
  { input: "", expect: null },
  { input: "  CHAR-005  ", expect: "CHAR-005" },
];
