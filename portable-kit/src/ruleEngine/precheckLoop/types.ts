/**
 * PrecheckLoop portable contracts — schemaVersioned, serializable, host-agnostic.
 * PACKAGE_ID: precheck-loop
 */

import type { ScriptBundle } from "../bundle/types";

export const PRECHECK_LOOP_SCHEMA_VERSION = 1 as const;

export type FindingSeverity = "BLOCK" | "WARN" | "INFO";

export type DecisionMode = "ok" | "soft_patch" | "rePush" | "human" | "suggest";

export type ShotScope = "full" | "filtered";

export interface PrecheckScope {
  /** When set, only these storyboard ids are in scope (filtered touch). */
  storyboardIds?: number[];
  mode?: ShotScope;
}

export interface PrecheckContext {
  bundle: ScriptBundle;
  scope?: PrecheckScope;
  /** Selected check ids; default = all registered adapters. */
  checks?: string[];
  round?: number;
}

export interface DiagnosisFinding {
  schemaVersion: typeof PRECHECK_LOOP_SCHEMA_VERSION;
  id: string;
  passed: boolean;
  severity: FindingSeverity;
  message: string;
  evidence: Record<string, unknown>;
  chainId?: string;
  trigger?: string;
  repairHintId?: string;
  fieldPaths?: string[];
  shotIndex?: number;
  /** Stable digest for stop/exhaust + obs clustering. */
  fingerprint: string;
}

export interface SuggestedPatch {
  checkId: string;
  /** JSON-pointer-ish path under bundle, e.g. preDesignPack.shots.0.narrative.dialogue.lines */
  path: string;
  /** Patch payload (adapter-defined). */
  patch: Record<string, unknown>;
  confidence: number;
  reason: string;
}

export interface RepairHintPayload {
  id: string;
  chatTemplate: string;
  ruleId?: string;
}

export interface LoopDecision {
  mode: DecisionMode;
  reason: string;
  minConfidence?: number;
}

export interface LoopResult {
  schemaVersion: typeof PRECHECK_LOOP_SCHEMA_VERSION;
  ok: boolean;
  exhausted: boolean;
  round: number;
  findings: DiagnosisFinding[];
  decision: LoopDecision;
  patches?: SuggestedPatch[];
  applied?: string[];
  repairHint?: RepairHintPayload;
  /** Post-verify findings (same as findings after last diagnose when apply ran). */
  verified?: boolean;
}

export interface CheckAdapter {
  id: string;
  diagnose(ctx: PrecheckContext): DiagnosisFinding;
  suggestRepair?(finding: DiagnosisFinding, ctx: PrecheckContext): SuggestedPatch[];
}

export interface RunPrecheckLoopInput {
  bundle: ScriptBundle;
  scope?: PrecheckScope;
  checks?: string[];
  /** When true, apply soft_patch via Port and re-diagnose. */
  apply?: boolean;
  /** Max repair rounds (default from policy or 2). */
  maxRounds?: number;
  round?: number;
  /** Previous fingerprint that failed verify — used for exhaust. */
  prevFingerprint?: string;
}
