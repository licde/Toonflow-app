/** lockCode 资产层级：T0 脸型 / T1 服化 / derive_child */

import type { DramaPack } from "./schema";
import { parseLockCode } from "./schema";
import { detectAssetTier, type AssetTier } from "./assetTierUtils";
import { mapVisualIdToWardrobeStage } from "./tieredAssetPolicy";
import { parseVisualId } from "./visualIdParser";

export function lockCodeBase(code: string): string {
  const colon = code.indexOf(":");
  return colon >= 0 ? code.slice(0, colon) : code;
}

export function isT1LockCode(code: string | null): boolean {
  if (!code) return false;
  return code.includes(":");
}

export function resolveAssetTierFromRow(remark?: string | null, assetsId?: number | null): AssetTier {
  return detectAssetTier(remark, assetsId);
}

/** 是否作为资产列表顶层父行展示（T1 服化行归组到 T0 下） */
export function isTopLevelParentRow(type: string, remark?: string | null, assetsId?: number | null): boolean {
  if (assetsId != null) return false;
  if (type !== "role") return true;
  const code = parseLockCode(remark ?? "");
  if (!code) return true;
  return !isT1LockCode(code);
}

export function collectUsedT1LockCodesFromPack(pack: DramaPack): Set<string> {
  const used = new Set<string>();
  for (const episode of pack.episodes) {
    for (const shot of episode.storyboard) {
      for (const code of shot.assetCodes ?? []) {
        if (code.includes(":")) used.add(code);
      }
      const baseChar = (shot.assetCodes ?? []).find((c) => c.startsWith("CHAR-") && !c.includes(":"));
      const charCode = baseChar ?? parseVisualId(shot.visualId || "")?.charCode;
      if (!charCode) continue;
      const stage = mapVisualIdToWardrobeStage(shot.visualId, charCode);
      if (stage) used.add(`${charCode}:${stage}`);
      const parsed = parseVisualId(shot.visualId || "");
      if (parsed?.charCode && parsed.stageName && !parsed.stageName.includes("_")) {
        used.add(`${parsed.charCode}:${parsed.stageName}`);
      }
    }
  }
  return used;
}

export function filterComposedAssetsByUsedT1<T extends { code: string }>(
  assets: T[],
  usedT1: Set<string>,
): T[] {
  return assets.filter((a) => !a.code.includes(":") || usedT1.has(a.code));
}
