import type { Knex } from "knex";
import { isRuleEngineEnabled } from "../featureFlag";
import { runProductionPreflight, type PreflightProductionResult } from "./preflightProduction";
import type { DetectionModality } from "./types";

export interface PreflightGateInput {
  projectId: number;
  scriptId: number;
  storyboardIds?: number[];
  modality: DetectionModality;
  skipPreflight?: boolean;
}

export interface PreflightGateResult {
  skipped: boolean;
  allowed: boolean;
  preflight?: PreflightProductionResult;
  blockReason?: string;
  failedChecks: { id: string; message: string; shotIndex?: number }[];
  /** Human envelope when DC-01 (or similar) blocks */
  primaryNextStep?: string;
  userMessage?: string;
  ctaLabel?: string;
}

export async function runPreflightGate(db: Knex, input: PreflightGateInput): Promise<PreflightGateResult> {
  // Production path: skipPreflight is ignored (admin bypass not allowed silently)
  if (input.skipPreflight) {
    return {
      skipped: false,
      allowed: false,
      blockReason: "skipPreflight_disabled",
      failedChecks: [{ id: "GATE-SKIP-DENIED", message: "生产路径禁止 skipPreflight" }],
    };
  }
  const enabled = await isRuleEngineEnabled(db, input.projectId);
  if (!enabled) {
    return {
      skipped: true,
      allowed: true,
      failedChecks: [],
      blockReason: "ruleEngine_legacy_mode",
    };
  }

  const preflight = await runProductionPreflight(db, {
    projectId: input.projectId,
    scriptId: input.scriptId,
    storyboardIds: input.storyboardIds,
    modality: input.modality,
    tier: "T3",
  });

  const failedChecks = preflight.detectionResults
    .filter((r) => !r.passed && r.severity === "BLOCK")
    .map((r) => ({ id: r.id, message: r.message, shotIndex: r.shotIndex }));

  const allowed = !preflight.blockGenerate;
  const blockReason = allowed
    ? undefined
    : failedChecks.map((f) => `[${f.id}] ${f.message}`).join("; ") || "preflight BLOCK";

  const result: PreflightGateResult = { skipped: false, allowed, preflight, blockReason, failedChecks };

  const dc01 = preflight.detectionResults.find((r) => r.id === "DC-01" && !r.passed);
  if (dc01) {
    const { buildDc01HumanEnvelope } = await import("../heal/dc01Envelope");
    const env = buildDc01HumanEnvelope({
      message: dc01.message,
      evidence: (dc01 as { evidence?: Record<string, unknown> }).evidence,
    });
    result.primaryNextStep = env.primaryNextStep;
    result.userMessage = env.userMessage;
    result.ctaLabel = env.ctaLabel;
    if (!allowed) result.blockReason = env.userMessage;
  }

  return result;
}
