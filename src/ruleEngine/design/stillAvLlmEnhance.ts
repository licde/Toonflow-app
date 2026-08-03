/**
 * LLM audiovisual enhance — L2/L3 only after Seal L0.
 * Never reseals occupancy / subject / primary prop; failure → doctrine template fallback.
 * Non-blocking: enhance miss never blocks generate.
 */
import type { PrimaryIntentCarrierSet } from "../compilers/primaryIntentSeal";

export type StillAvEnhanceResult = {
  stillLines: string[];
  videoMotionHint?: string;
  usedLlm: boolean;
  dropped: string[];
  sources: string[];
};

/** Doctrine template fallback when LLM off/fails — never changes L0. */
export function doctrineAvEnhanceFallback(input: {
  seal?: PrimaryIntentCarrierSet | null;
  atmosphere?: string | null;
  hasSkirtFragment?: boolean;
  realizationOccupancy?: string | null;
  realizationDegraded?: boolean | null;
}): StillAvEnhanceResult {
  const lines: string[] = [];
  const sources = ["avEnhance.doctrineFallback"];
  if (input.hasSkirtFragment) {
    lines.push("背景仅次角裙摆/衣角等碎片虚化浅景深");
  }
  if (input.atmosphere) {
    lines.push(`气氛保留：${String(input.atmosphere).slice(0, 8)}`);
  } else if (input.seal?.primaryObjective === "action_primary") {
    lines.push("气氛保留：暖光烛火可辨");
  }
  let videoMotionHint: string | undefined;
  const real = String(input.realizationOccupancy ?? input.seal?.poseOccupancy ?? "");
  const degraded = input.realizationDegraded === true;
  if (degraded && real === "kneel_hold") {
    videoMotionHint = "Motion起态：跪持近地持纸，起态与静帧一致；禁止弯腰俯身开场";
    sources.push("avEnhance.realization_kneel");
  } else if (degraded && real === "stand_hold") {
    videoMotionHint = "Motion起态：站姿持纸，起态与静帧一致；禁止弯腰俯身开场";
    sources.push("avEnhance.realization_stand");
  } else if (input.seal?.poseOccupancy === "bend_pickup") {
    videoMotionHint = "Motion起态：弯腰捡拾已触地，纸在主手，禁止从胸前举卡起幅";
  } else if (input.seal?.primaryObjective === "contact_geom") {
    videoMotionHint = "Motion起态：贴合落点已到位，禁止「进入贴合」重演";
  }
  return { stillLines: lines, videoMotionHint, usedLlm: false, dropped: [], sources };
}

/**
 * Gate LLM (or template) enhance lines through primary seal.
 * Call only after Seal is sticky; never pass as reseal input.
 */
export function applyAvEnhanceUnderSeal(input: {
  seal: PrimaryIntentCarrierSet;
  candidateLines: string[];
  videoMotionHint?: string | null;
}): StillAvEnhanceResult {
  const sources = ["avEnhance.gated"];
  try {
    const { applyNormSupplement } =
      require("../compilers/primaryIntentSeal") as typeof import("../compilers/primaryIntentSeal");
    const gated = applyNormSupplement({
      seal: input.seal,
      lines: input.candidateLines,
      layer: "L3",
    });
    // Drop any line that tries to reclassify occupancy / contact as primary
    const stillLines = gated.ordered.filter(
      (l) =>
        !/占位：跪坐|占位：伏案|须与.{0,4}贴合\/划过|抬.?contact|改主体|换角色/.test(l),
    );
    let videoMotionHint = String(input.videoMotionHint ?? "").trim() || undefined;
    if (videoMotionHint && input.seal.poseOccupancy === "bend_pickup") {
      if (/举卡|跪坐|进入贴合/.test(videoMotionHint) && !/禁止/.test(videoMotionHint)) {
        videoMotionHint = "Motion起态：弯腰捡拾已触地，纸在主手";
        sources.push("avEnhance.videoHintClamped");
      }
    }
    return {
      stillLines,
      videoMotionHint,
      usedLlm: false,
      dropped: gated.dropped,
      sources,
    };
  } catch {
    return doctrineAvEnhanceFallback({ seal: input.seal });
  }
}

/**
 * Optional LLM path — currently template-first (project LLM hook point).
 * When literaryDetailLlmFill is wired, callers may pass LLM lines here.
 */
export function enhanceStillAvAfterSeal(input: {
  seal: PrimaryIntentCarrierSet;
  atmosphere?: string | null;
  hasSkirtFragment?: boolean;
  realizationOccupancy?: string | null;
  realizationDegraded?: boolean | null;
  /** Pre-fetched LLM lines (optional); otherwise doctrine fallback */
  llmLines?: string[] | null;
  llmVideoHint?: string | null;
  enableLlm?: boolean;
}): StillAvEnhanceResult {
  if (input.enableLlm && input.llmLines?.length) {
    const gated = applyAvEnhanceUnderSeal({
      seal: input.seal,
      candidateLines: input.llmLines,
      videoMotionHint: input.llmVideoHint,
    });
    return { ...gated, usedLlm: true, sources: [...gated.sources, "avEnhance.llm"] };
  }
  const fb = doctrineAvEnhanceFallback({
    seal: input.seal,
    atmosphere: input.atmosphere,
    hasSkirtFragment: input.hasSkirtFragment,
    realizationOccupancy: input.realizationOccupancy,
    realizationDegraded: input.realizationDegraded,
  });
  return applyAvEnhanceUnderSeal({
    seal: input.seal,
    candidateLines: fb.stillLines,
    videoMotionHint: fb.videoMotionHint,
  });
}
