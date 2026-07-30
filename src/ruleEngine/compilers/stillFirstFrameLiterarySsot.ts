/**
 * Video first-frame literary SSOT — single cinematic beat over contract soup / collage.
 * Homology: compose egress · Edit · VLM single_frame · burn first_frame gate.
 */
import { toBareCastingName, uniqueBareCastingNames } from "./stillIdentitySsot";

/** Hard lock: one movie frame, never turnaround / grid / collage. */
export const STILL_SINGLE_FRAME_LOCK_ZH =
  "单镜头成片画幅，禁止四视图、定妆拼版、多宫格、拼图、character turnaround sheet、重复分身。";

/** Ultra-short for Edit focus — do not drown literary verbs. */
export const STILL_SINGLE_FRAME_LOCK_EDIT_ZH = "单镜头成片，禁四视图/拼版。";

export const STILL_NARRATIVE_FIRST_ZH =
  "叙事场面优先于参考图拼贴，画面必须体现上述描写中的动作与物件。";

/**
 * Allow turnaround_sheet as character asset: identity only, never layout template.
 * Homology: no-VLM first-gen must still emit single cinematic frame.
 */
export const STILL_SHEET_AS_IDENTITY_ONLY_ZH =
  "角色参考若为四视图/定妆拼版，仅借脸型、发型、服饰身份；严禁复刻多格拼版、分栏头像墙或 character sheet 布局，必须输出描写中的单一电影场面。";

/** Edit-slim sheet lock — one clause, literary VD stays primary. */
export const STILL_SHEET_AS_IDENTITY_ONLY_EDIT_ZH =
  "四视图仅借身份，禁复刻多格拼版。";

/**
 * Contact geometry — prop must touch declared locus (not float nearby).
 * Declare-only: only when VD already has touch+locus structure.
 */
export const STILL_CONTACT_GEOM_VLM_TEMPLATE =
  "道具/物件是否与「{LOCUS}」形成真实贴合或划过接触（非悬空举在附近）？";

export const STILL_CONTACT_GEOM_HEAL_TEMPLATE =
  "接触几何：须与{LOCUS}贴合/划过，禁止纸/物悬空漂在颊旁";

/** Primary look VLM — multi-cref costume bind to VD-named hero. */
export const STILL_PRIMARY_LOOK_VLM_TEMPLATE =
  "画面主角服饰/妆造是否与「{NAME}」主look一致（未混用其他角色色系纹样）？";

export const STILL_PRIMARY_LOOK_HEAL_TEMPLATE =
  "本镜主look以「{NAME}」定妆为准，禁止混用其他角色衣装色系";

/** Neighbor continuity atoms that must not overwrite a different beat. */
const CONTAMINATION_ATOMS = /端坐|太师椅|摩挲扳指|扳指|蒲团跪|跪低位|低位|蒲团|跪于/;

/**
 * Primary face/name from VD literary body — earliest cast-name occurrence wins
 * (not cast-list order: 「沈清漪捡书…沈母裙摆」→ 沈清漪).
 */
export function pickVdLiteraryPrimary(
  visualDescription?: string | null,
  castNames?: string[] | null,
): string {
  const vd = String(visualDescription ?? "").trim();
  const names = uniqueBareCastingNames(castNames ?? []).filter((n) => n.length >= 2);
  if (!vd || !names.length) return "";
  let best = "";
  let bestIdx = Infinity;
  for (const n of names) {
    const idx = vd.indexOf(n);
    if (idx >= 0 && idx < bestIdx) {
      bestIdx = idx;
      best = n;
    }
  }
  return best;
}

/**
 * When VD action subject ≠ binding high seat, omit/demote power-throne recipe.
 * Mid「捡书」主角不应被「沈母高位主脸」盖过.
 */
export function shouldDemotePowerBlockingForVd(input: {
  visualDescription?: string | null;
  bindHighName?: string | null;
  castNames?: string[] | null;
  hasSeatingOrKneel?: boolean;
}): { demote: boolean; vdPrimary: string; reason?: string } {
  if (input.hasSeatingOrKneel) {
    return { demote: false, vdPrimary: "", reason: "seating_hard" };
  }
  const vdPrimary = pickVdLiteraryPrimary(input.visualDescription, input.castNames);
  const high = toBareCastingName(String(input.bindHighName ?? "")) || String(input.bindHighName ?? "").trim();
  if (!vdPrimary || !high) return { demote: false, vdPrimary };
  if (vdPrimary === high || high.includes(vdPrimary) || vdPrimary.includes(high)) {
    return { demote: false, vdPrimary };
  }
  // Different person is literary subject vs seat-high → demote power line
  return { demote: true, vdPrimary, reason: "vd_primary_ne_bind_high" };
}

/**
 * Soft continuity for first-frame: short spatial hint only.
 * Strips seating contamination, off-cast names (沈清瓷 when cast is 母+漪), omits if empty.
 */
export function softenContinuityForFirstFrame(input: {
  continuity?: string | null;
  visualDescription?: string | null;
  maxChars?: number;
  castNames?: string[] | null;
}): {
  text: string | null;
  strippedContamination: boolean;
  truncated: boolean;
  omittedOffCast?: boolean;
} {
  let raw = String(input.continuity ?? "")
    .replace(/^continuity:\s*/i, "")
    .replace(/^continues?\s+from\s+/i, "")
    .trim();
  if (!raw) return { text: null, strippedContamination: false, truncated: false };

  const vd = String(input.visualDescription ?? "");
  let stripped = false;
  let omittedOffCast = false;

  if (CONTAMINATION_ATOMS.test(raw) && !CONTAMINATION_ATOMS.test(vd)) {
    raw = raw
      .replace(/端坐[^，。；;]{0,24}/g, "")
      .replace(/太师椅[^，。；;]{0,12}/g, "")
      .replace(/摩挲扳指|扳指/g, "")
      .replace(/蒲团跪[^，。；;]{0,12}/g, "")
      .replace(/跪低位|跪于低|低位/g, "")
      .replace(/蒲团/g, "")
      .replace(/\s{2,}/g, " ")
      .replace(/[，,]{2,}/g, "，")
      .trim();
    stripped = true;
  }

  const cast = uniqueBareCastingNames(input.castNames ?? []).filter((n) => n.length >= 2);
  if (cast.length) {
    const tokens = raw.match(/[\u4e00-\u9fff]{2,8}/g) ?? [];
    for (const tok of tokens) {
      const onCast = cast.some(
        (c) => c === tok || c.includes(tok) || tok.includes(c) || (/母$/.test(tok) && /母/.test(c)),
      );
      if (!onCast) {
        raw = raw.split(tok).join("").trim();
        omittedOffCast = true;
        stripped = true;
      }
    }
    raw = raw
      .replace(/\s{2,}/g, " ")
      .replace(/[，,]{2,}/g, "，")
      .replace(/^[，,\s]+|[，,\s]+$/g, "")
      .trim();
  }

  if (!raw || raw.length < 4 || /^[，。；;\s]+$/.test(raw)) {
    return {
      text: null,
      strippedContamination: stripped || omittedOffCast,
      truncated: false,
      omittedOffCast,
    };
  }

  const max = Math.max(12, input.maxChars ?? 36);
  if (raw.length > max) {
    return {
      text: raw.slice(0, max),
      strippedContamination: stripped || omittedOffCast,
      truncated: true,
      omittedOffCast,
    };
  }
  return {
    text: raw,
    strippedContamination: stripped || omittedOffCast,
    truncated: false,
    omittedOffCast,
  };
}

/**
 * Non-seating mid with VD action: prefer action-primary over throne「权力位…高位」.
 */
export function shouldUseActionPrimaryBeat(input: {
  visualDescription?: string | null;
  hasSeatingOrKneel?: boolean;
  castNames?: string[] | null;
}): { use: boolean; vdPrimary: string } {
  if (input.hasSeatingOrKneel) return { use: false, vdPrimary: "" };
  const vd = String(input.visualDescription ?? "");
  const vdPrimary = pickVdLiteraryPrimary(vd, input.castNames);
  if (!vdPrimary) return { use: false, vdPrimary: "" };
  try {
    const { resolveActionPrimaryHit } =
      require("./stillActionPrimarySsot") as typeof import("./stillActionPrimarySsot");
    const { hasSeatingHardFurniture } =
      require("./stillLiteraryIntentSsot") as typeof import("./stillLiteraryIntentSsot");
    const ap = resolveActionPrimaryHit({
      text: vd,
      castNames: input.castNames,
      hasSeatingOrKneel: false,
    });
    if (ap.hit && !hasSeatingHardFurniture(vd)) {
      return { use: true, vdPrimary };
    }
  } catch {
    if (/弯腰|捡|捏|指节|持|递|抽|撕|看|望|咬|刺|抄书|起身|拍案|摔杯|推门|攥|掀|拂袖/.test(vd)) {
      return { use: true, vdPrimary };
    }
  }
  return { use: Boolean(vdPrimary), vdPrimary };
}

/** Fix orphan「禁止 锁定」and dedupe identity-lock / drop throne when 动作主体 present. */
export function sanitizeFirstFrameEgressSoup(prompt: string): string {
  let next = String(prompt ?? "");
  next = next.replace(/禁止\s+(?=锁定定妆)/g, "");
  next = next.replace(/禁止\s{2,}锁定/g, "锁定");
  const lockRe = /锁定定妆脸型与身份，禁止按参考图拼贴成多格\/拼图[。；;]?/g;
  const locks = next.match(lockRe) ?? [];
  if (locks.length > 1) {
    let seen = false;
    next = next.replace(lockRe, () => {
      if (seen) return "";
      seen = true;
      return locks[0]!;
    });
  }
  if (/动作主体[：:]/.test(next)) {
    next = next.replace(/权力位[：:][^。；;\n]*[。；;]?/g, "");
    // Action primary egress must not carry seating StageA contract soup
    next = next.replace(/站位绑定：[^。；;\n]*/g, "");
    next = next.replace(/【布局锁】[^。；;\n]*/g, "");
    next = next.replace(/（高位端坐）|（低位跪）/g, "");
  }
  return next
    .replace(/。。+/g, "。")
    .replace(/\s{2,}/g, " ")
    .replace(/，{2,}/g, "，")
    .trim();
}

/**
 * Literary egress contract — non-seating must not carry throne bind / grey-void inducement.
 * Homology: compose post-heal · Edit · first_frame soft checks.
 */
export function healStillLiteraryEgress(input: {
  prompt: string;
  visualDescription?: string | null;
  hasSeatingOrKneel?: boolean;
  castNames?: string[] | null;
}): { prompt: string; issues: string[]; ok: boolean } {
  let prompt = sanitizeFirstFrameEgressSoup(input.prompt);
  const issues: string[] = [];
  let seating = Boolean(input.hasSeatingOrKneel);
  try {
    const { hasSeatingHardFurniture } =
      require("./stillLiteraryIntentSsot") as typeof import("./stillLiteraryIntentSsot");
    seating = seating || hasSeatingHardFurniture(input.visualDescription ?? "");
  } catch {
    /* optional */
  }

  if (!seating) {
    if (/站位绑定：/.test(prompt)) {
      issues.push("seating_bind_on_non_seating");
      prompt = prompt.replace(/站位绑定：[^。；;\n]*/g, " ");
    }
    if (/【布局锁】[^。；;\n]*座次/.test(prompt) || /座次构图锚/.test(prompt)) {
      issues.push("seating_layout_lock_on_non_seating");
      prompt = prompt.replace(/【布局锁】[^。；;\n]*/g, " ");
    }
  }
  if (/场景参考不送像素/.test(prompt)) {
    issues.push("grey_void_inducement");
    prompt = prompt.replace(/背景弱化：[^。；;\n]*场景参考不送像素[^。；;\n]*/g, "");
    prompt = prompt.replace(/场景参考不送像素[^。；;\n]*/g, "");
    if (!/室内环境可辨|禁止灰棚/.test(prompt)) {
      prompt = `${prompt} 背景弱化：浅景深，保留室内环境可辨（木作/墙面/烛光），禁止灰棚/纯色摄影棚空白背景，禁止香案升为主构图`;
    }
  }

  prompt = prompt
    .replace(/\s{2,}/g, " ")
    .replace(/[。；;]{2,}/g, "。")
    .trim();
  return { prompt, issues, ok: issues.length === 0 };
}

/** Order must-appear anchors: VD primary first, then others. */
export function orderAnchorsByVdPrimary(anchors: string[], vdPrimary?: string | null): string[] {
  const p = String(vdPrimary ?? "").trim();
  if (!p || !anchors.length) return anchors;
  const hit: string[] = [];
  const rest: string[] = [];
  for (const a of anchors) {
    if (a.includes(p) || p.includes(a)) hit.push(a);
    else rest.push(a);
  }
  return [...hit, ...rest];
}

/** Detect turnaround / sheet look from asset prompt or remark. */
export function isTurnaroundSheetAssetText(text?: string | null): boolean {
  const t = String(text ?? "");
  return /四视图|三视图|多视图|turnaround|character design sheet|四宫格|定妆拼版|多格参考|角色设定图|人设图|设定三视图|正面[、,，].*侧面/i.test(
    t,
  );
}

/**
 * Still prompt sheetLeak — ignore anti-collage bans / identity-only sheet locks.
 * Only positive layout inducement counts (避免 egress 锁误杀 burn).
 */
export function promptImpliesSheetCollageLeak(stillPrompt?: string | null): boolean {
  const raw = String(stillPrompt ?? "");
  if (!raw.trim()) return false;
  // Strip known egress locks wholesale (contain 四视图/定妆拼版 as bans, not inducement)
  let cleaned = raw
    .split(STILL_SHEET_AS_IDENTITY_ONLY_ZH)
    .join(" ")
    .split(STILL_SHEET_AS_IDENTITY_ONLY_EDIT_ZH)
    .join(" ")
    .split(STILL_SINGLE_FRAME_LOCK_ZH)
    .join(" ")
    .split(STILL_SINGLE_FRAME_LOCK_EDIT_ZH)
    .join(" ")
    .split(STILL_NARRATIVE_FIRST_ZH)
    .join(" ");
  cleaned = cleaned
    .replace(/角色参考若为四视图[^。；;\n]*/g, " ")
    .replace(/四视图仅借身份[^。；;\n]*/g, " ")
    .replace(/禁止[^。；;\n]*/g, " ")
    .replace(/严禁[^。；;\n]*/g, " ")
    .replace(/禁(?:四视图|复刻|拼版|拼图)[^。；;\n]*/g, " ")
    .replace(/单镜头成片[^。；;\n]*/g, " ")
    .replace(/仅借(?:脸型|身份)[^。；;\n]*/g, " ")
    .replace(/叙事场面优先[^。；;\n]*/g, " ");
  return /四视图|定妆拼版|多宫格|turnaround\s*sheet|character design sheet|拼图分栏|头像墙/i.test(cleaned);
}

const VLM_INFRA_EVIDENCE =
  /^(vlm_infra|vlm_parse_fail|missing_id|vlm_error|skipped|disabled)$/i;

/** Detect collage/sheet leak from VLM item results (fail or hint/evidence). */
export function detectSheetLeakFromVlmItems(
  items: Array<{ id: string; pass?: boolean; fixHint?: string; evidence?: string }>,
): boolean {
  return items.some((i) => {
    if (i.pass === true) return false;
    // Infra/parse placeholders must NEVER imply pixel collage (false 拼版)
    if (VLM_INFRA_EVIDENCE.test(String(i.evidence ?? "").trim())) return false;
    const blob = `${i.id}${i.fixHint ?? ""}${i.evidence ?? ""}`;
    // single_frame id alone counts only for real VLM fail (not infra)
    return /single_frame|拼版|四视|turnaround|character.?sheet|四宫格|拼图/i.test(blob);
  });
}

/**
 * Detect turnaround/sheet character assets (allowed as cref identity source).
 * Prefer keep in slot + STILL_SHEET_AS_IDENTITY_ONLY_ZH — do NOT hard-drop when
 * the project's only look is 四视图 (common asset pipeline).
 */
export function isTurnaroundSheetAsset(asset: {
  prompt?: string | null;
  remark?: string | null;
  describe?: string | null;
  type?: string | null;
}): boolean {
  if (String(asset.type ?? "") === "scene") return false;
  const blob = `${asset.prompt ?? ""}\n${asset.remark ?? ""}\n${asset.describe ?? ""}`;
  if (/promptMode:turnaround_sheet|stillMode:turnaround/i.test(blob)) return true;
  return isTurnaroundSheetAssetText(blob);
}

/**
 * @deprecated Prefer isTurnaroundSheetAsset — storyboard no longer hard-excludes sheets.
 * Kept for callers/tests: returns true when asset is turnaround (detect-only).
 */
export function shouldExcludeAssetFromStoryboardCref(asset: {
  prompt?: string | null;
  remark?: string | null;
  describe?: string | null;
  type?: string | null;
}): boolean {
  // Hard-exclude OFF: 四视图可沿用作角色资产；拼图靠 egress 锁，不靠丢 cref
  return false;
}

/** Preserve literary action core when building Edit focus base. */
export function preserveLiteraryCoreForEdit(input: {
  literaryPrompt: string;
  visualDescription?: string | null;
}): string {
  const lit = String(input.literaryPrompt ?? "").trim();
  const vd = String(input.visualDescription ?? "").trim();
  if (!vd) return lit;
  // If Edit base lost VD action head, prepend peeled VD (no cast card)
  const vdCore = vd
    .replace(/出镜人数[：:][^。\n]{0,160}/g, "")
    .replace(/禁止第\d+人[^。\n]{0,80}/g, "")
    .trim()
    .slice(0, 160);
  if (!vdCore || vdCore.length < 8) return lit;
  const head = vdCore.slice(0, Math.min(24, vdCore.length));
  if (lit.includes(head)) return lit;
  return `${vdCore}。${lit}`.replace(/。。+/g, "。").trim();
}
