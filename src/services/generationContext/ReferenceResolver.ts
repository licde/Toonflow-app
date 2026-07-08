import type { StructuredShot } from "../structuredScript/types";
import { extractCodesFromPrompt } from "../structuredScript/utils";

/** assetCodes/type → 有序参考 CODE 列表 */
export function resolveReferenceCodes(shot: StructuredShot): string[] {
  const fromCodes = shot.assetCodes ?? [];
  const fromPrompt = extractCodesFromPrompt(shot.imagePrompt ?? "");
  const merged = [...fromCodes];
  for (const c of fromPrompt) {
    if (!merged.includes(c)) merged.push(c);
  }

  const type = shot.type ?? "CHAR-SCENE";
  const chars = merged.filter((c) => c.startsWith("CHAR-"));
  const scenes = merged.filter((c) => c.startsWith("SCENE-"));
  const props = merged.filter((c) => c.startsWith("PROP-"));

  if (type === "PURE-SCENE") return scenes.length ? scenes : merged;
  if (type === "PURE-PROP") return props.length ? props : merged;
  if (type === "CHAR-PROP") return [...chars, ...props];
  return [...chars, ...scenes];
}

export function resolveAspectRatio(shot: StructuredShot, projectRatio = "9:16"): string {
  if (shot.type === "PURE-PROP") return "1:1";
  const prompt = shot.imagePrompt ?? "";
  const m = prompt.match(/\b(9:16|16:9|1:1|4:3|3:4)\b/);
  return m?.[1] ?? projectRatio;
}
