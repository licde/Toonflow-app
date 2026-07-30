/**
 * Contact-event SSOT — load vocab from literary doctrine; never invent verbs/props at runtime.
 * Trigger: contactVerb ∩ propClassAlias ∧ ¬resultOnly；metaphor without propClass does not fire.
 */
import { readFixtureJson } from "../utils/fixturesPath";

export type ContactPropClassId = string;

export type ContactEventPolicy = {
  version?: string;
  vocab: {
    contactVerbs: string[];
    propClasses: Record<string, { aliases: string[]; canonical?: string; sfxHint?: string }>;
    resultAtomsOnly: string[];
    metaphorBlocklistHints: string[];
  };
  stillMust: string[];
  videoMust: string[];
  framingPolicy: {
    faceCuWithLargeProp: "prefer_prop_corner" | "insert_hand_or_prop" | "split_hold_react";
    preferLayoutFamily?: string;
  };
  motionBeatTemplates: Record<
    string,
    {
      verbs?: string[];
      propClasses?: string[];
      phases: string[];
      shortDurMaxSec?: number;
      shortPhases?: string[];
    }
  >;
  woundVisibleNotProp: boolean;
};

const FALLBACK: ContactEventPolicy = {
  version: "1.0.0",
  vocab: {
    contactVerbs: [
      "划过",
      "拂过",
      "贴合",
      "贴颊",
      "贴脸",
      "颊触",
      "甩至",
      "擦过",
      "抵",
      "压",
      "贴在",
      "压在",
      "抵在",
      "摩挲",
      "拭",
      "抹",
    ],
    propClasses: {
      paper_doc: {
        aliases: ["休书", "婚书", "信笺", "信纸", "纸角", "书信", "纸"],
        canonical: "纸角",
        sfxHint: "纸页摩擦",
      },
      cloth: {
        aliases: ["帕", "手帕", "巾", "袖", "袖口"],
        canonical: "帕",
        sfxHint: "布料轻擦",
      },
      blade: {
        aliases: ["剑", "刀", "刃", "剑锋"],
        canonical: "剑锋",
        sfxHint: "金属轻触",
      },
      digit_prop: {
        aliases: ["扳指", "戒指", "玉佩"],
        canonical: "扳指",
      },
    },
    resultAtomsOnly: ["浅痕", "渗血", "血珠", "面颊浅痕", "浅痕可见"],
    metaphorBlocklistHints: ["目光划过", "余光扫过", "眼神掠过"],
  },
  stillMust: ["propInFrame", "contactGeom"],
  videoMust: ["executableBeats"],
  framingPolicy: {
    faceCuWithLargeProp: "prefer_prop_corner",
    preferLayoutFamily: "insert_hand_or_prop",
  },
  motionBeatTemplates: {
    contact_sweep: {
      verbs: ["划过", "拂过", "擦过", "甩至", "颊触"],
      propClasses: ["paper_doc", "cloth"],
      phases: [
        "0s-{t1}s: {prop}自{locus}侧进入贴合",
        "{t1}s-{t2}s: {prop}沿{locus}划过",
        "{t2}s-{dur}s: 停住；{wound}微表情可读",
      ],
      shortDurMaxSec: 1.5,
      shortPhases: ["0s-{t1}s: {prop}贴合{locus}", "{t1}s-{dur}s: 停住可读"],
    },
    contact_hold: {
      verbs: ["摩挲", "捏", "握"],
      propClasses: ["digit_prop", "paper_doc"],
      phases: [
        "0s-{t1}s: 手与{prop}同框贴合",
        "{t1}s-{dur}s: {prop}微动跟随，禁仅微表情呼吸",
      ],
      shortDurMaxSec: 1.5,
      shortPhases: ["0s-{dur}s: 手持{prop}微动跟随"],
    },
    contact_press: {
      verbs: ["抵", "压", "贴在", "压在", "抵在"],
      propClasses: ["blade", "paper_doc"],
      phases: [
        "0s-{t1}s: {prop}抵近{locus}",
        "{t1}s-{dur}s: 贴合停住，禁悬空",
      ],
      shortDurMaxSec: 1.5,
      shortPhases: ["0s-{dur}s: {prop}贴合{locus}停住"],
    },
    wound_hold: {
      verbs: ["咬", "渗"],
      propClasses: [],
      phases: ["0s-{dur}s: 伤口/渗血可见；无道具划过"],
    },
  },
  woundVisibleNotProp: true,
};

let cached: ContactEventPolicy | null = null;

export function loadContactEventPolicy(): ContactEventPolicy {
  if (cached) return cached;
  try {
    const still = readFixtureJson<{ contactEventPolicy?: ContactEventPolicy }>(
      "still_literary_intent_doctrine.json",
      {},
    );
    if (still.contactEventPolicy?.vocab?.contactVerbs?.length) {
      cached = { ...FALLBACK, ...still.contactEventPolicy, vocab: { ...FALLBACK.vocab, ...still.contactEventPolicy.vocab } };
      return cached;
    }
  } catch {
    /* fall through */
  }
  cached = FALLBACK;
  return cached;
}

/** Test helper — reset cache after fixture edits. */
export function resetContactEventPolicyCache(): void {
  cached = null;
}

export type ContactEventMatch = {
  isContactEvent: boolean;
  propClassId: string | null;
  propAlias: string | null;
  propCanonical: string | null;
  verb: string | null;
  locus: string | null;
  templateId: string | null;
  resultOnly: boolean;
  metaphorBlocked: boolean;
};

const LOCUS_FALLBACK = [
  "面颊",
  "脸颊",
  "颊",
  "下唇",
  "唇",
  "嘴角",
  "指尖",
  "腕",
  "颈",
  "喉",
  "肩",
  "眼角",
];

export function matchContactEventVd(vdRaw: string): ContactEventMatch {
  const policy = loadContactEventPolicy();
  const vd = String(vdRaw ?? "").trim();
  const empty: ContactEventMatch = {
    isContactEvent: false,
    propClassId: null,
    propAlias: null,
    propCanonical: null,
    verb: null,
    locus: null,
    templateId: null,
    resultOnly: false,
    metaphorBlocked: false,
  };
  if (vd.length < 4) return empty;

  for (const hint of policy.vocab.metaphorBlocklistHints) {
    if (vd.includes(hint) && !findPropAlias(vd, policy)) {
      return { ...empty, metaphorBlocked: true };
    }
  }

  const prop = findPropAlias(vd, policy);
  const verb = findVerb(vd, policy);
  const hasResult = policy.vocab.resultAtomsOnly.some((a) => vd.includes(a));
  const resultOnly = hasResult && !prop && !verb;

  if (resultOnly) return { ...empty, resultOnly: true };
  if (!prop || !verb) return empty;

  const locus = findLocus(vd) ?? "面颊";
  const templateId = pickTemplateId(verb, prop.classId, policy);

  return {
    isContactEvent: true,
    propClassId: prop.classId,
    propAlias: prop.alias,
    propCanonical: prop.canonical,
    verb,
    locus,
    templateId,
    resultOnly: false,
    metaphorBlocked: false,
  };
}

export function isContactEventVd(vd: string): boolean {
  return matchContactEventVd(vd).isContactEvent;
}

function findPropAlias(
  vd: string,
  policy: ContactEventPolicy,
): { classId: string; alias: string; canonical: string } | null {
  let best: { classId: string; alias: string; canonical: string; len: number } | null = null;
  for (const [classId, def] of Object.entries(policy.vocab.propClasses)) {
    for (const alias of def.aliases ?? []) {
      if (!alias || !vd.includes(alias)) continue;
      if (!best || alias.length > best.len) {
        best = {
          classId,
          alias,
          canonical: def.canonical || alias,
          len: alias.length,
        };
      }
    }
  }
  return best ? { classId: best.classId, alias: best.alias, canonical: best.canonical } : null;
}

function findVerb(vd: string, policy: ContactEventPolicy): string | null {
  // Longer verbs first
  const verbs = [...policy.vocab.contactVerbs].sort((a, b) => b.length - a.length);
  for (const v of verbs) {
    if (vd.includes(v)) return v;
  }
  return null;
}

function findLocus(vd: string): string | null {
  for (const loc of LOCUS_FALLBACK) {
    if (vd.includes(loc)) return loc;
  }
  const m = vd.match(
    /(?:划过|贴[在着]?|压[在着]?|抵[在着]?|拂过|擦过|拭|抹)([\u4e00-\u9fff]{1,3})/,
  );
  return m?.[1] ?? null;
}

function pickTemplateId(verb: string, classId: string, policy: ContactEventPolicy): string {
  for (const [id, t] of Object.entries(policy.motionBeatTemplates)) {
    if (id === "wound_hold") continue;
    const verbOk = !t.verbs?.length || t.verbs.some((v) => verb.includes(v) || v.includes(verb));
    const classOk = !t.propClasses?.length || t.propClasses.includes(classId);
    if (verbOk && classOk) return id;
  }
  return "contact_sweep";
}

/** Build executable multi-phase Motion body (no [Motion] header). */
export function buildContactEventMotionBeats(input: {
  visualDescription: string;
  durationSec: number;
  woundVisible?: boolean;
  stillPoseAnchor?: { state?: ContactStartState; prop?: string; locus?: string } | null;
  contactStartState?: ContactStartState | null;
}): { body: string; templateId: string; from: "contactEvent"; phases: number } | null {
  const m = matchContactEventVd(input.visualDescription);
  if (!m.isContactEvent || !m.templateId) return null;
  const policy = loadContactEventPolicy();
  const startState =
    input.contactStartState ??
    input.stillPoseAnchor?.state ??
    inferContactStartStateFromStill({ visualDescription: input.visualDescription }).state;
  let templateId = m.templateId;
  if (startState === "at_locus" || startState === "held_mid") {
    templateId = policy.motionBeatTemplates.contact_hold ? "contact_hold" : m.templateId;
  }
  const tmpl = policy.motionBeatTemplates[templateId] ?? policy.motionBeatTemplates.contact_sweep;
  const dur = Math.max(0.8, Number(input.durationSec) || 2);
  const short = dur <= (tmpl.shortDurMaxSec ?? 1.5);
  const rawPhases = short && tmpl.shortPhases?.length ? tmpl.shortPhases : tmpl.phases;
  const prop = m.propCanonical || m.propAlias || "道具";
  const locus = m.locus || "面颊";
  const wound = input.woundVisible || /浅痕|渗血|血珠/.test(input.visualDescription) ? "浅痕可见；" : "";

  let t1: number;
  let t2: number;
  if (rawPhases.length <= 2) {
    t1 = Math.round(dur * 0.45 * 10) / 10;
    t2 = dur;
  } else {
    t1 = Math.round(dur * 0.25 * 10) / 10;
    t2 = Math.round(dur * 0.7 * 10) / 10;
  }

  const lines = rawPhases.map((p) =>
    p
      .replace(/\{prop\}/g, prop)
      .replace(/\{locus\}/g, locus)
      .replace(/\{wound\}/g, wound)
      .replace(/\{t1\}/g, String(t1))
      .replace(/\{t2\}/g, String(t2))
      .replace(/\{dur\}/g, String(dur)),
  );
  let body = lines.join("\n");
  if ((startState === "at_locus" || startState === "held_mid") && /自.*侧进入/.test(body)) {
    body = `0s-${dur}s: ${prop}已贴合${locus}；微动/微划可读，禁重复进入动作`;
  }
  return {
    body,
    templateId,
    from: "contactEvent",
    phases: lines.length,
  };
}

/** Union of all propClass aliases from doctrine (sorted longer-first for regex). */
export function allContactPropAliases(): string[] {
  const policy = loadContactEventPolicy();
  const set = new Set<string>();
  for (const def of Object.values(policy.vocab.propClasses)) {
    for (const a of def.aliases ?? []) {
      if (a && a.trim()) set.add(a.trim());
    }
  }
  return [...set].sort((a, b) => b.length - a.length);
}

/** Escape for embedding aliases into RegExp alternation. */
export function contactPropAliasAlternation(): string {
  return allContactPropAliases()
    .map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
}

/** True if token looks like a holdable prop (doctrine aliases + common still props). */
export function isPropishAnchorToken(token: string): boolean {
  const t = String(token ?? "").trim();
  if (!t) return false;
  if (allContactPropAliases().some((a) => a.length >= 1 && t.includes(a))) return true;
  return /扳指|玉|刀|剑|杯|盏|烛|信|书|戒指|道具|袖|手|伞|扇|簪|酒|香/.test(t);
}

/** RegExp matching any doctrine prop alias (longer aliases first). */
export function contactPropAliasRegex(): RegExp {
  const alt = contactPropAliasAlternation();
  if (!alt) return /休书|婚书|信笺|纸角|帕|剑|刀/;
  return new RegExp(`(?:${alt})`);
}

/** True if text mentions any alias of the matched prop class (or any paper/cloth/blade when match given). */
export function textHasPropInFrame(text: string, match?: ContactEventMatch | null): boolean {
  const policy = loadContactEventPolicy();
  const t = String(text ?? "");
  if (match?.propClassId) {
    const aliases = policy.vocab.propClasses[match.propClassId]?.aliases ?? [];
    if (aliases.some((a) => a && t.includes(a))) return true;
    if (match.propAlias && t.includes(match.propAlias)) return true;
    if (match.propCanonical && t.includes(match.propCanonical)) return true;
  }
  for (const def of Object.values(policy.vocab.propClasses)) {
    if ((def.aliases ?? []).some((a) => a.length >= 2 && t.includes(a))) return true;
  }
  return false;
}

/** Wound/scar alone must not count as prop-in-frame when contactEvent requires prop. */
export function woundVisibleIsNotProp(text: string): boolean {
  const policy = loadContactEventPolicy();
  const t = String(text ?? "");
  const hasWound = policy.vocab.resultAtomsOnly.some((a) => t.includes(a));
  return hasWound && !textHasPropInFrame(t);
}

export function contactSfxHint(match: ContactEventMatch): string | null {
  if (!match.propClassId) return null;
  const policy = loadContactEventPolicy();
  return policy.vocab.propClasses[match.propClassId]?.sfxHint ?? null;
}

export function cheekContactSeedVd(who: string, match: ContactEventMatch): string {
  const prop = match.propCanonical || match.propAlias || "纸角";
  const locus = match.locus || "面颊";
  const whoBit = who ? `${who}侧脸，` : "";
  return `${whoBit}${prop}划过${locus}。纸未入口；仅颊触非口含。`.slice(0, 220);
}

export function stripContactSweepClauses(vd: string, match: ContactEventMatch): string {
  const prop = match.propAlias || match.propCanonical || "";
  let out = vd;
  if (prop) {
    out = out.replace(new RegExp(`[，,]?\\s*${escapeReg(prop)}[^。；;]{0,24}`, "g"), "");
  }
  out = out
    .replace(/[，,]?\s*纸角划过面颊[^。；;]*/g, "")
    .replace(/[，,]?\s*划过面颊[^。；;]*/g, "")
    .replace(/。。+/g, "。")
    .replace(/，+/g, "，")
    .trim();
  return out;
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Pose at still capture time — drives Motion template selection. */
export type ContactStartState = "entering" | "at_locus" | "held_mid" | "released";

export function inferContactStartStateFromStill(input: {
  stillPrompt?: string | null;
  stillMeta?: Record<string, unknown> | null;
  visualDescription?: string | null;
}): { state: ContactStartState; prop?: string; locus?: string } {
  const meta = input.stillMeta ?? {};
  const declared = String(
    meta.contactStartState ??
      (meta.stillPoseAnchor as { state?: string } | undefined)?.state ??
      "",
  ).trim() as ContactStartState;
  if (declared && ["entering", "at_locus", "held_mid", "released"].includes(declared)) {
    const anchor = meta.stillPoseAnchor as { prop?: string; locus?: string } | undefined;
    return { state: declared, prop: anchor?.prop, locus: anchor?.locus };
  }
  const blob = `${input.stillPrompt ?? ""} ${JSON.stringify(meta)} ${input.visualDescription ?? ""}`;
  const m = matchContactEventVd(String(input.visualDescription ?? blob));
  const prop = m.propCanonical || m.propAlias;
  const locus = m.locus || "面颊";
  if (/已贴|贴合停|贴颊|贴脸|持稳|微划|停住/.test(blob)) {
    return { state: "at_locus", prop, locus };
  }
  if (/手持|握住|捏紧|仍持/.test(blob) && !/划过|甩至|进入/.test(blob)) {
    return { state: "held_mid", prop, locus };
  }
  if (/放下|离手|released/.test(blob)) {
    return { state: "released", prop, locus };
  }
  return { state: "entering", prop, locus };
}

