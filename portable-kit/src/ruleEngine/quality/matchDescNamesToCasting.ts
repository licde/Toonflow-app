/**
 * Match visualDescription names against known casting pool only (never free NER invent).
 */
import { extractMentionedNames } from "./shotQualityPredicates";
import { stripToCastingName } from "../compilers/stillIdentitySsot";

export type CastMatchResult = {
  bound: Array<{ name: string; code: string; confidence: number }>;
  ambiguous: Array<{ name: string; codes: string[] }>;
  /** Always empty under casting-first — true CD gaps use speakers / B6 / referenced codes. */
  orphan: string[];
  mentioned: string[];
};

export function isCharOrphCode(code?: string | null): boolean {
  return /^CHAR-ORPH-/i.test(String(code ?? "").trim());
}

export function matchDescNamesToCasting(input: {
  visualDescription?: string | null;
  knownNames?: string[];
  nameToCodes?: Record<string, string[]>;
}): CastMatchResult {
  const vd = String(input.visualDescription ?? "").trim();
  const known = input.knownNames ?? [];
  const map = input.nameToCodes ?? {};
  const mentioned = extractMentionedNames(vd, known);
  const bound: CastMatchResult["bound"] = [];
  const ambiguous: CastMatchResult["ambiguous"] = [];

  for (const name of mentioned) {
    const codes = (map[name] ?? []).filter(Boolean);
    if (codes.length === 1) {
      bound.push({ name, code: codes[0], confidence: 1 });
    } else if (codes.length > 1) {
      ambiguous.push({ name, codes });
    }
  }
  // Casting-first: never populate orphan via VD free NER (heal must not stub CHAR-ORPH).
  return { bound, ambiguous, orphan: [], mentioned };
}

/**
 * Diagnostic / defense scan only — does NOT invent CD stubs.
 * Hits that collapse to a known casting name via stripToCastingName are dropped (verb-glue false orphans).
 * Remaining tokens are returned for logging only; callers must not write CHAR-ORPH CD.
 */
export function findOrphanNamesInDesc(input: {
  visualDescription?: string | null;
  knownNames?: string[];
  /** Extra name pool from nameMap / speakers to avoid false orphans */
  extraKnown?: string[];
  /** When false (default), casting-first returns [] — no free NER invent. */
  allowDiagnosticScan?: boolean;
}): string[] {
  if (!input.allowDiagnosticScan) return [];
  const vd = String(input.visualDescription ?? "");
  if (!vd.trim()) return [];
  const knownList = [...(input.knownNames ?? []), ...(input.extraKnown ?? [])]
    .map((n) => String(n ?? "").replace(/（OS）|\(OS\)/g, "").trim())
    .filter((n) => n.length >= 2);
  const known = new Set(knownList);
  const orphans = new Set<string>();
  // Diagnostic only: verb-cue lookahead (no bare punctuation — cuts phrase debris like「咬银簪，」)
  const re =
    /([\u4e00-\u9fff]{2,4})(?=咬|刺|望|跪|坐|站|走|跑|哭|笑|说|道|看|握|举|映)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(vd))) {
    const name = m[1];
    if (/^(空镜|无人物|正脸|特写|烛火|银簪|室内|夜戏|古典|写实)$/.test(name)) continue;
    if (known.has(name)) continue;
    // Verb-glue / prefix residual → known casting name → drop (false orphan)
    const collapsed = stripToCastingName(name, knownList);
    if (collapsed && known.has(collapsed)) continue;
    // Prefix: known is prefix of hit (沈清漪 ⊂ 沈清漪紧)
    if ([...known].some((k) => name.startsWith(k) && name.length > k.length)) continue;
    // Suffix glue: hit ends with known (视谢玄辞 → 谢玄辞)
    if ([...known].some((k) => name.endsWith(k) && name.length > k.length)) continue;
    // Drop verb-led debris (咬银簪 / 坐厅中)
    if (/^[咬刺望跪坐站走跑哭笑说道看握举映紧端视着]/.test(name)) continue;
    orphans.add(name);
  }
  return [...orphans];
}

/** Strip NER-invented CHAR-ORPH-* from shots / CD / VLT (auto_adapt; no identity invent). */
export function stripCharOrphNerStubs(input: {
  shots?: Array<{ charCodes?: string[] | null } | null> | null;
  characterAssets?: Array<{
    code?: string;
    name?: string;
    L0?: { identity?: string; stub?: boolean };
  } | null> | null;
  visualLockTable?: { characterAssets?: Record<string, unknown> } | null;
}): { strippedCodes: string[]; strippedAssets: string[]; removedFromShots: number } {
  const strippedCodes: string[] = [];
  const strippedAssets: string[] = [];
  let removedFromShots = 0;

  for (const shot of input.shots ?? []) {
    if (!shot?.charCodes?.length) continue;
    const next = shot.charCodes.filter((c) => {
      if (!isCharOrphCode(c)) return true;
      strippedCodes.push(c);
      return false;
    });
    if (next.length !== shot.charCodes.length) {
      removedFromShots += 1;
      shot.charCodes = next;
    }
  }

  const assets = input.characterAssets;
  if (assets?.length) {
    const kept = assets.filter((a) => {
      if (!a || !isCharOrphCode(a.code)) return true;
      const identity = String(a.L0?.identity ?? "").trim();
      // Only strip invent stubs (no real identity). Keep if somehow filled.
      if (identity && identity !== a.name && identity !== a.code) return true;
      strippedAssets.push(String(a.code));
      return false;
    });
    if (kept.length !== assets.length) {
      assets.length = 0;
      assets.push(...kept);
    }
  }

  const vlt = input.visualLockTable?.characterAssets;
  if (vlt) {
    for (const code of Object.keys(vlt)) {
      if (!isCharOrphCode(code)) continue;
      delete vlt[code];
      strippedCodes.push(code);
    }
  }

  return {
    strippedCodes: [...new Set(strippedCodes)],
    strippedAssets: [...new Set(strippedAssets)],
    removedFromShots,
  };
}

export function buildNameToCodesFromAssets(
  assets?: Array<{ code?: string; name?: string } | null> | null,
): { knownNames: string[]; nameToCodes: Record<string, string[]> } {
  const knownNames: string[] = [];
  const nameToCodes: Record<string, string[]> = {};
  for (const a of assets ?? []) {
    const name = String(a?.name ?? "")
      .replace(/（OS）|\(OS\)/g, "")
      .trim();
    const code = String(a?.code ?? "").trim();
    if (!name || !code) continue;
    if (isCharOrphCode(code)) continue;
    knownNames.push(name);
    (nameToCodes[name] ??= []).push(code);
  }
  return { knownNames, nameToCodes };
}
