/**
 * Digit ↔ slug asset-code aliases. CD slug is SSOT when both forms appear.
 */
import { normalizeAssetCode } from "./assetCodeContract";
import type { ScriptBundle } from "../bundle/types";
import { assetDisplayName } from "../bundle/assetLabel";

export type CodeAliasMap = Record<string, string>;

function isDigitCode(code: string): boolean {
  return /^(CHAR|SCENE|PROP)-\d+$/i.test(code);
}

function isSlugCode(code: string): boolean {
  return /^(CHAR|SCENE|PROP)-[A-Z][A-Z0-9]*$/i.test(code) && !isDigitCode(code);
}

/** Collect CD slug codes in design order (SSOT). */
export function listCdSlugCodes(bundle: ScriptBundle): string[] {
  const assets =
    (bundle.characterDesign as { assets?: { code?: string; name?: string }[] } | undefined)?.assets ?? [];
  const out: string[] = [];
  for (const a of assets) {
    const c = a.code ? normalizeAssetCode(a.code) ?? a.code : undefined;
    if (c && isSlugCode(c) && !out.includes(c)) out.push(c);
  }
  return out;
}

/** name → slug from CD + visualLockTable.characterAssets */
export function buildNameToSlug(bundle: ScriptBundle): Record<string, string> {
  const map: Record<string, string> = {};
  const assets =
    (bundle.characterDesign as { assets?: { code?: string; name?: string }[] } | undefined)?.assets ?? [];
  for (const a of assets) {
    const c = a.code ? normalizeAssetCode(a.code) ?? a.code : undefined;
    if (c && a.name) map[a.name] = c;
  }
  const ca = (bundle.visualLockTable as { characterAssets?: Record<string, unknown> } | undefined)?.characterAssets;
  if (ca) {
    for (const [code, raw] of Object.entries(ca)) {
      const c = normalizeAssetCode(code) ?? code;
      const name = assetDisplayName(raw);
      if (name) map[name] = c;
    }
  }
  return map;
}

/**
 * Build digit→slug alias map. Ordinal CHAR-00N maps to CD assets[N-1] when digit codes
 * appear in shots/prompts alongside slug CD.
 */
export function buildCodeAliasMap(bundle: ScriptBundle): CodeAliasMap {
  const alias: CodeAliasMap = {};
  const slugs = listCdSlugCodes(bundle);
  const digitRefs = new Set<string>();

  const consider = (raw?: string | null) => {
    if (!raw) return;
    const n = normalizeAssetCode(raw) ?? raw.trim().toUpperCase();
    if (isDigitCode(n)) digitRefs.add(n);
  };

  for (const s of bundle.preDesignPack?.shots ?? []) {
    for (const c of s.charCodes ?? []) consider(c);
    const img = s.generation?.imagePrompt ?? "";
    for (const m of img.matchAll(/--(?:cref|sref)\s+([A-Za-z]+-[A-Za-z0-9]+)/gi)) {
      consider(m[1]);
    }
  }

  // Always allow ordinal→slug for residual DB rows even if pack is slug-only
  for (let i = 0; i < slugs.length; i++) {
    const digit = `CHAR-${String(i + 1).padStart(3, "0")}`;
    alias[digit] = slugs[i]!;
    digitRefs.add(digit);
  }

  for (const dig of digitRefs) {
    const m = dig.match(/^CHAR-(\d+)$/i);
    if (!m) continue;
    const idx = Number(m[1]) - 1;
    if (idx >= 0 && idx < slugs.length) alias[dig] = slugs[idx]!;
  }

  (bundle as { _codeAlias?: CodeAliasMap })._codeAlias = alias;
  return alias;
}

/** Resolve a code through alias map (digit→slug preferred). */
export function resolveAliasedCode(code: string, alias?: CodeAliasMap | null): string {
  const n = normalizeAssetCode(code) ?? code.trim().toUpperCase();
  if (!alias) return n;
  if (alias[n]) return alias[n]!;
  return n;
}

/** All lookup keys for a code (self + alias forward + reverse digit). */
export function lookupKeysForCode(code: string, alias?: CodeAliasMap | null): string[] {
  const n = normalizeAssetCode(code) ?? code.trim().toUpperCase();
  const keys = new Set<string>([n, code]);
  if (alias?.[n]) keys.add(alias[n]!);
  if (alias) {
    for (const [from, to] of Object.entries(alias)) {
      if (to === n) keys.add(from);
      if (from === n) keys.add(to);
    }
  }
  return [...keys];
}

export function getBundleAlias(bundle?: ScriptBundle | null): CodeAliasMap {
  if (!bundle) return {};
  const existing = (bundle as { _codeAlias?: CodeAliasMap })._codeAlias;
  if (existing && Object.keys(existing).length) return existing;
  return buildCodeAliasMap(bundle);
}
