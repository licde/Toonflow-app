/** 分镜/资产参考图解析：storyboard 无图时回退关联资产图 */

import u from "@/utils";

export type ResolvedReference = {
  path?: string;
  sources: string;
  fallback?: boolean;
};

export async function resolveStoryboardReference(storyboardId: number): Promise<ResolvedReference | null> {
  const sb = await u.db("o_storyboard").where("id", storyboardId).select("filePath").first();
  if (sb?.filePath) return { path: sb.filePath, sources: "storyBoard" };

  const links = await u
    .db("o_assets2Storyboard")
    .where("storyboardId", storyboardId)
    .select("assetId");
  if (!links.length) return null;

  const asset = await u
    .db("o_assets")
    .leftJoin("o_image", "o_assets.imageId", "o_image.id")
    .whereIn("o_assets.id", links.map((l) => l.assetId))
    .whereNotNull("o_image.filePath")
    .select("o_image.filePath")
    .first();

  if (asset?.filePath) {
    return { path: asset.filePath, sources: "storyBoard", fallback: true };
  }
  return null;
}

export async function resolveAssetReference(assetId: number): Promise<ResolvedReference | null> {
  const row = await u
    .db("o_assets")
    .leftJoin("o_image", "o_assets.imageId", "o_image.id")
    .where("o_assets.id", assetId)
    .select("o_image.filePath", "o_image.type")
    .first();
  if (!row?.filePath) return null;
  return { path: row.filePath, sources: row.type || "assets" };
}
