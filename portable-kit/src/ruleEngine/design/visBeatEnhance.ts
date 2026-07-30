/**
 * P5 stubs: exemplar suggestor, cross-scene arc, SLO snapshot, dryRun panel payload.
 */
import { suggestVisualBeatTags } from "./visualBeatSuggestor";
import { evaluateVisBeatConflict } from "./visualBeatPolicy";

const EXEMPLARS: Array<{ tags: string[]; keywords: string[] }> = [
  { tags: ["reveal", "prop_insert"], keywords: ["露出", "匕首", "冷光", "揭示"] },
  { tags: ["reaction", "face_cu"], keywords: ["浅笑", "反应", "泪"] },
];

export function exemplarSuggestTags(text: string): { suggestedTags: string[]; confidence: number } {
  const base = suggestVisualBeatTags({ text });
  for (const ex of EXEMPLARS) {
    if (ex.keywords.some((k) => text.includes(k))) {
      return {
        suggestedTags: [...new Set([...base.suggestedTags, ...ex.tags])],
        confidence: Math.max(base.confidence, 0.55),
      };
    }
  }
  return { suggestedTags: base.suggestedTags, confidence: base.confidence };
}

export function auditCrossSceneArc(shots: Record<string, unknown>[]): string[] {
  const warns: string[] = [];
  let sawReveal = false;
  let sawReactionAfter = false;
  for (const s of shots) {
    const tags = (s.visualBeatTags as string[]) ?? [];
    if (tags.includes("reveal") || tags.includes("prop_insert")) sawReveal = true;
    if (sawReveal && (tags.includes("reaction") || s.visualSplitRole === "reaction")) sawReactionAfter = true;
  }
  if (sawReveal && !sawReactionAfter) warns.push("VIS-ARC-NO-PAYOFF");
  return warns;
}

export function visBeatSloSnapshot(input: {
  taggedShotCount: number;
  totalShots: number;
  shadowFp?: number;
  reverseLoops?: number;
}): { tagCoverage: number; ok: boolean; notes: string[] } {
  const tagCoverage = input.totalShots ? input.taggedShotCount / input.totalShots : 1;
  const notes: string[] = [];
  if (tagCoverage < 0.5) notes.push("tag_coverage_low");
  if ((input.shadowFp ?? 0) > 0.2) notes.push("shadow_fp_high");
  if ((input.reverseLoops ?? 0) > 5) notes.push("reverse_loop_hot");
  return { tagCoverage, ok: notes.length === 0, notes };
}

export function buildVisBeatDryRunPanel(shots: Record<string, unknown>[], meta?: Record<string, unknown>) {
  return shots.map((s, i) => {
    const ev = evaluateVisBeatConflict({
      visualBeatTags: s.visualBeatTags,
      shotSize: (s.shotSize as string) ?? (s.narrative as { shotSize?: string })?.shotSize,
      picture: s.visualDescription as string,
      weaponId: s.weaponId as string,
      requireTags: true,
      meta,
    });
    return {
      shotIndex: s.shotIndex ?? i + 1,
      tags: ev.tags,
      action: ev.action,
      matrixRowId: ev.matrixRowId,
      explain: ev.explain,
      mode: ev.mode,
    };
  });
}

/** Min-shot solver: only proposes, never deletes. */
export function proposeMinShotPlan(shotCount: number, conflictCount: number): {
  proposedMaxShots: number;
  note: string;
} {
  const proposedMaxShots = Math.max(shotCount, shotCount + conflictCount);
  return {
    proposedMaxShots,
    note: "propose_only: do not auto-delete shots",
  };
}
