/**
 * Literary VD enhance fill — structure whitelist; drift refuse; import soft-fill gated.
 * suggestFill ≡ apply_auto_enhance template library (single source).
 */
import {
  auditLiteraryDetailQuality,
  detectLiteraryDrift,
  deriveWoundVisibleAppend,
  getEnhancementAutoMin,
  getEnhancementFillPolicy,
  isLiteraryDetailLlmFillEnabled,
} from "../compilers/stillLiteraryDetailQuality";
import { isLitEnhanceWriteEnabled } from "./litEnhancePolicy";

export type LitFillSuggest = {
  shotIndex: number;
  missingSlots: string[];
  /** Template hint only — not auto-applied literary invent */
  suggestedAppend: string;
  currentVd: string;
  confidence: number;
  blockedReason?: string;
};

const SLOT_HINTS: Array<{ re: RegExp; hint: string }> = [
  { re: /propInFrame|contactGeom/i, hint: "（道具入画：须可见〔道具〕与〔部位〕贴合/划过，禁止仅浅痕无道具）" },
  { re: /contactRoleXor/i, hint: "（互斥：纸未入口；或另镜拆颊触与口创）" },
  { re: /woundVisible/i, hint: "（可见度：面颊浅痕可见）" },
  { re: /propReadable/i, hint: "（纸面可辨：笺面字迹可读）" },
  { re: /contact/i, hint: "（补接触落点：…划过/贴在〔部位〕）" },
  { re: /ground|path/i, hint: "（补空间锚：从〔地面/脚边〕…）" },
  { re: /grip|spatial/i, hint: "（补握持：手持…贴在胸前）" },
  { re: /threshold/i, hint: "（补门槛：在门口…）" },
  { re: /surface/i, hint: "（补承写面：案上/纸上…）" },
  { re: /pour/i, hint: "（补泼洒承受点：…脸上/地上）" },
  { re: /propCarry|propState|propSource/i, hint: "（补道具去向：仍持/放下/撕毁）" },
];

/** Shared template library for suggestFill + apply_auto_enhance. */
export function buildEnhanceAppendForMissingSlots(
  missing: string[],
  vd?: string,
  opts?: { intentVisualEnhance?: boolean },
): string {
  const hints: string[] = [];
  const seen = new Set<string>();
  const vdText = String(vd ?? "");
  for (const m of missing) {
    if (/propInFrame|contactGeom/i.test(m) && !seen.has("propInFrame")) {
      try {
        const { matchContactEventVd } =
          require("../compilers/contactEventPolicy") as typeof import("../compilers/contactEventPolicy");
        const cm = matchContactEventVd(vdText);
        const prop = cm.propCanonical || cm.propAlias || "纸角";
        const locus = cm.locus || "面颊";
        const hint = `（道具入画：须可见${prop}与${locus}贴合/划过，禁止仅浅痕无${prop}）`;
        seen.add("propInFrame");
        hints.push(hint);
        continue;
      } catch {
        /* fall through to SLOT_HINTS */
      }
    }
    for (const row of SLOT_HINTS) {
      if (row.re.test(m) && !seen.has(row.hint)) {
        seen.add(row.hint);
        hints.push(row.hint);
      }
    }
  }
  if (opts?.intentVisualEnhance !== false && !missing.includes("woundVisible")) {
    const w = deriveWoundVisibleAppend({
      visualDescription: vd,
      intentVisualEnhance: opts?.intentVisualEnhance,
    });
    if (w.needed && w.append && !hints.some((h) => h.includes(w.append))) {
      hints.push(`（${w.append}）`);
    }
  }
  return hints.join("");
}

function importSoftFillAllowed(importTrack?: boolean): boolean {
  if (!importTrack) return true;
  const pol = getEnhancementFillPolicy();
  return Boolean(pol.allowImportStructureSoftFill);
}

function plotOrFxProse(append: string): boolean {
  const pol = getEnhancementFillPolicy();
  if (pol.forbidPlotProse !== false && /忽然|原来|其实|因为|所以|心想|暗道/.test(append)) return true;
  if (pol.forbidFxInvent !== false && /爆炸|火光冲天|万丈金光|特效大爆发/.test(append)) return true;
  return false;
}

/** Build declare-constrained append hints from missingSlots. */
export function buildLitFillSuggestions(input: {
  shots: Record<string, unknown>[];
  shotIndex?: number;
  literaryDetailLlmFill?: boolean;
  intentVisualEnhance?: boolean;
  chatStrict?: boolean;
  literaryLocked?: boolean;
  importTrack?: boolean;
  confidence?: number;
  meta?: Record<string, unknown> | null;
}): { ok: boolean; enabled: boolean; suggestions: LitFillSuggest[]; refuse?: string; autoMin?: number } {
  const autoMin = getEnhancementAutoMin();
  if (!isLitEnhanceWriteEnabled(input.meta ?? null) && input.literaryDetailLlmFill !== true && input.intentVisualEnhance !== true) {
    // pillarsLitEnhanceV1=off → refuse unless explicit flag
    if (String((input.meta as { pillarsLitEnhanceV1?: string } | null)?.pillarsLitEnhanceV1 ?? "") === "off") {
      return { ok: true, enabled: false, suggestions: [], refuse: "pillars_off", autoMin };
    }
  }
  if (input.importTrack && !importSoftFillAllowed(true)) {
    return {
      ok: false,
      enabled: false,
      suggestions: [],
      refuse: "import_diagnose_only",
      autoMin,
    };
  }
  const enabled =
    isLiteraryDetailLlmFillEnabled({ literaryDetailLlmFill: input.literaryDetailLlmFill }) ||
    Boolean(getEnhancementFillPolicy().enabledByDefault) ||
    input.intentVisualEnhance === true;
  if (!enabled && !input.literaryDetailLlmFill && input.intentVisualEnhance !== true) {
    // Still allow structure suggest when flag literaryDetailLlmFill explicitly false? No — keep off
    if (input.literaryDetailLlmFill === false && input.intentVisualEnhance !== true) {
      return { ok: true, enabled: false, suggestions: [], refuse: "flag_off", autoMin };
    }
  }
  const fillEnabled =
    input.literaryDetailLlmFill === true ||
    input.intentVisualEnhance === true ||
    isLiteraryDetailLlmFillEnabled({ literaryDetailLlmFill: input.literaryDetailLlmFill });
  if (!fillEnabled) {
    return { ok: true, enabled: false, suggestions: [], refuse: "flag_off", autoMin };
  }

  const conf = input.confidence ?? (input.chatStrict ? 0.4 : 0.75);
  const shots = input.shots.filter((s) =>
    input.shotIndex == null ? true : Number(s.shotIndex) === input.shotIndex,
  );
  const suggestions: LitFillSuggest[] = [];
  const allowed = new Set(getEnhancementFillPolicy().allowedSlots ?? []);

  for (const s of shots) {
    const vd = String(s.visualDescription ?? "").trim();
    const idx = Number(s.shotIndex) || 0;
    const audit = auditLiteraryDetailQuality({
      visualDescription: vd,
      shotSize: String(s.shotSize ?? ""),
      spatialRelation: String(
        (s.narrative as { spatialRelation?: string } | undefined)?.spatialRelation ?? "",
      ),
    });
    let missing = [
      ...new Set(audit.findings.flatMap((f) => f.missingSlots ?? f.missing ?? [])),
    ];
    if (allowed.size) missing = missing.filter((m) => allowed.has(m) || /contact|grip|ground|path|surface|threshold|xor|wound|prop/i.test(m));
    const wound = deriveWoundVisibleAppend({
      visualDescription: vd,
      intentVisualEnhance: input.intentVisualEnhance,
    });
    if (wound.needed) missing = [...new Set([...missing, "woundVisible"])];
    if (!missing.length) continue;
    const suggestedAppend = buildEnhanceAppendForMissingSlots(missing, vd, {
      intentVisualEnhance: input.intentVisualEnhance,
    });
    suggestions.push({
      shotIndex: idx,
      missingSlots: missing,
      suggestedAppend,
      currentVd: vd,
      confidence: conf,
      blockedReason:
        input.chatStrict || input.literaryLocked
          ? input.literaryLocked
            ? "literaryLocked_suggest_only"
            : "chatStrict_suggest_only"
          : conf < autoMin
            ? "below_autoMin_confirm"
            : undefined,
    });
  }
  return { ok: true, enabled: true, suggestions, autoMin };
}

/**
 * Apply enhance append — Confirm/force or autoMin; drift refuse; re-assert slots.
 */
export function applyLitFillToShots(input: {
  shots: Record<string, unknown>[];
  fills: Array<{ shotIndex: number; append: string }>;
  chatStrict?: boolean;
  literaryLocked?: boolean;
  forceApply?: boolean;
  literaryDetailLlmFill?: boolean;
  intentVisualEnhance?: boolean;
  importTrack?: boolean;
  confidence?: number;
  knownCast?: string[] | null;
  meta?: Record<string, unknown> | null;
}): {
  ok: boolean;
  shots: Record<string, unknown>[];
  applied: number[];
  refused: string[];
  demoted?: boolean;
} {
  const autoMin = getEnhancementAutoMin();
  const conf = input.confidence ?? (input.forceApply ? 1 : input.chatStrict ? 0.4 : 0.75);

  if (
    !isLitEnhanceWriteEnabled(input.meta ?? null) &&
    input.literaryDetailLlmFill !== true &&
    input.intentVisualEnhance !== true
  ) {
    if (String(input.meta?.pillarsLitEnhanceV1 ?? "") === "off") {
      return { ok: false, shots: input.shots, applied: [], refused: ["pillars_off"] };
    }
  }

  if (input.importTrack && !importSoftFillAllowed(true)) {
    return { ok: false, shots: input.shots, applied: [], refused: ["import_diagnose_only"], demoted: true };
  }

  const fillEnabled =
    input.literaryDetailLlmFill === true ||
    input.intentVisualEnhance === true ||
    isLiteraryDetailLlmFillEnabled({ literaryDetailLlmFill: input.literaryDetailLlmFill });
  if (!fillEnabled) {
    return { ok: false, shots: input.shots, applied: [], refused: ["flag_off"] };
  }
  if ((input.chatStrict || input.literaryLocked) && !input.forceApply) {
    return {
      ok: false,
      shots: input.shots,
      applied: [],
      refused: [input.literaryLocked ? "literaryLocked" : "chatStrict"],
    };
  }
  if (!input.forceApply && conf < autoMin) {
    return { ok: false, shots: input.shots, applied: [], refused: ["below_autoMin"] };
  }

  const shots = input.shots.map((s) => ({ ...s }));
  const applied: number[] = [];
  const refused: string[] = [];

  for (const fill of input.fills) {
    const append = String(fill.append ?? "").trim();
    if (!append || append.length < 2) {
      refused.push(`empty:${fill.shotIndex}`);
      continue;
    }
    if (plotOrFxProse(append)) {
      refused.push(`plot_or_fx:${fill.shotIndex}`);
      continue;
    }
    const i = shots.findIndex((s) => Number(s.shotIndex) === fill.shotIndex);
    if (i < 0) {
      refused.push(`missing_shot:${fill.shotIndex}`);
      continue;
    }
    const prev = String(shots[i]!.visualDescription ?? "").trim();
    const next = `${prev}${/。$/.test(prev) ? "" : "。"}${append}`.replace(/。。+/g, "。");

    const drift = detectLiteraryDrift({
      beforeVd: prev,
      afterVd: next,
      literaryLocked: input.literaryLocked,
      force: input.forceApply,
      knownCast: input.knownCast,
    });
    if (!drift.ok) {
      refused.push(`drift:${drift.findings[0]?.kind ?? "unknown"}:${fill.shotIndex}`);
      continue;
    }

    const re = auditLiteraryDetailQuality({
      visualDescription: next,
      shotSize: String(shots[i]!.shotSize ?? ""),
    });
    const stillBlock = re.findings.filter((f) => f.severity === "BLOCK");
    const prevBlock = auditLiteraryDetailQuality({
      visualDescription: prev,
      shotSize: String(shots[i]!.shotSize ?? ""),
    }).findings.filter((f) => f.severity === "BLOCK");
    if (stillBlock.length > prevBlock.length) {
      refused.push(`reassert_fail:${fill.shotIndex}`);
      continue;
    }
    if (stillBlock.length === prevBlock.length && stillBlock.length > 0 && append.length < 4) {
      refused.push(`no_improve:${fill.shotIndex}`);
      continue;
    }
    shots[i] = {
      ...shots[i],
      visualDescription: next,
      _litEnhanceApplied: true,
      _litEnhanceAt: new Date().toISOString(),
      // Enhance writeback must force next still gen through compose+form+refs (no isomorphic empty loop)
      _forceComposeParity: true,
      _forceRefsDelta: true,
    };
    applied.push(fill.shotIndex);
  }

  return {
    ok: applied.length > 0 && refused.length === 0,
    shots,
    applied,
    refused,
    demoted: Boolean(input.importTrack && applied.length),
  };
}

/** Whether IRD should auto-enhance vs confirm (confidence ≥ autoMin, not strict/locked). */
export function resolveEnhanceAction(input: {
  confidence?: number;
  chatStrict?: boolean;
  literaryLocked?: boolean;
  hasEnhanceableDebt?: boolean;
}): "apply_auto_enhance" | "confirm_enhance" | "hand_edit_vd" | "none" {
  if (!input.hasEnhanceableDebt) return "none";
  if (input.literaryLocked || input.chatStrict) return "confirm_enhance";
  const conf = input.confidence ?? 0;
  if (conf >= getEnhancementAutoMin()) return "apply_auto_enhance";
  return "confirm_enhance";
}
