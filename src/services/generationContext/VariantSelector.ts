import type { StructuredShot } from "../structuredScript/types";

/** visualId / L6-trigger / personalitySwitch → 变体 prompt 与 derive CODE */
export function selectVariantPrompt(
  shot: StructuredShot,
  characterAssets?: Record<string, Record<string, unknown>>,
): { charCode?: string; deriveCode?: string; layerPrompt: string } {
  const charCode = shot.assetCodes?.find((c) => c.startsWith("CHAR-"));
  if (!charCode || !characterAssets) return { layerPrompt: "" };

  const asset = characterAssets[charCode];
  if (!asset) return { charCode, layerPrompt: "" };

  const visualId = shot.visualId ?? "";
  if (visualId && characterAssets[visualId]) {
    const v = characterAssets[visualId];
    return {
      charCode,
      deriveCode: visualId,
      layerPrompt: String(v["分镜引用prompt_日常"] ?? v.name ?? ""),
    };
  }

  if (visualId.includes("白天") && asset["分镜引用prompt_白天"]) {
    return { charCode, deriveCode: `${charCode}-${visualId.split("_")[0]}`, layerPrompt: String(asset["分镜引用prompt_白天"]) };
  }
  if (visualId.includes("夜晚") && asset["分镜引用prompt_夜晚"]) {
    return { charCode, deriveCode: `${charCode}-${visualId.split("_")[0]}`, layerPrompt: String(asset["分镜引用prompt_夜晚"]) };
  }
  if (asset["分镜引用prompt_日常"]) {
    return { charCode, deriveCode: visualId || `${charCode}-日常`, layerPrompt: String(asset["分镜引用prompt_日常"]) };
  }

  const sw = shot.personalitySwitch;
  if (sw?.enabled && sw.from) {
    const fromAsset = characterAssets[sw.from] ?? asset;
    const l0 = fromAsset["L0-baseModel"] as { 锁定描述?: string } | undefined;
    return { charCode: sw.from, deriveCode: sw.from, layerPrompt: l0?.锁定描述 ?? "" };
  }

  const l0 = asset["L0-baseModel"] as { 锁定描述?: string } | undefined;
  return { charCode, layerPrompt: l0?.锁定描述 ?? "" };
}
