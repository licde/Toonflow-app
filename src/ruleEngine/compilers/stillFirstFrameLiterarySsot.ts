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

/** Neighbor continuity / previous atoms that must not overwrite a different beat. */
const CONTAMINATION_ATOMS =
  /端坐|太师椅|摩挲扳指|扳指|蒲团跪|跪低位|低位|蒲团|跪于|咬唇|紧咬下唇|紧咬|渗血|渗出血珠|lip_bite|划过面颊|纸角划过|前景：[^，。]{0,12}唇|胸前手持|手持卡片|胸前展示|跪坐持/;

/** Off-beat mouth / CU atoms — previous refine must drop when current VD lacks them. */
export const OFF_BEAT_MOUTH_CU_ATOMS =
  /咬唇|紧咬下唇|紧咬|渗血|渗出血珠|lip_bite_blood|lip_bite|划过面颊|纸角划过|侧脸特写|唇部特写|前景：[^，。]{0,16}唇/;

/** Placard / kneel-hold pose atoms hostile to bend_pickup. */
export const OFF_BEAT_HOLD_CARD_ATOMS =
  /胸前手持|手持卡片|胸前展示|举卡|跪坐持|占位：跪坐|伏案靠桌/;

/** Current-shot action-primary stems that previous must survive (or drop previous). */
export const ACTION_PRIMARY_SURVIVE_STEMS = /弯腰|捡起|捡|捏紧|指节|俯身/;

/**
 * True when previous/continuity body carries neighbor mouth/CU atoms absent from current VD.
 * Also bidirectional: mouth-CU current must drop action/paper previous (SingleShotClosedCompose).
 */
export function previousBodyHasOffBeatContamination(
  previous?: string | null,
  visualDescription?: string | null,
): boolean {
  const prev = String(previous ?? "");
  const vd = String(visualDescription ?? "");
  if (!prev.trim()) return false;
  if (OFF_BEAT_MOUTH_CU_ATOMS.test(prev) && !OFF_BEAT_MOUTH_CU_ATOMS.test(vd)) return true;
  // Bend pickup current: drop previous hold-card / kneel / blood even without full CU match
  if (ACTION_PRIMARY_SURVIVE_STEMS.test(vd)) {
    if (OFF_BEAT_HOLD_CARD_ATOMS.test(prev) && !OFF_BEAT_HOLD_CARD_ATOMS.test(vd)) return true;
    if (/渗血|渗出血珠|咬唇/.test(prev) && !/渗血|咬唇|血珠/.test(vd)) return true;
  }
  if (CONTAMINATION_ATOMS.test(prev) && !CONTAMINATION_ATOMS.test(vd)) {
    // Seating soup in previous while current is action-primary pickup
    if (ACTION_PRIMARY_SURVIVE_STEMS.test(vd) && /端坐|太师椅|扳指|蒲团|跪/.test(prev)) return true;
  }
  // Current requires pickup/grip but previous lacks those stems
  if (ACTION_PRIMARY_SURVIVE_STEMS.test(vd)) {
    const needPickup = /捡|弯腰|俯身/.test(vd);
    const needGrip = /捏紧|指节/.test(vd);
    if (needPickup && !/捡|弯腰|俯身/.test(prev)) return true;
    if (needGrip && !/捏紧|指节|捏/.test(prev)) return true;
  }
  // Reverse: mouth-CU / lip beat must not refine from bend/paper neighbor soup
  const mouthCu =
    OFF_BEAT_MOUTH_CU_ATOMS.test(vd) ||
    (/特写|近景|CU|ecu/i.test(vd) && /唇|咬|渗血|眼神|面颊/.test(vd) && !ACTION_PRIMARY_SURVIVE_STEMS.test(vd));
  if (mouthCu) {
    if (/弯腰|捡起|捡|捏紧|指节|俯身|休书|婚书|信笺/.test(prev) && !/弯腰|捡|捏紧|休书|信笺/.test(vd)) {
      return true;
    }
    if (OFF_BEAT_HOLD_CARD_ATOMS.test(prev) && !OFF_BEAT_HOLD_CARD_ATOMS.test(vd)) return true;
  }
  if (/镜头\s*[0-9０-９]+|shot\s*#?\s*\d+/i.test(prev) && !/镜头\s*[0-9０-９]+|shot\s*#?\s*\d+/i.test(vd)) {
    return true;
  }
  return false;
}

/** Skirt / body-fragment background — forbid full secondary face + prop steal. */
export type BgFragmentKind = "skirt_blur" | "sleeve_blur" | "body_fragment" | null;

export function resolveBgFragment(input: {
  visualDescription?: string | null;
  background?: string | null;
  imagePrompt?: string | null;
  spatialRelation?: string | null;
}): { kind: BgFragmentKind; guidance: string | null; stripFullSecondary: boolean } {
  const blob = [
    input.visualDescription,
    input.background,
    input.imagePrompt,
    input.spatialRelation,
  ]
    .map((s) => String(s ?? ""))
    .join("\n");
  if (/裙摆/.test(blob) && /虚化|浅景深|背景/.test(blob + "虚化")) {
    return {
      kind: "skirt_blur",
      guidance:
        "背景仅次角裙摆虚化浅景深，禁止次角完整正脸/半身立像，禁止次角持书/持纸抢戏，禁止双人同权构图",
      stripFullSecondary: true,
    };
  }
  if (/裙摆|衣角|袖缘|袍角/.test(blob) && !/双人同框|对峙中景/.test(blob)) {
    return {
      kind: "body_fragment",
      guidance:
        "背景为局部身体碎片虚化，禁止次角完整正脸与持道具抢戏；空间站立仅作方位 hint，不画完整立像",
      stripFullSecondary: true,
    };
  }
  if (/袖缘|衣角|袍角/.test(blob)) {
    return {
      kind: "sleeve_blur",
      guidance: "背景仅衣角/袖缘虚化，禁止次角完整人脸持物抢戏",
      stripFullSecondary: true,
    };
  }
  return { kind: null, guidance: null, stripFullSecondary: false };
}

/** Mouth-detail performance inject only when VD declares mouth action. */
export function mouthDetailAllowedByVd(
  mouthDetail?: string | null,
  visualDescription?: string | null,
): boolean {
  const md = String(mouthDetail ?? "").trim();
  if (!md) return true;
  const vd = String(visualDescription ?? "");
  if (/neutral|closed|自然|闭合/i.test(md) && !/咬|渗血|lip_bite/i.test(md)) return true;
  if (/咬|刺|含|衔|捂嘴|渗血|lip_bite/i.test(md)) {
    return /咬|刺|含|衔|捂嘴|渗血|下唇/.test(vd);
  }
  return true;
}

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
      .replace(/咬唇|紧咬下唇|紧咬|渗血|lip_bite_blood|lip_bite/gi, "")
      .replace(/划过面颊|纸角划过/g, "")
      .replace(/侧脸特写|唇部特写|前景：[^，。；]{0,16}唇[^，。；]{0,8}/g, "")
      .replace(/\s{2,}/g, " ")
      .replace(/[，,]{2,}/g, "，")
      .trim();
    stripped = true;
  }

  // Neighbor oral-CU full clauses (特写咬唇渗血) — drop even when 浅痕 co-occurs if VD has no oral beat
  try {
    const { isOffBeatOralCuClause, isBendSealed } =
      require("./stillSealGate") as typeof import("./stillSealGate");
    const bendLike =
      isBendSealed({
        poseOccupancy: /弯腰|捡起|捡拾|俯身/.test(vd) ? "bend_pickup" : null,
        primaryObjective: /弯腰|捡起|捡拾/.test(vd) ? "action_primary" : null,
      }) || /弯腰|捡起|捡拾|俯身/.test(vd);
    if (bendLike || !/咬|渗血|血珠|紧咬/.test(vd)) {
      const clauses = raw.split(/[。；;\n]+/).map((s) => s.trim()).filter(Boolean);
      const kept: string[] = [];
      for (const c of clauses) {
        if (isOffBeatOralCuClause(c, vd)) {
          stripped = true;
          continue;
        }
        kept.push(c);
      }
      raw = kept.join("。").trim();
      // Residual tokens
      if (!/咬|渗血|血珠/.test(vd)) {
        const cleaned = raw
          .replace(/特写[。．]?/g, "")
          .replace(/紧咬下唇[^，。；]{0,16}/g, "")
          .replace(/唇瓣渗出血珠|渗出血珠|眼神隐忍/g, "")
          .replace(/\s{2,}/g, " ")
          .trim();
        if (cleaned !== raw) {
          raw = cleaned;
          stripped = true;
        }
      }
    }
  } catch {
    /* optional */
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
  let lit = String(input.literaryPrompt ?? "").trim();
  const vd = String(input.visualDescription ?? "").trim();
  if (!vd) return lit;
  // Strip off-beat mouth/CU soup from Edit base when VD is action-primary
  if (previousBodyHasOffBeatContamination(lit, vd)) {
    lit = lit
      .replace(/[^。；;\n]*(?:咬唇|紧咬|渗血|lip_bite|划过面颊|唇部特写)[^。；;\n]*/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }
  // If Edit base lost VD action head, prepend peeled VD (no cast card)
  const vdCore = vd
    .replace(/出镜人数[：:][^。\n]{0,160}/g, "")
    .replace(/禁止第\d+人[^。\n]{0,80}/g, "")
    .trim()
    .slice(0, 160);
  if (!vdCore || vdCore.length < 8) return lit;
  const head = vdCore.slice(0, Math.min(24, vdCore.length));
  if (lit.includes(head)) {
    // Still ensure action stems present
    if (ACTION_PRIMARY_SURVIVE_STEMS.test(vd)) {
      const act = vd.match(/[^。；;\n]*(?:弯腰|捡起|捡|捏紧|指节)[^。；;\n]{0,36}/)?.[0];
      if (act && !new RegExp(act.slice(0, 6)).test(lit)) {
        return `${act}。${lit}`.replace(/。。+/g, "。").trim();
      }
    }
    return lit;
  }
  return `${vdCore}。${lit}`.replace(/。。+/g, "。").trim();
}
