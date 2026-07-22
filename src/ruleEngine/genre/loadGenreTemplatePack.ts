/**
 * GenreTemplatePack loader + packId ↔ emotionNorm alias.
 */
import fs from "fs";
import path from "path";
import { readFixtureJson, getFixturesRoot } from "../utils/fixturesPath";
import {
  getEmotionNormFromPlan,
  setEmotionNormOnPlan,
  loadEmotionNormProfiles,
  type EmotionNormState,
} from "../emotion/emotionNorm";

export type GenreTemplatePack = {
  packId: string;
  label: string;
  source?: string;
  emotionSupplyMix?: Record<string, number>;
  storyFormula?: Record<string, unknown>;
  scriptFormula?: Record<string, unknown>;
  shotFormula?: {
    shotSizeBias?: string[];
    allowedMotions?: string[];
    speakMotion?: string;
    reactMotion?: string;
    fxIntentCeiling?: string;
    audioMoodHints?: string[];
    cutGrammar?: string[];
  };
  sceneTagVocabulary?: string[];
  weapons?: string[];
  sceneRecipes?: { id: string; label?: string; weaponId?: string; source?: string }[];
  adaptationPrompts?: { short?: string; w3?: string };
  /** 五维 + 爆点钩子/留存/信息/时长 SSOT */
  designThinking?: Record<string, unknown>;
  /** 分阶段产出模板 */
  stageOutputTemplates?: Record<
    string,
    { mustEmit?: string[]; writingSteps?: string[]; forbid?: string[] }
  >;
  /** 手册级原→改重构示范 */
  reconstructionExamples?: ReconstructionExample[];
  emotionParabola?: Record<string, string>;
  extensions?: unknown[];
};

export type ReconstructionExample = {
  id: string;
  from: string;
  to: string;
  why?: string;
  empathyBeat?: string;
  peakForms?: string[];
  emotionTask?: string;
  paypointHint?: string;
  weaponId?: string;
  sceneRecipeId?: string;
};

export type GenreTemplateState = {
  packId: string;
  adaptationDepth?: "viral" | "standard" | "weakPath";
  provisional?: boolean;
  literaryStale?: boolean;
  structureStale?: boolean;
  updatedAt?: number;
};

export type ViralDerivation = {
  id?: string;
  text: string;
  stage?: string;
  active?: boolean;
  createdAt?: number;
};

const packCache = new Map<string, GenreTemplatePack>();

export function listGenreTemplatePackIds(): string[] {
  const dir = path.join(getFixturesRoot(), "genre_template_packs");
  if (!fs.existsSync(dir)) return ["generic"];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
}

export function loadGenreTemplatePack(packId: string): GenreTemplatePack {
  const id = packId || "generic";
  if (packCache.has(id)) return packCache.get(id)!;
  const pack = readFixtureJson<GenreTemplatePack>(`genre_template_packs/${id}.json`, {
    packId: "generic",
    label: "通用",
    adaptationPrompts: { short: "通用爆款基础" },
    shotFormula: { speakMotion: "static", allowedMotions: ["static"] },
    weapons: [],
  });
  if (!pack.packId) pack.packId = id;
  packCache.set(id, pack);
  return pack;
}

export function loadAllGenreTemplatePacks(): GenreTemplatePack[] {
  return listGenreTemplatePackIds().map((id) => loadGenreTemplatePack(id));
}

/** Bidirectional alias: genreTemplate.packId ↔ emotionNorm.activeProfileId */
export function getGenreTemplateFromPlan(plan: Record<string, unknown> | null | undefined): GenreTemplateState {
  const pd = (plan?.planData as Record<string, unknown>) ?? {};
  const gt = pd.genreTemplate as GenreTemplateState | undefined;
  const en = getEmotionNormFromPlan(plan);
  const packId = gt?.packId || en.activeProfileId || "generic";
  return {
    packId,
    adaptationDepth: gt?.adaptationDepth || "viral",
    provisional: gt?.provisional,
    literaryStale: gt?.literaryStale || en.structureStale,
    structureStale: gt?.structureStale || en.structureStale,
    updatedAt: gt?.updatedAt || en.updatedAt,
  };
}

export function setGenreTemplateOnPlan(
  plan: Record<string, unknown>,
  opts: {
    packId: string;
    adaptationDepth?: GenreTemplateState["adaptationDepth"];
    provisional?: boolean;
    markStale?: boolean;
    literaryStale?: boolean;
  },
): GenreTemplateState {
  const prev = getGenreTemplateFromPlan(plan);
  const changed = prev.packId !== opts.packId;
  const next: GenreTemplateState = {
    packId: opts.packId,
    adaptationDepth: opts.adaptationDepth ?? prev.adaptationDepth ?? "viral",
    provisional: opts.provisional ?? false,
    literaryStale: opts.literaryStale ?? (opts.markStale !== false && changed ? true : prev.literaryStale),
    structureStale: opts.markStale !== false && changed ? true : prev.structureStale,
    updatedAt: Date.now(),
  };
  if (!plan.planData || typeof plan.planData !== "object") plan.planData = {};
  const pd = plan.planData as Record<string, unknown>;
  pd.genreTemplate = next;
  // alias emotionNorm
  setEmotionNormOnPlan(plan, { activeProfileId: opts.packId, markStale: opts.markStale !== false && changed });
  const en = getEmotionNormFromPlan(plan);
  if (next.structureStale) {
    en.structureStale = true;
    pd.emotionNorm = en;
    plan._emotionNorm = en;
  }
  return next;
}

export function syncPackIdAliases(plan: Record<string, unknown>): void {
  const gt = getGenreTemplateFromPlan(plan);
  const en = getEmotionNormFromPlan(plan);
  if (!plan.planData || typeof plan.planData !== "object") plan.planData = {};
  const pd = plan.planData as Record<string, unknown>;
  if (!pd.genreTemplate) {
    pd.genreTemplate = { packId: en.activeProfileId || "generic", adaptationDepth: "viral", updatedAt: Date.now() };
  } else if ((pd.genreTemplate as GenreTemplateState).packId !== en.activeProfileId) {
    // prefer genreTemplate if set more recently
    const g = pd.genreTemplate as GenreTemplateState;
    if ((g.updatedAt ?? 0) >= (en.updatedAt ?? 0)) {
      setEmotionNormOnPlan(plan, { activeProfileId: g.packId, markStale: false });
    } else {
      (pd.genreTemplate as GenreTemplateState).packId = en.activeProfileId;
    }
  }
}

export function getViralDerivations(plan: Record<string, unknown>): ViralDerivation[] {
  const pd = (plan.planData as Record<string, unknown>) ?? {};
  const list = pd.viralDerivation;
  return Array.isArray(list) ? (list as ViralDerivation[]) : [];
}

export function appendViralDerivation(plan: Record<string, unknown>, text: string, stage?: string): ViralDerivation {
  if (!plan.planData || typeof plan.planData !== "object") plan.planData = {};
  const pd = plan.planData as Record<string, unknown>;
  const list = getViralDerivations(plan);
  const entry: ViralDerivation = {
    id: `vd-${Date.now()}`,
    text: text.trim(),
    stage,
    active: true,
    createdAt: Date.now(),
  };
  list.push(entry);
  pd.viralDerivation = list.slice(-20);
  return entry;
}

export function compileAdaptationConstraintBlock(
  packId: string,
  opts?: { derivations?: ViralDerivation[]; maxDerivations?: number },
): string {
  const pack = loadGenreTemplatePack(packId);
  const dt = pack.designThinking as
    | {
        peakHookGuidance?: {
          truePeakForms?: string[];
          falsePeakLabels?: string[];
          empathyThreeBeat?: string[];
        };
        durationNormLines?: string[];
      }
    | undefined;
  const lines = [
    "【爆款改编约束块】",
    `公式：${pack.label} (${pack.packId})`,
    pack.adaptationPrompts?.short || "",
    pack.adaptationPrompts?.w3 || "",
    `情绪供给：${JSON.stringify(pack.emotionSupplyMix ?? {})}`,
    `Speak=${pack.shotFormula?.speakMotion || "static"}；React=${pack.shotFormula?.reactMotion || "gentle push"}`,
    `FX天花板：${pack.shotFormula?.fxIntentCeiling || "F2"}`,
    `打标词表：${(pack.sceneTagVocabulary ?? []).join(" / ")}`,
    "【台词权责】设计期(锁稿前)可按爆款规则补/改/删角色台词；literaryLocked 后禁止机器改正文。",
    "缺打标/口型拆镜/fxIntent/分镜意图/对白主推 不得出站。",
    "主推=对白/独白直白给信息；视听辅助不单调；禁观众元叙述与正文技术括注。",
  ];
  if (dt?.peakHookGuidance?.truePeakForms?.length) {
    lines.push(`真视听爆点：${dt.peakHookGuidance.truePeakForms.join(" / ")}`);
  }
  if (dt?.peakHookGuidance?.falsePeakLabels?.length) {
    lines.push(`假爆点禁标：${dt.peakHookGuidance.falsePeakLabels.join(" / ")}`);
  }
  if (dt?.peakHookGuidance?.empathyThreeBeat?.length) {
    lines.push(`共鸣三拍：${dt.peakHookGuidance.empathyThreeBeat.join("→")}`);
  }
  if (dt?.durationNormLines?.length) {
    lines.push("时长：" + dt.durationNormLines[0]);
  }
  const ders = (opts?.derivations ?? []).filter((d) => d.active !== false).slice(0, opts?.maxDerivations ?? 5);
  if (ders.length) {
    lines.push("【本剧衍生】");
    for (const d of ders) lines.push(`- ${d.text}`);
  }
  return lines.filter(Boolean).join("\n");
}

export function catalogForPicker(): {
  id: string;
  label: string;
  short: string;
  emotionSupplyMix?: Record<string, number>;
}[] {
  return loadAllGenreTemplatePacks().map((p) => ({
    id: p.packId,
    label: p.label,
    short: p.adaptationPrompts?.short || p.label,
    emotionSupplyMix: p.emotionSupplyMix,
  }));
}

export function clearGenrePackCache(): void {
  packCache.clear();
}

export type { EmotionNormState };
export { loadEmotionNormProfiles };
