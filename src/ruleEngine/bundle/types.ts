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
  B3?: string | Record<string, unknown>;
  B4?: number[];
  B5?: (string | Record<string, unknown>)[];
  B6?: Record<string, unknown>;
  B7?: string;
  B8?: string;
  B9?: string | Record<string, string>;
  B10?: string | Record<string, unknown>;
  B11?: string[];
  B12?: Record<string, string> | Record<string, unknown>[];
  B13?: (string | Record<string, unknown>)[];
  B14?: { position: string; type: string; desc?: string }[];
  B15?: { clipHookId?: string; hook?: string; duration?: string }[];
  B16?: Record<string, unknown>;
  B17?: Record<string, unknown> | Record<string, unknown>[];
  B18?: Record<string, unknown>;
  B19?: Record<string, unknown>;
  /** infoLedgerRefs — infoId string[] (canonical) */
  B20?: string[];
  B21?: Record<string, unknown>;
  B22?: Record<string, unknown>;
  /** retentionInfoDelivery record, may include items[] */
  B23?: Record<string, unknown>;
  emotionCurveOutline?: number[];
  rhythmOutline?: Record<string, string>;
  infoLinkageChain?: (string | Record<string, unknown>)[];
  arcToneMap?: Record<string, string>;
  visualLockHints?: string[];
  paypointMarkers?: { position: string; type: string; desc?: string }[];
  sceneTransitionPlan?: { from: string; to: string; reason: string }[];
  emotionCurveType?: string;
}

export interface ShotGeneration {
  imagePrompt?: string;
  videoPrompt?: string;
  audioPrompt?: string;
  fxPrompt?: string;
  /** Persisted still IntentClassifier class for video inherit */
  stillIntentClass?: string;
  /** Video intent class after spine classify */
  intentClass?: string;
  /** Import contract gaps (VD||dialogue) — warn only; generation heals or true-gap BLOCKs */
  designGaps?: string[];
  videoDesc?: string;
  compiled?: {
    image?: string;
    video?: string;
    audio?: string;
    fx?: string;
    hash?: string;
  };
  manualOverride?: { image?: boolean; video?: boolean };
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
  shotDesign?: Record<string, unknown>;
  retentionTier?: string;
  clip30sCandidate?: boolean;
  rhythm31545?: Record<string, unknown>;
  narrative?: {
    dialogue?: {
      lines?: { speaker?: string; text?: string; lineId?: string; functions?: string[]; causedByActionId?: string; splitHint?: string; reactionAction?: string; subtext?: string }[];
    };
    markers?: Record<string, unknown>[];
    transitionType?: string;
    rhythmZone?: string;
    spatialRelation?: string;
    emotionIntensity?: number;
    sceneName?: string;
    type?: string;
    debutBeat?: string;
    duration?: number;
  };
  audioCue?: string;
  fxLevel?: string;
  markers?: Record<string, unknown>[];
}

export interface PreDesignPack {
  scriptPlan: string;
  episodeBeat?: Record<string, unknown>;
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
  narrativeSelfcheck?: Record<string, unknown>;
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
  videoAudioPolicy?: Record<string, unknown>;
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
  audioPrompt?: string;
  fxPrompt?: string;
  shouldGenerateImage?: number;
  associateAssetsIds?: number[];
  track?: string;
  state?: string;
  src?: string | null;
  filePath?: string | null;
  index?: number;
  /** Split child: never inherit parent media by storyboard index */
  burnParentForbidden?: boolean;
  _stillBeatSplitId?: string;
  _visualSplitId?: string;
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
  /** T3 默认 true：qualityGate / export gate BLOCK 时拒绝落库 */
  blockOnQualityGate?: boolean;
  projectId: number;
  /** 保留旧稿继续补洞：跳过 DEX-LITERARY-STALE 硬闸（须显式确认） */
  acknowledgeKeepLegacy?: boolean;
  /** Author shots present: allow legacy IRD/cam/oneBeat apply (default false = diagnose-only) */
  forceExpand?: boolean;
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
  seriesContinuity?: Record<string, unknown>;
  warnings: string[];
}

export interface MergeReport {
  action: "create" | "update" | "match";
  scriptId: number;
  storyboardReplaced: boolean;
  storyboardCount: number;
  blueprintMerged: boolean;
  assetsSeeded?: number;
  importMode?: ImportMode;
  mergeStrategy?: MergeStrategy;
  /** Panels whose filePath was kept across re-import */
  mediaPreservedCount?: number;
  assetClosure?: {
    ok: boolean;
    orphansSeeded: string[];
    stillMissing: string[];
    shotCount: number;
    referenced: string[];
  };
  assetDiagnostics?: {
    seeded?: number;
    linked?: number;
    pruned?: number;
    speakerSeeded?: number;
    duplicateSuspects?: string[];
  };
}

export interface ImportPathGuard {
  recommended: "importScript" | "enterProduction";
  severity: "INFO" | "WARN";
  message: string;
}

export interface ShapeSalvageEntry {
  ruleId: string;
  path: string;
  action: string;
}

export interface ShapeResidualGap {
  id: string;
  severity: string;
  message: string;
  field?: string;
}

/** Import-time asset quality report — stub soft-warn + enqueue (G1); missing main still blocks. */
export interface AssetQualityReport {
  stubCount: number;
  sceneSeeded: number;
  propSeeded: number;
  speakerSeeded: number;
  weakPromptCount: number;
  derivativeCount: number;
  derivativeSkipReason?: string;
  audioGap: boolean;
  orphansLinked: number;
  orphansSeeded: number;
  /** Main CD CHAR / SCENE codes missing from codeToId after hydrate */
  missingMainCodes?: string[];
  /** Speaker orphans (WARN only; does not fail ok) */
  speakerWarns?: string[];
  ok: boolean;
  /** G1: stub quality → FE/selfHeal enqueue */
  primaryNextStep?: "batch_still";
  softWarn?: boolean;
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
  mergeReport?: MergeReport;
  pathGuard?: ImportPathGuard;
  ruleConsistencyGaps?: { id: string; severity: string; message: string; field?: string }[];
  integrityGaps?: { id: string; severity: string; message: string; field?: string }[];
  feedbackLog?: { gapId: string; action: "ignore" | "report" | "fixed"; note?: string }[];
  shapeSalvageLog?: ShapeSalvageEntry[];
  /** Human-readable「已自动适配」summary when salvage ran */
  shapeSalvageSummary?: string;
  shapeResidualGaps?: ShapeResidualGap[];
  assetQuality?: AssetQualityReport;
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
  /** Structured evidence (PrecheckLoop / DC adapters). */
  detail?: Record<string, unknown>;
}

export interface DryRunImportSummary {
  willCreateScript: boolean;
  willOverwriteLayers: string[];
  storyboardCount: number;
  /** Author pack shot count before prepare expand/heal */
  rawShotCount?: number;
  /** Shot count after prepareBundleForInspect */
  postPrepareCount?: number;
  /** True when author shots were diagnose-only (no silent expand) */
  importDiagnoseOnly?: boolean;
  /** IRD/ONEBEAT mustSplit — must Confirm, not silent import-green */
  irdConfirmRequired?: boolean;
  /** Literary XOR/CONTACT debt CTA after import soft-fill */
  litDebtPrimaryAction?: string;
  litDebtCta?: string;
  designExitIncomplete?: boolean;
  mergeStrategy: MergeStrategy;
  warnings: string[];
  tier?: import("../portable/types").ClosureTier;
  skipAutoDesignSb?: boolean;
  /** Morphological salvage alone must not imply contract-closed */
  importOkNotExitPass?: boolean;
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
  exportGate?: {
    exportAllowed: boolean;
    closureSnapshot: {
      tier: import("../portable/types").ClosureTier;
      blocked: boolean;
      blockIds: string[];
      warnIds: string[];
      checkedAt: string;
      rulePackVersion: string;
    };
    coverage: {
      matrixTotal: number;
      blocks: number;
      warns: number;
      softPatchEligible: number;
    };
    chatRepairText?: string;
    shapeSalvageLog?: ShapeSalvageEntry[];
    shapeSalvageSummary?: string;
  };
  endpoint?: "ext" | "int";
  postImport?: IntValidationSummary;
  shapeSalvageLog?: ShapeSalvageEntry[];
  /** Human-readable「已自动适配」summary when salvage ran */
  shapeSalvageSummary?: string;
  shapeResidualGaps?: ShapeResidualGap[];
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
