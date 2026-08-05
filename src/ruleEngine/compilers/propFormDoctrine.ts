/**
 * propFormDoctrine — material / form / glyph / pose semantics per propClassId.
 * Positive dims from JSON; antiSub bag separate from formMust lead.
 */
import { readFixtureJson } from "../utils/fixturesPath";
import { loadContactEventPolicy, matchContactEventVd, propClassAliases } from "./contactEventPolicy";

export type FormPositiveDims = {
  size: string;
  silhouette: string;
  thickness: string;
  material: string;
  surface?: string;
};

export type PropFormDoctrine = {
  propClassId: string;
  formPositive: FormPositiveDims;
  /** Positive-only form sentence for mustShowFacts (no 禁止*) */
  formMust: string;
  /** Anti-substitute tokens (neg bag only) */
  formForbid: string[];
  antiSub: string[];
  poseMust?: string;
  poseForbid?: string[];
  glyphRequired: boolean;
  softPlateHint: "thin_sheets" | "cloth_fold" | "blade_edge" | "digit_ring" | "generic";
};

type FixtureClass = {
  formPositive: FormPositiveDims;
  poseMustPositive?: string;
  antiSub?: string[];
  poseAntiSub?: string[];
  glyphRequired?: boolean;
  softPlateHint?: PropFormDoctrine["softPlateHint"];
};

type FixtureRoot = {
  classes?: Record<string, FixtureClass>;
};

function buildFormMust(dims: FormPositiveDims): string {
  const bits = [dims.size, dims.silhouette, dims.thickness, dims.material, dims.surface]
    .map((s) => String(s ?? "").trim())
    .filter(Boolean);
  return `形态：${bits.join("；")}`;
}

function loadFixtureClasses(): Record<string, FixtureClass> {
  const root = readFixtureJson<FixtureRoot>("prop_form_doctrine.json", { classes: {} });
  return root.classes ?? {};
}

let _cache: Record<string, FixtureClass> | null = null;
function classes(): Record<string, FixtureClass> {
  if (!_cache) _cache = loadFixtureClasses();
  return _cache;
}

export function getPropFormDoctrine(propClassId: string | null | undefined): PropFormDoctrine | null {
  if (!propClassId) return null;
  const base = classes()[propClassId] ?? classes().generic;
  if (!base?.formPositive) {
    return {
      propClassId,
      formPositive: {
        size: "本类真实小件尺度",
        silhouette: "本类真实外形",
        thickness: "非夸大大物",
        material: "本类材质",
      },
      formMust: "形态：本镜道具保持其真实薄件/小件形态",
      formForbid: [],
      antiSub: [],
      glyphRequired: false,
      softPlateHint: "generic",
    };
  }
  const antiSub = [...(base.antiSub ?? [])];
  const poseAnti = [...(base.poseAntiSub ?? [])];
  return {
    propClassId,
    formPositive: base.formPositive,
    formMust: buildFormMust(base.formPositive),
    formForbid: antiSub,
    antiSub,
    poseMust: base.poseMustPositive,
    poseForbid: poseAnti,
    glyphRequired: Boolean(base.glyphRequired),
    softPlateHint: base.softPlateHint ?? "generic",
  };
}

/** Pick inscription text from VD aliases (≤4 chars) — never invent plot names. */
export function resolveGlyphTextFromVd(input: {
  visualDescription?: string | null;
  propClassId?: string | null;
  propAlias?: string | null;
  propCanonical?: string | null;
}): string {
  const vd = String(input.visualDescription ?? "");
  const policy = loadContactEventPolicy();
  const ordered =
    (input.propClassId && policy.vocab.propClasses[input.propClassId]?.aliases) ||
    propClassAliases(input.propClassId);
  const hits = ordered.filter((a) => {
    const t = String(a ?? "").trim();
    return t.length >= 1 && t.length <= 4 && vd.includes(t);
  });
  if (hits.length) {
    const titleLike = hits.find((a) => !/^(纸角|纸|角)$/.test(a) && !/角$/.test(a));
    if (titleLike) return titleLike;
    return [...hits].sort((a, b) => b.length - a.length)[0]!;
  }
  const alias = String(input.propAlias ?? "").trim();
  if (alias && alias.length <= 4 && !/角$/.test(alias)) return alias;
  const can = String(input.propCanonical ?? "").trim();
  if (can && can.length <= 4 && can !== "纸角") return can;
  if (input.propClassId === "paper_doc") {
    const short = ordered.find((a) => a.length >= 2 && a.length <= 4 && !/角$/.test(a));
    if (short) return short;
  }
  return hits[0] || "";
}

export type PropFormInject = {
  formFact?: string;
  glyphFact?: string;
  poseFact?: string;
  /** Neg-bag only — never splice into promptLead */
  forbidden: string[];
  softPlateHint: PropFormDoctrine["softPlateHint"];
  glyphText: string;
  formPositive?: FormPositiveDims;
};

/** Build contract injects from propClass + doctrine (generic; contact optional). */
export function buildPropFormInject(input: {
  visualDescription?: string | null;
  propClassId?: string | null;
  propAlias?: string | null;
  propCanonical?: string | null;
  locus?: string | null;
  poseOccupancy?: string | null;
  /** First-frame stillPhase — approaching uses reach poseFact */
  stillPhase?: string | null;
}): PropFormInject {
  const doctrine = getPropFormDoctrine(input.propClassId);
  if (!doctrine) {
    return { forbidden: [], softPlateHint: "generic", glyphText: "" };
  }
  const prop =
    String(input.propAlias || input.propCanonical || "").trim() ||
    propClassAliases(input.propClassId)[0] ||
    "本镜道具";
  const glyphText = resolveGlyphTextFromVd(input);
  const forbidden: string[] = [];
  if (doctrine.antiSub.length) {
    forbidden.push(
      `禁止以${doctrine.antiSub.slice(0, 8).join("/")}替代${prop}（须为${doctrine.softPlateHint === "thin_sheets" ? "展开薄纸片/笺面" : "本类真实形态"}）`,
    );
  }
  for (const p of doctrine.poseForbid ?? []) {
    forbidden.push(`禁止${p}构图`);
  }
  const locus = String(input.locus ?? "").trim();
  const vdBlob = String(input.visualDescription ?? "");
  const bendOcc =
    String(input.poseOccupancy ?? "") === "bend_pickup" ||
    /弯腰|捡起|捡拾|俯身/.test(vdBlob);
  const cheekLocus =
    !bendOcc &&
    (/面颊|颊|脸颊|颧/.test(locus) || /面颊|贴颊|划过面颊/.test(vdBlob));
  let poseFact = doctrine.poseMust ? `${prop}姿态：${doctrine.poseMust}` : undefined;
  if (bendOcc) {
    // Prefer first-frame approach wording when phase known; default approach for process bend
    const phase = String(input.stillPhase ?? "");
    if (phase === "held") {
      poseFact = `${prop}入画于主手触地捡拾（非颊触、非胸前捧持展示）`;
    } else {
      poseFact = `${prop}入画于主手接近/刚触地面薄纸（非颊触、非胸前捧持、非已握满展示）`;
    }
    forbidden.push("禁止手持卡片/胸前展示卡/跪坐捧持替代弯腰捡拾");
  } else if (cheekLocus) {
    poseFact = `${prop}须与面颊真实贴合/划过（颊触）`;
    forbidden.push("禁止抵颏/贴颏/近口持物冒充颊触");
    forbidden.push("禁止口含/纸入口");
    forbidden.push("禁止手持卡片/胸前展示卡/挡脸举物冒充颊触划过");
  }
  // Positive-only form fact (no 禁止 in lead)
  const formFact = `${prop}：${doctrine.formMust}`;
  const approachingPhase =
    String(input.stillPhase ?? "") === "approaching" ||
    String(input.stillPhase ?? "") === "mid_contact";
  let glyphFact: string | undefined;
  if (
    !approachingPhase &&
    (doctrine.glyphRequired || /字迹|可辨|笺面|纸面可见|二字/.test(String(input.visualDescription ?? "")))
  ) {
    if (glyphText) {
      glyphFact = `纸面可见「${glyphText}」墨迹更佳（几何触点优先）`;
    } else {
      glyphFact = `${prop}纸面可有字迹更佳`;
    }
  } else if (approachingPhase) {
    // Geometry enhance only — ban strong ink display-card hijack (拧词假可读)
    glyphFact = `${prop}近地薄片几何可辨（禁强墨迹展示卡）`
  }
  return {
    formFact,
    glyphFact,
    poseFact,
    forbidden,
    softPlateHint: doctrine.softPlateHint,
    glyphText: approachingPhase ? "" : glyphText,
    formPositive: doctrine.formPositive,
  };
}

export function listDoctrineCoveredClasses(): string[] {
  return Object.keys(classes()).filter((k) => k !== "generic");
}

export function assertDoctrineCoversPolicyClasses(): string[] {
  const policy = loadContactEventPolicy();
  const missing: string[] = [];
  const covered = new Set(listDoctrineCoveredClasses());
  for (const id of Object.keys(policy.vocab.propClasses)) {
    if (!covered.has(id)) missing.push(id);
  }
  return missing;
}

/**
 * Match VD then inject — works for contact OR non-contact paper_doc / doc_readable.
 */
export function buildPropFormInjectFromVd(
  vd: string,
  opts?: { stillPhase?: string | null },
): PropFormInject {
  const poseOccupancy = /弯腰|捡起|捡拾|俯身/.test(vd) ? "bend_pickup" : null;
  const stillPhase =
    opts?.stillPhase ??
    (/弯腰|俯身|捡/.test(vd) && /捏紧|指节/.test(vd) ? "approaching" : null);
  const m = matchContactEventVd(vd);
  if (m.isContactEvent && m.propClassId) {
    return buildPropFormInject({
      visualDescription: vd,
      propClassId: m.propClassId,
      propAlias: m.propAlias,
      propCanonical: m.propCanonical,
      locus: m.locus,
      poseOccupancy,
      stillPhase,
    });
  }
  // Non-contact paper / hold — still apply paper_doc positive dims
  if (/休书|婚书|信笺|信纸|薄纸|纸面|笺面/.test(vd) || (/纸/.test(vd) && /捡|捏|持|递|展开|翻开/.test(vd))) {
    return buildPropFormInject({
      visualDescription: vd,
      propClassId: "paper_doc",
      propAlias: /休书|婚书|信笺|信纸/.exec(vd)?.[0] ?? "纸",
      poseOccupancy,
      stillPhase,
    });
  }
  return { forbidden: [], softPlateHint: "generic", glyphText: "" };
}

/** Resolve propClass for paper readability without requiring contact event. */
export function resolvePaperDocIntent(vd: string): {
  isPaperDoc: boolean;
  propClassId: string | null;
  viaContact: boolean;
} {
  const m = matchContactEventVd(vd);
  if (m.isContactEvent && m.propClassId === "paper_doc") {
    return { isPaperDoc: true, propClassId: "paper_doc", viaContact: true };
  }
  if (/休书|婚书|信笺|信纸/.test(vd) || (/纸面|笺面|字迹/.test(vd) && /纸|书/.test(vd))) {
    return { isPaperDoc: true, propClassId: "paper_doc", viaContact: false };
  }
  if (/纸/.test(vd) && /捡|捏|持|递|展开|翻开|可读/.test(vd)) {
    return { isPaperDoc: true, propClassId: "paper_doc", viaContact: false };
  }
  return { isPaperDoc: false, propClassId: null, viaContact: false };
}
