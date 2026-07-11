import type { EpisodeShot } from "./types";
import { stableHash } from "./utils/hash";

/** LLM 润色层：保护锚点，漂移则回退 compiled */
export async function polishPrompt(
  compiled: string,
  anchors: string[],
  polishFn?: (text: string) => Promise<string>,
): Promise<{ text: string; drifted: boolean }> {
  if (!polishFn) return { text: compiled, drifted: false };
  const polished = await polishFn(compiled);
  const drifted = anchors.some((a) => a.length > 3 && !polished.includes(a));
  return { text: drifted ? compiled : polished, drifted };
}

export function detectAnchorDrift(original: string, polished: string, anchors: string[]): boolean {
  return anchors.some((a) => a.length > 3 && original.includes(a) && !polished.includes(a));
}

export function shotCompileHash(shot: EpisodeShot): string {
  return shot.generation.compiled?.hash ?? stableHash(shot.narrative);
}
