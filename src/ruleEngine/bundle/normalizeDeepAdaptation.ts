/** Canonical deepAdaptation map entry (Shape registry SH-MAPS / SH-B16). */
export type RenamePair = { from: string; to: string; reason?: string };

const ARROW_RE = /\s*(?:→|->|⇒)\s*/;
const CHOICE_LIKE = new Set([
  "keep",
  "modernize",
  "localize",
  "full_rename",
  "simplify",
  "invert",
  "expand",
  "partial",
  "full",
  "era_shift",
  "world_shift",
]);

function splitArrowKey(s: string): RenamePair | null {
  const parts = s.split(ARROW_RE).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  return { from: parts[0]!, to: parts.slice(1).join("→") };
}

function pairFromObject(o: Record<string, unknown>): RenamePair[] {
  const from =
    typeof o.from === "string" ? o.from
    : typeof o.original === "string" ? o.original
    : typeof o.source === "string" ? o.source
    : null;
  const to =
    typeof o.to === "string" ? o.to
    : typeof o.new === "string" ? o.new
    : typeof o.target === "string" ? o.target
    : null;
  if (from && to) {
    const reason = typeof o.reason === "string" ? o.reason : undefined;
    return [{ from, to, ...(reason ? { reason } : {}) }];
  }

  const keys = Object.keys(o);
  if (keys.length === 1) {
    const k = keys[0]!;
    const arrow = splitArrowKey(k);
    if (arrow) return [arrow];
  }

  const out: RenamePair[] = [];
  for (const [k, v] of Object.entries(o)) {
    if (/^D\d+_/.test(k)) continue;
    if (typeof v === "string" && CHOICE_LIKE.has(v) && !ARROW_RE.test(k)) continue;
    const arrowKey = splitArrowKey(k);
    if (arrowKey) {
      out.push(arrowKey);
      continue;
    }
    if (typeof v === "string" && v.length > 0) {
      out.push({ from: k, to: v });
    }
  }
  return out;
}

/** Normalize any invented map shape into [{ from, to }]. */
export function normalizeRenameMap(input: unknown): RenamePair[] {
  if (input == null) return [];
  if (typeof input === "string") {
    const p = splitArrowKey(input);
    return p ? [p] : [];
  }
  if (Array.isArray(input)) {
    const out: RenamePair[] = [];
    for (const item of input) {
      if (typeof item === "string") {
        const p = splitArrowKey(item);
        if (p) out.push(p);
        continue;
      }
      if (item && typeof item === "object" && !Array.isArray(item)) {
        out.push(...pairFromObject(item as Record<string, unknown>));
      }
    }
    return out;
  }
  if (typeof input === "object") {
    return pairFromObject(input as Record<string, unknown>);
  }
  return [];
}

function stripPollutionKeys(deep: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(deep)) {
    if (/^D\d+_/.test(k)) continue;
    out[k] = v;
  }
  return out;
}

/** Normalize deepAdaptation maps; settingProfile kept as record. */
export function normalizeDeepAdaptation(deep: unknown): Record<string, unknown> {
  if (!deep || typeof deep !== "object" || Array.isArray(deep)) return {};
  const raw = stripPollutionKeys(deep as Record<string, unknown>);
  const out: Record<string, unknown> = { ...raw };
  for (const field of ["nameMap", "relationMap", "substitutions"] as const) {
    if (field in out) {
      out[field] = normalizeRenameMap(out[field]);
    }
  }
  if (out.settingProfile != null && (typeof out.settingProfile !== "object" || Array.isArray(out.settingProfile))) {
    delete out.settingProfile;
  }
  return out;
}

export function pairsToB16Record(pairs: RenamePair[]): Record<string, string> {
  const rec: Record<string, string> = {};
  for (const p of pairs) {
    if (p.from && p.to) rec[p.from] = p.to;
  }
  return rec;
}

function compileB16FromNameMap(nameMap: unknown, existing?: unknown): Record<string, unknown> | undefined {
  const pairs = normalizeRenameMap(nameMap);
  if (!pairs.length) {
    return existing && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : undefined;
  }
  const compiled = pairsToB16Record(pairs);
  if (existing && typeof existing === "object" && !Array.isArray(existing)) {
    return { ...(existing as Record<string, unknown>), ...compiled };
  }
  return compiled;
}

/**
 * Mutates bundle root: normalize deepAdaptation under planData / narrativeBrief,
 * fold B16_adaptationDeepRef into B16 + deepAdaptation, compile B16 from nameMap.
 */
export function normalizeDeepAdaptationInBundle(bundle: Record<string, unknown>): void {
  const planData = bundle.planData;
  if (planData && typeof planData === "object" && !Array.isArray(planData)) {
    const pd = planData as Record<string, unknown>;
    const structured = pd.adaptationMatrixStructured;
    if (structured && typeof structured === "object" && !Array.isArray(structured)) {
      const st = structured as Record<string, unknown>;
      if (st.deepAdaptation != null) {
        st.deepAdaptation = normalizeDeepAdaptation(st.deepAdaptation);
      }
    }
    const brief = pd.narrativeBrief;
    if (brief && typeof brief === "object" && !Array.isArray(brief)) {
      const nb = brief as Record<string, unknown>;
      if (nb.deepAdaptation != null) {
        nb.deepAdaptation = normalizeDeepAdaptation(nb.deepAdaptation);
      }
    }
  }

  const designBrief = bundle.designBrief;
  if (designBrief && typeof designBrief === "object" && !Array.isArray(designBrief)) {
    const db = designBrief as Record<string, unknown>;
    const nested = db.B16_adaptationDeepRef;
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      const nestedNorm = normalizeDeepAdaptation(nested);
      const pd = bundle.planData as Record<string, unknown> | undefined;
      const structured = pd?.adaptationMatrixStructured as Record<string, unknown> | undefined;
      if (structured) {
        const merged = normalizeDeepAdaptation({
          ...(typeof structured.deepAdaptation === "object" && structured.deepAdaptation
            ? (structured.deepAdaptation as Record<string, unknown>)
            : {}),
          ...nestedNorm,
        });
        structured.deepAdaptation = merged;
      }
      db.B16 = compileB16FromNameMap(nestedNorm.nameMap, db.B16) ?? db.B16;
      delete db.B16_adaptationDeepRef;
    }

    let nameMap: unknown;
    const pd = bundle.planData as Record<string, unknown> | undefined;
    const st = pd?.adaptationMatrixStructured as Record<string, unknown> | undefined;
    const deep = st?.deepAdaptation as Record<string, unknown> | undefined;
    nameMap = deep?.nameMap;
    if (!nameMap) {
      const nb = pd?.narrativeBrief as Record<string, unknown> | undefined;
      nameMap = (nb?.deepAdaptation as Record<string, unknown> | undefined)?.nameMap;
    }
    if (nameMap) {
      const compiled = compileB16FromNameMap(nameMap, db.B16);
      if (compiled) db.B16 = compiled;
    }
  }
}
