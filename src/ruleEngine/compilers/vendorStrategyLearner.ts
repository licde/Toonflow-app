/**
 * vendorStrategyLearner — deterministic model guidance from shot type + prior failures.
 */
export function choosePreferredModelHint(input: {
  model?: string | null;
  visualDescription?: string | null;
  failureKinds?: string[] | null;
}): { preferredModelHint?: string; strategyReason?: string } {
  const model = String(input.model ?? "");
  const vd = String(input.visualDescription ?? "");
  const failure = input.failureKinds ?? [];
  if ((/纸角|贴颊|道具可读/.test(vd) || failure.some((f) => /contact|readable/i.test(f))) && /flash/i.test(model)) {
    return { preferredModelHint: model.replace(/flash/gi, "pro"), strategyReason: "contact_detail_upgrade" };
  }
  return { preferredModelHint: undefined, strategyReason: undefined };
}
