/**
 * referenceQualityCapabilityGate — guard weak references and weak model/mirror fit.
 */
export type ReferenceQualityGateResult = {
  ok: boolean;
  downgraded: boolean;
  warnings: string[];
};

export function gateReferenceQualityAndCapability(input: {
  model?: string | null;
  prompt?: string | null;
  referenceCount?: number;
}): ReferenceQualityGateResult {
  const warnings: string[] = [];
  const model = String(input.model ?? "").toLowerCase();
  const prompt = String(input.prompt ?? "");
  if (/四视图|拼版|character sheet/i.test(prompt)) warnings.push("ref_sheet_risk");
  if ((input.referenceCount ?? 0) > 3) warnings.push("ref_overload");
  if (/纸角|贴颊|划过面颊|道具可读/.test(prompt) && /flash/.test(model)) {
    warnings.push("model_contact_detail_weak");
  }
  return {
    ok: warnings.length === 0,
    downgraded: warnings.length > 0,
    warnings,
  };
}
