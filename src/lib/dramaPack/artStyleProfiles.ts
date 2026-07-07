export type ArtStyleProfileId = "realpeople_urban_modern" | "guofeng_period" | "default";

export type ArtStyleProfile = {
  id: ArtStyleProfileId;
  ignoreSpecBlocks: string[];
  applyAssetRules: boolean;
  skipValidationRuleIds: string[];
};

const PROFILES: Record<ArtStyleProfileId, ArtStyleProfile> = {
  realpeople_urban_modern: {
    id: "realpeople_urban_modern",
    ignoreSpecBlocks: ["characterAssetRules"],
    applyAssetRules: false,
    skipValidationRuleIds: ["V13", "V14", "V15"],
  },
  guofeng_period: {
    id: "guofeng_period",
    ignoreSpecBlocks: [],
    applyAssetRules: true,
    skipValidationRuleIds: [],
  },
  default: {
    id: "default",
    ignoreSpecBlocks: [],
    applyAssetRules: false,
    skipValidationRuleIds: [],
  },
};

export function resolveArtStyleProfile(artStyleHint?: string): ArtStyleProfile {
  if (!artStyleHint) return PROFILES.default;
  if (/urban|modern|realpeople|都市|现代/.test(artStyleHint)) return PROFILES.realpeople_urban_modern;
  if (/guofeng|古风|period|宫廷/.test(artStyleHint)) return PROFILES.guofeng_period;
  return PROFILES.default;
}

export function shouldApplySpecBlock(profile: ArtStyleProfile, blockName: string): boolean {
  return !profile.ignoreSpecBlocks.includes(blockName);
}
