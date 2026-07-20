/**
 * Unified quality decision SSOT — L1 auto → L2 soft → L3 split → L4 design → L5 defer.
 */
import { buildBurnGateEnvelope, type BurnGateBlock, type BurnGateEnvelope } from "./burnGateEnvelope";
import { resolveLipDuration } from "./promptIR";
import { resolveRequiredDuration } from "./resolveRequiredDuration";
import { hasAudioDialogueContradiction, hasFiveSectionPlaceholders } from "./finalizeFiveSectionPrompt";
import { VENDOR_DURATION_BUCKETS } from "../vendor-packs/videoVendorPack";
import type { PreDesignShot } from "../bundle/types";

export type QualityDecisionKind = "auto" | "soft_patch" | "split_shot" | "rePush_design" | "soft_defer";

export interface QualityDecisionInput {
  videoPrompt?: string | null;
  audioPrompt?: string | null;
  shot?: PreDesignShot | null;
  vendorId?: string | null;
  /** FX feasibility grade F0–F5 */
  fxGrade?: string | null;
  /** Missing still / cref for singleImage */
  missingStillOrCref?: boolean;
  /** Weak / missing storyboard still (IMG-STILL-QA) */
  stillQuality?: "missing" | "weak" | "hq_ok" | null;
  /** Batch mode → prefer soft_defer over hard fail for L3/L4 */
  batchMode?: boolean;
  gateBlocks?: BurnGateBlock[];
}

export interface QualityDecisionResult {
  decision: QualityDecisionKind;
  burnAllowed: boolean;
  splitHint?: string;
  lipMin?: number;
  vendorMax?: number;
  reasons: string[];
  envelope: BurnGateEnvelope;
  nextStep: BurnGateEnvelope["nextStep"];
  /** Shot with splitHint applied (caller should persist when blocking) */
  shotWithSplitHint?: PreDesignShot;
}

function vendorMaxBucket(vendorId?: string | null): number {
  const key = String(vendorId ?? "agnesai").toLowerCase();
  const buckets =
    VENDOR_DURATION_BUCKETS[
      key.includes("kling")
        ? "klingai"
        : key.includes("minimax")
          ? "minimax"
          : key.includes("wan")
            ? "wan"
            : key.includes("seedance") || key.includes("volc")
              ? "seedance"
              : key.includes("agnes")
                ? "agnesai"
                : "default"
    ] ?? VENDOR_DURATION_BUCKETS.default;
  return Math.max(...buckets);
}

/** NAR-14: long line without splitHint. */
export function longLineNeedsSplit(shot?: PreDesignShot | null): { need: boolean; splitHint?: string } {
  const lines = shot?.narrative?.dialogue?.lines ?? [];
  for (const l of lines) {
    const text = String(l.text ?? "").trim();
    const hint = (l as { splitHint?: string }).splitHint;
    if (text.length > 20 && !hint) return { need: true, splitHint: "reaction_shot" };
  }
  return { need: false };
}

function wrap(
  decision: QualityDecisionKind,
  burnAllowed: boolean,
  blocks: BurnGateBlock[],
  extra: Partial<QualityDecisionResult> & { reasons: string[]; nextStep?: BurnGateEnvelope["nextStep"] },
  batchMode?: boolean,
): QualityDecisionResult {
  // Batch: convert hard fail → soft_defer but keep actionable nextStep (split_shot / batch_still / chat_repair).
  const effective: QualityDecisionKind = batchMode && !burnAllowed && decision !== "auto" ? "soft_defer" : decision;
  const nextStep =
    extra.nextStep ??
    (effective === "soft_defer" && decision === "split_shot"
      ? "split_shot"
      : effective === "soft_defer"
        ? "retry_shot"
        : undefined);
  const envelope = buildBurnGateEnvelope(blocks, {
    decision: effective,
    splitHint: extra.splitHint,
    nextStep,
  });
  return {
    decision: effective,
    burnAllowed,
    reasons: extra.reasons,
    envelope,
    nextStep: envelope.nextStep,
    splitHint: extra.splitHint ?? envelope.splitHint,
    lipMin: extra.lipMin,
    vendorMax: extra.vendorMax,
    shotWithSplitHint: extra.shotWithSplitHint,
  };
}

/**
 * Decide burn vs soft vs split vs design. Quality first: L3/L4 ⇒ burnAllowed=false.
 */
export function decideVideoQuality(input: QualityDecisionInput): QualityDecisionResult {
  const grade = String(input.fxGrade ?? "")
    .toUpperCase()
    .replace(/^FX:/, "");
  const lip = input.shot ? resolveLipDuration(input.shot) : null;
  const vmax = vendorMaxBucket(input.vendorId);
  const nar = longLineNeedsSplit(input.shot);
  const baseBlocks = input.gateBlocks ?? [];
  const promptText = String(input.videoPrompt ?? "");
  const hasPlaceholder = hasFiveSectionPlaceholders(promptText);
  const audioConflict = hasAudioDialogueContradiction(promptText);

  // L4: missing still/cref (assets)
  if (input.missingStillOrCref) {
    return wrap(
      "rePush_design",
      false,
      [
        ...baseBlocks,
        { id: "IMG-CREF", message: "分镜定妆/cref 缺失，禁止脏首帧烧视频", reverseTrigger: "img_cref_missing" },
      ],
      { reasons: ["missing_still_or_cref"], nextStep: "batch_still" },
      input.batchMode,
    );
  }

  // L4b: weak storyboard still (composition) — after asset cref
  if (input.stillQuality === "weak" || input.stillQuality === "missing") {
    return wrap(
      "rePush_design",
      false,
      [
        ...baseBlocks,
        {
          id: "IMG-STILL-QA",
          message: "分镜静照质量不足（须高质量构图首帧）",
          reverseTrigger: "img_still_weak",
        },
      ],
      { reasons: ["img_still_qa"], nextStep: "regen_storyboard_hq" },
      input.batchMode,
    );
  }

  // L4: F4/F5
  if (/^F[45]$/.test(grade)) {
    return wrap(
      "rePush_design",
      false,
      [...baseBlocks, { id: "FX-GRADE-01", message: `FX ${grade} 需设计降级/拆镜`, reverseTrigger: "fx_infeasible" }],
      { reasons: [`fx_${grade}`], nextStep: "chat_repair" },
      input.batchMode,
    );
  }

  // L2.5: duration short but Declare-safe → raise_duration (not split).
  // Callers MUST run applySilentSoftPatches before treating this as a hard block.
  {
    const req = input.shot ? resolveRequiredDuration(input.shot, { vendorId: input.vendorId }) : null;
    if (req?.canSilentRaise) {
      const blocks: BurnGateBlock[] = [
        ...baseBlocks,
        {
          id: "LIP-01",
          message: `时长 ${req.authorDuration}s < required ${req.required}s`,
          reverseTrigger: "pr_lip_duration",
        },
      ];
      const envelope = buildBurnGateEnvelope(blocks, {
        decision: "soft_patch",
        nextStep: "raise_duration",
        suggestedValue: req.required,
        fieldPath: "duration",
        primary: {
          userMessage: `台词/情绪需要更长镜头，建议时长 ${req.required}s`,
        },
      });
      return {
        decision: input.batchMode ? "soft_defer" : "soft_patch",
        burnAllowed: false,
        reasons: ["raise_duration"],
        envelope: input.batchMode
          ? { ...envelope, decision: "soft_defer", nextStep: "raise_duration", primaryNextStep: "raise_duration" }
          : envelope,
        nextStep: "raise_duration",
        lipMin: req.lipMin,
        vendorMax: vmax,
        splitHint: undefined,
      };
    }
  }

  // L3: lip over vendor max OR needsSplit OR F3 OR NAR-14
  const lipOver = Boolean(lip && lip.lipMin > vmax);
  const multiSplit = Boolean(lip?.needsSplit);
  const fxSplit = grade === "F3";
  if (lipOver || multiSplit || fxSplit || nar.need) {
    const splitHint = lip?.splitHint ?? nar.splitHint ?? "reaction_shot";
    const reasons = [
      ...(lipOver ? [`lipMin_${lip!.lipMin}_gt_vendorMax_${vmax}`] : []),
      ...(multiSplit ? ["multi_line_one_shot"] : []),
      ...(fxSplit ? ["fx_f3_split"] : []),
      ...(nar.need ? ["nar14_long_line"] : []),
    ];
    const blocks: BurnGateBlock[] = [...baseBlocks];
    if (nar.need) {
      blocks.push({
        id: "NAR-14",
        message: `长台词缺 splitHint，建议拆镜: ${splitHint}`,
        reverseTrigger: "narrative_split_hint",
      });
    }
    if (lipOver || multiSplit) {
      blocks.push({
        id: "LIP-01",
        message: `需拆镜: ${reasons.join(",")}`,
        reverseTrigger: "pr_lip_duration",
      });
    }
    if (fxSplit) {
      blocks.push({
        id: "FX-GRADE-01",
        message: "FX F3 需拆镜",
        reverseTrigger: "fx_infeasible",
      });
    }
    const shotWithSplitHint = input.shot ? ensureSplitHintOnShot(input.shot, splitHint) : undefined;
    return wrap(
      "split_shot",
      false,
      blocks,
      {
        reasons,
        splitHint,
        lipMin: lip?.lipMin,
        vendorMax: vmax,
        nextStep: "split_shot",
        shotWithSplitHint,
      },
      input.batchMode,
    );
  }

  // L2: prompt honesty — placeholders / Audio silence+lip contradiction block burn
  if (hasPlaceholder || audioConflict || baseBlocks.length) {
    const blocks: BurnGateBlock[] = [...baseBlocks];
    const reasons: string[] = [];
    if (hasPlaceholder) {
      reasons.push("five_section_placeholder");
      blocks.push({
        id: "VP-PLACEHOLDER",
        message: "五段提示词仍有占位/空槽，禁止脏烧",
        reverseTrigger: "vp_conflict",
      });
    }
    if (audioConflict) {
      reasons.push("audio_dialogue_contradiction");
      blocks.push({
        id: "VP-AUDIO-CONFLICT",
        message: "Audio 同时写「无对白」与台词/lip-sync，禁止脏烧",
        reverseTrigger: "vp_conflict",
      });
    }
    if (!reasons.length) reasons.push("gate_or_placeholder");
    return wrap(
      "soft_patch",
      false,
      blocks.length ? blocks : [{ id: "VP-CONFLICT", message: "五段占位/冲突", reverseTrigger: "vp_conflict" }],
      {
        reasons,
        lipMin: lip?.lipMin,
        vendorMax: vmax,
        nextStep: "chat_repair",
      },
      input.batchMode,
    );
  }

  return wrap("auto", true, [], { reasons: ["clean"], lipMin: lip?.lipMin, vendorMax: vmax, nextStep: "burn" });
}

/** Ensure splitHint written onto first long dialogue line (returns new shot). */
export function ensureSplitHintOnShot(shot: PreDesignShot, hint = "reaction_shot"): PreDesignShot {
  const lines = [...(shot.narrative?.dialogue?.lines ?? [])];
  if (!lines.length) return shot;
  let touched = false;
  const nextLines = lines.map((l) => {
    const text = String(l.text ?? "").trim();
    if (text.length > 20 && !(l as { splitHint?: string }).splitHint) {
      touched = true;
      return { ...l, splitHint: hint };
    }
    return l;
  });
  if (!touched) return shot;
  return {
    ...shot,
    narrative: {
      ...shot.narrative,
      dialogue: { ...shot.narrative?.dialogue, lines: nextLines },
    },
  };
}

/** Serialize decision for o_video.errorReason / API envelope. */
export function serializeQualityDecision(
  qd: QualityDecisionResult,
  extra?: { autoHealed?: string[]; duration?: number },
): Record<string, unknown> {
  const suggested =
    qd.envelope.suggestedValue ??
    (extra?.duration != null ? extra.duration : undefined);
  let userMessage = qd.envelope.userMessage;
  if (qd.nextStep === "raise_duration" && suggested != null) {
    userMessage = `台词/情绪需要更长镜头，建议时长 ${suggested}s`;
  } else if (userMessage === "提示词有可自动修复的问题") {
    userMessage = "提示词需完善后才能烧片（运镜/五段/合规等）";
  }
  return {
    decision: qd.decision,
    burnAllowed: qd.burnAllowed,
    nextStep: qd.nextStep,
    primaryNextStep: qd.envelope.primaryNextStep ?? qd.nextStep,
    userMessage,
    ctaLabel: qd.envelope.ctaLabel,
    userMessageKey: qd.envelope.userMessageKey,
    suggestedValue: suggested,
    fieldPath: qd.envelope.fieldPath ?? (qd.nextStep === "raise_duration" ? "duration" : undefined),
    splitHint: qd.splitHint,
    reasons: qd.reasons,
    lipMin: qd.lipMin,
    vendorMax: qd.vendorMax,
    rePushPlan: qd.envelope.rePushPlan,
    repairHints: qd.envelope.repairHints,
    reverseTriggers: qd.envelope.triggers,
    ...(extra?.autoHealed?.length ? { autoHealed: extra.autoHealed } : {}),
    ...(extra?.duration != null ? { duration: extra.duration } : {}),
  };
}

/**
 * Write suggested splitHint onto the episode package shot (no physical shot split).
 * Best-effort: returns false if package/shot missing.
 */
export async function persistSplitHintSuggestion(opts: {
  db: import("knex").Knex;
  projectId: number;
  scriptId: number;
  storyboardId?: number | null;
  splitHint: string;
}): Promise<boolean> {
  if (opts.storyboardId == null) return false;
  const { loadEpisodePackage, saveEpisodePackage } = await import("../storage/episodePackageStore");
  const pkg = await loadEpisodePackage(opts.db, opts.projectId, opts.scriptId);
  if (!pkg?.shots?.length) return false;
  const idx = pkg.shots.findIndex((s) => s.storyboardId === opts.storyboardId);
  if (idx < 0) return false;
  const patched = ensureSplitHintOnShot(pkg.shots[idx] as unknown as PreDesignShot, opts.splitHint);
  pkg.shots[idx] = patched as unknown as (typeof pkg.shots)[number];
  await saveEpisodePackage(opts.db, pkg);
  return true;
}
