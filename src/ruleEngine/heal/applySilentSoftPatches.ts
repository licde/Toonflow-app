/**
 * Runtime: soft_patch / canSilent* → apply registered healers → caller re-decides.
 * Contract: if silent-healable, heal before blocking burn / returning soft_patch toast.
 */
import { createHealBudget, canSilentHeal, consumeSilentHeal, type HealBudgetState } from "./healBudgetLedger";
import {
  listHealers,
  type HealLogEntry,
  type HealPatch,
  type SilentHealContext,
} from "./healRegistry";
import { registerCoreHealers } from "./registerCoreHealers";
import type { QualityDecisionResult } from "../compilers/qualityDecision";
import type { PreDesignShot } from "../bundle/types";
import type { Knex } from "knex";
import { buildVideoHealEnvelope } from "./videoHealEnvelope";
import { resolveRequiredDuration } from "../compilers/resolveRequiredDuration";

export interface ApplySilentSoftPatchesInput {
  db?: Knex;
  projectId?: number;
  scriptId?: number;
  storyboardId?: number | null;
  vendorId?: string | null;
  episodeCapRemaining?: number;
  shot?: PreDesignShot | Record<string, unknown> | null;
  prompt?: string | null;
  decision: QualityDecisionResult;
  budget?: HealBudgetState;
  gateBlockIds?: string[];
}

export interface ApplySilentSoftPatchesResult {
  healed: boolean;
  patches: HealPatch[];
  prompt?: string;
  duration?: number;
  shot?: PreDesignShot | Record<string, unknown> | null;
  autoHealed: string[];
  healLog: HealLogEntry[];
  budget: HealBudgetState;
  /** When still blocked after heal — structured CTA for FE */
  stillBlocked?: {
    nextStep: QualityDecisionResult["nextStep"];
    userMessage: string;
    ctaLabel: string;
    suggestedValue?: number | string;
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Apply all matching silent healers in registry order (raise → cam → static → finalize).
 * Idempotent: healers return skipped:already_ok when nothing to do.
 */
export async function applySilentSoftPatches(input: ApplySilentSoftPatchesInput): Promise<ApplySilentSoftPatchesResult> {
  registerCoreHealers();

  let budget = input.budget ?? createHealBudget();
  const healLog: HealLogEntry[] = [];
  const patches: HealPatch[] = [];
  const autoHealed: string[] = [];

  let prompt = input.prompt ?? undefined;
  let shot = input.shot ?? null;
  let duration: number | undefined;
  let healed = false;

  // Only run when decision is soft_patch / raise, or canSilentRaise on shot
  const qd = input.decision;
  const canRaise = shot
    ? resolveRequiredDuration(shot, {
        vendorId: input.vendorId,
        episodeCapRemaining: input.episodeCapRemaining,
      }).canSilentRaise
    : false;
  const shouldAttempt =
    qd.decision === "soft_patch" ||
    qd.nextStep === "raise_duration" ||
    qd.nextStep === "soft_patch" ||
    canRaise ||
    (input.gateBlockIds?.length ?? 0) > 0;

  if (!shouldAttempt || qd.burnAllowed) {
    return {
      healed: false,
      patches: [],
      prompt,
      duration: shot ? Number((shot as PreDesignShot).duration) || undefined : undefined,
      shot,
      autoHealed: [],
      healLog,
      budget,
    };
  }

  // Human-only paths — do not silent-heal
  if (qd.decision === "split_shot" || qd.decision === "rePush_design") {
    const req = shot
      ? resolveRequiredDuration(shot, { vendorId: input.vendorId, episodeCapRemaining: input.episodeCapRemaining })
      : null;
    const env = buildVideoHealEnvelope({
      nextStep: qd.nextStep,
      suggestedValue: qd.nextStep === "raise_duration" ? req?.required : qd.envelope.suggestedValue,
      userMessageOverride: qd.envelope.userMessage,
    });
    return {
      healed: false,
      patches: [],
      prompt,
      shot,
      autoHealed: [],
      healLog,
      budget,
      stillBlocked: {
        nextStep: qd.nextStep,
        userMessage: env.userMessage,
        ctaLabel: env.ctaLabel,
        suggestedValue: env.suggestedValue,
      },
    };
  }

  const ctxBase: SilentHealContext = {
    db: input.db,
    projectId: input.projectId,
    scriptId: input.scriptId,
    storyboardId: input.storyboardId,
    vendorId: input.vendorId,
    episodeCapRemaining: input.episodeCapRemaining,
    shot,
    prompt,
    decision: qd,
    budget,
    gateBlockIds: input.gateBlockIds,
  };

  for (const healer of listHealers()) {
    if (!canSilentHeal(budget)) {
      healLog.push({
        at: nowIso(),
        healerId: healer.id,
        action: "skipped",
        detail: "budget_exhausted",
      });
      break;
    }
    if (!healer.match({ ...ctxBase, shot, prompt, budget })) continue;

    try {
      const result = await healer.apply({ ...ctxBase, shot, prompt, budget });
      if (result.skipped) {
        healLog.push({
          at: nowIso(),
          healerId: healer.id,
          action: "skipped",
          detail: result.skipReason ?? result.detail,
        });
        if (result.prompt) prompt = result.prompt;
        if (result.shot) shot = result.shot;
        if (result.duration != null) duration = result.duration;
        continue;
      }
      if (result.applied) {
        healed = true;
        budget = consumeSilentHeal(budget);
        patches.push(...result.patches);
        autoHealed.push(healer.id);
        if (result.prompt) prompt = result.prompt;
        if (result.shot) shot = result.shot;
        if (result.duration != null) duration = result.duration;
        healLog.push({
          at: nowIso(),
          healerId: healer.id,
          action: "applied",
          detail: result.detail,
        });
        ctxBase.shot = shot;
        ctxBase.prompt = prompt;
        ctxBase.budget = budget;
      }
    } catch (e) {
      healLog.push({
        at: nowIso(),
        healerId: healer.id,
        action: "failed",
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return {
    healed,
    patches,
    prompt,
    duration,
    shot,
    autoHealed,
    healLog,
    budget,
  };
}

/**
 * Helper: decide → heal → decide again. Used by generateVideoPrompt / generateVideo / batch.
 */
export async function decideThenSilentHeal(opts: {
  decide: () => QualityDecisionResult;
  healInput: Omit<ApplySilentSoftPatchesInput, "decision">;
  maxRounds?: number;
}): Promise<{
  decision: QualityDecisionResult;
  heal: ApplySilentSoftPatchesResult;
  prompt?: string;
  shot?: PreDesignShot | Record<string, unknown> | null;
}> {
  let decision = opts.decide();
  let prompt = opts.healInput.prompt ?? undefined;
  let shot = opts.healInput.shot ?? null;
  let heal: ApplySilentSoftPatchesResult = {
    healed: false,
    patches: [],
    autoHealed: [],
    healLog: [],
    budget: opts.healInput.budget ?? createHealBudget(),
    prompt,
    shot,
  };

  const rounds = opts.maxRounds ?? 2;
  for (let i = 0; i < rounds; i++) {
    if (decision.burnAllowed) break;
    if (decision.decision === "split_shot" || decision.decision === "rePush_design") break;

    heal = await applySilentSoftPatches({
      ...opts.healInput,
      decision,
      prompt,
      shot,
      budget: heal.budget,
    });
    if (heal.prompt) prompt = heal.prompt;
    if (heal.shot) shot = heal.shot;
    if (!heal.healed) break;

    // Re-decide with healed state
    decision = opts.decide();
    // decide closure should close over mutated shot/prompt — caller must rebuild via factory
  }

  return { decision, heal, prompt, shot };
}
