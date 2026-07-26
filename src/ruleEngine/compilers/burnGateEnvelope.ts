/**
 * Burn-time quality gate failure envelope — RH + rePushPlan (parity with identity fail).
 */
import { buildRePushPlan } from "../design/reverseRouteEngine";
import { readFixtureJson } from "../utils/fixturesPath";
import type { QualityDecisionKind } from "./qualityDecision";
import { buildPrimaryBlock, type GateStage, type PrimaryBlock } from "./primaryBlock";
import { buildDc01HumanEnvelope } from "../heal/dc01Envelope";

const BLOCK_TO_TRIGGER: Record<string, string> = {
  "LANG-01": "lang_vid_mismatch",
  "LANG-AUD-01": "lang_aud_mismatch",
  "LIP-01": "pr_lip_duration",
  "PR-09": "pr_lip_duration",
  "CAM-SPEAK": "cam_speak",
  "FX-GRADE-01": "fx_infeasible",
  "FX-FALSE-GREEN": "fx_empty",
  "VP-CONFLICT": "vp_conflict",
  "DC-09": "cam_whitelist",
  "PR-CAM-01": "cam_whitelist",
  "NAR-14": "nar14_split",
  "NAR-15": "nar15_reaction",
  "NAR-14-RESIDUAL": "nar14_residual",
  "DC-16": "dc16_cast",
  "DG-CD-COVERAGE": "dc16_cast",
  "DEX-SPEAKER-BARE": "speaker_bare",
  "DEX-LIP-SPLIT": "nar14_split",
  "DG-NAR-SELFCHECK": "self_report_mismatch",
  "FALSE_GREEN_SELFCHECK": "self_report_mismatch",
  "DEX-LITERARY-STALE": "literary_stale",
  "DC-01": "dialogue_hash_mismatch",
  R2: "dialogue_hash_mismatch",
  H3: "dialogue_hash_mismatch",
  "DEX-VIS-SPLIT": "visual_multi_beat",
  "DEX-VIS-TAG-MISSING": "visual_tag_missing",
  "DEX-VIS-TAG-INCONSISTENT": "visual_tag_inconsistent",
  "VIS-MULTI-BEAT": "visual_multi_beat",
  "VIS-BEAT-SCORE": "visual_beat_score",
  "VIS-SYNC-DRIFT": "visual_sync_drift",
  "DFW-DURATION": "lip_duration_short",
  "IMG-CREF": "img_cref_missing",
  "IMG-STILL-QA": "img_still_weak",
  "STILL-FIRSTFRAME-DIRTY": "still_firstframe_dirty",
  "STILL-FIRSTFRAME-STALE": "still_firstframe_stale",
  "STILL-FIRSTFRAME-WEAK": "still_firstframe_weak",
  "STILL-FIRSTFRAME-MISSING": "still_firstframe_weak",
  "DEX-STILL-ONEBEAT": "still_onebeat_multi",
  "DEX-STILL-CU-CAST": "still_cu_cast",
  "DEX-LIT-CONTACT": "lit_detail_contact",
  "DEX-LIT-ANCHOR": "lit_detail_anchor",
  "DEX-LIT-EXPR": "lit_detail_expr",
  "DEX-PROP-CONT": "prop_continuity",
  "DEX-STILL-OS-NAME": "still_firstframe_dirty",
  "DEX-STILL-FILLER": "still_firstframe_dirty",
  "VID-INHERIT-COMPOSITION": "vid_inherit_composition",
  "VP-XML-ASK-STUB": "video_prompt_stub",
  "VP-THIN-SHELL": "video_prompt_stub",
  "VP-CROSS-SHOT-SIDECAR": "video_prompt_stub",
  "QP-02": "qp02_visual_short",
  "CHAT-SB-01": "qp02_visual_short",
  "DEX-QP-02": "qp02_visual_short",
  "DEX-CAST-ON-DESC": "cast_on_desc_missing",
  "DEX-EMPTY-SHOT-CONSISTENCY": "empty_shot_conflict",
  "DEX-EXPR-SPEAK": "expr_speak_missing",
  "DEX-ASSET-CREF": "asset_cref",
  "DEX-SHOT-INTENT": "shot_intent_decay",
  "DEX-CUT-01": "cut01_adjacent",
  "DEX-CAM-XSHOT": "cam_xshot",
  "CUT-01": "cut01_adjacent",
  "CAM-XSHOT": "cam_xshot",
  "GEN-01": "expr_speak_missing",
  "QF-EXPR-01": "expr_speak_missing",
  "NO-LIP-DIALOGUE": "no_lip_dialogue",
  "DESIGN-LOSS": "design_loss",
  "DESIGN-LOSS-DURATION": "design_loss",
  "DUR-DESYNC": "dur_desync",
  "PROMPT-FIDELITY": "prompt_fidelity",
  "DEX-CAM-FIT": "cam_fit",
  "DC-01-EXTRA": "dialogue_extra",
  "CHAIN-BEAT": "chain_beat",
  "CHAT-AUD-01": "audio_missing",
  "AUD-ORPHAN-SPEECH": "aud_orphan",
  "IMPORT-SPLIT-SYNC": "import_split_sync",
  "DEX-INTENT-PIC": "intent_pic",
  "IRD-CONFIRM": "ird_confirm",
  "DEX-DIRTY-STILL-PROMPT": "dirty_still_prompt",
  "DEX-DUP-VD": "dirty_still_prompt",
  "DEX-HAND-LIP": "dirty_still_prompt",
  "VID-INHERIT-DIRTY-STILL": "dirty_still_prompt",
  "SFX-UNBACKED": "sfx_unbacked",
  "MIRROR-WARP": "svq_motion_fail",
  "identity_cast": "still_firstframe_dirty",
  "dialogue_lip": "still_mouth_handoff",
  "emotion_clarity": "expr_speak_missing",
  "motion_fidelity": "svq_motion_fail",
  "audio_mood": "svq_audio_fail",
  "sfx_unbacked": "sfx_unbacked",
};

/** Test/CI export — do not mutate at runtime. */
export const BLOCK_TO_TRIGGER_FOR_TEST: Readonly<Record<string, string>> = BLOCK_TO_TRIGGER;

export interface BurnGateBlock {
  id: string;
  message: string;
  reverseTrigger?: string;
}

export type BurnNextStep =
  | "chat_repair"
  | "soft_patch"
  | "split_shot"
  | "batch_still"
  | "retry_shot"
  | "burn"
  | "raise_duration"
  | "regen_storyboard_hq";

/** Canonical enum list for FE/BE contract CI. */
export const BURN_NEXT_STEPS: BurnNextStep[] = [
  "chat_repair",
  "soft_patch",
  "split_shot",
  "batch_still",
  "retry_shot",
  "burn",
  "raise_duration",
  "regen_storyboard_hq",
];

export interface BurnGateEnvelope {
  rePushPlan: ReturnType<typeof buildRePushPlan>;
  repairHints: { id: string; chatTemplate?: string; ruleId?: string }[];
  triggers: string[];
  nextStep: BurnNextStep;
  /** Alias for FE — same as nextStep (D14). */
  primaryNextStep: BurnNextStep;
  userMessage: string;
  ctaLabel: string;
  userMessageKey: string;
  suggestedValue?: number | string;
  fieldPath?: string;
  stage?: GateStage;
  decision?: QualityDecisionKind;
  splitHint?: string;
}

export function triggersFromBurnBlocks(blocks: BurnGateBlock[]): string[] {
  const triggers: string[] = [];
  for (const b of blocks) {
    const t = b.reverseTrigger || BLOCK_TO_TRIGGER[b.id];
    if (t) triggers.push(t);
  }
  return [...new Set(triggers)];
}

export function buildBurnGateEnvelope(
  blocks: BurnGateBlock[],
  opts?: {
    decision?: QualityDecisionKind;
    splitHint?: string;
    nextStep?: BurnNextStep;
    suggestedValue?: number | string;
    fieldPath?: string;
    stage?: GateStage;
    primary?: Partial<PrimaryBlock>;
  },
): BurnGateEnvelope {
  const triggers = triggersFromBurnBlocks(blocks);
  const rePushPlan = triggers.length ? buildRePushPlan(triggers) : [];
  const catalog = readFixtureJson<{
    hints?: { id: string; ruleId: string; qpId?: string; chatTemplate?: string; checkIds?: string[] }[];
  }>("repair_hint_catalog.json", { hints: [] });
  const idSet = new Set([...blocks.map((b) => b.id), ...triggers]);
  const repairHints = (catalog.hints ?? [])
    .filter(
      (h) =>
        idSet.has(h.ruleId) ||
        idSet.has(h.id) ||
        (h.qpId && idSet.has(h.qpId)) ||
        (h.checkIds?.some((c) => idSet.has(c)) ?? false),
    )
    .map((h) => ({ id: h.id, chatTemplate: h.chatTemplate, ruleId: h.ruleId }))
    .slice(0, 8);

  let nextStep: BurnNextStep =
    opts?.nextStep ??
    (triggers.includes("img_cref_missing")
      ? "batch_still"
      : triggers.includes("img_still_weak") || triggers.includes("still_firstframe_weak")
        ? "batch_still"
        : triggers.includes("still_onebeat_multi") ||
            triggers.includes("still_cu_cast") ||
            triggers.includes("still_firstframe_dirty")
          ? "split_shot"
        : triggers.includes("dialogue_hash_mismatch")
          ? "soft_patch"
            : triggers.includes("narrative_split_hint") ||
              triggers.includes("pr_lip_duration") ||
              triggers.includes("fx_infeasible") ||
              triggers.includes("cam_fit")
            ? blocks.some((b) => /拆镜|split|NAR-14|F3|IRD-CONFIRM/i.test(`${b.id} ${b.message}`))
              ? triggers.includes("cam_fit")
                ? "split_shot" // Confirm 智能拆；勿手改镜号
                : "split_shot"
              : triggers.includes("pr_lip_duration")
                ? "raise_duration"
                : "split_shot"
            : triggers.some((t) => t.startsWith("lang_") || t === "vp_conflict" || t === "cam_speak" || t === "qf_expr_face")
              ? "soft_patch"
              : "chat_repair");

  if (opts?.decision === "soft_defer" && !opts?.nextStep) nextStep = "retry_shot";
  if (opts?.decision === "soft_patch" && !opts?.nextStep) nextStep = "soft_patch";
  if (opts?.decision === "split_shot" && !opts?.nextStep) nextStep = "split_shot";
  if (opts?.decision === "rePush_design" && triggers.includes("img_cref_missing") && !opts?.nextStep) nextStep = "batch_still";
  // Explicit nextStep always wins
  if (opts?.nextStep) nextStep = opts.nextStep;

  let userMessageOverride = opts?.primary?.userMessage;
  let ctaOverride: string | undefined;
  if (!userMessageOverride && triggers.includes("dialogue_hash_mismatch")) {
    const dcBlock = blocks.find((b) => b.id === "DC-01" || /台词|dialogue/i.test(b.message));
    const env = buildDc01HumanEnvelope({ message: dcBlock?.message });
    userMessageOverride = env.userMessage;
    if (nextStep === "soft_patch") ctaOverride = env.ctaLabel;
  }

  const primary = buildPrimaryBlock(nextStep, {
    suggestedValue: opts?.suggestedValue ?? opts?.primary?.suggestedValue,
    fieldPath: opts?.fieldPath ?? opts?.primary?.fieldPath,
    stage: opts?.stage ?? opts?.primary?.stage ?? "burn",
    userMessageOverride,
  });

  return {
    rePushPlan,
    repairHints,
    triggers,
    nextStep,
    primaryNextStep: primary.primaryNextStep,
    userMessage: primary.userMessage,
    ctaLabel: ctaOverride ?? primary.ctaLabel,
    userMessageKey: primary.userMessageKey,
    suggestedValue: primary.suggestedValue,
    fieldPath: primary.fieldPath,
    stage: primary.stage,
    decision: opts?.decision,
    splitHint: opts?.splitHint,
  };
}
