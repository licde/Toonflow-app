/**
 * Shared CU × multi-cast conflict predicate — Chat / Exit / IRD / Compose / Preview / Edit homology.
 *
 * 智能适配优先级（文学意图驱动）：
 * 1. slice_cast — 特写/近景且 VD 只点名一人 → 降出场人数（禁拆镜 Confirm）
 * 2. split — VD 多人或场面同框意图 → 反应特写+场面镜
 * 3. confirm — 歧义才 Confirm
 */
import { isCuShotSize } from "../compilers/stillLiteraryIntentSsot";
import { uniqueBareCastingNames, toBareCastingName } from "../compilers/stillIdentitySsot";
import { loadSplitAutoMin, type SplitConfidenceDecision } from "./splitConfidenceSsot";

export const DEX_STILL_CU_CAST = "DEX-STILL-CU-CAST";
export const STILL_CU_CAST_TRIGGER = "still_cu_cast";

export type CuCastHealMode = "none" | "slice_cast" | "split" | "confirm";

export type CuCastConflict = {
  conflict: boolean;
  deterministic: boolean;
  ambiguous: boolean;
  castCount: number;
  castNames: string[];
  shotSize: string;
  confidence: SplitConfidenceDecision;
  ruleId: typeof DEX_STILL_CU_CAST;
  reverseTrigger: typeof STILL_CU_CAST_TRIGGER;
  message: string;
  /** Framing came from shotSize and/or VD/prompt body */
  framingSource?: "shotSize" | "visual" | "prompt_card" | "none";
  /** Literary-intent heal — slice_cast preferred over split when single-hero CU */
  healMode?: CuCastHealMode;
  primaryName?: string;
};

function collectCastNames(input: {
  charCodes?: string[] | null;
  characterNames?: string[] | null;
  visualDescription?: string | null;
  dialogueSpeakers?: string[] | null;
}): { names: string[]; fromCodes: number; ambiguous: boolean } {
  const codes = [...new Set((input.charCodes ?? []).map((c) => String(c ?? "").trim()).filter(Boolean))];
  const named = uniqueBareCastingNames([
    ...(input.characterNames ?? []),
    ...(input.dialogueSpeakers ?? []),
  ]);
  // Prefer explicit codes/names over VD name-hunting
  if (codes.length >= 2 || named.length >= 2) {
    const names = named.length >= 2 ? named : codes.map((c) => c.replace(/^CHAR-/i, ""));
    return { names, fromCodes: codes.length, ambiguous: false };
  }
  // Ambiguous: only dialogue speakers imply multi without imaged cast
  const speakers = uniqueBareCastingNames(input.dialogueSpeakers ?? []);
  if (speakers.length >= 2 && codes.length < 2) {
    return { names: speakers, fromCodes: codes.length, ambiguous: true };
  }
  return { names: named.length ? named : speakers, fromCodes: codes.length, ambiguous: speakers.length >= 2 };
}

/** True when shotSize is clearly CU/特写 (not mid/full). */
export function isDeterministicFaceCu(shotSize?: string | null): boolean {
  const s = String(shotSize ?? "").trim();
  if (!s) return false;
  // Ambiguous mid labels
  if (/中景|全景|远景|过肩|OTS|双人|三人|场面/i.test(s)) return false;
  return isCuShotSize(s);
}

/**
 * Face-CU framing from VD/prompt when shotSize empty/soft — 设计意图驱动智能适配.
 * Mid/ensemble leading framing wins; leading 特写 / 侧脸特写 atoms count as face CU.
 */
export function inferFaceCuFromText(text?: string | null): boolean {
  const t = String(text ?? "").trim();
  if (!t) return false;
  if (/^(中景|全景|远景|过肩|场面|双人中景|三人场面)/.test(t)) return false;
  if (/^(特写|近景|大特写|ECU|CU)[。．、\s,，]/.test(t)) return true;
  if (/^(特写|近景|大特写)[。．]?$/.test(t.slice(0, 8))) return true;
  const head = t.slice(0, 96);
  if (/侧脸特写|反应特写|面部特写|大特写/.test(head)) return true;
  if (/特写/.test(head) && /侧脸|面颊|下唇|咬唇|渗血|瞳|泪/.test(head)) return true;
  return false;
}

/** Parse「出镜人数：仅N人」from composed body — leak-net for CU×N. */
export function parseCastCardinalityFromText(text?: string | null): number {
  const m = String(text ?? "").match(/出镜人数[：:]\s*仅\s*(\d+)\s*人/);
  return m ? Number(m[1]) : 0;
}

/** Combined framing: shotSize OR VD/prompt face-CU. */
export function resolveFaceCuFraming(input: {
  shotSize?: string | null;
  visualDescription?: string | null;
  prompt?: string | null;
}): { faceCu: boolean; source: "shotSize" | "visual" | "none" } {
  if (isDeterministicFaceCu(input.shotSize)) return { faceCu: true, source: "shotSize" };
  const blob = [input.visualDescription, input.prompt].filter(Boolean).join("。");
  if (inferFaceCuFromText(blob)) return { faceCu: true, source: "visual" };
  return { faceCu: false, source: "none" };
}

const ENSEMBLE_CU_RE =
  /同框|并立|对峙|夹击|围住|左右|双人|两人|二人|三人|众人|群像|对坐|并肩|面对面|互相/;

/** Primary face name for reaction CU — first bare name matching VD, else first. */
export function pickPrimaryReactionName(names: string[], vd?: string | null): string {
  const t = String(vd ?? "");
  for (const n of names) {
    const bare = toBareCastingName(n);
    if (bare && t.includes(bare)) return bare;
  }
  return toBareCastingName(names[0]) || names[0] || "";
}

/** Parse「出镜人数：仅N人（A、B、C）」name list — leak-net. */
export function parseNamesFromCastCard(text?: string | null): string[] {
  const m = String(text ?? "").match(/出镜人数[：:]\s*仅\s*\d+\s*人[（(]([^）)]{0,160})[）)]/);
  if (!m?.[1]) return [];
  return uniqueBareCastingNames(m[1].split(/[、,，]/).map((s) => s.trim()).filter(Boolean));
}

/**
 * Literary single-hero for face CU: VD 明确只点名一人 → 降出场人数，不拆镜.
 * Ignore names that only appear inside「出镜人数：…」契约行（泄漏绑定 ≠ 文学意图）.
 * Bound cast may already be 1 while prompt still leaks「仅3人」— still resolve hero from card+VD.
 */
export function literarySingleHeroForCu(
  visualDescription?: string | null,
  castNames?: string[] | null,
): string {
  const raw = String(visualDescription ?? "").trim();
  const vd = raw
    .replace(/出镜人数[：:][^。\n]{0,160}/g, "")
    .replace(/禁止第\d+人[^。\n]{0,80}/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  const cardNames = parseNamesFromCastCard(raw);
  const names = uniqueBareCastingNames([...(castNames ?? []), ...cardNames]).filter((n) => n.length >= 2);
  if (!vd || names.length < 1) return "";

  const faceCu =
    inferFaceCuFromText(raw) || /侧脸|面颊|下唇|咬唇|瞳|泪/.test(vd.slice(0, 96));

  const present = names.filter((n) => vd.includes(n));
  // Multi names written into VD body + ensemble language → not single-hero slice
  if (present.length >= 2 && ENSEMBLE_CU_RE.test(vd)) return "";
  if (present.length >= 2) return "";
  if (present.length === 1) return present[0]!;

  // Bound already 1 + face CU (card leak only)
  if (names.length === 1 && faceCu) return names[0]!;

  // No cast name in peeled VD: try pickPrimary only if others absent
  const primary = pickPrimaryReactionName(names, vd);
  if (!primary) return "";
  const othersInVd = names.some((n) => n !== primary && vd.includes(n));
  if (othersInVd) return "";
  if (!faceCu) return "";
  return primary;
}

export function detectCuCastConflict(input: {
  shotSize?: string | null;
  charCodes?: string[] | null;
  characterNames?: string[] | null;
  visualDescription?: string | null;
  /** Composed / Edit literary body (may already leak 出镜人数) */
  prompt?: string | null;
  dialogueSpeakers?: string[] | null;
  /** Already split reaction/action child — skip */
  alreadySplit?: boolean;
}): CuCastConflict {
  const autoMin = loadSplitAutoMin();
  const shotSize = String(input.shotSize ?? "").trim();
  const { names, ambiguous: castAmbiguous } = collectCastNames(input);
  let castCount = names.length;
  let framingSource: CuCastConflict["framingSource"] = "none";

  const framing = resolveFaceCuFraming({
    shotSize,
    visualDescription: input.visualDescription,
    prompt: input.prompt,
  });
  let faceCu = framing.faceCu;
  if (framing.faceCu) framingSource = framing.source;

  // Leak-net: composed body already has 特写 + 仅N≥2人 (样本形态)
  const blobForCard = String(input.prompt || input.visualDescription || "");
  const cardN = parseCastCardinalityFromText(blobForCard);
  const cardNames = parseNamesFromCastCard(blobForCard);
  if (!faceCu && cardN >= 2 && inferFaceCuFromText(blobForCard)) {
    faceCu = true;
    framingSource = "prompt_card";
  }
  if (cardN >= 2 && castCount < cardN) castCount = cardN;

  const sizeAmbiguous =
    !faceCu && /特|近景|close/i.test(shotSize) && castCount >= 2;

  const empty: CuCastConflict = {
    conflict: false,
    deterministic: false,
    ambiguous: false,
    castCount,
    castNames: names.length ? names : cardNames,
    shotSize,
    confidence: { confidence: 1, autoEligible: false, autoMin },
    ruleId: DEX_STILL_CU_CAST,
    reverseTrigger: STILL_CU_CAST_TRIGGER,
    message: "",
    framingSource,
    healMode: "none",
    primaryName: "",
  };

  if (input.alreadySplit || castCount < 2 || (!faceCu && !sizeAmbiguous)) {
    return empty;
  }

  const vdBlob = String(input.visualDescription || input.prompt || "");
  // Hero pool: bound cast may be 1 while「仅3人」仍在正文 — 用契约名单补齐意图判定
  const heroPool = names.length >= 2 ? names : uniqueBareCastingNames([...names, ...cardNames]);
  const singleHero = literarySingleHeroForCu(vdBlob, heroPool);
  if (singleHero && faceCu) {
    // 文学意图=单人特写：降出场人数 / 剥人数契约泄漏（不拆镜、不 400）
    return {
      conflict: true,
      deterministic: true,
      ambiguous: false,
      castCount,
      castNames: heroPool.length ? heroPool : names,
      shotSize,
      confidence: {
        confidence: 0.95,
        autoEligible: 0.95 >= autoMin,
        autoMin,
        reason: "cu_cast_slice_literary",
      },
      ruleId: DEX_STILL_CU_CAST,
      reverseTrigger: STILL_CU_CAST_TRIGGER,
      message: `特写文学意图为「${singleHero}」单人；出镜绑定/契约了${castCount}人，须按意图降出场人数（不拆镜）`,
      framingSource,
      healMode: "slice_cast",
      primaryName: singleHero,
    };
  }

  const deterministic = faceCu && !castAmbiguous && castCount >= 2;
  const ambiguous = !deterministic && (sizeAmbiguous || castAmbiguous);
  const vdDeterministic =
    faceCu &&
    !castAmbiguous &&
    castCount >= 2 &&
    (framingSource === "shotSize" || framingSource === "visual" || framingSource === "prompt_card");
  const confDet = vdDeterministic || deterministic;
  const healMode: CuCastHealMode = confDet ? "split" : "confirm";
  const confidence: SplitConfidenceDecision = confDet
    ? { confidence: 0.92, autoEligible: 0.92 >= autoMin, autoMin, reason: "cu_cast_split" }
    : {
        confidence: 0.55,
        autoEligible: false,
        autoMin,
        reason: castAmbiguous ? "cast_ambiguous" : "size_ambiguous",
      };

  return {
    conflict: true,
    deterministic: confDet,
    ambiguous: !confDet && ambiguous,
    castCount,
    castNames: names,
    shotSize,
    confidence,
    ruleId: DEX_STILL_CU_CAST,
    reverseTrigger: STILL_CU_CAST_TRIGGER,
    message:
      healMode === "split"
        ? `特写/近景与出镜≥${castCount}人冲突（${names.slice(0, 4).join("、") || "多人"}）；VD 含多人意图，须拆反应特写与场面镜`
        : `特写/近景与出镜人数歧义（${names.slice(0, 4).join("、") || "多人"}）；须 Confirm 拆镜或改景别`,
    framingSource,
    healMode,
    primaryName: pickPrimaryReactionName(names, vdBlob),
  };
}

/**
 * Slice shot cast fields to literary primary — 智能适配写回（≠改 VD）.
 */
export function sliceShotCastToPrimary(
  shot: Record<string, unknown>,
  primaryName: string,
): Record<string, unknown> {
  const primary = toBareCastingName(primaryName) || primaryName;
  if (!primary) return shot;
  const codes = Array.isArray(shot.charCodes) ? (shot.charCodes as string[]) : [];
  const names = Array.isArray(shot.characterNames)
    ? (shot.characterNames as string[])
    : Array.isArray((shot as { castNames?: string[] }).castNames)
      ? ((shot as { castNames?: string[] }).castNames as string[])
      : [];
  const match = (label: string) => {
    const bare = toBareCastingName(label) || label;
    return Boolean(bare && (bare === primary || bare.includes(primary) || primary.includes(bare)));
  };

  // Prefer name↔code index pairing (CHAR-* 无法用中文名直接匹配)
  if (codes.length && names.length) {
    const n = Math.max(codes.length, names.length);
    const keptCodes: string[] = [];
    const keptNames: string[] = [];
    for (let i = 0; i < n; i++) {
      const name = String(names[i] ?? "");
      const code = String(codes[i] ?? "");
      if (match(name) || match(code.replace(/^CHAR-/i, ""))) {
        if (code) keptCodes.push(code);
        if (name) keptNames.push(name);
      }
    }
    if (keptNames.length || keptCodes.length) {
      shot.charCodes = keptCodes.length ? keptCodes : codes.slice(0, 1);
      if (names.length) shot.characterNames = keptNames.length ? keptNames : [primary];
      if (Array.isArray((shot as { castNames?: string[] }).castNames)) {
        (shot as { castNames: string[] }).castNames = keptNames.length ? keptNames : [primary];
      }
      shot._cuCastSliced = true;
      shot._cuCastPrimary = primary;
      return shot;
    }
  }

  const keptCodes = codes.filter((c) => match(String(c).replace(/^CHAR-/i, "")) || match(String(c)));
  const keptNames = names.filter((n) => match(String(n)));
  shot.charCodes = keptCodes.length ? keptCodes : codes.slice(0, 1);
  if (names.length) shot.characterNames = keptNames.length ? keptNames : [primary];
  if (Array.isArray((shot as { castNames?: string[] }).castNames)) {
    (shot as { castNames: string[] }).castNames = keptNames.length ? keptNames : [primary];
  }
  shot._cuCastSliced = true;
  shot._cuCastPrimary = primary;
  return shot;
}

/**
 * Literary Edit / repair: structure debt.
 * slice_cast → 不拦（由 cref/cast 适配愈）；split/confirm → split_shot.
 */
export function diagnoseStructuralStillEditBlock(input: {
  literaryPrompt?: string | null;
  shotSize?: string | null;
  castNames?: string[] | null;
  charCodes?: string[] | null;
}): {
  block: boolean;
  trigger: typeof STILL_CU_CAST_TRIGGER | "";
  nextStep: "split_shot" | "";
  message: string;
  healMode?: CuCastHealMode;
} {
  const cu = detectCuCastConflict({
    shotSize: input.shotSize,
    characterNames: input.castNames,
    charCodes: input.charCodes,
    visualDescription: input.literaryPrompt,
    prompt: input.literaryPrompt,
  });
  if (!cu.conflict) {
    return { block: false, trigger: "", nextStep: "", message: "", healMode: "none" };
  }
  if (cu.healMode === "slice_cast") {
    // 单人特写意图：Edit 侧裁 cref/人数即可，不走拆镜 Confirm
    return {
      block: false,
      trigger: "",
      nextStep: "",
      message: cu.message,
      healMode: "slice_cast",
    };
  }
  return {
    block: true,
    trigger: STILL_CU_CAST_TRIGGER,
    nextStep: "split_shot",
    message: cu.message || "特写×多人须智能拆，禁止文学Edit",
    healMode: cu.healMode,
  };
}
