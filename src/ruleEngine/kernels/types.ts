/**
 * Five-kernel closed-loop types — IdentitySlot + MediaSlot SSOT.
 * Design/IR/LLM must declare identity; vendor touch strips tokens and resolves media.
 */

export type IdentityKind = "CHAR" | "SCENE" | "PROP";

export interface IdentitySlot {
  kind: IdentityKind;
  code: string;
  assetId?: number;
  role?: "primary" | "secondary" | "crowd";
}

export interface MediaSlot {
  role: "start" | "end" | "ref" | "video" | "audio" | "storyboard" | "asset";
  ordinal: number;
  identityCode?: string;
  assetId?: number;
  sources?: "storyboard" | "assets";
  url?: string;
  label?: string;
}

export type KernelModality = "image" | "video" | "audio" | "fx";

export interface PromptKernelResult {
  prompt: string;
  identitySlots: IdentitySlot[];
  mediaSlots: MediaSlot[];
  byMode?: Record<string, string>;
  injectedFields: string[];
  warnings: string[];
}

export interface CompileKernelInput {
  modality: KernelModality;
  mode: string;
  identitySlots?: IdentitySlot[];
  mediaSlots?: MediaSlot[];
  existingPrompt?: string;
  storyboardContext?: string;
  projectVideoRatio?: string | null;
  preferCompile?: boolean;
}

export type FaultLayer = "CD" | "BP" | "AS" | "W3" | "GB" | "B" | "SB" | "EN" | "MD" | "INFRA" | "P03";

export interface DepthPolicyRule {
  match: string | RegExp;
  reverseTarget: FaultLayer;
  forwardStages: string[];
  depth: number;
}

export interface TouchPreflightResult {
  ok: boolean;
  code?: string;
  message?: string;
  reverseTrigger?: string;
  aspectRatio?: string;
  vendorPrompt?: string;
  crefs?: string[];
  srefs?: string[];
}

export const MODE_DIALECT_ALIASES: Record<string, string> = {
  firstLastFrame: "startEndRequired",
  multiImage: "multiParameter",
  multi_ref: "multiParameter",
  wan_i2v: "singleImage",
  seedance: "multiParameter",
};

export function canonicalModeId(mode: string): string {
  const trimmed = mode.trim();
  if (MODE_DIALECT_ALIASES[trimmed]) return MODE_DIALECT_ALIASES[trimmed];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return "multiParameter";
  } catch {
    /* not json */
  }
  return trimmed;
}
