/**
 * Unified quality decision SSOT — L1 auto → L2 soft → L3 split → L4 design → L5 defer.
 */
import { buildBurnGateEnvelope, type BurnGateBlock, type BurnGateEnvelope } from "./burnGateEnvelope";
import { resolveLipDuration } from "./promptIR";
import { resolveRequiredDuration } from "./resolveRequiredDuration";
import { hasAudioDialogueContradiction, hasFiveSectionPlaceholders } from "./finalizeFiveSectionPrompt";
import { VENDOR_DURATION_BUCKETS } from "../vendor-packs/videoVendorPack";
import type { PreDesignShot } from "../bundle/types";
import { needsNar14Split } from "../nar14ClauseSplit";
import { evaluateVisBeatConflict } from "../design/visualBeatPolicy";
import { checkReverseLoop } from "../design/visBeatLifecycle";
import { detectLipSplitPressure, readCanonicalSplitHint } from "../design/lipSplit";

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
  /** VisBeat meta (pillarsVisBeatV2); default shadow — only enforce BLOCKS burn */
  visBeatMeta?: Record<string, unknown> | null;
}

export interface QualityDecisionResult {
  decision: QualityDecisionKind;
  burnAllowed: boolean;
  /** soft_defer decision without implying burnAllowed toggle confusion */
  softDefer?: boolean;
  /** Soft debt may one-click raise duration/time — must not forge hq_ok */
  softDeferRaiseAllowed?: boolean;
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

/** NAR-14: clause over V10 budget without splitHint. */
export function longLineNeedsSplit(shot?: PreDesignShot | null): { need: boolean; splitHint?: string } {
  const lines = shot?.narrative?.dialogue?.lines ?? [];
  for (const l of lines) {
    const text = String(l.text ?? "").trim();
    const hint = (l as { splitHint?: string }).splitHint;
    if (needsNar14Split(text, { splitHint: hint })) return { need: true, splitHint: "reaction_shot" };
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
    softDefer: effective === "soft_defer",
    softDeferRaiseAllowed: effective === "soft_defer",
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
          // Alias of still_firstframe_weak — DepthPolicy / reverse_route_table SSOT
          reverseTrigger: "img_still_weak",
        },
      ],
      { reasons: ["img_still_qa"], nextStep: "batch_still" },
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

  // L3.4: forbid burning unsplittable / expanded-away parent (multi-row handoff)
  // Children after speak/react split may carry burnParentForbidden (=don't burn parent); they themselves are burnable.
  if (
    input.shot &&
    ((input.shot as { visBeatUnsplittable?: boolean }).visBeatUnsplittable ||
      (input.shot as { visBeatExpandedAway?: boolean }).visBeatExpandedAway ||
      ((input.shot as { burnParentForbidden?: boolean }).burnParentForbidden &&
        !(input.shot as { _stillBeatSplitId?: string })._stillBeatSplitId &&
        !(input.shot as { _visualSplitId?: string })._visualSplitId))
  ) {
    return wrap(
      "split_shot",
      false,
      [
        ...baseBlocks,
        {
          id: "VIS-MULTI-BEAT",
          message: "禁止只烧未拆父镜；请烧拆后子镜首帧/VID",
          reverseTrigger: "visual_multi_beat",
        },
      ],
      { reasons: ["vis_parent_burn_forbidden"], nextStep: "split_shot", splitHint: "reveal_then_reaction" },
      input.batchMode,
    );
  }

  // L3.45: still multi-beat unresolved — forbid burn (Must)
  if (input.shot && !(input.shot as { visBeatOverride?: unknown }).visBeatOverride) {
    const vd = String(
      (input.shot as { visualDescription?: string }).visualDescription ??
        (input.shot as { picture?: string }).picture ??
        "",
    ).trim();
    try {
      const { shouldWarnOneBeat } = require("./stillIdentitySsot") as typeof import("./stillIdentitySsot");
      if (vd && shouldWarnOneBeat(vd)) {
        return wrap(
          "split_shot",
          false,
          [
            ...baseBlocks,
            {
              id: "DEX-STILL-ONEBEAT",
              message: "一镜多拍不可烧；请智能拆镜或改单拍描写",
              reverseTrigger: "still_onebeat_multi",
            },
          ],
          { reasons: ["still_onebeat"], nextStep: "split_shot", splitHint: "still_onebeat" },
          input.batchMode,
        );
      }
      try {
        const { detectCuCastConflict, sliceShotCastToPrimary } =
          require("../design/detectCuCastConflict") as typeof import("../design/detectCuCastConflict");
        const shot = input.shot as Record<string, unknown> | undefined;
        const cu = detectCuCastConflict({
          shotSize: String(
            shot?.shotSize ?? (shot?.narrative as { shotSize?: string } | undefined)?.shotSize ?? "",
          ),
          charCodes: Array.isArray(shot?.charCodes) ? (shot!.charCodes as string[]) : [],
          characterNames: Array.isArray(shot?.characterNames) ? (shot!.characterNames as string[]) : [],
          visualDescription: vd,
          alreadySplit: Boolean(shot?._cuCastSplitId || shot?._stillBeatSplitId || shot?._cuCastSliced),
        });
        if (cu.conflict && cu.healMode === "slice_cast" && cu.primaryName && shot) {
          // 文学单人特写：降出场人数，禁止打开拆镜确认
          sliceShotCastToPrimary(shot, cu.primaryName);
        } else if (cu.conflict) {
          const loop = checkReverseLoop(cu.reverseTrigger, String(shot?.shotIndex ?? "x"));
          if (!loop.allow) {
            return wrap(
              "rePush_design",
              false,
              [
                ...baseBlocks,
                {
                  id: cu.ruleId,
                  message: `${cu.message}（拆镜循环达上限，请 Confirm 或手改景别/人数）`,
                  reverseTrigger: cu.reverseTrigger,
                },
              ],
              { reasons: ["still_cu_cast_loop"], nextStep: "chat_repair", splitHint: "still_cu_cast" },
              input.batchMode,
            );
          }
          return wrap(
            "split_shot",
            false,
            [
              ...baseBlocks,
              {
                id: cu.ruleId,
                message: cu.message,
                reverseTrigger: cu.reverseTrigger,
              },
            ],
            { reasons: ["still_cu_cast"], nextStep: "split_shot", splitHint: "still_cu_cast" },
            input.batchMode,
          );
        }
      } catch {
        /* optional */
      }
    } catch {
      /* optional */
    }
  }

  // L3.5: VisBeat multi-beat unresolved (enforce only)
  if (input.shot && !(input.shot as { visBeatOverride?: unknown }).visBeatOverride) {
    const shot = input.shot as PreDesignShot & {
      visualBeatTags?: unknown;
      weaponId?: string;
      visualDescription?: string;
      shotSize?: string;
    };
    const ev = evaluateVisBeatConflict({
      visualBeatTags: shot.visualBeatTags,
      shotSize: shot.shotSize ?? (shot.narrative as { shotSize?: string } | undefined)?.shotSize,
      picture: shot.visualDescription,
      weaponId: shot.weaponId,
      // Enforce when tags present or caller sets enforce — avoid shadow假绿 at burn
      meta:
        input.visBeatMeta ??
        ({
          pillarsVisBeatV2:
            Boolean(shot.visualBeatTags) || Boolean((shot as { chatStrict?: boolean }).chatStrict)
              ? "enforce"
              : "shadow",
        } as Record<string, unknown>),
    });
    if (ev.action === "must_split" && !ev.ok) {
      const loop = checkReverseLoop("visual_multi_beat", String(shot.shotIndex ?? "x"));
      if (!loop.allow) {
        return wrap(
          "rePush_design",
          false,
          [
            ...baseBlocks,
            {
              id: "VIS-MULTI-BEAT",
              message: `${ev.explain ?? "视觉拍点须拆镜"}（反推循环上限，请人工确认）`,
              reverseTrigger: "visual_multi_beat",
            },
          ],
          { reasons: ["vis_multi_beat_loop_cap"], nextStep: "chat_repair", splitHint: "reveal_then_reaction" },
          input.batchMode,
        );
      }
      return wrap(
        "split_shot",
        false,
        [
          ...baseBlocks,
          {
            id: "VIS-MULTI-BEAT",
            message: ev.explain ?? "揭示与脸特写同镜冲突，须拆镜",
            reverseTrigger: "visual_multi_beat",
          },
        ],
        { reasons: ["vis_multi_beat"], nextStep: "split_shot", splitHint: ev.template ?? "reveal_then_reaction" },
        input.batchMode,
      );
    }
  }

  // L3: lip over vendor max OR needsSplit OR F3 OR NAR-14 (predicates via lipSplit SSOT)
  const pressure = input.shot ? detectLipSplitPressure(input.shot, { vendorId: input.vendorId }) : null;
  const lipOver = Boolean(pressure?.lipOver || (lip && lip.lipMin > vmax));
  const multiSplit = Boolean(pressure?.needsSplit ?? lip?.needsSplit);
  const overVendor = Boolean(pressure?.overVendorMax || lip?.overVendorMax);
  const fxSplit = grade === "F3";
  if (lipOver || multiSplit || overVendor || fxSplit || nar.need) {
    const splitHint =
      readCanonicalSplitHint(input.shot ?? {}) ??
      pressure?.splitHint ??
      (nar.need ? nar.splitHint : undefined) ??
      "reaction_shot";
    const reasons = [
      ...(multiSplit ? ["multi_line_one_shot"] : []),
      ...(lipOver ? [`lipMin_${lip?.lipMin ?? pressure?.lipMin}_gt_vendorMax_${vmax}`] : []),
      ...(!lipOver && overVendor ? ["lip_over_vendor"] : []),
      ...(fxSplit ? ["fx_f3_split"] : []),
      ...(nar.need ? ["nar14_long_line"] : []),
    ];
    const blocks: BurnGateBlock[] = [...baseBlocks];
    if (nar.need) {
      blocks.push({
        id: "NAR-14",
        message: `长台词缺 splitHint，须 Confirm 拆镜或改短（勿只写散文 hint）: ${splitHint}`,
        reverseTrigger: "nar14_split",
      });
    }
    if (lipOver || multiSplit || overVendor) {
      blocks.push({
        id: "LIP-01",
        message: `需拆镜: ${reasons.filter((r) => !r.startsWith("fx_") && r !== "nar14_long_line").join(",") || reasons.join(",")}`,
        reverseTrigger: multiSplit || overVendor || lipOver ? "pr_lip_duration" : "pr_lip_duration",
      });
    }
    if (fxSplit) {
      blocks.push({
        id: "FX-GRADE-01",
        message: "FX F3 需拆镜",
        reverseTrigger: "fx_infeasible",
      });
    }
    // Do NOT invent/write splitHint onto shot here — false-green; Confirm/Orchestrator owns physical split.
    return wrap(
      "split_shot",
      false,
      blocks,
      {
        reasons: [...reasons, "design_split_handoff:confirmClusterSplit|forwardReentry"],
        splitHint,
        lipMin: lip?.lipMin ?? pressure?.lipMin,
        vendorMax: vmax,
        nextStep: "split_shot",
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
    if (needsNar14Split(text, { splitHint: (l as { splitHint?: string }).splitHint })) {
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
  const env = qd.envelope ?? ({} as QualityDecisionResult["envelope"]);
  const suggested =
    env.suggestedValue ??
    (extra?.duration != null ? extra.duration : undefined);
  let userMessage = env.userMessage;
  if (qd.nextStep === "raise_duration" && suggested != null) {
    userMessage = `台词/情绪需要更长镜头，建议时长 ${suggested}s`;
  } else if (userMessage === "提示词有可自动修复的问题") {
    userMessage = "提示词需完善后才能烧片（运镜/五段/合规等）";
  }
  return {
    decision: qd.decision,
    burnAllowed: qd.burnAllowed,
    nextStep: qd.nextStep,
    primaryNextStep: env.primaryNextStep ?? qd.nextStep,
    userMessage,
    ctaLabel: env.ctaLabel,
    userMessageKey: env.userMessageKey,
    suggestedValue: suggested,
    fieldPath: env.fieldPath ?? (qd.nextStep === "raise_duration" ? "duration" : undefined),
    splitHint: qd.splitHint,
    reasons: qd.reasons ?? [],
    lipMin: qd.lipMin,
    vendorMax: qd.vendorMax,
    rePushPlan: env.rePushPlan,
    repairHints: env.repairHints,
    reverseTriggers: env.triggers,
    ...(extra?.autoHealed?.length ? { autoHealed: extra.autoHealed } : {}),
    ...(extra?.duration != null ? { duration: extra.duration } : {}),
  };
}

/**
 * Write suggested splitHint onto the episode package shot (no physical shot split).
 * Only accepts canonical enum hints; never prose. Prefer Confirm/Orchestrator over this.
 */
export async function persistSplitHintSuggestion(opts: {
  db: import("knex").Knex;
  projectId: number;
  scriptId: number;
  storyboardId?: number | null;
  splitHint: string;
}): Promise<boolean> {
  const hint = String(opts.splitHint ?? "").trim();
  if (!hint || !/^[a-z][a-z0-9_]*$/i.test(hint)) return false;
  if (opts.storyboardId == null) return false;
  const { loadEpisodePackage, saveEpisodePackage } = await import("../storage/episodePackageStore");
  const pkg = await loadEpisodePackage(opts.db, opts.projectId, opts.scriptId);
  if (!pkg?.shots?.length) return false;
  const idx = pkg.shots.findIndex((s) => s.storyboardId === opts.storyboardId);
  if (idx < 0) return false;
  const patched = ensureSplitHintOnShot(pkg.shots[idx] as unknown as PreDesignShot, hint);
  pkg.shots[idx] = patched as unknown as (typeof pkg.shots)[number];
  await saveEpisodePackage(opts.db, pkg);
  return true;
}
