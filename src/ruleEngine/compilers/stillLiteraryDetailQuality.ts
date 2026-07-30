/**
 * Literary detail quality — structure-first slots (declare-only).
 * Sparse VD → still drift; never invent missing loci.
 * Homology: designExit DEX-LIT-* · IRD hand_edit_vd · mustSurvive · lookLock.
 */
import { loadLiteraryIntentDoctrine, resetLiteraryIntentDoctrineCache } from "./stillLiteraryIntentSsot";
import { extractVdDeclaredActionVerbs } from "./stillActionPrimarySsot";

export type LitDetailFinding = {
  id: string;
  ruleId: string;
  severity: "BLOCK" | "WARN";
  message: string;
  missing: string[];
  missingSlots: string[];
  present: string[];
};

export type StructuralSlots = {
  contactStruct: string[];
  groundOrPathStruct: string[];
  gripStruct: string[];
  surfaceStruct: string[];
  thresholdStruct: string[];
  pourTargetStruct: string[];
  facingOnly: string[];
  propSpans: string[];
};

export type VerbFamilies = {
  touch_face: boolean;
  displace: boolean;
  transfer: boolean;
  grasp: boolean;
  pour_splash: boolean;
  write: boolean;
  door: boolean;
  micro_wound: boolean;
  intense_expr: boolean;
  ground_pickup: boolean;
  hold: boolean;
  tear_wipe: boolean;
};

export type LitDetailAudit = {
  ok: boolean;
  findings: LitDetailFinding[];
  slots: StructuralSlots;
  families: VerbFamilies;
  /** @deprecated prefer slots — kept for callers */
  atoms: {
    hasProp: boolean;
    contactLocus: string[];
    spatialOrGrip: string[];
    groundLocus: string[];
    facing: string[];
    faceCuOrFaceMention: boolean;
  };
};

type SlotMatrixRow = {
  id: string;
  findingId?: string;
  severityOnCu?: "BLOCK" | "WARN";
  severityElse?: "BLOCK" | "WARN";
  whenFamilies?: string[];
  whenAllFamilies?: string[];
  whenShot?: string[];
  requireAnySlots?: string[];
  message?: string;
};

type DetailCfg = {
  version?: string;
  structureFirst?: boolean;
  lexiconIsBoostOnly?: boolean;
  neverInventMissingAtoms?: boolean;
  faceCuShotSizes?: string[];
  faceMentionLexicon?: string[];
  facingLexicon?: string[];
  propSignalLexicon?: string[];
  contactLocusLexicon?: string[];
  spatialOrGripLexicon?: string[];
  groundLocusLexicon?: string[];
  surfaceLocusLexicon?: string[];
  thresholdLocusLexicon?: string[];
  pourTargetLexicon?: string[];
  microWoundLexicon?: string[];
  intenseExprLexicon?: string[];
  contactRoleXorLexicon?: string[];
  woundVisibleLexicon?: string[];
  /** morph seeds for family tagging only */
  familySeeds?: Record<string, string[]>;
  slotMatrix?: SlotMatrixRow[];
  /** legacy rules — boost when structureFirst */
  rules?: Array<{
    id: string;
    findingId?: string;
    severityOnCu?: "BLOCK" | "WARN";
    severityElse?: "BLOCK" | "WARN";
    when?: string[];
    requireAny?: string[];
    message?: string;
  }>;
  lookLock?: {
    whenCharCrefGe?: number;
    lineZh?: string;
    primaryNameTemplate?: string;
  };
  industryAtoms?: string[];
  gatePriority?: string[];
  driftPolicy?: {
    forbidSilentSubjectSwap?: boolean;
    forbidNewCastInvent?: boolean;
    forbidNegateCoreAction?: boolean;
    forbidUnderLiteraryLockedWithoutForce?: boolean;
    kinds?: string[];
  };
  enhancementFillPolicy?: {
    enabledByDefault?: boolean;
    requireConfirmBelowAutoMin?: boolean;
    autoMin?: number;
    allowedSlots?: string[];
    forbidPlotProse?: boolean;
    forbidFxInvent?: boolean;
    designDefault?: string;
    importDefault?: string;
    allowImportStructureSoftFill?: boolean;
    healAuthority?: { design?: string; import?: string };
  };
  intentVisualWound?: {
    enabled?: boolean;
    flagKey?: string;
    deriveWoundVisible?: boolean;
    distinctFromOralMicroWound?: boolean;
    bodyLocusRequired?: boolean;
  };
  llmFillPolicy?: {
    enabledByDefault?: boolean;
    requireConfirm?: boolean;
    reassertSlots?: boolean;
    forbidImportAutoWrite?: boolean;
  };
  propContinuity?: Record<string, unknown>;
};

const DEFAULT_XOR_LEXICON = [
  "互斥",
  "另镜",
  "非同拍",
  "未入口",
  "未含于口",
  "分镜",
  "拆为",
  "仅颊触非口含",
  "纸未入口",
  "非含入口",
];

/** True when VD declares prop-face touch vs oral wound mutual exclusion / split. */
export function hasContactRoleXorSatisfaction(visualDescription?: string | null, cfg?: DetailCfg): boolean {
  const vd = String(visualDescription ?? "");
  if (!vd) return false;
  const lex = cfg?.contactRoleXorLexicon?.length ? cfg.contactRoleXorLexicon : DEFAULT_XOR_LEXICON;
  return lex.some((t) => t && vd.includes(t)) || /_xorSplit|xorSplit|contactRoleXorOk/.test(vd);
}

export type DriftKind =
  | "subject_contradiction"
  | "new_cast"
  | "negate_core_action"
  | "literary_locked";

export type DriftFinding = { kind: DriftKind; message: string };

/** Minimal literary-spine drift detectors — refuse silent enhance when present. */
export function detectLiteraryDrift(input: {
  beforeVd?: string | null;
  afterVd?: string | null;
  literaryLocked?: boolean;
  force?: boolean;
  knownCast?: string[] | null;
}): { ok: boolean; findings: DriftFinding[] } {
  const cfg = loadDetailCfg();
  const policy = cfg.driftPolicy ?? {};
  const findings: DriftFinding[] = [];
  const before = String(input.beforeVd ?? "").trim();
  const after = String(input.afterVd ?? "").trim();

  if (policy.forbidUnderLiteraryLockedWithoutForce !== false) {
    if (input.literaryLocked && !input.force) {
      findings.push({ kind: "literary_locked", message: "literaryLocked 禁静默增强，须 force" });
    }
  }

  if (!after) return { ok: findings.length === 0, findings };

  if (policy.forbidNewCastInvent !== false) {
    if (/CHAR-[A-Z]|新角色|无名氏/.test(after) && (!before || !/CHAR-[A-Z]|新角色|无名氏/.test(before))) {
      findings.push({ kind: "new_cast", message: "增强禁发明新角色/占位名" });
    }
    const known = (input.knownCast ?? []).map((n) => String(n).trim()).filter((n) => n.length >= 2);
    if (known.length && before) {
      for (const name of known) {
        if (!before.includes(name) && after.includes(name)) {
          // introducing a known cast who wasn't in before is still "new" for this shot
          findings.push({ kind: "new_cast", message: `增强禁引入本镜未出现角色：${name}` });
          break;
        }
      }
    }
  }

  if (policy.forbidSilentSubjectSwap !== false && before && after) {
    const nameRe = /[\u4e00-\u9fff]{2,4}(?=侧脸|正脸|手持|弯腰|特写|冷冷|紧咬|划过)/g;
    const bNames = [...new Set(before.match(nameRe) ?? [])];
    const aNames = [...new Set(after.match(nameRe) ?? [])];
    if (bNames.length && aNames.length && !aNames.some((n) => bNames.includes(n))) {
      findings.push({ kind: "subject_contradiction", message: "增强禁静默更换主体" });
    }
  }

  if (policy.forbidNegateCoreAction !== false && before && after) {
    const core = extractVdDeclaredActionVerbs(before).slice(0, 3);
    for (const v of core) {
      if (!v || v.length < 1) continue;
      if (new RegExp(`(?:没有|不再|未)${v}|${v}(?:取消|删除)`).test(after) && !before.includes(`没有${v}`)) {
        findings.push({ kind: "negate_core_action", message: `增强禁否定核心动作：${v}` });
        break;
      }
    }
  }

  return { ok: findings.length === 0, findings };
}

export function getEnhancementFillPolicy(): NonNullable<DetailCfg["enhancementFillPolicy"]> {
  return loadDetailCfg().enhancementFillPolicy ?? {};
}

export function getEnhancementAutoMin(): number {
  const n = Number(getEnhancementFillPolicy().autoMin);
  return Number.isFinite(n) && n > 0 ? n : 0.7;
}

/** Touch-face × body locus → woundVisible hint (visibility only; no plot invent). */
export function deriveWoundVisibleAppend(input: {
  visualDescription?: string | null;
  intentVisualEnhance?: boolean;
}): { needed: boolean; append: string; reason?: string } {
  const cfg = loadDetailCfg();
  const wound = cfg.intentVisualWound;
  if (wound?.enabled === false) return { needed: false, append: "", reason: "wound_disabled" };
  if (input.intentVisualEnhance === false) return { needed: false, append: "", reason: "flag_off" };
  const vd = String(input.visualDescription ?? "");
  const fam = classifyVerbFamilies(vd);
  if (!fam.touch_face) return { needed: false, append: "", reason: "no_touch_face" };
  const loci = extractDeclaredContactLoci(vd);
  const bodyLocus = loci.some((l) => /颊|脸|额|颈|肩|腕|手|指/.test(l));
  if (!bodyLocus && wound?.bodyLocusRequired !== false) {
    return { needed: false, append: "", reason: "no_body_locus" };
  }
  // Oral micro-wound already declared — do not conflate into face-wound invent
  if (fam.micro_wound && wound?.distinctFromOralMicroWound !== false) {
    if (/咬|含|唇|血珠|渗血/.test(vd) && !hasContactRoleXorSatisfaction(vd, cfg)) {
      return { needed: false, append: "", reason: "oral_xor_unresolved" };
    }
  }
  const lex = cfg.woundVisibleLexicon?.length
    ? cfg.woundVisibleLexicon
    : ["浅痕", "红痕", "划痕可见", "痕可见"];
  if (lex.some((t) => vd.includes(t)) || /渗血|血珠|血痕/.test(vd)) {
    return { needed: false, append: "", reason: "already_visible" };
  }
  const locus = loci.find((l) => /颊|脸|额/.test(l)) ?? loci[0] ?? "面颊";
  return {
    needed: true,
    append: `${locus}浅痕可见`,
    reason: "touch_face_body_locus",
  };
}

const FACING_RE = /侧脸|正面|正脸|背影|侧身|半侧|侧过脸/;

/** Structure: contact / path / grip — primary signal */
export function detectStructuralSlots(
  visualDescription?: string | null,
  spatialRelation?: string | null,
): StructuralSlots {
  const vd = String(visualDescription ?? "");
  const spatialBoost = String(spatialRelation ?? "").trim();
  const blob = spatialBoost ? `${vd}\n${spatialBoost}` : vd;

  const contactStruct: string[] = [];
  const groundOrPathStruct: string[] = [];
  const gripStruct: string[] = [];
  const surfaceStruct: string[] = [];
  const thresholdStruct: string[] = [];
  const pourTargetStruct: string[] = [];
  const facingOnly: string[] = [];
  const propSpans: string[] = [];

  // Contact: Verb过/贴/压/抵/咬/刺入… + 1–6 chars (not facing-only glue)
  const contactRe =
    /(?:划过|贴[在着]?|压[在着]?|抵[在着]?|咬[住着]?|含[着住]?|拂过|擦过|抹[在着]?|塞进|塞入|刺入|刺进|扎入|扎进|插入)([\u4e00-\u9fff]{1,6})/g;
  let m: RegExpExecArray | null;
  while ((m = contactRe.exec(blob)) !== null) {
    const span = m[0]!;
    const locus = m[1]!;
    if (FACING_RE.test(locus)) continue;
    contactStruct.push(span);
  }
  // 在X上/边 touching body-ish
  const onBodyRe = /在([\u4e00-\u9fff]{1,3})(?:上|边|旁|前)/g;
  while ((m = onBodyRe.exec(blob)) !== null) {
    const loc = m[1]!;
    if (/地|面|案|桌|门|场|廊/.test(loc)) continue;
    contactStruct.push(m[0]!);
  }

  // Ground / path: 从/自/在 + place; 地上…
  const groundRe =
    /(?:从|自|在)([\u4e00-\u9fff]{1,4})(?:上|下|边|旁|里|外)?|(?:地上|地面|脚边|膝前|案下|椅下)/g;
  while ((m = groundRe.exec(blob)) !== null) {
    const hit = m[0]!;
    if (FACING_RE.test(hit)) continue;
    // exclude pure 在+face
    if (/^在(?:脸|颊|唇|眼|眉)/.test(hit)) continue;
    groundOrPathStruct.push(hit);
  }

  // Grip
  const gripRe =
    /(?:手持|握[住着]?|捏[住着]?|攥[住着]?|捧[住着]?|执[住着]?|掌中|指间|胸前|身侧)[\u4e00-\u9fff]{0,4}|(?:[\u4e00-\u9fff]{1,4}(?:在胸前|在掌中|在指间))/g;
  while ((m = gripRe.exec(blob)) !== null) gripStruct.push(m[0]!);

  // Surface (writing)
  const surfRe = /(?:案上|桌上|纸上|书上|膝上|砚边|卷上|在案|在桌)/g;
  while ((m = surfRe.exec(blob)) !== null) surfaceStruct.push(m[0]!);

  // Threshold
  const thrRe = /(?:门边|门外|门内|门槛|门口|门缝|廊外|在门口)/g;
  while ((m = thrRe.exec(blob)) !== null) thresholdStruct.push(m[0]!);

  // Pour target
  const pourRe = /(?:脸上|身上|地上|脚边|案上|桌上|衣襟|袖口|泼在[\u4e00-\u9fff]{1,3}|倒在[\u4e00-\u9fff]{1,3}|浇在[\u4e00-\u9fff]{1,3})/g;
  while ((m = pourRe.exec(blob)) !== null) pourTargetStruct.push(m[0]!);

  // Facing only
  const faceRe = /侧脸|正面|正脸|背影|侧身|半侧/g;
  while ((m = faceRe.exec(blob)) !== null) facingOnly.push(m[0]!);

  // Prop-ish noun after hold/touch (declare span only) — doctrine aliases + generic suffix
  let propRe =
    /(?:休书|信笺|信纸|纸角|书信|扳指|玉佩|剑|刀|杯|盏|扇|帕|簪|酒|香)|(?:[\u4e00-\u9fff]{1,2}(?:书|信|帕|杯|剑|刀|扇|环|佩))/g;
  try {
    const { contactPropAliasAlternation } =
      require("./contactEventPolicy") as typeof import("./contactEventPolicy");
    const alt = contactPropAliasAlternation();
    if (alt) {
      propRe = new RegExp(
        `(?:${alt})|(?:[\\u4e00-\\u9fff]{1,2}(?:书|信|帕|杯|剑|刀|扇|环|佩|簪|酒|香))`,
        "g",
      );
    }
  } catch {
    /* fallback regex */
  }
  while ((m = propRe.exec(blob)) !== null) propSpans.push(m[0]!);

  const uniq = (a: string[]) => [...new Set(a.filter(Boolean))];
  return {
    contactStruct: uniq(contactStruct),
    groundOrPathStruct: uniq(groundOrPathStruct),
    gripStruct: uniq(gripStruct),
    surfaceStruct: uniq(surfaceStruct),
    thresholdStruct: uniq(thresholdStruct),
    pourTargetStruct: uniq(pourTargetStruct),
    facingOnly: uniq(facingOnly),
    propSpans: uniq(propSpans),
  };
}

function loadDetailCfg(): DetailCfg {
  const doctrine = loadLiteraryIntentDoctrine() as ReturnType<typeof loadLiteraryIntentDoctrine> & {
    literaryDetailQuality?: DetailCfg;
  };
  return doctrine.literaryDetailQuality ?? {};
}

function isFaceCu(shotSize?: string | null, cfg?: DetailCfg): boolean {
  const s = String(shotSize ?? "").toLowerCase();
  if (!s) return false;
  return (cfg?.faceCuShotSizes ?? ["特写", "大特", "cu", "ecu"]).some((x) =>
    s.includes(String(x).toLowerCase()),
  );
}

function hitsLex(text: string, lex?: string[]): string[] {
  const out: string[] = [];
  for (const t of lex ?? []) if (t && text.includes(t)) out.push(t);
  return [...new Set(out)];
}

const DEFAULT_FAMILY_SEEDS: Record<string, string[]> = {
  touch_face: ["划", "贴", "压", "抵", "拂"],
  displace: ["扔", "抛", "丢", "摔", "掷", "甩"],
  transfer: ["递", "接", "交给", "塞给", "塞进", "接过"],
  grasp: ["抱", "搂", "拽", "拉住", "按住", "扼", "掐", "抓袖"],
  pour_splash: ["泼", "泼洒", "倾倒", "浇", "淋", "洒向", "倒向", "倒在", "泼在", "浇在"],
  write: ["写字", "抄书", "书写", "落笔", "运笔", "题字"],
  door: ["推门", "开门", "关门", "掩门", "踹门", "破门"],
  ground_pickup: ["捡", "捡起", "拾", "拾起", "弯腰", "俯身", "蹲"],
  hold: ["持", "握", "捏", "攥", "捧", "执", "手持"],
  tear_wipe: ["撕", "撕开", "拭", "拭泪", "抹泪", "擦泪"],
  micro_wound: ["血珠", "渗血", "咬唇", "紧咬", "咬破", "泪珠"],
  intense_expr: ["怒目", "冷笑", "咬牙", "泪崩", "哽咽", "颤抖", "瞪"],
};

export function classifyVerbFamilies(
  visualDescription?: string | null,
  opts?: { castNames?: string[] | null; extraLexicon?: string[] | null },
): VerbFamilies {
  const vd = String(visualDescription ?? "");
  const cfg = loadDetailCfg();
  const seeds = { ...DEFAULT_FAMILY_SEEDS, ...(cfg.familySeeds ?? {}) };
  const verbs = extractVdDeclaredActionVerbs(vd, {
    castNames: opts?.castNames,
    extraLexicon: opts?.extraLexicon,
  });
  const blob = `${vd}\n${verbs.join("\n")}`;

  const hasSeed = (key: string) => (seeds[key] ?? []).some((s) => s && blob.includes(s));

  return {
    touch_face: hasSeed("touch_face") || /划过|贴[在着]|压[在着]/.test(vd),
    displace: hasSeed("displace"),
    transfer: hasSeed("transfer") || /塞进|塞入/.test(vd),
    grasp: hasSeed("grasp"),
    pour_splash: hasSeed("pour_splash") && !/倒地|倒下|颠倒/.test(vd),
    write: hasSeed("write"),
    door: hasSeed("door") || /推门|开门/.test(vd),
    micro_wound: hasSeed("micro_wound") || hitsLex(vd, cfg.microWoundLexicon).length > 0,
    intense_expr: hasSeed("intense_expr") || hitsLex(vd, cfg.intenseExprLexicon).length > 0,
    ground_pickup: hasSeed("ground_pickup"),
    hold: hasSeed("hold"),
    tear_wipe: hasSeed("tear_wipe"),
  };
}

function slotOk(
  name: string,
  slots: StructuralSlots,
  hasProp: boolean,
  ctx?: { vd?: string; cfg?: DetailCfg },
): boolean {
  switch (name) {
    case "contactStruct":
    case "contactLocus":
      return slots.contactStruct.length > 0;
    case "groundOrPathStruct":
    case "groundLocus":
      return slots.groundOrPathStruct.length > 0;
    case "gripStruct":
    case "spatialOrGrip":
      return slots.gripStruct.length > 0;
    case "surfaceStruct":
    case "surfaceLocus":
      return slots.surfaceStruct.length > 0;
    case "thresholdStruct":
    case "thresholdLocus":
      return slots.thresholdStruct.length > 0;
    case "pourTarget":
    case "pourTargetStruct":
      return slots.pourTargetStruct.length > 0;
    case "hasProp":
      return hasProp;
    case "propTouchVerb":
      return slots.contactStruct.length > 0;
    case "contactRoleXor":
      return hasContactRoleXorSatisfaction(ctx?.vd, ctx?.cfg);
    case "woundVisible": {
      const vd = String(ctx?.vd ?? "");
      const lex = ctx?.cfg?.woundVisibleLexicon ?? [];
      return lex.some((t) => t && vd.includes(t)) || /浅痕|红痕|划痕可见|渗血|血珠|血痕/.test(vd);
    }
    case "propReadable": {
      const vd = String(ctx?.vd ?? "");
      return /字迹|可辨|可读|笺面|纸纹|休书字|信面可见/.test(vd);
    }
    default:
      return false;
  }
}

function familyActive(fam: VerbFamilies, key: string): boolean {
  return Boolean((fam as Record<string, boolean>)[key]);
}

/** Audit VD — structure-first; lexicon boost only when configured. */
export function auditLiteraryDetailQuality(input: {
  visualDescription?: string | null;
  shotSize?: string | null;
  spatialRelation?: string | null;
  castNames?: string[] | null;
  extraLexicon?: string[] | null;
}): LitDetailAudit {
  const cfg = loadDetailCfg();
  const vd = String(input.visualDescription ?? "").trim();
  const emptySlots = (): StructuralSlots => ({
    contactStruct: [],
    groundOrPathStruct: [],
    gripStruct: [],
    surfaceStruct: [],
    thresholdStruct: [],
    pourTargetStruct: [],
    facingOnly: [],
    propSpans: [],
  });
  const emptyFam = (): VerbFamilies => ({
    touch_face: false,
    displace: false,
    transfer: false,
    grasp: false,
    pour_splash: false,
    write: false,
    door: false,
    micro_wound: false,
    intense_expr: false,
    ground_pickup: false,
    hold: false,
    tear_wipe: false,
  });

  if (!vd) {
    return {
      ok: true,
      findings: [],
      slots: emptySlots(),
      families: emptyFam(),
      atoms: {
        hasProp: false,
        contactLocus: [],
        spatialOrGrip: [],
        groundLocus: [],
        facing: [],
        faceCuOrFaceMention: false,
      },
    };
  }

  const slots = detectStructuralSlots(vd, input.spatialRelation);
  // Lexicon boost (optional) — merge into structure spans when present in VD
  if (cfg.lexiconIsBoostOnly !== false) {
    for (const x of hitsLex(vd, cfg.contactLocusLexicon)) {
      if (!slots.contactStruct.some((s) => s.includes(x))) slots.contactStruct.push(x);
    }
    for (const x of hitsLex(vd, cfg.groundLocusLexicon)) {
      if (!slots.groundOrPathStruct.includes(x)) slots.groundOrPathStruct.push(x);
    }
    for (const x of hitsLex(vd, cfg.spatialOrGripLexicon)) {
      if (!slots.gripStruct.includes(x)) slots.gripStruct.push(x);
    }
    for (const x of hitsLex(vd, cfg.surfaceLocusLexicon)) {
      if (!slots.surfaceStruct.includes(x)) slots.surfaceStruct.push(x);
    }
    for (const x of hitsLex(vd, cfg.thresholdLocusLexicon)) {
      if (!slots.thresholdStruct.includes(x)) slots.thresholdStruct.push(x);
    }
    for (const x of hitsLex(vd, cfg.pourTargetLexicon)) {
      if (!slots.pourTargetStruct.includes(x)) slots.pourTargetStruct.push(x);
    }
    for (const x of hitsLex(vd, cfg.propSignalLexicon)) {
      if (!slots.propSpans.includes(x)) slots.propSpans.push(x);
    }
  }

  // Facing must NOT count as ground/contact for fake-green
  const facing = hitsLex(vd, cfg.facingLexicon).length
    ? hitsLex(vd, cfg.facingLexicon)
    : slots.facingOnly;
  slots.facingOnly = facing;

  const families = classifyVerbFamilies(vd, {
    castNames: input.castNames,
    extraLexicon: input.extraLexicon,
  });
  const faceCu = isFaceCu(input.shotSize, cfg);
  const faceMention = hitsLex(vd, cfg.faceMentionLexicon).length > 0 || facing.length > 0;
  const hasProp = slots.propSpans.length > 0;
  const faceCuOrFaceMention = faceCu || faceMention;

  const findings: LitDetailFinding[] = [];
  const matrix =
    cfg.slotMatrix ??
    ([
      {
        id: "dual_contact_role_xor",
        findingId: "DEX-LIT-CONTACT-XOR",
        severityOnCu: "BLOCK",
        severityElse: "BLOCK",
        whenAllFamilies: ["touch_face", "micro_wound"],
        requireAnySlots: ["contactRoleXor"],
        message: "脸部道具触碰与口部微创同镜须互斥句或拆镜",
      },
      {
        id: "prop_face_needs_contact",
        findingId: "DEX-LIT-CONTACT",
        severityOnCu: "BLOCK",
        severityElse: "WARN",
        whenFamilies: ["touch_face"],
        whenShot: ["faceCuOrFaceMention", "hasProp"],
        requireAnySlots: ["contactStruct"],
        message: "脸部/特写含道具须声明接触落点结构（如划过面颊），禁悬浮漂移",
      },
      {
        id: "face_prop_contact",
        findingId: "DEX-LIT-CONTACT",
        severityOnCu: "BLOCK",
        severityElse: "WARN",
        whenShot: ["faceCuOrFaceMention", "hasProp"],
        requireAnySlots: ["contactStruct", "gripStruct"],
        message: "脸部/特写含道具须声明接触或握持落点，禁悬浮漂移",
      },
      {
        id: "ground_action_needs_locus",
        findingId: "DEX-LIT-ANCHOR",
        severityOnCu: "BLOCK",
        severityElse: "BLOCK",
        whenFamilies: ["ground_pickup"],
        requireAnySlots: ["groundOrPathStruct", "contactStruct"],
        message: "捡拾/俯身类须声明地面/路径落点；朝向词不算锚点",
      },
      {
        id: "micro_wound_needs_locus",
        findingId: "DEX-LIT-CONTACT",
        severityOnCu: "BLOCK",
        severityElse: "WARN",
        whenFamilies: ["micro_wound"],
        requireAnySlots: ["contactStruct"],
        message: "渗血/咬唇等微创须声明身体落点结构",
      },
      {
        id: "hold_prop_needs_grip",
        findingId: "DEX-LIT-ANCHOR",
        severityOnCu: "WARN",
        severityElse: "WARN",
        whenFamilies: ["hold"],
        whenShot: ["hasProp"],
        requireAnySlots: ["gripStruct", "contactStruct"],
        message: "持握类须声明握持落点，禁道具悬空",
      },
      {
        id: "pass_transfer_needs_locus",
        findingId: "DEX-LIT-ANCHOR",
        severityOnCu: "WARN",
        severityElse: "WARN",
        whenFamilies: ["transfer"],
        requireAnySlots: ["gripStruct", "contactStruct", "groundOrPathStruct"],
        message: "递接/塞入须声明交接落点",
      },
      {
        id: "drop_throw_needs_locus",
        findingId: "DEX-LIT-ANCHOR",
        severityOnCu: "BLOCK",
        severityElse: "BLOCK",
        whenFamilies: ["displace"],
        requireAnySlots: ["groundOrPathStruct", "gripStruct", "contactStruct"],
        message: "扔抛摔丢须声明落点，禁无方向漂移",
      },
      {
        id: "tear_wipe_needs_contact",
        findingId: "DEX-LIT-CONTACT",
        severityOnCu: "BLOCK",
        severityElse: "WARN",
        whenFamilies: ["tear_wipe"],
        requireAnySlots: ["contactStruct", "hasProp"],
        message: "撕/拭泪须声明身体落点或明确道具对象",
      },
      {
        id: "intense_expr_needs_face_atom",
        findingId: "DEX-LIT-EXPR",
        severityOnCu: "WARN",
        severityElse: "WARN",
        whenFamilies: ["intense_expr"],
        whenShot: ["faceCuOrFaceMention"],
        requireAnySlots: ["contactStruct"],
        message: "特写强表情须落到眉/眼/唇等部位",
      },
      {
        id: "pour_splash_needs_target",
        findingId: "DEX-LIT-ANCHOR",
        severityOnCu: "BLOCK",
        severityElse: "BLOCK",
        whenFamilies: ["pour_splash"],
        requireAnySlots: ["pourTargetStruct", "groundOrPathStruct", "contactStruct"],
        message: "泼洒倾倒须声明承受落点",
      },
      {
        id: "grasp_body_needs_contact",
        findingId: "DEX-LIT-CONTACT",
        severityOnCu: "BLOCK",
        severityElse: "WARN",
        whenFamilies: ["grasp"],
        requireAnySlots: ["contactStruct", "gripStruct"],
        message: "抱拽按掐须声明身体接触落点",
      },
      {
        id: "write_needs_surface",
        findingId: "DEX-LIT-ANCHOR",
        severityOnCu: "WARN",
        severityElse: "WARN",
        whenFamilies: ["write"],
        requireAnySlots: ["surfaceStruct", "gripStruct", "hasProp"],
        message: "书写/抄书须声明承写面或笔纸物象",
      },
      {
        id: "door_needs_threshold",
        findingId: "DEX-LIT-ANCHOR",
        severityOnCu: "WARN",
        severityElse: "WARN",
        whenFamilies: ["door"],
        requireAnySlots: ["thresholdStruct", "gripStruct"],
        message: "推门/开门须声明门槛空间",
      },
    ] as SlotMatrixRow[]);

  const shotFlags: Record<string, boolean> = {
    faceCuOrFaceMention,
    hasProp,
    faceCu,
  };

  for (const row of matrix) {
    if (row.whenFamilies?.length) {
      if (!row.whenFamilies.some((f) => familyActive(families, f))) continue;
    }
    if (row.whenAllFamilies?.length) {
      if (!row.whenAllFamilies.every((f) => familyActive(families, f))) continue;
    }
    if (row.whenShot?.length) {
      if (!row.whenShot.every((f) => shotFlags[f])) continue;
    }
    const req = row.requireAnySlots ?? [];
    const slotCtx = { vd, cfg };
    const missingSlots = req.filter((s) => !slotOk(s, slots, hasProp, slotCtx));
    if (missingSlots.length < req.length && req.some((s) => slotOk(s, slots, hasProp, slotCtx))) continue;
    if (!req.length) continue;
    if (req.some((s) => slotOk(s, slots, hasProp, slotCtx))) continue;

    const severity =
      (faceCu ? row.severityOnCu : row.severityElse) ?? (faceCu ? "BLOCK" : "WARN");
    findings.push({
      id: row.findingId ?? "DEX-LIT-DETAIL",
      ruleId: row.id,
      severity,
      message: row.message ?? `文学细节不足：缺 ${missingSlots.join("/")}`,
      missing: missingSlots,
      missingSlots,
      present: [
        ...slots.contactStruct.map((x) => `contact:${x}`),
        ...slots.groundOrPathStruct.map((x) => `ground:${x}`),
        ...slots.gripStruct.map((x) => `grip:${x}`),
        ...slots.propSpans.map((x) => `prop:${x}`),
        ...facing.map((x) => `facing:${x}`),
      ],
    });
  }

  // Contact-event SSOT: verb∩propClass must keep prop alias readable in VD (scar alone ≠ prop)
  try {
    const { isContactEventVd, matchContactEventVd, textHasPropInFrame } =
      require("./contactEventPolicy") as typeof import("./contactEventPolicy");
    if (isContactEventVd(vd)) {
      const m = matchContactEventVd(vd);
      if (!textHasPropInFrame(vd, m)) {
        findings.push({
          id: "DEX-PROP-IN-FRAME",
          ruleId: "contact_event_prop_in_frame",
          severity: faceCu ? "BLOCK" : "BLOCK",
          message: `接触事件缺道具入画声明（${m.propCanonical || m.propAlias || "道具"}）；浅痕≠道具；须 Confirm 增强或重出带道具静照`,
          missing: ["propInFrame", "contactGeom"],
          missingSlots: ["propInFrame", "contactGeom"],
          present: slots.propSpans.map((x) => `prop:${x}`),
        });
      }
    }
  } catch {
    /* optional */
  }

  // Special: face+prop without touch_face family still caught by face_prop_contact
  // Deduplicate by ruleId
  const seen = new Set<string>();
  const deduped = findings.filter((f) => {
    const k = `${f.id}:${f.ruleId}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return {
    ok: !deduped.some((f) => f.severity === "BLOCK"),
    findings: deduped,
    slots,
    families,
    atoms: {
      hasProp,
      contactLocus: slots.contactStruct,
      spatialOrGrip: slots.gripStruct,
      groundLocus: slots.groundOrPathStruct,
      facing,
      faceCuOrFaceMention,
    },
  };
}

export function extractDeclaredContactLoci(visualDescription?: string | null): string[] {
  const slots = detectStructuralSlots(visualDescription);
  const loci: string[] = [];
  for (const s of slots.contactStruct) {
    const m = s.match(/(?:划过|贴[在着]?|压[在着]?|抵[在着]?|咬|含|拂过|擦过|抹|塞进|塞入|在)([\u4e00-\u9fff]{1,3})/);
    if (m?.[1] && !FACING_RE.test(m[1])) loci.push(m[1]);
    else if (s.length <= 3 && !FACING_RE.test(s)) loci.push(s);
  }
  return [...new Set(loci)];
}

export function extractDeclaredSpatialAnchors(visualDescription?: string | null): string[] {
  const slots = detectStructuralSlots(visualDescription);
  return [
    ...slots.groundOrPathStruct,
    ...slots.surfaceStruct,
    ...slots.thresholdStruct,
    ...slots.pourTargetStruct,
    ...slots.gripStruct,
  ];
}

export function stillPrimaryLookLockLine(
  charCrefCount: number,
  primaryName?: string | null,
): string | null {
  const lock = loadDetailCfg().lookLock;
  const ge = lock?.whenCharCrefGe ?? 2;
  if (charCrefCount < ge) return null;
  const base = lock?.lineZh?.trim() || "";
  const name = String(primaryName ?? "").trim();
  const named =
    name.length >= 2 && lock?.primaryNameTemplate
      ? lock.primaryNameTemplate.replace(/\{NAME\}/g, name)
      : "";
  const parts = [base, named].filter(Boolean);
  return parts.length ? parts.join("") : null;
}

export function isLiteraryDetailLlmFillEnabled(meta?: { literaryDetailLlmFill?: boolean }): boolean {
  const cfg = loadDetailCfg();
  if (meta?.literaryDetailLlmFill === true) return true;
  return Boolean(cfg.llmFillPolicy?.enabledByDefault);
}

/** Test helper */
export function resetLiteraryDetailCache(): void {
  resetLiteraryIntentDoctrineCache();
}
