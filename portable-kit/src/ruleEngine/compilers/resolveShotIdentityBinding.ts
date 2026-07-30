/**
 * Shot identity binding SSOT — spatial standing → ordered CHAR codes / cref / ref sort.
 * Still compose + video referenceList must share the same order.
 * HIGH/LOW cues = stillIntentPolicy POWER_* (seating_power same kernel).
 */
import { POWER_HIGH_RE, POWER_LOW_RE, peelFramingText } from "./stillIntentPolicy";

export interface IdentityCharHint {
  code?: string;
  name?: string;
  hasImage?: boolean;
}

export interface ShotIdentityBinding {
  orderedCodes: string[];
  orderedNames: string[];
  bindingLine?: string;
  crefTail?: string;
  refSortKey: string[];
  highRole?: { code?: string; name?: string };
  lowRole?: { code?: string; name?: string };
}

const HIGH_RE = POWER_HIGH_RE;
const LOW_RE = POWER_LOW_RE;
const CLAUSE_SPLIT = /[。；;！!？?\n，,、]/;

function charLabel(c: IdentityCharHint): string {
  return String(c.name || c.code || "").trim();
}

function roleKey(c?: IdentityCharHint | null): string {
  return (c?.code || c?.name || "").toUpperCase();
}

/**
 * Safe name↔clause match — NEVER stem-slice peers (沈清瓷 ↛ 沈清漪 via「沈清」).
 * Allowed: exact; 母/氏 family shortening (沈母 ⊂ 沈母周氏); maternal soft alias.
 */
export function labelMatches(haystack: string, name: string): boolean {
  const h = String(haystack ?? "");
  const n = String(name ?? "").trim();
  if (!n || n.length < 2) return false;
  if (h.includes(n)) return true;
  // Only 母/氏 family may shorten (沈母周氏 ↔ 沈母). Peer sisters must be exact.
  if (/[母氏]/.test(n) && /^[\u4e00-\u9fff]{2,12}$/.test(n)) {
    for (let len = n.length - 1; len >= 2; len--) {
      const stem = n.slice(0, len);
      if (!/[母氏]$/.test(stem)) continue;
      if (h.includes(stem)) return true;
    }
  }
  if (/母/.test(n) && /(?:沈母|阿母|家母)/.test(h)) return true;
  return false;
}

/** True when a/b are the same person via proper-prefix (沈母↔沈母周氏), not peer sisters. */
export function namesAreProperPrefixAlias(a?: string | null, b?: string | null): boolean {
  const x = String(a ?? "").trim();
  const y = String(b ?? "").trim();
  if (!x || !y || x === y) return x === y && x.length >= 2;
  const [shorter, longer] = x.length <= y.length ? [x, y] : [y, x];
  if (!longer.startsWith(shorter) || shorter.length < 2) return false;
  // Require 母/氏 family or shorter is almost-full (≥ longer-1) — blocks 沈清* peers
  if (/[母氏]$/.test(shorter)) return true;
  return shorter.length >= longer.length - 1;
}

/** Prefer longest character name that matches the clause. */
function matchCharsInClause(clause: string, chars: IdentityCharHint[]): IdentityCharHint[] {
  const scored = chars
    .map((c) => ({ c, len: charLabel(c).length, ok: labelMatches(clause, charLabel(c)) }))
    .filter((x) => x.ok && x.len >= 2)
    .sort((a, b) => b.len - a.len);
  return scored.map((x) => x.c);
}

function cueIndexInClause(clause: string, posRe: RegExp): number {
  const m = clause.match(posRe);
  return m?.index ?? -1;
}

function nameIndexInClause(clause: string, c: IdentityCharHint): number {
  const label = charLabel(c);
  if (!label) return -1;
  if (clause.includes(label)) return clause.indexOf(label);
  if (/[母氏]/.test(label) && /^[\u4e00-\u9fff]{2,12}$/.test(label)) {
    for (let len = label.length - 1; len >= 2; len--) {
      const stem = label.slice(0, len);
      if (!/[母氏]$/.test(stem)) continue;
      if (clause.includes(stem)) return clause.indexOf(stem);
    }
  }
  if (/母/.test(label)) {
    for (const a of ["沈母", "阿母", "家母"]) {
      if (clause.includes(a)) return clause.indexOf(a);
    }
  }
  return -1;
}

/**
 * Find role in same clause as position cue only (no cross-clause window).
 * When multiple candidates, pick closest to cue.
 */
function findRoleInClauses(
  text: string,
  chars: IdentityCharHint[],
  posRe: RegExp,
  excludeKey?: string,
): IdentityCharHint | undefined {
  const clauses = String(text ?? "").split(CLAUSE_SPLIT);
  for (const clause of clauses) {
    if (!posRe.test(clause)) continue;
    const candidates = matchCharsInClause(clause, chars).filter((c) => roleKey(c) !== excludeKey);
    if (!candidates.length) continue;
    if (candidates.length === 1) return candidates[0];
    const cueIdx = cueIndexInClause(clause, posRe);
    let best = candidates[0];
    let bestDist = Infinity;
    for (const c of candidates) {
      const ni = nameIndexInClause(clause, c);
      const dist = ni < 0 || cueIdx < 0 ? 999 : Math.abs(ni - cueIdx);
      if (dist < bestDist) {
        bestDist = dist;
        best = c;
      }
    }
    // Only accept if cue–name distance ≤ 6 when multiple (plan)
    if (candidates.length > 1 && bestDist > 6 && bestDist !== 999) {
      // still pick closest
    }
    return best;
  }
  return undefined;
}

/**
 * Resolve high/low standing → ordered codes (high first = 图1 / cref first).
 */
export function resolveShotIdentityBinding(input: {
  description?: string | null;
  characters?: IdentityCharHint[] | null;
  /** Fallback asset codes when no spatial cue */
  assetCodes?: string[] | null;
  /** Only seating-hard may emit 站位绑定（端坐/跪） */
  seatingHard?: boolean;
}): ShotIdentityBinding {
  const chars = (input.characters ?? []).filter((c) => c.code || c.name);
  // Peel continuity so neighbor「扳指特写」does not scramble spatial bind
  const desc = peelFramingText(String(input.description ?? ""));

  let high = findRoleInClauses(desc, chars, HIGH_RE);
  let low = findRoleInClauses(desc, chars, LOW_RE, high ? roleKey(high) : undefined);

  // Mutex: same person cannot occupy both — keep closer cue side, re-search other
  if (high && low && roleKey(high) === roleKey(low)) {
    // Prefer low if clause has 跪/蒲团 near them more strongly; re-bind high excluding them
    const high2 = findRoleInClauses(desc, chars, HIGH_RE, roleKey(low));
    const low2 = findRoleInClauses(desc, chars, LOW_RE, roleKey(high));
    if (high2 && roleKey(high2) !== roleKey(low)) {
      high = high2;
    } else if (low2 && roleKey(low2) !== roleKey(high)) {
      low = low2;
    } else {
      // Cannot resolve distinct — drop low to avoid same-person dual bind line
      low = undefined;
    }
  }

  // If still same (shouldn't), clear low
  if (high && low && roleKey(high) === roleKey(low)) {
    low = undefined;
  }

  const ordered: IdentityCharHint[] = [];
  const pushUnique = (c?: IdentityCharHint) => {
    if (!c) return;
    const key = roleKey(c);
    if (!key) return;
    if (ordered.some((x) => roleKey(x) === key)) return;
    ordered.push(c);
  };

  const distinct = Boolean(high && low && roleKey(high) !== roleKey(low));
  if (distinct) {
    pushUnique(high);
    pushUnique(low);
    for (const c of chars) pushUnique(c);
  } else {
    // Prefer first exact mention in VD (沈清漪 before unused 沈清瓷) — blocks similar-name 图1 swap
    const byMention = [...chars].sort((a, b) => {
      const ia = nameIndexInClause(desc, a);
      const ib = nameIndexInClause(desc, b);
      const aHit = ia >= 0 ? ia : 1e9;
      const bHit = ib >= 0 ? ib : 1e9;
      if (aHit !== bHit) return aHit - bHit;
      return charLabel(a).length - charLabel(b).length;
    });
    const codeOrder = (input.assetCodes ?? []).map((c) => c.toUpperCase()).filter((c) => /^CHAR-/i.test(c));
    if (codeOrder.length) {
      // Intersect: mentioned-first among codes, then remaining codes, then rest
      const mentionedCodes = byMention
        .map((c) => (c.code || "").toUpperCase())
        .filter((c) => codeOrder.includes(c));
      for (const code of [...mentionedCodes, ...codeOrder]) {
        const hit = chars.find((c) => (c.code || "").toUpperCase() === code);
        pushUnique(hit ?? { code });
      }
      for (const c of byMention) pushUnique(c);
    } else {
      for (const c of byMention) pushUnique(c);
    }
  }

  const orderedCodes = ordered
    .filter((c) => {
      const code = (c.code || "").toUpperCase();
      if (!/^CHAR-/i.test(code)) return false;
      return c.hasImage === true;
    })
    .map((c) => (c.code || "").toUpperCase());
  // 图1/图2 仅角色裸名（有 CHAR- code）；禁止道具名占身份槽
  const orderedCharNames = ordered
    .filter((c) => /^CHAR-/i.test(String(c.code || "")))
    .map((c) => charLabel(c))
    .filter((n) => n.length >= 2 && !isPropLikeIdentityLabel(n));
  const orderedNames = orderedCharNames.length
    ? orderedCharNames
    : ordered.map((c) => charLabel(c)).filter((n) => n.length >= 2 && !isPropLikeIdentityLabel(n));

  let bindingLine: string | undefined;
  const seatingHard = input.seatingHard === true;
  // ONLY write 站位绑定 when seating-hard + two distinct CHAR roles
  if (
    seatingHard &&
    distinct &&
    high &&
    low &&
    /^CHAR-/i.test(String(high.code || "")) &&
    /^CHAR-/i.test(String(low.code || ""))
  ) {
    const highL = charLabel(high);
    const lowL = charLabel(low);
    bindingLine = `站位绑定：${highL}=高位/图1（端坐或主位），${lowL}=低位/图2（跪或侧位）；禁止互换脸与站位`;
  } else if (orderedNames.length >= 2 && orderedCodes.length >= 2) {
    bindingLine = `身份顺序：图1=${orderedNames[0]}，图2=${orderedNames[1]}；不同脸，禁止融成同一张脸`;
  } else if (orderedNames.length >= 2 && orderedCodes.length < 2) {
    // Dual names without dual imaged CHAR — names only, no 图2 prop fiction
    bindingLine = undefined;
  }

  // Single --cref HIGH LOW — never comma dual segments; never fake cref without image
  const crefTail = orderedCodes.length ? `--cref ${orderedCodes.join(" ")}` : undefined;

  return {
    orderedCodes,
    orderedNames,
    bindingLine,
    crefTail,
    refSortKey: orderedCodes.length
      ? orderedCodes
      : orderedNames.map((n) => n.toUpperCase()),
    highRole: high ? { code: high.code, name: high.name } : undefined,
    lowRole: low ? { code: low.code, name: low.name } : undefined,
  };
}

/** Prop / object labels must not occupy 图1/图2 identity slots. */
export function isPropLikeIdentityLabel(name: string): boolean {
  const n = String(name ?? "").trim();
  if (!n) return true;
  if (/^(?:银簪|簪尖|簪|匕首|刀|剑|帕|手帕|血珠|皮肉|锁骨|梳妆台|铜镜|烛火|太师椅|蒲团)/.test(n)) return true;
  if (/尖端|冷光|表面|下方/.test(n) && n.length <= 6) return true;
  return false;
}

/** Slim entity anchors: drop verb-object bloat; keep names + key props. */
export function slimEntityAnchors(anchors: string[], max = 6): string[] {
  const VERB_OBJ =
    /(?:摩挲|捧起|望着|跪地|端坐于?|坐在|跪在|转身|抬手|擦泪|咬唇|抄书)/;
  const NAME_VERB = /^[\u4e00-\u9fff]{2,4}(?:端坐|跪|站|坐|捧|望|抄)/;
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (a: string) => {
    const t = a.trim();
    if (!t || t.length < 2 || t.length > 8) return;
    const key = t.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(t);
  };
  for (const raw of anchors) {
    let a = String(raw ?? "").trim();
    if (!a || a.length > 12) continue;
    if (NAME_VERB.test(a)) continue;
    if (/^位/.test(a)) a = a.replace(/^位/, "");
    if (/^(?:跪地|端坐|对峙|望雨|跪|站)$/.test(a)) continue;
    // Verb-object blob (e.g. 太师椅摩挲扳指) → extract props only
    if (VERB_OBJ.test(a)) {
      const props = a.match(/太师椅|蒲团|扳指|玉扳指|烛火|祠堂/g) ?? [];
      if (props.length) {
        for (const p of props) {
          push(p);
          if (out.length >= max) return out;
        }
        continue;
      }
      a = a.replace(VERB_OBJ, "").slice(0, 6);
      if (a.length < 2) continue;
    }
    push(a);
    if (out.length >= max) break;
  }
  return out;
}

/** Compress personality /气质 lines for fidelity still prompts. */
export function compressPersonalityLine(name: string, personality: string, max = 16): string {
  const p = String(personality ?? "")
    .replace(/[，,。；;]/g, " ")
    .trim()
    .slice(0, max);
  if (!p) return "";
  return `${name}气质略：${p}`;
}
