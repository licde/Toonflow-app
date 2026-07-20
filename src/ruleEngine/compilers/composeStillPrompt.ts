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

const IDENTITY_TOKEN_RE =
  /(?:^|\s)--(?:cref|sref)\s+[^\n]*?(?=(?:\s--(?:cref|sref|ar)\b)|$)|(?:^|\s)--ar\s+\S+/gi;

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

function cleanTokenTail(tokenTail: string, orderedCrefs?: string[]): string {
  const crefs = new Set<string>();
  const srefs = new Set<string>();
  let ar = "";
  tokenTail
    .replace(/--sref\s+([^\s,]+),?/gi, (_, c: string) => {
      srefs.add(c.replace(/,$/, ""));
      return " ";
    })
    .replace(/--cref\s+((?:[A-Za-z]+-[A-Za-z0-9]+\s*)+)/gi, (_, block: string) => {
      for (const c of block.trim().split(/\s+/)) {
        if (c) crefs.add(c.toUpperCase());
      }
      return " ";
    })
    .replace(/--ar\s+(\S+)/gi, (_, v: string) => {
      ar = v;
      return " ";
    });
  const parts: string[] = [];
  const ordered = (orderedCrefs ?? []).map((c) => c.toUpperCase()).filter((c) => /^CHAR-/i.test(c));
  if (ordered.length) {
    for (const c of [...crefs]) {
      if (!ordered.includes(c)) ordered.push(c);
    }
    parts.push(`--cref ${ordered.join(" ")}`);
  } else if (crefs.size) {
    parts.push(`--cref ${[...crefs].join(" ")}`);
  }
  if (srefs.size) parts.push(`--sref ${[...srefs].join(" ")}`);
  if (ar) parts.push(`--ar ${ar}`);
  return parts.join(" ").replace(/\s{2,}/g, " ").trim();
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

/** Extract concrete noun-like anchors from Chinese/English description. */
export function extractEntityAnchors(text: string, extraNames: string[] = []): string[] {
  const t = String(text ?? "");
  const anchors = new Set<string>();
  for (const n of extraNames) {
    const name = String(n ?? "").trim();
    if (name.length >= 2) anchors.add(name.slice(0, 8));
  }
  // Person names: 沈清瓷 / 沈母 / X某
  const names =
    t.match(/[\u4e00-\u9fff]{1,3}(?:清瓷|清辞|阿母|母|爹|父|公子|小姐|夫人)|沈[\u4e00-\u9fff]{1,3}/g) ?? [];
  for (const n of names) anchors.add(n.slice(0, 8));
  const zhNouns =
    t.match(
      /[\u4e00-\u9fff]{1,6}(?:祠堂|廊桥|扳指|烛火|墨滴|窗|门|雨|剑|杯|衣|发|手|泪|玉|纸|跪|站|坐|捧|望)/g,
    ) ?? [];
  for (const n of zhNouns) anchors.add(n.slice(0, 8));
  const chunks =
    t.match(
      /(?:祠堂|廊下|廊桥|扳指|烛火|玉扳指|清瓷|沈母|沈清瓷|跪地|对峙|望雨|发丝|窗格|侧光|墨滴|纸上|眼眶)/g,
    ) ?? [];
  for (const c of chunks) anchors.add(c);
  const en = t.match(/\b[A-Z][a-z]{2,12}\b/g) ?? [];
  for (const e of en.slice(0, 4)) anchors.add(e);
  return [...anchors].slice(0, 14);
}

function pickPrimaryDescription(ctx: ComposeStillContext): { text: string; source: string } | null {
  const vd = String(ctx.visualDescription ?? "").trim();
  if (vd) return { text: vd, source: "shot.visualDescription" };
  const compiled = scrubStillPromptNoise(stripIdentityTokens(String(ctx.compiledImagePrompt ?? "")).body).cleaned;
  if (compiled && measureVisualBody(compiled).ok) return { text: compiled.slice(0, 360), source: "shot.compiledImagePrompt" };
  const vdesc = stripMotionOnlyForStill(String(ctx.videoDesc ?? ""));
  if (vdesc && measureVisualBody(vdesc).ok) return { text: vdesc.slice(0, 300), source: "shot.videoDesc" };
  const sb = scrubStillPromptNoise(stripIdentityTokens(String(ctx.promptFromStoryboard ?? "")).body).cleaned;
  if (sb && measureVisualBody(sb).ok) return { text: sb.slice(0, 300), source: "storyboard.prompt" };
  return null;
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
  if (ctx.dialogueBeat) {
    parts.push(ctx.dialogueBeat);
    sources.push("dialogue.beat");
  }
  if (mode === "fidelity") {
    parts.push("叙事场面优先于参考图拼贴，画面必须体现上述描写中的动作与物件");
    sources.push("fidelity.narrativeFirst");
  }
}

function layerSkeletonScene(ctx: ComposeStillContext, parts: string[], sources: string[]): boolean {
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
  opts?: { omitPersonality?: boolean },
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
  if (micro) {
    parts.push(`微表情：${micro.slice(0, 80)}`);
    sources.push("shotDesign.performance.microExpression");
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
): void {
  const split = String(ctx.splitHint ?? "").trim();
  const reaction = String(ctx.reactionAction ?? "").trim();
  if (reaction || /reaction|反应/i.test(split)) {
    parts.push("反应镜：偏听者/过肩构图，非双人对峙抢戏");
    sources.push("beat.reaction");
  } else if (bindHighName) {
    parts.push(`权力位：${bindHighName}（高位）靠近视觉重心，正脸清晰`);
    sources.push("beat.power.named");
  } else if (ctx.dialogueDominantSpeaker) {
    parts.push(`权力位：${ctx.dialogueDominantSpeaker}靠近画面中心，正脸清晰`);
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
  opts?: { seatingHard?: boolean },
): void {
  const chars = (ctx.characters ?? []).filter((c) => c.kind !== "scene");
  if ((ctx.referenceUrlCount ?? 0) >= 1 || chars.length > 0) {
    if (opts?.seatingHard) {
      parts.push(
        "身份锁定：脸型来自角色定妆参考；姿态与家具以描写为准，场景参考只补背景木作/匾额，不得替换太师椅或蒲团",
      );
      parts.push(
        "座次锁：SCENE/--sref 仅作环境纹理，禁止把香案/供桌/站立礼佛仪式升为主构图；太师椅与蒲团必须按描写出现",
      );
      sources.push("refs.identityLock");
      sources.push("refs.identityLock.descFirst");
      sources.push("refs.sceneSrefSeatLock");
    } else {
      parts.push("严格锁定多参考身份：脸型来自角色定妆参考，环境来自场景参考，禁止把脸融进背景");
      sources.push("refs.identityLock");
    }
  }
  if (chars.length >= 2) {
    const names = [
      ...new Set(
        chars
          .map((c) => c.name || c.code)
          .filter(Boolean)
          .map((n) => String(n).trim()),
      ),
    ].slice(0, 3);
    parts.push(`${names.join("与") || "二人"}不同脸，年龄与身份可辨，禁止共用同一张脸`);
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

function layerMouthLipGuard(ctx: ComposeStillContext, parts: string[], sources: string[]): void {
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

/** Strip stale identity/binding tails before refine/fidelity reuses previousVisualBody. */
export function stripStaleBindingFromPrevious(body: string): string {
  return String(body ?? "")
    .replace(/站位绑定：[^。；;\n]*/g, " ")
    .replace(/身份顺序：[^。；;\n]*/g, " ")
    .replace(/权力位：[^。；;\n]*/g, " ")
    .replace(/(?:^|\s)--(?:cref|sref)\s+[^\n]*?(?=(?:\s--(?:cref|sref|ar)\b)|$)/gi, " ")
    .replace(/(?:^|\s)--ar\s+\S+/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
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

  // Refine/fidelity: keep previous literary body but drop stale 站位绑定/--cref (re-bound below)
  if ((mode === "refine" || mode === "fidelity") && ctx.previousVisualBody?.trim()) {
    const prev = stripStaleBindingFromPrevious(scrubStillPromptNoise(ctx.previousVisualBody).cleaned);
    if (prev) {
      descParts.push(prev);
      sources.push("previous.composed");
    }
  }

  const primary = pickPrimaryDescription(ctx);
  if (primary) {
    // full/fidelity: description must lead; refine: reinforce if missing
    if (mode === "full" || mode === "fidelity" || !descParts.length) {
      if (mode === "full") descParts.length = 0;
      if (!descParts.some((p) => p.includes(primary.text.slice(0, 12)))) {
        descParts.unshift(primary.text);
      }
      sources.push(primary.source);
      didSynthesize = true;
    } else if (mode === "refine" && !descParts.join("").includes(primary.text.slice(0, 8))) {
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

  const charNamesForBind = (ctx.characters ?? [])
    .filter((c) => c.kind !== "scene")
    .map((c) => c.name || c.code || "")
    .filter(Boolean);

  const predPack: DescPredicatePack = extractDescPredicates({
    description: primary?.text ?? ctx.visualDescription ?? "",
    characterNames: charNamesForBind,
  });
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
    if (!sameDual) {
      supportParts.push(identityBind.bindingLine);
      sources.push("identity.binding");
    } else {
      warnings.push("skipped same-person dual binding line");
    }
  }

  const art = ctx.artStyle?.trim();
  if (art && mode !== "fidelity" && !isArtStyleToken(art)) {
    supportParts.push(`画风：${art.slice(0, 80)}`);
    sources.push("project.artStyle");
  }

  layerShootableExtras(ctx, supportParts, sources, mode);

  if (!measureVisualBody(descParts.join(" ")).ok) {
    if (layerSkeletonScene(ctx, descParts, sources)) didSynthesize = true;
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
    const line = `必须出现：${entityAnchors.join("、")}`;
    if (mode === "fidelity") {
      descParts.push(line);
      descParts.push(`再次强调场面：${primary?.text?.slice(0, 120) ?? entityAnchors.join("、")}`);
      sources.push("fidelity.entityReplay");
    } else {
      supportParts.push(line);
      sources.push("entity.anchors");
    }
  }

  const missingLeadAsset = layerCharacterPerf(ctx, supportParts, sources, warnings, mode, {
    omitPersonality: predPack.hasSeatingOrKneel,
  });
  layerBeatBlocking(ctx, supportParts, sources, identityBind.highRole?.name || identityBind.orderedNames[0]);
  layerRefIdentityLock(ctx, supportParts, sources, { seatingHard: predPack.hasSeatingOrKneel });
  layerNeighborWarn(ctx, warnings);
  if (ctx.continuityInject?.trim()) {
    supportParts.push(ctx.continuityInject.trim());
    sources.push("cross.continuity");
  }
  layerMouthLipGuard(ctx, supportParts, sources);
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

  if (!measureVisualBody(visualBody).ok && layerSkeletonScene(ctx, descParts, sources)) {
    didSynthesize = true;
    visualBody = [...descParts, ...supportParts].filter(Boolean).join("。").replace(/。。+/g, "。").trim();
  }

  const qp02 = checkQp02VisualDescription({ visualDescription: scrubStillPromptNoise(visualBody).cleaned });
  if (qp02?.severity === "WARN") warnings.push(qp02.message);
  if (qp02 && qp02.severity === "BLOCK") {
    if (hasAnyAnchor(ctx)) {
      if (layerSkeletonScene(ctx, descParts, sources)) {
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
    recipeTail = predPack.hasSeatingOrKneel
      ? "竖屏9:16安全区构图，权力位站位清晰，正脸朝向镜头且主体不裁切，高细节视频首帧；微表情落在锁定脸型上，禁止重塑五官身份。"
      : STILL_HQ_FIRST_FRAME_RECIPE_ZH_EN;
    compositionContractApplied = true;
    sources.push("compositionContract");
  }

  const policy = precheckContentPolicy(visualBody);
  const complianceHit = policy.hasSensitiveTerms;
  if (complianceHit) {
    visualBody = policy.softenedPrompt;
    sources.push("complianceLite");
    warnings.push(...(policy.warnings ?? ["content policy softened"]));
  }

  // Strip mid-body --cref/--sref; emit ordered cref only at tail
  const strippedBody = stripIdentityTokens(visualBody);
  visualBody = strippedBody.body;
  const orderedTokens = cleanTokenTail(
    [rawTokens, strippedBody.tokenTail, identityBind.crefTail ?? ""].filter(Boolean).join(" "),
    identityBind.orderedCodes,
  );
  if (identityBind.orderedCodes.length) sources.push("identity.crefOrder");

  const prompt = [visualBody, recipeTail, orderedTokens].filter(Boolean).join(" ").replace(/\s{2,}/g, " ").trim();

  const coverage = assertStillDescCoverage({
    prompt,
    description: primary?.text ?? ctx.visualDescription,
    characterNames: charNamesForBind,
    pack: predPack,
  });
  if (!coverage.ok) {
    warnings.push(`descCoverage missing: ${coverage.missing.join(",")}`);
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
      orderedCrefCodes: identityBind.orderedCodes,
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
