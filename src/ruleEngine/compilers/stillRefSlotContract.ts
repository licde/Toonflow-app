/**
 * Still Reference Slot Contract — physical ref ordinal ↔ prompt 图N SSOT.
 * Covers StageA layout prepend and layout_preserve failed_still-first merge.
 */
import { readFixtureJson } from "../utils/fixturesPath";
import { loadStillIdentityDoctrine } from "./stillIdentitySsot";

export type StillRefRole = "layout" | "failed_still" | "cref" | "scene" | "other";

export interface StillPhysicalRefSlot {
  role: StillRefRole;
  /** 1-based vendor reference index */
  ordinal: number;
  code?: string;
  name?: string;
  standing?: "high" | "low" | null;
  base64?: string;
}

export interface CastCardinalityPolicy {
  emitExactCount?: boolean;
  forbidExtras?: boolean;
  mustSurvive?: boolean;
  lineTemplate?: string;
  stageAExactFigures?: boolean;
}

export interface StillRefSlotDoctrineSlice {
  refRoles?: {
    layout?: { takesFace?: boolean; ordinalPolicy?: string };
    failed_still?: { takesFace?: boolean; ordinalPolicy?: string };
    cref?: { takesFace?: boolean };
  };
  castCardinalityPolicy?: CastCardinalityPolicy;
}

const FALLBACK_CAST: CastCardinalityPolicy = {
  emitExactCount: true,
  forbidExtras: true,
  mustSurvive: true,
  lineTemplate:
    "出镜人数：仅{N}人（{NAMES}）；禁止第{Nplus1}人、路人、群像、重复分身。",
  stageAExactFigures: true,
};

const BINDING_LINE_RE = /站位绑定[：:][^。\n]{0,240}/g;
const IDENTITY_ORDER_RE = /身份顺序[：:][^。\n]{0,200}/g;
const LAYOUT_LOCK_RE = /【布局锁】[^。\n]{0,200}/g;
const CAST_CARD_RE = /出镜人数[：:][^。\n]{0,120}/g;
const TU_EQ_RE = /图(\d+)\s*[=＝]\s*([^\s，,；;（(图]+)/g;

export function loadCastCardinalityPolicy(): CastCardinalityPolicy {
  const id = loadStillIdentityDoctrine() as StillIdentityDoctrineWithSlots;
  return { ...FALLBACK_CAST, ...(id.castCardinalityPolicy ?? {}) };
}

type StillIdentityDoctrineWithSlots = ReturnType<typeof loadStillIdentityDoctrine> &
  StillRefSlotDoctrineSlice;

export function buildCastCardinalityLine(names: string[], policy?: CastCardinalityPolicy): string {
  const p = policy ?? loadCastCardinalityPolicy();
  if (p.emitExactCount === false) return "";
  const unique = [...new Set(names.map((n) => String(n ?? "").trim()).filter((n) => n.length >= 2))];
  const n = unique.length;
  if (n < 1) {
    try {
      const { buildCastLineFromCompositionSpec } = require("../qc/stillCompositionSpec") as typeof import("../qc/stillCompositionSpec");
      return buildCastLineFromCompositionSpec([]);
    } catch {
      return "";
    }
  }
  // Prefer composition spec template (Nplus1)
  try {
    const { buildCastLineFromCompositionSpec } = require("../qc/stillCompositionSpec") as typeof import("../qc/stillCompositionSpec");
    const line = buildCastLineFromCompositionSpec(unique);
    if (line) return line;
  } catch {
    /* fall through */
  }
  const tpl = p.lineTemplate ?? FALLBACK_CAST.lineTemplate!;
  return tpl
    .replace(/\{N\}/g, String(n))
    .replace(/\{Nplus1\}/g, String(n + 1))
    .replace(/\{NAMES\}/g, unique.join("、"));
}

/** StageA prompt: inject exact figure count. */
export function expandStageAPrompt(template: string, castCount: number): string {
  const p = loadCastCardinalityPolicy();
  let out = String(template ?? "")
    .replace(/\{castCount\}/g, String(Math.max(1, castCount)))
    .replace(/\{N\}/g, String(Math.max(1, castCount)));
  if (p.stageAExactFigures !== false && castCount >= 1 && !/仅\s*\d+\s*人|整幅仅/.test(out)) {
    out = `${out}。整幅仅${castCount}人剪影，禁止第${castCount + 1}人、群像、路人`;
  }
  return out.replace(/。。+/g, "。").trim();
}

export function buildPhysicalSlots(input: {
  layoutBase64?: string | null;
  failedStillBase64?: string | null;
  /** Prefer layout over failed_still when both set (StageA path). */
  preferLayout?: boolean;
  crefOrdered: Array<{ base64: string; code?: string; name?: string; standing?: "high" | "low" | null }>;
}): StillPhysicalRefSlot[] {
  const slots: StillPhysicalRefSlot[] = [];
  let ord = 1;
  const layout = input.layoutBase64?.trim();
  const failed = input.failedStillBase64?.trim();
  if (layout && (input.preferLayout !== false || !failed)) {
    slots.push({ role: "layout", ordinal: ord++, base64: layout });
  } else if (failed) {
    slots.push({ role: "failed_still", ordinal: ord++, base64: failed });
  }
  for (const c of input.crefOrdered ?? []) {
    if (!c?.base64) continue;
    slots.push({
      role: "cref",
      ordinal: ord++,
      base64: c.base64,
      code: c.code,
      name: c.name,
      standing: c.standing ?? null,
    });
  }
  return slots;
}

/**
 * Align cref slots to identity-bind order (high→low). Cap to orderedNames.length.
 * Never invent 角色N placeholders for surplus refs.
 */
export function alignCrefMetaToBindOrder(input: {
  crefs: Array<{ base64: string; code?: string; name?: string }>;
  orderedNames: string[];
  highName?: string | null;
  lowName?: string | null;
}): Array<{ base64: string; code?: string; name?: string; standing: "high" | "low" | null }> {
  const names = (input.orderedNames ?? []).map((n) => String(n ?? "").trim()).filter((n) => n.length >= 2);
  const high = String(input.highName ?? names[0] ?? "").trim();
  const low = String(input.lowName ?? names[1] ?? "").trim();
  const crefs = (input.crefs ?? []).filter((c) => c?.base64);
  const n = Math.min(crefs.length, Math.max(names.length, 0));
  const out: Array<{ base64: string; code?: string; name?: string; standing: "high" | "low" | null }> = [];
  for (let i = 0; i < n; i++) {
    const name = names[i] || crefs[i].name || "";
    if (!name) continue; // drop unnamed surplus
    let standing: "high" | "low" | null = null;
    if (high && (name === high || name.includes(high) || high.includes(name))) standing = "high";
    else if (low && (name === low || name.includes(low) || low.includes(name))) standing = "low";
    else if (i === 0 && high) standing = "high";
    else if (i === 1 && low) standing = "low";
    out.push({
      base64: crefs[i].base64,
      code: crefs[i].code,
      name,
      standing,
    });
  }
  // Ensure high/low names present even if order in names was wrong: reorder by standing
  if (high && low && out.length >= 2) {
    const hi = out.find((o) => o.standing === "high") ?? out.find((o) => o.name === high);
    const lo = out.find((o) => o.standing === "low" && o !== hi) ?? out.find((o) => o.name === low && o !== hi);
    if (hi && lo && hi !== lo) {
      const rest = out.filter((o) => o !== hi && o !== lo);
      return [
        { ...hi, standing: "high" as const, name: hi.name || high },
        { ...lo, standing: "low" as const, name: lo.name || low },
        ...rest,
      ];
    }
  }
  return out;
}

export function formatLayoutLockLine(
  anchorOrdinal = 1,
  opts?: { seatingHard?: boolean },
): string {
  if (opts?.seatingHard === true) {
    return `【布局锁】图${anchorOrdinal}为座次构图锚（只锁高低位与人数，禁止取脸、禁止加人）；脸与服装只取后续角色定妆图。`;
  }
  return `【布局锁】图${anchorOrdinal}为构图保真锚（只保人数与景别重心，禁止取脸、禁止加人）；脸与服装只取后续角色定妆图。`;
}

export function formatPhysicalBindingLines(input: {
  slots: StillPhysicalRefSlot[];
  highName?: string | null;
  lowName?: string | null;
  castNames?: string[];
  /** Only seating-hard shots may emit 站位绑定 / 座次 layout lock. */
  seatingHard?: boolean;
}): { bindingLine?: string; layoutLockLine?: string; castLine?: string; figureMap: string } {
  const seatingHard = input.seatingHard === true;
  const crefs = input.slots.filter((s) => s.role === "cref");
  const anchor = input.slots.find((s) => s.role === "layout" || s.role === "failed_still");
  const parts: string[] = [];
  if (anchor) {
    const label = seatingHard
      ? anchor.role === "layout"
        ? "座次布局锚（只锁高低位与人数，禁止取脸）"
        : "构图保真锚（只保座次，脸取后续定妆）"
      : anchor.role === "layout"
        ? "构图锚（只锁人数，禁止取脸）"
        : "构图保真锚（只保人数与景别，脸取后续定妆）";
    parts.push(`图${anchor.ordinal}=${label}`);
  }
  for (const c of crefs) {
    const name = (c.name || c.code || "").trim();
    if (!name) continue;
    const stand = seatingHard
      ? c.standing === "high"
        ? "（高位端坐）"
        : c.standing === "low"
          ? "（低位跪）"
          : ""
      : "";
    parts.push(`图${c.ordinal}=${name}${stand}`);
  }
  const figureMap = parts.join("，");

  let bindingLine: string | undefined;
  const high = String(input.highName ?? "").trim();
  const low = String(input.lowName ?? "").trim();
  const highSlot = crefs.find((c) => c.standing === "high") ?? crefs[0];
  const lowSlot = crefs.find((c) => c.standing === "low") ?? crefs[1];
  // Generic: never inject throne 站位绑定 on action / non-seating mids.
  if (
    seatingHard &&
    high &&
    low &&
    highSlot &&
    lowSlot &&
    highSlot.ordinal !== lowSlot.ordinal
  ) {
    bindingLine = `站位绑定：${high}=高位/图${highSlot.ordinal}（端坐或主位），${low}=低位/图${lowSlot.ordinal}（跪或侧位）；禁止互换脸与站位`;
  } else if (crefs.length >= 2) {
    bindingLine = `身份顺序：图${crefs[0].ordinal}=${crefs[0].name || crefs[0].code}，图${crefs[1].ordinal}=${crefs[1].name || crefs[1].code}；不同脸，禁止融成同一张脸`;
  }

  const layoutLockLine = anchor
    ? formatLayoutLockLine(anchor.ordinal, { seatingHard })
    : undefined;
  const castNames =
    input.castNames?.filter(Boolean) ??
    crefs.map((c) => c.name || "").filter((n) => n.length >= 2);
  const castLine = buildCastCardinalityLine(castNames);

  return { bindingLine, layoutLockLine, castLine, figureMap };
}

/**
 * Rewrite prompt 图N / 站位绑定 / 【布局锁】 to match physical referenceList order.
 */
export function remapPromptToPhysicalRefs(
  prompt: string,
  slots: StillPhysicalRefSlot[],
  opts?: {
    highName?: string | null;
    lowName?: string | null;
    castNames?: string[];
    seatingHard?: boolean;
  },
): string {
  if (!slots.length) return String(prompt ?? "");
  const formatted = formatPhysicalBindingLines({
    slots,
    highName: opts?.highName,
    lowName: opts?.lowName,
    castNames: opts?.castNames,
    seatingHard: opts?.seatingHard === true,
  });
  let out = String(prompt ?? "");
  out = out
    .replace(LAYOUT_LOCK_RE, " ")
    .replace(BINDING_LINE_RE, " ")
    .replace(IDENTITY_ORDER_RE, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/[。；;]{2,}/g, "。")
    .trim();

  // Drop stale 图N=角色 fragments that conflict with physical map (keep other 图N mentions soft)
  out = out.replace(TU_EQ_RE, (full, numStr, label) => {
    const n = Number(numStr);
    const slot = slots.find((s) => s.ordinal === n);
    if (!slot) return full;
    if (slot.role === "layout" || slot.role === "failed_still") {
      if (/定妆|角色|CHAR-/i.test(label) && !/布局|锚|构图/.test(label)) return "";
    }
    return full;
  });

  const tail: string[] = [];
  if (formatted.castLine && !CAST_CARD_RE.test(out)) tail.push(formatted.castLine);
  else if (formatted.castLine) {
    out = out.replace(CAST_CARD_RE, formatted.castLine);
  }
  if (formatted.bindingLine) tail.push(formatted.bindingLine);
  if (formatted.figureMap) tail.push(`参考图序：${formatted.figureMap}`);
  if (formatted.layoutLockLine) tail.push(formatted.layoutLockLine);

  out = `${out} ${tail.join(" ")}`
    .replace(/\s{2,}/g, " ")
    .replace(/[。；;]\s*[。；;]+/g, "。")
    .trim();
  return out;
}

/** True when VLM/checklist signals cast overcrowd or seat missing — forbid locking bad still. */
export function shouldForbidLayoutPreserve(input: {
  castOvercrowd?: boolean;
  seatMissing?: boolean;
  failedItemIds?: string[];
  fixHints?: string[];
  /** Turnaround/四视图 cref in play — never layout_preserve collage risk */
  turnaroundCrefUsed?: boolean;
  sheetLeak?: boolean;
}): boolean {
  if (input.castOvercrowd || input.seatMissing || input.turnaroundCrefUsed || input.sheetLeak) return true;
  const blob = [...(input.failedItemIds ?? []), ...(input.fixHints ?? [])].join(" ");
  return /cast_cardinality|出镜人数|第三人|超员|群像|路人过多|多于\s*\d+\s*人|太师椅|蒲团|无座|缺座|seatMissing|furniture|still_cu_cast|特写.*仅\s*[2-9]|CU×|拼版|四视|single_frame|turnaround|character.?sheet|四宫格/i.test(
    blob,
  );
}

/**
 * Face-CU 智能适配：按设计意图（VD 主角）裁 cref，禁全家定妆误绑反应特写.
 * Homology with expandStillCuCast primary cast slice.
 */
export function adaptCrefsToFaceCuIntent(input: {
  crefs: Array<{ base64: string; code?: string; name?: string }>;
  castNames?: string[] | null;
  shotSize?: string | null;
  visualDescription?: string | null;
  literaryPrompt?: string | null;
}): {
  crefs: Array<{ base64: string; code?: string; name?: string }>;
  castNames: string[];
  primaryName: string;
  adapted: boolean;
  reason?: string;
} {
  const crefs = (input.crefs ?? []).filter((c) => c?.base64);
  const names = (input.castNames ?? []).map((n) => String(n ?? "").trim()).filter((n) => n.length >= 2);
  let faceCu = false;
  try {
    const { resolveFaceCuFraming, pickPrimaryReactionName } =
      require("../design/detectCuCastConflict") as typeof import("../design/detectCuCastConflict");
    const fr = resolveFaceCuFraming({
      shotSize: input.shotSize,
      visualDescription: input.visualDescription || input.literaryPrompt,
      prompt: input.literaryPrompt,
    });
    faceCu = fr.faceCu;
    if (!faceCu || crefs.length <= 1) {
      return { crefs, castNames: names, primaryName: names[0] || "", adapted: false };
    }
    const primary =
      pickPrimaryReactionName(names.length ? names : crefs.map((c) => c.name || "").filter(Boolean), input.visualDescription || input.literaryPrompt) ||
      names[0] ||
      "";
    if (!primary) {
      return { crefs, castNames: names, primaryName: "", adapted: false, reason: "no_primary" };
    }
    const match = (label: string) => {
      const a = label.trim();
      return a && (a === primary || a.includes(primary) || primary.includes(a));
    };
    let kept = crefs.filter((c) => match(String(c.name ?? "")) || match(String(c.code ?? "").replace(/^CHAR-/i, "")));
    if (!kept.length && names.length) {
      // crefs often lack name — align by castNames index (设计意图位次)
      const idx = names.findIndex((n) => match(n));
      if (idx >= 0 && crefs[idx]) kept = [{ ...crefs[idx], name: primary }];
      else kept = crefs.slice(0, 1).map((c) => ({ ...c, name: primary }));
    }
    if (!kept.length) {
      return {
        crefs: crefs.slice(0, 1),
        castNames: primary ? [primary] : names.slice(0, 1),
        primaryName: primary,
        adapted: true,
        reason: "cref_name_miss_cap1",
      };
    }
    return {
      crefs: kept.slice(0, 1).map((c) => ({ ...c, name: c.name || primary })),
      castNames: [primary],
      primaryName: primary,
      adapted: kept.length < crefs.length || names.length > 1,
      reason: "face_cu_primary_only",
    };
  } catch {
    return { crefs, castNames: names, primaryName: names[0] || "", adapted: false };
  }
}

/** Strip leaked full-cast「出镜人数：仅N人」(N≥2) from face-CU literary body. */
export function stripCastCardinalityLeakForFaceCu(prompt: string): string {
  return String(prompt ?? "")
    .replace(/出镜人数[：:]\s*仅\s*[2-9]\d*\s*人[^。\n]{0,120}[。\n]?/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[。；;]{2,}/g, "。")
    .trim();
}

export function buildCastCardinalityFidelityItem(names: string[]): {
  id: string;
  kind: "identity";
  mustTokens: string[];
  vlmQuestion: string;
  healInject: string;
  strengthenKey: string;
  strengthenValue: string;
} | null {
  const unique = [...new Set(names.map((n) => String(n ?? "").trim()).filter((n) => n.length >= 2))];
  if (unique.length < 1) return null;
  const n = unique.length;
  const line = buildCastCardinalityLine(unique);
  return {
    id: "identity:cast_cardinality",
    kind: "identity",
    mustTokens: ["出镜人数", `仅${n}人`],
    vlmQuestion: `画面中可辨认人物是否恰好为${n}人（${unique.join("、")}），且没有第三人/路人/群像？（必须恰好${n}人）`,
    healInject: line || `出镜人数：仅${n}人；禁止第三人、路人、群像`,
    strengthenKey: "castLock",
    strengthenValue: `exact_${n}`,
  };
}

/** Test helper — load doctrine slice from identity fixture if present. */
export function readRefSlotDoctrineSlice(): StillRefSlotDoctrineSlice {
  return readFixtureJson<StillRefSlotDoctrineSlice>("still_identity_doctrine.json", {});
}

/**
 * Event-shot refs SSOT bridge (identity → propSoft → softEnv).
 * Cap≤2 keeps propSoft over softEnv — see eventPlateReadiness.applyEventRefSlotBudget.
 */
export {
  applyEventRefSlotBudget,
  buildEventRefOrdinalBinding,
  assertEventRefContract,
  type EventRefRole,
} from "./eventPlateReadiness";
