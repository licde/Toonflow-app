/**
 * Extract hard predicates from literary visual description for still fidelity.
 * Output drives compose hard-constraint lines + stillDescCoverage gate.
 */
export interface DescPredicate {
  who?: string;
  verb: string;
  prop?: string;
  /** Raw span for coverage checks */
  surface: string;
}

export interface DescPredicatePack {
  predicates: DescPredicate[];
  /** Positive hard constraint line for compose */
  hardConstraintLine?: string;
  /** Negative ban against scene-default substitution */
  negativeBanLine?: string;
  /** Tokens that must appear in final prompt for coverage */
  mustAppear: string[];
  hasSeatingOrKneel: boolean;
}

const PROP_RE =
  /太师椅|蒲团|扳指|玉扳指|书卷|书册|剑|伞|扇|烛台|香炉|香案|供桌|窗格|廊桥/;

/** Verb + optional prop patterns (ordered: more specific first). */
const PREDICATE_PATTERNS: Array<{ verb: string; prop?: string; re: RegExp }> = [
  { verb: "端坐", prop: "太师椅", re: /端坐[^，。；]{0,8}太师椅|太师椅[^，。；]{0,6}端坐|端坐高位太师椅/ },
  { verb: "端坐", re: /端坐/ },
  { verb: "摩挲", prop: "扳指", re: /摩挲[^，。；]{0,6}扳指|扳指/ },
  { verb: "跪", prop: "蒲团", re: /跪[^，。；]{0,8}蒲团|蒲团[^，。；]{0,6}跪|跪低位蒲团/ },
  { verb: "跪", re: /跪[在于地]?|下跪/ },
  { verb: "抄书", prop: "书", re: /抄书|誊写|书写/ },
  { verb: "侧卧", re: /侧卧/ },
  { verb: "倚靠", re: /倚靠|靠坐/ },
];

function splitClauses(text: string): string[] {
  return String(text ?? "")
    .split(/[。；;！!？?\n，,、]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function stripWhoVerbGlue(who: string | undefined | null, castingNames?: string[]): string | undefined {
  let w = String(who ?? "").trim();
  if (!w) return undefined;
  try {
    const { toBareCastingName, stripToCastingName } = require("./stillIdentitySsot") as typeof import("./stillIdentitySsot");
    const bare = toBareCastingName(w);
    if (castingNames?.length) {
      const hit = stripToCastingName(bare || w, castingNames);
      if (hit) return hit;
    }
    w = bare || w;
  } catch {
    /* fall through */
  }
  w = w.replace(
    /(咬|刺|捧|勾|勾起|望|握|持|含|衔|擦|抬|转|跪|端坐|坐|立|摩挲|抄书|包|包扎)$/u,
    "",
  );
  w = w.replace(/(跪|端坐)$/u, "");
  return w.trim() || undefined;
}

function guessWho(clause: string, knownNames: string[]): string | undefined {
  const sorted = [...knownNames].filter((n) => n.length >= 2).sort((a, b) => b.length - a.length);
  for (const n of sorted) {
    const clean = stripWhoVerbGlue(n, knownNames) ?? n;
    if (clause.includes(clean) || (clean.length >= 2 && clause.includes(clean.slice(0, 2)))) {
      return stripWhoVerbGlue(clean, knownNames);
    }
  }
  // Casting sheet only — never invent from bare 沈[汉]{1,3}
  return undefined;
}

/**
 * Extract predicates from description. Does not invent seating when absent.
 */
export function extractDescPredicates(input: {
  description?: string | null;
  characterNames?: string[] | null;
}): DescPredicatePack {
  const desc = String(input.description ?? "").trim();
  const names = (input.characterNames ?? []).filter(Boolean);
  const predicates: DescPredicate[] = [];
  const seen = new Set<string>();

  if (!desc) {
    return { predicates: [], mustAppear: [], hasSeatingOrKneel: false };
  }

  for (const clause of splitClauses(desc)) {
    for (const pat of PREDICATE_PATTERNS) {
      if (!pat.re.test(clause)) continue;
      const who = guessWho(clause, names);
      const key = `${who ?? ""}:${pat.verb}:${pat.prop ?? ""}`;
      if (seen.has(key)) continue;
      // Avoid adding bare 端坐 if we already have 端坐+太师椅
      if (pat.verb === "端坐" && !pat.prop && predicates.some((p) => p.verb === "端坐" && p.prop)) continue;
      if (pat.verb === "跪" && !pat.prop && predicates.some((p) => p.verb === "跪" && p.prop)) continue;
      seen.add(key);
      let prop = pat.prop;
      if (!prop) {
        const pm = clause.match(PROP_RE);
        if (pm && pm[0] !== "香案" && pm[0] !== "供桌" && pm[0] !== "香炉") prop = pm[0];
      }
      predicates.push({
        who: stripWhoVerbGlue(who, names),
        verb: pat.verb,
        prop,
        surface: [stripWhoVerbGlue(who, names), pat.verb, prop].filter(Boolean).join(""),
      });
      // Continue patterns in same clause (端坐+摩挲, 跪+抄书)
    }
  }

  // Deduplicate: prefer prop-bearing
  const byVerbWho = new Map<string, DescPredicate>();
  for (const p of predicates) {
    const k = `${p.who ?? ""}:${p.verb}`;
    const prev = byVerbWho.get(k);
    if (!prev || (p.prop && !prev.prop)) byVerbWho.set(k, p);
  }
  const uniq = [...byVerbWho.values()];

  const hasSeatingOrKneel = uniq.some((p) => /端坐|跪|侧卧|倚靠/.test(p.verb) || /太师椅|蒲团/.test(p.prop ?? ""));

  const mustAppear: string[] = [];
  for (const p of uniq) {
    if (p.verb) mustAppear.push(p.verb);
    if (p.prop && p.prop !== "书") mustAppear.push(p.prop);
    if (p.verb === "抄书") mustAppear.push("抄书");
  }
  // Unique mustAppear
  const must = [...new Set(mustAppear.filter(Boolean))];

  let hardConstraintLine: string | undefined;
  let negativeBanLine: string | undefined;
  if (uniq.length) {
    const bits = uniq.map((p) => {
      const who = p.who ? `${p.who}` : "角色";
      if (p.verb === "端坐" && p.prop) return `${who}必须端坐${p.prop}`;
      if (p.verb === "跪" && p.prop) return `${who}必须跪于${p.prop}`;
      if (p.verb === "摩挲" && p.prop) return `${who}必须摩挲${p.prop}`;
      if (p.verb === "抄书") return `${who}必须抄书`;
      return `${who}必须${p.verb}${p.prop ?? ""}`;
    });
    hardConstraintLine = `场面硬约束：${bits.join("；")}`;
    if (hasSeatingOrKneel) {
      negativeBanLine =
        "禁止用双人站立香案/持香/供桌仪式代替上述座次与动作；姿态与家具以描写为准，场景参考不得替换太师椅或蒲团";
    }
  }

  return {
    predicates: uniq,
    hardConstraintLine,
    negativeBanLine,
    mustAppear: must,
    hasSeatingOrKneel,
  };
}

/** Format must-appear props for 必须出现 line. */
export function predicateAnchorTokens(pack: DescPredicatePack, names: string[] = []): string[] {
  const out: string[] = [];
  for (const n of names.slice(0, 3)) if (n.length >= 2) out.push(n.slice(0, 8));
  for (const t of pack.mustAppear) {
    if (t.length >= 2 && t.length <= 6) out.push(t);
  }
  return [...new Set(out)].slice(0, 8);
}
