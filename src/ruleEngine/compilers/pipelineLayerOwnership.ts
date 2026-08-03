/**
 * Pipeline layer ownership SSOT — industry AV debts must not be hard-carried on wrong layer.
 * L1 design → L2 shootable/split → L3 still → L4 video realize → L5 egress → L6 human.
 */
export const PIPELINE_LAYERS = ["L1", "L2", "L3", "L4", "L5", "L6"] as const;
export type PipelineLayer = (typeof PIPELINE_LAYERS)[number];

export const LAYER_LABEL: Record<PipelineLayer, string> = {
  L1: "design_intent",
  L2: "shootable_split",
  L3: "still_pixels",
  L4: "video_realization",
  L5: "burn_egress",
  L6: "human_deliver",
};

/** Debt class → primary owning layer (repair must land here first). */
export const DEBT_LAYER_OWNERSHIP: Record<string, PipelineLayer> = {
  lang_vid_mismatch: "L5",
  lang_aud_mismatch: "L5",
  face_budget_unreachable: "L2",
  face_unreadability: "L3",
  dialogue_shot_too_wide: "L2",
  confirm_split: "L2",
  split_shot: "L2",
  secondary_dominance: "L3",
  still_mouth_handoff: "L3",
  realization_motion_mismatch: "L4",
  realization_face_readability: "L3",
  cam_speak: "L4",
  sfx_beat_miss: "L4",
  emotion_projection: "L4",
  vendor_ignore_text: "L6",
};

export function layerForDebt(debtId: string): PipelineLayer | null {
  const k = String(debtId ?? "").trim();
  if (!k) return null;
  if (DEBT_LAYER_OWNERSHIP[k]) return DEBT_LAYER_OWNERSHIP[k];
  if (/lang/i.test(k)) return "L5";
  if (/split|face_budget|faceBudget/i.test(k)) return "L2";
  if (/mouth|face_unreadable|secondary|prop_in_frame|still/i.test(k)) return "L3";
  if (/realization|motion|cam|sfx|adapt/i.test(k)) return "L4";
  if (/human|vendor|svq/i.test(k)) return "L6";
  return null;
}

/** True when a lower layer (e.g. L4) tries to hard-carry an upper-layer debt. */
export function isCrossLayerHardCarry(input: {
  debtId: string;
  actingLayer: PipelineLayer;
}): boolean {
  const owner = layerForDebt(input.debtId);
  if (!owner) return false;
  return PIPELINE_LAYERS.indexOf(input.actingLayer) > PIPELINE_LAYERS.indexOf(owner);
}
