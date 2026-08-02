/**
 * Still literary intent SSOT — Content contract vs Recipe.
 * mustSurvive + egress base + collision strip; doctrine-driven (no invent).
 */
import { readFixtureJson } from "../utils/fixturesPath";
import { extractDescPredicates, type DescPredicatePack } from "./extractDescPredicates";
import {
  buildLiteraryFidelityChecklist,
  assertLiteraryFidelity,
  type StillFidelityItem,
  type FidelityKind,
} from "./literaryFidelityChecklist";

export type LiteraryIntentDoctrine = {
  version?: string;
  seatingSignals?: string[];
  /** Common mid action beats — StageA off; not seatingHard. */
  actionPrimarySignals?: string[];
  midWideShotSizes?: string[];
  handCuExplicit?: string[];
  cuShotSizes?: string[];
  healPriority?: FidelityKind[];
  intentClasses?: string[];
  intentPolicyMatrix?: Record<
    string,
    {
      dirtyHandEye?: boolean;
      allowFaceRecipe?: boolean;
      twoStageLayout?: boolean;
      primaryNextOnWeakStill?: "batch_still" | "chat_repair";
      recipeMode?: string;
    }
  >;
  coverageBoundary?: string;
  collisionMatrix?: Record<
    string,
    { forbidWhenKinds?: string[]; forbidWhenSignals?: string[]; stripPatterns?: string[] }
  >;
  editBasePolicy?: {
    requireFullVd?: boolean;
    requireFullHardConstraints?: boolean;
    requireBinding?: boolean;
    focusAppendOnly?: boolean;
    truncateOrder?: string[];
  };
  atmosphereIsContentWhenInVd?: boolean;
  picturePadsAtmosphereOnly?: boolean;
  maxEditHints?: number;
};

/** Shot-size / place / soft-atmosphere must never legislate seatingHard. */
const NEVER_SEATING_SIGNAL =
  /^(?:中景|全景|远景|大远景|近景|特写|大特|祠堂|说教|俯视|低头隐忍|wide|medium|ms|ws|fs|cu|ecu)$/i;

const FALLBACK: LiteraryIntentDoctrine = {
  version: "1.1.0",
  seatingSignals: [
    "权力反差",
    "端坐",
    "跪于",
    "跪低位",
    "蒲团",
    "太师椅",
    "站位绑定",
    "高坐",
    "低跪",
    "高位",
    "低位",
    "居高临下",
  ],
  actionPrimarySignals: [
    "弯腰",
    "捡",
    "捏",
    "指节",
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
  ],
  midWideShotSizes: ["中景", "全景", "远景", "wide", "medium", "ms", "ws"],
  handCuExplicit: ["手部特写", "手部特", "扳指特写", "指尖特写", "手腕特写"],
  cuShotSizes: ["特写", "大特", "大特写", "ecu", "cu"],
  healPriority: ["seating", "cast_cardinality", "role_action", "prop", "composition", "atmosphere"],
  collisionMatrix: {
    hand_cu: {
      forbidWhenKinds: ["seating"],
      forbidWhenSignals: ["权力反差", "端坐", "蒲团", "太师椅", "站位绑定"],
      stripPatterns: [
        "本镜只出手与道具细节[^。；;]*",
        "禁止同帧出人像头面部抢戏[^。；;]*",
        "锁定角色定妆手部/袖口/配饰纹理参考[^。；;]*",
      ],
    },
  },
  atmosphereIsContentWhenInVd: true,
  picturePadsAtmosphereOnly: true,
  maxEditHints: 8,
};

let cached: LiteraryIntentDoctrine | null = null;

export function loadLiteraryIntentDoctrine(): LiteraryIntentDoctrine {
  if (cached) return cached;
  cached = { ...FALLBACK, ...readFixtureJson<Partial<LiteraryIntentDoctrine>>("still_literary_intent_doctrine.json", {}) };
  return cached;
}

/** Test helper */
export function resetLiteraryIntentDoctrineCache(): void {
  cached = null;
}

export function hasSeatingOrPowerSignals(text: string, doctrine?: LiteraryIntentDoctrine): boolean {
  const d = doctrine ?? loadLiteraryIntentDoctrine();
  const t = String(text ?? "");
  return (d.seatingSignals ?? []).some((s) => {
    if (!s || NEVER_SEATING_SIGNAL.test(s)) return false;
    return t.includes(s);
  });
}

/** Furniture / kneel / dual-power — true StageA seatingHard (not bare atmosphere). */
export function hasSeatingHardFurniture(text: string): boolean {
  const t = String(text ?? "");
  return (
    /端坐|太师椅|蒲团|跪|高坐|低跪|权力反差|站位绑定/.test(t) ||
    (/高位/.test(t) && /低位/.test(t))
  );
}

export function hasActionPrimarySignals(text: string, doctrine?: LiteraryIntentDoctrine): boolean {
  // Delegate to VD-declare extract SSOT (seed + novel script verbs)
  try {
    const { hasActionPrimarySignals: hit } =
      require("./stillActionPrimarySsot") as typeof import("./stillActionPrimarySsot");
    return hit(text, doctrine);
  } catch {
    const d = doctrine ?? loadLiteraryIntentDoctrine();
    const t = String(text ?? "");
    const list = d.actionPrimarySignals ?? FALLBACK.actionPrimarySignals ?? [];
    return list.some((s) => s && t.includes(s));
  }
}

/** Lazy re-exports — avoid circular init with stillActionPrimarySsot. */
export function extractVdDeclaredActionVerbs(
  text?: string | null,
  opts?: { castNames?: string[] | null; doctrine?: LiteraryIntentDoctrine },
): string[] {
  const m = require("./stillActionPrimarySsot") as typeof import("./stillActionPrimarySsot");
  return m.extractVdDeclaredActionVerbs(text, opts);
}

export function resolveActionPrimaryHit(
  input: Parameters<typeof import("./stillActionPrimarySsot").resolveActionPrimaryHit>[0],
): import("./stillActionPrimarySsot").ActionPrimaryHit {
  const m = require("./stillActionPrimarySsot") as typeof import("./stillActionPrimarySsot");
  return m.resolveActionPrimaryHit(input);
}

export type { ActionPrimaryHit } from "./stillActionPrimarySsot";

/**
 * Production seatingHard: predicates OR hard furniture OR power seating signals.
 * Action verbs do NOT clear seating when 居高临下/权力反差 etc. are declared.
 */
export function resolveSeatingHardForProduction(input: {
  text?: string | null;
  hasSeatingOrKneelPack?: boolean;
  doctrine?: LiteraryIntentDoctrine;
}): boolean {
  const t = String(input.text ?? "");
  if (input.hasSeatingOrKneelPack) return true;
  if (hasSeatingHardFurniture(t)) return true;
  return hasSeatingOrPowerSignals(t, input.doctrine);
}

export function isMidWideShotSize(shotSize: string | null | undefined, doctrine?: LiteraryIntentDoctrine): boolean {
  const d = doctrine ?? loadLiteraryIntentDoctrine();
  const s = String(shotSize ?? "").toLowerCase();
  if (!s) return false;
  return (d.midWideShotSizes ?? []).some((p) => {
    const re = new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    return re.test(s) || s.includes(String(p).toLowerCase());
  });
}

export function hasExplicitHandCuMark(text: string, doctrine?: LiteraryIntentDoctrine): boolean {
  const d = doctrine ?? loadLiteraryIntentDoctrine();
  const t = String(text ?? "");
  return (d.handCuExplicit ?? []).some((s) => s && t.includes(s));
}

export function isCuShotSize(shotSize: string | null | undefined, doctrine?: LiteraryIntentDoctrine): boolean {
  const d = doctrine ?? loadLiteraryIntentDoctrine();
  const s = String(shotSize ?? "").toLowerCase();
  if (!s) return false;
  return (d.cuShotSizes ?? []).some((p) => new RegExp(p, "i").test(s));
}

export type MustSurviveResult = {
  items: StillFidelityItem[];
  tokens: string[];
  pack: DescPredicatePack;
  hasSeatingOrKneel: boolean;
  ok: boolean;
  missing: StillFidelityItem[];
};

/**
 * Content-contract atoms from VD (declare-only predicates + composition/atmosphere in VD).
 * picture may pad atmosphere patterns only when doctrine.picturePadsAtmosphereOnly.
 */
export function buildMustSurvive(input: {
  visualDescription?: string | null;
  picture?: string | null;
  characterNames?: string[] | null;
  /** When checking a prompt body */
  prompt?: string | null;
  shotSize?: string | null;
}): MustSurviveResult {
  const doctrine = loadLiteraryIntentDoctrine();
  const vd = String(input.visualDescription ?? "").trim();
  const picture = String(input.picture ?? "").trim();
  const names = (input.characterNames ?? []).filter(Boolean) as string[];
  // Atmosphere always treated as content when present in VD (doctrine)
  const descForChecklist = vd;
  const items = buildLiteraryFidelityChecklist({
    description: descForChecklist,
    characterNames: names,
    shotSize: input.shotSize,
    requireDualIdentity: false,
    // Keep atmosphere from VD even if caller would demote bg elsewhere
    bgPolicy: doctrine.atmosphereIsContentWhenInVd ? "keep" : undefined,
  });
  // Optional: picture pads atmosphere-only tokens already in checklist patterns via merging picture into desc scan
  if (doctrine.picturePadsAtmosphereOnly && picture && vd) {
    const padItems = buildLiteraryFidelityChecklist({
      description: `${vd}\n${picture}`,
      characterNames: names,
      shotSize: input.shotSize,
      bgPolicy: "keep",
    });
    const seen = new Set(items.map((i) => i.id));
    for (const it of padItems) {
      if (it.kind === "atmosphere" && !seen.has(it.id)) {
        items.push(it);
        seen.add(it.id);
      }
    }
  }
  // XOR / wound / propReadable declared atoms must survive compose
  try {
    const { hasContactRoleXorSatisfaction, auditLiteraryDetailQuality } =
      require("./stillLiteraryDetailQuality") as typeof import("./stillLiteraryDetailQuality");
    const audit = auditLiteraryDetailQuality({
      visualDescription: vd,
      shotSize: input.shotSize,
    });
    const seen = new Set(items.map((i) => i.id));
    if (audit.findings.some((f) => f.id === "DEX-LIT-CONTACT-XOR") && !seen.has("lit:contact_role_xor")) {
      items.push({
        id: "lit:contact_role_xor",
        kind: "composition",
        mustTokens: hasContactRoleXorSatisfaction(vd) ? ["纸未入口"] : ["互斥", "纸未入口"],
        vlmQuestion: "颊触与口创是否互斥、未混成含纸？",
        healInject: "颊触与口创互斥：纸未入口或另镜",
        strengthenKey: "composition",
        strengthenValue: "contact_role_xor",
      });
      seen.add("lit:contact_role_xor");
    }
    if (/浅痕|红痕|划痕可见|渗血|血珠/.test(vd) && !seen.has("lit:wound_visible")) {
      const bendWins =
        /弯腰|捡起|捡拾|俯身捡/.test(vd) ||
        (() => {
          try {
            const { resolvePoseOccupancy } =
              require("./designIntentProfile") as typeof import("./designIntentProfile");
            return resolvePoseOccupancy(vd) === "bend_pickup";
          } catch {
            return false;
          }
        })();
      items.push({
        id: "lit:wound_visible",
        kind: "composition",
        mustTokens: bendWins
          ? []
          : ["渗血", "血珠", "浅痕", "红痕"].filter((t) => vd.includes(t)).slice(0, 1),
        vlmQuestion: "触面浅痕/渗血是否可见？",
        healInject: bendWins
          ? "细节：面颊浅痕可辨（非颊触立法）"
          : "伤痕可见度须落在声明部位",
        strengthenKey: "composition",
        strengthenValue: "wound_visible",
        soft: bendWins,
      });
      seen.add("lit:wound_visible");
    }
    if (/字迹|可辨|可读|笺面|纸纹|休书|婚书|信笺|信纸|纸角|书信/.test(vd) && !seen.has("lit:prop_readable")) {
      const paperHit = /休书|婚书|信笺|信纸|纸角|书信|纸/.test(vd);
      const readableHit = /字迹|可辨|可读|笺面|纸纹/.test(vd);
      if (paperHit || readableHit) {
        items.push({
          id: "lit:prop_readable",
          kind: "composition",
          mustTokens: ["字迹", "可辨", "纸纹", "笺面", "可读", "休书", "信笺"].filter((t) => vd.includes(t)).slice(0, 2),
          vlmQuestion: "纸面字迹/纹理是否可辨（非白块糊纸）？",
          healInject: "纸面可辨：纹理/字迹清晰，禁空白糊纸",
          strengthenKey: "composition",
          strengthenValue: "prop_readable",
        });
        seen.add("lit:prop_readable");
      }
    }
  } catch {
    /* optional */
  }
  const pack = extractDescPredicates({ description: vd, characterNames: names });
  const tokens = [
    ...new Set([
      ...items.flatMap((i) => i.mustTokens),
      ...pack.mustAppear,
      ...(pack.hasSeatingOrKneel ? ["场面硬约束"] : []),
    ]),
  ].filter(Boolean);
  const prompt = String(input.prompt ?? "");
  if (!prompt) {
    return {
      items,
      tokens,
      pack,
      hasSeatingOrKneel: pack.hasSeatingOrKneel,
      ok: items.length === 0,
      missing: items,
    };
  }
  const asserted = assertLiteraryFidelity(prompt, items);
  return {
    items,
    tokens,
    pack,
    hasSeatingOrKneel: pack.hasSeatingOrKneel || asserted.hasSeatingOrKneel,
    ok: asserted.ok,
    missing: asserted.missing,
  };
}

export function sortHealInjects(missing: StillFidelityItem[], maxHints?: number): string[] {
  const doctrine = loadLiteraryIntentDoctrine();
  const order = doctrine.healPriority ?? FALLBACK.healPriority!;
  const rank = (k: string) => {
    const i = order.indexOf(k as FidelityKind);
    return i < 0 ? 99 : i;
  };
  const sorted = [...missing].sort((a, b) => rank(a.kind) - rank(b.kind));
  const max = maxHints ?? doctrine.maxEditHints ?? 8;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of sorted) {
    const h = String(m.healInject ?? "").trim();
    if (!h || seen.has(h)) continue;
    seen.add(h);
    out.push(h);
    if (out.length >= max) break;
  }
  return out;
}

/** Strip recipe lines that collide with content-contract seating / face mid-shots. */
export function stripCollidingRecipeLayers(
  body: string,
  opts?: { hasSeating?: boolean; mode?: string },
): { cleaned: string; stripped: string[] } {
  const doctrine = loadLiteraryIntentDoctrine();
  let cleaned = String(body ?? "");
  const stripped: string[] = [];
  const seating = opts?.hasSeating || hasSeatingOrPowerSignals(cleaned, doctrine);
  if (!seating && opts?.mode !== "hand_cu") {
    // Still strip if seating signals appear in body
    if (!hasSeatingOrPowerSignals(cleaned, doctrine)) return { cleaned, stripped };
  }
  const matrix = doctrine.collisionMatrix?.hand_cu;
  for (const pat of matrix?.stripPatterns ?? []) {
    const re = new RegExp(pat, "g");
    if (re.test(cleaned)) {
      stripped.push(pat);
      cleaned = cleaned.replace(re, " ");
    }
  }
  cleaned = cleaned
    .replace(/[。；;]{2,}/g, "。")
    .replace(/\s{2,}/g, " ")
    .replace(/^[。；;\s]+|[。；;\s]+$/g, "")
    .trim();
  return { cleaned, stripped };
}

/**
 * Literary egress base for first-gen + Edit — VD + hard constraints + binding; truncate recipe first.
 */
export function buildLiteraryEgressBase(input: {
  visualDescription?: string | null;
  fullPrompt?: string | null;
  characterNames?: string[] | null;
  maxChars?: number;
}): { base: string; hardConstraintLine?: string; bindingLine?: string; truncated: boolean } {
  const vd = String(input.visualDescription ?? "").trim();
  const full = String(input.fullPrompt ?? "");
  const names = (input.characterNames ?? []).filter(Boolean) as string[];
  const pack = extractDescPredicates({ description: vd || full, characterNames: names });
  const hard =
    pack.hardConstraintLine ||
    full.match(/场面硬约束[：:][^。\n]{0,400}/)?.[0] ||
    undefined;
  const binding = full.match(/站位绑定[：:][^。\n]{0,200}/)?.[0] || undefined;
  const castCard = full.match(/出镜人数[：:][^。\n]{0,120}/)?.[0] || undefined;
  const propInFrame =
    full.match(/道具入画[：:][^。\n]{0,160}/)?.[0] ||
    undefined;
  const neg = pack.negativeBanLine;
  const parts = [vd];
  if (hard && !vd.includes("场面硬约束")) parts.push(hard);
  if (neg && !parts.join("").includes(neg.slice(0, 12))) parts.push(neg);
  if (binding && !parts.join("").includes("站位绑定")) parts.push(binding);
  if (castCard && !parts.join("").includes("出镜人数")) parts.push(castCard);
  // contact_prop_vs_face_identity: keep prop positive on Edit egress (never silent-drop)
  if (propInFrame && !parts.join("").includes("道具入画")) parts.push(propInFrame);
  else {
    try {
      const { resolveContactPropVsFaceIdentity } =
        require("../design/litEnhanceRecipeCollision") as typeof import("../design/litEnhanceRecipeCollision");
      const col = resolveContactPropVsFaceIdentity({
        visualDescription: vd,
        recipeMode: "face_or_scene",
        sources: ["refs.identityLock"],
        descJoined: parts.join("。"),
      });
      if (col.appendPropLine) parts.push(col.appendPropLine);
    } catch {
      /* optional */
    }
  }
  // Pull composition declare from full if seating
  const comp = full.match(/构图：[^。\n]{0,80}/)?.[0];
  if (comp && pack.hasSeatingOrKneel && !parts.join("").includes("构图：")) parts.push(comp);

  let base = parts.filter(Boolean).join("。").replace(/。。+/g, "。").trim();
  // Strip colliding hand-cu recipe if seating leaked into full-derived slices
  base = stripCollidingRecipeLayers(base, { hasSeating: pack.hasSeatingOrKneel }).cleaned;

  const max = input.maxChars ?? 2000;
  let truncated = false;
  if (base.length > max) {
    // Prefer keep VD + hard; drop optional composition last
    const core = [vd, hard, neg, binding, castCard].filter(Boolean).join("。").replace(/。。+/g, "。").trim();
    base = core.length <= max ? core : core.slice(0, max);
    truncated = true;
  }
  return { base, hardConstraintLine: hard, bindingLine: binding, truncated };
}

export function assertPromptSurvivesIntent(input: {
  visualDescription?: string | null;
  prompt?: string | null;
  characterNames?: string[] | null;
}): MustSurviveResult {
  return buildMustSurvive({
    visualDescription: input.visualDescription,
    prompt: input.prompt,
    characterNames: input.characterNames,
  });
}
