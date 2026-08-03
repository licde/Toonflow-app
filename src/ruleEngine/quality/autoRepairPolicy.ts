/**
 * autoRepairPolicy — prefer automatic recovery before human handoff.
 * Key optional: unmeasured/vlm_error never forces handoff alone.
 * Literary: fillable slots → reverse enhance path, do not brick Generate.
 */
export type AutoRepairStage =
  | "compose_regen"
  | "fidelity_edit"
  | "regen_storyboard_hq"
  | "retry_shot"
  | "handoff_human";

export type AutoRepairDecision = {
  autoRepairStage: AutoRepairStage;
  autoRepairRound: number;
  autoRepairBudgetLeft: number;
  allowSilentRegen: boolean;
  handoffReason?: string;
  /** Prefer reverse literary fill (应用补全) before hand_edit_vd */
  preferLitEnhance?: boolean;
};

const ENHANCEABLE_SLOT =
  /contact|prop|wound|readable|geom|spatial|grip|ground|threshold|surface|pour|xor/i;

export function slotsAreEnhanceable(slots: string[] | undefined | null): boolean {
  const list = (slots ?? []).map(String).filter(Boolean);
  if (!list.length) return false;
  return list.every((s) => ENHANCEABLE_SLOT.test(s));
}

export function decideAutoRepairPolicy(input: {
  repairIrdPrimaryAction?: string | null;
  fidelityStopReason?: string | null;
  visualPass?: boolean | null;
  keyMissing?: boolean;
  round?: number;
  findings?: string[];
  missingSlots?: string[];
  /** Seal-gate contamination — prefer compose_regen, never handoff-only */
  contaminationClass?: string | null;
}): AutoRepairDecision {
  const round = Math.max(1, Number(input.round ?? 1));
  const maxRounds = 3;
  const budgetLeft = Math.max(0, maxRounds - round);
  const action = String(input.repairIrdPrimaryAction ?? "");
  const stop = String(input.fidelityStopReason ?? "");
  const findings = input.findings ?? [];
  const contam = String(input.contaminationClass ?? "").trim();
  const enhanceable =
    slotsAreEnhanceable(input.missingSlots) ||
    findings.some((f) => ENHANCEABLE_SLOT.test(f));

  // Contamination debt → auto compose regen first (strip zombies / forceFull); never brick Generate
  if (
    (contam && contam !== "none") ||
    findings.some((f) =>
      /contact_zombie|off_beat_cu|locus_mangled|plate_geometry|glyph_identity|contaminationClass/i.test(f),
    )
  ) {
    if (budgetLeft <= 0) {
      return {
        autoRepairStage: "handoff_human",
        autoRepairRound: round,
        autoRepairBudgetLeft: 0,
        allowSilentRegen: true,
        handoffReason: `contam:${contam || "findings"}`,
      };
    }
    return {
      autoRepairStage: round === 1 ? "compose_regen" : "regen_storyboard_hq",
      autoRepairRound: round,
      autoRepairBudgetLeft: budgetLeft,
      allowSilentRegen: true,
      handoffReason: contam && contam !== "none" ? `contam:${contam}` : "contam_finding",
    };
  }

  // Shootable-first: confirm_split is advise — keep Generate clickable; prefer compose regen after slim.
  if (action === "confirm_split") {
    return {
      autoRepairStage: round === 1 ? "compose_regen" : "regen_storyboard_hq",
      autoRepairRound: round,
      autoRepairBudgetLeft: budgetLeft,
      allowSilentRegen: true,
      handoffReason: "confirm_split_advise",
      preferLitEnhance: true,
    };
  }

  if (budgetLeft <= 0 || stop === "converged" || stop === "budget") {
    return {
      autoRepairStage: "handoff_human",
      autoRepairRound: round,
      autoRepairBudgetLeft: budgetLeft,
      allowSilentRegen: false,
      handoffReason: stop || "budget_exhausted",
      preferLitEnhance: enhanceable,
    };
  }

  // Literary debt with template-fillable slots → reverse enhance, keep Generate clickable.
  if (action === "hand_edit_vd" || action === "confirm_enhance" || action === "apply_auto_enhance") {
    if (enhanceable) {
      return {
        autoRepairStage: round === 1 ? "compose_regen" : "fidelity_edit",
        autoRepairRound: round,
        autoRepairBudgetLeft: budgetLeft,
        allowSilentRegen: true,
        preferLitEnhance: true,
        handoffReason: action === "hand_edit_vd" ? "lit_enhanceable" : undefined,
      };
    }
    // Non-enhanceable literary debt → chat_repair, but still allow explicit regen click
    // (FE must not treat this as irreversible brick; user may fix VD then regenerate).
    return {
      autoRepairStage: "handoff_human",
      autoRepairRound: round,
      autoRepairBudgetLeft: budgetLeft,
      allowSilentRegen: true,
      handoffReason: "hand_edit_vd_non_enhanceable",
    };
  }

  if (findings.some((f) => /contact|prop|readable/i.test(f))) {
    return {
      autoRepairStage: round === 1 ? "compose_regen" : "fidelity_edit",
      autoRepairRound: round,
      autoRepairBudgetLeft: budgetLeft,
      allowSilentRegen: true,
    };
  }

  // Key optional: missing VLM Key ⇒ structure-led auto repair, never brick Generate.
  if (input.visualPass === false || stop === "vlm_error") {
    return {
      autoRepairStage: input.keyMissing ? "compose_regen" : "retry_shot",
      autoRepairRound: round,
      autoRepairBudgetLeft: budgetLeft,
      allowSilentRegen: true,
    };
  }

  return {
    autoRepairStage: "regen_storyboard_hq",
    autoRepairRound: round,
    autoRepairBudgetLeft: budgetLeft,
    allowSilentRegen: true,
  };
}
