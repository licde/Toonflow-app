/**
 * SSOT for dialogue metrics — V10 分句字数 + PR-09 duration/lip share one charCount.
 *
 * V10 unit = 分句（按停顿标点切开），对话 ≤15 / 独白 ≤12；停顿本身另段、不并入邻句字数。
 * PR-09 still measures full utterance/shot text for speak duration.
 */
import { isNonLiteraryDialogueKey } from "./design/dialogueCoverage";
export interface DialogueMetrics {
  charCount: number;
  isMonologue: boolean;
  minDurationSec: number;
  lipRequired: boolean;
  /** Per-clause budget: dialogue 15 / monologue 12 */
  lineBudgetMax: number;
  exceedsLineBudget: boolean;
}

export const DIALOGUE_CLAUSE_BUDGET = 15;
export const MONOLOGUE_CLAUSE_BUDGET = 12;

const CJK_RE = /[\u4e00-\u9fff]/g;
/** Pause markers that split 分句 (commas, stops, ellipsis, dashes). */
const CLAUSE_SPLIT_RE = /……|[，。！？；、,….!?;~～—–\-]+/;

/** CJK count + ellipsis（……）×3 when present inside a clause body. */
export function countDialogueChars(text: string): number {
  const ellipsis = (String(text ?? "").match(/……/g) || []).length;
  const withoutEllipsis = String(text ?? "").replace(/……/g, "");
  const cn = (withoutEllipsis.match(CJK_RE) || []).length;
  return cn + ellipsis * 3;
}

export function calcMinDurationSec(charCount: number, speechSpeed = 4): number {
  if (charCount <= 0) return 0;
  return Math.max(0.3, Math.round((charCount / speechSpeed) * 10) / 10);
}

export function measureDialogue(input: {
  text: string;
  isMonologue?: boolean;
  speechSpeed?: number;
  videoPrompt?: string;
}): DialogueMetrics {
  const charCount = countDialogueChars(input.text);
  const isMonologue = Boolean(input.isMonologue || /独白|画外/.test(input.text));
  const speechSpeed = input.speechSpeed ?? 4;
  const minDurationSec = calcMinDurationSec(charCount, speechSpeed);
  const lipRequired = charCount > 0;
  const lineBudgetMax = isMonologue ? MONOLOGUE_CLAUSE_BUDGET : DIALOGUE_CLAUSE_BUDGET;
  return {
    charCount,
    isMonologue,
    minDurationSec,
    lipRequired,
    lineBudgetMax,
    exceedsLineBudget: charCount > lineBudgetMax,
  };
}

/** Split one utterance into 分句 by pause punctuation. */
export function splitIntoClauses(text: string): string[] {
  return String(text ?? "")
    .split(CLAUSE_SPLIT_RE)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && /[\u4e00-\u9fffA-Za-z0-9]/.test(s));
}

/** Shot dialogue → utterance texts (structured lines or newline speaker lines). */
export function splitDialogueUtterances(lines: unknown): string[] {
  const keep = (t: string) => {
    const s = t.trim();
    return Boolean(s) && !isNonLiteraryDialogueKey(s);
  };
  if (lines == null) return [];
  if (Array.isArray(lines)) {
    return lines
      .map((l) => (typeof l === "string" ? l : (l as { text?: string }).text ?? ""))
      .map((t) => t.trim())
      .filter(keep);
  }
  if (typeof lines === "string") {
    return lines
      .split(/\n+/)
      .map((part) => {
        const m = part.match(/^([^：:]{1,20})[：:]\s*(.*)$/);
        return (m ? m[2] : part).trim();
      })
      .filter(keep);
  }
  return [];
}

export interface LineBudgetHit {
  clause: string;
  utterance: string;
  charCount: number;
  budgetMax: number;
  severity: "BLOCK";
  message: string;
}

/**
 * V10: each 分句 must be ≤15 (dialogue) / ≤12 (monologue).
 * Long lines with pauses pass if every clause fits; unbroken long runs BLOCK.
 */
export function evaluateLineBudgets(
  lines: unknown,
  opts?: { isMonologue?: boolean },
): LineBudgetHit[] {
  const isMonologue = Boolean(opts?.isMonologue);
  const budgetMax = isMonologue ? MONOLOGUE_CLAUSE_BUDGET : DIALOGUE_CLAUSE_BUDGET;
  const hits: LineBudgetHit[] = [];
  for (const utterance of splitDialogueUtterances(lines)) {
    const clauses = splitIntoClauses(utterance);
    // No pause markers: treat whole utterance as one clause
    const parts = clauses.length ? clauses : [utterance.trim()].filter(Boolean);
    for (const clause of parts) {
      const charCount = countDialogueChars(clause);
      if (charCount > budgetMax) {
        hits.push({
          clause,
          utterance,
          charCount,
          budgetMax,
          severity: "BLOCK",
          message: `分句 ${charCount} 字超过上限 ${budgetMax}：${clause.slice(0, 20)}`,
        });
      }
    }
  }
  return hits;
}

/** Suggest duration clamp into [1, 30] with dialogue minimum. */
export function suggestShotDuration(current: number, metrics: DialogueMetrics): number {
  const base = Math.max(current || 0, metrics.minDurationSec, 0.3);
  return Math.min(30, Math.max(1, Math.round(base * 10) / 10));
}
