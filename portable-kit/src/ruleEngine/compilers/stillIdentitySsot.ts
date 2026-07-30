/**
 * Still identity SSOT — casting name authority, multiFace predicate, one-beat, phantom detect.
 * Fixture-driven; do not add verb-whitelist primary paths.
 */
import { readFixtureJson } from "../utils/fixturesPath";
import { normalizeDialogueSpeaker } from "./normalizeDialogueSpeaker";

export type StillIdentityDoctrine = {
  freeze?: Record<string, boolean>;
  multiFacePredicate?: {
    requireDistinctCharCodes?: number;
    requireBareNamesAfterNormalize?: number;
    neverEmitWhenSingleCref?: boolean;
  };
  refRoles?: {
    layout?: { takesFace?: boolean; ordinalPolicy?: string };
    failed_still?: { takesFace?: boolean; ordinalPolicy?: string };
    cref?: { takesFace?: boolean };
  };
  castCardinalityPolicy?: {
    emitExactCount?: boolean;
    forbidExtras?: boolean;
    mustSurvive?: boolean;
    lineTemplate?: string;
    stageAExactFigures?: boolean;
  };
  oneBeat?: {
    beatVerbPattern?: string;
    maxStrongBeatsBeforeWarn?: number;
    designWarnId?: string;
    trimWarn?: string;
  };
  designFillerForbidden?: string[];
  egressLayers?: {
    identityNoisePrefixes?: string[];
    contractEnPatterns?: string[];
  };
  reverse?: {
    trigger?: string;
    primaryTarget?: string;
    thenRegen?: string;
  };
};

let cached: StillIdentityDoctrine | null = null;

export function loadStillIdentityDoctrine(): StillIdentityDoctrine {
  if (cached) return cached;
  cached = readFixtureJson<StillIdentityDoctrine>("still_identity_doctrine.json", {});
  return cached;
}

/** Bare casting name: strip OS wrappers. */
export function toBareCastingName(raw?: string | null): string {
  return normalizeDialogueSpeaker(raw).name;
}

/** Shrink non-casting token to longest casting prefix, else drop. */
export function stripToCastingName(raw: string, castingNames: string[]): string | undefined {
  const bare = toBareCastingName(raw);
  if (!bare) return undefined;
  const known = castingNames
    .map((n) => toBareCastingName(n))
    .filter((n) => n.length >= 2)
    .sort((a, b) => b.length - a.length);
  for (const k of known) {
    if (bare === k) return k;
  }
  for (const k of known) {
    if (bare.startsWith(k) && bare.length > k.length) return k;
  }
  // Not in casting — reject invent
  return undefined;
}

export function uniqueBareCastingNames(names: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const n of names) {
    const bare = toBareCastingName(n);
    if (!bare || seen.has(bare)) continue;
    seen.add(bare);
    out.push(bare);
  }
  return out;
}

/** MultiFace may emit only when distinct CHAR codes + bare names both ≥ threshold. */
export function canEmitMultiFace(input: {
  charCodes: string[];
  names: string[];
  crefCharCount?: number;
}): boolean {
  const d = loadStillIdentityDoctrine().multiFacePredicate ?? {};
  const needCodes = d.requireDistinctCharCodes ?? 2;
  const needNames = d.requireBareNamesAfterNormalize ?? 2;
  const codes = [
    ...new Set(
      (input.charCodes ?? [])
        .map((c) => String(c ?? "").toUpperCase())
        .filter((c) => /^CHAR-/.test(c)),
    ),
  ];
  const names = uniqueBareCastingNames(input.names);
  if (codes.length < needCodes || names.length < needNames) return false;
  if (d.neverEmitWhenSingleCref !== false && (input.crefCharCount ?? codes.length) < needCodes) {
    return false;
  }
  return true;
}

export function countStrongBeats(text: string, pattern?: string): number {
  const d = loadStillIdentityDoctrine();
  const re = new RegExp(pattern ?? d.oneBeat?.beatVerbPattern ?? "刺入|咬帕|包扎|露出|勾起", "g");
  const m = String(text ?? "").match(re);
  return m?.length ?? 0;
}

export function shouldWarnOneBeat(text: string): boolean {
  const max = loadStillIdentityDoctrine().oneBeat?.maxStrongBeatsBeforeWarn ?? 2;
  return countStrongBeats(text) > max;
}

/** Keep first clause that contains a beat verb, else first sentence.
 * Guard: never return text shorter than QP-02 minChars when original was long enough
 * (prevents compose/design trim from creating too_short stubs if persisted).
 */
export function trimToOneBeat(text: string): { text: string; trimmed: boolean } {
  const raw = String(text ?? "").trim();
  if (!raw || !shouldWarnOneBeat(raw)) return { text: raw, trimmed: false };
  const parts = raw.split(/[。；;\n]+/).map((s) => s.trim()).filter(Boolean);
  const d = loadStillIdentityDoctrine();
  const re = new RegExp(d.oneBeat?.beatVerbPattern ?? "刺入|咬帕|包扎|露出|勾起");
  const hit = parts.find((p) => re.test(p));
  const keep = hit ?? parts[0] ?? raw;
  let textOut = /[。；;]$/.test(keep) ? keep : `${keep}。`;
  try {
    const { qp02MinChars } = require("../bundle/visualQualityAudit") as typeof import("../bundle/visualQualityAudit");
    const min = qp02MinChars();
    if (textOut.replace(/\s/g, "").length < min && raw.replace(/\s/g, "").length >= min) {
      return { text: raw, trimmed: false };
    }
  } catch {
    /* optional */
  }
  return { text: textOut, trimmed: textOut.replace(/\s/g, "") !== raw.replace(/\s/g, "") };
}

export function hasDesignFiller(text: string): boolean {
  const fillers = loadStillIdentityDoctrine().designFillerForbidden ?? [];
  const t = String(text ?? "");
  return fillers.some((f) => f && t.includes(f));
}

export function hasOsInNameDisplay(text: string): boolean {
  return /[\u4e00-\u9fff]{2,8}\s*[（(]\s*(?:OS|VO|旁白)/i.test(String(text ?? ""));
}

/** Shared phantom-dual detector for egress + first-frame gate. */
export function detectPhantomDualFace(prompt: string): boolean {
  const p = String(prompt ?? "");
  const charCodes = [...new Set((p.match(/CHAR-[A-Z0-9]+/gi) ?? []).map((c) => c.toUpperCase()))];
  if (charCodes.length >= 2) return false;
  // A与B不同脸 / A与B与C不同脸 / names with （OS）
  if (/不同脸/.test(p) && (/与.*与.*不同脸/.test(p) || /与.+不同脸/.test(p))) return true;
  if (/（\s*OS\s*）|\(\s*OS\s*\)/i.test(p) && /不同脸/.test(p)) return true;
  return false;
}

export function stripIdentityNoiseFromBody(body: string): string {
  let next = String(body ?? "");
  const d = loadStillIdentityDoctrine();
  // Multi-name 不同脸 stacks (allow OS latin inside （OS）)
  next = next.replace(
    /[\u4e00-\u9fff（）()A-Za-z\s]{2,48}(?:与[\u4e00-\u9fff（）()A-Za-z\s]{2,24}){1,4}不同脸[^。；;\n]*/g,
    " ",
  );
  for (const f of d.designFillerForbidden ?? []) {
    if (f) next = next.split(f).join(" ");
  }
  for (const reSrc of d.egressLayers?.contractEnPatterns ?? []) {
    try {
      next = next.replace(new RegExp(reSrc, "gi"), " ");
    } catch {
      /* skip bad re */
    }
  }
  next = next
    .replace(/,\s*。/g, "。")
    .replace(/[。；;]\s*[。；;]+/g, "。")
    .replace(/\s{2,}/g, " ")
    .trim();
  return next;
}

/** Dedupe identical narrative clauses (keep first). */
export function dedupeNarrativeClauses(text: string): string {
  const parts = String(text ?? "")
    .split(/(?<=[。；;])\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const key = p.replace(/\s+/g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out.join("");
}
