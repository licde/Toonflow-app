/**
 * Rule-based still description coverage — thin wrapper over literaryFidelityChecklist.
 * Missing coverage ⇒ do not mark hq_ok (not a VLM scorer).
 */
import type { DescPredicatePack } from "./extractDescPredicates";
import { extractDescPredicates } from "./extractDescPredicates";
import {
  assertLiteraryFidelity,
  buildLiteraryFidelityChecklist,
} from "./literaryFidelityChecklist";

export interface StillDescCoverageResult {
  ok: boolean;
  missing: string[];
  checked: string[];
  hasSeatingOrKneel: boolean;
}

/**
 * Assert hard predicate tokens still present in final prompt body.
 */
export function assertStillDescCoverage(input: {
  prompt?: string | null;
  description?: string | null;
  characterNames?: string[] | null;
  /** Precomputed pack; if omitted, extract from description */
  pack?: DescPredicatePack | null;
}): StillDescCoverageResult {
  const names = input.characterNames ?? [];
  const pack =
    input.pack ??
    extractDescPredicates({
      description: input.description,
      characterNames: names,
    });
  const items = buildLiteraryFidelityChecklist({
    description: input.description,
    characterNames: names,
    requireDualIdentity: false,
  });
  // Prefer checklist; fall back to classic mustAppear when checklist empty
  if (items.length) {
    const r = assertLiteraryFidelity(input.prompt, items);
    return {
      ok: r.ok,
      missing: r.missing.map((m) => m.id),
      checked: r.checked,
      hasSeatingOrKneel: r.hasSeatingOrKneel || pack.hasSeatingOrKneel,
    };
  }
  const prompt = String(input.prompt ?? "");
  const checked = [...pack.mustAppear];
  if (!checked.length) {
    return { ok: true, missing: [], checked: [], hasSeatingOrKneel: false };
  }
  const missing = checked.filter((t) => t && !prompt.includes(t));
  if (pack.hasSeatingOrKneel && pack.hardConstraintLine && !/场面硬约束/.test(prompt)) {
    if (!missing.includes("场面硬约束")) missing.push("场面硬约束");
  }
  return {
    ok: missing.length === 0,
    missing,
    checked,
    hasSeatingOrKneel: pack.hasSeatingOrKneel,
  };
}
