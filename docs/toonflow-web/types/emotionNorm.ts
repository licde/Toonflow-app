/** Emotion-norm FE contract — mirror adaptationProfile pattern. */

export type EmotionNormProfileId =
  | "generic"
  | "sweet"
  | "abuse_romance"
  | "war_god"
  | "suspense"
  | string;

export type EmotionNormState = {
  activeProfileId: EmotionNormProfileId;
  normVersion: string;
  structureStale?: boolean;
  updatedAt?: number;
};

export type EmotionNormCatalogItem = {
  id: EmotionNormProfileId;
  label: string;
  avStyle?: string;
  colorMood?: string;
  paletteHints?: string[];
};

export type EmotionNormProfileResponse = {
  catalog: EmotionNormCatalogItem[];
  profiles: Record<string, unknown>;
  emotionNorm: EmotionNormState;
  matrixEmotionLogicMap?: Record<string, string>;
};

export type SetEmotionNormProfileBody = {
  projectId: number;
  activeProfileId: EmotionNormProfileId;
  /** Web switch default true; Chat first lock may false */
  applyStructureHeal?: boolean;
};

export type SetEmotionNormProfileResult = {
  emotionNorm: EmotionNormState;
  healSummary?: {
    patches?: string[];
    dialogueUnchanged?: boolean;
    expandedCount?: number;
    profileId?: string;
    skipped?: boolean;
    reason?: string;
  };
};

/** UX copy SSOT — keep Chat/Web identical */
export const EMOTION_NORM_UX = {
  webConfirmBody: "只更新情绪契约与分镜结构，不修改台词原文",
  webPrimaryCta: "按当前题材公式补齐结构",
  webSecondaryCta: "去编剧本阶段优化",
  rulePanelStructureCta: "按设计思路补全",
  structureStaleHint: "公式/维度已变，请按新 brief 重写本阶段",
  designExitFailCta: "本阶段优化",
  viralBriefCta: "按设计思路补全",
  peakHookCardTitle: "视听爆点 / 钩子",
  durationHintTitle: "时长规范",
} as const;

/** Alias: genreTemplate.packId === emotionNorm.activeProfileId */
export type GenreTemplateState = {
  packId: EmotionNormProfileId;
  adaptationDepth?: "viral" | "standard" | "weakPath";
  provisional?: boolean;
  literaryStale?: boolean;
  structureStale?: boolean;
  updatedAt?: number;
};

/** Chat 爆点卡 / 钩子卡 / writing context 契约 */
export type PeakLedgerEntry = {
  peakId: string;
  sourceSpan?: string;
  avForm: string;
  emotionType: string;
  avPayload: { visual: string; audio: string };
  retainRole: string;
  patternId?: string;
};

export type HookPlanSlot = {
  hookId: string;
  slot: "opening" | "mid" | "end";
  hookType: string;
  visualBeat: string;
  audioBeat: string;
  targetEmotion: string;
  suggestedDurationSec: number;
  peakId?: string;
  shootableDelta?: string;
};

export type HookPlan = {
  opening?: HookPlanSlot;
  mid?: HookPlanSlot;
  end?: HookPlanSlot;
  empathyThreeBeat?: string[];
  retention31545?: { s3: string; s15: string; s45: string };
  paypointIntent?: {
    cutBeforeBeat: string;
    episodeHint?: string;
    visualFreeze?: string;
    audioTail?: string;
  };
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

export type ShotDesignIntent = {
  intentId?: string;
  sceneRef?: number | string;
  purpose: string;
  emotionGoal: string;
  picture: string;
  shotSizeIntent: string;
  cutIntent: string;
  audioIntent: string;
  durationSec: number;
  peakId?: string;
  hookId?: string;
  weaponId?: string;
  sceneRecipeId?: string;
  sfxIntent?: string[];
};

export type ViralWritingContext = {
  packId: string;
  stageId: string;
  constraintBlock: string;
  stageBrief: string;
  peakLedger: PeakLedgerEntry[];
  hookPlan?: HookPlan;
  durationNormLines: string[];
  designThinkingSummary: string;
  reconstructionExamples?: ReconstructionExample[];
  agentInjectBlock?: string;
  ctaHint: string;
  literaryStale?: boolean;
};

export type ExtractPeakHookBody = {
  projectId?: number;
  sourceText: string;
  packId?: string;
  persist?: boolean;
};

export type SetViralFormulaBody = {
  projectId: number;
  packId: string;
  provisional?: boolean;
  adaptationDepth?: "viral" | "standard" | "weakPath";
  derivationText?: string;
  sourceText?: string;
  stageId?: string;
};
