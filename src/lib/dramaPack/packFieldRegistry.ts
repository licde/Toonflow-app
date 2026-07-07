import type { DramaPack, DramaPackStoryboardShot } from "./schema";
import type { CodeIndex } from "./promptComposer";
import type { PackExtensionsContext } from "./packExtensionsResolver";
import { lookupLockDescription, pickPersonalityHints } from "./characterAssetUtils";
import { mapVisualIdToWardrobeStage } from "./tieredAssetPolicy";
import { resolveCharCodeFromVisualId } from "./packExtensionsResolver";
import { createComposeContext, type ComposeContext, type RuleShotContext } from "./composeContext";
import { shouldApplySpecBlock } from "./artStyleProfiles";
import { PACK_FIELD_RULES } from "./rules";
import { parseVisualId } from "./visualIdParser";
import {
  readPersonalitySwitch,
  shouldSkipT1ForChar,
  SAME_FACE_SECONDARY_REF,
  isPersonaSplitChar,
} from "./personaPolicy";

type PerformanceFields = {
  bodyWeight?: string;
  shoulders?: string;
  breath?: string;
  gaze?: string;
  hands?: string;
  mouth?: string;
  transition?: string;
  microExpression?: Record<string, string>;
  physiological?: Record<string, string>;
};

export type ComposeRuleContext = {
  shot: DramaPackStoryboardShot;
  pack: DramaPack;
  index: CodeIndex;
  shotIndex: number;
  prevIntensity?: number;
  extensions?: PackExtensionsContext;
  artStyle: string;
  mode: "merge" | "rebuild";
};

export type RuleChannel = "imagePrompt" | "videoDesc" | "postProduction" | "associate";

export type RuleState = {
  imagePrompt: string;
  postProductionHints: Record<string, string>;
  mergeFragment: (existing: string, fragment: string) => string;
  promptContains: (text: string, fragment: string) => boolean;
};

export type PackFieldRule = {
  id: string;
  channel: RuleChannel;
  priority: number;
  specBlock?: string;
  profileGate?: (ctx: ComposeContext) => boolean;
  apply: (state: RuleState, rctx: RuleShotContext) => void;
};

/** Registry 声明：供 manifest 脚本读取 */
export const FIELD_RULE_MANIFEST: Array<{
  id: string;
  channel: RuleChannel;
  specBlock?: string;
  status: string;
}> = PACK_FIELD_RULES.map((r) => ({
  id: r.id,
  channel: r.channel,
  specBlock: r.specBlock ?? r.id,
  status: "applied",
}));

function promptContains(text: string, fragment: string): boolean {
  if (!fragment.trim()) return true;
  return text.toLowerCase().includes(fragment.toLowerCase());
}

function mergeFragment(existing: string, fragment: string): string {
  if (!fragment.trim()) return existing;
  if (promptContains(existing, fragment)) return existing;
  return existing ? `${fragment}, ${existing}` : fragment;
}

export function runRules(channel: RuleChannel, rctx: RuleShotContext, basePrompt = ""): RuleState {
  const state: RuleState = {
    imagePrompt: basePrompt,
    postProductionHints: {},
    mergeFragment,
    promptContains,
  };

  const rules = PACK_FIELD_RULES.filter((r) => r.channel === channel)
    .filter((r) => !r.profileGate || r.profileGate(rctx.ctx))
    .filter((r) => !r.specBlock || shouldApplySpecBlock(rctx.ctx.profile, r.specBlock))
    .sort((a, b) => a.priority - b.priority);

  for (const rule of rules) {
    rule.apply(state, rctx);
  }
  return state;
}

export function mergePerformanceWithMapping(
  shot: DramaPackStoryboardShot,
  performanceBaseline?: Record<string, string>,
  emotionMapping?: Record<string, PerformanceFields>,
): PerformanceFields {
  const perf = (shot.performance ?? {}) as PerformanceFields;
  const filled = [perf.bodyWeight, perf.shoulders, perf.breath, perf.gaze, perf.hands, perf.mouth].filter(Boolean).length;
  if (filled >= 2) return perf;

  let toneKey = shot.colorTone || "";
  if (/雪辞/.test(shot.visualId || "")) toneKey = "雪辞出现";
  const mapped = toneKey && emotionMapping?.[toneKey] ? { ...emotionMapping[toneKey] } : {};
  const base = performanceBaseline ?? {};
  return { ...base, ...mapped, ...perf };
}

export function formatPerformanceFull(perf: PerformanceFields): string {
  const parts = [
    perf.bodyWeight,
    perf.shoulders,
    perf.breath,
    perf.gaze,
    perf.hands,
    perf.mouth,
    perf.transition,
  ].filter(Boolean);

  const micro = perf.microExpression;
  if (micro) {
    const microParts = [micro.eyes, micro.pupil, micro.mouthDetail, micro.flush].filter(Boolean);
    if (microParts.length) parts.push(`微表情:${microParts.join("/")}`);
  }
  const phys = perf.physiological;
  if (phys) {
    const physParts = [phys.sweat, phys.breathVisible, phys.tremor, phys.pallor].filter(Boolean);
    if (physParts.length) parts.push(`生理:${physParts.join("/")}`);
  }
  return parts.length ? parts.join("，") : "静止";
}

export function applyImagePromptRules(ctx: ComposeRuleContext, basePrompt: string): string {
  const composeCtx = createComposeContext(ctx.pack, ctx.index, ctx.artStyle, ctx.extensions);
  const rctx: RuleShotContext = {
    ctx: composeCtx,
    shot: ctx.shot,
    shotIndex: ctx.shotIndex,
    prevIntensity: ctx.prevIntensity,
    mode: ctx.mode,
  };
  return runRules("imagePrompt", rctx, basePrompt).imagePrompt;
}

export function buildPostProductionHints(ctx: ComposeRuleContext): Record<string, string> {
  const composeCtx = createComposeContext(ctx.pack, ctx.index, ctx.artStyle, ctx.extensions);
  const rctx: RuleShotContext = {
    ctx: composeCtx,
    shot: ctx.shot,
    shotIndex: ctx.shotIndex,
    mode: ctx.mode,
  };
  return runRules("postProduction", rctx).postProductionHints;
}

export function resolveWardrobeAssociateCodes(
  visualId: string | undefined,
  index: CodeIndex,
  assetCodes: string[] = [],
  extensions?: PackExtensionsContext,
  shot?: DramaPackStoryboardShot,
): string[] {
  const codes: string[] = [...(assetCodes ?? [])];
  const raw = shot as Record<string, unknown> | undefined;
  const ps = raw ? readPersonalitySwitch(raw) : undefined;
  const l6Trigger = String(raw?.["L6-trigger"] || "");

  if (ps?.to && !codes.includes(ps.to)) codes.push(ps.to);
  if (ps?.from && !codes.includes(ps.from)) codes.push(ps.from);

  if (/雪辞/.test(l6Trigger) || /雪辞/.test(visualId || "")) {
    if (!codes.includes("CHAR-XC")) codes.push("CHAR-XC");
  }

  if (!visualId) return finalizeAssociateCodes(codes, extensions);

  const parsed = parseVisualId(visualId);
  if (parsed?.charCode && !codes.includes(parsed.charCode)) {
    codes.push(parsed.charCode);
  }

  const stageInfo = index.charStages[visualId];
  if (stageInfo?.stageName) {
    codes.push(stageInfo.charCode);
    if (!shouldSkipT1(stageInfo.charCode, extensions)) {
      codes.push(`${stageInfo.charCode}:${stageInfo.stageName}`);
    }
    return finalizeAssociateCodes(codes, extensions);
  }

  const charCode =
    assetCodes.find((c) => c.startsWith("CHAR-")) ||
    parsed?.charCode ||
    resolveCharCodeFromVisualId(visualId, assetCodes, extensions?.characterAssets ?? {});
  if (!charCode) {
    if (/雪辞/.test(visualId)) {
      for (const [code, meta] of Object.entries(index.byCode)) {
        if (meta.name.includes("雪辞")) {
          codes.push(code);
          if (!shouldSkipT1(code, extensions)) codes.push(`${code}:夜晚`);
          return finalizeAssociateCodes(codes, extensions);
        }
      }
    }
    return finalizeAssociateCodes(codes, extensions);
  }

  if (!codes.includes(charCode)) codes.push(charCode);

  const wardrobeStage = mapVisualIdToWardrobeStage(visualId, charCode);
  if (wardrobeStage && !shouldSkipT1(charCode, extensions)) {
    codes.push(`${charCode}:${wardrobeStage}`);
  }

  return finalizeAssociateCodes(codes, extensions);
}

function shouldSkipT1(charCode: string, extensions?: PackExtensionsContext): boolean {
  if (!isPersonaSplitChar(charCode)) return false;
  return shouldSkipT1ForChar(charCode, extensions?.characterAssets?.[charCode] as Record<string, unknown> | undefined);
}

/** 同脸 reference 链：XC 镜 secondary anchor → LZH T0 */
function finalizeAssociateCodes(codes: string[], extensions?: PackExtensionsContext): string[] {
  const unique = [...new Set(codes)];
  for (const code of [...unique]) {
    if (!code.startsWith("CHAR-") || code.includes(":")) continue;
    const secondary = SAME_FACE_SECONDARY_REF[code];
    if (secondary && !unique.includes(secondary)) unique.unshift(secondary);
  }
  return unique;
}

export function buildPersonalityVideoSuffix(ctx: ComposeRuleContext): string {
  const raw = ctx.shot as Record<string, unknown>;
  const l6 = String(raw["L6-trigger"] || "");
  const parts: string[] = [];
  if (l6.trim()) parts.push(`L6:${l6.trim()}`);

  const ps = readPersonalitySwitch(raw);
  if (ps?.visualMark) parts.push(ps.visualMark);
  if (ps?.progress) parts.push(`progress:${ps.progress}`);

  const charCode = (ctx.shot.assetCodes ?? []).find((c) => c.startsWith("CHAR-"));
  if (charCode && ctx.extensions?.characterAssets?.[charCode]) {
    const hints = pickPersonalityHints(
      ctx.extensions.characterAssets[charCode] as Record<string, unknown>,
      ctx.shot.colorTone,
    );
    parts.push(...hints);
  }
  return parts.filter(Boolean).join("；");
}

/** 已知 productionSpec 块 → Registry 覆盖状态 */
export const KNOWN_SPEC_BLOCKS = new Set([
  "colorToneMapping",
  "transitionRules",
  "dialogueActionSync",
  "constraints",
  "imagePromptRules",
  "soundDesign",
  "systemUIAppearance",
  "cameraAnchor",
  "emotionPerformanceMapping",
  "performanceBaseline",
  "sceneColorLock",
  "sceneDesign",
  "propDesign",
  "bgmRules",
  "subtitleRules",
  "platformAdaption",
  "outputFormatRules",
  "shotTypeRules",
  "editingRules",
  "characterAssetRules",
  "sceneGenerationRules",
  "episodeOpenRules",
  "costTiers",
  "aiFailover",
  "validation",
  "imagePromptTemplates",
  "continuityLock",
  "emotionCurveDimensions",
  "productLayer",
]);

export function findUnmappedSpecBlocks(pack: DramaPack): string[] {
  const spec = pack.productionSpec ?? {};
  return Object.keys(spec).filter((k) => !KNOWN_SPEC_BLOCKS.has(k));
}
