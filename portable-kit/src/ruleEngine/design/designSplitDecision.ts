/**
 * Design split decision tree SSOT — choose A clause / B cluster / C VisBeat.
 */
import { canPhysicalClauseSplit, needsNar14Split } from "../nar14ClauseSplit";
import { countDialogueChars, DIALOGUE_CLAUSE_BUDGET } from "../dialogueMetrics";
import { evaluateVisBeatConflict } from "./visualBeatPolicy";
import { readFixtureJson } from "../utils/fixturesPath";

export type SplitAction =
  | "A_clause"
  | "splitHint_optional_B"
  | "must_redesign_or_B"
  | "C_visbeat"
  | "require_reactionAction"
  | "none";

export function loadSplitCapability() {
  return readFixtureJson<{
    decisionTree?: { when: string; action: string; priority: number }[];
    mutex?: string;
  }>("design_split_capability.json", {});
}

export function decideSplitForLine(input: {
  text?: string;
  splitHint?: string;
  functions?: string[];
  reactionAction?: string;
}): { action: SplitAction; reason: string } {
  const text = String(input.text ?? "").trim();
  const funcs = input.functions ?? [];
  if (funcs.includes("emotion_hit") && !String(input.reactionAction ?? "").trim()) {
    return { action: "require_reactionAction", reason: "emotion_hit_missing_reactionAction" };
  }
  if (!text) return { action: "none", reason: "empty" };
  // 标点→A：可物理拆且（超预算 或 整句长于单句预算）
  if (canPhysicalClauseSplit(text)) {
    const over =
      needsNar14Split(text, { splitHint: input.splitHint }) ||
      countDialogueChars(text) > DIALOGUE_CLAUSE_BUDGET;
    if (over) return { action: "A_clause", reason: "punct_clauses" };
  }
  if (!needsNar14Split(text, { splitHint: input.splitHint })) {
    return { action: "none", reason: "within_budget" };
  }
  // 残句：无标点仍超预算 → must 重设计或 B（非「可不手改」）
  return { action: "must_redesign_or_B", reason: "residual_no_punct_over_budget" };
}

export function decideSplitForShot(shot: Record<string, unknown>, meta?: Record<string, unknown>): {
  action: SplitAction;
  reason: string;
} {
  const vis = evaluateVisBeatConflict({
    visualBeatTags: shot.visualBeatTags,
    shotSize: (shot.shotSize as string) ?? (shot.narrative as { shotSize?: string })?.shotSize,
    picture: shot.visualDescription as string,
    weaponId: shot.weaponId as string,
    meta,
  });
  if (vis.action === "must_split") {
    return { action: "C_visbeat", reason: vis.matrixRowId ?? "visbeat" };
  }
  const lines =
    ((shot.narrative as { dialogue?: { lines?: { text?: string; splitHint?: string; functions?: string[]; reactionAction?: string }[] } })
      ?.dialogue?.lines ?? []) as {
      text?: string;
      splitHint?: string;
      functions?: string[];
      reactionAction?: string;
    }[];
  for (const l of lines) {
    const d = decideSplitForLine(l);
    if (d.action !== "none") return d;
  }
  return { action: "none", reason: "ok" };
}
