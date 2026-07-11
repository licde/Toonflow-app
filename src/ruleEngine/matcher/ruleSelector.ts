import type { EpisodeShot } from "../types";

const FIELD_RULE_MAP: Record<string, string[]> = {
  "narrative.type": ["V1"],
  "narrative.dialogue.lines": ["V10", "H3"],
  "narrative.emotionIntensity": ["B1", "M1"],
  "generation.compiled.image": ["V2", "V3", "H5"],
  "generation.compiled.video": ["H4", "Y1"],
};

export function selectRulesForField(fieldPath: string): string[] {
  return FIELD_RULE_MAP[fieldPath] ?? [];
}

export function selectRulesForShots(shots: EpisodeShot[], changedFields: string[]): string[] {
  const rules = new Set<string>();
  for (const f of changedFields) {
    selectRulesForField(f).forEach((r) => rules.add(r));
  }
  if (!changedFields.length) return ["V1", "V10", "H3", "MODE-AGNES"];
  return [...rules];
}

export const DEPENDENCY_GRAPH: Record<string, string[]> = {
  "narrative.emotionIntensity": ["narrative.shotSize", "narrative.colorTone", "generation.compiled.image"],
  "narrative.dialogue.lines": ["narrative.duration", "generation.compiled.audio", "generation.compiled.video"],
  "narrative.type": ["generation.compiled.image"],
};
