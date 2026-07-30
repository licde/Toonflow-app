/**
 * VIR soft-fill from templates (M2) — never invent without template material.
 */
export interface VirFillResult {
  filled: boolean;
  templateFilled: boolean;
  fields: string[];
  warn: boolean;
}

export function softFillViralAnchors(input: {
  hasTemplate: boolean;
  missingFields: string[];
  templateValues?: Record<string, unknown>;
}): VirFillResult {
  if (!input.hasTemplate || !input.templateValues) {
    return { filled: false, templateFilled: false, fields: input.missingFields, warn: false };
  }
  const applied: string[] = [];
  for (const f of input.missingFields) {
    if (input.templateValues[f] != null && String(input.templateValues[f]).trim()) applied.push(f);
  }
  return {
    filled: applied.length > 0,
    templateFilled: applied.length > 0,
    fields: applied,
    warn: applied.length > 0, // D6: always WARN when templateFilled
  };
}
