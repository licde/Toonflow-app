import type {
  CompileImageResult,
  CompileVideoResult,
  EffectStack,
  StructuredEpisode,
  StructuredScriptJson,
  StructuredShot,
} from "../structuredScript/types";

export type FieldLevel = "G0" | "G1" | "G2" | "G3" | "G4";

export interface CompileContext {
  json: StructuredScriptJson;
  episode?: StructuredEpisode;
  spec?: Record<string, unknown>;
  vendorId?: string;
}

export interface CompilePatch {
  promptAppend?: string;
  promptPrepend?: string;
  videoDescAppend?: string;
  referenceAssetCodes?: string[];
  duration?: number;
  mode?: string | string[];
  audio?: boolean;
  aspectRatio?: string;
  postTasks?: PostTask[];
  compileLog?: Record<string, unknown>;
}

export interface PostTask {
  type: "tts" | "sfx" | "subtitle" | "vfx_overlay" | "speed_adjust";
  shotNo: number;
  payload: Record<string, unknown>;
}

export interface ImageConfig extends CompileImageResult {
  postTasks: PostTask[];
}

export interface VideoConfig extends CompileVideoResult {
  postTasks: PostTask[];
  speedAdjust: number;
  modelHint?: string;
}

export interface ModelCapabilities {
  vendorId: string;
  imageModel: string;
  videoModel: string;
  minDuration: number;
  maxDuration: number;
  supportsAudio: boolean;
  supportsStartEnd: boolean;
}

export interface QualityGateResult {
  passed: boolean;
  score: number;
  issues: string[];
  retryHint?: string;
}

export interface AudioRouteResult {
  voice: EffectStack["voice"];
  audio: boolean;
  ttsText?: string;
  postTasks: PostTask[];
}

export interface FieldHandler {
  field: string;
  level: FieldLevel;
  priority?: number;
  compile(ctx: CompileContext, shot: StructuredShot, target: "image" | "video"): CompilePatch;
}

export type { CompileImageResult, CompileVideoResult, StructuredShot, StructuredScriptJson, StructuredEpisode };
