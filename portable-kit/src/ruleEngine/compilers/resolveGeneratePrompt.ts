/** Pure helper: click handlers may pass MouseEvent as first arg — never treat Event as prompt. */
export function resolveGeneratePrompt(overridePrompt: unknown, dataPrompt: unknown): string {
  if (typeof overridePrompt === "string") return overridePrompt;
  if (typeof dataPrompt === "string") return dataPrompt;
  return "";
}
