/**
 * Smart repair actuator table — SelfHeal / autoClose → compose_regen | fidelity_edit | Confirm.
 * redesignPass ≠ smart heal (dual track).
 */
import { repairActionForConfidence } from "./practiceCompleteness";

export type SmartRepairActuator =
  | "autoClose_text"
  | "prompt_inject"
  | "soft_env_ref"
  | "compose_regen"
  | "fidelity_edit"
  | "regen_storyboard_hq"
  | "chat_repair"
  | "spatial_regen"
  | "confirm_split"
  | "confirm_enhance"
  | "human_rejudge"
  | "redesign_pass_only";

export type SmartRepairRoute = {
  trigger: string;
  debtClass?: string;
  actuators: SmartRepairActuator[];
  autoStages?: Array<"compose_regen" | "fidelity_edit" | "regen_storyboard_hq" | "handoff_human">;
  maxAutoRounds?: number;
  confidenceAction: ReturnType<typeof repairActionForConfidence>;
};

const PHASE1_DEBT = new Set([
  "BG_READABLE",
  "CONTACT_GEOM",
  "STILL_HQ_EGRESS",
  "SPATIAL_LAYOUT",
  "PAPER_DOC_READABLE",
  "PROP_IN_FRAME",
  "PROMPT_FIDELITY",
  "IDENTITY_PLATE",
  "ACTION_MISFIRE",
]);

const ROUTES: SmartRepairRoute[] = [
  {
    trigger: "BG_READABLE",
    debtClass: "BG_READABLE",
    actuators: ["prompt_inject", "soft_env_ref", "fidelity_edit", "regen_storyboard_hq"],
    autoStages: ["compose_regen", "fidelity_edit", "regen_storyboard_hq"],
    maxAutoRounds: 3,
    confidenceAction: "apply_auto",
  },
  {
    trigger: "CONTACT_GEOM",
    debtClass: "CONTACT_GEOM",
    actuators: ["prompt_inject", "fidelity_edit", "regen_storyboard_hq"],
    autoStages: ["compose_regen", "fidelity_edit", "regen_storyboard_hq"],
    maxAutoRounds: 3,
    confidenceAction: "apply_auto",
  },
  {
    trigger: "STILL_HQ_EGRESS",
    debtClass: "STILL_HQ_EGRESS",
    actuators: ["regen_storyboard_hq", "chat_repair"],
    autoStages: ["regen_storyboard_hq", "handoff_human"],
    maxAutoRounds: 2,
    confidenceAction: "apply_auto",
  },
  /** Video burn I2V plate not ready — never continue burn; auto compose/HQ regen */
  {
    trigger: "still_i2v_not_ready",
    debtClass: "STILL_HQ_EGRESS",
    actuators: ["compose_regen", "regen_storyboard_hq", "confirm_enhance"],
    autoStages: ["compose_regen", "regen_storyboard_hq"],
    maxAutoRounds: 3,
    confidenceAction: "apply_auto",
  },
  {
    trigger: "visualPass_false",
    debtClass: "STILL_HQ_EGRESS",
    actuators: ["compose_regen", "regen_storyboard_hq"],
    autoStages: ["compose_regen", "regen_storyboard_hq"],
    maxAutoRounds: 3,
    confidenceAction: "apply_auto",
  },
  {
    trigger: "secondary_dominance",
    debtClass: "SPATIAL_LAYOUT",
    actuators: ["prompt_inject", "compose_regen", "regen_storyboard_hq"],
    autoStages: ["compose_regen", "regen_storyboard_hq"],
    maxAutoRounds: 3,
    confidenceAction: "apply_auto",
  },
  {
    trigger: "missing_prop_pose_locus",
    debtClass: "PROP_IN_FRAME",
    actuators: ["prompt_inject", "compose_regen", "fidelity_edit", "regen_storyboard_hq"],
    autoStages: ["compose_regen", "fidelity_edit", "regen_storyboard_hq"],
    maxAutoRounds: 3,
    confidenceAction: "apply_auto",
  },
  {
    trigger: "delivery:draft",
    debtClass: "STILL_HQ_EGRESS",
    actuators: ["regen_storyboard_hq"],
    autoStages: ["regen_storyboard_hq"],
    maxAutoRounds: 2,
    confidenceAction: "apply_auto",
  },
  {
    trigger: "SPATIAL_LAYOUT",
    debtClass: "SPATIAL_LAYOUT",
    actuators: ["prompt_inject", "chat_repair", "spatial_regen"],
    autoStages: ["compose_regen", "regen_storyboard_hq", "handoff_human"],
    maxAutoRounds: 3,
    confidenceAction: "apply_auto",
  },
  {
    trigger: "PAPER_DOC_READABLE",
    debtClass: "PAPER_DOC_READABLE",
    actuators: ["fidelity_edit", "regen_storyboard_hq"],
    autoStages: ["fidelity_edit", "regen_storyboard_hq", "handoff_human"],
    maxAutoRounds: 3,
    confidenceAction: "apply_auto",
  },
  {
    trigger: "PROP_IN_FRAME",
    debtClass: "PROP_IN_FRAME",
    actuators: ["prompt_inject", "fidelity_edit", "regen_storyboard_hq"],
    autoStages: ["compose_regen", "fidelity_edit", "regen_storyboard_hq"],
    maxAutoRounds: 3,
    confidenceAction: "apply_auto",
  },
  {
    trigger: "PROMPT_FIDELITY",
    debtClass: "PROMPT_FIDELITY",
    actuators: ["prompt_inject", "compose_regen", "fidelity_edit", "regen_storyboard_hq"],
    autoStages: ["compose_regen", "fidelity_edit", "regen_storyboard_hq"],
    maxAutoRounds: 3,
    confidenceAction: "apply_auto",
  },
  {
    trigger: "IDENTITY_PLATE",
    debtClass: "IDENTITY_PLATE",
    actuators: ["soft_env_ref", "regen_storyboard_hq", "chat_repair"],
    autoStages: ["regen_storyboard_hq", "handoff_human"],
    maxAutoRounds: 2,
    confidenceAction: "confirm_only",
  },
  {
    trigger: "ACTION_MISFIRE",
    debtClass: "ACTION_MISFIRE",
    actuators: ["prompt_inject", "compose_regen", "regen_storyboard_hq"],
    autoStages: ["compose_regen", "regen_storyboard_hq", "handoff_human"],
    maxAutoRounds: 3,
    confidenceAction: "apply_auto",
  },
  {
    trigger: "action_misfire",
    debtClass: "ACTION_MISFIRE",
    actuators: ["prompt_inject", "compose_regen", "regen_storyboard_hq"],
    autoStages: ["compose_regen", "regen_storyboard_hq"],
    maxAutoRounds: 3,
    confidenceAction: "apply_auto",
  },
  {
    trigger: "secondary_dominance",
    debtClass: "SECONDARY_DOMINANCE",
    actuators: ["prompt_inject", "compose_regen", "regen_storyboard_hq"],
    autoStages: ["compose_regen", "regen_storyboard_hq", "handoff_human"],
    maxAutoRounds: 2,
    confidenceAction: "apply_auto",
  },
  {
    trigger: "SECONDARY_DOMINANCE",
    debtClass: "SECONDARY_DOMINANCE",
    actuators: ["prompt_inject", "compose_regen", "regen_storyboard_hq"],
    autoStages: ["compose_regen", "regen_storyboard_hq", "handoff_human"],
    maxAutoRounds: 2,
    confidenceAction: "apply_auto",
  },
  {
    trigger: "role_scope_xor",
    actuators: ["chat_repair", "compose_regen"],
    autoStages: ["compose_regen", "handoff_human"],
    maxAutoRounds: 2,
    confidenceAction: "presentation_fork",
  },
  {
    trigger: "background_readable",
    debtClass: "BG_READABLE",
    actuators: ["soft_env_ref", "fidelity_edit", "regen_storyboard_hq"],
    confidenceAction: "apply_auto",
  },
  {
    trigger: "contact_geom",
    debtClass: "CONTACT_GEOM",
    actuators: ["fidelity_edit", "regen_storyboard_hq"],
    confidenceAction: "apply_auto",
  },
  {
    trigger: "DEX-INTENT-PIC",
    actuators: ["autoClose_text"],
    confidenceAction: "apply_auto",
  },
  {
    trigger: "DEX-PROP-CONT",
    actuators: ["autoClose_text"],
    confidenceAction: "apply_auto",
  },
  {
    trigger: "lit_detail_contact_xor",
    actuators: ["confirm_split"],
    confidenceAction: "presentation_fork",
  },
  {
    trigger: "literaryStale",
    actuators: ["redesign_pass_only"],
    confidenceAction: "confirm_only",
  },
  {
    trigger: "IMPORT_OK_NOT_EXIT",
    actuators: ["autoClose_text"],
    confidenceAction: "confirm_only",
  },
  // Contamination-class routes — strip/regen first; never block generate
  {
    trigger: "contact_zombie",
    debtClass: "CONTACT_GEOM",
    actuators: ["prompt_inject", "compose_regen", "regen_storyboard_hq"],
    autoStages: ["compose_regen", "regen_storyboard_hq"],
    maxAutoRounds: 3,
    confidenceAction: "apply_auto",
  },
  {
    trigger: "off_beat_cu",
    debtClass: "STILL_HQ_EGRESS",
    actuators: ["compose_regen", "regen_storyboard_hq"],
    autoStages: ["compose_regen", "regen_storyboard_hq", "handoff_human"],
    maxAutoRounds: 2,
    confidenceAction: "apply_auto",
  },
  {
    trigger: "locus_mangled",
    debtClass: "PROMPT_FIDELITY",
    actuators: ["prompt_inject", "compose_regen", "regen_storyboard_hq"],
    autoStages: ["compose_regen", "regen_storyboard_hq"],
    maxAutoRounds: 3,
    confidenceAction: "apply_auto",
  },
  {
    trigger: "plate_geometry",
    debtClass: "PROP_IN_FRAME",
    actuators: ["prompt_inject", "compose_regen", "fidelity_edit", "regen_storyboard_hq"],
    autoStages: ["compose_regen", "fidelity_edit", "regen_storyboard_hq"],
    maxAutoRounds: 3,
    confidenceAction: "apply_auto",
  },
  {
    trigger: "glyph_identity",
    debtClass: "PAPER_DOC_READABLE",
    actuators: ["fidelity_edit", "compose_regen", "regen_storyboard_hq"],
    autoStages: ["compose_regen", "fidelity_edit", "regen_storyboard_hq"],
    maxAutoRounds: 3,
    confidenceAction: "apply_auto",
  },
  // Literary primary effects (noComfyNoKey) — must delta
  {
    trigger: "occupancy.bend_pickup",
    debtClass: "ACTION_MISFIRE",
    actuators: ["prompt_inject", "compose_regen", "regen_storyboard_hq"],
    autoStages: ["compose_regen", "regen_storyboard_hq"],
    maxAutoRounds: 3,
    confidenceAction: "apply_auto",
  },
  {
    trigger: "prop.locus.ground_or_lead_hand",
    debtClass: "ACTION_MISFIRE",
    actuators: ["prompt_inject", "compose_regen", "regen_storyboard_hq"],
    autoStages: ["compose_regen", "regen_storyboard_hq"],
    maxAutoRounds: 3,
    confidenceAction: "apply_auto",
  },
  {
    trigger: "prop.in_frame.paper",
    debtClass: "PROP_IN_FRAME",
    actuators: ["prompt_inject", "compose_regen", "fidelity_edit", "regen_storyboard_hq"],
    autoStages: ["compose_regen", "fidelity_edit", "regen_storyboard_hq"],
    maxAutoRounds: 3,
    confidenceAction: "apply_auto",
  },
  {
    trigger: "prop.glyph.should",
    debtClass: "PAPER_DOC_READABLE",
    actuators: ["prompt_inject", "compose_regen", "regen_storyboard_hq"],
    autoStages: ["compose_regen", "regen_storyboard_hq"],
    maxAutoRounds: 3,
    confidenceAction: "apply_auto",
  },
  {
    trigger: "grip.knuckles_pale",
    debtClass: "ACTION_MISFIRE",
    actuators: ["prompt_inject", "compose_regen", "regen_storyboard_hq"],
    autoStages: ["compose_regen", "regen_storyboard_hq"],
    maxAutoRounds: 2,
    confidenceAction: "apply_auto",
  },
  {
    trigger: "bg.fragment.skirt",
    debtClass: "SECONDARY_DOMINANCE",
    actuators: ["prompt_inject", "compose_regen", "regen_storyboard_hq"],
    autoStages: ["compose_regen", "regen_storyboard_hq"],
    maxAutoRounds: 2,
    confidenceAction: "apply_auto",
  },
  {
    trigger: "literary_effects_unqualified",
    debtClass: "ACTION_MISFIRE",
    actuators: ["prompt_inject", "compose_regen", "regen_storyboard_hq"],
    autoStages: ["compose_regen", "regen_storyboard_hq"],
    maxAutoRounds: 3,
    confidenceAction: "apply_auto",
  },
  // L2–L5 homology with burn primaryBlock (LANG / face / split / cam / realization)
  {
    trigger: "lang_vid_mismatch",
    debtClass: "LANG_VID",
    actuators: ["chat_repair", "prompt_inject"],
    autoStages: ["handoff_human"],
    maxAutoRounds: 1,
    confidenceAction: "apply_auto",
  },
  {
    trigger: "LANG-01",
    debtClass: "LANG_VID",
    actuators: ["chat_repair", "prompt_inject"],
    autoStages: ["handoff_human"],
    maxAutoRounds: 1,
    confidenceAction: "apply_auto",
  },
  {
    trigger: "face_budget_unreachable",
    debtClass: "FACE_BUDGET",
    actuators: ["confirm_split", "chat_repair"],
    autoStages: ["handoff_human"],
    maxAutoRounds: 1,
    confidenceAction: "apply_auto",
  },
  {
    trigger: "face_unreadability",
    debtClass: "FACE_BUDGET",
    actuators: ["regen_storyboard_hq", "confirm_split"],
    autoStages: ["regen_storyboard_hq", "handoff_human"],
    maxAutoRounds: 2,
    confidenceAction: "apply_auto",
  },
  {
    trigger: "REALIZATION-FACE-READABILITY",
    debtClass: "FACE_BUDGET",
    actuators: ["regen_storyboard_hq", "confirm_split"],
    autoStages: ["regen_storyboard_hq"],
    maxAutoRounds: 2,
    confidenceAction: "apply_auto",
  },
  {
    trigger: "REALIZATION-MOTION-MISMATCH",
    debtClass: "REALIZATION_ADAPT",
    actuators: ["prompt_inject", "chat_repair"],
    autoStages: ["handoff_human"],
    maxAutoRounds: 1,
    confidenceAction: "apply_auto",
  },
  {
    trigger: "cam_speak",
    debtClass: "CAM_SPEAK",
    actuators: ["prompt_inject", "chat_repair"],
    autoStages: ["handoff_human"],
    maxAutoRounds: 1,
    confidenceAction: "apply_auto",
  },
  {
    trigger: "dialogue_shot_too_wide",
    debtClass: "FACE_BUDGET",
    actuators: ["confirm_split", "chat_repair"],
    autoStages: ["handoff_human"],
    maxAutoRounds: 1,
    confidenceAction: "apply_auto",
  },
  {
    trigger: "vis_multi_beat",
    debtClass: "SPLIT_SHOT",
    actuators: ["confirm_split", "chat_repair"],
    autoStages: ["handoff_human"],
    maxAutoRounds: 1,
    confidenceAction: "apply_auto",
  },
];

/** Map smart-repair trigger → burn primaryNextStep (homology with qualityDecision). */
export function burnNextStepForSmartRepairTrigger(trigger: string): string | null {
  const t = String(trigger ?? "");
  if (/lang|LANG-01/i.test(t)) return "chat_repair";
  if (/face_budget_unreachable|dialogue_shot_too_wide|vis_multi_beat|still_cu_cast/i.test(t)) return "split_shot";
  if (/face_unread|FACE-READABILITY|still_i2v|visualPass|secondary_dominance|mouth/i.test(t)) {
    return "regen_storyboard_hq";
  }
  if (/REALIZATION-MOTION|cam_speak|VIDEO-PROMPT-STALE/i.test(t)) return "soft_patch";
  if (/confirm_split|split_shot/i.test(t)) return "split_shot";
  return null;
}

/** Build inject + force delta hints from missing literary effect ids. */
export function smartRepairFromLiteraryMisses(missingIds: string[]): {
  injectLines: string[];
  forceFull: boolean;
  deltaHints: string[];
  routes: SmartRepairRoute[];
} {
  const {
    repairPlanForMissingEffects,
  } = require("./literaryPrimaryEffects") as typeof import("./literaryPrimaryEffects");
  const misses = missingIds.map((id) => ({
    id: id as import("./literaryPrimaryEffects").LiteraryEffectId,
    tier: "L0" as const,
    bar: "must" as const,
    reason: "missing",
  }));
  const plan = repairPlanForMissingEffects(misses);
  const routes = missingIds
    .map((id) => routeSmartRepair(id))
    .filter((r): r is SmartRepairRoute => Boolean(r));
  return {
    injectLines: plan.injectLines,
    forceFull: plan.forceFull,
    deltaHints: plan.deltaHints.length ? plan.deltaHints : ["seed", "egress_hash"],
    routes,
  };
}

export function routeSmartRepair(trigger: string, confidence = 0.7): SmartRepairRoute | null {
  const t = trigger.trim();
  const row =
    ROUTES.find((r) => r.trigger === t) ??
    ROUTES.find((r) => t.includes(r.trigger)) ??
    (PHASE1_DEBT.has(t) ? ROUTES.find((r) => r.debtClass === t) : undefined);
  if (!row) return null;
  // Wave-2: industry strong-contract rows keep apply_auto (do not demote via confidence gate)
  const industryAuto =
    /face_budget|dialogue_shot_too_wide|vis_multi_beat|LANG-01|lang_vid|REALIZATION-MOTION|cam_speak|face_unread|FACE-READABILITY/i.test(
      row.trigger,
    );
  const action = industryAuto
    ? row.confidenceAction === "confirm_only"
      ? "apply_auto"
      : row.confidenceAction
    : repairActionForConfidence(row.trigger, confidence);
  return { ...row, confidenceAction: industryAuto ? "apply_auto" : action };
}

/** SelfHeal: after autoClose, if phase1 pixel debt remains → suggest compose/fidelity actuators */
export function selfHealActuatorsForTriggers(triggers: string[]): {
  actuators: SmartRepairActuator[];
  nextStep?: "batch_still" | "regen_prompt" | "none";
} {
  const actuators = new Set<SmartRepairActuator>();
  let nextStep: "batch_still" | "regen_prompt" | "none" = "none";
  for (const t of triggers) {
    const route = routeSmartRepair(t);
    if (!route) continue;
    for (const a of route.actuators) actuators.add(a);
    if (route.actuators.includes("regen_storyboard_hq") || route.actuators.includes("compose_regen")) {
      nextStep = "batch_still";
    }
    if (route.actuators.includes("chat_repair")) {
      nextStep = nextStep === "batch_still" ? nextStep : "regen_prompt";
    }
    if (route.actuators.includes("redesign_pass_only")) {
      actuators.delete("autoClose_text");
    }
  }
  return { actuators: [...actuators], nextStep: nextStep === "none" ? undefined : nextStep };
}

export function isRedesignOnlyTrigger(trigger: string): boolean {
  return /literaryStale|redesignPass|REDESIGN/i.test(trigger);
}
