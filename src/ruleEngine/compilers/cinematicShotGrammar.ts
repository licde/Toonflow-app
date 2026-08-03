/**
 * Industry cinematic shot grammar — L1/L2 doctrine.
 */
import { readFixtureJson } from "../utils/fixturesPath";

export type CinematicIntentKey =
  | "speak_lip"
  | "action_primary"
  | "prop_cu"
  | "react_silent"
  | "ots"
  | "reaction"
  | "insert_prop";

export type CinematicGrammarFixture = {
  intentDefaults?: Record<
    string,
    {
      shotSize?: string;
      cameraMotion?: string;
      faceBudget?: "must" | "optional" | "none";
      forbidFullBowSpeak?: boolean;
    }
  >;
  softHints?: Record<string, string>;
  conflict?: {
    actionBowPlusSpeak?: {
      when?: string[];
      authorShotWiderThan?: string;
      primaryAction?: string;
      splitHint?: string;
      fallback?: string;
    };
  };
};

let cached: CinematicGrammarFixture | null = null;

export function loadCinematicShotGrammar(): CinematicGrammarFixture {
  if (cached) return cached;
  cached = readFixtureJson<CinematicGrammarFixture>("cinematic_shot_grammar.json", {
    intentDefaults: {},
    softHints: {},
  });
  return cached;
}

export function grammarDefaultForIntent(intent: string | null | undefined) {
  const g = loadCinematicShotGrammar();
  const key = String(intent ?? "").trim() || "speak_lip";
  return g.intentDefaults?.[key] ?? g.intentDefaults?.speak_lip ?? null;
}

/** Author shot size wider than industry dialogue default (中景/全景 vs 近景). */
export function shotSizeWiderThanNear(shotSize?: string | null): boolean {
  const s = String(shotSize ?? "").trim();
  if (!s) return false;
  if (/近景|特写|大特|mcu|\bcu\b|ecu/i.test(s)) return false;
  return /中景|全景|远景|ms|ws|wide|medium/i.test(s);
}

export function softGrammarHints(kinds: Array<keyof NonNullable<CinematicGrammarFixture["softHints"]>>): string[] {
  const g = loadCinematicShotGrammar();
  return kinds.map((k) => g.softHints?.[k]).filter(Boolean) as string[];
}
