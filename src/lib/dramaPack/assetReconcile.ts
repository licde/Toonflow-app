import u from "@/utils";
import type { DramaPack } from "./schema";
import { parseLockCode } from "./schema";
import { isEmotionStageName } from "./tieredAssetPolicy";
import { shouldSkipT1ForChar } from "./personaPolicy";
import { parsePackExtensions } from "./packExtensionsResolver";

export function buildAllowedAssetCodes(pack: DramaPack, packInput?: unknown): Set<string> {
  const allowed = new Set<string>();
  const extensions = parsePackExtensions(packInput ?? pack);
  for (const c of pack.plan.visualLock?.characters ?? []) {
    allowed.add(c.code);
    for (const s of c.stages ?? []) {
      if (isEmotionStageName(s.name)) continue;
      if (shouldSkipT1ForChar(c.code, extensions?.characterAssets?.[c.code] as Record<string, unknown> | undefined)) {
        continue;
      }
      allowed.add(`${c.code}:${s.name}`);
    }
  }
  for (const s of pack.plan.visualLock?.scenes ?? []) allowed.add(s.code);
  for (const p of pack.plan.visualLock?.props ?? []) allowed.add(p.code);
  return allowed;
}

export async function reconcileOrphanAssets(projectId: number, pack: DramaPack, packInput?: unknown): Promise<number> {
  const allowed = buildAllowedAssetCodes(pack, packInput);

  const assets = await u.db("o_assets").where({ projectId }).select("id", "remark");
  let removed = 0;
  for (const a of assets) {
    const code = parseLockCode(a.remark);
    if (!code) continue;
    if (code.includes(":") && !allowed.has(code)) {
      await u.db("o_assets").where("id", a.id).delete();
      removed++;
    }
  }
  return removed;
}
