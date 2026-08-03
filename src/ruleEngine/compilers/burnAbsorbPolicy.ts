/**
 * Burn absorb allowlist — warehouse/弱债可吸收；handoff / LANG / fidelity 关键项不可吸收续烧。
 */
export type AbsorbClass =
  | "warehouse"
  | "track_prompt_weak"
  | "stale_prompt"
  | "lip_confirm"
  | "lang"
  | "expr"
  | "fidelity"
  | "still_mouth"
  | "still_contact"
  | "still_pose"
  | "still_i2v_ready"
  | "secondary_dominance"
  | "identity_cref"
  | "needs_split";

/** Only these may continue burn with notes (heal_then_burn). Intent-first pose/contact soft debts absorbable. */
const ABSORB_ALLOW = new Set<AbsorbClass>([
  "warehouse",
  "track_prompt_weak",
  "stale_prompt",
  "lip_confirm",
  "still_pose",
  "still_contact",
  "still_mouth",
  "still_i2v_ready",
]);

export function mayAbsorbBurnDebt(cls: AbsorbClass): boolean {
  return ABSORB_ALLOW.has(cls);
}

export function mustRepushBurnDebt(cls: AbsorbClass): boolean {
  return !mayAbsorbBurnDebt(cls);
}

/** Fidelity item ids that must not be silently absorbed as PASS. motion verbs heal_then_burn. */
export const FIDELITY_NO_ABSORB_IDS = new Set([
  "lang_cjk_dialogue",
  "expr_eyes",
  "expr_mouth_xor",
  "composition_fg",
  "voice_character",
  "vd_body",
  "lit_contact_xor",
]);

export function fidelityMissesBlockAbsorb(
  items: Array<{ id: string; pass: boolean }>,
): Array<{ id: string; pass: boolean }> {
  return items.filter((i) => !i.pass && (FIDELITY_NO_ABSORB_IDS.has(i.id) || i.id.startsWith("vd_atom_")));
}
