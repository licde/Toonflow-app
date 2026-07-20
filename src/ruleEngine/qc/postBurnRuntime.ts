/**
 * Post-burn runtime wire — detect findings, plan repairs, seed still/audio loops, write videoPass.
 */
import {
  planPostBurnRepairs,
  type QcFinding,
  type QcRepairAction,
} from "./postBurnQc";
import { runAudioLiteraryL1, type AudioL1Input } from "./audioLiteraryL1";
import {
  canRegenRetry,
  createHealBudget,
  type HealBudgetState,
} from "../heal/healBudgetLedger";
import { emitHealObs } from "../heal/obsHealBridge";
import { applyAudioStrengthenToPrompt } from "../compilers/audioLiteraryFidelityChecklist";

export interface PostBurnRuntimeInput {
  shotId?: string | number;
  hasDialogue: boolean;
  visualPass?: boolean;
  audioL1?: Omit<AudioL1Input, "hasDialogue" | "shotId">;
  /** Extra findings (FLF seam, id drift) from callers */
  extraFindings?: QcFinding[];
  healBudget?: HealBudgetState;
  videoPrompt?: string;
}

export interface PostBurnRuntimeResult {
  videoPass: boolean;
  videoPassAt?: string;
  audioPass: boolean;
  audioPassAt?: string;
  findings: QcFinding[];
  actions: QcRepairAction[];
  healBudget: HealBudgetState;
  /** Seed strengthen for still regen / audio soft_patch */
  seedStrengthen: Record<string, string>;
  /** Primary next step for FE CTA */
  primaryNextStep?: string;
  userMessage?: string;
  patchedVideoPrompt?: string;
}

export function runPostBurnRuntime(input: PostBurnRuntimeInput): PostBurnRuntimeResult {
  let budget = input.healBudget ?? createHealBudget();
  const audio = runAudioLiteraryL1({
    hasDialogue: input.hasDialogue,
    shotId: input.shotId,
    ...(input.audioL1 ?? {}),
  });
  const findings: QcFinding[] = [...audio.findings, ...(input.extraFindings ?? [])];

  const planned = planPostBurnRepairs(findings, budget);
  budget = planned.budget;

  const seedStrengthen: Record<string, string> = {};
  for (const a of planned.actions) {
    if (a.strengthen) Object.assign(seedStrengthen, a.strengthen);
  }

  let patchedVideoPrompt = input.videoPrompt;
  if (patchedVideoPrompt && Object.keys(seedStrengthen).length) {
    patchedVideoPrompt = applyAudioStrengthenToPrompt(patchedVideoPrompt, seedStrengthen);
  }

  const visualOk = input.visualPass !== false;
  const audioOk = !input.hasDialogue || audio.audioPass;
  const blockFindings = findings.filter((f) => f.severity === "BLOCK");
  const videoPass = visualOk && audioOk && blockFindings.length === 0 && !planned.exhausted;

  const primary = planned.actions[0];
  emitHealObs("post_burn_runtime", {
    videoPass,
    audioPass: audio.audioPass,
    findings: findings.map((f) => f.id),
    exhausted: planned.exhausted,
  });

  return {
    videoPass,
    videoPassAt: videoPass ? new Date().toISOString() : undefined,
    audioPass: audio.audioPass,
    audioPassAt: audio.audioPassAt,
    findings,
    actions: planned.actions,
    healBudget: budget,
    seedStrengthen,
    primaryNextStep: primary?.nextStep ?? (videoPass ? "done" : "retry_shot"),
    userMessage: primary?.primary.userMessage,
    patchedVideoPrompt,
  };
}

/** Merge still+video+audio budgets into one ledger for cross-layer heals. */
export function unifyHealBudget(parts: Array<HealBudgetState | null | undefined>): HealBudgetState {
  const base = createHealBudget();
  let silent = 0;
  let regen = 0;
  let maxSilent = base.maxSilentHeals;
  let maxRegen = base.maxRegenRetries;
  for (const p of parts) {
    if (!p) continue;
    silent += p.silentHealsUsed;
    regen += p.regenRetriesUsed;
    maxSilent = Math.max(maxSilent, p.maxSilentHeals);
    maxRegen = Math.max(maxRegen, p.maxRegenRetries);
  }
  return {
    silentHealsUsed: silent,
    regenRetriesUsed: regen,
    maxSilentHeals: maxSilent,
    maxRegenRetries: maxRegen,
  };
}

export function canCrossLayerRegen(b: HealBudgetState): boolean {
  return canRegenRetry(b);
}
