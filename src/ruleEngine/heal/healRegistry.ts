/**
 * HealRegistry SSOT — reason/checkId → silent healer.
 * Routes must call applySilentSoftPatches; do not hardcode heal if/else in APIs.
 */
import type { QualityDecisionResult } from "../compilers/qualityDecision";
import type { PreDesignShot } from "../bundle/types";
import type { HealBudgetState } from "./healBudgetLedger";
import type { Knex } from "knex";

export interface HealLogEntry {
  at: string;
  healerId: string;
  action: "applied" | "skipped" | "failed";
  detail: string;
}

export interface HealPatch {
  healerId: string;
  reason: string;
  detail: string;
}

export interface SilentHealContext {
  db?: Knex;
  projectId?: number;
  scriptId?: number;
  storyboardId?: number | null;
  vendorId?: string | null;
  episodeCapRemaining?: number;
  /** Mutable shot — healers may update duration / narrative in place */
  shot?: PreDesignShot | Record<string, unknown> | null;
  prompt?: string | null;
  decision: QualityDecisionResult;
  budget: HealBudgetState;
  /** Optional gate block ids from qualityGate */
  gateBlockIds?: string[];
}

export interface SilentHealApplyResult {
  applied: boolean;
  skipped?: boolean;
  skipReason?: string;
  patches: HealPatch[];
  prompt?: string;
  duration?: number;
  shot?: PreDesignShot | Record<string, unknown> | null;
  detail: string;
}

export interface SilentHealer {
  id: string;
  /** Match against decision.reasons, nextStep, block ids, gate ids */
  match: (ctx: SilentHealContext) => boolean;
  confidence: number;
  apply: (ctx: SilentHealContext) => Promise<SilentHealApplyResult> | SilentHealApplyResult;
}

const registry: SilentHealer[] = [];
let coreRegistered = false;

export function registerHealer(healer: SilentHealer): void {
  const idx = registry.findIndex((h) => h.id === healer.id);
  if (idx >= 0) registry[idx] = healer;
  else registry.push(healer);
}

export function listHealers(): SilentHealer[] {
  return [...registry];
}

export function clearHealersForTest(): void {
  registry.length = 0;
  coreRegistered = false;
}

export function ensureCoreHealersRegistered(registerFn: () => void): void {
  if (coreRegistered) return;
  registerFn();
  coreRegistered = true;
}

export function matchTokensFromDecision(decision: QualityDecisionResult, gateBlockIds?: string[]): string[] {
  const tokens = new Set<string>();
  for (const r of decision.reasons ?? []) tokens.add(String(r));
  if (decision.nextStep) tokens.add(String(decision.nextStep));
  for (const b of decision.envelope?.triggers ?? []) tokens.add(String(b));
  for (const id of gateBlockIds ?? []) tokens.add(String(id));
  // Block ids often embedded in reasons like LIP-01
  for (const r of decision.reasons ?? []) {
    if (/^LIP-01|PR-CAM-01|DC-09|CAM-SPEAK|VP-CONFLICT|VP-PLACEHOLDER|VP-AUDIO/i.test(r)) {
      tokens.add(r.split(/[:\s]/)[0]!);
    }
  }
  return [...tokens];
}

export function hasAnyToken(tokens: string[], ...needles: string[]): boolean {
  const lower = tokens.map((t) => t.toLowerCase());
  return needles.some((n) => lower.includes(n.toLowerCase()) || tokens.includes(n));
}
