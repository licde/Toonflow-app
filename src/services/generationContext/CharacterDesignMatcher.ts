import type { StructuredShot } from "../structuredScript/types";
import { selectVariantPrompt } from "./VariantSelector";

function pickLayer(asset: Record<string, unknown>, key: string, shot: StructuredShot): string {
  const layer = asset[key] as Record<string, unknown> | string | undefined;
  if (!layer) return "";
  if (typeof layer === "string") return layer;
  const visualId = shot.visualId ?? "";
  if (visualId.includes("白天") && layer["白天"]) return String(layer["白天"]);
  if (visualId.includes("夜晚") && layer["夜晚"]) return String(layer["夜晚"]);
  if (layer["日常"]) return String(layer["日常"]);
  if (layer["提示词"]) return String(layer["提示词"]);
  if (layer["强度"]) return `${key}: intensity ${layer["强度"]}`;
  return "";
}

/** L0-L6 分层智能组装 */
export function compileCharacterDesign(
  shot: StructuredShot,
  characterAssets?: Record<string, Record<string, unknown>>,
): string {
  const { charCode, layerPrompt } = selectVariantPrompt(shot, characterAssets);
  if (!charCode || !characterAssets?.[charCode]) return layerPrompt;

  const asset = characterAssets[charCode];
  const parts: string[] = [];

  const l0 = asset["L0-baseModel"] as { 锁定描述?: string; 禁止变更?: string } | undefined;
  if (l0?.锁定描述) parts.push(l0.锁定描述);

  for (const key of ["L1-makeup", "L2-hairstyle", "L3-underwear", "L4-outerwear", "L5-accessories"]) {
    const v = pickLayer(asset, key, shot);
    if (v) parts.push(v);
  }

  if (layerPrompt && !parts.some((p) => p.includes(layerPrompt.slice(0, 12)))) {
    parts.push(layerPrompt);
  }

  if (l0?.禁止变更) parts.push(`locked: ${l0.禁止变更}`);

  return parts.filter(Boolean).join(", ");
}
