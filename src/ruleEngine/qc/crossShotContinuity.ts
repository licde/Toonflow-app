/**
 * Cross-shot continuity — neighbor still soft-ref + continuityFrom inject.
 */
export function buildCrossShotContinuityInject(input: {
  continuityFrom?: string | null;
  neighborShotSize?: string | null;
  neighborStillPresent?: boolean;
}): {
  promptFragment: string;
  softRefRequired: boolean;
  notes: string[];
} {
  const notes: string[] = [];
  const bits: string[] = [];
  const cont = String(input.continuityFrom ?? "").trim();
  if (cont) {
    bits.push(`continuity: continues from ${cont.slice(0, 80)}`);
    notes.push("continuityFrom");
  }
  if (input.neighborShotSize) {
    bits.push(`neighbor shotSize ${input.neighborShotSize}`);
    notes.push("neighborShotSize");
  }
  const softRefRequired = Boolean(cont) && input.neighborStillPresent === true;
  if (softRefRequired) {
    bits.push("soft ref: previous still for wardrobe/lighting continuity");
    notes.push("neighbor_still_soft_ref");
  }
  return {
    promptFragment: bits.join("；"),
    softRefRequired,
    notes,
  };
}

export function sortStoryboardsForContinuity<T extends { id?: number; track?: string | null; index?: number | null }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    const ta = String(a.track ?? "");
    const tb = String(b.track ?? "");
    if (ta !== tb) return ta.localeCompare(tb);
    const ia = Number(a.index ?? a.id ?? 0);
    const ib = Number(b.index ?? b.id ?? 0);
    return ia - ib;
  });
}
