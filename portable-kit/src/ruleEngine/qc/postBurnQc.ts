/**
 * Post-burn QC → re-repair strategy table (M3) + still literary fidelity hits + SVQ umbrella.
 */
import type { BurnNextStep } from "../compilers/burnGateEnvelope";
import { buildPrimaryBlock, type PrimaryBlock } from "../compilers/primaryBlock";
import { canRegenRetry, consumeRegenRetry, createHealBudget, type HealBudgetState } from "../heal/healBudgetLedger";
import { scoreShortVideo, type SvqResult } from "./shortVideoQuality";

export type QcHit =
  | "QC-LIP-PIXEL"
  | "QC-ID-DRIFT"
  | "QC-FLF-SEAM"
  | "QC-SILENCE"
  | "QC-FLICKER"
  | "QC-WATERMARK"
  | "QC-STILL-LIT-ROLE"
  | "QC-STILL-LIT-PROP"
  | "QC-STILL-LIT-COMP"
  | "QC-STILL-LIT-FORBIDDEN"
  | "QC-STILL-LIT-ID"
  | "QC-SVQ";

export interface QcFinding {
  id: QcHit;
  severity: "WARN" | "BLOCK";
  message: string;
  shotId?: string | number;
}

export interface QcRepairAction {
  findingId: QcHit;
  nextStep: BurnNextStep;
  strengthen?: Record<string, string>;
  primary: PrimaryBlock;
  consumeRegen: boolean;
}

const STRATEGY: Record<QcHit, Omit<QcRepairAction, "primary" | "findingId">> = {
  "QC-LIP-PIXEL": {
    nextStep: "retry_shot",
    strengthen: { lipSyncPolicy: "natural_emphasized" },
    consumeRegen: true,
  },
  "QC-ID-DRIFT": {
    nextStep: "regen_storyboard_hq",
    strengthen: { crefWeight: "high" },
    consumeRegen: true,
  },
  "QC-FLF-SEAM": {
    nextStep: "retry_shot",
    strengthen: { modeHint: "reroll_flf" },
    consumeRegen: true,
  },
  "QC-SILENCE": {
    nextStep: "soft_patch",
    strengthen: { audioXor: "fix" },
    consumeRegen: false,
  },
  "QC-FLICKER": {
    nextStep: "retry_shot",
    consumeRegen: true,
  },
  "QC-WATERMARK": {
    nextStep: "chat_repair",
    strengthen: { vendorDegrade: "propose_swap" },
    consumeRegen: false,
  },
  "QC-STILL-LIT-ROLE": {
    nextStep: "regen_storyboard_hq",
    strengthen: { roleLock: "force_role_actions" },
    consumeRegen: true,
  },
  "QC-STILL-LIT-PROP": {
    nextStep: "regen_storyboard_hq",
    strengthen: { mustProps: "force_props" },
    consumeRegen: true,
  },
  "QC-STILL-LIT-COMP": {
    nextStep: "regen_storyboard_hq",
    strengthen: { composition: "权力反差高位低位清晰" },
    consumeRegen: true,
  },
  "QC-STILL-LIT-FORBIDDEN": {
    nextStep: "regen_storyboard_hq",
    strengthen: { negativeBan: "no_altar_standing_ritual" },
    consumeRegen: true,
  },
  "QC-STILL-LIT-ID": {
    nextStep: "regen_storyboard_hq",
    strengthen: { crefWeight: "high" },
    consumeRegen: true,
  },
  "QC-SVQ": {
    nextStep: "chat_repair",
    consumeRegen: false,
  },
};

/** Burn-time short_video_quality_scorecard (≠ design adaptScorecard). */
export function evaluateBurnScorecard(
  flags: {
    identityOk?: boolean;
    emotionOk?: boolean;
    lipOk?: boolean;
    camVarietyOk?: boolean;
    audioOk?: boolean;
    retentionOk?: boolean;
    packagingOk?: boolean;
    motionOk?: boolean;
    visBeatOk?: boolean;
    litDetailOk?: boolean;
    litContactXorOk?: boolean;
  },
  opts?: { unknownDims?: string[]; skippedDims?: string[] },
): { svq: SvqResult; finding?: QcFinding } {
  const svq = scoreShortVideo({
    flags,
    unknownDims: opts?.unknownDims,
    skippedDims: opts?.skippedDims,
  });
  if (svq.pass) return { svq };
  return {
    svq,
    finding: {
      id: "QC-SVQ",
      severity: "BLOCK",
      message: `成片记分未过：${[...svq.failDims.map((d) => d.id), ...svq.unknownDims].join(",")}`,
    },
  };
}

export function planPostBurnRepairs(
  findings: QcFinding[],
  budget: HealBudgetState = createHealBudget(),
): { actions: QcRepairAction[]; budget: HealBudgetState; exhausted: boolean } {
  const actions: QcRepairAction[] = [];
  let b = budget;
  let exhausted = false;
  for (const f of findings) {
    const base = STRATEGY[f.id];
    if (!base) continue;
    if (base.consumeRegen && !canRegenRetry(b)) {
      exhausted = true;
      actions.push({
        findingId: f.id,
        nextStep: "chat_repair",
        primary: buildPrimaryBlock("chat_repair", {
          stage: "qc",
          userMessageOverride: "自动重试次数已用尽，请人工处理",
        }),
        consumeRegen: false,
      });
      continue;
    }
    if (base.consumeRegen) b = consumeRegenRetry(b);
    const step = f.severity === "WARN" && f.id === "QC-LIP-PIXEL" ? ("retry_shot" as BurnNextStep) : base.nextStep;
    actions.push({
      findingId: f.id,
      nextStep: step,
      strengthen: base.strengthen,
      consumeRegen: base.consumeRegen,
      primary: buildPrimaryBlock(step, { stage: "qc" }),
    });
  }
  return { actions, budget: b, exhausted };
}

/** Map fidelity item kinds → QcHit for strategy table. */
export function fidelityKindToQcHit(kind: string, forbidden?: boolean): QcHit {
  if (forbidden || kind === "forbidden") return "QC-STILL-LIT-FORBIDDEN";
  if (kind === "prop") return "QC-STILL-LIT-PROP";
  if (kind === "composition") return "QC-STILL-LIT-COMP";
  if (kind === "identity") return "QC-STILL-LIT-ID";
  return "QC-STILL-LIT-ROLE";
}
