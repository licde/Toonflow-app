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
  /** Sibling / episode VDs for action lexicon harvest (declare-only on current shot) */
  episodeVisualDescriptions?: string[] | null;
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
  bgPolicyReason?: string;
  /** Recipe policy self-heal ids (FE / reverse audit) */
  recipeHeals?: string[];
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
  const crefs = new Set<string>();
  const srefs = new Set<string>();
  let ar = "";
  tokenTail
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
  // Do NOT fall back to motion-template videoDesc as literary still body (VD SSOT)
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

function layerShootableExtras(ctx: ComposeStillContext, parts: string[], sources: string[], mode: ComposeMode): void {
  const fg = String(ctx.foreground ?? "").trim();
  const bg = String(ctx.background ?? "").trim();
  if (fg || bg) {
    parts.push([fg && `前景：${fg}`, bg && `背景：${bg}`].filter(Boolean).join("；"));
    sources.push("shotDesign.composition");
  }
  const shotZh = formatShotSizeZh(ctx.shotSize);
  if (shotZh) {
    parts.push(`景别：${shotZh}`);
    sources.push("shot.shotSize");
  }
  if (ctx.spatialRelation) {
    parts.push(`空间关系：${ctx.spatialRelation}`);
    sources.push("shot.spatialRelation");
  }
  // Still first-frame: narrative over reference collage (hq_update + fidelity)
  if (mode === "fidelity" || ctx.qualityMode === "hq_update") {
    parts.push("叙事场面优先于参考图拼贴，画面必须体现上述描写中的动作与物件");
    sources.push("fidelity.narrativeFirst");
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
    // Dual hq/fidelity: omit full L0 personality (紫袍赢过座次)
    if ((mode === "fidelity" || hq) && dualOrMore) {
      continue;
    }
    if (c.personality?.trim() && mode !== "fidelity") {
      parts.push(`${c.name || c.code || "角色"}气质：${c.personality.trim().slice(0, 40)}`);
      sources.push("character.personality");
    } else if (c.personality?.trim() && mode === "fidelity") {
      const line = compressPersonalityLine(c.name || c.code || "角色", c.personality, 16);
      if (line) {
        parts.push(line);
        sources.push("character.personality.compact");
      }
    }
  }
  const micro = String(ctx.microExpression ?? "").trim();
  if (micro && !opts?.adapt?.omitFaceMicroExpression) {
    parts.push(`微表情：${micro.slice(0, 80)}`);
    sources.push("shotDesign.performance.microExpression");
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
    .replace(/continues?\s+from\s+[^。；;\n]*/gi, " ")
    .replace(/锁定定妆脸型与身份[^。；;\n]*/g, " ")
    .replace(/单镜头成片画幅[^。；;\n]*/g, " ")
    .replace(/角色参考若为四视图[^。；;\n]*/g, " ")
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
  const scrubbed = scrubStillPromptNoise(rawBody).cleaned;
  const compact = scrubbed.replace(/\s+/g, "");
  // Keep short Chinese beats (e.g. 侧光从窗格打下) — not full Visual measure
  if (compact.length < 4) return null;
  // Drop if mostly duplicate of design
  if (designText && scrubbed.includes(designText.slice(0, Math.min(20, designText.length)))) return null;
  if (/safe area|power blocking|9:16安全区/i.test(scrubbed) && compact.length < 20) {
    return null;
  }
  return scrubbed;
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
    const prev = stripStaleBindingFromPrevious(scrubStillPromptNoise(ctx.previousVisualBody).cleaned);
    if (prev && shouldWarnOneBeat(prev)) {
      warnings.push("DEX-STILL-ONEBEAT:drop_dirty_previous");
      sources.push("previous.dropped_multibeat");
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

  const primary = pickPrimaryDescription(ctx);
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
  // Face CU / 已 slice：禁止人数契约行残留进 vendor（截图 400 根因）
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
  const bgPolicyResult = resolveStillBgPolicy({
    description: primary?.text ?? ctx.visualDescription ?? "",
    characterNames: charNamesForBind,
    shotSize: ctx.shotSize,
    pack: predPack,
    // seatingHard always wins inside resolveStillBgPolicy (checked before hint)
    sceneEstablishingHint:
      Boolean((ctx as { sceneEstablishing?: boolean }).sceneEstablishing) ||
      /建立镜头|establishing|空镜建立|全景建立/i.test(String(primary?.text ?? ctx.visualDescription ?? "")),
  });
  if (bgPolicyResult.bgGuidance) {
    supportParts.push(bgPolicyResult.bgGuidance);
    sources.push(`bgPolicy.${bgPolicyResult.policy}`);
  }
  // Stack: description → predicate hard → binding → anchors
  if (predPack.hardConstraintLine) {
    descParts.push(predPack.hardConstraintLine);
    sources.push("desc.hardConstraint");
  }
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
        const { buildCastCardinalityLine } = require("./stillRefSlotContract") as typeof import("./stillRefSlotContract");
        const cardLine = buildCastCardinalityLine(castForCard);
        if (cardLine && !supportParts.some((p) => /出镜人数/.test(p)) && !descParts.some((p) => /出镜人数/.test(p))) {
          supportParts.push(cardLine);
          sources.push("identity.castCardinality");
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
      const propish = anchors.filter((a) => /扳指|玉|刀|剑|杯|盏|烛|信|书|戒指|道具|袖|手|休书/.test(a));
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
      const propish = anchors.filter((a) => /扳指|玉|刀|剑|杯|盏|烛|信|书|戒指|道具|袖|手|休书/.test(a));
      anchors = slimEntityAnchors([vdPrimary, ...propish].slice(0, 2));
      sources.push("entity.anchors.vdPrimaryFirst");
    }
    const line = `必须出现：${anchors.join("、")}`;
    // HQ non-seating: skip 必须出现 when VD already names cast (short shell)
    const skipMustAppear =
      qualityMode === "hq_update" &&
      !predPack.hasSeatingOrKneel &&
      mode !== "fidelity" &&
      Boolean(vdPrimary);
    if (mode === "fidelity") {
      descParts.push(line);
      descParts.push(`再次强调场面：${primary?.text?.slice(0, 120) ?? anchors.join("、")}`);
      sources.push("fidelity.entityReplay");
    } else if (!skipMustAppear) {
      supportParts.push(line);
      sources.push("entity.anchors");
    } else {
      sources.push("entity.anchors.omitMustAppearHq");
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

  const qp02 = checkQp02VisualDescription({ visualDescription: scrubStillPromptNoise(visualBody).cleaned });
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
    if (recipeAdapt.useNonFaceHqRecipe && !predPack.hasSeatingOrKneel) {
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
    // Anti-collage lock (视频首帧硬约束) — works without VLM; 四视图资产可沿用
    try {
      const {
        STILL_SINGLE_FRAME_LOCK_ZH,
        STILL_SHEET_AS_IDENTITY_ONLY_ZH,
      } = require("./stillFirstFrameLiterarySsot") as typeof import("./stillFirstFrameLiterarySsot");
      if (!descParts.some((p) => /单镜头成片|禁止四视图/.test(p)) && !supportParts.some((p) => /单镜头成片|禁止四视图/.test(p))) {
        supportParts.push(STILL_SINGLE_FRAME_LOCK_ZH);
        sources.push("identity.singleFrameLock");
      }
      // Always on hq with cast: sheet cref is common; tell model identity-only even without Key
      const hasCast = (ctx.characters ?? []).some((c) => c.kind !== "scene");
      if (
        hasCast &&
        !supportParts.some((p) => /仅借脸型|四视图作身份|严禁复刻多格/.test(p))
      ) {
        supportParts.push(STILL_SHEET_AS_IDENTITY_ONLY_ZH);
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
      const face =
        hasFaceCue(visualBody) || hasFaceCue(String(ctx.visualDescription ?? "")) || hasNamed;
      if (face) {
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

  const coverage = assertStillDescCoverage({
    prompt,
    description: primary?.text ?? ctx.visualDescription,
    characterNames: charNamesForBind,
    pack: predPack,
  });
  if (!coverage.ok) {
    warnings.push(`descCoverage missing: ${coverage.missing.join(",")}`);
  }
  // HQ seating: missing content-contract atoms → not ok (no false green)
  if (qualityMode === "hq_update" && predPack.hasSeatingOrKneel && !coverage.ok) {
    const seatingMissing = coverage.missing.filter(
      (id) => /seating|role:|prop:|composition:|场面硬约束|抄书|端坐|跪|太师椅|蒲团/.test(id),
    );
    if (seatingMissing.length) {
      const primaryBlock = buildPrimaryBlock("chat_repair", {
        stage: "prompt",
        userMessageOverride: `文学意图原子未进提示词（${seatingMissing.slice(0, 4).join("、")}）；请回 SB 检查 VD 或重 compose，禁止缺抄书/座次假绿`,
      });
      return {
        ok: false,
        prompt,
        visualBody,
        didSynthesize,
        scrubbed: scrubRaw.scrubbed || dirtyInput,
        composeMode: effectiveMode,
        sources: [...sources, "mustSurvive.hqBlock"],
        warnings: [...warnings, "PROMPT-FIDELITY"],
        entityAnchors,
        blockReason: "PROMPT-FIDELITY",
        primaryNextStep: primaryBlock.primaryNextStep,
        userMessage: primaryBlock.userMessage,
        ctaLabel: primaryBlock.ctaLabel,
        compositionContractApplied,
        complianceHit,
        qp02Blocked: false,
        missingLeadAsset: false,
        dirtyInput,
        descCoverageOk: false,
        descCoverageMissing: coverage.missing,
        orderedCrefCodes: orderedCodes,
        recipeHeals: recipeHeal.healed.length ? recipeHeal.healed : undefined,
      };
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
      descCoverageOk: coverage.ok,
      descCoverageMissing: coverage.missing,
      orderedCrefCodes: orderedCodes,
      recipeHeals: recipeHeal.healed.length ? recipeHeal.healed : undefined,
    };
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
    descCoverageOk: coverage.ok,
    descCoverageMissing: coverage.missing,
    orderedCrefCodes: identityBind.orderedCodes,
    bgPolicy: bgPolicyResult.policy,
    excludeScene: bgPolicyResult.excludeScene,
    bgPolicyReason: bgPolicyResult.reason,
    recipeHeals: recipeHeal.healed.length ? recipeHeal.healed : undefined,
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
}): StillPreviousIngress {
  const loadPrevious = input.loadPrevious !== false;
  const requestPrompt = String(input.requestPrompt ?? "");
  const prevMeta = loadPrevious ? parseStillMetaFromReason(input.reason) : null;

  let prevBody = "";
  if (loadPrevious) {
    const raw = scrubStillPromptNoise(
      stripIdentityTokens(String(prevMeta?.promptUsed ?? input.storedPrompt ?? requestPrompt)).body,
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

  const effectiveMode = forceFull && !input.requestedMode ? "full" : composeMode;
  return {
    prevMeta,
    prevBody,
    composeMode,
    forceFull,
    previousVisualBody: forceFull || !prevBody ? undefined : prevBody,
    effectiveMode,
  };
}
