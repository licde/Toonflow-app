import type { FlowData } from "./flowDataTypes";
import type { EpisodePackage, ValidationReport } from "../types";

export type ImportMode = "create" | "update" | "upsert";
export type MergeStrategy = "replaceAll" | "mergeLayers" | "preserveMedia";

export interface BundleMeta {
  episodeKey?: string;
  episodeName?: string;
  episodeIndex?: number;
  projectId?: number;
  scriptId?: number;
  prevEpisodeKey?: string | null;
  bundleHash?: string;
  provenance?: {
    source?: string;
    chapterRange?: string;
    novelTitle?: string;
    novelId?: number | null;
    eventTrace?: { novelRef?: string; scriptRef?: string; shotRef?: string }[];
  };
}

export interface ScriptBundleContinuity {
  prevEpisodeSummary?: string;
  characterState?: Record<string, string>;
  unresolvedHooks?: string[];
  recapHint?: string;
}

export interface ScriptBundleAnchors {
  visual?: string[];
  emotionCarry?: string;
}

export interface DesignBrief {
  B1?: string;
  B2?: string;
  B3?: string;
  B4?: number[];
  B5?: string[];
  B6?: Record<string, string>;
  B7?: string[];
  B8?: { position: string; type: string }[];
  B9?: { from: string; to: string; reason: string }[];
  B10?: string;
  B11?: string[];
  B12?: Record<string, string>;
  B13?: string[];
  emotionCurveOutline?: number[];
  rhythmOutline?: Record<string, string>;
  infoLinkageChain?: string[];
  arcToneMap?: Record<string, string>;
  visualLockHints?: string[];
  paypointMarkers?: { position: string; type: string }[];
  sceneTransitionPlan?: { from: string; to: string; reason: string }[];
  emotionCurveType?: string;
}

export interface ShotGeneration {
  imagePrompt?: string;
  videoPrompt?: string;
  audioPrompt?: string;
  fxPrompt?: string;
}

export interface PreDesignShot {
  shotIndex?: number;
  type?: string;
  sceneName?: string;
  duration?: number;
  shotSize?: string;
  emotion?: number;
  visualDescription?: string;
  visualEffect?: string;
  charCodes?: string[];
  generation?: ShotGeneration;
  narrative?: {
    dialogue?: {
      lines?: { speaker?: string; text?: string }[];
    };
  };
}

export interface PreDesignPack {
  scriptPlan: string;
  shots: PreDesignShot[];
  externalHashCheck?: { match?: boolean; hash?: string };
  preDesignQuality?: { overall?: string; supervision?: string };
  sceneCodeMap?: Record<string, string>;
}

export interface ScriptBundle {
  bundleVersion?: string;
  bundleType: "script";
  rulePackVersion?: string;
  meta: BundleMeta;
  script: string;
  characters?: string[];
  scenes?: string[];
  continuity?: ScriptBundleContinuity;
  anchors?: ScriptBundleAnchors;
  planData?: Record<string, unknown>;
  designBrief?: DesignBrief;
  preDesignPack?: PreDesignPack;
  ruleAudit?: Record<string, unknown>;
  smartDetection?: Record<string, unknown>;
  fixPlan?: unknown[];
  linkageRepairPlan?: unknown[];
  rePushPlan?: unknown[];
  linkageAudit?: Record<string, unknown>;
  forwardTrace?: Record<string, unknown>;
  qualityDiagnostics?: Record<string, unknown>;
  identityAudit?: Record<string, unknown>;
  fxFeasibilityAudit?: Record<string, unknown>;
  narrativeCausalityGraph?: Record<string, unknown>;
  debutIntroPack?: Record<string, unknown>;
  productionReasonableness?: Record<string, unknown>;
  modalityPromptAudit?: Record<string, unknown>;
  modalityAudit?: Record<string, unknown>;
  assetPipeline?: Record<string, unknown>;
  characterDesign?: Record<string, unknown>;
  visualLockTable?: Record<string, unknown>;
  flowData?: {
    scriptPlan?: string;
    storyboardTable?: string;
    storyboard?: StoryboardPanelInput[];
  };
  _comment?: string;
}

export interface StoryboardPanelInput {
  id?: number;
  clientId?: string;
  flowId?: number;
  duration: number;
  prompt: string;
  videoDesc?: string;
  shouldGenerateImage?: number;
  associateAssetsIds?: number[];
  track?: string;
  state?: string;
  src?: string | null;
  index?: number;
}

export interface EpisodeBundleFlowData extends Omit<FlowData, "storyboard"> {
  storyboard: StoryboardPanelInput[];
}

export interface EpisodeBundle {
  bundleVersion?: string;
  rulePackVersion?: string;
  meta: BundleMeta;
  flowData: EpisodeBundleFlowData;
  package?: Partial<EpisodePackage>;
  validationReport?: ValidationReport | null;
  _comment?: string;
}

export interface SeriesBundle {
  bundleVersion?: string;
  meta: { projectId?: number; seriesName?: string };
  project?: { blueprint?: Record<string, unknown>; sharedAssets?: unknown[] };
  episodes: EpisodeBundle[];
}

export interface ImportOptions {
  importMode?: ImportMode;
  mergeStrategy?: MergeStrategy;
  targetScriptId?: number;
  autoDesign?: boolean;
  validateOnly?: boolean;
  /** 导入后附带 dryRun 报告（不阻断） */
  includeValidationReport?: boolean;
  projectId: number;
}

export interface ResolvedContext {
  projectId: number;
  scriptId: number;
  episodeKey?: string;
  episodeIndex?: number;
  script: string;
  prevScript?: string;
  prevEpisodeSummary?: string;
  planData: Record<string, string>;
  globalAnchors: Record<string, unknown> | null;
  assets: { id: number; name: string; type: string }[];
  continuity?: ScriptBundleContinuity;
  anchors?: ScriptBundleAnchors;
  designBrief?: DesignBrief;
  warnings: string[];
}

export interface ImportResult {
  scriptId: number;
  idMap: Record<string, number>;
  validationReport?: ValidationReport;
  resolvedContext?: ResolvedContext;
  autoDesignJobId?: string;
  dryRun?: DryRunImportSummary;
  preImport?: import("../portable/types").InspectBundleResult;
  postImport?: IntValidationSummary;
  chatPromptGaps?: import("./chatPromptAudit").ChatPromptGap[];
}

export interface IntValidationSummary {
  passed: boolean;
  tier0Coverage: { executed: number; registered: number; triggered: number };
  issues: unknown[];
  ruleEngineEnabled?: boolean;
}

export interface ProductionClosureCheck {
  id: string;
  passed: boolean;
  message: string;
  severity: string;
}

export interface DryRunImportSummary {
  willCreateScript: boolean;
  willOverwriteLayers: string[];
  storyboardCount: number;
  mergeStrategy: MergeStrategy;
  warnings: string[];
  skipAutoDesignSb?: boolean;
  productionClosureChecks?: ProductionClosureCheck[];
  designClosureChecks?: ProductionClosureCheck[];
  generationClosureChecks?: ProductionClosureCheck[];
  intelligentClosureChecks?: ProductionClosureCheck[];
  closureChecks?: {
    dc: ProductionClosureCheck[];
    pc: ProductionClosureCheck[];
    gc: ProductionClosureCheck[];
    ic: ProductionClosureCheck[];
    blocked: boolean;
  };
  forwardTrace?: Record<string, unknown>;
  reverseHints?: { dimension: string; reverseTarget: string; symptom: string; chainId?: string; preserveFields?: string[]; ruleId?: string }[];
  repairHints?: { id: string; chatTemplate?: string; ruleId?: string }[];
  preImport?: import("../portable/types").InspectBundleResult;
  endpoint?: "ext" | "int";
  postImport?: IntValidationSummary;
}

export type AutoDesignStage = "GB" | "SB" | "EN" | "done" | "failed";
export type AutoDesignStatus = "pending" | "running" | "partial" | "done" | "failed" | "cancelled";

export interface AutoDesignJob {
  id: string;
  projectId: number;
  scriptId: number;
  status: AutoDesignStatus;
  stage: AutoDesignStage;
  progress: number;
  error?: string;
  partialFrom?: AutoDesignStage;
  result?: {
    scriptPlan?: string;
    storyboardTable?: string;
    storyboardCount?: number;
    validationReport?: ValidationReport;
  };
  createdAt: number;
  updatedAt: number;
}
