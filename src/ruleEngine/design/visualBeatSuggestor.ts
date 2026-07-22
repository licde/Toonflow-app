/**
 * VisBeat L1 Suggestor — proposals only; NEVER used alone to BLOCK or expand.
 */
import { loadVisualBeatVocab, type VisualBeatVocab } from "./visualBeatPolicy";

export type SuggestResult = {
  suggestedTags: string[];
  confidence: number;
  hits: string[];
  excluded: boolean;
};

export function suggestVisualBeatTags(input: {
  text?: string | null;
  picture?: string | null;
  vocab?: VisualBeatVocab;
}): SuggestResult {
  const vocab = input.vocab ?? loadVisualBeatVocab();
  const blob = `${input.text ?? ""} ${input.picture ?? ""}`;
  const patterns = vocab.suggestorPatterns ?? {};
  const exclude = patterns.excludeMetaphor ?? [];
  if (exclude.some((p) => p && blob.includes(p))) {
    return { suggestedTags: [], confidence: 0, hits: [], excluded: true };
  }

  const suggested: string[] = [];
  const hits: string[] = [];
  for (const [tag, list] of Object.entries(patterns)) {
    if (tag === "excludeMetaphor") continue;
    if (!Array.isArray(list)) continue;
    for (const p of list) {
      if (p && blob.includes(p)) {
        suggested.push(tag);
        hits.push(p);
        break;
      }
    }
  }
  const uniq = [...new Set(suggested)];
  const confidence = uniq.length ? Math.min(0.95, 0.35 + uniq.length * 0.2 + hits.length * 0.05) : 0;
  // CI uses pattern-only suggestor (VISBEAT_SUGGESTOR≠llm); never legislate L0 here.
  return { suggestedTags: uniq, confidence, hits, excluded: false };
}
