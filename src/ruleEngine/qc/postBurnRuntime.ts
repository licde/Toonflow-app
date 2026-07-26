/**
 * Post-burn runtime wire — collect flags, SVQ scorecard, plan repairs, write videoPass.
 */
import {
  planPostBurnRepairs,
  evaluateBurnScorecard,
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
import { collectPostBurnFlags } from "../quality/collectPostBurnFlags";
import { routeFailDims } from "../quality/failDimRouter";
import type { SvqResult } from "./shortVideoQuality";

export interface PostBurnRuntimeInput {
  shotId?: string | number;
  hasDialogue: boolean;
  visualPass?: boolean;
  audioL1?: Omit<AudioL1Input, "hasDialogue" | "shotId">;
  extraFindings?: QcFinding[];
  healBudget?: HealBudgetState;
  videoPrompt?: string;
  identityOk?: boolean;
  emotionOk?: boolean;
  lipOk?: boolean;
  motionIntent?: string;
  vlmObservedScore?: number;
  vlmContinuityScore?: number;
  vlmAdapterPresent?: boolean;
  asrTranscript?: string | null;
  asrAdapterPresent?: boolean;
  durationSec?: number;
  projectKey?: string;
  audioCue?: string | null;
  sfxIntent?: string[];
  sfxAdapterPresent?: boolean;
}

export interface PostBurnRuntimeResult {
  videoPass: boolean;
  videoPassAt?: string;
  audioPass: boolean;
  audioPassAt?: string;
  findings: QcFinding[];
  actions: QcRepairAction[];
  healBudget: HealBudgetState;
  seedStrengthen: Record<string, string>;
  primaryNextStep?: string;
  userMessage?: string;
  patchedVideoPrompt?: string;
  scorecard?: SvqResult;
  failDims?: SvqResult["failDims"];
  deeplinks?: ReturnType<typeof routeFailDims>["deeplinks"];
  unknownDims?: string[];
}

export function runPostBurnRuntime(input: PostBurnRuntimeInput): PostBurnRuntimeResult {
  let budget = input.healBudget ?? createHealBudget();
  const audio = runAudioLiteraryL1({
    hasDialogue: input.hasDialogue,
    shotId: input.shotId,
    ...(input.audioL1 ?? {}),
  });
  const findings: QcFinding[] = [...audio.findings, ...(input.extraFindings ?? [])];

  const collected = collectPostBurnFlags({
    visualPass: input.visualPass,
    audioPass: audio.audioPass,
    hasDialogue: input.hasDialogue,
    identityOk: input.identityOk ?? input.visualPass,
    emotionOk: input.emotionOk,
    lipOk: input.lipOk,
    motionIntent: input.motionIntent,
    vlmObservedScore: input.vlmObservedScore,
    vlmContinuityScore: input.vlmContinuityScore,
    vlmAdapterPresent: input.vlmAdapterPresent,
    asrTranscript: input.asrTranscript ?? input.audioL1?.asrTranscript,
    asrAdapterPresent: input.asrAdapterPresent,
    durationSec: input.durationSec,
  });

  try {
    const { evaluateSfxDelivery, getSfxSynthPort } = require("../ports/sfxSynthPort") as typeof import("../ports/sfxSynthPort");
    const sfx = evaluateSfxDelivery({
      prompt: input.videoPrompt,
      audioCue: input.audioCue,
      sfxIntent: input.sfxIntent,
      adapterPresent: input.sfxAdapterPresent ?? Boolean(getSfxSynthPort()),
    });
    if (sfx.unknown || sfx.code === "SFX-UNBACKED") {
      if (!collected.unknownDims.includes("audio_mood")) collected.unknownDims.push("audio_mood");
      findings.push({
        id: "QC-SVQ",
        severity: "WARN",
        message: sfx.message || "sfx unbacked (SFX-UNBACKED)",
      });
    }
    const { mirrorWarpFinding } = require("./mirrorAntiWarp") as typeof import("./mirrorAntiWarp");
    const mir = mirrorWarpFinding({ videoPrompt: input.videoPrompt });
    if (mir) {
      findings.push({
        id: "QC-SVQ",
        severity: mir.severity === "BLOCK" ? "BLOCK" : "WARN",
        message: `${mir.id}: ${mir.message}`,
      });
    }
  } catch {
    /* optional ports */
  }

  const scored = evaluateBurnScorecard(collected.flags, {
    unknownDims: collected.unknownDims,
    skippedDims: collected.skippedDims,
  });
  if (scored.finding) {
    // must SVQ fail → BLOCK
    findings.push({ ...scored.finding, severity: "BLOCK" });
  }

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
  const svqPass = scored.svq.pass;
  const videoPass = visualOk && audioOk && blockFindings.length === 0 && !planned.exhausted && svqPass;

  const routed = routeFailDims({
    failDims: scored.svq.failDims,
    blockIds: findings.map((f) => f.id),
    projectKey: input.projectKey ?? String(input.shotId ?? "default"),
  });

  const primary = planned.actions[0];
  emitHealObs("post_burn_runtime", {
    videoPass,
    audioPass: audio.audioPass,
    findings: findings.map((f) => f.id),
    exhausted: planned.exhausted,
    scorecard: scored.svq,
    unknownDims: collected.unknownDims,
    primaryTrigger: routed.primaryTrigger,
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
    primaryNextStep: primary?.nextStep ?? (videoPass ? "done" : routed.deeplinks[0]?.reverseTarget ? "chat_repair" : "retry_shot"),
    userMessage:
      primary?.primary.userMessage ??
      (videoPass
        ? undefined
        : planned.exhausted
          ? "heal budget exhausted"
          : `成片未过闸: ${(scored.svq.failDims.map((d) => d.id).concat(collected.unknownDims)).slice(0, 6).join(",")}`),
    patchedVideoPrompt,
    scorecard: scored.svq,
    failDims: scored.svq.failDims,
    deeplinks: routed.deeplinks,
    unknownDims: collected.unknownDims,
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
