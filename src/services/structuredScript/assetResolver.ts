import u from "@/utils";
import type { ReferenceList } from "@/utils/ai";

export async function resolveReferenceImages(assetIds: number[]): Promise<Extract<ReferenceList, { type: "image" }>[]> {
  if (!assetIds.length) return [];
  const rows = await u
    .db("o_assets")
    .leftJoin("o_image", "o_image.id", "o_assets.imageId")
    .whereIn("o_assets.id", assetIds)
    .select("o_assets.id", "o_image.filePath", "o_assets.remark");

  const result: Extract<ReferenceList, { type: "image" }>[] = [];
  for (const id of assetIds) {
    const row = rows.find((r: { id: number }) => r.id === id);
    if (row?.filePath) {
      try {
        const base64 = await u.oss.getImageBase64(row.filePath);
        result.push({ type: "image", base64 });
      } catch {
        /* skip missing file */
      }
    }
  }
  return result;
}

export async function getAssetIdsByStoryboard(storyboardId: number): Promise<number[]> {
  const rows = await u
    .db("o_assets2Storyboard")
    .where("storyboardId", storyboardId)
    .orderBy("rowid")
    .select("assetId");
  return rows.map((r: { assetId?: number }) => r.assetId).filter((id): id is number => id != null);
}

export async function resolveProjectModels(projectId: number) {
  const project = await u.db("o_project").where("id", projectId).select("imageModel", "videoModel", "imageQuality", "videoRatio").first();
  return {
    imageModel: (project?.imageModel as `${string}:${string}`) || "agnesai:agnes-image-2.1-flash",
    videoModel: (project?.videoModel as `${string}:${string}`) || "agnesai:agnes-video-v2.0",
    imageQuality: (project?.imageQuality as "1K" | "2K" | "4K") || "2K",
    videoRatio: (project?.videoRatio as `${number}:${number}`) || "9:16",
  };
}
