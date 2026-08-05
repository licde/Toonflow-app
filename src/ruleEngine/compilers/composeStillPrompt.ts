/**
 * Storyboard still prompt composer — description fidelity first (plan).
 * Stack: description body → entity anchors → identity lock → recipe at end (recipe excluded from Visual measure).
 */
import { checkQp02VisualDescription } from "../bundle/visualQualityAudit";
import { resolveAssetTier, type AssetTier } from "../bundle/assetVisualBrief";
import { precheckContentPolicy } from "./contentPolicyAdapter";
import { detectAndStripQfExpr } from "./qfExprGate";
import {
  STILL_HQ_COMPOSITION_CONTRACT,
  STILL_HQ_FIRST_FRAME_RECIPE_ZH_EN,
  parseStillMetaFromReason,
  type StillQualityMeta,
} from "./stillQuality";
import type { BurnNextStep } from "./burnGateEnvelope";
import { buildPrimaryBlock } from "./primaryBlock";
import {
  resolveShotIdentityBinding,
  slimEntityAnchors,
  compressPersonalityLine,
} from "./resolveShotIdentityBinding";
import { extractDescPredicates, predicateAnchorTokens, type DescPredicatePack } from "./extractDescPredicates";
import { assertStillDescCoverage } from "./stillDescCoverage";
import { resolveStillBgPolicy, type StillBgPolicy } from "./stillBgPolicy";
import { deriveShotModalityIntent } from "./shotModalityIntent";
import { lintStillPromptBody } from "./stillPromptLint";
import { deriveStillGenerationObjective, applyGenerationObjectiveToPrompt } from "./stillGenerationObjective";
import { deriveGenerationContract, type GenerationContract } from "../design/deriveGenerationContract";
import {
  applyContinuityPolicy,
  healStillRecipePolicy,
  loadStillRecipePolicy,
  pickIdentityLockLines,
} from "./stillRecipePolicy";
import {
  HAND_CU_HQ_RECIPE,
  HAND_CU_IDENTITY_LOCK,
  PROP_CU_HQ_RECIPE,
  resolveStillRecipeAdapt,
  type StillRecipeAdapt,
} from "./stillShotRecipeAdapt";

/** IR tails may follow ASCII space OR CJK punctuation (。，；) — both must strip. */
const IDENTITY_TOKEN_RE =
  /(?:^|[\s,，。；;：:\u3000]+)--(?:cref|sref)\s+[^\n]*?(?=(?:[\s,，。；;：:\u3000]+--(?:cref|sref|ar)\b)|$)|(?:^|[\s,，。；;：:\u3000]+)--ar\s+\S+/gi;

const MOTION_ONLY_RE =
  /(?:\b(?:slow\s*pan|dolly(?:\s*in)?|track\s*in|track\s*out|push\s*in|pull\s*out|zoom\s*in|zoom\s*out|handheld|orbit|crane|whip\s*pan|camera\s*moves?)\b|镜头推进|镜头拉远|缓推|缓拉|跟拍|摇镜|运镜)/gi;

const CONTRACT_NOISE_RE =
  /vertical\s*9:16\s*safe\s*area[\s\S]*?(?:video\s*first\s*frame|do not blend faces into background)/gi;

const RECIPE_ZH_NOISE_RE =
  /竖屏9:16安全区构图[\s\S]*?禁止重塑五官身份。?/g;

const NOISE_TOKEN_RE =
  /\b(?:realpeople_ancient_chinese|MS|power\s*blocking)\b/gi;

export type ComposeMode = "full" | "refine" | "fidelity";

export interface ComposeStillCharHint {
  code?: string;
  name?: string;
  tier?: AssetTier;
  personality?: string;
  hasImage?: boolean;
  kind?: "character" | "scene";
}

export interface ComposeStillContext {
  rawPrompt?: string | null;
  artStyle?: string | null;
  videoRatio?: string | null;
  visualDescription?: string | null;
  videoDesc?: string | null;
  promptFromStoryboard?: string | null;
  compiledImagePrompt?: string | null;
  shotSize?: string | null;
  neighborShotSize?: string | null;
  /** Cross-shot continuity fragment from continuityFrom + neighbor soft-ref */
  continuityInject?: string | null;
  spatialRelation?: string | null;
  /** Design color temp (direct or from sceneColorLock) */
  colorTemp?: string | null;
  /** Scene display name for colorLock key (e.g. 寝殿) */
  sceneName?: string | null;
  sceneColorLock?: Record<
    string,
    string | { colorTemp?: string; kelvin?: string | number; name?: string } | undefined
  > | null;
  foreground?: string | null;
  background?: string | null;
  microExpression?: string | null;
  emotion?: string | number | null;
  splitHint?: string | null;
  reactionAction?: string | null;
  dialogueDominantSpeaker?: boolean | null;
  dialogueBeat?: string | null;
  /** Speakers from package dialogue (for multi-char identity gate) */
  dialogueSpeakers?: string[] | null;
  sceneCode?: string | null;
  characters?: ComposeStillCharHint[];
  sceneAssets?: ComposeStillCharHint[];
  strengthen?: Record<string, string> | null;
  qualityMode?: "hq_update" | "draft";
  requireLeadAssetImage?: boolean;
  referenceUrlCount?: number;
  /** Prior composed body for refine (without recipe/tokens) */
  previousVisualBody?: string | null;
  /** Gated untilClear heal inject lines (from prior stillMeta) — must pass primary seal */
  gatedHealInject?: string[] | null;
  /** Prior primaryIntentSeal — reseal when literaryHash drifts */
  priorPrimaryIntentSeal?: import("./primaryIntentSeal").PrimaryIntentCarrierSet | null;
  /** Sibling / episode VDs — diagnostic only; must NOT legislate hardConstraint/prop (SingleShotClosed) */
  episodeVisualDescriptions?: string[] | null;
  episodeShot?: Record<string, unknown> | null;
  /** Package↔row bind (SingleShotClosedCompose) */
  bindOk?: boolean;
  bindCode?: string | null;
  boundShotIndex?: number | null;
  closedCompose?: boolean;
  bgBlur?: boolean;
  clientId?: string | null;
}

export interface ComposeStillOptions {
  mode?: ComposeMode;
}

export interface ComposeStillResult {
  ok: boolean;
  prompt: string;
  visualBody: string;
  didSynthesize: boolean;
  scrubbed: boolean;
  composeMode: ComposeMode;
  sources: string[];
  warnings: string[];
  entityAnchors: string[];
  blockReason?: string;
  primaryNextStep?: BurnNextStep;
  userMessage?: string;
  ctaLabel?: string;
  compositionContractApplied: boolean;
  complianceHit: boolean;
  qp02Blocked: boolean;
  missingLeadAsset: boolean;
  dirtyInput: boolean;
  /** Description predicate coverage (rule gate) */
  descCoverageOk?: boolean;
  descCoverageMissing?: string[];
  orderedCrefCodes?: string[];
  /** Background policy: drop/demote SCENE refs; keep only for establishing */
  bgPolicy?: StillBgPolicy;
  excludeScene?: boolean;
  /** soft_env: keep one SCENE plate after identity */
  keepSoftEnvRef?: boolean;
  /** Continuity: must survive via own slot or bake into identity */
  softEnvContinuity?: "must" | "optional" | "none";
  bgMode?: "keep_plate" | "soft_env" | "atmosphere_only";
  /** Refs contract latch (T2I-first drop softEnv / identity face crop) */
  stillRefsContract?: import("./stillRefsContract").StillRefsContract;
  softEnvBakedIntoIdentity?: boolean;
  propSource?: "asset" | "fe" | "synth" | string;
  refsRoles?: string[];
  droppedSoftEnv?: boolean;
  promptLintConflicts?: string[];
  generationContract?: GenerationContract;
  bgPolicyReason?: string;
  /** Canvas/event: PROP soft plate unresolved (honest) */
  propPlateMissing?: boolean;
  atomMisses?: string[];
  refsSig?: string;
  /** Recipe policy self-heal ids (FE / reverse audit) */
  recipeHeals?: string[];
  /** First-frame literary stillPhase SSOT */
  stillPhase?: string | null;
}

export function stripIdentityTokens(prompt: string): { body: string; tokenTail: string } {
  const raw = String(prompt ?? "");
  const tokens: string[] = [];
  const body = raw
    .replace(IDENTITY_TOKEN_RE, (m) => {
      tokens.push(m.trim().replace(/,\s*$/, ""));
      return " ";
    })
    .replace(/\s{2,}/g, " ")
    .replace(/\s+,/g, ",")
    .trim();
  const tokenTail = cleanTokenTail(
    tokens
      .map((t) => t.replace(/,\s*$/, "").replace(/\s{2,}/g, " ").trim())
      .filter(Boolean)
      .join(" "),
  );
  return { body, tokenTail };
}

export function scrubStillPromptNoise(text: string): { cleaned: string; scrubbed: boolean } {
  const before = String(text ?? "");
  let cleaned = before
    .replace(CONTRACT_NOISE_RE, " ")
    .replace(RECIPE_ZH_NOISE_RE, " ")
    .replace(new RegExp(STILL_HQ_COMPOSITION_CONTRACT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), " ")
    .replace(NOISE_TOKEN_RE, " ")
    .replace(/(?:^|\s)[:=]{1,}(?=\s|$)/g, " ")
    .replace(/(?:^|\s)\d{1,3}(?=\s|$)/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return { cleaned, scrubbed: cleaned !== before.trim() };
}

/** Visual measure excludes recipe/contract boilerplate. */
export function measureVisualBody(text: string): { chars: number; ok: boolean } {
  const scrubbed = scrubStillPromptNoise(String(text ?? "")).cleaned;
  const withoutRecipe = scrubbed
    .replace(CONTRACT_NOISE_RE, " ")
    .replace(RECIPE_ZH_NOISE_RE, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  const chars = withoutRecipe.replace(/\s+/g, "").length;
  return { chars, ok: chars >= 12 || withoutRecipe.split(/\s+/).filter(Boolean).length >= 8 };
}

export function stripMotionOnlyForStill(text: string): string {
  return String(text ?? "")
    .replace(MOTION_ONLY_RE, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function isDirtyStillPrompt(prompt: string): boolean {
  const raw = String(prompt ?? "");
  if (!raw.trim()) return true;
  const { body } = stripIdentityTokens(raw);
  const scrubbed = scrubStillPromptNoise(body).cleaned;
  if (/vertical\s*9:16\s*safe\s*area/i.test(body) && !measureVisualBody(scrubbed).ok) return true;
  if ((body.match(/--cref/gi) ?? []).length >= 2) return true;
  if (/:[:=\s]{3,}/.test(raw) || /\bMS\b/.test(raw)) return true;
  return !measureVisualBody(scrubbed).ok && /safe area|power blocking|9:16安全区/i.test(body);
}

export function assertStillPromptClean(prompt: string): { ok: boolean; reason?: string } {
  if (isDirtyStillPrompt(prompt)) {
    return { ok: false, reason: "still prompt looks like contract shell or noise" };
  }
  return { ok: true };
}

function cleanTokenTail(
  tokenTail: string,
  orderedCrefs?: string[],
  opts?: { omitSref?: boolean },
): string {
  // Fix glued vendor tokens: `--cref CHAR-X--sref SCENE` → spaced
  const normalized = String(tokenTail ?? "").replace(
    /([A-Za-z]+-[A-Za-z0-9]+)--(sref|cref|ar)\b/gi,
    "$1 --$2",
  );
  const crefs = new Set<string>();
  const srefs = new Set<string>();
  let ar = "";
  normalized
    .replace(/--sref\s+([^\s,，。；;]+)[,，。；;]*/gi, (_, c: string) => {
      srefs.add(String(c).replace(/[,，。；;]+$/g, ""));
      return " ";
    })
    .replace(/--cref\s+((?:[A-Za-z]+-[A-Za-z0-9]+\s*)+)/gi, (_, block: string) => {
      for (const c of block.trim().split(/\s+/)) {
        if (c) crefs.add(c.replace(/[,，。；;]+$/g, "").toUpperCase());
      }
      return " ";
    })
    .replace(/--ar\s+(\S+)/gi, (_, v: string) => {
      ar = String(v).replace(/[,，。；;]+$/g, "");
      return " ";
    });
  const parts: string[] = [];
  // SCENE-* must never stay in --cref; move to --sref
  for (const c of [...crefs]) {
    if (/^SCENE-/i.test(c)) {
      crefs.delete(c);
      srefs.add(c);
    }
  }
  const ordered = (orderedCrefs ?? []).map((c) => c.toUpperCase()).filter((c) => /^CHAR-/i.test(c));
  if (ordered.length) {
    for (const c of [...crefs]) {
      if (!ordered.includes(c) && /^CHAR-/i.test(c)) ordered.push(c);
    }
    parts.push(`--cref ${ordered.join(" ")}`);
  } else if (crefs.size) {
    const onlyChar = [...crefs].filter((c) => /^CHAR-/i.test(c));
    if (onlyChar.length) parts.push(`--cref ${onlyChar.join(" ")}`);
  }
  if (srefs.size && !opts?.omitSref) parts.push(`--sref ${[...srefs].join(" ")}`);
  if (ar) parts.push(`--ar ${ar}`);
  return parts.join(" ").replace(/\s{2,}/g, " ").trim();
}

/** Test/helper: rewrite token tail so SCENE-* leaves --cref for --sref. */
export function relocateSceneCrefsInTokenTail(tokenTail: string): string {
  return cleanTokenTail(tokenTail);
}

const SHOT_SIZE_ZH: Record<string, string> = {
  ecu: "大特写",
  cu: "特写",
  mcu: "中特写",
  ms: "中景",
  mls: "中全景",
  ls: "全景",
  ws: "远景",
  els: "大远景",
};

/** Token-like art styles must not enter Chinese body as 画风. */
export function isArtStyleToken(style: string): boolean {
  const s = String(style ?? "").trim();
  if (!s) return true;
  if (/^realpeople[_-]/i.test(s)) return true;
  if (/^[a-z0-9]+([_-][a-z0-9]+)+$/i.test(s) && !/[\u4e00-\u9fff]/.test(s)) return true;
  return false;
}

export function formatShotSizeZh(shotSize: string | null | undefined): string | null {
  const raw = String(shotSize ?? "").trim();
  if (!raw) return null;
  if (/[\u4e00-\u9fff]/.test(raw)) return raw.slice(0, 12);
  const key = raw.toLowerCase().replace(/\s+/g, "");
  return SHOT_SIZE_ZH[key] ?? null;
}

/** Extract concrete noun-like anchors — person names only from extraNames (casting sheet). */
export function extractEntityAnchors(text: string, extraNames: string[] = []): string[] {
  const t = String(text ?? "");
  const anchors = new Set<string>();
  for (const n of extraNames) {
    const name = String(n ?? "").trim();
    if (name.length >= 2) anchors.add(name.slice(0, 8));
  }
  // Props / scene nouns only — never 沈[汉]{1,3} invent; avoid name+prop glue
  const zhNouns =
    t.match(
      /(?:祠堂|廊桥|扳指|烛火|墨滴|银簪|手帕|帕子|窗格|玉扳指)/g,
    ) ?? [];
  for (const n of zhNouns) anchors.add(n.slice(0, 8));
  const chunks =
    t.match(
      /(?:祠堂|廊下|廊桥|扳指|烛火|玉扳指|跪地|对峙|望雨|发丝|窗格|侧光|墨滴|纸上|眼眶|银簪)/g,
    ) ?? [];
  for (const c of chunks) anchors.add(c);
  return [...anchors].slice(0, 14);
}

function pickPrimaryDescription(ctx: ComposeStillContext): { text: string; source: string; trimmed?: boolean } | null {
  const { shouldWarnOneBeat } = require("./stillIdentitySsot") as typeof import("./stillIdentitySsot");
  const rejectMulti = (text: string): boolean => shouldWarnOneBeat(text);
  try {
    const { resolveLiteraryStillPrompt } =
      require("./literaryStillSsot") as typeof import("./literaryStillSsot");
    const lit = resolveLiteraryStillPrompt({
      visualDescription: ctx.visualDescription,
      compiledImagePrompt: ctx.compiledImagePrompt,
      background: ctx.background,
      spatialRelation: ctx.spatialRelation,
    });
    if (lit.literary && !rejectMulti(lit.literary)) {
      return {
        text: lit.literary.slice(0, 800),
        source:
          lit.source === "imagePrompt"
            ? "shot.compiledImagePrompt"
            : lit.source === "union"
              ? "shot.literaryUnion"
              : "shot.visualDescription",
        trimmed: lit.literary.length > 800,
      };
    }
  } catch {
    /* fall through */
  }
  const vd = String(ctx.visualDescription ?? "").trim();
  if (vd) {
    if (rejectMulti(vd)) return null;
    return { text: vd, source: "shot.visualDescription", trimmed: false };
  }
  const compiled = scrubStillPromptNoise(stripIdentityTokens(String(ctx.compiledImagePrompt ?? "")).body).cleaned;
  if (compiled && measureVisualBody(compiled).ok) {
    if (rejectMulti(compiled)) return null;
    return { text: compiled.slice(0, 360), source: "shot.compiledImagePrompt", trimmed: false };
  }
  const sb = scrubStillPromptNoise(stripIdentityTokens(String(ctx.promptFromStoryboard ?? "")).body).cleaned;
  if (sb && measureVisualBody(sb).ok) {
    if (rejectMulti(sb)) return null;
    return { text: sb.slice(0, 300), source: "storyboard.prompt", trimmed: false };
  }
  return null;
}

function oneBeatBlockResult(
  warnings: string[],
  sources: string[],
  scrubbed: boolean,
  dirtyInput: boolean,
  mode: ComposeMode,
  overrideMsg?: string,
): ComposeStillResult {
  const primaryBlock = buildPrimaryBlock("split_shot", {
    stage: "prompt",
    userMessageOverride: overrideMsg ?? "画面描写多拍，须智能拆镜后再 compose，禁止 trim/旧 prompt 假绿",
  });

  return {
    ok: false,
    prompt: "",
    visualBody: "",
    didSynthesize: false,
    scrubbed,
    composeMode: mode,
    sources,
    warnings: [...warnings, "DEX-STILL-ONEBEAT"],
    entityAnchors: [],
    blockReason: "DEX-STILL-ONEBEAT",
    primaryNextStep: primaryBlock.primaryNextStep,
    userMessage: primaryBlock.userMessage,
    ctaLabel: primaryBlock.ctaLabel,
    compositionContractApplied: false,
    complianceHit: false,
    qp02Blocked: false,
    missingLeadAsset: false,
    dirtyInput,
  };
}

/** Leak-net: CU×cast → split_shot reverse (no HTTP batch death; no silent single_hero green). */
function cuCastBlockResult(
  warnings: string[],
  sources: string[],
  scrubbed: boolean,
  dirtyInput: boolean,
  mode: ComposeMode,
  message: string,
): ComposeStillResult {
  const primaryBlock = buildPrimaryBlock("split_shot", {
    stage: "prompt",
    userMessageOverride: message,
  });
  return {
    ok: false,
    prompt: "",
    visualBody: "",
    didSynthesize: false,
    scrubbed,
    composeMode: mode,
    sources: [...sources, "identity.cuCastConflict"],
    warnings: [...warnings, "DEX-STILL-CU-CAST"],
    entityAnchors: [],
    blockReason: "DEX-STILL-CU-CAST",
    primaryNextStep: primaryBlock.primaryNextStep,
    userMessage: primaryBlock.userMessage,
    ctaLabel: primaryBlock.ctaLabel || "确认智能拆镜",
    compositionContractApplied: false,
    complianceHit: false,
    qp02Blocked: false,
    missingLeadAsset: false,
    dirtyInput,
  };
}

/** Format spatial for 站位 inject when axis/anchors present (G6 design consume).
 * When stripFullSecondary / bg_fragment: rewrite secondary standing anchors only —
 * never wipe primary occupancy stems (弯腰/捡/跪/俯身). */
export function formatSpatialStandingLine(
  spatialRelation: unknown,
  opts?: { stripFullSecondary?: boolean },
): string | null {
  const PRIMARY_OCC = /弯腰|捡起|俯身|跪坐|伏案|站立持|主手|指节/;
  const rewriteFragment = (raw: string): string | null => {
    if (!opts?.stripFullSecondary) return raw.slice(0, 80);
    // Preserve primary occupancy clauses before stripping secondary standing
    const primaryBits = (raw.match(/[^/，,;；]*?(?:弯腰|捡起|俯身|跪坐|伏案|站立持)[^/，,;；]*/g) ?? [])
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 2);
    let s = raw
      .replace(/anchors?\s*=\s*[^;；]*/gi, (m) =>
        m
          .replace(/[^/，,]*次角[^/，,]*站立[^/，,]*/g, "仅裙摆碎片虚化")
          .replace(/[^/，,]*配角[^/，,]*站立[^/，,]*/g, "仅裙摆碎片虚化")
          .replace(/[^/，,]*二号[^/，,]*站立[^/，,]*/g, "仅裙摆碎片虚化")
          .replace(/[^/，,]*立像[^/，,]*/g, "仅衣角碎片")
          .replace(/[^/，,]*半身立像[^/，,]*/g, "仅衣角碎片")
          .replace(/([^/，,]*)(次角|配角|二号)([^/，,]*)站立/g, "$1$2$3仅裙摆碎片虚化"),
      )
      // Only rewrite secondary standing phrases — not bare 站立 on primary
      .replace(/(?:次角|配角|二号角色?)[^。；]{0,8}站立/g, "次角仅裙摆/衣角碎片虚化")
      .replace(/完整立像|半身立像/g, "仅裙摆/衣角碎片虚化");
    if (primaryBits.length && !PRIMARY_OCC.test(s)) {
      s = `${primaryBits.join("；")}；${s}`;
    }
    if (/仅裙摆|衣角碎片|虚化/.test(s) || PRIMARY_OCC.test(s)) return s.slice(0, 100);
    if (/axis\s*=/.test(s)) {
      const axis = s.match(/axis\s*=\s*[^\s;；]+/i)?.[0];
      return axis ? `${axis}；次角仅裙摆碎片虚化` : "次角仅裙摆/衣角碎片虚化浅景深";
    }
    return "次角仅裙摆/衣角碎片虚化浅景深";
  };
  if (spatialRelation == null) return null;
  if (typeof spatialRelation === "object" && !Array.isArray(spatialRelation)) {
    const o = spatialRelation as { axis?: string; anchors?: string[] | string };
    const axis = String(o.axis ?? "").trim();
    const anchors = Array.isArray(o.anchors)
      ? o.anchors.map((a) => String(a).trim()).filter(Boolean).join("/")
      : String(o.anchors ?? "").trim();
    if (axis || anchors) {
      const line = [axis && `axis=${axis}`, anchors && `anchors=${anchors}`].filter(Boolean).join(" ");
      return rewriteFragment(line);
    }
  }
  const s = String(spatialRelation ?? "").trim();
  if (!s) return null;
  if (/axis\s*=|anchors\s*=|站位|左右|前后|高位|低位|弯腰|捡/.test(s)) return rewriteFragment(s);
  return null;
}

function resolveColorTempFromCtx(ctx: ComposeStillContext): string | null {
  const direct = String(ctx.colorTemp ?? "").trim();
  if (direct) return direct.slice(0, 40);
  const code = String(ctx.sceneCode ?? "").trim().toUpperCase();
  const name = String(ctx.sceneName ?? "").trim();
  const lock = (ctx.sceneColorLock ?? {}) as Record<
    string,
    string | { colorTemp?: string; kelvin?: string | number } | undefined
  >;
  const pick = (entry: string | { colorTemp?: string; kelvin?: string | number } | undefined): string | null => {
    if (entry == null) return null;
    if (typeof entry === "string") {
      const s = entry.trim();
      return s ? s.slice(0, 40) : null;
    }
    const t = String(entry.colorTemp ?? entry.kelvin ?? "").trim();
    return t ? t.slice(0, 40) : null;
  };
  if (code) {
    const hit = pick(lock[code] ?? lock[code.replace(/^SCENE-/, "")]);
    if (hit) return hit;
  }
  if (name) {
    const hit = pick(lock[name]);
    if (hit) return hit;
  }
  for (const meta of Object.values(lock)) {
    const t = pick(meta);
    if (t) return t;
  }
  return null;
}

/** G6: consume design sceneColorLock / spatialRelation into still body when missing. */
function layerDesignConsume(ctx: ComposeStillContext, parts: string[], sources: string[]): void {
  const temp = resolveColorTempFromCtx(ctx);
  if (temp && !parts.some((p) => /色温：/.test(p))) {
    parts.push(`色温：${temp}`);
    sources.push("design.colorTemp");
  }
  let stripFullSecondary = false;
  try {
    const { resolveBgFragment } =
      require("./stillFirstFrameLiterarySsot") as typeof import("./stillFirstFrameLiterarySsot");
    stripFullSecondary = resolveBgFragment({
      visualDescription: ctx.visualDescription,
      background: ctx.background,
      spatialRelation: ctx.spatialRelation,
    }).stripFullSecondary;
  } catch {
    /* optional */
  }
  const spatial = formatSpatialStandingLine(ctx.spatialRelation, { stripFullSecondary });
  if (spatial && !parts.some((p) => /^(站位：|空间关系：)/.test(p))) {
    parts.push(`站位：${spatial}`);
    sources.push("design.spatialRelation");
  }
}

function layerShootableExtras(ctx: ComposeStillContext, parts: string[], sources: string[], mode: ComposeMode): void {
  // First-frame literary SSOT via unique reader — stamp preferred over re-extract
  let ffPhase: string | null = null;
  let ffIntent: string | undefined;
  try {
    const { resolveStillFirstFrameSsot } =
      require("./stillSsotRead") as typeof import("./stillSsotRead");
    const names = (ctx.characters ?? [])
      .filter((c) => c.kind !== "scene")
      .map((c) => c.name || c.code)
      .filter(Boolean) as string[];
    const resolved = resolveStillFirstFrameSsot({
      shotOrCtx: {
        narrative: (ctx as { narrative?: Record<string, unknown> }).narrative,
        visualDescription: ctx.visualDescription,
        emotionIntensity: (ctx as { emotionIntensity?: number }).emotionIntensity,
        bgBlur: (ctx as { bgBlur?: boolean }).bgBlur,
        episodeShot: (ctx as { episodeShot?: Record<string, unknown> }).episodeShot,
        stillPhase: (ctx as { stillPhase?: string }).stillPhase,
      },
      visualDescription: ctx.visualDescription,
      narrative: (ctx as { narrative?: Record<string, unknown> }).narrative,
      videoPrompt: String((ctx as { videoPrompt?: string }).videoPrompt ?? ""),
      characterNames: names,
      shotSize: String(ctx.shotSize ?? ""),
      emotionIntensity:
        (ctx as { emotionIntensity?: number }).emotionIntensity ??
        (Number.isFinite(Number(ctx.emotion)) ? Number(ctx.emotion) : null),
      bgBlur:
        typeof (ctx as { bgBlur?: boolean }).bgBlur === "boolean"
          ? (ctx as { bgBlur: boolean }).bgBlur
          : null,
    });
    const ff = resolved.extract;
    ffPhase = ff.stillPhase;
    ffIntent = ff.intentClass;
    (ctx as { stillPhase?: string }).stillPhase = ff.stillPhase;
    (ctx as { firstFrameExtract?: typeof ff }).firstFrameExtract = ff;
    (ctx as { _ssotOnlyEgress?: boolean })._ssotOnlyEgress = true;
    for (const line of ff.positiveSpine) {
      if (line && !parts.some((p) => p.includes(line.slice(0, Math.min(10, line.length))))) {
        parts.push(line);
        sources.push(resolved.fromStamp ? "ff.spine.stamp" : "ff.spine");
      }
    }
    for (const n of ff.necessaryNegatives) {
      if (n && !parts.some((p) => p.includes(n.slice(0, 8)))) {
        parts.push(n);
        sources.push("ff.neg");
      }
    }
    sources.push(...ff.sources, ...resolved.sources);
  } catch {
    /* optional */
  }
  // When SSOT spine present, skip conflicting composition FG/BG soup (design refine owns freeze)
  const approaching = ffPhase === "approaching" || ffPhase === "mid_contact";
  if (!(ctx as { _ssotOnlyEgress?: boolean })._ssotOnlyEgress) {
    const fg = String(ctx.foreground ?? "").trim();
    const bg = String(ctx.background ?? "").trim();
    if (fg || bg) {
      parts.push([fg && `前景：${fg}`, bg && `背景：${bg}`].filter(Boolean).join("；"));
      sources.push("shotDesign.composition");
    }
  } else if (approaching && ctx.foreground && /手捏|捏紧|持纸/.test(String(ctx.foreground))) {
    sources.push("ssot.skip:fg_grip_conflict");
  }
  const shotZh = formatShotSizeZh(ctx.shotSize);
  if (shotZh && !parts.some((p) => /^景别：/.test(p))) {
    parts.push(`景别：${shotZh}`);
    sources.push("shot.shotSize");
  }
  // Industry soft framing — NormGate compatible add-on only
  try {
    const { resolveGatedSoftHints } =
      require("./industryNormGate") as typeof import("./industryNormGate");
    const { readStillPhase } =
      require("./stillPhasePlan") as typeof import("./stillPhasePlan");
    const metaBag = (ctx as { shotMeta?: Record<string, unknown>; stillMeta?: Record<string, unknown> }).shotMeta
      ?? (ctx as { stillMeta?: Record<string, unknown> }).stillMeta
      ?? (ctx as unknown as Record<string, unknown>);
    const phase =
      (ctx as { stillPhase?: string }).stillPhase ??
      ffPhase ??
      readStillPhase(metaBag) ??
      readStillPhase({ narrative: (ctx as { narrative?: Record<string, unknown> }).narrative }) ??
      null;
    const gated = resolveGatedSoftHints({
      stillIntentClass: String((ctx as { stillIntentClass?: string }).stillIntentClass ?? "") || String(ffIntent ?? ""),
      stillPhase: phase,
      shotSize: String(ctx.shotSize ?? ""),
      visualDescription: ctx.visualDescription,
      otsLike: ffIntent === "ots",
      faceish: ffIntent === "face",
      speakLike: ffIntent === "speak",
    });
    for (const h of gated.hints) {
      if (h && !parts.some((p) => p.includes(h))) {
        parts.push(h);
        sources.push("cinematic.softHints.gated");
      }
    }
    if (gated.skipped.length) sources.push(`cinematic.softHints.skip:${gated.skipped.join("+")}`);
    // Skip face geometry soft-hints for action×approaching (noise → false debts)
    const skipFaceAssess = approaching && (ffIntent === "action_primary" || /弯腰|捡/.test(String(ctx.visualDescription ?? "")));
    if (!skipFaceAssess) {
      const { assessComposition, injectCompositionSoftHints } =
        require("./compositionAssess") as typeof import("./compositionAssess");
      const { readFaceBoxNormFromMeta, keyOrAdapterPresentFromMeta } =
        require("./faceBoxNormFromMeta") as typeof import("./faceBoxNormFromMeta");
      const { resolveFaceBoxForCompose } =
        require("./softFaceBoxHeuristic") as typeof import("./softFaceBoxHeuristic");
      const metaBox = readFaceBoxNormFromMeta(metaBag);
      const { readProvisionalFaceBoxFromMeta } =
        require("./faceBoxNormFromMeta") as typeof import("./faceBoxNormFromMeta");
      const localSoft = readProvisionalFaceBoxFromMeta(metaBag);
      const resolved = resolveFaceBoxForCompose({
        metaBox,
        localSoftBox: localSoft,
        shotSize: String(ctx.shotSize ?? ""),
        faceBudget: String((ctx as { faceBudget?: string }).faceBudget ?? ""),
        visualDescription: ctx.visualDescription,
      });
      // Provisional soft box never upgrades to measured — Key+real meta box only;
      // Wave-13: provisional geometry still soft-assesses headroom/looking-room.
      // LGIA: only inject composition soft hints when NormGate allows those keys
      const softComp = assessComposition({
        keyOrAdapterPresent: keyOrAdapterPresentFromMeta(metaBag) && !resolved.provisional && Boolean(metaBox),
        faceBoxNorm: resolved.provisional ? null : resolved.box,
        provisionalFaceBoxNorm: resolved.provisional ? resolved.box : null,
        visualDescription: ctx.visualDescription,
        promptUsed: parts.join("\n"),
        shotSize: String(ctx.shotSize ?? ""),
        spatialRelation: typeof ctx.spatialRelation === "string" ? ctx.spatialRelation : undefined,
        faceBudget: String((ctx as { faceBudget?: string }).faceBudget ?? ""),
      });
      const findingsForInject =
        gated.keys.length === 0
          ? []
          : softComp.findings.filter((f) => {
              if (f.id.startsWith("headroom") && !gated.keys.includes("headroom")) return false;
              if (f.id.startsWith("looking_room") && !gated.keys.includes("lookingRoom")) return false;
              if (f.id.startsWith("axis") && !gated.keys.includes("axis180") && !gated.keys.includes("axis")) {
                return false;
              }
              return true;
            });
      const nextParts = injectCompositionSoftHints(parts, findingsForInject);
      if (nextParts.length !== parts.length) {
        parts.length = 0;
        parts.push(...nextParts);
        sources.push(
          softComp.measured
            ? "composition.measured"
            : softComp.provisionalSoft
              ? "composition.provisionalSoft"
              : "composition.softNoKey",
        );
      }
      if (resolved.provisional && resolved.reason) {
        sources.push(`composition.softFaceBox:${resolved.reason}`);
      }
      if (softComp.pixelDimStatus) {
        (ctx as { pixelDimStatus?: string }).pixelDimStatus = softComp.pixelDimStatus;
      }
    }
  } catch {
    /* optional */
  }
  if (ctx.spatialRelation) {
    let stripFullSecondary = false;
    try {
      const { resolveBgFragment } =
        require("./stillFirstFrameLiterarySsot") as typeof import("./stillFirstFrameLiterarySsot");
      stripFullSecondary = resolveBgFragment({
        visualDescription: ctx.visualDescription,
        background: ctx.background,
        spatialRelation: ctx.spatialRelation,
      }).stripFullSecondary;
    } catch {
      /* optional */
    }
    const spatial = formatSpatialStandingLine(ctx.spatialRelation, { stripFullSecondary });
    if (spatial && !parts.some((p) => /^(站位：|空间关系：)/.test(p))) {
      parts.push(`站位：${spatial}`);
      sources.push("shot.spatialRelation");
    }
  }
  // Still first-frame: narrative over reference collage (hq_update + fidelity)
  if (mode === "fidelity" || ctx.qualityMode === "hq_update") {
    if (!parts.some((p) => /叙事场面优先/.test(p))) {
      parts.push("叙事场面优先于参考图拼贴，画面必须体现上述描写中的动作与物件");
      sources.push("fidelity.narrativeFirst");
    }
  }
}

function layerSkeletonScene(
  ctx: ComposeStillContext,
  parts: string[],
  sources: string[],
  adapt?: StillRecipeAdapt,
): boolean {
  const chars = (ctx.characters ?? []).filter((c) => c.kind !== "scene");
  const names = chars
    .map((c) => c.name || c.code)
    .filter(Boolean)
    .slice(0, 3);
  const scene = ctx.sceneCode || ctx.sceneAssets?.[0]?.name || ctx.sceneAssets?.[0]?.code;
  const emo = ctx.emotion != null && String(ctx.emotion).trim() ? String(ctx.emotion) : "";
  if (!names.length && !scene && !emo) return false;
  const who = names.length ? names.join("与") : "角色";
  const where = scene ? `在${scene}` : "在场景中";
  const mood = emo ? `，情绪强度${emo}` : "";
  if (adapt?.omitFaceSkeleton) {
    const handSafe =
      adapt.mode === "hand_cu"
        ? `${who}${where}的手部/道具叙事首帧：主体细节清晰，浅景深，环境可辨${mood}，静止可拍画面`
        : adapt.mode === "prop_cu" || adapt.mode === "empty"
          ? `${where}的物件/环境叙事首帧：主体清晰，环境可辨${mood}，静止可拍画面`
          : `${who}${where}的叙事首帧：场面可辨${mood}，静止可拍画面（禁硬加正脸）`;
    parts.push(handSafe);
    sources.push("skeleton.declare.recipeAdapt");
    return true;
  }
  parts.push(`${who}${where}的叙事首帧：人物关系与站位清晰，正脸可见，环境可辨${mood}，静止可拍画面`);
  sources.push("skeleton.declare");
  return true;
}

function layerCharacterPerf(
  ctx: ComposeStillContext,
  parts: string[],
  sources: string[],
  warnings: string[],
  mode: ComposeMode,
  opts?: { omitPersonality?: boolean; adapt?: StillRecipeAdapt },
): boolean {
  let missingLead = false;
  const chars = (ctx.characters ?? []).filter((c) => c.kind !== "scene");
  const dualOrMore = chars.length >= 2;
  const hq = ctx.qualityMode === "hq_update";
  for (const c of chars) {
    const tier = c.tier ?? resolveAssetTier({ code: c.code, name: c.name });
    if (tier === "lead" && ctx.requireLeadAssetImage !== false && c.hasImage === false) {
      missingLead = true;
    }
    if (opts?.omitPersonality) continue;
    // Dual hq: skip long personality soup, but keep costumeLock on primary (防紫袍漂移)
    const costumeFromPers = c.personality?.match(/服装\s*[:：]\s*([^。；;\n]{2,40})/)?.[1]?.trim();
    if ((mode === "fidelity" || hq) && dualOrMore) {
      if (hq && costumeFromPers && (c.tier === "lead" || !parts.some((p) => /服装锁定/.test(p)))) {
        parts.push(`服装锁定：${costumeFromPers}，禁止换袍换色或未声明服色（含紫袍金绣等）`);
        sources.push("character.costumeLock");
      }
      continue;
    }
    if (c.personality?.trim() && mode !== "fidelity") {
      const pers = c.personality.trim();
      parts.push(`${c.name || c.code || "角色"}气质：${pers.slice(0, 80)}`);
      sources.push("character.personality");
      if (hq && costumeFromPers) {
        parts.push(`服装锁定：${costumeFromPers}，禁止换袍换色或未声明服色（含紫袍金绣等）`);
        sources.push("character.costumeLock");
      }
    } else if (c.personality?.trim() && mode === "fidelity") {
      const line = compressPersonalityLine(c.name || c.code || "角色", c.personality, 16);
      if (line) {
        parts.push(line);
        sources.push("character.personality.compact");
      }
      if (hq && costumeFromPers) {
        parts.push(`服装锁定：${costumeFromPers}，禁止换袍换色`);
        sources.push("character.costumeLock");
      }
    }
  }
  const micro = String(ctx.microExpression ?? "").trim();
  if (micro && !opts?.adapt?.omitFaceMicroExpression) {
    let allowMicro = true;
    try {
      const { mouthDetailAllowedByVd, OFF_BEAT_MOUTH_CU_ATOMS } =
        require("./stillFirstFrameLiterarySsot") as typeof import("./stillFirstFrameLiterarySsot");
      if (OFF_BEAT_MOUTH_CU_ATOMS.test(micro) && !mouthDetailAllowedByVd(micro, ctx.visualDescription)) {
        allowMicro = false;
        sources.push("shotDesign.performance.microExpression.omittedOffBeat");
      }
    } catch {
      /* optional */
    }
    if (allowMicro) {
      parts.push(`微表情：${micro.slice(0, 80)}`);
      sources.push("shotDesign.performance.microExpression");
    }
  } else if (micro && opts?.adapt?.omitFaceMicroExpression) {
    sources.push("shotDesign.performance.microExpression.omittedByRecipeAdapt");
  }
  if (ctx.emotion != null && String(ctx.emotion).trim() && !sources.includes("shot.emotion")) {
    parts.push(`情绪：${String(ctx.emotion).slice(0, 40)}`);
    sources.push("shot.emotion");
  }
  if (missingLead) warnings.push("lead asset still missing");
  return missingLead;
}

function layerBeatBlocking(
  ctx: ComposeStillContext,
  parts: string[],
  sources: string[],
  bindHighName?: string,
  adapt?: StillRecipeAdapt,
  opts?: { hasSeatingOrKneel?: boolean; visualDescription?: string | null },
): void {
  const split = String(ctx.splitHint ?? "").trim();
  const reaction = String(ctx.reactionAction ?? "").trim();
  const shot = String(ctx.shotSize ?? "").toLowerCase();
  const isEcu = /ecu|extreme|大特|特写/.test(shot);
  if (adapt?.omitFacePowerBlocking) {
    sources.push("beat.power.omittedByRecipeAdapt");
    if (reaction || /reaction|反应/i.test(split)) {
      parts.push("反应镜：偏听者/过肩构图，非双人对峙抢戏");
      sources.push("beat.reaction");
    }
    return;
  }
  if (reaction || /reaction|反应/i.test(split)) {
    parts.push("反应镜：偏听者/过肩构图，非双人对峙抢戏");
    sources.push("beat.reaction");
  } else if (isEcu) {
    // ECU: skip power-blocking recipe
    sources.push("beat.ecu.skipPower");
  } else if (bindHighName) {
    const castNames = (ctx.characters ?? [])
      .filter((c) => c.kind !== "scene")
      .map((c) => c.name || "")
      .filter(Boolean);
    const vdText = opts?.visualDescription ?? ctx.visualDescription;
    let demote = false;
    let vdPrimary = "";
    let actionPrimary = false;
    try {
      const {
        shouldDemotePowerBlockingForVd,
        shouldUseActionPrimaryBeat,
      } = require("./stillFirstFrameLiterarySsot") as typeof import("./stillFirstFrameLiterarySsot");
      const d = shouldDemotePowerBlockingForVd({
        visualDescription: vdText,
        bindHighName,
        castNames,
        hasSeatingOrKneel: opts?.hasSeatingOrKneel,
      });
      demote = d.demote;
      vdPrimary = d.vdPrimary;
      const ap = shouldUseActionPrimaryBeat({
        visualDescription: vdText,
        hasSeatingOrKneel: opts?.hasSeatingOrKneel,
        castNames,
      });
      actionPrimary = ap.use;
      if (!vdPrimary && ap.vdPrimary) vdPrimary = ap.vdPrimary;
    } catch {
      /* optional */
    }
    // Non-seating action beat: always 动作主体, never 「权力位…（高位）」throne soup
    if (!opts?.hasSeatingOrKneel && (demote || actionPrimary) && vdPrimary) {
      const softOther = castNames.find((n) => n !== vdPrimary && !vdPrimary.includes(n) && !n.includes(vdPrimary));
      const softClause = softOther
        ? `${softOther}虚化在背景浅景深、禁止与主体抢戏`
        : "";
      parts.push(
        softClause
          ? `动作主体：${vdPrimary}靠近视觉重心并完成描写动作；${softClause}，禁止拼图多格、禁止第三人`
          : `动作主体：${vdPrimary}靠近视觉重心并完成描写动作，禁止拼图多格、禁止第三人`,
      );
      sources.push(demote ? "beat.power.vdPrimaryOverride" : "beat.power.actionPrimary");
    } else if (demote && vdPrimary) {
      parts.push(
        `动作主体：${vdPrimary}靠近视觉重心并完成描写动作；${bindHighName}虚化在背景浅景深、禁止与主体抢戏，禁止拼图多格、禁止第三人`,
      );
      sources.push("beat.power.vdPrimaryOverride");
    } else if (opts?.hasSeatingOrKneel) {
      const dualCast = castNames.length >= 2;
      parts.push(
        dualCast
          ? `权力位：${bindHighName}（高位）靠近视觉重心，主脸清晰；低位面部可辨；禁止超员路人`
          : `权力位：${bindHighName}（高位）靠近视觉重心，正脸清晰`,
      );
      sources.push("beat.power.named");
    } else if (vdPrimary) {
      parts.push(`动作主体：${vdPrimary}靠近视觉重心并完成描写动作，禁止拼图多格`);
      sources.push("beat.power.actionPrimary");
    }
  } else if (ctx.dialogueDominantSpeaker) {
    parts.push(`权力位：${String(ctx.dialogueDominantSpeaker)}靠近画面中心，正脸清晰`);
    sources.push("beat.power");
  } else if (/confront|对峙|face.?off/i.test(split)) {
    parts.push("对峙站位：双人关系清楚，主体均不裁切");
    sources.push("beat.confront");
  }
}

function layerRefIdentityLock(
  ctx: ComposeStillContext,
  parts: string[],
  sources: string[],
  opts?: { seatingHard?: boolean; adapt?: StillRecipeAdapt },
): void {
  const adapt = opts?.adapt;
  if (adapt?.useNonFaceIdentityLock) {
    parts.push(adapt.mode === "prop_cu" ? "锁定道具材质与纹样参考，禁止重塑物件身份细节。" : HAND_CU_IDENTITY_LOCK);
    sources.push("refs.identityLock.recipeAdapt");
    return;
  }
  const policy = loadStillRecipePolicy();
  const { canEmitMultiFace, uniqueBareCastingNames } = require("./stillIdentitySsot") as typeof import("./stillIdentitySsot");
  const chars = (ctx.characters ?? []).filter((c) => c.kind !== "scene");
  const coded = chars.filter((c) => c.code && /^CHAR-/i.test(String(c.code)));
  // Multi lock ONLY by CHAR count — never referenceUrlCount (role+scene URLs ≠ dual face).
  if ((ctx.referenceUrlCount ?? 0) >= 1 || chars.length > 0) {
    const picked = pickIdentityLockLines({
      charCodeCount: coded.length,
      hasCharacters: chars.length > 0,
      seatingHard: opts?.seatingHard,
      policy,
    });
    for (const line of picked.lines) parts.push(line);
    if (picked.mode === "seating") {
      sources.push("refs.identityLock");
      sources.push("refs.identityLock.descFirst");
      sources.push("refs.sceneSrefSeatLock");
    } else if (picked.mode === "multi") {
      sources.push("refs.identityLock");
    } else if (picked.mode === "single") {
      sources.push("refs.identityLock.single");
    }
  }
  const bareNames = uniqueBareCastingNames(coded.map((c) => c.name || c.code));
  if (
    canEmitMultiFace({
      charCodes: coded.map((c) => String(c.code)),
      names: bareNames,
      crefCharCount: coded.length,
    })
  ) {
    parts.push(`${bareNames.slice(0, 3).join("与") || "二人"}不同脸，年龄与身份可辨，禁止共用同一张脸`);
    sources.push("refs.multiFace");
  }
}

function layerNeighborWarn(ctx: ComposeStillContext, warnings: string[]): void {
  const a = String(ctx.shotSize ?? "").toLowerCase();
  const b = String(ctx.neighborShotSize ?? "").toLowerCase();
  if (!a || !b || a === b) return;
  const extreme =
    (/ecu|extreme\s*close|大特/i.test(a) && /wide|远|全景/i.test(b)) ||
    (/ecu|extreme\s*close|大特/i.test(b) && /wide|远|全景/i.test(a));
  if (extreme) warnings.push("邻镜景别跳变较大，建议核对 saliency 节奏");
}

function layerMouthLipGuard(
  ctx: ComposeStillContext,
  parts: string[],
  sources: string[],
  adapt?: StillRecipeAdapt,
): void {
  if (adapt?.omitMouthLipGuard) {
    sources.push("qc.lipMouth.omittedByRecipeAdapt");
    return;
  }
  const lip = ctx.strengthen?.lipSyncPolicy || ctx.strengthen?.mouth;
  const body = parts.join(" ");
  if (/大张嘴|夸张张嘴|mouth\s*wide\s*open/i.test(body) || lip) {
    parts.push("口型：微张或闭合，适合口型同步的首帧");
    sources.push("qc.lipMouth");
  }
}

function layerQcStrengthen(ctx: ComposeStillContext, parts: string[], sources: string[]): void {
  const s = ctx.strengthen ?? {};
  if (s.crefWeight === "high") {
    parts.push("身份高权重锁定角色参考，五官必须与定妆一致");
    sources.push("qc.strengthen.cref");
  }
  if (s.firstFrameDetail === "high") {
    parts.push("超高细节视频首帧");
    sources.push("qc.strengthen.detail");
  }
  if (s.roleLock?.trim()) {
    parts.push(`角色动作硬锁：${s.roleLock.trim()}`);
    sources.push("qc.strengthen.roleLock");
  }
  if (s.mustProps?.trim()) {
    parts.push(`必须出现道具：${s.mustProps.trim()}`);
    sources.push("qc.strengthen.mustProps");
  }
  if (s.composition?.trim()) {
    parts.push(`构图：${s.composition.trim()}，主体清晰不抢戏`);
    sources.push("qc.strengthen.composition");
  }
  if (s.atmosphere?.trim()) {
    parts.push(`${s.atmosphere.trim()}氛围清晰可见`);
    sources.push("qc.strengthen.atmosphere");
  }
  if (s.negativeBan?.trim()) {
    const ban =
      s.negativeBan === "no_altar_standing_ritual"
        ? "禁止用双人站立香案/持香/供桌仪式代替座次与动作"
        : s.negativeBan.trim();
    parts.push(ban);
    sources.push("qc.strengthen.negativeBan");
  }
}

/** Strip stale identity/binding/recipe tails before refine/fidelity reuses previousVisualBody. */
export function stripStaleBindingFromPrevious(body: string): string {
  let next = String(body ?? "")
    .replace(/站位绑定：[^。；;\n]*/g, " ")
    .replace(/【布局锁】[^。；;\n]*/g, " ")
    .replace(/身份顺序：[^。；;\n]*/g, " ")
    .replace(/权力位：[^。；;\n]*/g, " ")
    .replace(/动作主体：[^。；;\n]*/g, " ")
    .replace(/continuity:\s*[^。；;\n]*/gi, " ")
    .replace(/continues?\s+[^。；;\n]*/gi, " ")
    .replace(/锁定定妆脸型与身份[^。；;\n]*/g, " ")
    // Full sheet-lock soup (long ZH uses ； mid-sentence — must not leave 「严禁复刻…」残段置顶)
    .replace(/角色参考若为四视图[\s\S]{0,200}?单一电影场面[。．]?/g, " ")
    .replace(/角色参考若为四视图[^。；;\n]*/g, " ")
    .replace(/严禁复刻多格拼版[\s\S]{0,120}?character sheet[\s\S]{0,80}?场面[。．]?/gi, " ")
    .replace(/严禁复刻多格拼版[^。；;\n]*/g, " ")
    .replace(/四视图仅借身份[^。；;\n]*/g, " ")
    .replace(/单镜头成片画幅[^。；;\n]*/g, " ")
    .replace(/单镜头成片[^。；;\n]*/g, " ")
    .replace(/禁止四视图[^。；;\n]*/g, " ")
    .replace(/叙事场面优先于参考图拼贴[^。；;\n]*/g, " ")
    .replace(/(?:^|\s)--(?:cref|sref)\s+[^\n]*?(?=(?:\s--(?:cref|sref|ar)\b)|$)/gi, " ")
    .replace(/(?:^|\s)--ar\s+\S+/gi, " ");
  const prefixes = loadStillRecipePolicy().recipeLayerPrefixes ?? [
    "背景弱化",
    "景别：",
    "必须出现",
    "锁定角色",
    "严格锁定",
    "身份锁定",
    "座次锁",
    "权力位",
  ];
  for (const prefix of prefixes) {
    const esc = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    next = next.replace(new RegExp(`${esc}[^。；;\\n]*[。；;]?`, "g"), " ");
  }
  try {
    const { stripIdentityNoiseFromBody, dedupeNarrativeClauses } = require("./stillIdentitySsot") as typeof import("./stillIdentitySsot");
    next = dedupeNarrativeClauses(stripIdentityNoiseFromBody(next));
  } catch {
    /* optional */
  }
  return next.replace(/\s{2,}/g, " ").trim();
}

/** True when previous body is mostly anti-collage lock residue (must force full, not refine). */
export function previousBodyIsSheetLockSoup(body: string): boolean {
  const t = String(body ?? "").trim();
  if (t.length < 8) return false;
  const lockHeavy =
    /严禁复刻多格|character sheet|单镜头成片画幅|角色参考若为四视图|四视图仅借身份/.test(t) &&
    !/特写|近景|划过|侧脸|休书|婚书|信笺|纸角|渗血|跪|端坐|捡/.test(t.slice(0, 40));
  return lockHeavy || /^[，。；\s]*严禁复刻/.test(t);
}

function hasAnyAnchor(ctx: ComposeStillContext): boolean {
  if (String(ctx.visualDescription ?? "").trim()) return true;
  if (String(ctx.compiledImagePrompt ?? "").trim()) return true;
  if (stripMotionOnlyForStill(String(ctx.videoDesc ?? ""))) return true;
  if (stripIdentityTokens(String(ctx.promptFromStoryboard ?? "")).body.trim()) return true;
  if ((ctx.characters ?? []).some((c) => c.name || c.code)) return true;
  if (ctx.sceneCode || (ctx.sceneAssets ?? []).length) return true;
  if (ctx.emotion != null && String(ctx.emotion).trim()) return true;
  if (ctx.dialogueBeat) return true;
  return false;
}

function preserveUserPatches(rawBody: string, designText: string): string | null {
  try {
    const { gateUserPatchAgainstLiterary } =
      require("./literaryStillSsot") as typeof import("./literaryStillSsot");
    return gateUserPatchAgainstLiterary({ rawPatch: rawBody, literary: designText });
  } catch {
    const scrubbed = scrubStillPromptNoise(rawBody).cleaned;
    const compact = scrubbed.replace(/\s+/g, "");
    if (compact.length < 4) return null;
    if (designText && scrubbed.includes(designText.slice(0, Math.min(20, designText.length)))) return null;
    if (/safe area|power blocking|9:16安全区/i.test(scrubbed) && compact.length < 20) {
      return null;
    }
    if (/定妆为准|锁定脸型|禁止重塑五官/.test(scrubbed)) return null;
    return scrubbed;
  }
}

/**
 * Pure compose — description fidelity first.
 */
export function composeStillPrompt(
  ctx: ComposeStillContext,
  options: ComposeStillOptions = {},
): ComposeStillResult {
  const mode: ComposeMode = options.mode ?? "full";
  const sources: string[] = [];
  const warnings: string[] = [];
  const qualityMode = ctx.qualityMode ?? "hq_update";

  const strippedRaw = stripIdentityTokens(String(ctx.rawPrompt ?? ""));
  const scrubRaw = scrubStillPromptNoise(strippedRaw.body);
  const rawBody = scrubRaw.cleaned;
  const rawTokens = strippedRaw.tokenTail;
  const dirtyInput = isDirtyStillPrompt(String(ctx.rawPrompt ?? "")) || scrubRaw.scrubbed;

  const descParts: string[] = [];
  const supportParts: string[] = [];
  let didSynthesize = false;
  let entityAnchors: string[] = [];

  const { shouldWarnOneBeat } = require("./stillIdentitySsot") as typeof import("./stillIdentitySsot");
  const { peelOsFromVisual } = require("../design/expandStillOneBeat") as typeof import("../design/expandStillOneBeat");

  // Refine/fidelity: keep previous only if one-beat AND mustSurvive atoms still present
  let effectiveMode: ComposeMode = mode;
  if ((mode === "refine" || mode === "fidelity") && ctx.previousVisualBody?.trim()) {
    let prevClean = scrubStillPromptNoise(ctx.previousVisualBody).cleaned;
    try {
      const { homologizePreviousVisualBody } =
        require("./stillPromptHomology") as typeof import("./stillPromptHomology");
      prevClean = homologizePreviousVisualBody(prevClean) || prevClean;
    } catch {
      /* optional */
    }
    try {
      const { peelCompiledAgainstSsot, readStillSsotFromShot } =
        require("./stillSsotRead") as typeof import("./stillSsotRead");
      const ph =
        ((ctx as { stillPhase?: string }).stillPhase as import("./stillPhasePlan").StillPhase | null) ??
        readStillSsotFromShot(ctx as unknown as Record<string, unknown>).stillPhase;
      prevClean = peelCompiledAgainstSsot(prevClean, ph);
    } catch {
      /* optional */
    }
    const prev = stripStaleBindingFromPrevious(prevClean);
    let dropOffBeat = false;
    try {
      const { previousBodyHasBidirectionalOffBeatContamination } =
        require("./singleShotClosedCompose") as typeof import("./singleShotClosedCompose");
      dropOffBeat = previousBodyHasBidirectionalOffBeatContamination(prev, ctx.visualDescription);
    } catch {
      try {
        const { previousBodyHasOffBeatContamination } =
          require("./stillFirstFrameLiterarySsot") as typeof import("./stillFirstFrameLiterarySsot");
        dropOffBeat = previousBodyHasOffBeatContamination(prev, ctx.visualDescription);
      } catch {
        /* optional */
      }
    }
    if (
      prev &&
      (dropOffBeat ||
        shouldWarnOneBeat(prev) ||
        previousBodyIsSheetLockSoup(prev) ||
        previousBodyIsSheetLockSoup(ctx.previousVisualBody))
    ) {
      warnings.push(
        dropOffBeat
          ? "off_beat_contamination:drop_previous"
          : previousBodyIsSheetLockSoup(prev) || previousBodyIsSheetLockSoup(ctx.previousVisualBody)
            ? "sheet_lock_soup:drop_dirty_previous"
            : "DEX-STILL-ONEBEAT:drop_dirty_previous",
      );
      sources.push(
        dropOffBeat
          ? "previous.dropped_off_beat"
          : previousBodyIsSheetLockSoup(prev) || previousBodyIsSheetLockSoup(ctx.previousVisualBody)
            ? "previous.dropped_sheet_lock_soup"
            : "previous.dropped_multibeat",
      );
      effectiveMode = "full";
      ctx.previousVisualBody = undefined;
    } else if (prev) {
      try {
        const { buildMustSurvive } =
          require("./stillLiteraryIntentSsot") as typeof import("./stillLiteraryIntentSsot");
        const names = (ctx.characters ?? [])
          .filter((c) => c.kind !== "scene")
          .map((c) => c.name || "")
          .filter(Boolean);
        const surv = buildMustSurvive({
          visualDescription: ctx.visualDescription,
          prompt: prev,
          characterNames: names,
        });
        if (surv.items.length && !surv.ok) {
          warnings.push("mustSurvive:drop_previous_missing_atoms");
          sources.push("previous.dropped_mustSurvive");
          effectiveMode = "full";
          ctx.previousVisualBody = undefined;
        } else {
          descParts.push(prev);
          sources.push("previous.composed");
        }
      } catch {
        descParts.push(prev);
        sources.push("previous.composed");
      }
    }
  }

  let vdRaw = String(ctx.visualDescription ?? "").trim();
  {
    const { isHandEyeMultiBeat, hasBareCrefCode, hasBareSrefCode, stripBareCrefSref } =
      require("../design/dirtyStillPromptGate") as typeof import("../design/dirtyStillPromptGate");
    const peelLit = (s: string) => {
      const { peelContinuityNoise } = require("../design/dirtyStillPromptGate") as typeof import("../design/dirtyStillPromptGate");
      return peelContinuityNoise(stripBareCrefSref(stripIdentityTokens(String(s ?? "")).body));
    };
    const vdLit = peelLit(vdRaw);
    const compiledLit = peelLit(String(ctx.compiledImagePrompt ?? ""));
    const rawLit = peelLit(String(ctx.rawPrompt ?? ""));
    const literaryBlob = [vdLit, compiledLit, rawLit].join("\n");

    if (vdRaw && (hasBareCrefCode(vdRaw) || hasBareSrefCode(vdRaw))) {
      if (vdLit && !hasBareCrefCode(vdLit) && !hasBareSrefCode(vdLit)) {
        warnings.push("stripped bare cref/sref from visualDescription");
        sources.push("dirtyStillPrompt.stripBareVd");
        vdRaw = vdLit;
        ctx.visualDescription = vdLit;
      }
    }
    // Stale IR in old prompt/compiled: peel in-memory so primary/pick won't re-ingest codes
    if (String(ctx.compiledImagePrompt ?? "") && compiledLit !== String(ctx.compiledImagePrompt ?? "").trim()) {
      ctx.compiledImagePrompt = compiledLit;
      sources.push("dirtyStillPrompt.stripBareCompiled");
    }
    if (String(ctx.rawPrompt ?? "") && rawLit !== String(ctx.rawPrompt ?? "").trim()) {
      ctx.rawPrompt = rawLit;
      sources.push("dirtyStillPrompt.stripBareRaw");
    }

    if (isHandEyeMultiBeat(literaryBlob)) {
      const primaryBlock = buildPrimaryBlock("chat_repair", {
        stage: "prompt",
        userMessageOverride: "手部特写与眼神/正脸同帧（一镜多拍）；请回 SB 拆镜或改 VD 后再 compose",
      });
      return {
        ok: false,
        prompt: "",
        visualBody: "",
        didSynthesize: false,
        scrubbed: scrubRaw.scrubbed || dirtyInput,
        composeMode: effectiveMode,
        sources: [...sources, "dirtyStillPrompt.block"],
        warnings: [...warnings, "DEX-DIRTY-STILL-PROMPT"],
        entityAnchors: [],
        blockReason: "DEX-DIRTY-STILL-PROMPT",
        primaryNextStep: primaryBlock.primaryNextStep,
        userMessage: primaryBlock.userMessage,
        ctaLabel: primaryBlock.ctaLabel,
        compositionContractApplied: false,
        complianceHit: false,
        qp02Blocked: false,
        missingLeadAsset: false,
        dirtyInput: true,
      };
    }
    // Seating VD + prior compose tail with 正脸：not hand+eye dirty (isHandEyeMultiBeat already seating-aware)
    // Only BLOCK when VD still has bare codes after peel (cannot salvage)
    if (hasBareCrefCode(vdLit) || hasBareSrefCode(vdLit)) {
      const primaryBlock = buildPrimaryBlock("chat_repair", {
        stage: "prompt",
        userMessageOverride:
          "画面描写仍含裸 --cref/--sref 码（非定妆 URL）。请从 visualDescription 删除码，改用 charCodes/定妆槽；生成时由 compose 在 prompt 尾自动挂 IR。勿把 CHAR-*/SCENE-* 写进文学体。",
      });
      return {
        ok: false,
        prompt: "",
        visualBody: "",
        didSynthesize: false,
        scrubbed: scrubRaw.scrubbed || dirtyInput,
        composeMode: effectiveMode,
        sources: [...sources, "dirtyStillPrompt.block"],
        warnings: [...warnings, "DEX-DIRTY-STILL-PROMPT"],
        entityAnchors: [],
        blockReason: "DEX-DIRTY-STILL-PROMPT",
        primaryNextStep: primaryBlock.primaryNextStep,
        userMessage: primaryBlock.userMessage,
        ctaLabel: primaryBlock.ctaLabel,
        compositionContractApplied: false,
        complianceHit: false,
        qp02Blocked: false,
        missingLeadAsset: false,
        dirtyInput: true,
      };
    }
  }

  let primary = pickPrimaryDescription(ctx);
  // HQ literary debt: split_shot for dual contact; never soft-inject wash-green
  if (qualityMode === "hq_update") {
    try {
      const { gateStillLitDebtForHq } =
        require("./stillLitHqGate") as typeof import("./stillLitHqGate");
      const litGate = gateStillLitDebtForHq({
        visualDescription: vdRaw || primary?.text,
        shotSize: ctx.shotSize,
        qualityMode,
        importSoftTrack: Boolean((ctx as { importSoftTrack?: boolean }).importSoftTrack),
        allowXorSoftInject: false,
        // Compose is the design contract boundary: unshootable literary XOR
        // must block here, while import/workbench smart-heal may stay soft.
        hardBlock: true,
      });
      sources.push(...litGate.sources);
      if (
        litGate.visualDescription &&
        litGate.visualDescription !== String(ctx.visualDescription ?? "").trim()
      ) {
        ctx.visualDescription = litGate.visualDescription;
        vdRaw = litGate.visualDescription;
        primary = pickPrimaryDescription(ctx);
      }
      if (litGate.action === "advise") {
        // Shootable-first: advise + slim, continue compose (requireFixBeforeBurn only)
        warnings.push(litGate.adviseReason);
        sources.push(...litGate.sources, "lit.hq.adviseContinue");
        (ctx as { litAdviseNextStep?: string }).litAdviseNextStep = litGate.primaryNextStep;
        (ctx as { litAdviseCta?: string }).litAdviseCta = litGate.ctaLabel;
        (ctx as { litAdviseMessage?: string }).litAdviseMessage = litGate.userMessage;
        (ctx as { requireFixBeforeBurn?: boolean }).requireFixBeforeBurn = true;
        if (litGate.missingSlots?.length) {
          (ctx as { litAdviseSlots?: string[] }).litAdviseSlots = litGate.missingSlots;
        }
      } else if (litGate.action === "block") {
        // Legacy hardBlock path only
        return {
          ok: false,
          prompt: String(primary?.text ?? vdRaw ?? ""),
          visualBody: String(primary?.text ?? vdRaw ?? ""),
          didSynthesize: false,
          scrubbed: scrubRaw.scrubbed || dirtyInput,
          composeMode: effectiveMode,
          sources: [...sources, "lit.hq.refuse"],
          warnings: [...warnings, litGate.blockReason],
          entityAnchors: [],
          blockReason: litGate.blockReason,
          primaryNextStep: litGate.primaryNextStep,
          userMessage: litGate.userMessage,
          ctaLabel: litGate.ctaLabel,
          compositionContractApplied: false,
          complianceHit: false,
          qp02Blocked: false,
          missingLeadAsset: false,
          dirtyInput,
          descCoverageOk: false,
          descCoverageMissing: litGate.missingSlots,
        };
      }
    } catch {
      /* optional */
    }
  }
  let recipeAdapt = resolveStillRecipeAdapt({
    visualDescription: vdRaw || primary?.text,
    shotSize: ctx.shotSize,
    picture: (ctx as { picture?: string }).picture,
    videoDesc: ctx.videoDesc,
  });
  if (recipeAdapt.mode !== "face_or_scene") {
    sources.push(`recipeAdapt.${recipeAdapt.mode}`);
  }
  if (vdRaw && shouldWarnOneBeat(vdRaw)) {
    return oneBeatBlockResult(warnings, sources, scrubRaw.scrubbed || dirtyInput, dirtyInput, effectiveMode);
  }
  let didCuCastSlice = false;
  {
    const { detectCuCastConflict } =
      require("../design/detectCuCastConflict") as typeof import("../design/detectCuCastConflict");
    const castChars = (ctx.characters ?? []).filter((c) => c.kind !== "scene");
    const cu = detectCuCastConflict({
      shotSize: ctx.shotSize,
      charCodes: castChars.map((c) => c.code).filter(Boolean) as string[],
      characterNames: castChars.map((c) => c.name || "").filter(Boolean),
      visualDescription: vdRaw || primary?.text,
      prompt: [vdRaw, primary?.text, rawBody].filter(Boolean).join("。"),
    });
    if (cu.conflict && cu.healMode === "slice_cast" && cu.primaryName) {
      // 配方智能适配：按文学意图降出场人数（≠改 VD，≠拆镜）
      const p = cu.primaryName;
      const match = (label: string) => {
        const a = String(label ?? "").trim();
        return a && (a === p || a.includes(p) || p.includes(a));
      };
      const kept = castChars.filter((c) => match(c.name || "") || match(String(c.code || "").replace(/^CHAR-/i, "")));
      const scenes = (ctx.characters ?? []).filter((c) => c.kind === "scene");
      ctx.characters = kept.length ? [...kept, ...scenes] : [{ name: p, kind: "character" as const }, ...scenes];
      sources.push("recipeAdapt.cuCastSlice");
      warnings.push(`cu_cast_sliced:${p}`);
      didCuCastSlice = true;
    } else if (cu.conflict) {
      return cuCastBlockResult(
        warnings,
        sources,
        scrubRaw.scrubbed || dirtyInput,
        dirtyInput,
        effectiveMode,
        cu.message,
      );
    }
  }
  if (
    !primary &&
    (shouldWarnOneBeat(String(ctx.compiledImagePrompt ?? "")) ||
      shouldWarnOneBeat(String(ctx.promptFromStoryboard ?? "")) ||
      shouldWarnOneBeat(String(ctx.previousVisualBody ?? "")))
  ) {
    return oneBeatBlockResult(
      warnings,
      sources,
      scrubRaw.scrubbed || dirtyInput,
      dirtyInput,
      effectiveMode,
      "无可用单拍画面描写（旧 prompt/compiled 多拍已丢弃），须拆镜后重编",
    );
  }
  if (primary) {
    if (primary.trimmed) {
      warnings.push("still_multi_beat_trim");
      sources.push("policy.oneBeat.trim");
    }
    if (effectiveMode === "full" || effectiveMode === "fidelity" || !descParts.length) {
      if (effectiveMode === "full") descParts.length = 0;
      if (!descParts.some((p) => p.includes(primary.text.slice(0, 12)))) {
        descParts.unshift(primary.text);
      }
      sources.push(primary.source);
      didSynthesize = true;
    } else if (effectiveMode === "refine" && !descParts.join("").includes(primary.text.slice(0, 8))) {
      descParts.unshift(primary.text);
      sources.push(primary.source);
      didSynthesize = true;
    }
    const charNames = (ctx.characters ?? [])
      .filter((c) => c.kind !== "scene")
      .map((c) => c.name || "")
      .filter(Boolean);
    entityAnchors = slimEntityAnchors(extractEntityAnchors(primary.text, charNames));
  }

  for (let i = 0; i < descParts.length; i++) {
    const peeled = peelOsFromVisual(descParts[i]!);
    if (peeled.visual !== descParts[i]) {
      descParts[i] = peeled.visual;
      sources.push("still.peelOs");
    }
  }
  // Face CU / 已 slice：剥「仅N≥2人」泄漏后，写入仅1人正契约（防殿内群像）
  if (didCuCastSlice || sources.includes("recipeAdapt.cuCastSlice")) {
    try {
      const { stripCastCardinalityLeakForFaceCu } =
        require("./stillRefSlotContract") as typeof import("./stillRefSlotContract");
      for (let i = 0; i < descParts.length; i++) {
        descParts[i] = stripCastCardinalityLeakForFaceCu(descParts[i]!);
      }
      for (let i = 0; i < supportParts.length; i++) {
        if (/出镜人数/.test(supportParts[i]!)) {
          supportParts[i] = stripCastCardinalityLeakForFaceCu(supportParts[i]!);
        }
      }
      if (primary?.text && /出镜人数/.test(primary.text)) {
        primary.text = stripCastCardinalityLeakForFaceCu(primary.text);
      }
      const hero =
        (ctx.characters ?? []).find((c) => c.kind !== "scene")?.name ||
        warnings.find((w) => w.startsWith("cu_cast_sliced:"))?.replace("cu_cast_sliced:", "") ||
        "";
      if (hero && !supportParts.some((p) => /出镜人数：仅1人/.test(p))) {
        supportParts.push(`出镜人数：仅1人（${hero}）；禁止第二人、群像、重复分身`);
        sources.push("recipeAdapt.cuCastSingleCard");
      }
    } catch {
      /* optional */
    }
  }
  const mergedDesc = descParts.join("。");
  if (mergedDesc && shouldWarnOneBeat(mergedDesc)) {
    return oneBeatBlockResult(
      warnings,
      sources,
      scrubRaw.scrubbed || dirtyInput,
      dirtyInput,
      effectiveMode,
      "合稿画面多拍，须智能拆镜后再 compose",
    );
  }

  const charNamesForBind = (ctx.characters ?? [])
    .filter((c) => c.kind !== "scene")
    .map((c) => c.name || c.code || "")
    .filter(Boolean);

  const predPack: DescPredicatePack = extractDescPredicates({
    description: primary?.text ?? ctx.visualDescription ?? "",
    characterNames: charNamesForBind,
  });
  // Seating / mid-wide content contract forces non-hand recipe (re-resolve)
  recipeAdapt = resolveStillRecipeAdapt({
    visualDescription: vdRaw || primary?.text,
    shotSize: ctx.shotSize,
    picture: (ctx as { picture?: string }).picture,
    videoDesc: ctx.videoDesc,
    hasSeatingOrKneel: predPack.hasSeatingOrKneel,
  });
  if (predPack.hasSeatingOrKneel && recipeAdapt.mode === "face_or_scene") {
    sources.push("recipeAdapt.seatingOverride");
  }
  const hasSceneLink = (() => {
    try {
      const { inferHasSceneLink } = require("./shotModalityIntent") as typeof import("./shotModalityIntent");
      return inferHasSceneLink({
        sceneCode: ctx.sceneCode,
        sceneName: (ctx as { sceneName?: string }).sceneName,
        sceneAssets: ctx.sceneAssets,
        promptText: `${ctx.rawPrompt ?? ""}\n${ctx.promptFromStoryboard ?? ""}\n${primary?.text ?? ""}`,
      });
    } catch {
      return Boolean(
        String(ctx.sceneCode ?? "").trim() ||
          (ctx.sceneAssets ?? []).some((s) => s?.code || s?.name) ||
          /--sref\s+SCENE-/i.test(String(ctx.rawPrompt ?? ctx.promptFromStoryboard ?? "")),
      );
    }
  })();
  // Canvas parity: if sref present but sceneCode empty, backfill
  if (hasSceneLink && !String(ctx.sceneCode ?? "").trim()) {
    try {
      const { inferSceneCodeFromText } =
        require("./shotModalityIntent") as typeof import("./shotModalityIntent");
      const code = inferSceneCodeFromText(
        `${ctx.rawPrompt ?? ""}\n${ctx.promptFromStoryboard ?? ""}\n${primary?.text ?? ""}`,
      );
      if (code) ctx.sceneCode = code;
    } catch {
      /* optional */
    }
  }
  const modality = deriveShotModalityIntent({
    visualDescription: primary?.text ?? ctx.visualDescription ?? "",
    shotSize: ctx.shotSize,
    characterNames: charNamesForBind,
    sceneEstablishingHint:
      Boolean((ctx as { sceneEstablishing?: boolean }).sceneEstablishing) ||
      /建立镜头|establishing|空镜建立|全景建立/i.test(String(primary?.text ?? ctx.visualDescription ?? "")),
    hasSceneLink,
    stillIntentClass: (ctx as { stillIntentClass?: string }).stillIntentClass,
  });
  const generationContract = deriveGenerationContract({
    visualDescription: primary?.text ?? ctx.visualDescription ?? "",
    shotSize: ctx.shotSize,
    spatialRelation: ctx.spatialRelation,
    foreground: ctx.foreground,
    background: ctx.background,
    sceneCode: ctx.sceneCode,
    sceneName: ctx.sceneName,
    dialogueLines: ctx.dialogueSpeakers,
    characterNames: charNamesForBind,
    episodeShot: ctx.episodeShot,
  });
  // Stamp DesignIntentProfile early so early-return debt paths still persist carriers
  try {
    const { deriveDesignIntentProfile } =
      require("./designIntentProfile") as typeof import("./designIntentProfile");
    const { clampProfileToPriorSeal } =
      require("./primaryIntentSeal") as typeof import("./primaryIntentSeal");
    let dipEarly = deriveDesignIntentProfile({
      visualDescription: primary?.text ?? ctx.visualDescription,
      imagePrompt: ctx.compiledImagePrompt,
      shotSize: ctx.shotSize,
      background: ctx.background,
      foreground: ctx.foreground,
      spatialRelation: ctx.spatialRelation,
      microExpression: ctx.microExpression,
      characterNames: charNamesForBind,
      bgBlur: (ctx as { bgBlur?: boolean }).bgBlur,
    });
    if (ctx.priorPrimaryIntentSeal?.sealHash) {
      let earlyHash = "";
      try {
        const { literaryL0Blob } = require("./literaryStillSsot") as typeof import("./literaryStillSsot");
        const { createHash } = require("crypto") as typeof import("crypto");
        earlyHash = createHash("sha256")
          .update(
            literaryL0Blob({
              visualDescription: primary?.text ?? ctx.visualDescription,
              compiledImagePrompt: ctx.compiledImagePrompt,
              background: ctx.background,
            }),
          )
          .digest("hex")
          .slice(0, 16);
      } catch {
        /* optional */
      }
      dipEarly = clampProfileToPriorSeal(dipEarly, ctx.priorPrimaryIntentSeal, earlyHash);
    }
    (generationContract as { designIntentProfile?: unknown }).designIntentProfile = {
      classes: dipEarly.classes,
      plateMode: dipEarly.plateMode,
      glyphPolicy: dipEarly.glyphPolicy,
      glyphText: dipEarly.glyphText,
      propClassId: dipEarly.propClassId,
      primaryObjective: dipEarly.primaryObjective,
      poseOccupancy: dipEarly.poseOccupancy,
      gripLocus: dipEarly.gripLocus,
      seatingXorPickup: dipEarly.seatingXorPickup,
      contactXorPickup: dipEarly.contactXorPickup,
      secondaryBudget: dipEarly.secondaryBudget,
      fragment: dipEarly.fragment,
      dofBudget: dipEarly.dofBudget,
      formScale: dipEarly.formScale,
      atmosphere: dipEarly.atmosphere,
    };
    try {
      const { sealPrimaryIntentCarriers, primaryIntentSealEcho } =
        require("./primaryIntentSeal") as typeof import("./primaryIntentSeal");
      let literaryHash = "";
      try {
        const { literaryL0Blob } = require("./literaryStillSsot") as typeof import("./literaryStillSsot");
        const { createHash } = require("crypto") as typeof import("crypto");
        literaryHash = createHash("sha256")
          .update(
            literaryL0Blob({
              visualDescription: primary?.text ?? ctx.visualDescription,
              compiledImagePrompt: ctx.compiledImagePrompt,
              background: ctx.background,
              foreground: ctx.foreground,
              spatialRelation: ctx.spatialRelation,
            }),
          )
          .digest("hex")
          .slice(0, 16);
      } catch {
        try {
          const { hashLiteraryDesc } = require("../qc/stillFirstFrameGate") as typeof import("../qc/stillFirstFrameGate");
          literaryHash = hashLiteraryDesc(String(primary?.text ?? ctx.visualDescription ?? ""));
        } catch {
          /* optional */
        }
      }
      const earlySeal = sealPrimaryIntentCarriers({
        profile: dipEarly,
        literaryHash,
        spatialRelation: ctx.spatialRelation,
      });
      (generationContract as { primaryIntentSeal?: unknown }).primaryIntentSeal =
        primaryIntentSealEcho(earlySeal);
    } catch {
      /* optional */
    }
  } catch {
    /* optional */
  }
  const bgPolicyResult = modality.bgPolicy;
  // Seal softEnv from Match sample: bg.scene_soft Must → keepSoftEnvRef + continuity=must (同源 DIP/contract)
  // Exception: bend/action T2I-first — sample Must must not re-hang altar SCENE over dropFullSoftEnv
  let keepSoftEnvSealed = Boolean(bgPolicyResult.keepSoftEnvRef);
  let softEnvContinuitySealed: "must" | "optional" | "none" =
    bgPolicyResult.softEnvContinuity ?? (keepSoftEnvSealed ? "optional" : "none");
  const bendDropSoftEnv =
    Boolean(bgPolicyResult.omitSrefToken) ||
    /bend_action:t2i_first|t2i_first_drop_scene/.test(String(bgPolicyResult.reason ?? "")) ||
    /弯腰|捡起|捡拾|俯身|触地捡/.test(String(ctx.visualDescription ?? ""));
  try {
    const sample = (ctx as {
      shotDesignSample?: { must?: Array<{ id?: string }> };
    }).shotDesignSample;
    const sceneMust = Boolean(
      sample?.must?.some((m) => m.id === "bg.scene_soft" || m.id === "bg.composition"),
    );
    if (sceneMust && !bendDropSoftEnv) {
      keepSoftEnvSealed = true;
      softEnvContinuitySealed = "must";
      bgPolicyResult.keepSoftEnvRef = true;
      bgPolicyResult.softEnvContinuity = "must";
      (modality as { keepSoftEnvRef?: boolean }).keepSoftEnvRef = true;
      (modality as { softEnvContinuity?: string }).softEnvContinuity = "must";
      sources.push("seal.sample.bg.scene_soft");
      const noShallow = (ctx as { bgBlur?: boolean }).bgBlur === false;
      if (
        !supportParts.some((p) => /主场景|殿内轮廓|禁止灰棚/.test(p)) &&
        !/主场景/.test(String(bgPolicyResult.bgGuidance ?? ""))
      ) {
        supportParts.push(
          noShallow
            ? "背景：主场景环境轮廓可辨（木作/烛光），禁止浅景深抢戏，禁止香案/佛像升为主构图；裙摆/衣角可为加强虚化"
            : "背景：主场景浅景深虚化（殿内轮廓/烛光可辨），禁止灰棚白棚；裙摆/衣角可为加强虚化",
        );
        sources.push("seal.sample.bg.scene_soft.guidance");
      }
      // compress-readable: never leave skirt-only as sole bg when scene Must
      if (/背景仅次角裙摆|仅裙摆\/衣角碎片虚化浅景深/.test(String(bgPolicyResult.bgGuidance ?? ""))) {
        bgPolicyResult.bgGuidance = noShallow
          ? "背景：主场景环境轮廓可辨（木作/烛光），禁止浅景深抢戏，禁止香案/佛像升为主构图；裙摆/衣角可为加强虚化，禁止次角完整正脸抢戏"
          : "背景：主场景浅景深虚化（殿内轮廓/烛光可辨），禁止灰棚白棚；裙摆/衣角可为加强虚化，禁止次角完整正脸抢戏";
        bgPolicyResult.reason = `${bgPolicyResult.reason}|seal_scene_soft_must`;
      }
    } else if (sceneMust && bendDropSoftEnv) {
      keepSoftEnvSealed = false;
      softEnvContinuitySealed = "none";
      bgPolicyResult.keepSoftEnvRef = false;
      bgPolicyResult.softEnvContinuity = "none";
      bgPolicyResult.omitSrefToken = true;
      (modality as { keepSoftEnvRef?: boolean }).keepSoftEnvRef = false;
      sources.push("seal.sample.bg.scene_soft.skipped_bend_t2i");
    }
  } catch {
    /* optional */
  }
  if (bgPolicyResult.bgGuidance) {
    supportParts.push(bgPolicyResult.bgGuidance);
    sources.push(`bgPolicy.${bgPolicyResult.policy}`);
    sources.push(`bgMode.${modality.bgMode}`);
  }
  // Face-CU look anchor early — only when bgPolicy truly faceCu (MS never)
  if (bgPolicyResult.reason === "faceCuDropScene" && qualityMode === "hq_update") {
    try {
      const { pickVdLiteraryPrimary, STILL_PRIMARY_LOOK_HEAL_TEMPLATE } =
        require("./stillFirstFrameLiterarySsot") as typeof import("./stillFirstFrameLiterarySsot");
      const hero = pickVdLiteraryPrimary(
        String(ctx.visualDescription ?? primary?.text ?? ""),
        charNamesForBind,
      );
      if (hero && !supportParts.some((p) => /本镜主look/.test(p))) {
        supportParts.push(STILL_PRIMARY_LOOK_HEAL_TEMPLATE.replace(/\{NAME\}/g, hero));
        sources.push("look.anchor.faceCu");
      }
    } catch {
      /* optional */
    }
  }
  // Skirt / body-fragment background contract
  try {
    const { resolveBgFragment } =
      require("./stillFirstFrameLiterarySsot") as typeof import("./stillFirstFrameLiterarySsot");
    const frag = resolveBgFragment({
      visualDescription: ctx.visualDescription,
      background: ctx.background,
      imagePrompt: ctx.compiledImagePrompt,
      spatialRelation: ctx.spatialRelation,
    });
    if (frag.guidance && !supportParts.some((p) => /裙摆虚化|身体碎片|衣角\/袖缘/.test(p))) {
      supportParts.push(frag.guidance);
      sources.push(`bg.fragment.${frag.kind ?? "body"}`);
    }
  } catch {
    /* optional */
  }
  // Action-primary lead: first-frame extract already owns action — skip VD grip-complete prepend
  try {
    const ff = (ctx as { firstFrameExtract?: { stillPhase?: string; actionLine?: string } }).firstFrameExtract;
    const phase = String(ff?.stillPhase ?? (ctx as { stillPhase?: string }).stillPhase ?? "");
    if (phase === "approaching" || phase === "mid_contact") {
      sources.push("action.primary.lead:skip_ff_owns");
    } else {
      const { ACTION_PRIMARY_SURVIVE_STEMS } =
        require("./stillFirstFrameLiterarySsot") as typeof import("./stillFirstFrameLiterarySsot");
      const vdAct = String(ctx.visualDescription ?? primary?.text ?? "");
      if (ACTION_PRIMARY_SURVIVE_STEMS.test(vdAct)) {
        const head =
          vdAct.match(/[^。；;\n]*(?:弯腰|捡起|捡|俯身)[^。；;\n]{0,40}/)?.[0]?.trim() ||
          "";
        // Never pull 捏紧/指节 into still lead when process VD
        if (head && !/捏紧|指节/.test(head) && !descParts.some((p) => p.includes(head.slice(0, 8)))) {
          descParts.unshift(`动作主导：${head.slice(0, 80)}`);
          sources.push("action.primary.lead");
        }
      }
    }
  } catch {
    /* optional */
  }
  // Stack: description → predicate hard → binding → anchors
  if (predPack.hardConstraintLine) {
    descParts.push(predPack.hardConstraintLine);
    sources.push("desc.hardConstraint");
  }
  // Contact-event: force prop-in-frame + contact geom — skip cheek legislation when bend_pickup wins
  try {
    const { isContactEventVd, matchContactEventVd, loadContactEventPolicy } =
      require("./contactEventPolicy") as typeof import("./contactEventPolicy");
    const litForContact = String(vdRaw || primary?.text || mergedDesc || "");
    const bendPrimary =
      /弯腰|捡起|捡拾|俯身/.test(litForContact) ||
      (generationContract as { designIntentProfile?: { poseOccupancy?: string; contactXorPickup?: boolean } })
        ?.designIntentProfile?.poseOccupancy === "bend_pickup" ||
      Boolean(
        (generationContract as { designIntentProfile?: { contactXorPickup?: boolean } })?.designIntentProfile
          ?.contactXorPickup,
      );
    if (isContactEventVd(litForContact) && !bendPrimary) {
      const m = matchContactEventVd(litForContact);
      const prop = m.propCanonical || m.propAlias || "道具";
      const locus = m.locus || "面颊";
      const propLine = `道具入画：须清晰可见${prop}与${locus}真实贴合/划过接触，禁止悬空，禁止仅浅痕无${prop}`;
      if (!descParts.some((p) => p.includes(prop) && /道具入画|须清晰可见/.test(p))) {
        descParts.push(propLine);
        sources.push("contactEvent.propInFrame");
      }
      // G2: HARD negative belt — mouth-ban / locus-only (theme glue, not 休书-only)
      const mouthBan = `禁口含；禁纸入口；仅${locus}触非口含`;
      const joinedDesc = descParts.join("。");
      if (
        !/禁口含/.test(joinedDesc) ||
        !/(?:禁纸入口|纸未入口)/.test(joinedDesc) ||
        !new RegExp(`仅(?:${locus}|颊)触`).test(joinedDesc)
      ) {
        descParts.push(mouthBan);
        sources.push("contactEvent.mouthBanHard");
      }
      const policy = loadContactEventPolicy();
      if (
        policy.framingPolicy?.preferLayoutFamily === "insert_hand_or_prop" &&
        /特写|大特|ecu|cu/i.test(String(ctx.shotSize ?? litForContact))
      ) {
        supportParts.push("景别策略：纸角/道具贴颊边缘可读优先；不可读则拆持物镜+反应镜");
        sources.push("contactEvent.framing");
      }
      // Recipe collision: face_or_scene + identity faceLock must not silent-drop prop
      try {
        const { resolveContactPropVsFaceIdentity } =
          require("../design/litEnhanceRecipeCollision") as typeof import("../design/litEnhanceRecipeCollision");
        const col = resolveContactPropVsFaceIdentity({
          visualDescription: litForContact,
          recipeMode: recipeAdapt.mode,
          sources,
          descJoined: descParts.join("。"),
        });
        if (col.hit) {
          if (col.appendPropLine && !descParts.some((p) => /道具入画/.test(p))) {
            descParts.push(col.appendPropLine);
          }
          if (col.sourceTag && !sources.includes(col.sourceTag)) sources.push(col.sourceTag);
          if (col.severity === "BLOCK" && col.hit) {
            try {
              const { auditRecipeCollisions } =
                require("../design/litEnhanceRecipeCollision") as typeof import("../design/litEnhanceRecipeCollision");
              const blockRows = auditRecipeCollisions({
                contactPropInFrame: true,
                recipeFaceOrScene: String(recipeAdapt.mode ?? "") === "face_or_scene",
                identityFaceLock: (sources ?? []).some((s) => /identityLock|identity\.face/i.test(s)),
              }).filter((r) => r.severity === "BLOCK");
              if (blockRows.length) {
                (ctx as { recipeCollisionBlock?: string }).recipeCollisionBlock = blockRows
                  .map((r) => r.id)
                  .join(",");
              }
            } catch {
              /* optional */
            }
          }
        }
      } catch {
        /* optional collision */
      }
    }
  } catch {
    /* optional */
  }
  layerDesignConsume(ctx, supportParts, sources);
  if (predPack.negativeBanLine) {
    descParts.push(predPack.negativeBanLine);
    sources.push("desc.negativeBan");
  }
  // Merge predicate props into anchors
  entityAnchors = slimEntityAnchors([
    ...entityAnchors,
    ...predicateAnchorTokens(predPack, charNamesForBind),
  ]);

  const identityBind = resolveShotIdentityBinding({
    description: primary?.text ?? ctx.visualDescription ?? "",
    characters: (ctx.characters ?? []).filter((c) => c.kind !== "scene"),
    assetCodes: (ctx.characters ?? []).map((c) => c.code || "").filter(Boolean),
    seatingHard: predPack.hasSeatingOrKneel,
  });
  if (identityBind.bindingLine) {
    // Guard: never emit same-name dual 站位绑定
    const sameDual =
      /站位绑定：(.+?)=高位/.test(identityBind.bindingLine) &&
      (() => {
        const m1 = identityBind.bindingLine!.match(/站位绑定：(.+?)=高位/);
        const m2 = identityBind.bindingLine!.match(/，(.+?)=低位/);
        return m1 && m2 && m1[1] === m2[1];
      })();
    const isSeatBind = /^站位绑定：/.test(identityBind.bindingLine);
    // HQ non-seating: omit「身份顺序」soup; never pour 站位绑定 without seatingHard
    const isIdOrder = /^身份顺序：/.test(identityBind.bindingLine);
    const skipIdOrderSoup = qualityMode === "hq_update" && !predPack.hasSeatingOrKneel && isIdOrder;
    const skipSeatBind = !predPack.hasSeatingOrKneel && isSeatBind;
    if (!sameDual && !skipIdOrderSoup && !skipSeatBind) {
      supportParts.push(identityBind.bindingLine);
      sources.push("identity.binding");
    } else if (skipSeatBind) {
      sources.push("identity.binding.omitSeatBindNonSeating");
    } else if (skipIdOrderSoup) {
      sources.push("identity.binding.omitIdOrderHq");
    } else {
      warnings.push("skipped same-person dual binding line");
    }
  }

  // Exact cast cardinality — mustSurvive content contract
  {
    const castForCard =
      identityBind.orderedNames.filter(Boolean).length >= 1
        ? identityBind.orderedNames.filter(Boolean)
        : charNamesForBind.filter(Boolean);
    // Face CU: do not force full-cast「仅N人」line (景别/VD 同核；场面镜再写人数契约)
    let skipCastCard = false;
    try {
      const { resolveFaceCuFraming } =
        require("../design/detectCuCastConflict") as typeof import("../design/detectCuCastConflict");
      const fr = resolveFaceCuFraming({
        shotSize: ctx.shotSize,
        visualDescription: vdRaw || primary?.text,
        prompt: rawBody,
      });
      skipCastCard = fr.faceCu || recipeAdapt.mode === "ecu_face";
    } catch {
      try {
        const { isCuShotSize } =
          require("./stillLiteraryIntentSsot") as typeof import("./stillLiteraryIntentSsot");
        skipCastCard = isCuShotSize(ctx.shotSize) || recipeAdapt.mode === "ecu_face";
      } catch {
        /* optional */
      }
    }
    if (
      !skipCastCard &&
      castForCard.length >= 1 &&
      (predPack.hasSeatingOrKneel || castForCard.length >= 2)
    ) {
      try {
        const skirt =
          String((ctx as { narrative?: { secondaryBudget?: string } }).narrative?.secondaryBudget ?? "") ===
            "skirt_blur" ||
          /裙摆|衣角虚化/.test(String(ctx.visualDescription ?? "") + String(ctx.background ?? ""));
        if (skirt && castForCard.length >= 2) {
          // Soft fragment secondary — keep literary cast card (仅N人) + soft blur note
          const names = castForCard.map((c) =>
            typeof c === "string" ? c : String((c as { name?: string })?.name ?? ""),
          ).filter(Boolean);
          const heroName =
            String((ctx as { narrative?: { literaryPrimary?: string } }).narrative?.literaryPrimary ?? "") ||
            names[0] ||
            "主角";
          const softName = names.find((n) => n !== heroName) || "";
          supportParts.push(
            softName
              ? `出镜人数：完整入画仅1人（${heroName}）；${softName}仅裙摆/衣角碎片虚化，禁止完整正脸/半身立像与持物抢戏，禁止第三人`
              : `出镜人数：完整入画仅1人（${heroName}）；次角仅裙摆/衣角虚化，禁止完整正脸立像`,
          );
          sources.push("identity.castCardinality.skirt_blur");
        } else {
        const { buildCastCardinalityLine } = require("./stillRefSlotContract") as typeof import("./stillRefSlotContract");
        const cardLine = buildCastCardinalityLine(castForCard);
        if (cardLine && !supportParts.some((p) => /出镜人数/.test(p)) && !descParts.some((p) => /出镜人数/.test(p))) {
          supportParts.push(cardLine);
          sources.push("identity.castCardinality");
        }
        }
      } catch {
        /* optional */
      }
    }
  }

  const art = ctx.artStyle?.trim();
  if (art && mode !== "fidelity" && !isArtStyleToken(art)) {
    supportParts.push(`画风：${art.slice(0, 80)}`);
    sources.push("project.artStyle");
  }

  layerShootableExtras(ctx, supportParts, sources, effectiveMode);

  if (!measureVisualBody(descParts.join(" ")).ok) {
    if (layerSkeletonScene(ctx, descParts, sources, recipeAdapt)) didSynthesize = true;
  }

  const userPatch = preserveUserPatches(rawBody, primary?.text ?? "");
  if (userPatch) {
    const already = [...descParts, ...supportParts].join("").includes(userPatch.slice(0, Math.min(12, userPatch.length)));
    if (!already) {
      // full: keep non-noise user beats; refine/fidelity: always prefer user patches
      supportParts.push(userPatch);
      sources.push("rawPrompt.patch");
    }
  }

  if (entityAnchors.length) {
    let anchors = entityAnchors;
    let vdPrimary = "";
    try {
      const { pickVdLiteraryPrimary, orderAnchorsByVdPrimary } =
        require("./stillFirstFrameLiterarySsot") as typeof import("./stillFirstFrameLiterarySsot");
      vdPrimary = pickVdLiteraryPrimary(
        primary?.text ?? ctx.visualDescription,
        (ctx.characters ?? []).map((c) => c.name || "").filter(Boolean),
      );
      if (vdPrimary) anchors = orderAnchorsByVdPrimary(anchors, vdPrimary);
    } catch {
      /* optional */
    }
    if (recipeAdapt.limitMustAppearToPrimary && !predPack.hasSeatingOrKneel) {
      const primaryName =
        vdPrimary ||
        identityBind.orderedNames[0] ||
        (ctx.characters ?? []).find((c) => c.kind !== "scene")?.name ||
        "";
      let propish = anchors.filter((a) => /扳指|玉|刀|剑|杯|盏|烛|信|书|戒指|道具|袖|手|休书|婚书|信笺|纸角|帕/.test(a));
      try {
        const { isPropishAnchorToken } =
          require("./contactEventPolicy") as typeof import("./contactEventPolicy");
        propish = anchors.filter((a) => isPropishAnchorToken(a));
      } catch {
        /* keep fallback filter */
      }
      const nameHit = primaryName ? anchors.filter((a) => a.includes(primaryName) || primaryName.includes(a)) : [];
      anchors = slimEntityAnchors([...nameHit, ...propish].slice(0, 3));
      if (!anchors.length && primaryName) anchors = [primaryName];
      sources.push("entity.anchors.recipeAdaptLimited");
    } else if (predPack.hasSeatingOrKneel) {
      // Seating: keep all cast names from identity bind + props
      const castNames = identityBind.orderedNames.filter(Boolean);
      anchors = slimEntityAnchors([...castNames, ...anchors]);
      sources.push("entity.anchors.seatingFullCast");
    } else if (vdPrimary && qualityMode === "hq_update") {
      // Short shell: primary + prop only (no dual-name 必须出现展板)
      let propish = anchors.filter((a) => /扳指|玉|刀|剑|杯|盏|烛|信|书|戒指|道具|袖|手|休书|婚书|信笺|纸角|帕/.test(a));
      try {
        const { isPropishAnchorToken } =
          require("./contactEventPolicy") as typeof import("./contactEventPolicy");
        propish = anchors.filter((a) => isPropishAnchorToken(a));
      } catch {
        /* keep fallback filter */
      }
      anchors = slimEntityAnchors([vdPrimary, ...propish].slice(0, 2));
      sources.push("entity.anchors.vdPrimaryFirst");
    }
    const line = `必须出现：${anchors.join("、")}`;
    // Always keep mustAppear in HQ egress — omitMustAppearHq caused PROMPT-FIDELITY self-contradiction
    if (mode === "fidelity") {
      descParts.push(line);
      descParts.push(`再次强调场面：${primary?.text?.slice(0, 120) ?? anchors.join("、")}`);
      sources.push("fidelity.entityReplay");
    } else {
      supportParts.push(line);
      sources.push("entity.anchors");
      // Also fold tokens into descParts so strip of support cannot drop coverage
      const lock = anchors.filter((a) => a.length >= 2).slice(0, 4).join("、");
      if (lock && !descParts.some((p) => anchors.every((a) => p.includes(a) || a.length < 2))) {
        descParts.push(`场面锚点：${lock}`);
        sources.push("entity.anchors.egressLock");
      }
    }
    entityAnchors = anchors;
  }

  const missingLeadAsset = layerCharacterPerf(ctx, supportParts, sources, warnings, effectiveMode, {
    omitPersonality: predPack.hasSeatingOrKneel,
    adapt: recipeAdapt,
  });
  layerBeatBlocking(
    ctx,
    supportParts,
    sources,
    identityBind.highRole?.name || identityBind.orderedNames[0],
    recipeAdapt,
    {
      hasSeatingOrKneel: predPack.hasSeatingOrKneel,
      visualDescription: primary?.text ?? ctx.visualDescription,
    },
  );
  layerRefIdentityLock(ctx, supportParts, sources, {
    seatingHard: predPack.hasSeatingOrKneel,
    adapt: recipeAdapt,
  });
  layerNeighborWarn(ctx, warnings);
  if (ctx.continuityInject?.trim()) {
    let contText: string | null = null;
    let contOmitted = false;
    let contTrunc = false;
    try {
      const { softenContinuityForFirstFrame } =
        require("./stillFirstFrameLiterarySsot") as typeof import("./stillFirstFrameLiterarySsot");
      const soft = softenContinuityForFirstFrame({
        continuity: ctx.continuityInject,
        visualDescription: primary?.text ?? ctx.visualDescription,
        maxChars: 36,
        castNames: (ctx.characters ?? [])
          .filter((c) => c.kind !== "scene")
          .map((c) => c.name || "")
          .filter(Boolean),
      });
      contText = soft.text;
      contTrunc = soft.truncated;
      if (soft.strippedContamination) sources.push("cross.continuity.stripContamination");
      if (soft.omittedOffCast) sources.push("cross.continuity.stripOffCast");
      if (!soft.text && soft.strippedContamination) sources.push("cross.continuity.omitEmpty");
    } catch {
      const cont = applyContinuityPolicy(ctx.continuityInject, ctx.shotSize);
      contText = cont.text;
      contOmitted = cont.omitted;
      contTrunc = cont.truncated;
    }
    if (contText) {
      const hard = predPack.hardConstraintLine;
      supportParts.push(contText.startsWith("continuity:") ? contText : `continuity: ${contText}`);
      if (hard && !supportParts.some((p) => p.includes("场面硬约束")) && !descParts.some((p) => p.includes("场面硬约束"))) {
        descParts.push(hard);
        sources.push("desc.hardConstraint.reassertAfterContinuity");
      }
      sources.push(contTrunc ? "cross.continuity.truncated" : "cross.continuity");
    } else if (contOmitted) {
      sources.push("cross.continuity.ecuOmit");
    }
  }
  layerMouthLipGuard(ctx, supportParts, sources, recipeAdapt);
  layerQcStrengthen(ctx, supportParts, sources);

  // Declare composition line only when literary description already signals seating/power
  if (predPack.hasSeatingOrKneel && /权力反差|高位|低位/.test(primary?.text ?? ctx.visualDescription ?? "")) {
    if (!supportParts.some((p) => /构图：/.test(p))) {
      supportParts.push("构图：高位端坐 / 低位跪姿，权力反差，主体清晰不抢戏");
      sources.push("desc.compositionDeclare");
    }
  }

  let visualBody = [...descParts, ...supportParts]
    .filter(Boolean)
    .join("。")
    .replace(/。。+/g, "。")
    .trim();

  const expr = detectAndStripQfExpr(visualBody);
  if (expr.hit) {
    visualBody = expr.cleaned;
    sources.push("QF-EXPR");
    warnings.push("stripped face-rewrite phrases");
  }

  if (!measureVisualBody(visualBody).ok && layerSkeletonScene(ctx, descParts, sources, recipeAdapt)) {
    didSynthesize = true;
    visualBody = [...descParts, ...supportParts].filter(Boolean).join("。").replace(/。。+/g, "。").trim();
  }

  // VD + ff.spine may restack the same action clause — dedupe so onebeat doesn't false-green warn
  try {
    const { dedupeNarrativeClauses } =
      require("./stillIdentitySsot") as typeof import("./stillIdentitySsot");
    const deduped = dedupeNarrativeClauses(visualBody);
    if (deduped !== visualBody) {
      visualBody = deduped;
      sources.push("visualBody.narrative_clause_dedupe");
    }
  } catch {
    /* optional */
  }

  // QP-02 judges literary shootability — strip bgPolicy/recipe garnish so 木作/烛光 wash cannot fake-green abstract-only VD
  const literaryForQp02 = stripStaleBindingFromPrevious(scrubStillPromptNoise(visualBody).cleaned);
  const qp02 = checkQp02VisualDescription({ visualDescription: literaryForQp02 });
  if (qp02?.severity === "WARN") warnings.push(qp02.message);
  if (qp02 && qp02.severity === "BLOCK") {
    if (hasAnyAnchor(ctx)) {
      if (layerSkeletonScene(ctx, descParts, sources, recipeAdapt)) {
        didSynthesize = true;
        visualBody = [...descParts, ...supportParts].filter(Boolean).join("。").replace(/。。+/g, "。").trim();
      }
      warnings.push(qp02.message);
    } else {
      const primaryBlock = buildPrimaryBlock("chat_repair", {
        stage: "prompt",
        userMessageOverride: "缺少可拍画面描述，请先补分镜画面（谁在哪做什么）",
      });
      return {
        ok: false,
        prompt: rawTokens,
        visualBody,
        didSynthesize,
        scrubbed: scrubRaw.scrubbed || dirtyInput,
        composeMode: mode,
        sources,
        warnings,
        entityAnchors,
        blockReason: qp02.message,
        primaryNextStep: primaryBlock.primaryNextStep,
        userMessage: primaryBlock.userMessage,
        ctaLabel: primaryBlock.ctaLabel,
        compositionContractApplied: false,
        complianceHit: false,
        qp02Blocked: true,
        missingLeadAsset,
        dirtyInput,
      };
    }
  }

  if (missingLeadAsset && (ctx.referenceUrlCount ?? 0) < 1) {
    const primaryBlock = buildPrimaryBlock("batch_still", { stage: "prompt" });
    return {
      ok: false,
      prompt: visualBody,
      visualBody,
      didSynthesize,
      scrubbed: scrubRaw.scrubbed || dirtyInput,
      composeMode: mode,
      sources,
      warnings,
      entityAnchors,
      blockReason: "主角定妆图缺失，无法保证身份一致",
      primaryNextStep: primaryBlock.primaryNextStep,
      userMessage: primaryBlock.userMessage,
      ctaLabel: primaryBlock.ctaLabel,
      compositionContractApplied: false,
      complianceHit: false,
      qp02Blocked: false,
      missingLeadAsset: true,
      dirtyInput,
    };
  }

  // Recipe ALWAYS at end; Chinese-only when seating hard (avoid bilingual dilution)
  let compositionContractApplied = false;
  let recipeTail = "";
  if (qualityMode === "hq_update") {
    if (recipeAdapt.mode === "ecu_mouth") {
      const { ECU_MOUTH_HQ_RECIPE, oralEcuMouthNegatives } =
        require("./singleShotClosedCompose") as typeof import("./singleShotClosedCompose");
      const { ECU_MOUTH_HQ_RECIPE: adaptEcu } =
        require("./stillShotRecipeAdapt") as typeof import("./stillShotRecipeAdapt");
      recipeTail = adaptEcu || ECU_MOUTH_HQ_RECIPE;
      supportParts.push(oralEcuMouthNegatives());
      sources.push("compositionContract.ecu_mouth", "closed.oralEcuNegatives");
    } else if (recipeAdapt.useNonFaceHqRecipe && !predPack.hasSeatingOrKneel) {
      recipeTail =
        recipeAdapt.mode === "prop_cu" || recipeAdapt.mode === "empty"
          ? PROP_CU_HQ_RECIPE
          : HAND_CU_HQ_RECIPE;
      sources.push("compositionContract.recipeAdapt");
    } else {
      recipeTail = predPack.hasSeatingOrKneel
        ? "竖屏9:16安全区构图，权力位站位清晰，正脸朝向镜头且主体不裁切，高细节视频首帧；微表情落在锁定脸型上，禁止重塑五官身份。"
        : STILL_HQ_FIRST_FRAME_RECIPE_ZH_EN;
      sources.push("compositionContract");
    }
    compositionContractApplied = true;
    // Anti-collage: short Edit-slim locks only (long ZH mid-sentence ； leftover sticks on refine)
    try {
      const {
        STILL_SINGLE_FRAME_LOCK_EDIT_ZH,
        STILL_SHEET_AS_IDENTITY_ONLY_EDIT_ZH,
      } = require("./stillFirstFrameLiterarySsot") as typeof import("./stillFirstFrameLiterarySsot");
      if (!descParts.some((p) => /单镜头成片|禁四视图/.test(p)) && !supportParts.some((p) => /单镜头成片|禁四视图/.test(p))) {
        supportParts.push(STILL_SINGLE_FRAME_LOCK_EDIT_ZH);
        sources.push("identity.singleFrameLock");
      }
      const hasCast = (ctx.characters ?? []).some((c) => c.kind !== "scene");
      if (
        hasCast &&
        !supportParts.some((p) => /仅借身份|禁复刻多格|仅借脸型/.test(p))
      ) {
        supportParts.push(STILL_SHEET_AS_IDENTITY_ONLY_EDIT_ZH);
        sources.push("identity.sheetAsIdentityOnly");
      }
      // Multi-cref: primary look lock (anti costume blend from peer sheets)
      try {
        const { stillPrimaryLookLockLine } =
          require("./stillLiteraryDetailQuality") as typeof import("./stillLiteraryDetailQuality");
        const charCrefN = (ctx.characters ?? []).filter(
          (c) => c.kind !== "scene" && c.hasImage,
        ).length;
        const primaryLookName =
          (() => {
            try {
              const { pickVdLiteraryPrimary } =
                require("./stillFirstFrameLiterarySsot") as typeof import("./stillFirstFrameLiterarySsot");
              return (
                pickVdLiteraryPrimary(vdRaw || primary?.text, charNamesForBind) ||
                identityBind.orderedNames[0] ||
                identityBind.highRole?.name ||
                charNamesForBind[0] ||
                null
              );
            } catch {
              return identityBind.orderedNames[0] || charNamesForBind[0] || null;
            }
          })();
        const lookLine = stillPrimaryLookLockLine(charCrefN, primaryLookName);
        if (lookLine && !supportParts.some((p) => /主look|禁止混用其他角色/.test(p))) {
          supportParts.push(lookLine);
          sources.push("identity.primaryLookLock");
        }
      } catch {
        /* optional */
      }
    } catch {
      /* optional */
    }
  }

  // Collision guard: never emit hand-cu forbid-face tails on seating mid-shots
  if (predPack.hasSeatingOrKneel) {
    const { stripCollidingRecipeLayers } =
      require("./stillLiteraryIntentSsot") as typeof import("./stillLiteraryIntentSsot");
    const stripped = stripCollidingRecipeLayers(visualBody, { hasSeating: true });
    if (stripped.stripped.length) {
      visualBody = stripped.cleaned;
      sources.push("collision.stripHandCuOnSeating");
    }
    if (/本镜只出手|人像头面部抢戏|手部\/袖口/.test(recipeTail)) {
      recipeTail = predPack.hasSeatingOrKneel
        ? "竖屏9:16安全区构图，权力位站位清晰，正脸朝向镜头且主体不裁切，高细节视频首帧；微表情落在锁定脸型上，禁止重塑五官身份。"
        : recipeTail;
      sources.push("collision.replaceRecipeTail");
    }
  }

  const policy = precheckContentPolicy(visualBody);
  const complianceHit = policy.hasSensitiveTerms;
  if (complianceHit) {
    visualBody = policy.softenedPrompt;
    sources.push("complianceLite");
    warnings.push(...(policy.warnings ?? ["content policy softened"]));
  }

  // Strip mid-body --cref/--sref; emit ordered cref only at tail
  let emptyShotMode = false;
  try {
    const { hasEmptyShotMark } = require("../quality/shotQualityPredicates") as typeof import("../quality/shotQualityPredicates");
    emptyShotMode =
      hasEmptyShotMark(primary?.text ?? ctx.visualDescription ?? "") ||
      hasEmptyShotMark(descParts.join(" "));
  } catch {
    /* optional */
  }
  const strippedBody = stripIdentityTokens(visualBody);
  visualBody = strippedBody.body;
  let orderedCodes = emptyShotMode ? [] : identityBind.orderedCodes.slice();
  // Declare-only: harvest --cref CHAR-* from initial raw token tail when package orderedCodes empty
  if (!emptyShotMode && !orderedCodes.length) {
    const fromTail = `${strippedBody.tokenTail}\n${strippedRaw.tokenTail}\n${String(ctx.rawPrompt ?? "")}`;
    for (const m of fromTail.matchAll(/--cref\s+((?:[A-Za-z]+-[A-Za-z0-9]+\s*)+)/gi)) {
      for (const tok of String(m[1]).split(/\s+/)) {
        const code = tok.replace(/[,，。；;]+$/g, "").toUpperCase();
        if (/^CHAR-/i.test(code) && !orderedCodes.includes(code)) orderedCodes.push(code);
      }
    }
    if (orderedCodes.length) sources.push("identity.rawCrefTail");
  }
  if (!emptyShotMode && !orderedCodes.length) {
    const namedImaged = (ctx.characters ?? []).filter(
      (c) => c.kind !== "scene" && c.code && /^CHAR-/i.test(String(c.code)) && c.hasImage === true,
    );
    if (namedImaged.length) {
      orderedCodes = namedImaged.map((c) => String(c.code));
      sources.push("identity.nameToChar");
    }
  }
  if (!emptyShotMode && !orderedCodes.length) {
    try {
      const { hasFaceCue } = require("../quality/shotQualityPredicates") as typeof import("../quality/shotQualityPredicates");
      const chars = (ctx.characters ?? []).filter((c) => c.kind !== "scene");
      const hasNamed = chars.some((c) => c.name || c.code);
      // Do not treat QF-EXPR / recipe face-lock garnish as literary face cue (else strip→inject→假 DEX-ASSET-CREF)
      const vbForFace = stripStaleBindingFromPrevious(visualBody)
        .replace(/锁定脸型上的细微微表情[（(][^）)]*[）)]/g, " ")
        .replace(/表情细节属分镜静帧/g, " ")
        .replace(/微表情落在锁定脸型上[^。；;\n]*/g, " ")
        .replace(/禁止重塑五官身份\.?/g, " ");
      const face =
        hasFaceCue(vbForFace) ||
        hasFaceCue(String(ctx.visualDescription ?? "")) ||
        hasFaceCue(rawBody) ||
        hasNamed;
      // URL refs already present + lead image not required → soft skip hard cref block
      if (face && ctx.requireLeadAssetImage === false && (ctx.referenceUrlCount ?? 0) > 0) {
        sources.push("identity.refsUrlSkipCref");
      } else if (face) {
        const namedNoImage = chars.some((c) => (c.name || c.code) && c.hasImage === false);
        const primaryBlock = buildPrimaryBlock("chat_repair", {
          stage: "prompt",
          userMessageOverride: namedNoImage
            ? "出脸角色缺定妆图，请回 CD/AS 补定妆后再生成（禁止无 cref 假绿）"
            : "出脸描写缺 CHAR/--cref，请回 SB 补 charCodes 或重设计绑定后再生成",
        });
        return {
          ok: false,
          prompt: "",
          visualBody,
          didSynthesize,
          scrubbed: scrubRaw.scrubbed || dirtyInput,
          composeMode: effectiveMode,
          sources: [...sources, "identity.crefMissingBlock"],
          warnings: [...warnings, "DEX-ASSET-CREF"],
          entityAnchors,
          blockReason: "DEX-ASSET-CREF",
          primaryNextStep: primaryBlock.primaryNextStep,
          userMessage: primaryBlock.userMessage,
          ctaLabel: primaryBlock.ctaLabel,
          compositionContractApplied: false,
          complianceHit,
          qp02Blocked: false,
          missingLeadAsset: namedNoImage,
          dirtyInput,
          generationContract,
        };
      }
    } catch {
      /* optional */
    }
  }
  const orderedTokens = cleanTokenTail(
    [rawTokens, strippedBody.tokenTail, emptyShotMode ? "" : identityBind.crefTail ?? ""].filter(Boolean).join(" "),
    orderedCodes,
    { omitSref: bgPolicyResult.omitSrefToken },
  );
  if (orderedCodes.length) sources.push("identity.crefOrder");
  if (bgPolicyResult.omitSrefToken) sources.push("bgPolicy.omitSref");

  const promptRaw = [visualBody, recipeTail, orderedTokens].filter(Boolean).join(" ").replace(/\s{2,}/g, " ").trim();
  const recipeHeal = healStillRecipePolicy(promptRaw, {
    charCodeCount: orderedCodes.filter((c) => /^CHAR-/i.test(c)).length,
  });
  let prompt = recipeHeal.prompt;
  const generationObjective = deriveStillGenerationObjective({
    contract: generationContract,
    visualDescription: primary?.text ?? ctx.visualDescription ?? "",
    prompt,
  });
  const objectiveApplied = applyGenerationObjectiveToPrompt({
    prompt,
    objective: generationObjective,
    contract: generationContract,
    visualDescription: primary?.text ?? ctx.visualDescription ?? "",
    characterNames: charNamesForBind,
    primaryIntentSeal: (generationContract as { primaryIntentSeal?: import("./primaryIntentSeal").PrimaryIntentCarrierSet })
      .primaryIntentSeal,
  });
  if (objectiveApplied.prompt !== prompt) {
    prompt = objectiveApplied.prompt;
    sources.push("objective.rebalanced");
    sources.push(`objective.${generationContract.objectiveClass}`);
    warnings.push(...generationObjective.strippedFlowHints.map((id) => `objective:${id}`));
  }
  if (objectiveApplied.foundationRestored.length) {
    sources.push("foundation.guard");
    for (const id of objectiveApplied.foundationRestored) sources.push(`foundation.restore:${id}`);
    warnings.push(`foundation restored: ${objectiveApplied.foundationRestored.join(",")}`);
  }
  if (recipeHeal.changed) {
    sources.push("recipe.heal");
    for (const id of recipeHeal.healed) sources.push(`recipe.heal.${id}`);
  }
  try {
    const { sanitizeFirstFrameEgressSoup, healStillLiteraryEgress } =
      require("./stillFirstFrameLiterarySsot") as typeof import("./stillFirstFrameLiterarySsot");
    const cleaned = sanitizeFirstFrameEgressSoup(prompt);
    if (cleaned !== prompt) {
      prompt = cleaned;
      sources.push("identity.sanitizeFirstFrameSoup");
    }
    const healed = healStillLiteraryEgress({
      prompt,
      visualDescription: primary?.text ?? ctx.visualDescription,
      hasSeatingOrKneel: predPack.hasSeatingOrKneel,
      castNames: charNamesForBind,
    });
    if (healed.prompt !== prompt) {
      prompt = healed.prompt;
      sources.push("identity.healLiteraryEgress");
    }
    for (const iss of healed.issues) sources.push(`identity.egress.${iss}`);
  } catch {
    /* optional */
  }

  // DesignIntentProfile lean egress — positiveLeads only (debtHints stay off vendor prompt)
  // Seal PrimaryIntentCarrierSet after match; supplements pass gate
  try {
    const { deriveDesignIntentProfile, designIntentEgressSplit } =
      require("./designIntentProfile") as typeof import("./designIntentProfile");
    const {
      sealPrimaryIntentCarriers,
      shouldResealPrimaryIntent,
      clampProfileToPriorSeal,
      applyNormSupplement,
      gatePromptThroughPrimarySeal,
      primaryIntentSealEcho,
      orderEgressLeadsByPriority,
    } = require("./primaryIntentSeal") as typeof import("./primaryIntentSeal");
    let dip = deriveDesignIntentProfile({
      visualDescription: primary?.text ?? ctx.visualDescription,
      imagePrompt: ctx.compiledImagePrompt,
      shotSize: ctx.shotSize,
      background: ctx.background,
      foreground: ctx.foreground,
      spatialRelation: ctx.spatialRelation,
      microExpression: ctx.microExpression,
      characterNames: charNamesForBind,
      bgBlur: (ctx as { bgBlur?: boolean }).bgBlur,
    });
    let literaryHash = "";
    try {
      const { literaryL0Blob } = require("./literaryStillSsot") as typeof import("./literaryStillSsot");
      const { createHash } = require("crypto") as typeof import("crypto");
      const blob = literaryL0Blob({
        visualDescription: primary?.text ?? ctx.visualDescription,
        compiledImagePrompt: ctx.compiledImagePrompt,
        background: ctx.background,
        foreground: ctx.foreground,
        spatialRelation: ctx.spatialRelation,
      });
      literaryHash = createHash("sha256").update(blob).digest("hex").slice(0, 16);
    } catch {
      try {
        const { hashLiteraryDesc } = require("../qc/stillFirstFrameGate") as typeof import("../qc/stillFirstFrameGate");
        literaryHash = hashLiteraryDesc(String(primary?.text ?? ctx.visualDescription ?? ""));
      } catch {
        literaryHash = String(primary?.text ?? ctx.visualDescription ?? "").slice(0, 64);
      }
    }
    const priorSeal = ctx.priorPrimaryIntentSeal ?? null;
    if (shouldResealPrimaryIntent(priorSeal, literaryHash) && priorSeal?.sealHash) {
      sources.push("designIntent.reseal");
    } else if (priorSeal?.sealHash) {
      const clamped = clampProfileToPriorSeal(dip, priorSeal, literaryHash);
      if (clamped !== dip) {
        dip = clamped;
        sources.push("designIntent.priorSealSticky");
      }
    }
    const seal = sealPrimaryIntentCarriers({
      profile: dip,
      literaryHash,
      spatialRelation: ctx.spatialRelation,
    });
    let { positiveLeads, debtHints } = designIntentEgressSplit(dip);
    // Visual-detail additive lines also pass seal gate (never elevate contact)
    const detailGated = applyNormSupplement({ seal, lines: positiveLeads, layer: "L3" });
    positiveLeads = orderEgressLeadsByPriority(detailGated.ordered, seal);
    if (detailGated.dropped.length) {
      sources.push(`designIntent.detailDropped:${detailGated.dropped.length}`);
    }
    // Consume gated heal inject through norm gate (L0-safe)
    const healLines = (ctx.gatedHealInject ?? []).map((s) => String(s).trim()).filter(Boolean);
    if (healLines.length) {
      const gated = applyNormSupplement({ seal, lines: healLines, layer: "L1" });
      if (gated.ordered.length) {
        positiveLeads = orderEgressLeadsByPriority([...gated.ordered, ...positiveLeads], seal);
        sources.push("designIntent.gatedHealInject");
      }
      if (gated.dropped.length) {
        sources.push(`designIntent.healDropped:${gated.dropped.length}`);
      }
    }
    if (positiveLeads.length) {
      const leadBlock = positiveLeads.join("。");
      if (!prompt.includes(positiveLeads[0]!.slice(0, 8))) {
        prompt = `${leadBlock}。${prompt}`.replace(/。{2,}/g, "。").trim();
        sources.push("designIntent.positiveLeads");
        sources.push(`designIntent.plate:${dip.plateMode}`);
        sources.push(`designIntent.occupancy:${dip.poseOccupancy}`);
      }
    }
    const gatedPrompt = gatePromptThroughPrimarySeal({ prompt, seal });
    if (gatedPrompt.prompt !== prompt) {
      prompt = gatedPrompt.prompt;
      sources.push("designIntent.sealGate");
    }
    // L2/L3 AV enhance (doctrine/LLM template) — never reseals L0; non-blocking
    try {
      const { enhanceStillAvAfterSeal } =
        require("../design/stillAvLlmEnhance") as typeof import("../design/stillAvLlmEnhance");
      let llmLines: string[] | null = null;
      const enableAv =
        Boolean((ctx as { enableAvLlmEnhance?: boolean }).enableAvLlmEnhance) ||
        Boolean((ctx as { literaryDetailLlmFill?: boolean }).literaryDetailLlmFill);
      if (enableAv) {
        try {
          const { buildLitFillSuggestions } =
            require("../design/literaryDetailLlmFill") as typeof import("../design/literaryDetailLlmFill");
          const fill = buildLitFillSuggestions({
            shots: [
              {
                shotIndex: 0,
                visualDescription: primary?.text ?? ctx.visualDescription,
                shotSize: ctx.shotSize,
                narrative: { spatialRelation: ctx.spatialRelation },
              },
            ],
            literaryDetailLlmFill: true,
            intentVisualEnhance: true,
          });
          if (fill.enabled && fill.suggestions.length) {
            llmLines = fill.suggestions
              .flatMap((s) =>
                String(s.suggestedAppend ?? "")
                  .split(/[。；;\n]+/)
                  .map((x) => x.trim())
                  .filter((x) => x.length >= 4),
              )
              .slice(0, 6);
          }
        } catch {
          /* template optional */
        }
      }
      const enh = enhanceStillAvAfterSeal({
        seal,
        atmosphere: dip.atmosphere,
        hasSkirtFragment: dip.classes.includes("bg_fragment"),
        enableLlm: enableAv && Boolean(llmLines?.length),
        llmLines,
      });
      for (const line of enh.stillLines) {
        if (line && !prompt.includes(line.slice(0, Math.min(8, line.length)))) {
          prompt = `${prompt}。${line}`.replace(/。{2,}/g, "。").trim();
        }
      }
      sources.push(...enh.sources);
      if (enh.videoMotionHint) {
        (generationContract as { videoMotionStartHint?: string }).videoMotionStartHint = enh.videoMotionHint;
        sources.push("avEnhance.videoMotionHint");
      }
    } catch {
      /* optional */
    }
    // Stash seal for post-seal untilClear inject gate
    (ctx as { _activePrimarySeal?: typeof seal })._activePrimarySeal = seal;
    (generationContract as { designIntentProfile?: unknown; designIntentDebtHints?: string[]; primaryIntentSeal?: unknown }).designIntentProfile =
      {
        classes: dip.classes,
        plateMode: dip.plateMode,
        glyphPolicy: dip.glyphPolicy,
        glyphText: dip.glyphText,
        propClassId: dip.propClassId,
        primaryObjective: dip.primaryObjective,
        poseOccupancy: dip.poseOccupancy,
        gripLocus: dip.gripLocus,
        seatingXorPickup: dip.seatingXorPickup,
        contactXorPickup: dip.contactXorPickup,
        secondaryBudget: dip.secondaryBudget,
        fragment: dip.fragment,
        dofBudget: dip.dofBudget,
        formScale: dip.formScale,
        atmosphere: dip.atmosphere,
      };
    (generationContract as { designIntentDebtHints?: string[] }).designIntentDebtHints = debtHints;
    (generationContract as { primaryIntentSeal?: unknown }).primaryIntentSeal = primaryIntentSealEcho(seal);
  } catch {
    /* optional */
  }

  // Egress single-pipe: lint conflicts / FLOW_ONLY / face orientation (vendor-bound)
  {
    const linted = lintStillPromptBody({
      prompt,
      visualDescription: primary?.text ?? ctx.visualDescription,
    });
    if (linted.prompt !== prompt || linted.conflicts.length) {
      prompt = linted.prompt;
      sources.push("promptLint.egress");
      for (const c of linted.conflicts) {
        warnings.push(`promptLint:${c.id}`);
      }
    }
  }

  const coverage = assertStillDescCoverage({
    prompt,
    description: primary?.text ?? ctx.visualDescription,
    characterNames: charNamesForBind,
    pack: predPack,
    shotSize: ctx.shotSize,
    bgPolicy: bgPolicyResult.policy,
  });
  if (!coverage.ok) {
    warnings.push(`descCoverage missing: ${coverage.missing.join(",")}`);
  }
  // untilClear: inject healInject — all lines through applyNormSupplement (bend seal drops cheek)
  let coverageFinal = coverage;
  if (!coverage.ok) {
    const injectable = coverage.missing.filter((id) =>
      /^(contact_geom:|contact:|spatialAnchor:|identity:primary_look|lit:|atmosphere:)/i.test(id),
    );
    if (injectable.length) {
      try {
        const { buildLiteraryFidelityChecklist, assertLiteraryFidelity } =
          require("./literaryFidelityChecklist") as typeof import("./literaryFidelityChecklist");
        const { applyNormSupplement } =
          require("./primaryIntentSeal") as typeof import("./primaryIntentSeal");
        const activeSeal =
          (ctx as { _activePrimarySeal?: import("./primaryIntentSeal").PrimaryIntentCarrierSet })
            ._activePrimarySeal ??
          ((generationContract as { primaryIntentSeal?: import("./primaryIntentSeal").PrimaryIntentCarrierSet })
            .primaryIntentSeal as import("./primaryIntentSeal").PrimaryIntentCarrierSet | undefined);
        const bendSealed =
          activeSeal?.poseOccupancy === "bend_pickup" ||
          /弯腰|捡起|捡拾|俯身/.test(String(primary?.text ?? ctx.visualDescription ?? ""));
        const items = buildLiteraryFidelityChecklist({
          description: primary?.text ?? ctx.visualDescription,
          characterNames: charNamesForBind,
          requireDualIdentity: false,
          bgPolicy: bgPolicyResult.policy,
          shotSize: ctx.shotSize,
        });
        const byId = new Map(items.map((it) => [it.id, it]));
        let next = prompt;
        const pendingInject: string[] = [];
        for (const id of injectable) {
          // bend sealed: skip contact_geom mouth-ban / cheek inject ids entirely
          if (bendSealed && /^contact_geom:/i.test(id)) {
            sources.push(`descCoverage.untilClear.skipContact:${id}`);
            continue;
          }
          if (bendSealed && (/^contact:/i.test(id) || /wound_visible/i.test(id))) {
            sources.push(`descCoverage.untilClear.skipSoft:${id}`);
            continue;
          }
          const bit = String(byId.get(id)?.healInject ?? "").trim();
          if (!bit) continue;
          if (byId.get(id)?.soft) {
            sources.push(`descCoverage.untilClear.skipSoftItem:${id}`);
            continue;
          }
          if (next.includes(bit.slice(0, Math.min(8, bit.length)))) continue;
          pendingInject.push(bit);
          sources.push(`descCoverage.untilClear.inject:${id}`);
        }
        // Mouth-ban only when not bend-sealed
        if (!bendSealed) {
          for (const id of injectable) {
            const m = /^contact_geom:(.+)$/.exec(id);
            if (!m) continue;
            const locus = m[1]!;
            const mouthBan = `禁口含；禁纸入口；仅${locus}触非口含`;
            if (
              !/禁口含/.test(next) ||
              !/(?:禁纸入口|纸未入口)/.test(next) ||
              !new RegExp(`仅(?:${locus}|颊)触`).test(next)
            ) {
              pendingInject.push(mouthBan);
              sources.push(`descCoverage.untilClear.mouthBan:${locus}`);
            }
          }
        }
        if (pendingInject.length && activeSeal) {
          const gated = applyNormSupplement({ seal: activeSeal, lines: pendingInject, layer: "L1" });
          for (const bit of gated.ordered) {
            if (!next.includes(bit.slice(0, Math.min(8, bit.length)))) {
              next = `${String(next).trim()}，${bit}`;
            }
          }
          if (gated.dropped.length) {
            sources.push(`descCoverage.untilClear.gateDropped:${gated.dropped.length}`);
          }
        } else if (pendingInject.length && !activeSeal) {
          for (const bit of pendingInject) {
            if (!next.includes(bit.slice(0, Math.min(8, bit.length)))) {
              next = `${String(next).trim()}，${bit}`;
            }
          }
        }
        if (next !== prompt) {
          prompt = next;
          const re = assertStillDescCoverage({
            prompt,
            description: primary?.text ?? ctx.visualDescription,
            characterNames: charNamesForBind,
            pack: predPack,
            shotSize: ctx.shotSize,
            bgPolicy: bgPolicyResult.policy,
          });
          coverageFinal = re;
          if (re.ok) {
            warnings.push("descCoverage untilClear inject cleared");
          } else {
            // fidelity assert may still help
            const fid = assertLiteraryFidelity(prompt, items);
            if (!fid.ok) {
              for (const m of fid.missing) {
                const bit = String(m.healInject ?? "").trim();
                if (!bit || prompt.includes(bit.slice(0, Math.min(8, bit.length)))) continue;
                prompt = `${String(prompt).trim()}，${bit}`;
              }
              coverageFinal = assertStillDescCoverage({
                prompt,
                description: primary?.text ?? ctx.visualDescription,
                characterNames: charNamesForBind,
                pack: predPack,
                shotSize: ctx.shotSize,
                bgPolicy: bgPolicyResult.policy,
              });
            }
          }
        }
      } catch {
        /* optional — keep coverageFinal */
      }
    }
  }
  // Use cleared coverage for HQ gates below
  const coverageForGate = coverageFinal;
  // HQ seating: missing atoms → inject heal (never ok:false / HTTP block)
  if (qualityMode === "hq_update" && predPack.hasSeatingOrKneel && !coverageForGate.ok) {
    const seatingMissing = coverageForGate.missing.filter(
      (id) => /seating|role:|prop:|composition:|场面硬约束|抄书|端坐|跪|太师椅|蒲团/.test(id),
    );
    if (seatingMissing.length) {
      try {
        const { healPromptFidelityAnchors } =
          require("../design/healPromptFidelityAnchors") as typeof import("../design/healPromptFidelityAnchors");
        const healed = healPromptFidelityAnchors({
          visualDescription: primary?.text ?? ctx.visualDescription,
          visualBody,
          knownNames: (ctx.characters ?? []).map((c) => c.name || "").filter(Boolean),
        });
        visualBody = healed.visualBody;
        sources.push(...healed.sources, "mustSurvive.hqHeal");
        warnings.push("PROMPT-FIDELITY");
        (ctx as { requireFixBeforeBurn?: boolean }).requireFixBeforeBurn = true;
        if (healed.visualDescription && healed.visualDescription !== (primary?.text ?? ctx.visualDescription)) {
          (ctx as { visualDescription?: string }).visualDescription = healed.visualDescription;
        }
      } catch {
        const inject = seatingMissing.slice(0, 4).join("、");
        visualBody = `${visualBody}${visualBody.endsWith("。") ? "" : "。"}必须出现：${inject}`;
        sources.push("mustSurvive.hqHeal.fallback");
        warnings.push("PROMPT-FIDELITY");
      }
      // rebuild prompt tail after body heal
      try {
        const { appendVendorPromptSuffix } =
          require("./vendorPromptAdapter") as typeof import("./vendorPromptAdapter");
        /* keep existing prompt assembly — visualBody already updated for return */
      } catch {
        /* optional */
      }
    }
  }
  // HQ lit coverage atoms — inject / advise, never brick compose
  if (qualityMode === "hq_update" && !coverageForGate.ok) {
    const litMissing = coverageForGate.missing.filter(
      (id) => /^lit:|contact_role_xor|wound_visible|prop_readable/i.test(id) && !/^contact_geom:/i.test(id),
    );
    if (litMissing.length) {
      sources.push("lit.coverage.adviseContinue");
      warnings.push(...litMissing.slice(0, 4).map((id) => `litDebt:${id}`));
      (ctx as { requireFixBeforeBurn?: boolean }).requireFixBeforeBurn = true;
    }
  }

  if (!measureVisualBody(visualBody).ok) {
    const primaryBlock = buildPrimaryBlock("chat_repair", {
      stage: "prompt",
      userMessageOverride: "缺少可拍画面描述，请先补分镜画面（谁在哪做什么）",
    });
    return {
      ok: false,
      prompt,
      visualBody,
      didSynthesize,
      scrubbed: scrubRaw.scrubbed || dirtyInput,
      composeMode: mode,
      sources,
      warnings,
      entityAnchors,
      blockReason: "visual body too thin after compose",
      primaryNextStep: primaryBlock.primaryNextStep,
      userMessage: primaryBlock.userMessage,
      ctaLabel: primaryBlock.ctaLabel,
      compositionContractApplied,
      complianceHit,
      qp02Blocked: true,
      missingLeadAsset: false,
      dirtyInput,
      descCoverageOk: coverageForGate.ok,
      descCoverageMissing: coverageForGate.missing,
      orderedCrefCodes: orderedCodes,
      generationContract,
      promptLintConflicts: warnings
        .filter((w) => w.startsWith("promptLint:"))
        .map((w) => w.replace(/^promptLint:/, "")),
      recipeHeals: recipeHeal.healed.length ? recipeHeal.healed : undefined,
    };
  }

  // Face-CU look belt (if early inject dropped by refine)
  if (bgPolicyResult.reason === "faceCuDropScene" && qualityMode === "hq_update" && !/本镜主look/.test(prompt)) {
    try {
      const { pickVdLiteraryPrimary, STILL_PRIMARY_LOOK_HEAL_TEMPLATE } =
        require("./stillFirstFrameLiterarySsot") as typeof import("./stillFirstFrameLiterarySsot");
      const hero = pickVdLiteraryPrimary(
        String(ctx.visualDescription ?? visualBody ?? ""),
        (ctx.characters ?? []).map((c) => c.name).filter(Boolean) as string[],
      );
      if (hero) {
        prompt = `${String(prompt).trim()}。${STILL_PRIMARY_LOOK_HEAL_TEMPLATE.replace(/\{NAME\}/g, hero)}`;
        sources.push("look.anchor.faceCu.belt");
      }
    } catch {
      /* optional */
    }
  }

  const recipeBlock = String((ctx as { recipeCollisionBlock?: string }).recipeCollisionBlock ?? "").trim();
  if (recipeBlock) {
    const primaryBlock = buildPrimaryBlock("chat_repair", {
      stage: "prompt",
      userMessageOverride: `配方碰撞未解（${recipeBlock}）；须保留道具正约束或改 recipe，禁止 silent-drop`,
    });
    return {
      ok: false,
      prompt,
      visualBody,
      didSynthesize,
      scrubbed: scrubRaw.scrubbed || dirtyInput,
      composeMode: mode,
      sources: [...sources, "recipe.collisionBlock"],
      warnings: [...warnings, "RECIPE-COLLISION"],
      entityAnchors,
      blockReason: "RECIPE-COLLISION",
      primaryNextStep: primaryBlock.primaryNextStep,
      userMessage: primaryBlock.userMessage,
      ctaLabel: primaryBlock.ctaLabel,
      compositionContractApplied,
      complianceHit,
      qp02Blocked: false,
      missingLeadAsset: false,
      dirtyInput,
      descCoverageOk: coverageForGate.ok,
      descCoverageMissing: coverageForGate.missing,
      orderedCrefCodes: orderedCodes,
      generationContract,
      recipeHeals: recipeHeal.healed.length ? recipeHeal.healed : undefined,
    };
  }

  // Final seal gate + first-frame strip (no second bend_lead when FF spine present)
  try {
    const { assertEgressObeysPrimarySeal, classifyStillContamination } =
      require("./stillSealGate") as typeof import("./stillSealGate");
    const activeSeal =
      (ctx as { _activePrimarySeal?: import("./primaryIntentSeal").PrimaryIntentCarrierSet })
        ._activePrimarySeal ??
      ((generationContract as { primaryIntentSeal?: import("./primaryIntentSeal").PrimaryIntentCarrierSet })
        .primaryIntentSeal as import("./primaryIntentSeal").PrimaryIntentCarrierSet | undefined);
    const ff = (ctx as { firstFrameExtract?: import("./stillFirstFrameExtract").StillFirstFrameExtract })
      .firstFrameExtract;
    const stillPhase =
      (ctx as { stillPhase?: string }).stillPhase ??
      ff?.stillPhase ??
      ((ctx as { episodeShot?: { narrative?: { stillPhase?: string } } }).episodeShot?.narrative
        ?.stillPhase) ??
      null;
    const hasFfSpine = sources.some((s) => s === "ff.spine" || /^ff\./.test(s));
    const gated = assertEgressObeysPrimarySeal({
      prompt,
      seal: activeSeal,
      stillPhase,
      // First-frame spine already carries occupancy — do not stack bend_lead
      ensureBendLead: !hasFfSpine && stillPhase !== "approaching" && stillPhase !== "mid_contact",
    });
    prompt = gated.prompt;
    sources.push(...gated.sources);
    if (ff) {
      const { stripInterferenceAgainstFirstFrame } =
        require("./stillFirstFrameExtract") as typeof import("./stillFirstFrameExtract");
      const stripped = stripInterferenceAgainstFirstFrame(prompt, ff);
      prompt = stripped.text;
      for (const s of stripped.stripped) sources.push(`ff.strip:${s}`);
      // Sole spine egress: rebuild from SSOT + identity token tail
      // Seating/kneel StageA: keep 权力位：/站位绑定 — do not wipe with action-primary SSOT rebuild
      if (predPack.hasSeatingOrKneel) {
        sources.push("ff.ssot_only_egress:skip_seating");
      } else try {
        const { buildSsotOnlyEgress } =
          require("./stillSsotRead") as typeof import("./stillSsotRead");
        const { resolveGatedSoftHints } =
          require("./industryNormGate") as typeof import("./industryNormGate");
        const gated = resolveGatedSoftHints({
          stillIntentClass: String(ff.intentClass ?? ""),
          stillPhase: ff.stillPhase,
          shotSize: String(ctx.shotSize ?? ""),
          visualDescription: ctx.visualDescription,
          otsLike: ff.intentClass === "ots",
          faceish: ff.intentClass === "face",
          speakLike: ff.intentClass === "speak",
        });
        prompt = buildSsotOnlyEgress(ff, gated.hints, prompt, {
          colorTempLine: (() => {
            try {
              const t = resolveColorTempFromCtx(ctx);
              return t ? ( /色温：/.test(t) ? t : `色温：${t}`) : null;
            } catch {
              return null;
            }
          })(),
          envLine: (() => {
            const scene =
              String((ctx as { sceneName?: string }).sceneName ?? ctx.sceneCode ?? "").trim();
            if (!scene || /^SCENE-/i.test(scene) || /CHAR-SCENE/i.test(scene)) return null;
            if (/寝殿|殿内|厅|厢|廊|庭/.test(scene) || scene.length <= 8) {
              return `环境：${scene.replace(/^SCENE-/i, "")}轮廓可辨`;
            }
            return null;
          })(),
        });
        sources.push("ff.ssot_only_egress");
      } catch (sealErr) {
        sources.push(`ff.ssot_only_egress:fail:${String((sealErr as Error)?.message ?? "err").slice(0, 40)}`);
        /* keep stripped */
      }
    }
    (generationContract as { stillPhase?: string }).stillPhase = stillPhase ?? undefined;
    (ctx as { stillPhase?: string }).stillPhase = stillPhase ?? undefined;
    const contam = classifyStillContamination({
      promptUsed: prompt,
      seal: activeSeal,
      composeSources: sources,
      stillPhase,
    });
    if (contam !== "none") {
      sources.push(`contaminationClass:${contam}`);
      (generationContract as { contaminationClass?: string }).contaminationClass = contam;
    }
    try {
      const { buildI2vCriticalFactsFromSeal } =
        require("./stillSealGate") as typeof import("./stillSealGate");
      const facts = buildI2vCriticalFactsFromSeal(activeSeal ?? null);
      if (facts.length) {
        (generationContract as { i2vCriticalFacts?: string[] }).i2vCriticalFacts = facts;
        sources.push("i2vCriticalFacts.fromSeal");
      }
    } catch {
      /* optional */
    }
  } catch {
    /* optional */
  }

  // Echo softEnv seal onto contract for compress/vendor homology
  if (generationContract) {
    (generationContract as { keepSoftEnvRef?: boolean; softEnvContinuity?: string }).keepSoftEnvRef =
      keepSoftEnvSealed;
    (generationContract as { softEnvContinuity?: string }).softEnvContinuity = softEnvContinuitySealed;
  }

  // SingleShotClosed: final egress strip undeclared beat atoms
  // Skip when SSOT-only egress already sealed — closed.strip can fight approach freeze
  if (!(ctx as { _ssotOnlyEgress?: boolean })._ssotOnlyEgress) {
    try {
      const { stripForeignBeatAtomsFromEgress, oralEcuMouthNegatives, isOralMicroNotActionPrimary } =
        require("./singleShotClosedCompose") as typeof import("./singleShotClosedCompose");
      const vdFinal = String(primary?.text ?? ctx.visualDescription ?? "");
      const scrubbedFinal = stripForeignBeatAtomsFromEgress(prompt, vdFinal);
      if (scrubbedFinal.stripped.length) {
        prompt = scrubbedFinal.text;
        sources.push(...scrubbedFinal.stripped.map((s) => `closed.strip.final:${s}`));
      }
      if (isOralMicroNotActionPrimary(vdFinal) && !/禁止半身|禁止手持纸/.test(prompt)) {
        prompt = `${prompt}。${oralEcuMouthNegatives()}`.replace(/。。+/g, "。");
        sources.push("closed.oralEcuNegatives.final");
      }
    } catch {
      /* optional */
    }
  } else {
    sources.push("closed.strip.skipped:ssot_only");
  }

  // Last-mile invariant: when we ban turnaround/grid/collage, we must still output the literal single-shot lock token.
  // (Some later gates/sanitizers may preserve alias bans like “禁止四视图” but drop “单镜头成片” itself.)
  try {
    const { STILL_SINGLE_FRAME_LOCK_EDIT_ZH } =
      require("./stillFirstFrameLiterarySsot") as typeof import("./stillFirstFrameLiterarySsot");
    if (!/单镜头成片/.test(prompt) && /四视图|拼版|多宫格/.test(prompt)) {
      prompt = `${prompt}。${STILL_SINGLE_FRAME_LOCK_EDIT_ZH}`.replace(/。。+/g, "。").trim();
      sources.push("identity.singleFrameLock.finalAssert");
    }
  } catch {
    /* optional */
  }

  return {
    ok: true,
    prompt,
    visualBody,
    didSynthesize: didSynthesize || dirtyInput || Boolean(primary),
    scrubbed: scrubRaw.scrubbed || dirtyInput,
    composeMode: mode,
    sources,
    warnings,
    entityAnchors,
    compositionContractApplied,
    complianceHit,
    qp02Blocked: false,
    missingLeadAsset: false,
    dirtyInput,
    descCoverageOk: coverageForGate.ok,
    descCoverageMissing: coverageForGate.missing,
    bgPolicy: bgPolicyResult.policy,
    excludeScene: bgPolicyResult.excludeScene,
    keepSoftEnvRef: keepSoftEnvSealed,
    softEnvContinuity: softEnvContinuitySealed,
    bgMode: modality.bgMode,
    stillRefsContract: (() => {
      try {
        const { resolveStillRefsContract } =
          require("./stillRefsContract") as typeof import("./stillRefsContract");
        const seal = (generationContract as {
          primaryIntentSeal?: { poseOccupancy?: string; primaryObjective?: string };
        } | undefined)?.primaryIntentSeal;
        return resolveStillRefsContract({
          primaryObjective: seal?.primaryObjective ?? generationContract?.objectiveClass,
          objectiveClass: generationContract?.objectiveClass,
          poseOccupancy: seal?.poseOccupancy,
          visualDescription: String(ctx.visualDescription ?? visualBody ?? ""),
          stillPhase: (ctx as { stillPhase?: string | null }).stillPhase,
          feSceneHung:
            keepSoftEnvSealed === true ||
            softEnvContinuitySealed === "must" ||
            Boolean((ctx as { hasSceneLink?: boolean }).hasSceneLink) ||
            Boolean((ctx as { feSceneHung?: boolean }).feSceneHung),
          shotDesignSample: (ctx as { shotDesignSample?: unknown }).shotDesignSample as {
            primaryObjective?: string | null;
            poseOccupancy?: string | null;
            must?: Array<{ id: string }>;
          } | null,
        });
      } catch {
        return undefined;
      }
    })(),
    promptLintConflicts: warnings
      .filter((w) => w.startsWith("promptLint:"))
      .map((w) => w.replace(/^promptLint:/, "")),
    generationContract,
    bgPolicyReason: bgPolicyResult.reason,
    recipeHeals: recipeHeal.healed.length ? recipeHeal.healed : undefined,
    stillPhase:
      (ctx as { stillPhase?: string }).stillPhase ??
      (generationContract as { stillPhase?: string } | undefined)?.stillPhase ??
      null,
    firstFrameExtract: (ctx as { firstFrameExtract?: unknown }).firstFrameExtract ?? null,
    orderedCrefCodes: (() => {
      const skirt =
        String((ctx as { narrative?: { secondaryBudget?: string } }).narrative?.secondaryBudget ?? "") ===
          "skirt_blur" ||
        (ctx as { firstFrameExtract?: { secondaryBudget?: string } }).firstFrameExtract?.secondaryBudget ===
          "skirt_blur";
      if (skirt && identityBind.orderedCodes.length > 1) {
        return identityBind.orderedCodes.slice(0, 1);
      }
      return identityBind.orderedCodes;
    })(),
  };
}

export function computeComposeHash(
  ctx: Pick<
    ComposeStillContext,
    "visualDescription" | "videoDesc" | "microExpression" | "shotSize" | "characters" | "sceneCode"
  >,
): string {
  const codes = (ctx.characters ?? [])
    .map((c) => `${(c.code || "").toUpperCase()}:${c.hasImage ? 1 : 0}:${c.name ?? ""}`)
    .sort()
    .join(",");
  const raw = [
    ctx.visualDescription ?? "",
    ctx.videoDesc ?? "",
    ctx.microExpression ?? "",
    ctx.shotSize ?? "",
    ctx.sceneCode ?? "",
    codes,
  ].join("|");
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (Math.imul(31, h) + raw.charCodeAt(i)) | 0;
  return `c${(h >>> 0).toString(16)}`;
}

/** Dual-char + seating literary desc → prefer fidelity on re-complete (no sticky wrong bind). */
export function shouldDefaultFidelityCompose(ctx: Pick<ComposeStillContext, "visualDescription" | "characters">): boolean {
  const names = (ctx.characters ?? []).filter((c) => c.kind !== "scene" && (c.name || c.code));
  if (names.length < 2) return false;
  const pack = extractDescPredicates({
    description: ctx.visualDescription,
    characterNames: names.map((c) => c.name || "").filter(Boolean),
  });
  return pack.hasSeatingOrKneel;
}

/** Resolve composeMode: dirty/stale/empty → full; dual seating → fidelity; else refine; explicit wins. */
export function resolveComposeMode(input: {
  requested?: ComposeMode | null;
  existingPrompt?: string | null;
  promptState?: string | null;
  composeHash?: string | null;
  currentHash?: string | null;
  /** When true (dual+seating), re-click defaults to fidelity not refine */
  preferFidelity?: boolean;
}): ComposeMode {
  if (input.requested === "full" || input.requested === "refine" || input.requested === "fidelity") {
    return input.requested;
  }
  const state = String(input.promptState ?? "");
  if (state === "stale") return "full";
  if (input.composeHash && input.currentHash && input.composeHash !== input.currentHash) return "full";
  const existing = String(input.existingPrompt ?? "");
  if (!existing.trim() || isDirtyStillPrompt(existing)) return "full";
  if (input.preferFidelity) return "fidelity";
  if (state === "composed" || state === "refined" || state === "fidelity" || state === "hq_ok") return "refine";
  return "full";
}

/**
 * Shared burn/preview/persist ingress: parse reason meta → previous body → forceFull drop.
 * Call sites must use this so prevMeta is always declared before use.
 */
export type StillPreviousIngress = {
  prevMeta: Partial<StillQualityMeta> | null;
  prevBody: string;
  composeMode: ComposeMode;
  forceFull: boolean;
  /** Assign to ctx.previousVisualBody (undefined when forceFull / empty). */
  previousVisualBody: string | undefined;
  /** Mode for composeStillPrompt after forceFull policy (explicit requestedMode wins). */
  effectiveMode: ComposeMode;
  /** Heal inject lines from prior literary qualify (read back for smart repair) */
  literaryRepairInjectLines?: string[];
  literaryRepairDeltaHints?: string[];
  literaryEffectsQualified?: boolean | null;
};

export function buildStillPreviousIngress(input: {
  reason?: unknown;
  storedPrompt?: string | null;
  requestPrompt?: string | null;
  requestedMode?: ComposeMode | null;
  currentHash?: string | null;
  preferFidelity?: boolean;
  /** When false (no storyboard), skip previous/meta load. Default true. */
  loadPrevious?: boolean;
  /** Current shot clientId — mismatch vs meta forces full */
  currentClientId?: string | null;
  /** Current literary hash (VD+imagePrompt) — mismatch vs meta forces full */
  literaryHash?: string | null;
  /** Current visualDescription for off-beat contamination check */
  visualDescription?: string | null;
}): StillPreviousIngress {
  const loadPrevious = input.loadPrevious !== false;
  const requestPrompt = String(input.requestPrompt ?? "");
  const prevMeta = loadPrevious ? parseStillMetaFromReason(input.reason) : null;

  let prevBody = "";
  if (loadPrevious) {
    // Literary SSOT only — never seed previousVisualBody from vendor reason.promptUsed
    const raw = scrubStillPromptNoise(
      stripIdentityTokens(String(input.storedPrompt ?? requestPrompt)).body,
    ).cleaned;
    prevBody = raw ? stripStaleBindingFromPrevious(raw) : "";
  }

  const composeMode = resolveComposeMode({
    requested: input.requestedMode,
    existingPrompt: requestPrompt || String(input.storedPrompt ?? ""),
    promptState: prevMeta?.promptState,
    composeHash: prevMeta?.composeHash,
    currentHash: input.currentHash,
    preferFidelity: input.preferFidelity,
  });

  let forceFull =
    isDirtyStillPrompt(requestPrompt) ||
    !requestPrompt.trim() ||
    prevMeta?.promptState === "stale";
  try {
    const { shouldWarnOneBeat } = require("./stillIdentitySsot") as typeof import("./stillIdentitySsot");
    if (prevBody && shouldWarnOneBeat(prevBody)) forceFull = true;
  } catch {
    /* optional */
  }
  // Cross-shot / literary drift → never refine neighbor egress
  const metaClient = String((prevMeta as { clientId?: string } | null)?.clientId ?? "").trim();
  const curClient = String(input.currentClientId ?? "").trim();
  if (metaClient && curClient && metaClient !== curClient) forceFull = true;
  const metaLit = String(
    (prevMeta as { literaryHash?: string; literaryDescHash?: string } | null)?.literaryHash ??
      (prevMeta as { literaryDescHash?: string } | null)?.literaryDescHash ??
      "",
  ).trim();
  const curLit = String(input.literaryHash ?? "").trim();
  if (metaLit && curLit && metaLit !== curLit) forceFull = true;
  try {
    const { previousBodyHasOffBeatContamination } =
      require("./stillFirstFrameLiterarySsot") as typeof import("./stillFirstFrameLiterarySsot");
    if (prevBody && previousBodyHasOffBeatContamination(prevBody, input.visualDescription)) {
      forceFull = true;
    }
  } catch {
    /* optional */
  }

  const litQualified = (prevMeta as { literaryEffectsQualified?: boolean } | null)?.literaryEffectsQualified;
  const litInject = ((prevMeta as { repairInjectLines?: string[] } | null)?.repairInjectLines ?? []).filter(
    Boolean,
  );
  const litDelta = ((prevMeta as { repairDeltaHints?: string[] } | null)?.repairDeltaHints ?? []).filter(
    Boolean,
  );
  // Unqualified literary bar → force full recompose + read back heal inject
  if (litQualified === false || litInject.length) {
    forceFull = true;
  }

  const effectiveMode = forceFull && !input.requestedMode ? "full" : composeMode;
  // previousVisualBody only for refine/fidelity when not forceFull — literary storedPrompt only
  const allowPrev =
    !forceFull &&
    Boolean(prevBody) &&
    (effectiveMode === "refine" || effectiveMode === "fidelity");
  return {
    prevMeta,
    prevBody,
    composeMode,
    forceFull,
    previousVisualBody: allowPrev ? prevBody : undefined,
    effectiveMode,
    literaryRepairInjectLines: litInject.length ? litInject : undefined,
    literaryRepairDeltaHints: litDelta.length ? litDelta : undefined,
    literaryEffectsQualified: litQualified ?? null,
  };
}

/** Hash VD + peeled imagePrompt (+ bg) for ingress stale detection / reseal. */
export function literaryComposeHash(input: {
  visualDescription?: string | null;
  compiledImagePrompt?: string | null;
  background?: string | null;
}): string {
  let raw = "";
  try {
    const { literaryL0Blob } = require("./literaryStillSsot") as typeof import("./literaryStillSsot");
    raw = literaryL0Blob(input);
  } catch {
    raw = `${String(input.visualDescription ?? "").trim()}\n${String(input.compiledImagePrompt ?? "").trim()}\n${String(input.background ?? "").trim()}`;
  }
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (Math.imul(31, h) + raw.charCodeAt(i)) | 0;
  return `lit_${(h >>> 0).toString(16)}`;
}
