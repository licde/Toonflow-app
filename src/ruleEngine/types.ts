export type ShotType = "CHAR-SCENE" | "PURE-SCENE" | "PURE-PROP" | "CHAR-PROP";
export type RollbackLayer = "G" | "GB" | "SB" | "EN" | "MD";
export type IssueSeverity = "BLOCK" | "WARN" | "INFO";
export type PipelineStage = "N-1" | "P0" | "G" | "BP" | "GB" | "SB" | "EN" | "MD" | "P2";

export interface ValidationIssue {
  ruleId: string;
  tier: 0 | 1 | 2 | 3;
  severity: IssueSeverity;
  shotId?: string;
  fieldPath: string;
  message: string;
  rollbackLayer: RollbackLayer;
  autoFix?: { patch: Record<string, unknown>; confidence: number };
}

export interface ValidationReport {
  scriptId: number;
  projectId: number;
  passed: boolean;
  blockCount: number;
  warnCount: number;
  issues: ValidationIssue[];
  stageStatus: Record<PipelineStage, "pass" | "warn" | "block" | "skip">;
  ruleCoverage: { total: number; hit: number; tier0Hit: number; executed?: number; registered?: number; skipped?: number };
  rulePackVersion: string;
}

export interface CompiledPrompts {
  image: string;
  video: string;
  audio: string;
  fx?: string;
  hash: string;
}

export interface EpisodeShot {
  id: string;
  storyboardId?: number;
  index: number;
  /** Screenplay / blocking description (from preDesign visualDescription) */
  visualDescription?: string;
  narrative: {
    type?: ShotType;
    sceneName?: string;
    sceneCode?: string;
    assetCodes?: string[];
    lines?: string;
    dialogue?: {
      type?: string;
      lines?:
        | string
        | {
            speaker?: string;
            text?: string;
            lineId?: string;
            functions?: string[];
            causedByActionId?: string;
            /** Suggested split (reaction_shot / insert / …); machine suggests, Chat/SB applies */
            splitHint?: string;
            reactionAction?: string;
          }[];
    };
    performance?: Record<string, unknown>;
    transitionType?: string;
    duration?: number;
    emotionIntensity?: number;
    colorTone?: string;
    shotSize?: string;
    spatialRelation?: string;
    visualFocus?: string;
    sound?: { env?: string; sfx?: string; bgm?: string; dialogue?: boolean };
    debutBeat?: string;
    endHook?: string;
    /** Composition / camera design preserved from preDesign shotDesign */
    composition?: { foreground?: string; background?: string };
    cameraAnchor?: { shotSize?: string; bgBlur?: boolean };
    lipSyncPolicy?: string;
    exprCue?: string;
    continuityFrom?: string;
  };
  generation: {
    imagePrompt?: string;
    videoPrompt?: string;
    audioPrompt?: string;
    fxPrompt?: string;
    videoDesc?: string;
    manualOverride?: { image?: boolean; video?: boolean };
    compiled?: CompiledPrompts;
  };
}

export interface ScriptMeta {
  density?: { action?: number; dialogue?: number; emotion?: number };
  goldenFormula?: string;
  characters?: string[];
  hook?: string;
  hash?: string;
}

export interface EpisodeBeat {
  emotionCurve?: number[];
  markers?: { recapSlots?: number[]; previewSlots?: number[] };
  scenes?: { name: string; transition?: string }[];
}

export interface EpisodePackage {
  version: number;
  scriptId: number;
  projectId: number;
  scriptMeta?: ScriptMeta;
  episodeBeat?: EpisodeBeat;
  shots: EpisodeShot[];
  scriptHash?: string;
  storyboardHash?: string;
  rulePackVersion: string;
  updatedAt: number;
}

export interface ResolvedConfig {
  imageModel: string;
  videoModel: string;
  videoRatio: string;
  artStyle: string;
  imageVendor: string;
  videoVendor: string;
  speechSpeed: number;
  platformProfile: { vertical: boolean };
  ruleEngineEnabled: boolean;
  ttsDubbing: boolean;
}

export interface DryRunResult {
  shots: EpisodeShot[];
  report: ValidationReport;
  estimatedCost?: number;
}

export interface PreflightResult {
  allowed: boolean;
  report: ValidationReport;
}

export interface ExpandedShotTask {
  storyboardId: number;
  trackId?: number;
  shot: EpisodeShot;
  compiled: CompiledPrompts;
}

export interface GenerationFeedbackPatch {
  fieldPath: string;
  rollbackLayer: RollbackLayer;
  suggestion: string;
  ruleId?: string;
}
