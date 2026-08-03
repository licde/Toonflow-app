/**
 * successPatternLibrary — derive reusable pattern keys from successful shots.
 */
export type SuccessPattern = {
  key: string;
  objectiveClass?: string;
  model?: string;
  promptHash?: string;
  contractHash?: string;
};

export function deriveSuccessPattern(input: {
  visualDescription?: string | null;
  objectiveClass?: string | null;
  model?: string | null;
  promptHash?: string | null;
  contractHash?: string | null;
}): SuccessPattern {
  const vd = String(input.visualDescription ?? "");
  const cls =
    input.objectiveClass ??
    (/纸角|贴颊|划过面颊/.test(vd) ? "contact_geom" : /空镜|全景/.test(vd) ? "scene_keep" : "identity_first");
  const key = `${cls}:${/特写|近景/.test(vd) ? "cu" : "mid"}`;
  return {
    key,
    objectiveClass: cls,
    model: String(input.model ?? "") || undefined,
    promptHash: String(input.promptHash ?? "") || undefined,
    contractHash: String(input.contractHash ?? "") || undefined,
  };
}
