/**
 * Still literary fidelity checklist SSOT — shared by L0 prompt heal and L1 VLM judge.
 */
import { readFixtureJson } from "../utils/fixturesPath";
import { extractDescPredicates } from "./extractDescPredicates";

/** Avoid importing composeStillPrompt (circular). Dirty = contract shell / no literary Chinese. */
function looksDirtyLiterarySource(prompt: string): boolean {
  const raw = String(prompt ?? "").trim();
  if (!raw) return true;
  const zh = raw.replace(/[^\u4e00-\u9fff]/g, "");
  if (zh.length >= 12 && !/vertical\s*9:16\s*safe\s*area/i.test(raw)) return false;
  return /safe area|power blocking|9:16安全区|vertical\s*9:16/i.test(raw) && zh.length < 24;
}

export type FidelityKind =
  | "role_action"
  | "prop"
  | "seating"
  | "cast_cardinality"
  | "composition"
  | "atmosphere"
  | "identity"
  | "forbidden";

export interface StillFidelityItem {
  id: string;
  kind: FidelityKind;
  who?: string;
  mustTokens: string[];
  vlmQuestion: string;
  healInject: string;
  strengthenKey: string;
  strengthenValue: string;
  forbidden?: boolean;
}

export interface LiteraryFidelityAssertResult {
  ok: boolean;
  missing: StillFidelityItem[];
  passed: StillFidelityItem[];
  score: number;
  checked: string[];
  hasSeatingOrKneel: boolean;
}

interface ChecklistFixture {
  version: string;
  whoWindowChars?: number;
  compositionPatterns?: string[];
  atmospherePatterns?: string[];
  forbiddenWhenSeating?: {
    id: string;
    mustTokens?: string[];
    vlmQuestion: string;
    healInject: string;
    strengthenKey: string;
    strengthenValue: string;
    forbidden?: boolean;
  };
  /** When bgPolicy demote/drop — VLM pixel gate vs grey studio void */
  backgroundReadableWhenDemote?: {
    id: string;
    mustTokens?: string[];
    vlmQuestion: string;
    healInject: string;
    strengthenKey: string;
    strengthenValue: string;
  };
  strengthenKeys?: Record<string, string>;
}

const FALLBACK: ChecklistFixture = {
  version: "1.0.0",
  whoWindowChars: 24,
  compositionPatterns: ["权力反差", "高位", "低位", "相对", "左右", "前后"],
  atmospherePatterns: ["烛火", "烛光", "侧光", "雨", "雾", "月光"],
  forbiddenWhenSeating: {
    id: "forbidden:香案站立",
    mustTokens: [],
    vlmQuestion: "画面是否出现双人站立香案/持香/供桌祭拜仪式构图？（若是则失败）",
    healInject: "禁止用双人站立香案/持香/供桌仪式代替座次与动作",
    strengthenKey: "negativeBan",
    strengthenValue: "no_altar_standing_ritual",
    forbidden: true,
  },
  backgroundReadableWhenDemote: {
    id: "identity:background_readable",
    mustTokens: [],
    vlmQuestion: "背景是否为可辨室内/场景（非灰棚/纯色摄影棚空白/无环境）？",
    healInject:
      "背景弱化：浅景深，保留室内环境可辨（木作/墙面/烛光），禁止灰棚/纯色摄影棚空白背景，禁止香案升为主构图",
    strengthenKey: "compositionLock",
    strengthenValue: "background_readable",
  },
  strengthenKeys: {
    role_action: "roleLock",
    prop: "mustProps",
    seating: "roleLock",
    composition: "composition",
    atmosphere: "atmosphere",
    identity: "crefWeight",
    forbidden: "negativeBan",
  },
};

export function loadLiteraryFidelityChecklistConfig(): ChecklistFixture {
  return readFixtureJson<ChecklistFixture>("still_literary_fidelity_checklist.json", FALLBACK);
}

/**
 * Description SSOT for checklist: visualDescription first; never dirty prompt as literary source.
 * videoDesc may pad atmosphere only when visualDescription present.
 */
export function resolveLiteraryDescriptionSsot(input: {
  visualDescription?: string | null;
  videoDesc?: string | null;
  /** Explicit clean paste (fidelity mode user body) — not dirty contract shells */
  cleanPasteBody?: string | null;
}): { description: string; source: string; ok: boolean; blockReason?: string } {
  const vd = String(input.visualDescription ?? "").trim();
  if (vd && !looksDirtyLiterarySource(vd)) {
    return { description: vd, source: "shot.visualDescription", ok: true };
  }
  const paste = String(input.cleanPasteBody ?? "").trim();
  if (paste && !looksDirtyLiterarySource(paste) && paste.length >= 12) {
    return { description: paste, source: "cleanPaste", ok: true };
  }
  return {
    description: "",
    source: "none",
    ok: false,
    blockReason: "missing_visual_description",
  };
}

function whoNearTokens(prompt: string, who: string | undefined, tokens: string[], window: number): boolean {
  if (!tokens.length) return true;
  if (!who) return tokens.every((t) => prompt.includes(t));
  const idx = prompt.indexOf(who);
  if (idx < 0) {
    // alias: first 2 chars
    const short = who.slice(0, 2);
    const i2 = short.length >= 2 ? prompt.indexOf(short) : -1;
    if (i2 < 0) return tokens.every((t) => prompt.includes(t));
    const slice = prompt.slice(Math.max(0, i2 - window), i2 + short.length + window);
    return tokens.every((t) => slice.includes(t) || prompt.includes(t));
  }
  const slice = prompt.slice(Math.max(0, idx - window), idx + who.length + window);
  return tokens.every((t) => slice.includes(t) || prompt.includes(t));
}

/**
 * Build checklist items from literary description (Declare — no invented actions).
 */
export function buildLiteraryFidelityChecklist(input: {
  description?: string | null;
  characterNames?: string[] | null;
  /** When true and ≥2 names + seating, add dual-cref identity item */
  requireDualIdentity?: boolean;
  /** When not keep, skip atmosphere items (background demoted) */
  bgPolicy?: "drop" | "demote" | "keep" | null;
  /** Face CU skips exact-N cast cardinality */
  shotSize?: string | null;
}): StillFidelityItem[] {
  const cfg = loadLiteraryFidelityChecklistConfig();
  const keys = cfg.strengthenKeys ?? FALLBACK.strengthenKeys!;
  const desc = String(input.description ?? "").trim();
  const names = (input.characterNames ?? []).filter(Boolean);
  if (!desc) return [];

  const pack = extractDescPredicates({ description: desc, characterNames: names });
  const items: StillFidelityItem[] = [];
  const seen = new Set<string>();

  for (const p of pack.predicates) {
    const who = p.who;
    const tokens = [p.verb, p.prop].filter(Boolean) as string[];
    if (p.verb === "抄书" && !tokens.includes("抄书")) tokens.push("抄书");
    const id = `role:${who ?? "角色"}:${p.verb}${p.prop ? `:${p.prop}` : ""}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const surface = [who, p.verb, p.prop].filter(Boolean).join("");
    const kind: FidelityKind =
      /端坐|跪|侧卧|倚靠/.test(p.verb) || /太师椅|蒲团/.test(p.prop ?? "") ? "seating" : "role_action";
    items.push({
      id,
      kind,
      who,
      mustTokens: [...new Set(tokens)],
      vlmQuestion: `图中是否清晰可见：${surface || p.verb}？`,
      healInject: who
        ? `${who}必须${p.verb}${p.prop ?? ""}`
        : `角色必须${p.verb}${p.prop ?? ""}`,
      strengthenKey: keys[kind] ?? "roleLock",
      strengthenValue: surface || p.verb,
    });
    if (p.prop && p.prop !== "书") {
      const propId = `prop:${p.prop}`;
      if (!seen.has(propId)) {
        seen.add(propId);
        items.push({
          id: propId,
          kind: "prop",
          mustTokens: [p.prop],
          vlmQuestion: `图中是否出现道具/家具：${p.prop}？`,
          healInject: `必须出现${p.prop}`,
          strengthenKey: keys.prop ?? "mustProps",
          strengthenValue: p.prop,
        });
      }
    }
  }

  for (const pat of cfg.compositionPatterns ?? []) {
    if (!desc.includes(pat)) continue;
    const id = `composition:${pat}`;
    if (seen.has(id)) continue;
    seen.add(id);
    items.push({
      id,
      kind: "composition",
      mustTokens: [pat],
      vlmQuestion: `画面构图是否体现「${pat}」？`,
      healInject: `构图：${pat}，主体清晰不抢戏`,
      strengthenKey: keys.composition ?? "composition",
      strengthenValue: pat,
    });
  }

  for (const pat of cfg.atmospherePatterns ?? []) {
    // Homology with atmosphereIsContentWhenInVd: demote/drop still gate VD-named atmosphere
    // (skip only when pattern absent from desc — not when bgPolicy demotes scene pixels)
    if (!desc.includes(pat)) continue;
    const id = `atmosphere:${pat}`;
    if (seen.has(id)) continue;
    seen.add(id);
    items.push({
      id,
      kind: "atmosphere",
      mustTokens: [pat],
      vlmQuestion: `画面气氛是否可见「${pat}」（次要，勿因背景虚化误杀）？`,
      healInject: `${pat}氛围清晰可见`,
      strengthenKey: keys.atmosphere ?? "atmosphere",
      strengthenValue: pat,
    });
  }

  if (pack.hasSeatingOrKneel && cfg.forbiddenWhenSeating) {
    const f = cfg.forbiddenWhenSeating;
    items.push({
      id: f.id,
      kind: "forbidden",
      mustTokens: f.mustTokens ?? [],
      vlmQuestion: f.vlmQuestion,
      healInject: f.healInject,
      strengthenKey: f.strengthenKey,
      strengthenValue: f.strengthenValue,
      forbidden: true,
    });
  }

  if (input.requireDualIdentity !== false && names.length >= 2 && pack.hasSeatingOrKneel) {
    items.push({
      id: "identity:dual_cref",
      kind: "identity",
      mustTokens: ["--cref", "站位绑定"],
      vlmQuestion: "画面是否为双人且高位/低位角色区分清晰（非同一人脸套用）？",
      healInject: "站位绑定必须双人区分高位与低位，禁止同一角色占双位",
      strengthenKey: keys.identity ?? "crefWeight",
      strengthenValue: "high",
    });
  }

  // Exact cast count — seating or multi-char mid shots (skip face CU — shotSize/VD 同核)
  let skipCastCard = false;
  try {
    const { resolveFaceCuFraming } =
      require("../design/detectCuCastConflict") as typeof import("../design/detectCuCastConflict");
    skipCastCard = resolveFaceCuFraming({
      shotSize: input.shotSize,
      visualDescription: input.description,
      prompt: input.description,
    }).faceCu;
  } catch {
    try {
      const { isCuShotSize } =
        require("./stillLiteraryIntentSsot") as typeof import("./stillLiteraryIntentSsot");
      skipCastCard = isCuShotSize(input.shotSize);
    } catch {
      /* optional */
    }
  }
  if (!skipCastCard && names.length >= 1 && (pack.hasSeatingOrKneel || names.length >= 2)) {
    try {
      const { buildCastCardinalityFidelityItem } = require("./stillRefSlotContract") as typeof import("./stillRefSlotContract");
      const castItem = buildCastCardinalityFidelityItem(names as string[]);
      if (castItem && !seen.has(castItem.id)) {
        seen.add(castItem.id);
        items.push({
          ...castItem,
          kind: "cast_cardinality",
        });
      }
    } catch {
      /* optional */
    }
  }

    // Declared contact loci must survive (declare-only — no invent)
  try {
    const {
      extractDeclaredContactLoci,
      extractDeclaredSpatialAnchors,
      hasContactRoleXorSatisfaction,
      auditLiteraryDetailQuality,
    } = require("./stillLiteraryDetailQuality") as typeof import("./stillLiteraryDetailQuality");
    const {
      STILL_CONTACT_GEOM_VLM_TEMPLATE,
      STILL_CONTACT_GEOM_HEAL_TEMPLATE,
      STILL_PRIMARY_LOOK_VLM_TEMPLATE,
      STILL_PRIMARY_LOOK_HEAL_TEMPLATE,
      pickVdLiteraryPrimary,
    } = require("./stillFirstFrameLiterarySsot") as typeof import("./stillFirstFrameLiterarySsot");

    const litAudit = auditLiteraryDetailQuality({
      visualDescription: desc,
      shotSize: input.shotSize,
    });
    if (litAudit.findings.some((f) => f.id === "DEX-LIT-CONTACT-XOR" && f.severity === "BLOCK")) {
      if (!seen.has("lit:contact_role_xor")) {
        seen.add("lit:contact_role_xor");
        items.push({
          id: "lit:contact_role_xor",
          kind: "composition",
          mustTokens: ["互斥", "纸未入口"],
          vlmQuestion: "图中是否避免将颊侧道具触碰与口含/咬唇混成同一含纸动作？",
          healInject: "颊触与口创互斥：纸未入口或另镜；禁含纸咬唇",
          strengthenKey: keys.composition ?? "composition",
          strengthenValue: "contact_role_xor",
        });
      }
    } else if (hasContactRoleXorSatisfaction(desc) && !seen.has("lit:contact_role_xor_ok")) {
      seen.add("lit:contact_role_xor_ok");
      items.push({
        id: "lit:contact_role_xor_ok",
        kind: "composition",
        mustTokens: [],
        vlmQuestion: "颊触与口部动作是否角色分离、未混成含纸？",
        healInject: "保持颊触与口创互斥，禁含纸咬唇",
        strengthenKey: keys.composition ?? "composition",
        strengthenValue: "xor_ok",
      });
    }
    if (/浅痕|红痕|划痕可见|渗血|血珠/.test(desc) && !seen.has("lit:wound_visible")) {
      seen.add("lit:wound_visible");
      items.push({
        id: "lit:wound_visible",
        kind: "composition",
        // L0: literary VD atom must survive into egress (design intent, not VLM-only)
        mustTokens: ["渗血", "血珠", "浅痕", "红痕"].filter((t) => desc.includes(t)).slice(0, 1),
        vlmQuestion: "图中触面浅痕/渗血是否在声明部位可见？",
        healInject: "伤痕可见度须落在声明部位，禁无痕或错位",
        strengthenKey: keys.composition ?? "composition",
        strengthenValue: "wound_visible",
      });
    }
    if (
      (() => {
        try {
          const { textHasPropInFrame, loadContactEventPolicy } =
            require("./contactEventPolicy") as typeof import("./contactEventPolicy");
          const paper = loadContactEventPolicy().vocab.propClasses.paper_doc?.aliases ?? [];
          return paper.some((a) => a && desc.includes(a)) || textHasPropInFrame(desc);
        } catch {
          return /休书|信笺|纸角|信纸|婚书/.test(desc);
        }
      })() &&
      !seen.has("lit:prop_readable")
    ) {
      seen.add("lit:prop_readable");
      items.push({
        id: "lit:prop_readable",
        kind: "composition",
        mustTokens: ["字迹", "可辨", "纸纹", "笺面", "可读", "休书", "信笺", "纸角"].filter((t) =>
          desc.includes(t),
        ).slice(0, 2),
        vlmQuestion: "图中纸类道具字迹/纹理是否可辨（非白块糊纸、非新台词）？",
        healInject: "纸面可辨：纹理/字迹清晰，禁空白糊纸",
        strengthenKey: keys.composition ?? "composition",
        strengthenValue: "prop_readable",
      });
    }

    for (const locus of extractDeclaredContactLoci(desc)) {
      const id = `contact:${locus}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const geomTouch = /划过|贴|压在|抵在/.test(desc) && desc.includes(locus);
      items.push({
        id,
        kind: "composition",
        mustTokens: [locus],
        vlmQuestion: geomTouch
          ? STILL_CONTACT_GEOM_VLM_TEMPLATE.replace(/\{LOCUS\}/g, locus)
          : `图中道具/动作接触落点是否清晰可见「${locus}」？`,
        healInject: geomTouch
          ? STILL_CONTACT_GEOM_HEAL_TEMPLATE.replace(/\{LOCUS\}/g, locus)
          : `接触落点必须落在${locus}，禁止悬浮漂移`,
        strengthenKey: keys.composition ?? "composition",
        strengthenValue: locus,
      });
      if (geomTouch) {
        const gid = `contact_geom:${locus}`;
        if (!seen.has(gid)) {
          seen.add(gid);
          items.push({
            id: gid,
            kind: "composition",
            // G2: L0 must survive mouth-ban HARD belt (tokens match compose inject)
            mustTokens: ["禁口含", "禁纸入口", `仅${locus}触`],
            vlmQuestion: STILL_CONTACT_GEOM_VLM_TEMPLATE.replace(/\{LOCUS\}/g, locus),
            healInject: `${STILL_CONTACT_GEOM_HEAL_TEMPLATE.replace(/\{LOCUS\}/g, locus)}；禁口含；禁纸入口；仅${locus}触非口含`,
            strengthenKey: keys.composition ?? "composition",
            strengthenValue: `geom_${locus}`,
          });
        }
      }
    }
    for (const anchor of extractDeclaredSpatialAnchors(desc)) {
      const id = `spatialAnchor:${anchor}`;
      if (seen.has(id) || seen.has(`contact:${anchor}`)) continue;
      seen.add(id);
      items.push({
        id,
        kind: "composition",
        mustTokens: [anchor],
        vlmQuestion: `图中空间/握持/承写落点是否清晰可见「${anchor}」？`,
        healInject: `空间落点必须落在${anchor}，禁止无方位漂移`,
        strengthenKey: keys.composition ?? "composition",
        strengthenValue: anchor,
      });
    }

    // Primary look: face-CU or multi-cast — L0 must keep look heal when compose injects it
    const primary = pickVdLiteraryPrimary(desc, input.characterNames ?? null);
    const multiCast = (input.characterNames ?? []).filter((n) => String(n ?? "").trim().length >= 2).length >= 2;
    const faceCuLook =
      /特写|近景|ecu|\bcu\b/i.test(String(input.shotSize ?? "")) ||
      (/特写|侧脸|正脸/.test(desc) && !/全景|远景|中景对峙/.test(desc));
    if (primary && (multiCast || faceCuLook) && !seen.has("identity:primary_look")) {
      seen.add("identity:primary_look");
      const lookHeal = STILL_PRIMARY_LOOK_HEAL_TEMPLATE.replace(/\{NAME\}/g, primary);
      items.push({
        id: "identity:primary_look",
        // composition (not identity-kind) so L0 checks look tokens, not --cref dual bind
        kind: "composition",
        mustTokens: faceCuLook ? ["本镜主look"] : [],
        vlmQuestion: STILL_PRIMARY_LOOK_VLM_TEMPLATE.replace(/\{NAME\}/g, primary),
        healInject: lookHeal,
        strengthenKey: keys.identity ?? "crefWeight",
        strengthenValue: "primary_look",
      });
    }
  } catch {
    /* optional */
  }

  // Single cinematic frame — VLM-only (empty mustTokens ⇒ L0 skip); detect sheet/panel leak
  if (!seen.has("identity:single_frame")) {
    seen.add("identity:single_frame");
    let singleHeal = "单镜头成片，禁四视图/拼版。";
    try {
      const { STILL_SINGLE_FRAME_LOCK_EDIT_ZH } =
        require("./stillFirstFrameLiterarySsot") as typeof import("./stillFirstFrameLiterarySsot");
      singleHeal = STILL_SINGLE_FRAME_LOCK_EDIT_ZH;
    } catch {
      /* keep short */
    }
    items.push({
      id: "identity:single_frame",
      kind: "composition",
      mustTokens: [],
      vlmQuestion:
        "画面是否为单一电影镜头画幅（非四视图/定妆拼版/多宫格/character turnaround sheet）？",
      healInject: singleHeal,
      strengthenKey: "compositionLock",
      strengthenValue: "single_frame",
    });
  }

  // Soft bg demote/drop: pixel must stay readable interior — not grey studio void
  if (input.bgPolicy && input.bgPolicy !== "keep") {
    const bgCfg = cfg.backgroundReadableWhenDemote ?? FALLBACK.backgroundReadableWhenDemote!;
    const bgId = bgCfg.id || "identity:background_readable";
    if (!seen.has(bgId)) {
      seen.add(bgId);
      items.push({
        id: bgId,
        kind: "composition",
        mustTokens: bgCfg.mustTokens ?? [],
        vlmQuestion: bgCfg.vlmQuestion,
        healInject: bgCfg.healInject,
        strengthenKey: bgCfg.strengthenKey,
        strengthenValue: bgCfg.strengthenValue,
      });
    }
  }

  // Seating shots need 场面硬约束 marker in prompt
  if (pack.hasSeatingOrKneel) {
    items.push({
      id: "marker:场面硬约束",
      kind: "seating",
      mustTokens: ["场面硬约束"],
      vlmQuestion: "（提示词层）场面硬约束是否写入？成图侧以座位姿态为准。",
      healInject: pack.hardConstraintLine ?? "场面硬约束：按描写座次与动作",
      strengthenKey: keys.seating ?? "roleLock",
      strengthenValue: "force_seating_hard_constraint",
    });
  }

  return items;
}

/** Assert prompt contains checklist tokens (who-window for role items). */
export function assertLiteraryFidelity(
  prompt: string | null | undefined,
  items: StillFidelityItem[],
): LiteraryFidelityAssertResult {
  const cfg = loadLiteraryFidelityChecklistConfig();
  const window = cfg.whoWindowChars ?? 24;
  const text = String(prompt ?? "");
  const missing: StillFidelityItem[] = [];
  const passed: StillFidelityItem[] = [];

  for (const item of items) {
    // VLM-only items (no prompt tokens) — do not fail L0
    if (!item.mustTokens.length && item.vlmQuestion) {
      passed.push(item);
      continue;
    }
    if (item.forbidden) {
      // Prompt-layer: negative ban fragment must be present for seating forbidden
      if (/禁止/.test(text) && (/香案|供桌|站立/.test(text) || /no_altar/i.test(text))) {
        passed.push(item);
      } else if (item.healInject && text.includes(item.healInject.slice(0, 6))) {
        passed.push(item);
      } else {
        missing.push(item);
      }
      continue;
    }
    if (item.kind === "cast_cardinality") {
      const nTok = item.mustTokens.find((t) => /仅\d+人/.test(t));
      const ok =
        /出镜人数/.test(text) &&
        (!nTok || text.includes(nTok) || new RegExp(nTok.replace(/仅(\d+)人/, "仅\\s*$1\\s*人")).test(text));
      if (ok) passed.push(item);
      else missing.push(item);
      continue;
    }
    if (item.kind === "identity") {
      const okCref = /--cref\s+CHAR-\S+\s+CHAR-/i.test(text) || /--cref\s+CHAR-/i.test(text);
      const okBind = /站位绑定|身份顺序/.test(text);
      if (okCref && okBind) passed.push(item);
      else missing.push(item);
      continue;
    }
    const ok =
      item.who && item.kind !== "composition" && item.kind !== "atmosphere"
        ? whoNearTokens(text, item.who, item.mustTokens, window)
        : item.mustTokens.every((t) => {
            if (!t) return true;
            if (text.includes(t)) return true;
            // Homology aliases for contact_geom L0
            if (t === "禁纸入口" && /纸未入口/.test(text)) return true;
            if (/^仅.+触$/.test(t) && /仅颊触/.test(text) && /面颊|颊/.test(t + text)) return true;
            return false;
          });
    if (ok) passed.push(item);
    else missing.push(item);
  }

  const score = items.length ? passed.length / items.length : 1;
  return {
    ok: missing.length === 0,
    missing,
    passed,
    score,
    checked: items.map((i) => i.id),
    hasSeatingOrKneel: items.some((i) => i.kind === "seating"),
  };
}

/** Map missing items → strengthen map (monotonic merge helper). */
export function strengthenFromMissing(missing: StillFidelityItem[]): Record<string, string> {
  const out: Record<string, string> = {};
  const roleBits: string[] = [];
  const props: string[] = [];
  for (const m of missing) {
    if (m.forbidden || m.strengthenKey === "negativeBan") {
      out.negativeBan = m.strengthenValue;
      continue;
    }
    if (m.strengthenKey === "roleLock") {
      roleBits.push(m.strengthenValue);
      continue;
    }
    if (m.strengthenKey === "mustProps") {
      props.push(m.strengthenValue);
      continue;
    }
    if (m.strengthenKey === "composition") {
      out.composition = [out.composition, m.strengthenValue].filter(Boolean).join(",");
      continue;
    }
    if (m.strengthenKey === "atmosphere") {
      out.atmosphere = [out.atmosphere, m.strengthenValue].filter(Boolean).join(",");
      continue;
    }
    if (m.strengthenKey === "crefWeight") {
      out.crefWeight = m.strengthenValue || "high";
      continue;
    }
    out[m.strengthenKey] = m.strengthenValue;
  }
  if (roleBits.length) out.roleLock = [...new Set(roleBits)].join(";");
  if (props.length) out.mustProps = [...new Set(props)].join(",");
  return out;
}

export function mergeStrengthenMonotonic(
  prev: Record<string, string> | null | undefined,
  next: Record<string, string>,
): Record<string, string> {
  const out = { ...(prev ?? {}) };
  for (const [k, v] of Object.entries(next)) {
    if (!v) continue;
    if (!out[k]) out[k] = v;
    else if (out[k] !== v && !out[k].includes(v)) out[k] = `${out[k]};${v}`;
  }
  return out;
}

export function formatVlmJudgePrompt(items: StillFidelityItem[], description: string): string {
  const lines = items.map(
    (it, i) =>
      `${i + 1}. id=${JSON.stringify(it.id)} forbidden=${Boolean(it.forbidden)} q=${JSON.stringify(it.vlmQuestion)}`,
  );
  return [
    "你是静照文学保真评审。只根据图像与下列清单逐项判定，禁止编造描写外情节。",
    `文学描写（唯一依据）：${description.slice(0, 800)}`,
    "对每项输出 pass=true/false、不超过40字的 evidence，以及失败项的 fixHint（中文，可执行的画面修正指令，≤30字）。",
    "对 forbidden=true 的项：若图中出现禁构图则 pass=false，fixHint 写如何去掉禁构图。",
    "不确定时 pass=false 且 unknown 语义用 evidence=uncertain（勿假装通过）。",
    '必须严格输出 JSON：{"items":[{"id":"...","pass":true,"evidence":"...","fixHint":"..."}]}',
    "清单：",
    ...lines,
  ].join("\n");
}

/** Collect fixHints from failed VLM items (for ImageEdit focus). */
export function collectFixHintsFromVlm(
  results: Array<{ id: string; pass: boolean; evidence?: string; fixHint?: string; unknown?: boolean }>,
  checklist: StillFidelityItem[],
  max = 6,
): string[] {
  const byId = new Map(checklist.map((c) => [c.id, c]));
  const out: string[] = [];
  for (const r of results) {
    if (r.pass && !r.unknown) continue;
    const hint = String(r.fixHint ?? "").trim();
    if (hint) {
      out.push(hint);
      continue;
    }
    const item = byId.get(r.id);
    if (item?.healInject) out.push(item.healInject.slice(0, 40));
    else if (r.evidence) out.push(`修正${r.id}:${r.evidence}`.slice(0, 40));
  }
  return [...new Set(out)].slice(0, max);
}

export function missingSignature(missing: StillFidelityItem[]): string {
  return missing
    .map((m) => m.id)
    .sort()
    .join("|");
}

/** Compact meta for reason JSON */
export function compactFidelityItems(
  results: Array<{ id: string; pass: boolean; evidence?: string }>,
): Array<{ id: string; pass: boolean; evidence?: string }> {
  return results.map((r) => ({
    id: r.id,
    pass: r.pass,
    ...(r.evidence ? { evidence: r.evidence.slice(0, 80) } : {}),
  }));
}
