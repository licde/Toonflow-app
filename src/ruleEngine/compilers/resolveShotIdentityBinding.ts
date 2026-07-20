/**
 * Shot identity binding SSOT — spatial standing → ordered CHAR codes / cref / ref sort.
 * Still compose + video referenceList must share the same order.
 */
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

const HIGH_RE = /(?:端坐|太师椅|高位|上座|主位|坐于高|坐在高|高座)/;
const LOW_RE = /(?:跪[在地地]?|蒲团|低位|下跪|跪地|跪于|坐于低|坐在低)/;
const CLAUSE_SPLIT = /[。；;！!？?\n，,、]/;

function charLabel(c: IdentityCharHint): string {
  return String(c.name || c.code || "").trim();
}

function roleKey(c?: IdentityCharHint | null): string {
  return (c?.code || c?.name || "").toUpperCase();
}

/** Longest-name-first alias match: 沈母 ⊂ 沈母周氏, 阿母 ↔ 沈母. */
export function labelMatches(haystack: string, name: string): boolean {
  const h = String(haystack ?? "");
  const n = String(name ?? "").trim();
  if (!n || n.length < 2) return false;
  if (h.includes(n)) return true;
  // Asset name longer than text form: 沈母周氏 matches clause with 沈母
  if (/^[\u4e00-\u9fff]{2,8}$/.test(n)) {
    for (let len = Math.min(n.length, 4); len >= 2; len--) {
      if (h.includes(n.slice(0, len))) return true;
    }
  }
  // Maternal soft alias
  if (/母$/.test(n) && /(?:沈母|阿母|家母)/.test(h)) return true;
  return false;
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
  // Alias: find shortest matching stem
  for (let len = Math.min(label.length, 4); len >= 2; len--) {
    const stem = label.slice(0, len);
    if (clause.includes(stem)) return clause.indexOf(stem);
  }
  if (/母$/.test(label)) {
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
}): ShotIdentityBinding {
  const chars = (input.characters ?? []).filter((c) => c.code || c.name);
  const desc = String(input.description ?? "");

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
    const codeOrder = (input.assetCodes ?? []).map((c) => c.toUpperCase()).filter((c) => /^CHAR-/i.test(c));
    if (codeOrder.length) {
      for (const code of codeOrder) {
        const hit = chars.find((c) => (c.code || "").toUpperCase() === code);
        pushUnique(hit ?? { code });
      }
      for (const c of chars) pushUnique(c);
    } else {
      for (const c of chars) pushUnique(c);
    }
  }

  const orderedCodes = ordered.map((c) => (c.code || "").toUpperCase()).filter((c) => /^CHAR-/i.test(c));
  const orderedNames = ordered.map((c) => charLabel(c)).filter(Boolean);

  let bindingLine: string | undefined;
  // ONLY write 站位绑定 when two distinct roles
  if (distinct && high && low) {
    const highL = charLabel(high);
    const lowL = charLabel(low);
    bindingLine = `站位绑定：${highL}=高位/图1（端坐或主位），${lowL}=低位/图2（跪或侧位）；禁止互换脸与站位`;
  } else if (orderedNames.length >= 2) {
    bindingLine = `身份顺序：图1=${orderedNames[0]}，图2=${orderedNames[1]}；不同脸，禁止融成同一张脸`;
  }

  // Single --cref HIGH LOW — never comma dual segments
  const crefTail = orderedCodes.length ? `--cref ${orderedCodes.join(" ")}` : undefined;

  return {
    orderedCodes,
    orderedNames,
    bindingLine,
    crefTail,
    refSortKey: orderedCodes.length ? orderedCodes : orderedNames.map((n) => n.toUpperCase()),
    highRole: high ? { code: high.code, name: high.name } : undefined,
    lowRole: low ? { code: low.code, name: low.name } : undefined,
  };
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
