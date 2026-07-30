/**
 * Shot / episode readiness projection (M2 m2-partial-ready).
 * Exposes readyToBurn / blockers for FE「一键自修」enablement.
 */
import type { BurnNextStep } from "../compilers/burnGateEnvelope";
import { buildPrimaryBlock, type PrimaryBlock } from "../compilers/primaryBlock";
import { stillQualityAllowsBurn, type StillQuality } from "../compilers/stillQuality";

export type ShotReadyState =
  | "draft"
  | "healed"
  | "assets_ready"
  | "still_hq_ok"
  | "prompt_clean"
  | "burned"
  | "qc_pass"
  | "blocked";

export interface ShotReadiness {
  shotIndex?: number;
  storyboardId?: number;
  state: ShotReadyState;
  burnAllowed: boolean;
  /** Alias for FE — same as burnAllowed when prompt clean + assets */
  readyToBurn: boolean;
  primary?: PrimaryBlock;
  stillQuality?: StillQuality;
  blockers: string[];
  /** Suggested silent heal ids when soft_patch / raise_duration */
  suggestedHealIds?: string[];
  suggestedValue?: number | string;
}

export interface EpisodeReadiness {
  episodeKey?: string;
  shots: ShotReadiness[];
  allBurnReady: boolean;
  partialBurnReady: boolean;
  blockedCount: number;
}

export function projectShotReadiness(input: {
  shotIndex?: number;
  storyboardId?: number;
  hasAssets: boolean;
  stillQuality?: StillQuality | null;
  promptClean: boolean;
  burned?: boolean;
  qcPass?: boolean;
  nextStep?: BurnNextStep;
  blockerIds?: string[];
  suggestedHealIds?: string[];
  suggestedValue?: number | string;
}): ShotReadiness {
  const blockers = [...(input.blockerIds ?? [])];
  let state: ShotReadyState = "draft";
  if (!input.hasAssets) {
    blockers.push("IMG-CREF");
    state = "blocked";
  } else if (!stillQualityAllowsBurn(input.stillQuality)) {
    blockers.push("IMG-STILL-QA");
    state = "blocked";
  } else if (!input.promptClean) {
    blockers.push("PROMPT");
    state = "assets_ready";
  } else if (input.qcPass) state = "qc_pass";
  else if (input.burned) state = "burned";
  else state = "still_hq_ok";

  const burnAllowed = blockers.length === 0 && input.promptClean;
  const step: BurnNextStep =
    input.nextStep ??
    (!input.hasAssets
      ? "batch_still"
      : !stillQualityAllowsBurn(input.stillQuality)
        ? "regen_storyboard_hq"
        : burnAllowed
          ? "burn"
          : "chat_repair");

  const primary = buildPrimaryBlock(step, {
    stage: "burn",
    suggestedValue: input.suggestedValue,
  });

  return {
    shotIndex: input.shotIndex,
    storyboardId: input.storyboardId,
    state: burnAllowed ? (input.burned ? "burned" : "prompt_clean") : state,
    burnAllowed,
    readyToBurn: burnAllowed,
    stillQuality: input.stillQuality ?? undefined,
    blockers,
    primary,
    suggestedHealIds: input.suggestedHealIds,
    suggestedValue: input.suggestedValue ?? primary.suggestedValue,
  };
}

export function projectEpisodeReadiness(shots: ShotReadiness[], episodeKey?: string): EpisodeReadiness {
  const blockedCount = shots.filter((s) => !s.burnAllowed).length;
  return {
    episodeKey,
    shots,
    allBurnReady: shots.length > 0 && blockedCount === 0,
    partialBurnReady: blockedCount > 0 && blockedCount < shots.length,
    blockedCount,
  };
}
