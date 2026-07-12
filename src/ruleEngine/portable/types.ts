import type { ProductionClosureCheck } from "../bundle/types";
import type { ChatPromptGap } from "../bundle/chatPromptAudit";

export type ClosureTier = "T1" | "T2" | "T3";

export interface InspectBundleOptions {
  tier?: ClosureTier;
  genError?: string;
  sfRound?: number;
  /** Skip Zod parse when caller already validated */
  alreadyParsed?: boolean;
}

export interface HostHooks {
  saveShots?: (shots: unknown[]) => Promise<void>;
  onGenerationError?: (error: string) => Promise<{ rePushPlan?: unknown[] }>;
}

export interface PortableOptions extends InspectBundleOptions {
  hooks?: HostHooks;
}

export interface InspectBundleResult {
  tier: ClosureTier;
  blocked: boolean;
  rulePackVersion: string;
  closureChecks: {
    dc: ProductionClosureCheck[];
    pc: ProductionClosureCheck[];
    gc: ProductionClosureCheck[];
    ic: ProductionClosureCheck[];
    blocked: boolean;
  };
  forwardTrace?: Record<string, unknown>;
  reverseHints?: { dimension: string; chainId: string; symptom: string; reverseTarget: string; preserveFields?: string[]; ruleId?: string }[];
  repairHints?: { id: string; chatTemplate?: string; ruleId?: string }[];
  rePushPlan?: unknown[];
  warnings: string[];
  /** Chat 产出缺口（对照 PROMPT_STANDARD） */
  chatPromptGaps?: ChatPromptGap[];
}

export interface UnifiedClosureResponse extends InspectBundleResult {
  endpoint: "ext" | "int";
  intValidation?: {
    passed: boolean;
    tier0Coverage: { executed: number; registered: number; triggered: number };
    issues: unknown[];
  };
  preImport?: InspectBundleResult;
  willCreateScript?: boolean;
  willOverwriteLayers?: string[];
}
