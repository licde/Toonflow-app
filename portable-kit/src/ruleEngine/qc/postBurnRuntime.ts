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
  visualDescription?: string | null;
  shotSize?: string | null;
  litDetailOk?: boolean;
  litContactXorOk?: boolean;
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
  skippedDims?: string[];
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
    visualDescription: input.visualDescription,
    shotSize: input.shotSize,
    litDetailOk: input.litDetailOk,
    litContactXorOk: input.litContactXorOk,
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
  let svqPass = scored.svq.pass;

  const vdText = String(input.visualDescription ?? "");
  let contactVd = /纸未入口|仅颊触|非口含|划过面颊|颊触/.test(vdText);
  try {
    const { isContactEventVd } = require("../compilers/contactEventPolicy") as typeof import("../compilers/contactEventPolicy");
    contactVd = contactVd || isContactEventVd(vdText);
  } catch {
    /* optional */
  }
  const criticalSkipped = ["motion_fidelity", "lit_detail", "lit_contact_xor"].filter((id) =>
    collected.skippedDims.includes(id),
  );
  const contactUnmeasured = contactVd && criticalSkipped.length > 0;
  if (contactUnmeasured && svqPass) {
    svqPass = false;
    if (!collected.unknownDims.includes("motion_fidelity")) {
      collected.unknownDims.push(...criticalSkipped);
    }
    findings.push({
      id: "QC-SVQ",
      severity: "WARN",
      message: `接触镜未测维须人审：${criticalSkipped.join(",")}`,
    });
  }

  let videoPass = visualOk && audioOk && blockFindings.length === 0 && !planned.exhausted && svqPass;

  const routed = routeFailDims({
    failDims: scored.svq.failDims,
    blockIds: findings.map((f) => f.id),
    projectKey: input.projectKey ?? String(input.shotId ?? "default"),
  });

  const primary = planned.actions[0];
  const litFail = scored.svq.failDims.some(
    (d) => d.id === "lit_detail" || d.id === "lit_contact_xor",
  );
  const motionFail = scored.svq.failDims.some((d) => d.id === "motion_fidelity");
  // Contact event: prefer still_prop_missing / svq_motion over emotion misroute
  let contactPrimaryTrigger: string | null = null;
  if (contactVd) {
    if (contactUnmeasured || motionFail) {
      contactPrimaryTrigger = criticalSkipped.includes("lit_detail")
        ? "still_prop_missing"
        : "svq_motion_fail";
    }
  }
  // lit 维失败 → 回设计 chat_repair（≠ soft_patch 掩债）；与 failDimTriggers 同源
  // SVQ honesty: unmeasured must-dims → skip + human review (never stub-pass)
  const needsHumanReview =
    contactUnmeasured ||
    (!videoPass &&
      collected.unknownDims.length > 0 &&
      scored.svq.failDims.length === 0 &&
      !litFail);
  let primaryNextStep = videoPass
    ? "done"
    : litFail
      ? "chat_repair"
      : needsHumanReview
        ? "human_review"
        : primary?.nextStep ??
          (routed.deeplinks[0]?.reverseTarget ? "chat_repair" : "retry_shot");
  // Never prefer expr_speak_missing for contact literary skips
  if (
    contactVd &&
    needsHumanReview &&
    (routed.primaryTrigger === "expr_speak_missing" || !routed.primaryTrigger)
  ) {
    contactPrimaryTrigger = contactPrimaryTrigger ?? "still_prop_missing";
    primaryNextStep = "human_review";
  }
  const effectiveTrigger =
    contactPrimaryTrigger ??
    (contactVd && routed.primaryTrigger === "expr_speak_missing"
      ? "still_prop_missing"
      : routed.primaryTrigger);
  emitHealObs("post_burn_runtime", {
    videoPass,
    audioPass: audio.audioPass,
    findings: findings.map((f) => f.id),
    exhausted: planned.exhausted,
    scorecard: scored.svq,
    unknownDims: collected.unknownDims,
    skippedDims: collected.skippedDims,
    primaryTrigger: effectiveTrigger,
    litFail,
    needsHumanReview,
    contactVd,
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
    primaryNextStep,
    userMessage:
      litFail
        ? `成片文学维未过: ${scored.svq.failDims
            .filter((d) => d.id === "lit_detail" || d.id === "lit_contact_xor")
            .map((d) => d.id)
            .join(",")}；请批准增强/手改 VD（${effectiveTrigger ?? "lit_detail_contact"}）`
        : needsHumanReview
          ? contactVd
            ? `接触运动未测/静帧可能缺道具：须人审（${(collected.unknownDims.concat(collected.skippedDims)).slice(0, 6).join(",") || "motion_fidelity"}）；优先重出带道具静照或重编译分相 Motion（trigger=${effectiveTrigger ?? "still_prop_missing"}）`
            : `SVQ 未测维须人审（skip≠pass）：${collected.unknownDims.slice(0, 6).join(",")}；已跳过可选维：${(collected.skippedDims ?? []).slice(0, 4).join(",") || "—"}`
          : primary?.primary.userMessage ??
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
    skippedDims: collected.skippedDims,
    primaryTrigger: effectiveTrigger,
    svqHonesty: needsHumanReview
      ? { mode: "skip_human_review" as const, unknownDims: collected.unknownDims }
      : { mode: "measured" as const, unknownDims: collected.unknownDims },
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
