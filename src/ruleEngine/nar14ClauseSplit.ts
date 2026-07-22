/**
 * NAR-14 SSOT — V10 标点分句判定 + 物理拆行（不编造 splitHint / reactionAction）。
 */
import {
  countDialogueChars,
  DIALOGUE_CLAUSE_BUDGET,
  MONOLOGUE_CLAUSE_BUDGET,
  splitIntoClauses,
} from "./dialogueMetrics";

export interface Nar14LineLike {
  text?: string;
  lineId?: string;
  speaker?: string;
  splitHint?: string;
  reactionAction?: string;
  functions?: string[];
  causedByActionId?: string;
  subtext?: string;
  [key: string]: unknown;
}

export interface NeedsNar14Opts {
  splitHint?: string | null;
  isMonologue?: boolean;
}

/** True when line needs splitHint or clause-split (V10 budget). */
export function needsNar14Split(text: string, opts: NeedsNar14Opts = {}): boolean {
  if (String(opts.splitHint ?? "").trim()) return false;
  const raw = String(text ?? "").trim();
  if (!raw) return false;
  const isMonologue = Boolean(opts.isMonologue || /独白|画外|OS|VO/i.test(raw));
  const budget = isMonologue ? MONOLOGUE_CLAUSE_BUDGET : DIALOGUE_CLAUSE_BUDGET;
  const clauses = splitIntoClauses(raw);
  const parts = clauses.length ? clauses : [raw];
  for (const clause of parts) {
    if (countDialogueChars(clause) > budget) return true;
  }
  // Unbroken run with no pause markers but over legacy 20-char floor
  if (clauses.length <= 1 && countDialogueChars(raw) > 20) return true;
  return false;
}

/** Whether physical clause-split can remove NAR-14 (has ≥2 pause-separated clauses). */
export function canPhysicalClauseSplit(text: string): boolean {
  return splitIntoClauses(String(text ?? "").trim()).length >= 2;
}

const SUFFIXES = "abcdefghijklmnopqrstuvwxyz";

function childLineId(base: string | undefined, index: number): string {
  const root = (base && base.trim()) || `L-auto`;
  if (index < SUFFIXES.length) return `${root}${SUFFIXES[index]}`;
  return `${root}.${index + 1}`;
}

/**
 * Split one dialogue line into per-clause lines.
 * emotion_hit / reactionAction only on the last clause to avoid NAR-15 fan-out.
 */
export function clauseSplitDialogueLine(line: Nar14LineLike): Nar14LineLike[] {
  const text = String(line.text ?? "").trim();
  const clauses = splitIntoClauses(text);
  if (clauses.length < 2) return [line];

  const functions = Array.isArray(line.functions) ? [...line.functions] : undefined;
  const last = clauses.length - 1;
  return clauses.map((clause, i) => {
    const next: Nar14LineLike = {
      ...line,
      text: clause,
      lineId: childLineId(line.lineId, i),
    };
    if (i !== last) {
      if (functions?.length) {
        next.functions = functions.filter((f) => f !== "emotion_hit");
        if (!next.functions.length) delete next.functions;
      }
      delete next.reactionAction;
      delete next.splitHint;
    } else {
      if (functions?.length) next.functions = functions;
      if (line.reactionAction) next.reactionAction = line.reactionAction;
      // Drop splitHint after physical split — clauses are the canonical form
      delete next.splitHint;
    }
    return next;
  });
}

/** Expand lines that should be physically clause-split for NAR-14 / V10 normalize. */
export function expandLinesByClauseSplit(lines: Nar14LineLike[]): { lines: Nar14LineLike[]; splitCount: number } {
  const out: Nar14LineLike[] = [];
  let splitCount = 0;
  for (const line of lines) {
    const text = String(line.text ?? "").trim();
    if (!text || !canPhysicalClauseSplit(text)) {
      out.push(line);
      continue;
    }
    const isMonologue = Boolean(/独白|画外|OS|VO/i.test(text));
    const budget = isMonologue ? MONOLOGUE_CLAUSE_BUDGET : DIALOGUE_CLAUSE_BUDGET;
    const wholeChars = countDialogueChars(text);
    // Split when: (a) would fail NAR-14, or (b) whole utterance longer than one clause budget (normalize)
    const shouldSplit = needsNar14Split(text, { splitHint: line.splitHint }) || wholeChars > budget;
    if (!shouldSplit) {
      out.push(line);
      continue;
    }
    const parts = clauseSplitDialogueLine(line);
    out.push(...parts);
    splitCount += parts.length - 1;
  }
  return { lines: out, splitCount };
}

export interface NarFail {
  id: "NAR-14" | "NAR-15";
  message: string;
  lineId?: string;
  shotIndex?: number;
  field?: string;
}

/** Deduped NAR-14/15 collection from plan + shots (plan wins for same lineId). */
export function collectNar14Nar15Fails(
  planLines: Nar14LineLike[],
  shotLines: { shotIndex?: number; lines: Nar14LineLike[] }[],
): NarFail[] {
  const fails: NarFail[] = [];
  const seen = new Set<string>();
  const push = (f: NarFail) => {
    const k = `${f.id}:${f.lineId ?? ""}:${f.message}`;
    if (seen.has(k)) return;
    seen.add(k);
    fails.push(f);
  };

  for (const line of planLines) {
    const text = String(line.text ?? "").trim();
    const lid = line.lineId;
    if (needsNar14Split(text, { splitHint: line.splitHint })) {
      push({
        id: "NAR-14",
        message: `长台词 ${lid ?? "?"} 缺 splitHint（须标点拆句或标注 reaction_shot）`,
        lineId: lid,
        field: "dialoguePlan.lines",
      });
    }
    if (line.functions?.includes("emotion_hit") && !String(line.reactionAction ?? "").trim()) {
      push({
        id: "NAR-15",
        message: `高情绪台词 ${lid ?? "?"} 缺 reactionAction`,
        lineId: lid,
        field: "dialoguePlan.lines",
      });
    }
  }

  const planIds = new Set(planLines.map((l) => l.lineId).filter(Boolean) as string[]);
  for (const shot of shotLines) {
    for (const line of shot.lines) {
      const lid = line.lineId;
      if (lid && planIds.has(lid)) continue; // already covered by plan
      const text = String(line.text ?? "").trim();
      if (needsNar14Split(text, { splitHint: line.splitHint })) {
        push({
          id: "NAR-14",
          message: `镜${shot.shotIndex ?? "?"} 长台词缺 splitHint（${text.slice(0, 12)}…）`,
          lineId: lid,
          shotIndex: shot.shotIndex,
          field: "narrative.dialogue.lines",
        });
      }
      if (line.functions?.includes("emotion_hit") && !String(line.reactionAction ?? "").trim()) {
        push({
          id: "NAR-15",
          message: `镜${shot.shotIndex ?? "?"} emotion_hit 台词缺 reactionAction`,
          lineId: lid,
          shotIndex: shot.shotIndex,
          field: "narrative.dialogue.lines",
        });
      }
    }
  }
  return fails;
}
