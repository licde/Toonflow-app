/** 资产层级检测：T0 底模 vs T1 服化（lockCode 含 stage） vs production derive（assetsId） */

import { parseLockCode } from "./schema";
import { isEmotionStageName } from "./tieredAssetPolicy";

export type AssetTier = "t0_base" | "t1_wardrobe" | "derive_child";

export function detectAssetTier(remark: string | undefined | null, assetsId?: number | null): AssetTier {
  if (assetsId != null) return "derive_child";
  const code = parseLockCode(remark ?? "");
  if (!code) return "t0_base";
  const colon = code.indexOf(":");
  if (colon < 0) return "t0_base";
  const stage = code.slice(colon + 1);
  if (isEmotionStageName(stage)) return "t0_base";
  return "t1_wardrobe";
}

export function isT1WardrobeAsset(remark: string | undefined | null, assetsId?: number | null): boolean {
  return detectAssetTier(remark, assetsId) === "t1_wardrobe";
}

export function assetAspectRatio(type: string, tier: AssetTier): `${number}:${number}` {
  if (type === "tool") return "1:1";
  if (type === "role" && tier === "t0_base") return "21:9";
  return "16:9";
}

export function assetPromptTitle(type: "role" | "scene" | "tool", tier: AssetTier): { title: string; end: string } {
  if (type === "role") {
    if (tier === "t1_wardrobe") {
      return { title: "角色服化单图参考", end: "单图服化参考（面容与底模一致，仅展示服化妆造）" };
    }
    return { title: "角色标准四视图", end: "人物角色四视图" };
  }
  if (type === "scene") return { title: "标准场景图", end: "标准场景图（无人物）" };
  return { title: "标准道具图", end: "标准道具图（独立静物，无人物无手部）" };
}
