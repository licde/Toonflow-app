/** 结构化剧本 JSON v1.0 类型定义 */

export type EffectStackVoice = "auto" | "video_native" | "tts" | "off";
export type EffectStackMotion = "auto" | "basic" | "enhanced" | "static";
export type EffectStackSfx = "auto" | "prompt_only" | "post_layer" | "off";

export interface EffectStack {
  voice: EffectStackVoice;
  motion: EffectStackMotion;
  sfx: EffectStackSfx;
}

export interface StructuredDialogue {
  type?: string;
  text?: string;
  speaker?: string | null;
  emotion?: string;
  字数?: number;
  语速?: string;
  朗读时长?: string;
  推荐分镜时长?: string;
}

export interface StructuredShot {
  镜号: number;
  time?: string;
  shotType?: string;
  sceneName?: string;
  type?: string;
  cameraAngle?: string;
  visualFocus?: { 层级?: string; 说明?: string; 拍摄要求?: string };
  visualId?: string;
  characterFacing?: string;
  positionInScene?: string;
  transitionType?: string;
  transitionDuration?: string;
  emotionIntensity?: number;
  colorTone?: string;
  performance?: Record<string, unknown>;
  personalitySwitch?: {
    enabled?: boolean;
    from?: string;
    to?: string;
    progress?: string;
    visualMark?: string;
  } | null;
  "L6-trigger"?: string;
  sound?: Record<string, string>;
  dialogue?: StructuredDialogue | null;
  voiceover?: Record<string, string> | null;
  visualEffect?: Record<string, unknown> | null;
  assetCodes?: string[];
  imagePrompt?: string;
  videoPrompt?: string;
  effectStack?: Partial<EffectStack>;
}

export interface StructuredEpisode {
  name: string;
  script?: string;
  storyboard?: StructuredShot[];
  productLayer?: Record<string, unknown>;
  emotionBeats?: string;
  directorNotes?: string[];
  keyPrompts?: { scene?: string; imagePrompt?: string; videoPrompt?: string }[];
  visualLock?: Record<string, string>;
}

export interface StructuredScriptJson {
  version?: string;
  meta?: {
    title?: string;
    episodeCount?: number;
    tone?: string;
    artStyleHint?: string;
    叙事内核?: string;
    改编基调?: string;
  };
  productionSpec?: Record<string, unknown>;
  narrative?: Record<string, unknown>;
  characterAssets?: Record<string, Record<string, unknown>>;
  episodes?: StructuredEpisode[];
  continuityTracking?: Record<string, unknown>;
}

export interface CompileImageResult {
  prompt: string;
  videoDesc: string;
  duration: number;
  aspectRatio: string;
  referenceAssetCodes: string[];
  effectStack: EffectStack;
  compileLog: Record<string, unknown>;
}

export interface CompileVideoResult {
  prompt: string;
  duration: number;
  mode: string | string[];
  audio: boolean;
  effectStack: EffectStack;
  compileLog: Record<string, unknown>;
}

export interface ImportPreviewResult {
  episodeName: string;
  shotCount: number;
  characterCount: number;
  sceneCount: number;
  propCount: number;
  fieldCoverage: { G0: number; G1: number; G4: number };
  warnings: string[];
  shots: {
    镜号: number;
    visualId?: string;
    duration: number;
    dirty?: boolean;
    imagePromptPreview?: string;
  }[];
}

export interface SyncDiffResult {
  changedShots: number[];
  newShots: number[];
  archivedShots: number[];
  dirtyShots: number[];
  suggestions: { storyboardId?: number; 镜号: number; targets: ("image" | "video")[] }[];
}
