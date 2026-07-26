/**
 * Design-time adapt scorecard — run at W3/designBrief exit; block on low score.
 */
import { needsNar14Split } from "../nar14ClauseSplit";

export type AdaptScoreInput = {
  packId?: string;
  deepAdaptation?: {
    nameMap?: { from?: string; to?: string }[];
    relationMap?: unknown[];
    substitutions?: unknown[];
    storyKernel?: unknown;
    contentTranslatePlan?: unknown;
  };
  matrixChoices?: { dimId: string; choice: string }[];
  sceneAvTags?: unknown[];
  sceneMeta?: Record<string, unknown>[];
  dialoguePlanLines?: { text?: string; splitHint?: string; reactionAction?: string; functions?: string[] }[];
  narrativeSelfcheckPassed?: boolean;
  hasOpeningHook?: boolean;
  hasPeakLedger?: boolean;
  hasShotIntent?: boolean;
  contentTranslateExtensibleWithoutDerivation?: boolean;
  /** VisBeat L0: no unresolved must_split / tag_missing under enforce */
  visBeatOk?: boolean;
  /** CU × multi-cast resolved (no DEX-STILL-CU-CAST residual) */
  cuCastOk?: boolean;
};

export type AdaptScoreResult = {
  score: number;
  pass: boolean;
  failDims: string[];
  details: Record<string, number>;
};

function mapCoverage(maps?: { from?: string; to?: string }[]): number {
  if (!maps?.length) return 0.4;
  const ok = maps.every((m) => String(m.from ?? "").trim() && String(m.to ?? "").trim());
  return ok ? 0.95 : 0.3;
}

export function scoreAdaptationDesign(input: AdaptScoreInput, passThreshold = 65): AdaptScoreResult {
  const details: Record<string, number> = {};
  const failDims: string[] = [];

  const nameChoice = input.matrixChoices?.find((c) => /D01|nameMap|姓名/i.test(c.dimId))?.choice;
  if (nameChoice && nameChoice !== "keep") {
    details.nameMap = mapCoverage(input.deepAdaptation?.nameMap);
    if (details.nameMap < 0.6) failDims.push("nameMap");
  } else {
    details.nameMap = 0.85;
  }

  details.avTags =
    Array.isArray(input.sceneAvTags) && input.sceneAvTags.length > 0
      ? Math.min(1, input.sceneAvTags.length / Math.max(1, input.sceneMeta?.length ?? 1))
      : 0.2;
  if (details.avTags < 0.5) failDims.push("sceneAvTags");

  const lines = input.dialoguePlanLines ?? [];
  const longOk = lines.every((l) => !needsNar14Split(String(l.text ?? "").trim(), { splitHint: l.splitHint }));
  const hit = lines.filter((l) => (l.functions ?? []).includes("emotion_hit"));
  const hitOk = hit.length === 0 || hit.every((l) => l.reactionAction);
  details.lipSplit = longOk && hitOk ? 0.9 : 0.35;
  if (!longOk) failDims.push("NAR-14");
  if (!hitOk) failDims.push("NAR-15");

  details.opening = input.hasOpeningHook ? 0.9 : 0.4;
  if (!input.hasOpeningHook) failDims.push("opening");

  details.peakLedger = input.hasPeakLedger === false ? 0.35 : input.hasPeakLedger ? 0.9 : 0.7;
  if (input.hasPeakLedger === false) failDims.push("peakLedger");

  details.shotIntent = input.hasShotIntent === false ? 0.35 : input.hasShotIntent ? 0.9 : 0.7;
  if (input.hasShotIntent === false) failDims.push("shotIntent");

  details.selfcheck = input.narrativeSelfcheckPassed === false ? 0.2 : input.narrativeSelfcheckPassed ? 0.95 : 0.7;
  if (input.narrativeSelfcheckPassed === false) failDims.push("selfcheck");

  if (input.contentTranslateExtensibleWithoutDerivation) {
    details.contentTranslate = 0.3;
    failDims.push("D06_derivation");
  } else {
    details.contentTranslate = 0.85;
  }

  details.vis_beat =
    input.visBeatOk === false ? 0.3 : input.visBeatOk === true ? 0.92 : 0.75;
  if (input.visBeatOk === false) failDims.push("vis_beat");

  details.cu_cast =
    input.cuCastOk === false ? 0.25 : input.cuCastOk === true ? 0.92 : 0.75;
  if (input.cuCastOk === false) failDims.push("cu_cast");

  const weights: Record<string, number> = {
    nameMap: 0.1,
    avTags: 0.12,
    lipSplit: 0.12,
    opening: 0.1,
    peakLedger: 0.1,
    shotIntent: 0.1,
    selfcheck: 0.1,
    contentTranslate: 0.08,
    vis_beat: 0.1,
    cu_cast: 0.08,
  };
  let score = 0;
  let w = 0;
  for (const [k, wt] of Object.entries(weights)) {
    score += (details[k] ?? 0.7) * wt;
    w += wt;
  }
  score = Math.round((score / w) * 100);
  const pass = score >= passThreshold && failDims.length === 0;
  return { score, pass, failDims, details };
}
