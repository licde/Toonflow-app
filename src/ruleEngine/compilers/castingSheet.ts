/**
 * CastingSheet SSOT — industry casting sheet for still/video identity.
 * Characters come from assets ∪ speakers ∪ CD codes only — never description NER.
 */
import { normalizeDialogueSpeakers } from "./normalizeDialogueSpeaker";
import { looksLikeSceneName } from "./hydrateComposeStillContext";

export interface CastingChar {
  code?: string;
  name?: string;
  hasImage?: boolean;
  kind?: "character" | "scene";
  stub?: boolean;
}

export interface BuildRequiredCastInput {
  characters?: CastingChar[] | null;
  dialogueSpeakers?: string[] | null;
  charCodes?: string[] | null;
  /** CD name→code map for speaker resolution */
  nameToCode?: Record<string, string> | null;
  /** When true, unmatched speakers become must-edit gaps (no NAME: phantom face). */
  refusePhantomNames?: boolean;
}

export interface RequiredCastResult {
  chars: CastingChar[];
  /** Speakers that could not map to CD/code — Chat must-edit */
  unmappedSpeakers: string[];
  codedCount: number;
}

/** Longest-first match speaker bare name to known casting names. */
export function matchKnownName(raw: string, knownNames: string[]): string | undefined {
  const s = String(raw ?? "").trim();
  if (!s || looksLikeSceneName(s)) return undefined;
  const sorted = [...knownNames].filter((n) => n.length >= 2).sort((a, b) => b.length - a.length);
  for (const n of sorted) {
    if (s === n || s.startsWith(n) || n.includes(s) || s.includes(n)) return n;
  }
  return undefined;
}

/**
 * Build required cast for identity gates / multiFace.
 * Never invents names from visualDescription.
 */
export function buildRequiredCast(input: BuildRequiredCastInput): RequiredCastResult {
  const refusePhantom = input.refusePhantomNames !== false;
  const byKey = new Map<string, CastingChar>();
  const knownNames: string[] = [];

  for (const c of input.characters ?? []) {
    if (c.kind === "scene" || looksLikeSceneName(c.name)) continue;
    if (!c.code && !c.name) continue;
    const key = (c.code || c.name || "").toUpperCase();
    byKey.set(key, {
      code: c.code,
      name: c.name,
      hasImage: c.hasImage,
      kind: "character",
      stub: c.stub,
    });
    if (c.name) knownNames.push(c.name);
  }

  for (const code of input.charCodes ?? []) {
    const c = String(code ?? "").toUpperCase();
    if (!/^CHAR-/i.test(c)) continue;
    if (!byKey.has(c)) byKey.set(c, { code: c, hasImage: false, kind: "character" });
  }

  const unmappedSpeakers: string[] = [];
  for (const sp of normalizeDialogueSpeakers(input.dialogueSpeakers)) {
    if (!sp || looksLikeSceneName(sp)) continue;
    const matched = matchKnownName(sp, knownNames);
    if (matched) {
      // already in byKey via name
      let hit = false;
      for (const [, c] of byKey) {
        if (c.name && (c.name === matched || c.name.includes(matched) || matched.includes(c.name))) {
          hit = true;
          break;
        }
      }
      if (!hit) byKey.set(`NAME:${matched}`, { name: matched, hasImage: false, kind: "character" });
      continue;
    }
    const viaMap = input.nameToCode?.[sp] || input.nameToCode?.[matched ?? ""];
    if (viaMap) {
      const code = viaMap.toUpperCase();
      const prev = byKey.get(code);
      byKey.set(code, {
        code,
        name: prev?.name || sp,
        hasImage: prev?.hasImage,
        kind: "character",
      });
      continue;
    }
    if (refusePhantom) {
      unmappedSpeakers.push(sp);
      continue;
    }
    byKey.set(`NAME:${sp}`, { name: sp, hasImage: false, kind: "character" });
  }

  const chars = [...byKey.values()].filter((c) => c.kind !== "scene");
  const codedCount = chars.filter((c) => c.code && /^CHAR-/i.test(c.code)).length;
  return { chars, unmappedSpeakers, codedCount };
}

/** True dual-face: ≥2 distinct CHAR codes (not phantom names). */
export function isTrueDualCast(chars: CastingChar[]): boolean {
  const codes = new Set(
    chars.map((c) => (c.code || "").toUpperCase()).filter((c) => /^CHAR-/i.test(c)),
  );
  return codes.size >= 2;
}

/** Display names for must-appear — coded/known only. */
export function castDisplayNames(chars: CastingChar[]): string[] {
  return [
    ...new Set(
      chars
        .map((c) => c.name || c.code)
        .filter(Boolean)
        .map((n) => String(n).trim()),
    ),
  ];
}
