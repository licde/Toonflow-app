/**
 * Action-primary SSOT — verbs declared in this shot's VD / script text.
 * Homology: never invent story actions absent from the literary body
 * (same freeze as neverNerInventPredicates). Doctrine seed = coverage lexicon;
 * runtime extract covers novel script verbs (掀桌/攥紧/拂袖…) via tight patterns.
 */
import {
  hasSeatingHardFurniture,
  loadLiteraryIntentDoctrine,
  type LiteraryIntentDoctrine,
} from "./stillLiteraryIntentSsot";

/** Seating / posture — never action-primary. */
const SEATING_OR_POSTURE =
  /^(?:端坐|跪|跪于|下跪|跪地|侧卧|倚靠|高坐|低跪|坐于|坐在|落座|就座|低头|抬头|俯视|仰视)$/;

/** Atmosphere / confront / framing debris — not motion layout-exempt. */
const NON_ACTION =
  /^(?:是|有|在|于|的|了|着|过|与|和|及|或|被|把|将|从|向|对|给|为|由|让|使|中景|全景|特写|近景|远景|隐忍|说教|对峙|分立|相对|无言|廊下|烛火|居高|临下|高位|低位|权力|正脸|眼神|凝视|面容|continuity|continues|母对|与沈|高临下|跪地低头|低头隐忍|居高临下|对峙分立|高位俯视)$/i;

/** Resultative complements that mark real motion compounds (攥紧/掀起/捡起). */
const RESULT_COMP = /起|开|下|上|紧|断|碎|出|入|过|住|落|回|掉|破|裂|进|至/;

/**
 * Curated motion lexicon (seed). Soft emotion/posture (低头/俯视) intentionally omitted —
 * those belong to seating_power / atmosphere, not StageA-exempt action.
 */
const FALLBACK_SEED = [
  "弯腰",
  "捡",
  "捏",
  "持",
  "递",
  "抽",
  "撕",
  "咬",
  "刺",
  "抄书",
  "起身",
  "推门",
  "开门",
  "摔杯",
  "拍案",
  "掩面",
  "拭泪",
  "转身",
  "拦",
  "追",
  "泼",
  "攥",
  "拂袖",
  "掀",
  "摔",
  "推",
  "拉",
  "抱",
  "捧",
  "塞",
  "扔",
  "甩",
  "砍",
  "斩",
  "砍",
  "挥",
  "格挡",
  "闪避",
  "对打",
  "扑",
  "刺入",
  "包扎",
  "止血",
  "擦泪",
  "抬手",
  "握紧",
  "捏紧",
  "捡起",
  "撕开",
  "递上",
  "推开",
  "拦下",
  "追出",
  "掀起",
  "攥紧",
  "拂袖",
];

export type ActionPrimaryHit = {
  hit: boolean;
  verbs: string[];
  /** doctrine_seed | vd_extract | predicate */
  sources: string[];
};

function seedList(doctrine?: LiteraryIntentDoctrine, extraLexicon?: string[] | null): string[] {
  const d = doctrine ?? loadLiteraryIntentDoctrine();
  const fromDoc = (d.actionPrimarySignals ?? []).filter(
    (s) => s && !SEATING_OR_POSTURE.test(s) && !NON_ACTION.test(s) && s !== "指节",
  );
  const extra = (extraLexicon ?? []).filter((s) => s && s.length >= 2 && !SEATING_OR_POSTURE.test(s));
  return [...new Set([...fromDoc, ...FALLBACK_SEED, ...extra])].sort((a, b) => b.length - a.length);
}

function isBlockedVerb(v: string): boolean {
  const t = String(v ?? "").trim();
  if (t.length < 2 || t.length > 4) return true;
  if (SEATING_OR_POSTURE.test(t) || NON_ACTION.test(t)) return true;
  // Garbage name-glue (与沈 / 母对)
  if (/^[与和及或]/.test(t)) return true;
  if (/对$/.test(t) && !/^(?:对视|对峙)$/.test(t)) return true;
  if (/^(?:对峙|分立)$/.test(t)) return true;
  return false;
}

function isMotionCompound(v: string): boolean {
  if (v.length < 2) return false;
  return RESULT_COMP.test(v.slice(-1)) || /腰|身|门|案|杯|袖|桌|书|帕|泪|手|紧|开/.test(v);
}

function pushVerb(out: string[], seen: Set<string>, verb: string, seeds: string[]): void {
  const v = String(verb ?? "").trim();
  if (!v || isBlockedVerb(v) || seen.has(v)) return;
  const seedOk = seeds.some((s) => s === v || (s.length >= 2 && (v.includes(s) || s.includes(v))));
  const morphOk = isMotionCompound(v);
  if (!seedOk && !morphOk) return;
  seen.add(v);
  out.push(v);
}

/**
 * Extract action verbs that already appear in VD/script (declare-only).
 */
export function extractVdDeclaredActionVerbs(
  text?: string | null,
  opts?: {
    castNames?: string[] | null;
    doctrine?: LiteraryIntentDoctrine;
    /** Episode-harvested stems — only match if also present in this text */
    extraLexicon?: string[] | null;
  },
): string[] {
  const raw = String(text ?? "").trim();
  if (!raw) return [];
  const doctrine = opts?.doctrine ?? loadLiteraryIntentDoctrine();
  const seeds = seedList(doctrine, opts?.extraLexicon);
  const out: string[] = [];
  const seen = new Set<string>();

  // 1) Seed lexicon — substring must exist in text
  for (const s of seeds) {
    if (raw.includes(s)) pushVerb(out, seen, s, seeds);
  }

  // 2) Name-adjacent: only seed-or-motion compounds (拒 与沈/对峙分立 垃圾)
  const names = [...(opts?.castNames ?? [])]
    .map((n) => String(n ?? "").trim())
    .filter((n) => n.length >= 2)
    .sort((a, b) => b.length - a.length);
  for (const n of names) {
    let from = 0;
    while (from < raw.length) {
      const idx = raw.indexOf(n, from);
      if (idx < 0) break;
      const span = raw.slice(idx + n.length, idx + n.length + 8).replace(/^[，。；、\s与和]+/, "");
      const res = span.match(new RegExp(`^[\\u4e00-\\u9fff]{1,2}(?:${RESULT_COMP.source})`));
      if (res) pushVerb(out, seen, res[0]!, seeds);
      const two = span.match(/^[\u4e00-\u9fff]{2}/);
      if (two) pushVerb(out, seen, two[0]!, seeds);
      from = idx + n.length;
    }
  }

  // 3) Global morph compounds — prefer 2-char (书掀起→掀起); drop location+补语 (廊下)
  const morphRe = new RegExp(`[\\u4e00-\\u9fff]{1,2}(?:${RESULT_COMP.source})`, "g");
  let m: RegExpExecArray | null;
  const LOC_STEM = /^(?:廊|堂|院|街|巷|桥|窗|阶|台|角|边|旁|里|外|中|前|后)/;
  while ((m = morphRe.exec(raw)) !== null) {
    let v = m[0]!;
    if (v.length === 3) v = v.slice(1);
    if (LOC_STEM.test(v[0]!)) continue;
    pushVerb(out, seen, v, seeds);
  }

  // 4) Non-seating literary predicates (抄书/捡/递…)
  try {
    const { extractDescPredicates } =
      require("./extractDescPredicates") as typeof import("./extractDescPredicates");
    const pack = extractDescPredicates({
      description: raw,
      characterNames: opts?.castNames ?? [],
    });
    for (const p of pack.predicates) {
      if (/端坐|跪|侧卧|倚靠|摩挲/.test(p.verb)) continue;
      pushVerb(out, seen, p.verb, seeds);
    }
  } catch {
    /* optional */
  }

  return out;
}

/**
 * Resolve whether this beat is action-primary (no seating StageA).
 */
export function resolveActionPrimaryHit(input: {
  text?: string | null;
  castNames?: string[] | null;
  hasSeatingOrKneel?: boolean;
  doctrine?: LiteraryIntentDoctrine;
  /** From harvestActionLexiconFromEpisode — still declare-only on this shot */
  extraLexicon?: string[] | null;
}): ActionPrimaryHit {
  const text = String(input.text ?? "");
  if (!text.trim()) return { hit: false, verbs: [], sources: [] };
  if (input.hasSeatingOrKneel || hasSeatingHardFurniture(text)) {
    return { hit: false, verbs: [], sources: ["seating_hard_block"] };
  }
  // Oral / lip_bite micro is not bend/paper action-primary (SingleShotClosedCompose)
  try {
    const { isOralMicroNotActionPrimary } =
      require("./singleShotClosedCompose") as typeof import("./singleShotClosedCompose");
    if (isOralMicroNotActionPrimary(text)) {
      return { hit: false, verbs: [], sources: ["oral_micro_not_action"] };
    }
  } catch {
    if (
      /咬唇|紧咬下唇|渗血|lip_bite|唇瓣/.test(text) &&
      /特写|CU|近景/i.test(text) &&
      !/弯腰|捡起|捏紧|俯身/.test(text)
    ) {
      return { hit: false, verbs: [], sources: ["oral_micro_not_action"] };
    }
  }

  const doctrine = input.doctrine ?? loadLiteraryIntentDoctrine();
  const seeds = seedList(doctrine, input.extraLexicon).filter((s) => s !== "咬");
  const verbs = extractVdDeclaredActionVerbs(text, {
    castNames: input.castNames,
    doctrine,
    extraLexicon: input.extraLexicon,
  }).filter((v) => v !== "咬" && !/^咬/.test(v));
  if (!verbs.length) return { hit: false, verbs: [], sources: [] };

  const sources: string[] = [];
  if (verbs.some((v) => seeds.some((s) => s === v || v.includes(s) || s.includes(v)))) {
    sources.push("doctrine_seed");
  }
  if (verbs.some((v) => isMotionCompound(v) && !seeds.includes(v))) {
    sources.push("vd_extract");
  }
  if (input.extraLexicon?.length) sources.push("episode_lexicon");
  if (!sources.length) sources.push("vd_extract");

  return { hit: true, verbs, sources: [...new Set(sources)] };
}

/**
 * Scan sibling / episode VDs for declared action stems (coverage lexicon only).
 * Matching still requires the stem to appear in the *current* shot text.
 */
export function harvestActionLexiconFromEpisode(
  episodeTexts: Array<string | null | undefined>,
  opts?: { castNames?: string[] | null; doctrine?: LiteraryIntentDoctrine; max?: number },
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const max = Math.max(8, opts?.max ?? 48);
  for (const raw of episodeTexts) {
    const t = String(raw ?? "").trim();
    if (!t) continue;
    for (const v of extractVdDeclaredActionVerbs(t, {
      castNames: opts?.castNames,
      doctrine: opts?.doctrine,
    })) {
      if (seen.has(v)) continue;
      seen.add(v);
      out.push(v);
      if (out.length >= max) return out;
    }
  }
  return out;
}

export function hasActionPrimarySignals(
  text: string,
  doctrine?: LiteraryIntentDoctrine,
  castNames?: string[] | null,
): boolean {
  return resolveActionPrimaryHit({ text, doctrine, castNames }).hit;
}
